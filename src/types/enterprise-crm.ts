// =====================================================
// ENTERPRISE CRM - TYPESCRIPT INTERFACES
// =====================================================

// Enhanced Lead Interface with all new fields
export interface EnhancedLead {
  // Existing fields
  id: string
  lead_id: number
  full_name: string
  country_code: string
  mobile: string
  email: string | null
  lead_source: string
  for_whom: string | null
  course: string | null
  lead_generation_date: string
  next_followup_date: string | null
  target_conversion_date: string | null
  lead_score: number
  lead_status: string
  status_notes: string | null
  assigned_to: string | null
  generated_by: string | null
  is_converted: boolean
  conversion_date: string | null
  conversion_value: number | null
  created_at: string
  updated_at: string
  last_interaction_at: string | null

  // NEW: Pipeline & Prioritization
  pipeline_stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  lead_temperature: 'cold' | 'warm' | 'hot'

  // NEW: Contact Tracking
  first_contacted_at: string | null
  last_email_sent_at: string | null
  last_call_at: string | null
  last_whatsapp_sent_at: string | null

  // NEW: Lead Source & Attribution
  lead_source_detail: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_term: string | null
  utm_content: string | null
  referral_source: string | null

  // NEW: Loss Tracking
  lost_reason: string | null
  lost_date: string | null
  competitor_lost_to: string | null

  // NEW: Value & Revenue
  expected_value: number | null
  annual_revenue_potential: number | null
  deal_size_category: 'individual' | 'small-business' | 'mid-market' | 'enterprise' | null

  // NEW: Ownership Tracking
  owner_changed_at: string | null
  previous_owner_id: string | null
  owner_change_reason: string | null

  // NEW: Tagging & Categorization
  tags: string[]
  industry: string | null
  company_name: string | null
  job_title: string | null
  company_size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise' | null

  // NEW: Communication Preferences
  timezone: string
  communication_preference: 'any' | 'email' | 'phone' | 'whatsapp' | 'in_person'
  best_time_to_contact: string | null
  language_preference: string
  do_not_contact: boolean
  do_not_email: boolean
  do_not_call: boolean
  do_not_whatsapp: boolean

  // NEW: Campaign Association
  primary_campaign_id: string | null
  campaign_response_status: string | null

  // NEW: Status Change Tracking
  last_status_change_at: string | null
  status_change_count: number

  // NEW: Engagement Metrics
  email_opens_count: number
  email_clicks_count: number
  website_visits_count: number
  webinar_attended_count: number
  content_downloads_count: number

  // NEW: BFSI Specific
  customer_segment: string | null
  risk_profile: 'low' | 'medium' | 'high' | null
  existing_products: string[]
  cross_sell_opportunities: string[]

  // Joined fields (from other tables)
  assigned_to_name?: string
  generated_by_name?: string
  interaction_count?: number
  campaign_name?: string
}

// Campaign Interface
export interface Campaign {
  id: string
  campaign_id: number
  campaign_name: string
  campaign_type: 'sales' | 'marketing' | 'service' | 'retention' | 'cross_sell'
  campaign_category: 'offer' | 'timely' | 'targeted' | 'nurture'
  description: string | null

  // Campaign Details
  objective: string | null
  target_audience: string | null
  product_focus: string | null
  offer_details: string | null

  // Timeline
  start_date: string
  end_date: string | null
  is_active: boolean

  // Targeting
  target_segment: string | null
  target_lead_score_min: number | null
  target_lead_score_max: number | null
  geographic_target: string[]

  // Budget & Goals
  budget_allocated: number | null
  budget_spent: number
  target_leads_count: number | null
  target_conversions_count: number | null
  target_revenue: number | null

  // Performance Metrics
  actual_leads_count: number
  actual_conversions_count: number
  actual_revenue: number
  conversion_rate: number
  cost_per_lead: number
  cost_per_conversion: number
  roi_percentage: number

  // Communication Channels
  channels_used: string[]
  whatsapp_template_ids: string[]
  email_template_id: string | null

  // Ownership
  campaign_owner_id: string | null
  created_by: string | null
  updated_by: string | null

  // Timestamps
  created_at: string
  updated_at: string

  // Joined fields
  campaign_owner_name?: string
  leads_in_campaign?: number
  status?: 'scheduled' | 'active' | 'paused' | 'completed'
}

// Campaign-Lead Association
export interface CampaignLead {
  id: string
  campaign_id: string
  lead_id: string

  // Association Details
  added_date: string
  added_by: string | null

  // Lead Response
  response_status: 'pending' | 'responded' | 'converted' | 'no_response' | 'opted_out'
  response_date: string | null
  response_channel: string | null

  // Engagement Tracking
  emails_sent: number
  emails_opened: number
  emails_clicked: number
  whatsapp_sent: number
  whatsapp_replied: number
  calls_made: number
  calls_connected: number

  // Conversion Tracking
  converted: boolean
  conversion_date: string | null
  conversion_value: number | null

  // Notes
  campaign_notes: string | null

  created_at: string
  updated_at: string

  // Joined fields
  lead_name?: string
  campaign_name?: string
}

// Lead Activity
export interface LeadActivity {
  id: string
  activity_id: number
  lead_id: string
  employee_id: string | null

  // Activity Details
  activity_type: 'email_sent' | 'call_made' | 'whatsapp_sent' | 'meeting_scheduled' | 'status_changed' | 'score_changed' | 'campaign_added' | 'note_added'
  activity_category: 'communication' | 'system' | 'manual'
  activity_title: string | null
  activity_description: string | null

  // Metadata
  channel: 'email' | 'call' | 'whatsapp' | 'sms' | 'in_person' | 'system' | null
  direction: 'inbound' | 'outbound' | 'system' | null
  outcome: 'success' | 'failed' | 'no_response' | 'scheduled' | 'completed' | null

  // Campaign Association
  campaign_id: string | null

  // Changes Tracking
  field_changed: string | null
  old_value: string | null
  new_value: string | null

  // Timestamps
  activity_timestamp: string
  created_at: string

  // Additional Data
  metadata: Record<string, any> | null

  // Joined fields
  employee_name?: string
  lead_name?: string
  campaign_name?: string
}

// Tag Interface
export interface Tag {
  id: string
  tag_id: number
  tag_name: string
  tag_category: 'behavior' | 'demographic' | 'product_interest' | 'lifecycle' | 'custom'
  tag_color: string
  description: string | null

  // Auto-assignment Rules
  auto_assign_rules: Record<string, any> | null

  // Usage Stats
  leads_count: number

  // Management
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

// =====================================================
// ANALYTICS & REPORTING INTERFACES
// =====================================================

export interface CampaignPerformance {
  id: string
  campaign_id: number
  campaign_name: string
  campaign_type: string
  campaign_category: string
  start_date: string
  end_date: string | null
  is_active: boolean
  target_leads_count: number | null
  actual_leads_count: number
  target_conversions_count: number | null
  actual_conversions_count: number
  conversion_rate: number
  budget_allocated: number | null
  budget_spent: number
  cost_per_lead: number
  cost_per_conversion: number
  target_revenue: number | null
  actual_revenue: number
  roi_percentage: number
  campaign_owner_name: string | null
  status: 'completed' | 'scheduled' | 'active' | 'paused'
  duration_days: number
}

export interface LeadPipelineMetrics {
  pipeline_stage: string
  priority: string
  lead_temperature: string
  lead_count: number
  total_expected_value: number
  avg_lead_score: number
  followup_today_count: number
  overdue_count: number
}

// =====================================================
// FORM & FILTER INTERFACES
// =====================================================

export interface CampaignFilters {
  campaign_type?: string
  campaign_category?: string
  is_active?: boolean
  start_date_from?: string
  start_date_to?: string
  campaign_owner_id?: string
  min_conversion_rate?: number
  min_roi?: number
}

export interface EnhancedLeadFilters {
  // Existing filters
  status?: string
  source?: string
  score?: number
  assignedTo?: string
  followupFrom?: string
  followupTo?: string

  // NEW filters
  pipeline_stage?: string
  priority?: string
  lead_temperature?: string
  tags?: string[]
  industry?: string
  company_size?: string
  expected_value_min?: number
  expected_value_max?: number
  campaign_id?: string
  do_not_contact?: boolean
  communication_preference?: string
  customer_segment?: string
  risk_profile?: string
}

// =====================================================
// API REQUEST/RESPONSE INTERFACES
// =====================================================

export interface CreateCampaignRequest {
  campaign_name: string
  campaign_type: string
  campaign_category: string
  description?: string
  objective?: string
  target_audience?: string
  product_focus?: string
  offer_details?: string
  start_date: string
  end_date?: string
  budget_allocated?: number
  target_leads_count?: number
  target_conversions_count?: number
  target_revenue?: number
  channels_used?: string[]
  campaign_owner_id?: string
}

export interface AddLeadsToCampaignRequest {
  campaign_id: string
  lead_ids: string[]
  campaign_notes?: string
}

export interface UpdateLeadEnhancedRequest {
  // All the new fields that can be updated
  pipeline_stage?: string
  priority?: string
  lead_temperature?: string
  expected_value?: number
  tags?: string[]
  company_name?: string
  job_title?: string
  industry?: string
  company_size?: string
  communication_preference?: string
  best_time_to_contact?: string
  timezone?: string
  do_not_contact?: boolean
  do_not_email?: boolean
  do_not_call?: boolean
  do_not_whatsapp?: boolean
  primary_campaign_id?: string
  customer_segment?: string
  risk_profile?: string
  existing_products?: string[]
  cross_sell_opportunities?: string[]
}

export interface BulkTagRequest {
  lead_ids: string[]
  tags_to_add?: string[]
  tags_to_remove?: string[]
}

// =====================================================
// CONSTANTS
// =====================================================

export const PIPELINE_STAGES = [
  { value: 'new', label: 'New', color: 'blue' },
  { value: 'contacted', label: 'Contacted', color: 'cyan' },
  { value: 'qualified', label: 'Qualified', color: 'green' },
  { value: 'proposal', label: 'Proposal Sent', color: 'yellow' },
  { value: 'negotiation', label: 'Negotiation', color: 'orange' },
  { value: 'closed_won', label: 'Closed Won', color: 'emerald' },
  { value: 'closed_lost', label: 'Closed Lost', color: 'red' }
] as const

export const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'slate' },
  { value: 'medium', label: 'Medium', color: 'blue' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'urgent', label: 'Urgent', color: 'red' }
] as const

export const LEAD_TEMPERATURES = [
  { value: 'cold', label: 'Cold', color: 'blue', icon: '❄️' },
  { value: 'warm', label: 'Warm', color: 'yellow', icon: '🌤️' },
  { value: 'hot', label: 'Hot', color: 'red', icon: '🔥' }
] as const

export const CAMPAIGN_TYPES = [
  { value: 'sales', label: 'Sales Campaign' },
  { value: 'marketing', label: 'Marketing Campaign' },
  { value: 'service', label: 'Customer Service' },
  { value: 'retention', label: 'Retention Campaign' },
  { value: 'cross_sell', label: 'Cross-Sell/Up-Sell' }
] as const

export const CAMPAIGN_CATEGORIES = [
  { value: 'offer', label: 'Special Offer', description: 'Limited-time promotional campaigns' },
  { value: 'timely', label: 'Timely/Seasonal', description: 'Holiday or time-sensitive campaigns' },
  { value: 'targeted', label: 'Targeted Outreach', description: 'Specific segment targeting' },
  { value: 'nurture', label: 'Lead Nurturing', description: 'Long-term relationship building' }
] as const

export const COMMUNICATION_CHANNELS = [
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'call', label: 'Phone Call', icon: '📞' },
  { value: 'sms', label: 'SMS', icon: '📱' },
  { value: 'in_person', label: 'In-Person Meeting', icon: '🤝' }
] as const

export const LOST_REASONS = [
  'Price too high',
  'Competitor chosen',
  'Not interested anymore',
  'Bad timing',
  'No budget',
  'Feature mismatch',
  'Unresponsive',
  'Company closed/dissolved',
  'Other'
] as const

export const INDUSTRIES = [
  'Banking',
  'Insurance',
  'Financial Services',
  'NBFC',
  'Fintech',
  'Asset Management',
  'Wealth Management',
  'Payment Solutions',
  'Lending',
  'Credit Services',
  'Other Financial'
] as const

export const COMPANY_SIZES = [
  { value: 'startup', label: 'Startup (1-10)', range: [1, 10] },
  { value: 'small', label: 'Small (11-50)', range: [11, 50] },
  { value: 'medium', label: 'Medium (51-200)', range: [51, 200] },
  { value: 'large', label: 'Large (201-1000)', range: [201, 1000] },
  { value: 'enterprise', label: 'Enterprise (1000+)', range: [1000, Infinity] }
] as const

export const CUSTOMER_SEGMENTS = [
  'Retail',
  'Corporate',
  'SME',
  'HNI (High Net Worth Individual)',
  'Mass Affluent',
  'Institutional',
  'Government'
] as const

export const RISK_PROFILES = [
  { value: 'low', label: 'Low Risk', color: 'green' },
  { value: 'medium', label: 'Medium Risk', color: 'yellow' },
  { value: 'high', label: 'High Risk', color: 'red' }
] as const
