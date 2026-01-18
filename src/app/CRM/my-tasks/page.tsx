'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Lead {
  id: string
  lead_id: number
  full_name: string
  country_code: string
  mobile: string
  email: string
  lead_source: string
  course: string
  lead_score: number
  lead_status: string
  next_followup_date: string
  created_at: string
  last_interaction_at: string
}

const LEAD_STATUSES: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-500/20 text-blue-400' },
  contacted: { label: 'Contacted', color: 'bg-cyan-500/20 text-cyan-400' },
  follow_up_again: { label: 'Follow-up', color: 'bg-amber-500/20 text-amber-400' },
  need_something: { label: 'Need Something', color: 'bg-purple-500/20 text-purple-400' },
  converted: { label: 'Converted', color: 'bg-green-500/20 text-green-400' },
  not_interested: { label: 'Not Interested', color: 'bg-red-500/20 text-red-400' }
}

export default function MyTasksPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'today' | 'overdue' | 'upcoming' | 'new' | 'all'>('today')

  const [stats, setStats] = useState({
    today: 0,
    overdue: 0,
    upcoming: 0,
    newLeads: 0,
    total: 0,
    converted: 0
  })

  const [leads, setLeads] = useState<Lead[]>([])
  const [recentInteractions, setRecentInteractions] = useState<any[]>([])

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    checkSessionAndLoad()
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadLeadsByTab()
    }
  }, [activeTab, currentUser])

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
      await loadStats(session.employee.id)
      await loadRecentInteractions(session.employee.id)

    } catch (err) {
      console.error('Session check error:', err)
      router.push('/CRM')
    } finally {
      setLoading(false)
    }
  }

  async function loadStats(employeeId: string) {
    try {
      const { data: allLeads } = await supabase
        .from('crm_leads')
        .select('id, lead_status, next_followup_date, is_converted')
        .eq('assigned_to', employeeId)

      if (allLeads) {
        const todayCount = allLeads.filter(l => l.next_followup_date === today && !l.is_converted).length
        const overdueCount = allLeads.filter(l => l.next_followup_date && l.next_followup_date < today && !l.is_converted && l.lead_status !== 'not_interested').length
        const upcomingCount = allLeads.filter(l => l.next_followup_date && l.next_followup_date > today && !l.is_converted).length
        const newLeadsCount = allLeads.filter(l => l.lead_status === 'new').length
        const convertedCount = allLeads.filter(l => l.is_converted).length

        setStats({
          today: todayCount,
          overdue: overdueCount,
          upcoming: upcomingCount,
          newLeads: newLeadsCount,
          total: allLeads.length,
          converted: convertedCount
        })
      }
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  async function loadLeadsByTab() {
    if (!currentUser) return

    try {
      let query = supabase
        .from('crm_leads')
        .select('*')
        .eq('assigned_to', currentUser.id)

      switch (activeTab) {
        case 'today':
          query = query.eq('next_followup_date', today).eq('is_converted', false)
          break
        case 'overdue':
          query = query.lt('next_followup_date', today).eq('is_converted', false).neq('lead_status', 'not_interested')
          break
        case 'upcoming':
          query = query.gt('next_followup_date', today).eq('is_converted', false)
          break
        case 'new':
          query = query.eq('lead_status', 'new')
          break
        case 'all':
          // No additional filters
          break
      }

      const { data, error } = await query.order('next_followup_date', { ascending: true, nullsFirst: false })

      if (error) throw error
      setLeads(data || [])
    } catch (err) {
      console.error('Error loading leads:', err)
    }
  }

  async function loadRecentInteractions(employeeId: string) {
    try {
      const { data } = await supabase
        .from('crm_lead_interactions')
        .select('*, crm_leads(full_name)')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentInteractions(data || [])
    } catch (err) {
      console.error('Error loading interactions:', err)
    }
  }

  function sendWhatsApp(lead: Lead) {
    const phone = lead.country_code.replace('+', '') + lead.mobile
    const msg = `Hi ${lead.full_name}! This is ${currentUser.full_name} from AIwithArijit.com. How can I assist you today?`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function makeCall(lead: Lead) {
    window.open(`tel:${lead.country_code}${lead.mobile}`, '_self')
  }

  function getScoreStars(score: number) {
    return '★'.repeat(score) + '☆'.repeat(5 - score)
  }

  function getScoreColor(score: number) {
    if (score >= 4) return 'text-green-400'
    if (score >= 3) return 'text-amber-400'
    return 'text-red-400'
  }

  function getDaysOverdue(date: string) {
    const diff = Math.floor((new Date().getTime() - new Date(date).getTime()) / 86400000)
    return diff
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/CRM/dashboard')} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-white font-bold text-lg">My Tasks</h1>
                <p className="text-slate-400 text-xs">Welcome, {currentUser?.full_name}</p>
              </div>
            </div>

            <button
              onClick={() => router.push('/CRM/leads/new')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Lead
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button
            onClick={() => setActiveTab('today')}
            className={`p-4 rounded-xl border transition-all ${
              activeTab === 'today'
                ? 'bg-amber-500/20 border-amber-500'
                : 'bg-slate-800 border-slate-700 hover:border-slate-600'
            }`}
          >
            <p className="text-2xl font-bold text-amber-400">{stats.today}</p>
            <p className="text-slate-400 text-sm">Today</p>
          </button>

          <button
            onClick={() => setActiveTab('overdue')}
            className={`p-4 rounded-xl border transition-all ${
              activeTab === 'overdue'
                ? 'bg-red-500/20 border-red-500'
                : 'bg-slate-800 border-slate-700 hover:border-slate-600'
            }`}
          >
            <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
            <p className="text-slate-400 text-sm">Overdue</p>
          </button>

          <button
            onClick={() => setActiveTab('upcoming')}
            className={`p-4 rounded-xl border transition-all ${
              activeTab === 'upcoming'
                ? 'bg-cyan-500/20 border-cyan-500'
                : 'bg-slate-800 border-slate-700 hover:border-slate-600'
            }`}
          >
            <p className="text-2xl font-bold text-cyan-400">{stats.upcoming}</p>
            <p className="text-slate-400 text-sm">Upcoming</p>
          </button>

          <button
            onClick={() => setActiveTab('new')}
            className={`p-4 rounded-xl border transition-all ${
              activeTab === 'new'
                ? 'bg-blue-500/20 border-blue-500'
                : 'bg-slate-800 border-slate-700 hover:border-slate-600'
            }`}
          >
            <p className="text-2xl font-bold text-blue-400">{stats.newLeads}</p>
            <p className="text-slate-400 text-sm">New Leads</p>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`p-4 rounded-xl border transition-all ${
              activeTab === 'all'
                ? 'bg-slate-500/20 border-slate-500'
                : 'bg-slate-800 border-slate-700 hover:border-slate-600'
            }`}
          >
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-slate-400 text-sm">All Leads</p>
          </button>

          <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
            <p className="text-2xl font-bold text-green-400">{stats.converted}</p>
            <p className="text-green-300/70 text-sm">Converted</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lead List */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700">
                <h2 className="text-lg font-semibold text-white capitalize">
                  {activeTab === 'today' && '📅 Today\'s Follow-ups'}
                  {activeTab === 'overdue' && '⚠️ Overdue Follow-ups'}
                  {activeTab === 'upcoming' && '📆 Upcoming Follow-ups'}
                  {activeTab === 'new' && '🆕 New Leads'}
                  {activeTab === 'all' && '📋 All My Leads'}
                  <span className="text-slate-400 text-sm font-normal ml-2">({leads.length})</span>
                </h2>
              </div>

              <div className="divide-y divide-slate-700 max-h-[600px] overflow-y-auto">
                {leads.map((lead) => (
                  <div key={lead.id} className="p-4 hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-medium truncate">{lead.full_name}</h3>
                          <span className={`${getScoreColor(lead.lead_score)} text-sm`}>
                            {getScoreStars(lead.lead_score)}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm">{lead.country_code} {lead.mobile}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${LEAD_STATUSES[lead.lead_status]?.color || 'bg-slate-500/20 text-slate-400'}`}>
                            {LEAD_STATUSES[lead.lead_status]?.label || lead.lead_status}
                          </span>
                          {lead.course && (
                            <span className="text-slate-500 text-xs">{lead.course}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {lead.next_followup_date && (
                          <div className="mb-2">
                            {lead.next_followup_date < today ? (
                              <span className="text-red-400 text-sm font-medium">
                                {getDaysOverdue(lead.next_followup_date)} days overdue
                              </span>
                            ) : lead.next_followup_date === today ? (
                              <span className="text-amber-400 text-sm font-medium">Today</span>
                            ) : (
                              <span className="text-slate-400 text-sm">
                                {new Date(lead.next_followup_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => makeCall(lead)}
                            className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg"
                            title="Call"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => sendWhatsApp(lead)}
                            className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg"
                            title="WhatsApp"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => router.push(`/CRM/leads/${lead.id}`)}
                            className="p-2 text-slate-400 hover:bg-slate-600 rounded-lg"
                            title="View/Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {leads.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    {activeTab === 'today' && 'No follow-ups scheduled for today'}
                    {activeTab === 'overdue' && 'No overdue follow-ups! 🎉'}
                    {activeTab === 'upcoming' && 'No upcoming follow-ups'}
                    {activeTab === 'new' && 'No new leads assigned'}
                    {activeTab === 'all' && 'No leads assigned to you'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">My Performance</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Leads</span>
                  <span className="text-white font-semibold">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Converted</span>
                  <span className="text-green-400 font-semibold">{stats.converted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Conversion Rate</span>
                  <span className="text-amber-400 font-semibold">
                    {stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="h-px bg-slate-700 my-2"></div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Pending Today</span>
                  <span className={`font-semibold ${stats.today > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {stats.today}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Overdue</span>
                  <span className={`font-semibold ${stats.overdue > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                    {stats.overdue}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">My Recent Activity</h3>
              <div className="space-y-3">
                {recentInteractions.map((interaction) => (
                  <div key={interaction.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                      <span className="text-sm">
                        {interaction.interaction_type === 'call' && '📞'}
                        {interaction.interaction_type === 'whatsapp' && '💬'}
                        {interaction.interaction_type === 'email' && '📧'}
                        {interaction.interaction_type === 'meeting' && '🤝'}
                        {interaction.interaction_type === 'note' && '📝'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{interaction.crm_leads?.full_name}</p>
                      <p className="text-slate-500 text-xs">
                        {new Date(interaction.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {recentInteractions.length === 0 && (
                  <p className="text-slate-500 text-sm">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
