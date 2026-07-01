-- SAFE VERSION: RPC function that handles missing tables gracefully
-- This version won't fail if some tables don't exist

DROP FUNCTION IF EXISTS get_lead_ai_context(INTEGER);

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
  v_lead_exists BOOLEAN;
BEGIN
  -- Check if lead exists
  SELECT EXISTS(SELECT 1 FROM crm_leads WHERE lead_id = p_lead_id) INTO v_lead_exists;

  IF NOT v_lead_exists THEN
    RAISE EXCEPTION 'Lead with ID % not found', p_lead_id;
  END IF;

  -- Get basic lead info
  SELECT email, mobile INTO v_lead_email, v_lead_mobile
  FROM crm_leads
  WHERE lead_id = p_lead_id;

  -- Build sanitized context (only query tables that exist)
  SELECT jsonb_build_object(
    'lead_profile', (
      SELECT jsonb_build_object(
        'lead_id', l.lead_id,
        'full_name', l.full_name,
        'mobile_last_4', RIGHT(l.mobile, 4),
        'email_domain', CASE
          WHEN l.email IS NOT NULL THEN SPLIT_PART(l.email, '@', 2)
          ELSE NULL
        END,
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
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'interaction_date', i.interaction_date,
          'interaction_type', i.interaction_type,
          'interaction_notes', i.interaction_notes,
          'sentiment', i.sentiment,
          'lead_score_after', i.lead_score_after,
          'status_after', i.status_after,
          'days_ago', EXTRACT(DAY FROM NOW() - i.interaction_date::timestamp)
        ) ORDER BY i.interaction_date DESC
      ), '[]'::jsonb)
      FROM crm_lead_interactions i
      WHERE i.lead_id = p_lead_id
      LIMIT 20
    ),
    'interaction_summary', (
      SELECT jsonb_build_object(
        'total_count', COALESCE(COUNT(*), 0),
        'last_interaction_days_ago', COALESCE(EXTRACT(DAY FROM NOW() - MAX(interaction_date)::timestamp), NULL),
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
    -- Only query optional tables if they exist and email is available
    'certificates', CASE
      WHEN v_lead_email IS NOT NULL AND EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'certificates'
      ) THEN (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'course_name', c.course_name,
            'completion_date', c.completion_date,
            'certificate_type', c.certificate_type
          )
        ), '[]'::jsonb)
        FROM certificates c
        WHERE c.email = v_lead_email
        LIMIT 10
      )
      ELSE '[]'::jsonb
    END,
    'contact_history', CASE
      WHEN v_lead_email IS NOT NULL AND EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'contact_submissions'
      ) THEN (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'submitted_at', cs.created_at,
            'message_preview', LEFT(cs.message, 200),
            'inquiry_type', cs.inquiry_type
          ) ORDER BY cs.created_at DESC
        ), '[]'::jsonb)
        FROM contact_submissions cs
        WHERE cs.email = v_lead_email
        LIMIT 5
      )
      ELSE '[]'::jsonb
    END,
    'quiz_history', CASE
      WHEN v_lead_email IS NOT NULL AND EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'quiz_responses'
      ) THEN (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'quiz_name', qr.quiz_name,
            'score', qr.score,
            'completed_at', qr.completed_at,
            'topics_of_interest', qr.topics_of_interest
          ) ORDER BY qr.completed_at DESC
        ), '[]'::jsonb)
        FROM quiz_responses qr
        WHERE qr.email = v_lead_email
        LIMIT 10
      )
      ELSE '[]'::jsonb
    END,
    'webinar_engagement', CASE
      WHEN v_lead_email IS NOT NULL AND EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'webinar_ratings'
      ) THEN (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'webinar_name', wr.webinar_name,
            'attended_date', wr.attended_date,
            'rating', wr.rating,
            'feedback_summary', LEFT(wr.feedback, 200)
          ) ORDER BY wr.attended_date DESC
        ), '[]'::jsonb)
        FROM webinar_ratings wr
        WHERE wr.email = v_lead_email
        LIMIT 10
      )
      ELSE '[]'::jsonb
    END,
    'engagement_score', (
      SELECT jsonb_build_object(
        'total_webinars_attended', CASE
          WHEN v_lead_email IS NOT NULL AND EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'webinar_ratings'
          ) THEN (SELECT COUNT(*) FROM webinar_ratings WHERE email = v_lead_email)
          ELSE 0
        END,
        'total_quizzes_taken', CASE
          WHEN v_lead_email IS NOT NULL AND EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'quiz_responses'
          ) THEN (SELECT COUNT(*) FROM quiz_responses WHERE email = v_lead_email)
          ELSE 0
        END,
        'certificates_earned', CASE
          WHEN v_lead_email IS NOT NULL AND EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'certificates'
          ) THEN (SELECT COUNT(*) FROM certificates WHERE email = v_lead_email)
          ELSE 0
        END,
        'contact_submissions', CASE
          WHEN v_lead_email IS NOT NULL AND EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'contact_submissions'
          ) THEN (SELECT COUNT(*) FROM contact_submissions WHERE email = v_lead_email)
          ELSE 0
        END
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_lead_ai_context TO anon, authenticated;

-- Test the function
SELECT 'Fixed RPC function created successfully!' AS status;

-- Now test with a sample lead (replace with actual lead_id)
-- SELECT get_lead_ai_context(1);
