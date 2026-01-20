-- ============================================================================
-- AI MENTOR FEATURE - DATABASE MIGRATION
-- Phase 1: Create tables and read-only RPC function
-- Security Level: 1 (Standard - Recommended)
-- ============================================================================

-- ============================================================================
-- TABLE 1: AI Mentor Sessions
-- Stores all AI consultation sessions and recommendations
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_ai_mentor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id INTEGER NOT NULL,
  employee_id UUID NOT NULL REFERENCES crm_employees(id),
  session_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Context data (sanitized before storage)
  lead_context JSONB,  -- Aggregated data from multiple sources
  whatsapp_transcript TEXT,  -- Optional uploaded WhatsApp chat
  call_transcript TEXT,  -- Optional uploaded call/meeting notes

  -- AI Provider information
  ai_provider VARCHAR(20) CHECK (ai_provider IN ('openai', 'grok')),
  model_used VARCHAR(50),  -- e.g., 'gpt-4-turbo-preview', 'grok-2'
  tokens_used INTEGER,  -- Track API usage
  api_cost DECIMAL(10, 4),  -- Track costs

  -- AI Recommendations (text only, no database writes by AI)
  ai_response JSONB,  -- Full structured AI response
  recommended_timing TEXT,  -- When to reach out
  recommended_mode VARCHAR(50),  -- Communication mode (Phone/WhatsApp/Meeting/etc)
  recommended_product TEXT,  -- Product to pitch
  pitch_suggestion TEXT,  -- Suggested pitch content
  tone_guidance TEXT,  -- Tone recommendations
  success_probability DECIMAL(5,2),  -- 0-100%
  estimated_meetings_required INT,
  probable_conversion_date DATE,

  -- Employee feedback and actions
  employee_rating INT CHECK (employee_rating BETWEEN 1 AND 5),  -- How helpful was AI
  employee_feedback TEXT,
  action_taken TEXT,  -- What employee did after seeing recommendations
  recommendation_applied BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(lead_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_sessions_lead ON crm_ai_mentor_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_employee ON crm_ai_mentor_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_date ON crm_ai_mentor_sessions(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_provider ON crm_ai_mentor_sessions(ai_provider);

-- Comments for documentation
COMMENT ON TABLE crm_ai_mentor_sessions IS 'AI Mentor consultation sessions - stores lead analysis and recommendations';
COMMENT ON COLUMN crm_ai_mentor_sessions.lead_context IS 'Sanitized lead data sent to AI (no sensitive info like full mobile/email)';
COMMENT ON COLUMN crm_ai_mentor_sessions.ai_response IS 'Full AI response in JSON format';
COMMENT ON COLUMN crm_ai_mentor_sessions.success_probability IS 'AI predicted conversion probability (0-100)';

-- ============================================================================
-- TABLE 2: AI Mentor Analytics
-- Track accuracy and ROI of AI recommendations
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_ai_mentor_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES crm_ai_mentor_sessions(id) ON DELETE CASCADE,

  -- Performance tracking
  recommendation_followed BOOLEAN,
  actual_conversion_date DATE,
  actual_meetings_required INT,
  recommendation_accuracy_score DECIMAL(5,2),  -- How accurate was the prediction

  -- ROI metrics
  time_to_conversion_days INT,
  ai_contribution_score INT CHECK (ai_contribution_score BETWEEN 1 AND 10),
  conversion_successful BOOLEAN,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_analytics_session ON crm_ai_mentor_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_conversion ON crm_ai_mentor_analytics(conversion_successful);

COMMENT ON TABLE crm_ai_mentor_analytics IS 'Track accuracy and ROI of AI recommendations';

-- ============================================================================
-- RPC FUNCTION: Get Lead AI Context (READ ONLY)
-- Aggregates data from multiple tables for AI analysis
-- SECURITY: This function can ONLY READ, never write
-- ============================================================================

CREATE OR REPLACE FUNCTION get_lead_ai_context(p_lead_id INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_context JSONB;
  v_lead_email TEXT;
  v_lead_mobile TEXT;
BEGIN
  -- Get basic lead info
  SELECT email, mobile INTO v_lead_email, v_lead_mobile
  FROM crm_leads
  WHERE lead_id = p_lead_id;

  -- Build sanitized context (remove sensitive data)
  SELECT jsonb_build_object(
    'lead_profile', (
      SELECT jsonb_build_object(
        'lead_id', l.lead_id,
        'full_name', l.full_name,
        'mobile_last_4', RIGHT(l.mobile, 4),  -- Only last 4 digits
        'email_domain', SPLIT_PART(l.email, '@', 2),  -- Only domain, not full email
        'lead_source', l.lead_source,
        'for_whom', l.for_whom,
        'course', l.course,
        'lead_score', l.lead_score,
        'lead_status', l.lead_status,
        'status_notes', l.status_notes,
        'lead_generation_date', l.lead_generation_date,
        'next_followup_date', l.next_followup_date,
        'target_conversion_date', l.target_conversion_date,
        'is_converted', l.is_converted,
        'days_since_generation', EXTRACT(DAY FROM NOW() - l.lead_generation_date::timestamp)
      )
      FROM crm_leads l
      WHERE l.lead_id = p_lead_id
    ),
    'interactions', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'interaction_date', i.interaction_date,
          'interaction_type', i.interaction_type,
          'interaction_notes', i.interaction_notes,
          'sentiment', i.sentiment,
          'lead_score_after', i.lead_score_after,
          'status_after', i.status_after,
          'days_ago', EXTRACT(DAY FROM NOW() - i.interaction_date::timestamp)
        ) ORDER BY i.interaction_date DESC
      )
      FROM crm_lead_interactions i
      WHERE i.lead_id = p_lead_id
      LIMIT 20  -- Last 20 interactions only
    ),
    'interaction_summary', (
      SELECT jsonb_build_object(
        'total_count', COUNT(*),
        'last_interaction_days_ago', EXTRACT(DAY FROM NOW() - MAX(interaction_date)::timestamp),
        'avg_sentiment', AVG(
          CASE sentiment
            WHEN 'positive' THEN 3
            WHEN 'neutral' THEN 2
            WHEN 'negative' THEN 1
            ELSE 2
          END
        )
      )
      FROM crm_lead_interactions
      WHERE lead_id = p_lead_id
    ),
    'certificates', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'course_name', c.course_name,
          'completion_date', c.completion_date,
          'certificate_type', c.certificate_type
        )
      )
      FROM certificates c
      WHERE c.email = v_lead_email
      LIMIT 10
    ),
    'contact_history', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'submitted_at', cs.created_at,
          'message_preview', LEFT(cs.message, 200),  -- First 200 chars only
          'inquiry_type', cs.inquiry_type
        ) ORDER BY cs.created_at DESC
      )
      FROM contact_submissions cs
      WHERE cs.email = v_lead_email
      LIMIT 5
    ),
    'quiz_history', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'quiz_name', qr.quiz_name,
          'score', qr.score,
          'completed_at', qr.completed_at,
          'topics_of_interest', qr.topics_of_interest
        ) ORDER BY qr.completed_at DESC
      )
      FROM quiz_responses qr
      WHERE qr.email = v_lead_email
      LIMIT 10
    ),
    'webinar_engagement', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'webinar_name', wr.webinar_name,
          'attended_date', wr.attended_date,
          'rating', wr.rating,
          'feedback_summary', LEFT(wr.feedback, 200)  -- First 200 chars only
        ) ORDER BY wr.attended_date DESC
      )
      FROM webinar_ratings wr
      WHERE wr.email = v_lead_email
      LIMIT 10
    ),
    'engagement_score', (
      SELECT jsonb_build_object(
        'total_webinars_attended', (SELECT COUNT(*) FROM webinar_ratings WHERE email = v_lead_email),
        'total_quizzes_taken', (SELECT COUNT(*) FROM quiz_responses WHERE email = v_lead_email),
        'certificates_earned', (SELECT COUNT(*) FROM certificates WHERE email = v_lead_email),
        'contact_submissions', (SELECT COUNT(*) FROM contact_submissions WHERE email = v_lead_email)
      )
    ),
    'assigned_employee', (
      SELECT jsonb_build_object(
        'name', e.full_name,
        'role', e.job_role,
        'hierarchy_level', e.hierarchy_level
      )
      FROM crm_employees e
      WHERE e.id = (SELECT assigned_to FROM crm_leads WHERE lead_id = p_lead_id)
    )
  ) INTO v_context;

  RETURN v_context;
END;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION get_lead_ai_context TO authenticated;

COMMENT ON FUNCTION get_lead_ai_context IS 'Read-only function to aggregate sanitized lead data for AI analysis. Removes sensitive info like full email/mobile.';

-- ============================================================================
-- RLS POLICIES: Row Level Security
-- Ensure employees can only access their own AI sessions
-- ============================================================================

-- Enable RLS on AI tables
ALTER TABLE crm_ai_mentor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_ai_mentor_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Employees can only see their own AI sessions
CREATE POLICY "Employees can view own AI sessions"
ON crm_ai_mentor_sessions
FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM crm_employees
    WHERE id = auth.uid()
       OR id = (SELECT employee_id FROM crm_sessions WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token')
  )
);

-- Policy: Employees can create AI sessions for leads assigned to them
CREATE POLICY "Employees can create AI sessions for assigned leads"
ON crm_ai_mentor_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM crm_leads l
    WHERE l.lead_id = lead_id
      AND l.assigned_to IN (
        SELECT id FROM crm_employees
        WHERE id = auth.uid()
           OR id = (SELECT employee_id FROM crm_sessions WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token')
      )
  )
);

-- Policy: Employees can update their own sessions (for ratings/feedback)
CREATE POLICY "Employees can update own AI sessions"
ON crm_ai_mentor_sessions
FOR UPDATE
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM crm_employees
    WHERE id = auth.uid()
       OR id = (SELECT employee_id FROM crm_sessions WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token')
  )
);

-- Policy: Analytics can be viewed by session owner
CREATE POLICY "View analytics for own sessions"
ON crm_ai_mentor_analytics
FOR SELECT
TO authenticated
USING (
  session_id IN (
    SELECT id FROM crm_ai_mentor_sessions
    WHERE employee_id IN (
      SELECT id FROM crm_employees
      WHERE id = auth.uid()
         OR id = (SELECT employee_id FROM crm_sessions WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token')
    )
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these to verify the migration completed successfully
-- ============================================================================

-- Check tables were created
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('crm_ai_mentor_sessions', 'crm_ai_mentor_analytics')
ORDER BY table_name;

-- Check function was created
SELECT proname, pronargs, proargnames
FROM pg_proc
WHERE proname = 'get_lead_ai_context';

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('crm_ai_mentor_sessions', 'crm_ai_mentor_analytics');

-- Check policies were created
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('crm_ai_mentor_sessions', 'crm_ai_mentor_analytics')
ORDER BY tablename, cmd;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- Uncomment and run if you need to remove these changes
-- ============================================================================

/*
-- Drop policies
DROP POLICY IF EXISTS "Employees can view own AI sessions" ON crm_ai_mentor_sessions;
DROP POLICY IF EXISTS "Employees can create AI sessions for assigned leads" ON crm_ai_mentor_sessions;
DROP POLICY IF EXISTS "Employees can update own AI sessions" ON crm_ai_mentor_sessions;
DROP POLICY IF EXISTS "View analytics for own sessions" ON crm_ai_mentor_analytics;

-- Drop tables (CASCADE will remove foreign key constraints)
DROP TABLE IF EXISTS crm_ai_mentor_analytics CASCADE;
DROP TABLE IF EXISTS crm_ai_mentor_sessions CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS get_lead_ai_context(INTEGER);
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'AI Mentor database migration completed successfully!' AS status;
