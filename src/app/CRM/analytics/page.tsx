'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface LeadStats {
  total: number
  new: number
  contacted: number
  followUp: number
  converted: number
  notInterested: number
  conversionRate: number
}

interface SourceStats {
  source: string
  count: number
  converted: number
  conversionRate: number
}

interface EmployeeStats {
  id: string
  name: string
  totalLeads: number
  converted: number
  interactions: number
  conversionRate: number
}

interface DailyStats {
  date: string
  newLeads: number
  conversions: number
  interactions: number
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30') // days
  const [leadStats, setLeadStats] = useState<LeadStats>({
    total: 0, new: 0, contacted: 0, followUp: 0, converted: 0, notInterested: 0, conversionRate: 0
  })
  const [sourceStats, setSourceStats] = useState<SourceStats[]>([])
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [courseStats, setCourseStats] = useState<{ course: string; count: number }[]>([])
  const [forWhomStats, setForWhomStats] = useState<{ category: string; count: number }[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    checkSessionAndLoad()
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadAllStats()
    }
  }, [dateRange, currentUser])

  async function checkSessionAndLoad() {
    try {
      const sessionData = localStorage.getItem('crm_session')
      if (!sessionData) {
        router.push('/CRM')
        return
      }

      const session = JSON.parse(sessionData)

      const { data: dbSession, error } = await supabase
        .from('crm_sessions')
        .select('*')
        .eq('session_token', session.token)
        .eq('is_valid', true)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (!dbSession || error) {
        localStorage.removeItem('crm_session')
        router.push('/CRM')
        return
      }

      setCurrentUser(session.employee)

    } catch (err) {
      console.error('Session check error:', err)
      router.push('/CRM')
    } finally {
      setLoading(false)
    }
  }

  async function loadAllStats() {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(dateRange))
    const startDateStr = startDate.toISOString().split('T')[0]

    await Promise.all([
      loadLeadStats(startDateStr),
      loadSourceStats(startDateStr),
      loadEmployeeStats(startDateStr),
      loadDailyStats(startDateStr),
      loadCourseStats(startDateStr),
      loadForWhomStats(startDateStr),
      loadRecentActivity()
    ])
  }

  async function loadLeadStats(startDate: string) {
    try {
      const { data: leads } = await supabase
        .from('crm_leads')
        .select('lead_status, is_converted')
        .gte('created_at', startDate)

      if (leads) {
        const total = leads.length
        const newCount = leads.filter(l => l.lead_status === 'new').length
        const contacted = leads.filter(l => l.lead_status === 'contacted').length
        const followUp = leads.filter(l => l.lead_status === 'follow_up_again').length
        const converted = leads.filter(l => l.is_converted).length
        const notInterested = leads.filter(l => l.lead_status === 'not_interested').length

        setLeadStats({
          total,
          new: newCount,
          contacted,
          followUp,
          converted,
          notInterested,
          conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0
        })
      }
    } catch (err) {
      console.error('Error loading lead stats:', err)
    }
  }

  async function loadSourceStats(startDate: string) {
    try {
      const { data: leads } = await supabase
        .from('crm_leads')
        .select('lead_source, is_converted')
        .gte('created_at', startDate)

      if (leads) {
        const sourceMap: Record<string, { count: number; converted: number }> = {}

        leads.forEach(lead => {
          const source = lead.lead_source || 'other'
          if (!sourceMap[source]) {
            sourceMap[source] = { count: 0, converted: 0 }
          }
          sourceMap[source].count++
          if (lead.is_converted) {
            sourceMap[source].converted++
          }
        })

        const stats = Object.entries(sourceMap)
          .map(([source, data]) => ({
            source,
            count: data.count,
            converted: data.converted,
            conversionRate: data.count > 0 ? Math.round((data.converted / data.count) * 100) : 0
          }))
          .sort((a, b) => b.count - a.count)

        setSourceStats(stats)
      }
    } catch (err) {
      console.error('Error loading source stats:', err)
    }
  }

  async function loadEmployeeStats(startDate: string) {
    try {
      const { data: leads } = await supabase
        .from('crm_leads')
        .select('assigned_to, is_converted')
        .gte('created_at', startDate)

      const { data: interactions } = await supabase
        .from('crm_lead_interactions')
        .select('employee_id')
        .gte('created_at', startDate)

      const { data: employees } = await supabase
        .from('crm_employees')
        .select('id, full_name')
        .eq('is_active', true)

      if (leads && employees) {
        const empMap: Record<string, { name: string; leads: number; converted: number; interactions: number }> = {}

        employees.forEach(emp => {
          empMap[emp.id] = { name: emp.full_name, leads: 0, converted: 0, interactions: 0 }
        })

        leads.forEach(lead => {
          if (lead.assigned_to && empMap[lead.assigned_to]) {
            empMap[lead.assigned_to].leads++
            if (lead.is_converted) {
              empMap[lead.assigned_to].converted++
            }
          }
        })

        interactions?.forEach(i => {
          if (i.employee_id && empMap[i.employee_id]) {
            empMap[i.employee_id].interactions++
          }
        })

        const stats = Object.entries(empMap)
          .map(([id, data]) => ({
            id,
            name: data.name,
            totalLeads: data.leads,
            converted: data.converted,
            interactions: data.interactions,
            conversionRate: data.leads > 0 ? Math.round((data.converted / data.leads) * 100) : 0
          }))
          .filter(e => e.totalLeads > 0)
          .sort((a, b) => b.totalLeads - a.totalLeads)

        setEmployeeStats(stats)
      }
    } catch (err) {
      console.error('Error loading employee stats:', err)
    }
  }

  async function loadDailyStats(startDate: string) {
    try {
      const { data: leads } = await supabase
        .from('crm_leads')
        .select('created_at, conversion_date')
        .gte('created_at', startDate)

      const { data: interactions } = await supabase
        .from('crm_lead_interactions')
        .select('created_at')
        .gte('created_at', startDate)

      const dailyMap: Record<string, { newLeads: number; conversions: number; interactions: number }> = {}

      // Initialize days
      const days = parseInt(dateRange)
      for (let i = 0; i < days; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        dailyMap[dateStr] = { newLeads: 0, conversions: 0, interactions: 0 }
      }

      leads?.forEach(lead => {
        const date = lead.created_at.split('T')[0]
        if (dailyMap[date]) {
          dailyMap[date].newLeads++
        }
        if (lead.conversion_date && dailyMap[lead.conversion_date]) {
          dailyMap[lead.conversion_date].conversions++
        }
      })

      interactions?.forEach(i => {
        const date = i.created_at.split('T')[0]
        if (dailyMap[date]) {
          dailyMap[date].interactions++
        }
      })

      const stats = Object.entries(dailyMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))

      setDailyStats(stats)
    } catch (err) {
      console.error('Error loading daily stats:', err)
    }
  }

  async function loadCourseStats(startDate: string) {
    try {
      const { data: leads } = await supabase
        .from('crm_leads')
        .select('course')
        .gte('created_at', startDate)
        .not('course', 'is', null)

      if (leads) {
        const courseMap: Record<string, number> = {}
        leads.forEach(lead => {
          if (lead.course) {
            courseMap[lead.course] = (courseMap[lead.course] || 0) + 1
          }
        })

        const stats = Object.entries(courseMap)
          .map(([course, count]) => ({ course, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        setCourseStats(stats)
      }
    } catch (err) {
      console.error('Error loading course stats:', err)
    }
  }

  async function loadForWhomStats(startDate: string) {
    try {
      const { data: leads } = await supabase
        .from('crm_leads')
        .select('for_whom')
        .gte('created_at', startDate)

      if (leads) {
        const catMap: Record<string, number> = {}
        leads.forEach(lead => {
          const cat = lead.for_whom || 'other'
          catMap[cat] = (catMap[cat] || 0) + 1
        })

        const stats = Object.entries(catMap)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)

        setForWhomStats(stats)
      }
    } catch (err) {
      console.error('Error loading for_whom stats:', err)
    }
  }

  async function loadRecentActivity() {
    try {
      const { data } = await supabase
        .from('crm_audit_log')
        .select('*, crm_employees(full_name)')
        .order('created_at', { ascending: false })
        .limit(10)

      setRecentActivity(data || [])
    } catch (err) {
      console.error('Error loading recent activity:', err)
    }
  }

  function getSourceLabel(source: string) {
    const labels: Record<string, string> = {
      webinar: 'Webinar',
      self: 'Self Generated',
      referred: 'Referred',
      resume_upload: 'Resume Upload',
      ai_spot: 'AI Spot',
      social_media: 'Social Media',
      website: 'Website',
      other: 'Other'
    }
    return labels[source] || source
  }

  function getForWhomLabel(cat: string) {
    const labels: Record<string, string> = {
      self: 'Self',
      kids: 'Kids',
      college: 'College Student',
      working_professional: 'Working Professional',
      tech_dev: 'Tech Developer',
      other: 'Other'
    }
    return labels[cat] || cat
  }

  function getMaxValue(data: number[]) {
    return Math.max(...data, 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/CRM/dashboard')} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-white font-bold text-lg">Analytics & Reports</h1>
                <p className="text-slate-400 text-xs">Performance insights</p>
              </div>
            </div>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase">Total Leads</p>
            <p className="text-2xl font-bold text-white">{leadStats.total}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase">New</p>
            <p className="text-2xl font-bold text-blue-400">{leadStats.new}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase">Contacted</p>
            <p className="text-2xl font-bold text-cyan-400">{leadStats.contacted}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase">Follow-up</p>
            <p className="text-2xl font-bold text-amber-400">{leadStats.followUp}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase">Converted</p>
            <p className="text-2xl font-bold text-green-400">{leadStats.converted}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-xs uppercase">Not Interested</p>
            <p className="text-2xl font-bold text-red-400">{leadStats.notInterested}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-xl p-4">
            <p className="text-amber-300 text-xs uppercase">Conversion Rate</p>
            <p className="text-2xl font-bold text-amber-400">{leadStats.conversionRate}%</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Trend Chart */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Daily Trend</h3>
            <div className="h-48 flex items-end gap-1">
              {dailyStats.slice(-14).map((day, idx) => {
                const maxLeads = getMaxValue(dailyStats.map(d => d.newLeads))
                const height = (day.newLeads / maxLeads) * 100
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-slate-700 rounded-t relative" style={{ height: '140px' }}>
                      <div
                        className="absolute bottom-0 w-full bg-gradient-to-t from-amber-500 to-amber-400 rounded-t transition-all"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 -rotate-45 origin-left">
                      {new Date(day.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-amber-500 rounded"></span> New Leads
              </span>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Conversion Funnel</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Leads', value: leadStats.total, color: 'bg-slate-500', pct: 100 },
                { label: 'Contacted', value: leadStats.contacted + leadStats.followUp + leadStats.converted, color: 'bg-cyan-500', pct: leadStats.total > 0 ? Math.round(((leadStats.contacted + leadStats.followUp + leadStats.converted) / leadStats.total) * 100) : 0 },
                { label: 'In Follow-up', value: leadStats.followUp + leadStats.converted, color: 'bg-amber-500', pct: leadStats.total > 0 ? Math.round(((leadStats.followUp + leadStats.converted) / leadStats.total) * 100) : 0 },
                { label: 'Converted', value: leadStats.converted, color: 'bg-green-500', pct: leadStats.total > 0 ? Math.round((leadStats.converted / leadStats.total) * 100) : 0 }
              ].map((stage, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-300">{stage.label}</span>
                    <span className="text-white font-medium">{stage.value} ({stage.pct}%)</span>
                  </div>
                  <div className="h-8 bg-slate-700 rounded-lg overflow-hidden">
                    <div
                      className={`h-full ${stage.color} transition-all duration-500`}
                      style={{ width: `${stage.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Source & Category Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lead Sources */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Lead Sources</h3>
            <div className="space-y-3">
              {sourceStats.map((source, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-300">{getSourceLabel(source.source)}</span>
                    <span className="text-white">{source.count} <span className="text-green-400 text-xs">({source.conversionRate}%)</span></span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                      style={{ width: `${(source.count / (sourceStats[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {sourceStats.length === 0 && <p className="text-slate-500 text-sm">No data</p>}
            </div>
          </div>

          {/* For Whom Distribution */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Lead Categories</h3>
            <div className="space-y-3">
              {forWhomStats.map((cat, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-300">{getForWhomLabel(cat.category)}</span>
                    <span className="text-white">{cat.count}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                      style={{ width: `${(cat.count / (forWhomStats[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {forWhomStats.length === 0 && <p className="text-slate-500 text-sm">No data</p>}
            </div>
          </div>

          {/* Top Courses */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Popular Courses</h3>
            <div className="space-y-3">
              {courseStats.map((course, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-300 truncate">{course.course}</span>
                    <span className="text-white">{course.count}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
                      style={{ width: `${(course.count / (courseStats[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {courseStats.length === 0 && <p className="text-slate-500 text-sm">No data</p>}
            </div>
          </div>
        </div>

        {/* Employee Performance */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-white">Employee Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Employee</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase">Leads</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase">Converted</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase">Interactions</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase">Conv. Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {employeeStats.map((emp, idx) => (
                  <tr key={emp.id} className="hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          idx === 0 ? 'bg-amber-500 text-slate-900' :
                          idx === 1 ? 'bg-slate-400 text-slate-900' :
                          idx === 2 ? 'bg-amber-700 text-white' :
                          'bg-slate-600 text-slate-300'
                        }`}>
                          {idx + 1}
                        </div>
                        <span className="text-white font-medium">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-white">{emp.totalLeads}</td>
                    <td className="px-6 py-4 text-center text-green-400">{emp.converted}</td>
                    <td className="px-6 py-4 text-center text-slate-300">{emp.interactions}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        emp.conversionRate >= 30 ? 'bg-green-500/20 text-green-400' :
                        emp.conversionRate >= 15 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {emp.conversionRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            emp.conversionRate >= 30 ? 'bg-green-500' :
                            emp.conversionRate >= 15 ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(emp.conversionRate * 2, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {employeeStats.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No employee data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((activity, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  activity.action === 'create' ? 'bg-green-500/20 text-green-400' :
                  activity.action === 'update' ? 'bg-blue-500/20 text-blue-400' :
                  activity.action === 'interaction' ? 'bg-amber-500/20 text-amber-400' :
                  activity.action === 'bulk_upload' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {activity.action === 'create' && '➕'}
                  {activity.action === 'update' && '✏️'}
                  {activity.action === 'interaction' && '💬'}
                  {activity.action === 'bulk_upload' && '📤'}
                  {!['create', 'update', 'interaction', 'bulk_upload'].includes(activity.action) && '📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{activity.description}</p>
                  <p className="text-xs text-slate-500">
                    {activity.crm_employees?.full_name || activity.emp_id} • {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && <p className="text-slate-500 text-sm">No recent activity</p>}
          </div>
        </div>
      </main>
    </div>
  )
}
