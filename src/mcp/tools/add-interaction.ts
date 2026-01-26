/**
 * Add Interaction Tool
 * Record a new interaction with a lead
 */

import { z } from 'zod'
import { MCPContext, Lead, AddInteractionParams } from '../types'
import { supabase } from '../auth'
import { canViewLead } from '../permissions'

export const addInteractionSchema = z.object({
  leadId: z.string().describe('The UUID of the lead'),
  interactionType: z.enum(['call', 'whatsapp', 'email', 'meeting', 'note']).describe('Type of interaction'),
  discussionNotes: z.string().min(1).describe('Notes about the interaction'),
  leadScore: z.number().min(1).max(5).optional().describe('Updated lead score after interaction'),
  leadStatus: z.enum(['new', 'contacted', 'follow_up_again', 'need_something', 'converted', 'not_interested']).optional().describe('Updated lead status'),
  nextFollowupDate: z.string().optional().describe('Next follow-up date (YYYY-MM-DD)'),
  priority: z.enum(['urgent', 'high', 'medium', 'low']).optional().describe('Updated priority'),
  leadTemperature: z.enum(['hot', 'warm', 'cold']).optional().describe('Updated temperature'),
  pipelineStage: z.enum(['awareness', 'interest', 'consideration', 'intent', 'evaluation', 'purchase', 'retention', 'advocacy']).optional().describe('Updated pipeline stage'),
})

export async function addInteraction(
  params: AddInteractionParams & { priority?: string; leadTemperature?: string; pipelineStage?: string },
  context: MCPContext
): Promise<{
  success: boolean
  interaction: any
  lead: Lead
  message: string
}> {
  try {
    const { employee } = context
    const {
      leadId,
      interactionType,
      discussionNotes,
      leadScore,
      leadStatus,
      nextFollowupDate,
      priority,
      leadTemperature,
      pipelineStage,
    } = params

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
    const permission = await canViewLead(employee, currentLead as Lead)
    if (!permission.canView) {
      throw new Error(permission.reason || 'Insufficient permissions to add interaction for this lead')
    }

    // Create interaction record
    const interactionData = {
      lead_id: leadId,
      employee_id: employee.id,
      interaction_type: interactionType,
      discussion_notes: discussionNotes,
      lead_score_before: currentLead.lead_score,
      lead_score_after: leadScore !== undefined ? leadScore : currentLead.lead_score,
      lead_status_before: currentLead.lead_status,
      lead_status_after: leadStatus || currentLead.lead_status,
      next_followup_date: nextFollowupDate || null,
      interaction_date: new Date().toISOString(),
    }

    const { data: interaction, error: interactionError } = await supabase
      .from('crm_lead_interactions')
      .insert(interactionData)
      .select()
      .single()

    if (interactionError) {
      throw new Error(`Failed to create interaction: ${interactionError.message}`)
    }

    // Update lead if any fields changed
    const leadUpdates: any = {
      last_interaction_at: new Date().toISOString(),
    }

    if (leadScore !== undefined) leadUpdates.lead_score = leadScore
    if (leadStatus) leadUpdates.lead_status = leadStatus
    if (nextFollowupDate) leadUpdates.next_followup_date = nextFollowupDate
    if (priority) leadUpdates.priority = priority
    if (leadTemperature) leadUpdates.lead_temperature = leadTemperature
    if (pipelineStage) leadUpdates.pipeline_stage = pipelineStage

    // Handle conversion
    if (leadStatus === 'converted' && currentLead.lead_status !== 'converted') {
      leadUpdates.is_converted = true
      leadUpdates.conversion_date = new Date().toISOString().split('T')[0]
    }

    const { data: updatedLead, error: updateError } = await supabase
      .from('crm_leads')
      .update(leadUpdates)
      .eq('id', leadId)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update lead: ${updateError.message}`)
    }

    // Log the interaction
    await supabase.from('crm_audit_log').insert({
      employee_id: employee.id,
      emp_id: employee.emp_id,
      action: 'mcp_add_interaction',
      entity_type: 'lead',
      entity_id: leadId,
      description: `Added ${interactionType} interaction via MCP for: ${currentLead.full_name}`,
    })

    return {
      success: true,
      interaction,
      lead: updatedLead as Lead,
      message: 'Interaction added successfully',
    }
  } catch (error: any) {
    throw new Error(`Add interaction failed: ${error.message}`)
  }
}

export const addInteractionTool = {
  name: 'add_interaction',
  description: `Record a new interaction with a lead.

Interaction types:
- call: Phone call
- whatsapp: WhatsApp message/call
- email: Email communication
- meeting: In-person or virtual meeting
- note: General note or observation

Can optionally update:
- Lead score (1-5)
- Lead status
- Next follow-up date
- Priority level
- Lead temperature
- Pipeline stage

Automatically:
- Records before/after values for score and status
- Updates last interaction timestamp
- Handles conversion tracking
- Creates audit trail

Respects permissions - users can only add interactions for leads they have access to.`,
  inputSchema: addInteractionSchema,
  handler: addInteraction,
}
