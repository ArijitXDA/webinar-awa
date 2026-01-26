/**
 * Bulk Operations Tool
 * Perform bulk updates on multiple leads
 */

import { z } from 'zod'
import { MCPContext, Lead } from '../types'
import { supabase } from '../auth'
import { canPerformBulkOperations, filterLeadsByPermissions, canUpdateLead } from '../permissions'

export const bulkOperationsSchema = z.object({
  operation: z.enum(['update', 'reassign', 'tag', 'untag']).describe('Type of bulk operation'),
  leadIds: z.array(z.string()).min(1).max(100).describe('Array of lead UUIDs (max 100)'),
  updates: z.object({
    lead_status: z.enum(['new', 'contacted', 'follow_up_again', 'need_something', 'converted', 'not_interested']).optional(),
    priority: z.enum(['urgent', 'high', 'medium', 'low']).optional(),
    lead_temperature: z.enum(['hot', 'warm', 'cold']).optional(),
    pipeline_stage: z.enum(['awareness', 'interest', 'consideration', 'intent', 'evaluation', 'purchase', 'retention', 'advocacy']).optional(),
    assigned_to: z.string().optional().describe('Employee ID for reassignment'),
    tags_to_add: z.array(z.string()).optional().describe('Tags to add'),
    tags_to_remove: z.array(z.string()).optional().describe('Tags to remove'),
  }).optional().describe('Updates to apply (for update operation)'),
})

export async function bulkOperations(
  params: {
    operation: 'update' | 'reassign' | 'tag' | 'untag'
    leadIds: string[]
    updates?: any
  },
  context: MCPContext
): Promise<{
  success: boolean
  processed: number
  failed: number
  results: Array<{ leadId: string; success: boolean; error?: string }>
  message: string
}> {
  try {
    const { employee } = context
    const { operation, leadIds, updates } = params

    // Check if employee can perform bulk operations
    if (!canPerformBulkOperations(employee)) {
      throw new Error('Insufficient permissions to perform bulk operations. Requires manager role or above.')
    }

    if (leadIds.length > 100) {
      throw new Error('Maximum 100 leads can be processed in a single bulk operation')
    }

    // Fetch all leads
    const { data: leads, error: fetchError } = await supabase
      .from('crm_leads')
      .select('*')
      .in('id', leadIds)

    if (fetchError) {
      throw new Error(`Failed to fetch leads: ${fetchError.message}`)
    }

    if (!leads || leads.length === 0) {
      throw new Error('No leads found with the provided IDs')
    }

    // Filter leads by permissions
    const accessibleLeads = await filterLeadsByPermissions(employee, leads as Lead[])

    if (accessibleLeads.length === 0) {
      throw new Error('No accessible leads found. You do not have permission to modify any of the specified leads.')
    }

    const results: Array<{ leadId: string; success: boolean; error?: string }> = []
    let processed = 0
    let failed = 0

    // Process each lead
    for (const lead of accessibleLeads) {
      try {
        // Check individual permissions
        const permission = await canUpdateLead(employee, lead, updates || {})
        if (!permission.canEdit) {
          results.push({
            leadId: lead.id,
            success: false,
            error: permission.reason || 'Insufficient permissions',
          })
          failed++
          continue
        }

        let updateData: any = {}

        switch (operation) {
          case 'update':
            if (updates) {
              updateData = {
                ...updates,
                updated_at: new Date().toISOString(),
              }
              delete updateData.tags_to_add
              delete updateData.tags_to_remove
            }
            break

          case 'reassign':
            if (!updates?.assigned_to) {
              throw new Error('assigned_to is required for reassign operation')
            }
            updateData.assigned_to = updates.assigned_to
            updateData.updated_at = new Date().toISOString()

            // Log assignment
            await supabase.from('crm_lead_assignments').insert({
              lead_id: lead.id,
              assigned_from: lead.assigned_to,
              assigned_to: updates.assigned_to,
              assigned_by: employee.id,
              assignment_reason: `Bulk reassignment via MCP by ${employee.full_name}`,
            })
            break

          case 'tag':
            if (!updates?.tags_to_add || updates.tags_to_add.length === 0) {
              throw new Error('tags_to_add is required for tag operation')
            }
            const currentTags = lead.tags || []
            const newTags = [...new Set([...currentTags, ...updates.tags_to_add])]
            updateData.tags = newTags
            updateData.updated_at = new Date().toISOString()
            break

          case 'untag':
            if (!updates?.tags_to_remove || updates.tags_to_remove.length === 0) {
              throw new Error('tags_to_remove is required for untag operation')
            }
            const existingTags = lead.tags || []
            const remainingTags = existingTags.filter(
              tag => !updates.tags_to_remove.includes(tag)
            )
            updateData.tags = remainingTags
            updateData.updated_at = new Date().toISOString()
            break
        }

        // Apply update
        const { error: updateError } = await supabase
          .from('crm_leads')
          .update(updateData)
          .eq('id', lead.id)

        if (updateError) {
          results.push({
            leadId: lead.id,
            success: false,
            error: updateError.message,
          })
          failed++
        } else {
          results.push({
            leadId: lead.id,
            success: true,
          })
          processed++
        }
      } catch (error: any) {
        results.push({
          leadId: lead.id,
          success: false,
          error: error.message,
        })
        failed++
      }
    }

    // Log bulk operation
    await supabase.from('crm_audit_log').insert({
      employee_id: employee.id,
      emp_id: employee.emp_id,
      action: 'mcp_bulk_operation',
      entity_type: 'lead',
      entity_id: null,
      description: `Bulk ${operation} operation via MCP. Processed: ${processed}, Failed: ${failed}. Total leads: ${leadIds.length}`,
    })

    return {
      success: failed === 0,
      processed,
      failed,
      results,
      message: `Bulk operation completed. Processed: ${processed}, Failed: ${failed}`,
    }
  } catch (error: any) {
    throw new Error(`Bulk operation failed: ${error.message}`)
  }
}

export const bulkOperationsTool = {
  name: 'bulk_operations',
  description: `Perform bulk operations on multiple leads (max 100 per operation).

Operations:
1. update: Update common fields for multiple leads
   - Can update: status, priority, temperature, pipeline_stage

2. reassign: Reassign multiple leads to a different employee
   - Requires: assigned_to in updates
   - Automatically logs assignment history

3. tag: Add tags to multiple leads
   - Requires: tags_to_add array in updates
   - Tags are added, not replaced

4. untag: Remove tags from multiple leads
   - Requires: tags_to_remove array in updates

Permissions:
- Requires manager role or above
- Respects individual lead permissions
- Only processes leads the user has edit access to

Returns:
- Success/failure count
- Detailed results for each lead
- Any errors encountered

Example:
  operation: "update",
  leadIds: ["uuid1", "uuid2", "uuid3"],
  updates: {
    priority: "high",
    lead_temperature: "hot"
  }`,
  inputSchema: bulkOperationsSchema,
  handler: bulkOperations,
}
