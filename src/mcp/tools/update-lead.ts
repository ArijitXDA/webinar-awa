/**
 * Update Lead Tool
 * Update lead information with permission checks
 */

import { z } from 'zod'
import { MCPContext, Lead, UpdateLeadParams } from '../types'
import { supabase } from '../auth'
import { canUpdateLead } from '../permissions'

export const updateLeadSchema = z.object({
  leadId: z.string().describe('The UUID of the lead to update'),
  updates: z.object({
    lead_score: z.number().min(1).max(5).optional().describe('Lead score (1-5)'),
    lead_status: z.enum(['new', 'contacted', 'follow_up_again', 'need_something', 'converted', 'not_interested']).optional().describe('Lead status'),
    next_followup_date: z.string().optional().describe('Next follow-up date (YYYY-MM-DD)'),
    priority: z.enum(['urgent', 'high', 'medium', 'low']).optional().describe('Priority level'),
    lead_temperature: z.enum(['hot', 'warm', 'cold']).optional().describe('Lead temperature'),
    pipeline_stage: z.enum(['awareness', 'interest', 'consideration', 'intent', 'evaluation', 'purchase', 'retention', 'advocacy']).optional().describe('Pipeline stage'),
    tags: z.array(z.string()).optional().describe('Array of tags'),
    assigned_to: z.string().optional().describe('Employee ID to reassign the lead to'),
    status_notes: z.string().optional().describe('Notes about status change'),
  }).describe('Fields to update'),
})

export async function updateLead(
  params: UpdateLeadParams,
  context: MCPContext
): Promise<{
  success: boolean
  lead: Lead
  message: string
}> {
  try {
    const { employee } = context
    const { leadId, updates } = params

    // Fetch current lead
    const { data: currentLead, error: fetchError } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (fetchError || !currentLead) {
      throw new Error('Lead not found')
    }

    // Check permissions
    const permission = await canUpdateLead(employee, currentLead as Lead, updates)
    if (!permission.canEdit) {
      throw new Error(permission.reason || 'Insufficient permissions to update this lead')
    }

    // Prepare update object
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    // Handle conversion
    if (updates.lead_status === 'converted' && currentLead.lead_status !== 'converted') {
      updateData.is_converted = true
      updateData.conversion_date = new Date().toISOString().split('T')[0]
    }

    // Handle reassignment
    if (updates.assigned_to && updates.assigned_to !== currentLead.assigned_to) {
      // Log assignment change
      await supabase.from('crm_lead_assignments').insert({
        lead_id: leadId,
        assigned_from: currentLead.assigned_to,
        assigned_to: updates.assigned_to,
        assigned_by: employee.id,
        assignment_reason: `Reassigned via MCP by ${employee.full_name}`,
      })
    }

    // Update lead
    const { data: updatedLead, error: updateError } = await supabase
      .from('crm_leads')
      .update(updateData)
      .eq('id', leadId)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update lead: ${updateError.message}`)
    }

    // Log the update
    const changedFields = Object.keys(updates).join(', ')
    await supabase.from('crm_audit_log').insert({
      employee_id: employee.id,
      emp_id: employee.emp_id,
      action: 'mcp_update_lead',
      entity_type: 'lead',
      entity_id: leadId,
      description: `Updated lead via MCP: ${currentLead.full_name}. Changed: ${changedFields}`,
    })

    return {
      success: true,
      lead: updatedLead as Lead,
      message: 'Lead updated successfully',
    }
  } catch (error: any) {
    throw new Error(`Update lead failed: ${error.message}`)
  }
}

export const updateLeadTool = {
  name: 'update_lead',
  description: `Update a lead's information.

Can update:
- Lead score (1-5)
- Lead status (new, contacted, follow_up_again, need_something, converted, not_interested)
- Next follow-up date
- Priority (urgent, high, medium, low)
- Temperature (hot, warm, cold)
- Pipeline stage (awareness, interest, consideration, intent, evaluation, purchase, retention, advocacy)
- Tags (array of strings)
- Assigned employee (requires assign permission)
- Status notes

Automatically handles:
- Conversion tracking when status changes to 'converted'
- Assignment history logging when reassigning
- Audit trail logging

Respects role-based permissions. Users can only update leads they have edit access to.`,
  inputSchema: updateLeadSchema,
  handler: updateLead,
}
