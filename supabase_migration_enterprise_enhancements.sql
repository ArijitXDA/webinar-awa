-- =====================================================
-- ENTERPRISE CRM ENHANCEMENTS - MIGRATION SCRIPT
-- =====================================================
-- This migration adds:
-- 1. Advanced lead tracking columns
-- 2. Campaign management system
-- 3. Lead tagging and segmentation
-- 4. Enhanced analytics capabilities
-- =====================================================

-- =====================================================
-- PART 1: ALTER crm_leads TABLE - ADD NEW COLUMNS
-- =====================================================

-- Pipeline & Prioritization
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(50) DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS lead_temperature VARCHAR(20) DEFAULT 'cold';

-- Contact Tracking
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS first_contacted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_whatsapp_sent_at TIMESTAMP WITH TIME ZONE;

-- Lead Source & Attribution
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS lead_source_detail TEXT,
  ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_term VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_content VARCHAR(100),
  ADD COLUMN IF NOT EXISTS referral_source VARCHAR(255);

-- Loss Tracking
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS lost_reason VARCHAR(100),
  ADD COLUMN IF NOT EXISTS lost_date DATE,
  ADD COLUMN IF NOT EXISTS competitor_lost_to VARCHAR(100);

-- Value & Revenue
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS expected_value NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS annual_revenue_potential NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS deal_size_category VARCHAR(50);

-- Ownership Tracking
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS owner_changed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS previous_owner_id UUID REFERENCES crm_employees(id),
  ADD COLUMN IF NOT EXISTS owner_change_reason TEXT;

-- Tagging & Categorization
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS job_title VARCHAR(100),
  ADD COLUMN IF NOT EXISTS company_size VARCHAR(50);

-- Communication Preferences
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS communication_preference VARCHAR(50) DEFAULT 'any',
  ADD COLUMN IF NOT EXISTS best_time_to_contact VARCHAR(50),
  ADD COLUMN IF NOT EXISTS language_preference VARCHAR(50) DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS do_not_email BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS do_not_call BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS do_not_whatsapp BOOLEAN DEFAULT false;

-- Campaign Association
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS primary_campaign_id UUID,
  ADD COLUMN IF NOT EXISTS campaign_response_status VARCHAR(50);

-- Status Change Tracking
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS last_status_change_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS status_change_count INTEGER DEFAULT 0;

-- Engagement Metrics
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS email_opens_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_clicks_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS website_visits_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS webinar_attended_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS content_downloads_count INTEGER DEFAULT 0;

-- BFSI Specific
ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS customer_segment VARCHAR(50),
  ADD COLUMN IF NOT EXISTS risk_profile VARCHAR(50),
  ADD COLUMN IF NOT EXISTS existing_products TEXT[],
  ADD COLUMN IF NOT EXISTS cross_sell_opportunities TEXT[];

COMMENT ON COLUMN crm_leads.pipeline_stage IS 'Current stage in sales pipeline: new, contacted, qualified, proposal, negotiation, closed_won, closed_lost';
COMMENT ON COLUMN crm_leads.priority IS 'Lead priority: low, medium, high, urgent';
COMMENT ON COLUMN crm_leads.lead_temperature IS 'Lead engagement level: cold, warm, hot';
COMMENT ON COLUMN crm_leads.do_not_contact IS 'Master DND flag - if true, no communication allowed';
COMMENT ON COLUMN crm_leads.tags IS 'Array of tags for segmentation and filtering';
COMMENT ON COLUMN crm_leads.expected_value IS 'Expected revenue from this lead';

-- =====================================================
-- PART 2: CREATE CAMPAIGN MANAGEMENT TABLES
-- =====================================================

-- Campaigns Table
CREATE TABLE IF NOT EXISTS crm_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id SERIAL UNIQUE NOT NULL,
  campaign_name VARCHAR(255) NOT NULL,
  campaign_type VARCHAR(50) NOT NULL, -- sales, marketing, service, retention, cross_sell
  campaign_category VARCHAR(50), -- offer, timely, targeted, nurture
  description TEXT,

  -- Campaign Details
  objective TEXT,
  target_audience TEXT,
  product_focus VARCHAR(255),
  offer_details TEXT,

  -- Timeline
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,

  -- Targeting
  target_segment VARCHAR(100),
  target_lead_score_min INTEGER,
  target_lead_score_max INTEGER,
  geographic_target TEXT[],

  -- Budget & Goals
  budget_allocated NUMERIC(12, 2),
  budget_spent NUMERIC(12, 2) DEFAULT 0,
  target_leads_count INTEGER,
  target_conversions_count INTEGER,
  target_revenue NUMERIC(12, 2),

  -- Performance Metrics (auto-calculated)
  actual_leads_count INTEGER DEFAULT 0,
  actual_conversions_count INTEGER DEFAULT 0,
  actual_revenue NUMERIC(12, 2) DEFAULT 0,
  conversion_rate NUMERIC(5, 2) DEFAULT 0,
  cost_per_lead NUMERIC(10, 2) DEFAULT 0,
  cost_per_conversion NUMERIC(10, 2) DEFAULT 0,
  roi_percentage NUMERIC(5, 2) DEFAULT 0,

  -- Communication Channels
  channels_used TEXT[], -- email, whatsapp, call, sms, in_person
  whatsapp_template_ids UUID[],
  email_template_id UUID,

  -- Ownership
  campaign_owner_id UUID REFERENCES crm_employees(id),
  created_by UUID REFERENCES crm_employees(id),
  updated_by UUID REFERENCES crm_employees(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_campaign_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_campaign_active ON crm_campaigns(is_active);
CREATE INDEX idx_campaign_dates ON crm_campaigns(start_date, end_date);
CREATE INDEX idx_campaign_type ON crm_campaigns(campaign_type);
CREATE INDEX idx_campaign_owner ON crm_campaigns(campaign_owner_id);

COMMENT ON TABLE crm_campaigns IS 'Campaign master table for organizing sales and marketing initiatives';

-- =====================================================
-- PART 3: CAMPAIGN-LEAD ASSOCIATION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS crm_campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,

  -- Association Details
  added_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID REFERENCES crm_employees(id),

  -- Lead Response to Campaign
  response_status VARCHAR(50) DEFAULT 'pending', -- pending, responded, converted, no_response, opted_out
  response_date TIMESTAMP WITH TIME ZONE,
  response_channel VARCHAR(50),

  -- Engagement Tracking
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  whatsapp_sent INTEGER DEFAULT 0,
  whatsapp_replied INTEGER DEFAULT 0,
  calls_made INTEGER DEFAULT 0,
  calls_connected INTEGER DEFAULT 0,

  -- Conversion Tracking
  converted BOOLEAN DEFAULT false,
  conversion_date TIMESTAMP WITH TIME ZONE,
  conversion_value NUMERIC(12, 2),

  -- Notes
  campaign_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint
  CONSTRAINT unique_campaign_lead UNIQUE (campaign_id, lead_id)
);

CREATE INDEX idx_campaign_leads_campaign ON crm_campaign_leads(campaign_id);
CREATE INDEX idx_campaign_leads_lead ON crm_campaign_leads(lead_id);
CREATE INDEX idx_campaign_leads_response ON crm_campaign_leads(response_status);
CREATE INDEX idx_campaign_leads_converted ON crm_campaign_leads(converted);

COMMENT ON TABLE crm_campaign_leads IS 'Many-to-many relationship between campaigns and leads with engagement tracking';

-- =====================================================
-- PART 4: LEAD ACTIVITY LOG (Comprehensive Tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS crm_lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id SERIAL UNIQUE NOT NULL,
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES crm_employees(id),

  -- Activity Details
  activity_type VARCHAR(50) NOT NULL, -- email_sent, call_made, whatsapp_sent, meeting_scheduled, status_changed, score_changed, campaign_added, note_added
  activity_category VARCHAR(50), -- communication, system, manual
  activity_title VARCHAR(255),
  activity_description TEXT,

  -- Metadata
  channel VARCHAR(50), -- email, call, whatsapp, sms, in_person, system
  direction VARCHAR(20), -- inbound, outbound, system
  outcome VARCHAR(50), -- success, failed, no_response, scheduled, completed

  -- Campaign Association
  campaign_id UUID REFERENCES crm_campaigns(id),

  -- Changes Tracking (for system activities)
  field_changed VARCHAR(100),
  old_value TEXT,
  new_value TEXT,

  -- Timestamps
  activity_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Additional Data (JSON for flexibility)
  metadata JSONB
);

CREATE INDEX idx_lead_activities_lead ON crm_lead_activities(lead_id, activity_timestamp DESC);
CREATE INDEX idx_lead_activities_type ON crm_lead_activities(activity_type);
CREATE INDEX idx_lead_activities_employee ON crm_lead_activities(employee_id);
CREATE INDEX idx_lead_activities_campaign ON crm_lead_activities(campaign_id);
CREATE INDEX idx_lead_activities_timestamp ON crm_lead_activities(activity_timestamp DESC);

COMMENT ON TABLE crm_lead_activities IS 'Comprehensive activity log for all lead interactions and system changes';

-- =====================================================
-- PART 5: LEAD TAGS MASTER TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id SERIAL UNIQUE NOT NULL,
  tag_name VARCHAR(100) NOT NULL UNIQUE,
  tag_category VARCHAR(50), -- behavior, demographic, product_interest, lifecycle, custom
  tag_color VARCHAR(20) DEFAULT '#6B7280',
  description TEXT,

  -- Auto-assignment Rules (JSONB for flexibility)
  auto_assign_rules JSONB,

  -- Usage Stats
  leads_count INTEGER DEFAULT 0,

  -- Management
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES crm_employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tags_category ON crm_tags(tag_category);
CREATE INDEX idx_tags_active ON crm_tags(is_active);

COMMENT ON TABLE crm_tags IS 'Master table for managing lead tags and segmentation';

-- Insert Default Tags
INSERT INTO crm_tags (tag_name, tag_category, tag_color, description) VALUES
  ('High Value', 'behavior', '#10B981', 'Leads with high expected value'),
  ('Price Sensitive', 'behavior', '#F59E0B', 'Leads showing price concerns'),
  ('Quick Decision Maker', 'behavior', '#3B82F6', 'Leads who convert quickly'),
  ('Needs Nurturing', 'lifecycle', '#8B5CF6', 'Leads requiring long-term follow-up'),
  ('Webinar Attendee', 'engagement', '#EC4899', 'Attended at least one webinar'),
  ('Referral', 'source', '#14B8A6', 'Came through referral program'),
  ('Hot Lead', 'temperature', '#EF4444', 'Highly engaged and ready to buy'),
  ('Competitor Comparison', 'behavior', '#F97316', 'Evaluating multiple options'),
  ('Corporate Client', 'demographic', '#6366F1', 'B2B enterprise lead'),
  ('Student', 'demographic', '#84CC16', 'Individual learner'),
  ('Professional', 'demographic', '#0EA5E9', 'Working professional'),
  ('Re-engaged', 'lifecycle', '#A855F7', 'Previously cold, now active again')
ON CONFLICT (tag_name) DO NOTHING;

-- =====================================================
-- PART 6: ADD NEW INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_lead_pipeline_stage ON crm_leads(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_lead_priority ON crm_leads(priority);
CREATE INDEX IF NOT EXISTS idx_lead_temperature ON crm_leads(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_lead_tags ON crm_leads USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_lead_first_contacted ON crm_leads(first_contacted_at);
CREATE INDEX IF NOT EXISTS idx_lead_dnd ON crm_leads(do_not_contact) WHERE do_not_contact = true;
CREATE INDEX IF NOT EXISTS idx_lead_expected_value ON crm_leads(expected_value DESC);
CREATE INDEX IF NOT EXISTS idx_lead_campaign ON crm_leads(primary_campaign_id);
CREATE INDEX IF NOT EXISTS idx_lead_company ON crm_leads(company_name);
CREATE INDEX IF NOT EXISTS idx_lead_industry ON crm_leads(industry);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_priority ON crm_leads(pipeline_stage, priority);
CREATE INDEX IF NOT EXISTS idx_lead_assigned_status ON crm_leads(assigned_to, lead_status);
CREATE INDEX IF NOT EXISTS idx_lead_source_campaign ON crm_leads(lead_source, primary_campaign_id);

-- =====================================================
-- PART 7: UPDATE EXISTING DATA WITH DEFAULTS
-- =====================================================

-- Set pipeline_stage based on current lead_status
UPDATE crm_leads
SET pipeline_stage = CASE
  WHEN lead_status = 'new' THEN 'new'
  WHEN lead_status = 'contacted' THEN 'contacted'
  WHEN lead_status = 'qualified' THEN 'qualified'
  WHEN lead_status = 'interested' THEN 'qualified'
  WHEN lead_status = 'negotiating' THEN 'negotiation'
  WHEN lead_status = 'converted' THEN 'closed_won'
  WHEN lead_status = 'lost' THEN 'closed_lost'
  ELSE 'new'
END
WHERE pipeline_stage IS NULL;

-- Set lead_temperature based on lead_score
UPDATE crm_leads
SET lead_temperature = CASE
  WHEN lead_score >= 4 THEN 'hot'
  WHEN lead_score = 3 THEN 'warm'
  ELSE 'cold'
END
WHERE lead_temperature IS NULL;

-- Set priority based on score and followup date
UPDATE crm_leads
SET priority = CASE
  WHEN lead_score = 5 OR next_followup_date = CURRENT_DATE THEN 'urgent'
  WHEN lead_score >= 4 THEN 'high'
  WHEN lead_score = 3 THEN 'medium'
  ELSE 'low'
END
WHERE priority IS NULL;

-- Set first_contacted_at to earliest interaction date
UPDATE crm_leads l
SET first_contacted_at = (
  SELECT MIN(interaction_date)
  FROM crm_lead_interactions i
  WHERE i.lead_id = l.id
)
WHERE first_contacted_at IS NULL;

-- Set deal_size_category based on expected_value
UPDATE crm_leads
SET deal_size_category = CASE
  WHEN expected_value >= 100000 THEN 'enterprise'
  WHEN expected_value >= 50000 THEN 'mid-market'
  WHEN expected_value >= 10000 THEN 'small-business'
  ELSE 'individual'
END
WHERE expected_value IS NOT NULL AND deal_size_category IS NULL;

-- =====================================================
-- PART 8: CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to auto-update campaign metrics
CREATE OR REPLACE FUNCTION update_campaign_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update campaign lead counts and revenue
  UPDATE crm_campaigns c
  SET
    actual_leads_count = (
      SELECT COUNT(*)
      FROM crm_campaign_leads
      WHERE campaign_id = c.id
    ),
    actual_conversions_count = (
      SELECT COUNT(*)
      FROM crm_campaign_leads
      WHERE campaign_id = c.id AND converted = true
    ),
    actual_revenue = (
      SELECT COALESCE(SUM(conversion_value), 0)
      FROM crm_campaign_leads
      WHERE campaign_id = c.id AND converted = true
    ),
    conversion_rate = (
      SELECT CASE
        WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE converted = true) * 100.0 / COUNT(*))
        ELSE 0
      END
      FROM crm_campaign_leads
      WHERE campaign_id = c.id
    ),
    cost_per_lead = CASE
      WHEN (SELECT COUNT(*) FROM crm_campaign_leads WHERE campaign_id = c.id) > 0
      THEN c.budget_spent / (SELECT COUNT(*) FROM crm_campaign_leads WHERE campaign_id = c.id)
      ELSE 0
    END,
    cost_per_conversion = CASE
      WHEN (SELECT COUNT(*) FROM crm_campaign_leads WHERE campaign_id = c.id AND converted = true) > 0
      THEN c.budget_spent / (SELECT COUNT(*) FROM crm_campaign_leads WHERE campaign_id = c.id AND converted = true)
      ELSE 0
    END,
    roi_percentage = CASE
      WHEN c.budget_spent > 0
      THEN ((SELECT COALESCE(SUM(conversion_value), 0) FROM crm_campaign_leads WHERE campaign_id = c.id AND converted = true) - c.budget_spent) / c.budget_spent * 100
      ELSE 0
    END,
    updated_at = NOW()
  WHERE c.id = NEW.campaign_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update campaign metrics
DROP TRIGGER IF EXISTS trigger_update_campaign_metrics ON crm_campaign_leads;
CREATE TRIGGER trigger_update_campaign_metrics
AFTER INSERT OR UPDATE OR DELETE ON crm_campaign_leads
FOR EACH ROW
EXECUTE FUNCTION update_campaign_metrics();

-- Function to log lead activity on status change
CREATE OR REPLACE FUNCTION log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.lead_status IS DISTINCT FROM NEW.lead_status) THEN
    INSERT INTO crm_lead_activities (
      lead_id,
      employee_id,
      activity_type,
      activity_category,
      activity_title,
      field_changed,
      old_value,
      new_value,
      channel,
      direction
    ) VALUES (
      NEW.id,
      NEW.updated_by,
      'status_changed',
      'system',
      'Lead status changed from ' || OLD.lead_status || ' to ' || NEW.lead_status,
      'lead_status',
      OLD.lead_status,
      NEW.lead_status,
      'system',
      'system'
    );

    -- Update status change tracking
    NEW.last_status_change_at := NOW();
    NEW.status_change_count := COALESCE(OLD.status_change_count, 0) + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for logging status changes
DROP TRIGGER IF EXISTS trigger_log_status_change ON crm_leads;
CREATE TRIGGER trigger_log_status_change
BEFORE UPDATE ON crm_leads
FOR EACH ROW
EXECUTE FUNCTION log_lead_status_change();

-- Function to update tag counts
CREATE OR REPLACE FUNCTION update_tag_counts()
RETURNS void AS $$
BEGIN
  UPDATE crm_tags t
  SET leads_count = (
    SELECT COUNT(*)
    FROM crm_leads
    WHERE t.tag_name = ANY(tags)
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 9: CREATE VIEWS FOR ANALYTICS
-- =====================================================

-- Campaign Performance View
CREATE OR REPLACE VIEW vw_campaign_performance AS
SELECT
  c.id,
  c.campaign_id,
  c.campaign_name,
  c.campaign_type,
  c.campaign_category,
  c.start_date,
  c.end_date,
  c.is_active,
  c.target_leads_count,
  c.actual_leads_count,
  c.target_conversions_count,
  c.actual_conversions_count,
  c.conversion_rate,
  c.budget_allocated,
  c.budget_spent,
  c.cost_per_lead,
  c.cost_per_conversion,
  c.target_revenue,
  c.actual_revenue,
  c.roi_percentage,
  e.full_name as campaign_owner_name,
  CASE
    WHEN c.end_date < CURRENT_DATE THEN 'completed'
    WHEN c.start_date > CURRENT_DATE THEN 'scheduled'
    WHEN c.is_active THEN 'active'
    ELSE 'paused'
  END as status,
  EXTRACT(DAY FROM (COALESCE(c.end_date, CURRENT_DATE) - c.start_date)) as duration_days
FROM crm_campaigns c
LEFT JOIN crm_employees e ON c.campaign_owner_id = e.id;

-- Lead Pipeline View
CREATE OR REPLACE VIEW vw_lead_pipeline AS
SELECT
  l.pipeline_stage,
  l.priority,
  l.lead_temperature,
  COUNT(*) as lead_count,
  SUM(l.expected_value) as total_expected_value,
  AVG(l.lead_score) as avg_lead_score,
  COUNT(*) FILTER (WHERE l.next_followup_date = CURRENT_DATE) as followup_today_count,
  COUNT(*) FILTER (WHERE l.next_followup_date < CURRENT_DATE) as overdue_count
FROM crm_leads l
WHERE l.is_converted = false AND l.lead_status != 'lost'
GROUP BY l.pipeline_stage, l.priority, l.lead_temperature;

-- =====================================================
-- PART 10: GRANT PERMISSIONS
-- =====================================================

-- Grant access to new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON crm_campaigns TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON crm_campaign_leads TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON crm_lead_activities TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON crm_tags TO anon, authenticated;

-- Grant usage on sequences
GRANT USAGE ON SEQUENCE crm_campaigns_campaign_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE crm_lead_activities_activity_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE crm_tags_tag_id_seq TO anon, authenticated;

-- Grant access to views
GRANT SELECT ON vw_campaign_performance TO anon, authenticated;
GRANT SELECT ON vw_lead_pipeline TO anon, authenticated;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Enterprise CRM Enhancement Migration Completed Successfully!' AS status,
       'Added ' || (
         SELECT COUNT(*)
         FROM information_schema.columns
         WHERE table_name = 'crm_leads'
         AND table_schema = 'public'
       ) || ' columns to crm_leads table' AS leads_columns,
       'Created 4 new tables: campaigns, campaign_leads, lead_activities, tags' AS new_tables,
       'Created 2 analytical views for reporting' AS views_created;
