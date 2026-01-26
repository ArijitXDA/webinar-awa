/**
 * CRM MCP Server Types
 * Type definitions for the MCP server
 */

export interface Employee {
  id: string
  emp_id: string
  full_name: string
  email: string
  mobile: string
  job_role: string
  is_active: boolean
  reports_to: string | null
  created_at: string
}

export interface Lead {
  id: string
  lead_id: number
  full_name: string
  country_code: string
  mobile: string
  email: string | null
  lead_source: string
  for_whom: string
  course: string | null
  lead_score: number
  lead_status: string
  next_followup_date: string | null
  assigned_to: string
  generated_by: string
  is_converted: boolean
  created_at: string
  updated_at: string
  // Enterprise fields
  tags: string[] | null
  pipeline_stage: string | null
  priority: string | null
  lead_temperature: string | null
  company_name: string | null
  industry: string | null
  expected_value: number | null
  deal_size_category: string | null
  customer_segment: string | null
}

export interface Interaction {
  id: string
  lead_id: string
  employee_id: string
  interaction_type: string
  discussion_notes: string
  lead_score_before: number
  lead_score_after: number
  lead_status_before: string
  lead_status_after: string
  next_followup_date: string | null
  interaction_date: string
  created_at: string
}

export interface MCPContext {
  employee: Employee
  email: string
}

export interface PermissionCheck {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canAssign: boolean
  reason?: string
}

export type JobRole =
  | 'owner'
  | 'ea_to_owner'
  | 'director'
  | 'ea_to_director'
  | 'pm_ai_spot'
  | 'pm_b2c_btl'
  | 'pm_stage_2'
  | 'pm_stage_3'
  | 'sales_lead'
  | 'sales_executive'
  | 'marketing_lead'
  | 'marketing_executive'
  | 'support_lead'
  | 'support_executive'

export const ROLE_HIERARCHY: Record<JobRole, number> = {
  owner: 10,
  ea_to_owner: 9,
  director: 8,
  ea_to_director: 7,
  pm_ai_spot: 6,
  pm_b2c_btl: 6,
  pm_stage_2: 6,
  pm_stage_3: 6,
  sales_lead: 5,
  marketing_lead: 5,
  support_lead: 5,
  sales_executive: 4,
  marketing_executive: 4,
  support_executive: 4,
}

export interface SearchLeadsParams {
  query?: string
  status?: string
  source?: string
  assignedTo?: string
  priority?: string
  temperature?: string
  pipelineStage?: string
  tag?: string
  limit?: number
  offset?: number
}

export interface UpdateLeadParams {
  leadId: string
  updates: Partial<{
    lead_score: number
    lead_status: string
    next_followup_date: string
    priority: string
    lead_temperature: string
    pipeline_stage: string
    tags: string[]
    assigned_to: string
  }>
}

export interface AddInteractionParams {
  leadId: string
  interactionType: 'call' | 'whatsapp' | 'email' | 'meeting' | 'note'
  discussionNotes: string
  leadScore?: number
  leadStatus?: string
  nextFollowupDate?: string
}

export interface AnalyticsParams {
  startDate?: string
  endDate?: string
  groupBy?: 'status' | 'source' | 'priority' | 'pipeline_stage'
  assignedTo?: string
}

export interface MCPTool<T = any> {
  name: string
  description: string
  inputSchema: any
  handler: (params: T, context: MCPContext) => Promise<any>
}
