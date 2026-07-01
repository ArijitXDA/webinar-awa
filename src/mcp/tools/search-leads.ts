/**
 * Search Leads Tool
 * Search and filter leads based on various criteria
 */

import { z } from 'zod'
import { MCPContext, SearchLeadsParams, Lead } from '../types'
import { supabase } from '../auth'
import { filterLeadsByPermissions } from '../permissions'

export const searchLeadsSchema = z.object({
  query: z.string().optional().describe('Search query for lead name, mobile, or email'),
  status: z.string().optional().describe('Filter by lead status'),
  source: z.string().optional().describe('Filter by lead source'),
  assignedTo: z.string().optional().describe('Filter by assigned employee ID'),
  priority: z.enum(['urgent', 'high', 'medium', 'low']).optional().describe('Filter by priority'),
  temperature: z.enum(['hot', 'warm', 'cold']).optional().describe('Filter by lead temperature'),
  pipelineStage: z.string().optional().describe('Filter by pipeline stage'),
  tag: z.string().optional().describe('Filter by tag'),
  limit: z.number().min(1).max(100).default(10).describe('Maximum number of results'),
  offset: z.number().min(0).default(0).describe('Offset for pagination'),
})

export async function searchLeads(
  params: SearchLeadsParams,
  context: MCPContext
): Promise<{
  leads: Lead[]
  total: number
  hasMore: boolean
}> {
  try {
    const { employee } = context
    const { query, status, source, assignedTo, priority, temperature, pipelineStage, tag, limit = 10, offset = 0 } = params

    // Build query
    let supabaseQuery = supabase
      .from('crm_leads')
      .select('*', { count: 'exact' })

    // Apply filters
    if (query) {
      const searchTerm = `%${query.toLowerCase()}%`
      supabaseQuery = supabaseQuery.or(
        `full_name.ilike.${searchTerm},mobile.ilike.${searchTerm},email.ilike.${searchTerm},company_name.ilike.${searchTerm}`
      )
    }

    if (status) {
      supabaseQuery = supabaseQuery.eq('lead_status', status)
    }

    if (source) {
      supabaseQuery = supabaseQuery.eq('lead_source', source)
    }

    if (assignedTo) {
      supabaseQuery = supabaseQuery.eq('assigned_to', assignedTo)
    }

    if (priority) {
      supabaseQuery = supabaseQuery.eq('priority', priority)
    }

    if (temperature) {
      supabaseQuery = supabaseQuery.eq('lead_temperature', temperature)
    }

    if (pipelineStage) {
      supabaseQuery = supabaseQuery.eq('pipeline_stage', pipelineStage)
    }

    if (tag) {
      supabaseQuery = supabaseQuery.contains('tags', [tag])
    }

    // Apply pagination
    supabaseQuery = supabaseQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    const { data, error, count } = await supabaseQuery

    if (error) {
      throw new Error(`Failed to search leads: ${error.message}`)
    }

    // Filter by permissions
    const filteredLeads = await filterLeadsByPermissions(employee, (data || []) as Lead[])

    // Log the search
    await supabase.from('crm_audit_log').insert({
      employee_id: employee.id,
      emp_id: employee.emp_id,
      action: 'mcp_search_leads',
      entity_type: 'lead',
      entity_id: null,
      description: `Searched leads via MCP: ${JSON.stringify(params)}`,
    })

    return {
      leads: filteredLeads,
      total: count || 0,
      hasMore: offset + filteredLeads.length < (count || 0),
    }
  } catch (error: any) {
    throw new Error(`Search leads failed: ${error.message}`)
  }
}

export const searchLeadsTool = {
  name: 'search_leads',
  description: `Search and filter CRM leads based on various criteria.

Supports:
- Text search across name, mobile, email, and company
- Status filtering (new, contacted, follow_up_again, need_something, converted, not_interested)
- Source filtering (webinar, self, referred, resume_upload, ai_spot, social_media, website, other)
- Priority filtering (urgent, high, medium, low)
- Temperature filtering (hot, warm, cold)
- Pipeline stage filtering
- Tag filtering
- Pagination with limit and offset

Returns a list of leads with full details that the authenticated user has permission to view.`,
  inputSchema: searchLeadsSchema,
  handler: searchLeads,
}
