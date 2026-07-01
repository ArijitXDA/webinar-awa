/**
 * Get Analytics Tool
 * Retrieve CRM analytics and reports
 */

import { z } from 'zod'
import { MCPContext, AnalyticsParams } from '../types'
import { supabase, getSubordinates } from '../auth'
import { canViewAnalytics } from '../permissions'

export const getAnalyticsSchema = z.object({
  startDate: z.string().optional().describe('Start date for analytics (YYYY-MM-DD). Defaults to 30 days ago'),
  endDate: z.string().optional().describe('End date for analytics (YYYY-MM-DD). Defaults to today'),
  groupBy: z.enum(['status', 'source', 'priority', 'pipeline_stage', 'temperature']).optional().describe('Group results by field'),
  assignedTo: z.string().optional().describe('Filter analytics for specific employee ID'),
})

export async function getAnalytics(
  params: AnalyticsParams,
  context: MCPContext
): Promise<{
  summary: any
  breakdown: any[]
  trends: any[]
}> {
  try {
    const { employee } = context
    const { startDate, endDate, groupBy, assignedTo } = params

    // Check permissions
    const permission = await canViewAnalytics(employee, assignedTo)
    if (!permission.canView) {
      throw new Error(permission.reason || 'Insufficient permissions to view analytics')
    }

    // Calculate date range
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const end = endDate || new Date().toISOString().split('T')[0]

    // Determine which employees' data to include
    let employeeIds: string[] = []
    if (assignedTo) {
      employeeIds = [assignedTo]
    } else if (['owner', 'ea_to_owner', 'director', 'ea_to_director'].includes(employee.job_role)) {
      // Top management can see all
      const { data: allEmployees } = await supabase
        .from('crm_employees')
        .select('id')
        .eq('is_active', true)
      employeeIds = allEmployees ? allEmployees.map(e => e.id) : []
    } else {
      // Managers see their team, others see only themselves
      const subordinates = await getSubordinates(employee.id)
      employeeIds = [employee.id, ...subordinates]
    }

    // Fetch leads within date range
    const { data: leads, error } = await supabase
      .from('crm_leads')
      .select('*')
      .gte('created_at', start)
      .lte('created_at', end)
      .in('assigned_to', employeeIds)

    if (error) {
      throw new Error(`Failed to fetch analytics: ${error.message}`)
    }

    const leadsData = leads || []

    // Calculate summary statistics
    const summary = {
      total_leads: leadsData.length,
      new_leads: leadsData.filter(l => l.lead_status === 'new').length,
      contacted: leadsData.filter(l => l.lead_status === 'contacted').length,
      follow_up: leadsData.filter(l => l.lead_status === 'follow_up_again').length,
      converted: leadsData.filter(l => l.is_converted).length,
      not_interested: leadsData.filter(l => l.lead_status === 'not_interested').length,
      conversion_rate: leadsData.length > 0
        ? Math.round((leadsData.filter(l => l.is_converted).length / leadsData.length) * 100)
        : 0,
      avg_lead_score: leadsData.length > 0
        ? Math.round((leadsData.reduce((sum, l) => sum + (l.lead_score || 0), 0) / leadsData.length) * 10) / 10
        : 0,
      hot_leads: leadsData.filter(l => l.lead_temperature === 'hot').length,
      warm_leads: leadsData.filter(l => l.lead_temperature === 'warm').length,
      cold_leads: leadsData.filter(l => l.lead_temperature === 'cold').length,
      urgent_priority: leadsData.filter(l => l.priority === 'urgent').length,
      high_priority: leadsData.filter(l => l.priority === 'high').length,
      total_expected_value: leadsData.reduce((sum, l) => sum + (l.expected_value || 0), 0),
      date_range: { start, end },
      employees_included: employeeIds.length,
    }

    // Calculate breakdown if groupBy is specified
    let breakdown: any[] = []
    if (groupBy) {
      const groupMap: Record<string, number> = {}
      leadsData.forEach(lead => {
        const key = (lead as any)[groupBy] || 'not_set'
        groupMap[key] = (groupMap[key] || 0) + 1
      })

      breakdown = Object.entries(groupMap)
        .map(([key, count]) => ({
          category: key,
          count,
          percentage: Math.round((count / leadsData.length) * 100),
        }))
        .sort((a, b) => b.count - a.count)
    }

    // Calculate daily trends
    const dailyMap: Record<string, { new_leads: number; conversions: number; interactions: number }> = {}
    const daysDiff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))

    for (let i = 0; i <= daysDiff; i++) {
      const date = new Date(start)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      dailyMap[dateStr] = { new_leads: 0, conversions: 0, interactions: 0 }
    }

    leadsData.forEach(lead => {
      const createdDate = lead.created_at.split('T')[0]
      if (dailyMap[createdDate]) {
        dailyMap[createdDate].new_leads++
      }

      if (lead.conversion_date && dailyMap[lead.conversion_date]) {
        dailyMap[lead.conversion_date].conversions++
      }
    })

    // Fetch interactions for the period
    const { data: interactions } = await supabase
      .from('crm_lead_interactions')
      .select('created_at')
      .gte('created_at', start)
      .lte('created_at', end)
      .in('employee_id', employeeIds)

    interactions?.forEach(interaction => {
      const date = interaction.created_at.split('T')[0]
      if (dailyMap[date]) {
        dailyMap[date].interactions++
      }
    })

    const trends = Object.entries(dailyMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Log the analytics request
    await supabase.from('crm_audit_log').insert({
      employee_id: employee.id,
      emp_id: employee.emp_id,
      action: 'mcp_get_analytics',
      entity_type: 'analytics',
      entity_id: null,
      description: `Retrieved analytics via MCP for period ${start} to ${end}`,
    })

    return {
      summary,
      breakdown,
      trends,
    }
  } catch (error: any) {
    throw new Error(`Get analytics failed: ${error.message}`)
  }
}

export const getAnalyticsTool = {
  name: 'get_analytics',
  description: `Retrieve CRM analytics and performance metrics.

Returns:
1. Summary statistics:
   - Total leads, conversion rates, lead scores
   - Status breakdown (new, contacted, converted, etc.)
   - Temperature distribution (hot, warm, cold)
   - Priority breakdown
   - Expected revenue totals

2. Breakdown by category (if groupBy specified):
   - Group by status, source, priority, pipeline_stage, or temperature
   - Shows count and percentage for each category

3. Daily trends:
   - New leads per day
   - Conversions per day
   - Interactions per day

Respects hierarchy:
- Top management sees all data
- Managers see their team's data
- Employees see only their own data
- Can filter for specific employee with 'assignedTo' parameter`,
  inputSchema: getAnalyticsSchema,
  handler: getAnalytics,
}
