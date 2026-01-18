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
  course: string
  lead_score: number
  lead_status: string
  next_followup_date: string
  assigned_to: string
  assigned_to_name?: string
  last_interaction_at: string
  days_overdue?: number
}

const LEAD_STATUSES = [
  { value: 'new', label: 'New', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'contacted', label: 'Contacted', color: 'bg-cyan-500/20 text-cyan-400' },
  { value: 'follow_up_again', label: 'Follow-up', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'need_something', label: 'Need Something', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'converted', label: 'Converted', color: 'bg-green-500/20 text-green-400' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-red-500/20 text-red-400' }
]

export default function FollowupsPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [overdueLeads, setOverdueLeads] = useState<Lead[]>([])
  const [todayLeads, setTodayLeads] = useState<Lead[]>([])
  const [upcomingLeads, setUpcomingLeads] = useState<Lead[]>([])
  const [activeTab, setActiveTab] = useState<'overdue' | 'today' | 'upcoming'>('today')
  const [showQuickAction, setShowQuickAction] = useState<string | null>(null)
  const [quickNotes, setQuickNotes] = useState('')
  const [quickStatus, setQuickStatus] = useState('')
  const [quickFollowup, setQuickFollowup] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    checkSessionAndLoad()
  }, [])

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
      await loadFollowups()

    } catch (err) {
      console.error('Session check error:', err)
      router.push('/CRM')
    } finally {
      setLoading(false)
    }
  }

  async function loadFollowups() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      const nextWeekStr = nextWeek.toISOString().split('T')[0]

      const { data: leads, error } = await supabase
        .from('crm_leads')
        .select('*')
        .not('next_followup_date', 'is', null)
        .not('lead_status', 'in', '("converted","not_interested")')
        .order('next_followup_date', { ascending: true })

      if (error) throw error

      // Get employee names
      const { data: emps } = await supabase.from('crm_employees').select('id, full_name')
      const empMap = Object.fromEntries(emps?.map(e => [e.id, e.full_name]) || [])

      const leadsWithNames = leads?.map(lead => {
        const followupDate = new Date(lead.next_followup_date)
        const todayDate = new Date(today)
        const diffTime = todayDate.getTime() - followupDate.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        return {
          ...lead,
          assigned_to_name: empMap[lead.assigned_to] || '-',
          days_overdue: diffDays > 0 ? diffDays : 0
        }
      }) || []

      // Categorize
      const overdue = leadsWithNames.filter(l => l.next_followup_date < today)
      const todayList = leadsWithNames.filter(l => l.next_followup_date === today)
      const upcoming = leadsWithNames.filter(l => l.next_followup_date > today && l.next_followup_date <= nextWeekStr)

      setOverdueLeads(overdue)
      setTodayLeads(todayList)
      setUpcomingLeads(upcoming)

      // Auto-select tab with most urgent items
      if (overdue.length > 0) setActiveTab('overdue')
      else if (todayList.length > 0) setActiveTab('today')
      else setActiveTab('upcoming')

    } catch (err) {
      console.error('Error loading followups:', err)
    }
  }

  function openQuickAction(lead: Lead) {
    setShowQuickAction(lead.id)
    setQuickNotes('')
    setQuickStatus(lead.lead_status)
    setQuickFollowup('')
  }

  async function saveQuickAction(lead: Lead) {
    if (!quickNotes.trim()) return

    setSaving(true)
    try {
      // Create interaction
      await supabase.from('crm_lead_interactions').insert({
        lead_id: lead.id,
        employee_id: currentUser.id,
        discussion_notes: quickNotes.trim(),
        interaction_type: 'call',
        lead_score_before: lead.lead_score,
        lead_score_after: lead.lead_score,
        lead_status_before: lead.lead_status,
        lead_status_after: quickStatus || lead.lead_status,
        next_followup_date: quickFollowup || null
      })

      // Update lead
      const updates: any = {
        lead_status: quickStatus || lead.lead_status,
        last_interaction_at: new Date().toISOString()
      }

      if (quickFollowup) {
        updates.next_followup_date = quickFollowup
      }

      if (quickStatus === 'converted') {
        updates.is_converted = true
        updates.conversion_date = new Date().toISOString().split('T')[0]
      }

      await supabase.from('crm_leads').update(updates).eq('id', lead.id)

      // Audit log
      await supabase.from('crm_audit_log').insert({
        employee_id: currentUser.id,
        emp_id: currentUser.emp_id,
        action: 'interaction',
        entity_type: 'lead',
        entity_id: lead.id,
        description: `Quick follow-up: ${lead.full_name}`
      })

      setShowQuickAction(null)
      await loadFollowups()

    } catch (err) {
      console.error('Error saving:', err)
    } finally {
      setSaving(false)
    }
  }

  function sendWhatsApp(lead: Lead) {
    const phone = lead.country_code.replace('+', '') + lead.mobile
    const msg = `Hi ${lead.full_name}! This is a follow-up from AIwithArijit.com. How can I assist you today?`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function makeCall(lead: Lead) {
    window.open(`tel:${lead.country_code}${lead.mobile}`, '_self')
  }

  function getStatusBadge(status: string) {
    const s = LEAD_STATUSES.find(st => st.value === status)
    return s ? s.color : 'bg-slate-500/20 text-slate-400'
  }

  function getActiveLeads() {
    switch (activeTab) {
      case 'overdue': return overdueLeads
      case 'today': return todayLeads
      case 'upcoming': return upcomingLeads
      default: return []
    }
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
                <h1 className="text-white font-bold text-lg">Follow-up Reminders</h1>
                <p className="text-slate-400 text-xs">Manage your pending follow-ups</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => setActiveTab('overdue')}
            className={`p-4 rounded-xl border transition-all ${
              activeTab === 'overdue'
                ? 'bg-red-500/20 border-red-500'
                : 'bg-slate-800 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${activeTab === 'overdue' ? 'text-red-300' : 'text-slate-400'}`}>Overdue</p>
                <p className={`text-3xl font-bold ${activeTab === 'overdue' ? 'text-red-400' : 'text-white'}`}>
                  {overdueLeads.length}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                activeTab === 'overdue' ? 'bg-red-500/30' : 'bg-red-500/20'
              }`}>
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('today')}
            className={`p-4 rounded-xl border transition-all ${
              activeTab === 'today'
                ? 'bg-amber-500/20 border-amber-500'
                : 'bg-slate-800 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${activeTab === 'today' ? 'text-amber-300' : 'text-slate-400'}`}>Today</p>
                <p className={`text-3xl font-bold ${activeTab === 'today' ? 'text-amber-400' : 'text-white'}`}>
                  {todayLeads.length}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                activeTab === 'today' ? 'bg-amber-500/30' : 'bg-amber-500/20'
              }`}>
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('upcoming')}
            className={`p-4 rounded-xl border transition-all ${
              activeTab === 'upcoming'
                ? 'bg-blue-500/20 border-blue-500'
                : 'bg-slate-800 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${activeTab === 'upcoming' ? 'text-blue-300' : 'text-slate-400'}`}>Next 7 Days</p>
                <p className={`text-3xl font-bold ${activeTab === 'upcoming' ? 'text-blue-400' : 'text-white'}`}>
                  {upcomingLeads.length}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                activeTab === 'upcoming' ? 'bg-blue-500/30' : 'bg-blue-500/20'
              }`}>
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* Leads List */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-white capitalize">{activeTab} Follow-ups</h3>
          </div>

          <div className="divide-y divide-slate-700">
            {getActiveLeads().map((lead) => (
              <div key={lead.id} className="p-4 hover:bg-slate-700/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-white font-medium">{lead.full_name}</h4>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(lead.lead_status)}`}>
                        {LEAD_STATUSES.find(s => s.value === lead.lead_status)?.label}
                      </span>
                      {lead.days_overdue > 0 && (
                        <span className="text-red-400 text-xs font-medium">
                          {lead.days_overdue} day{lead.days_overdue > 1 ? 's' : ''} overdue
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                      <span>{lead.country_code} {lead.mobile}</span>
                      {lead.course && <span>• {lead.course}</span>}
                      <span>• Assigned: {lead.assigned_to_name}</span>
                      <span>• Follow-up: {new Date(lead.next_followup_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => makeCall(lead)}
                      className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg"
                      title="Call"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => sendWhatsApp(lead)}
                      className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg"
                      title="WhatsApp"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => openQuickAction(lead)}
                      className="p-2 text-amber-400 hover:bg-amber-500/20 rounded-lg"
                      title="Quick Log"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => router.push(`/CRM/leads/${lead.id}`)}
                      className="p-2 text-slate-400 hover:bg-slate-600 rounded-lg"
                      title="View Details"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Quick Action Form */}
                {showQuickAction === lead.id && (
                  <div className="mt-4 p-4 bg-slate-900 rounded-xl border border-slate-700">
                    <h5 className="text-white font-medium mb-3">Quick Follow-up Log</h5>
                    <div className="space-y-3">
                      <textarea
                        value={quickNotes}
                        onChange={(e) => setQuickNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm resize-none"
                        placeholder="What was discussed?"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Update Status</label>
                          <select
                            value={quickStatus}
                            onChange={(e) => setQuickStatus(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          >
                            {LEAD_STATUSES.map(s => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Next Follow-up</label>
                          <input
                            type="date"
                            value={quickFollowup}
                            onChange={(e) => setQuickFollowup(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setShowQuickAction(null)}
                          className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveQuickAction(lead)}
                          disabled={saving || !quickNotes.trim()}
                          className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            saving || !quickNotes.trim()
                              ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed'
                              : 'bg-amber-500 hover:bg-amber-600 text-slate-900'
                          }`}
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {getActiveLeads().length === 0 && (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-400">No {activeTab} follow-ups</p>
                <p className="text-slate-500 text-sm mt-1">
                  {activeTab === 'overdue' ? "Great! You're all caught up!" : "Check back later for new follow-ups"}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
