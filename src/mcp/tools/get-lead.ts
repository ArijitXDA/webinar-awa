/**
 * Get Lead Details Tool
 * Retrieve complete details of a specific lead
 */

import { z } from 'zod'
import { MCPContext, Lead } from '../types'
import { supabase } from '../auth'
import { canViewLead } from '../permissions'

export const getLeadSchema = z.object({
  leadId: z.string().describe('The UUID of the lead to retrieve'),
  includeInteractions: z.boolean().default(false).describe('Include interaction history'),
  includeAssignmentHistory: z.boolean().default(false).describe('Include assignment history'),
})

export async function getLead(
  params: { leadId: string; includeInteractions?: boolean; includeAssignmentHistory?: boolean },
  context: MCPContext
): Promise<{
  lead: Lead
  interactions?: any[]
  assignments?: any[]
}> {
  try {
    const { employee } = context
    const { leadId, includeInteractions, includeAssignmentHistory } = params

    // Fetch lead
    const { data: lead, error } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (error || !lead) {
      throw new Error('Lead not found')
    }

    // Check permissions
    const permission = await canViewLead(employee, lead as Lead)
    if (!permission.canView) {
      throw new Error(permission.reason || 'Insufficient permissions to view this lead')
    }

    const result: any = {
      lead,
      permissions: permission,
    }

    // Include interactions if requested
    if (includeInteractions) {
      const { data: interactions } = await supabase
        .from('crm_lead_interactions')
        .select('*, crm_employees(full_name, email)')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(50)

      result.interactions = interactions || []
    }

    // Include assignment history if requested
    if (includeAssignmentHistory) {
      const { data: assignments } = await supabase
        .from('crm_lead_assignments')
        .select(`
          *,
          assigned_from_emp:crm_employees!crm_lead_assignments_assigned_from_fkey(full_name),
          assigned_to_emp:crm_employees!crm_lead_assignments_assigned_to_fkey(full_name),
          assigned_by_emp:crm_employees!crm_lead_assignments_assigned_by_fkey(full_name)
        `)
        .eq('lead_id', leadId)
        .order('assigned_at', { ascending: false })
        .limit(20)

      result.assignments = assignments || []
    }

    // Log the access
    await supabase.from('crm_audit_log').insert({
      employee_id: employee.id,
      emp_id: employee.emp_id,
      action: 'mcp_get_lead',
      entity_type: 'lead',
      entity_id: leadId,
      description: `Retrieved lead details via MCP: ${lead.full_name}`,
    })

    return result
  } catch (error: any) {
    throw new Error(`Get lead failed: ${error.message}`)
  }
}

export const getLeadTool = {
  name: 'get_lead_details',
  description: `Retrieve complete details of a specific lead by ID.

Returns:
- Full lead information including all enterprise fields
- User's permissions for this lead (view, edit, delete, assign)
- Optional interaction history
- Optional assignment history

Respects role-based permissions and hierarchy. Users can only view leads they have access to.`,
  inputSchema: getLeadSchema,
  handler: getLead,
}
