'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Lead status options
const LEAD_STATUSES = [
  { value: 'new', label: 'New', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'contacted', label: 'Contacted', color: 'bg-cyan-500/20 text-cyan-400' },
  { value: 'follow_up_again', label: 'Follow-up Again', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'need_something', label: 'Need Something', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'converted', label: 'Converted', color: 'bg-green-500/20 text-green-400' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-red-500/20 text-red-400' }
]

const LEAD_SOURCES = [
  { value: 'webinar', label: 'Webinar' },
  { value: 'self', label: 'Self Generated' },
  { value: 'referred', label: 'Referred' },
  { value: 'resume_upload', label: 'Resume Upload' },
  { value: 'ai_spot', label: 'AI Spot' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'website', label: 'Website' },
  { value: 'other', label: 'Other' }
]

const FOR_WHOM_OPTIONS = [
  { value: 'self', label: 'Self' },
  { value: 'kids', label: 'Kids' },
  { value: 'college', label: 'College Student' },
  { value: 'working_professional', label: 'Working Professional' },
  { value: 'tech_dev', label: 'Tech Developer' },
  { value: 'other', label: 'Other' }
]

interface Lead {
  id: string
  lead_id: number
  full_name: string
  country_code: string
  mobile: string
  email: string
  lead_source: string
  for_whom: string
  course: string
  lead_score: number
  lead_status: string
  status_notes: string
  lead_generation_date: string
  next_followup_date: string
  target_conversion_date: string
  assigned_to: string
  assigned_to_name?: string
  generated_by: string
  generated_by_name?: string
  is_converted: boolean
  created_at: string
  updated_at: string
  interaction_count?: number
}

interface Employee {
  id: string
  emp_id: string
  full_name: string
  job_role: string
}

export default function LeadsPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    source: '',
    forWhom: '',
    score: '',
    assignedTo: '',
    followupFrom: '',
    followupTo: ''
  })
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [showInteractionModal, setShowInteractionModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [interactions, setInteractions] = useState<any[]>([])
  const [loadingInteractions, setLoadingInteractions] = useState(false)
  const [interactionForm, setInteractionForm] = useState({
    discussion_notes: '',
    interaction_type: 'call',
    lead_score: 3,
    lead_status: 'contacted',
    next_followup_date: ''
  })
  const [savingInteraction, setSavingInteraction] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const ITEMS_PER_PAGE = 20

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
      await Promise.all([loadLeads(), loadEmployees()])

    } catch (err) {
      console.error('Session check error:', err)
      router.push('/CRM')
    } finally {
      setLoading(false)
    }
  }

  async function loadLeads() {
    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const { data: emps } = await supabase.from('crm_employees').select('id, full_name')
      const empMap = Object.fromEntries(emps?.map(e => [e.id, e.full_name]) || [])

      const { data: interactionCounts } = await supabase
        .from('crm_lead_interactions')
        .select('lead_id')

      const countMap: Record<string, number> = {}
      interactionCounts?.forEach(i => {
        countMap[i.lead_id] = (countMap[i.lead_id] || 0) + 1
      })

      const leadsWithData = data?.map(lead => ({
        ...lead,
        assigned_to_name: empMap[lead.assigned_to] || '-',
        generated_by_name: empMap[lead.generated_by] || '-',
        interaction_count: countMap[lead.id] || 0
      })) || []

      setLeads(leadsWithData)
    } catch (err) {
      console.error('Error loading leads:', err)
    }
  }

  async function loadEmployees() {
    try {
      const { data } = await supabase
        .from('crm_employees')
        .select('id, emp_id, full_name, job_role')
        .eq('is_active', true)
        .order('full_name')

      setEmployees(data || [])
    } catch (err) {
      console.error('Error loading employees:', err)
    }
  }

  async function loadInteractions(leadId: string) {
    setLoadingInteractions(true)
    try {
      const { data, error } = await supabase
        .from('crm_lead_interactions')
        .select('*, crm_employees(full_name)')
        .eq('lead_id', leadId)
        .order('interaction_date', { ascending: false })

      if (error) throw error
      setInteractions(data || [])
    } catch (err) {
      console.error('Error loading interactions:', err)
    } finally {
      setLoadingInteractions(false)
    }
  }

  function getFilteredLeads() {
    let filtered = [...leads]

    if (search) {
      const s = search.toLowerCase()
      filtered = filtered.filter(l =>
        l.full_name.toLowerCase().includes(s) ||
        l.mobile.includes(search) ||
        l.email?.toLowerCase().includes(s) ||
        l.lead_id.toString().includes(search)
      )
    }

    if (filters.status) filtered = filtered.filter(l => l.lead_status === filters.status)
    if (filters.source) filtered = filtered.filter(l => l.lead_source === filters.source)
    if (filters.forWhom) filtered = filtered.filter(l => l.for_whom === filters.forWhom)
    if (filters.score) filtered = filtered.filter(l => l.lead_score === parseInt(filters.score))
    if (filters.assignedTo) filtered = filtered.filter(l => l.assigned_to === filters.assignedTo)
    if (filters.followupFrom) filtered = filtered.filter(l => l.next_followup_date >= filters.followupFrom)
    if (filters.followupTo) filtered = filtered.filter(l => l.next_followup_date <= filters.followupTo)

    return filtered
  }

  const filteredLeads = getFilteredLeads()
  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE)
  const paginatedLeads = filteredLeads.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.lead_status === 'new').length,
    followupToday: leads.filter(l => l.next_followup_date === new Date().toISOString().split('T')[0]).length,
    converted: leads.filter(l => l.is_converted).length
  }

  function openInteractionModal(lead: Lead) {
    setSelectedLead(lead)
    setInteractionForm({
      discussion_notes: '',
      interaction_type: 'call',
      lead_score: lead.lead_score,
      lead_status: lead.lead_status,
      next_followup_date: lead.next_followup_date || ''
    })
    loadInteractions(lead.id)
    setShowInteractionModal(true)
  }

  async function saveInteraction() {
    if (!selectedLead || !interactionForm.discussion_notes.trim()) return

    setSavingInteraction(true)
    try {
      await supabase.from('crm_lead_interactions').insert({
        lead_id: selectedLead.id,
        employee_id: currentUser.id,
        discussion_notes: interactionForm.discussion_notes.trim(),
        interaction_type: interactionForm.interaction_type,
        lead_score_before: selectedLead.lead_score,
        lead_score_after: interactionForm.lead_score,
        lead_status_before: selectedLead.lead_status,
        lead_status_after: interactionForm.lead_status,
        next_followup_date: interactionForm.next_followup_date || null
      })

      await supabase.from('crm_leads').update({
        lead_score: interactionForm.lead_score,
        lead_status: interactionForm.lead_status,
        next_followup_date: interactionForm.next_followup_date || null,
        is_converted: interactionForm.lead_status === 'converted',
        conversion_date: interactionForm.lead_status === 'converted' ? new Date().toISOString().split('T')[0] : null,
        last_interaction_at: new Date().toISOString()
      }).eq('id', selectedLead.id)

      await supabase.from('crm_audit_log').insert({
        employee_id: currentUser.id,
        emp_id: currentUser.emp_id,
        action: 'interaction',
        entity_type: 'lead',
        entity_id: selectedLead.id,
        description: `Added ${interactionForm.interaction_type} interaction for: ${selectedLead.full_name}`
      })

      await loadInteractions(selectedLead.id)
      await loadLeads()

      setInteractionForm(prev => ({
        ...prev,
        discussion_notes: ''
      }))

      setSelectedLead(prev => prev ? {
        ...prev,
        lead_score: interactionForm.lead_score,
        lead_status: interactionForm.lead_status,
        next_followup_date: interactionForm.next_followup_date
      } : null)

      setSuccess('Interaction saved!')
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      console.error('Error saving interaction:', err)
      setError('Failed to save interaction')
    } finally {
      setSavingInteraction(false)
    }
  }

  function sendWhatsApp(lead: Lead) {
    const phone = lead.country_code.replace('+', '') + lead.mobile
    const msg = `Hi ${lead.full_name}! This is from AIwithArijit.com. How can I assist you today?`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function makeCall(lead: Lead) {
    window.open(`tel:${lead.country_code}${lead.mobile}`, '_self')
  }

  function sendEmail(lead: Lead) {
    if (lead.email) {
      window.open(`mailto:${lead.email}?subject=Follow-up from AIwithArijit`, '_self')
    }
  }

  function getStatusBadge(status: string) {
    const s = LEAD_STATUSES.find(st => st.value === status)
    return s ? s.color : 'bg-slate-500/20 text-slate-400'
  }

  function getScoreStars(score: number) {
    return '★'.repeat(score) + '☆'.repeat(5 - score)
  }

  function exportCSV() {
    const headers = ['Lead ID', 'Name', 'Mobile', 'Email', 'Source', 'Score', 'Status', 'Assigned', 'Next Followup']
    const rows = filteredLeads.map(l => [
      l.lead_id,
      l.full_name,
      l.country_code + l.mobile,
      l.email || '',
      l.lead_source,
      l.lead_score,
      l.lead_status,
      l.assigned_to_name,
      l.next_followup_date || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  function clearFilters() {
    setFilters({ status: '', source: '', forWhom: '', score: '', assignedTo: '', followupFrom: '', followupTo: '' })
    setSearch('')
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
                <h1 className="text-white font-bold text-lg">Lead Management</h1>
                <p className="text-slate-400 text-xs">{filteredLeads.length} of {leads.length} leads</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Export</span>
              </button>
              <button onClick={() => router.push('/CRM/leads/bulk-upload')} className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="hidden sm:inline">Bulk</span>
              </button>
              <button onClick={() => router.push('/CRM/leads/new')} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm">New</p>
            <p className="text-2xl font-bold text-blue-400">{stats.new}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Follow-up Today</p>
            <p className="text-2xl font-bold text-amber-400">{stats.followupToday}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Converted</p>
            <p className="text-2xl font-bold text-green-400">{stats.converted}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search name, mobile, email..." className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg ${showFilters ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </button>
            {(search || Object.values(filters).some(v => v)) && (
              <button onClick={clearFilters} className="px-4 py-2.5 text-amber-400 hover:text-amber-300">Clear</button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-700">
              <select value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1) }} className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm">
                <option value="">All Status</option>
                {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select value={filters.source} onChange={(e) => { setFilters({ ...filters, source: e.target.value }); setPage(1) }} className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm">
                <option value="">All Sources</option>
                {LEAD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select value={filters.score} onChange={(e) => { setFilters({ ...filters, score: e.target.value }); setPage(1) }} className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm">
                <option value="">All Scores</option>
                {[5, 4, 3, 2, 1].map(s => <option key={s} value={s}>{s} Star{s > 1 ? 's' : ''}</option>)}
              </select>
              <select value={filters.assignedTo} onChange={(e) => { setFilters({ ...filters, assignedTo: e.target.value }); setPage(1) }} className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm">
                <option value="">All Assignees</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Follow-up From</label>
                <input type="date" value={filters.followupFrom} onChange={(e) => { setFilters({ ...filters, followupFrom: e.target.value }); setPage(1) }} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Follow-up To</label>
                <input type="date" value={filters.followupTo} onChange={(e) => { setFilters({ ...filters, followupTo: e.target.value }); setPage(1) }} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm" />
              </div>
            </div>
          )}
        </div>

        {/* Leads Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Lead</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Follow-up</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Assigned</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {paginatedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-slate-500 text-sm">{lead.lead_id}</td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{lead.full_name}</p>
                      <p className="text-slate-400 text-xs">{lead.course || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{lead.country_code} {lead.mobile}</p>
                      <p className="text-slate-400 text-xs truncate max-w-[150px]">{lead.email || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-sm capitalize">{lead.lead_source.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${lead.lead_score >= 4 ? 'text-green-400' : lead.lead_score >= 3 ? 'text-amber-400' : 'text-red-400'}`}>
                        {getScoreStars(lead.lead_score)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(lead.lead_status)}`}>
                        {LEAD_STATUSES.find(s => s.value === lead.lead_status)?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.next_followup_date ? (
                        <span className={`text-sm ${
                          lead.next_followup_date === new Date().toISOString().split('T')[0] ? 'text-amber-400 font-medium' :
                          lead.next_followup_date < new Date().toISOString().split('T')[0] ? 'text-red-400' : 'text-slate-300'
                        }`}>
                          {new Date(lead.next_followup_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                      ) : <span className="text-slate-500 text-sm">-</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-sm">{lead.assigned_to_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => makeCall(lead)} className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-slate-600 rounded-lg" title="Call">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </button>
                        <button onClick={() => sendWhatsApp(lead)} className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-slate-600 rounded-lg" title="WhatsApp">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </button>
                        {lead.email && (
                          <button onClick={() => sendEmail(lead)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-600 rounded-lg" title="Email">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                        <button onClick={() => openInteractionModal(lead)} className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-600 rounded-lg relative" title="Interactions">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          {(lead.interaction_count ?? 0) > 0 && (
  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-900 text-[10px] font-bold rounded-full flex items-center justify-center">
    {lead.interaction_count ?? 0}
  </span>
)}
                        </button>
                        <button onClick={() => router.push(`/CRM/leads/${lead.id}`)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedLeads.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">No leads found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
              <p className="text-slate-400 text-sm">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 bg-slate-700 text-white rounded disabled:opacity-50">Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 bg-slate-700 text-white rounded disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Interaction Modal */}
      {showInteractionModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedLead.full_name}</h2>
                <p className="text-slate-400 text-sm">{selectedLead.country_code} {selectedLead.mobile}</p>
              </div>
              <button onClick={() => setShowInteractionModal(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {success && <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-2 rounded-lg text-sm">{success}</div>}
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add Interaction Form */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Add Interaction</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Type</label>
                      <select value={interactionForm.interaction_type} onChange={(e) => setInteractionForm({ ...interactionForm, interaction_type: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white">
                        <option value="call">📞 Call</option>
                        <option value="whatsapp">💬 WhatsApp</option>
                        <option value="email">📧 Email</option>
                        <option value="meeting">🤝 Meeting</option>
                        <option value="note">📝 Note</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Notes *</label>
                      <textarea value={interactionForm.discussion_notes} onChange={(e) => setInteractionForm({ ...interactionForm, discussion_notes: e.target.value })} rows={4} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white resize-none" placeholder="What was discussed?" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Score</label>
                        <select value={interactionForm.lead_score} onChange={(e) => setInteractionForm({ ...interactionForm, lead_score: parseInt(e.target.value) })} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white">
                          {[5, 4, 3, 2, 1].map(s => <option key={s} value={s}>{s} Star{s > 1 ? 's' : ''}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Status</label>
                        <select value={interactionForm.lead_status} onChange={(e) => setInteractionForm({ ...interactionForm, lead_status: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white">
                          {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Next Follow-up</label>
                      <input type="date" value={interactionForm.next_followup_date} onChange={(e) => setInteractionForm({ ...interactionForm, next_followup_date: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white" />
                    </div>
                    <button onClick={saveInteraction} disabled={savingInteraction || !interactionForm.discussion_notes.trim()} className={`w-full py-3 rounded-lg font-semibold transition-colors ${savingInteraction || !interactionForm.discussion_notes.trim() ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 text-slate-900'}`}>
                      {savingInteraction ? 'Saving...' : 'Save Interaction'}
                    </button>
                  </div>
                </div>

                {/* History */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">History ({interactions.length})</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {loadingInteractions ? (
                      <p className="text-slate-400 text-center py-8">Loading...</p>
                    ) : interactions.length === 0 ? (
                      <p className="text-slate-500 text-center py-8">No interactions yet</p>
                    ) : (
                      interactions.map(i => (
                        <div key={i.id} className="bg-slate-900 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-sm">
                              {i.interaction_type === 'call' && '📞'}{i.interaction_type === 'whatsapp' && '💬'}{i.interaction_type === 'email' && '📧'}{i.interaction_type === 'meeting' && '🤝'}{i.interaction_type === 'note' && '📝'}
                              {' '}{new Date(i.interaction_date).toLocaleString()}
                            </span>
                            <span className="text-xs text-slate-500">{i.crm_employees?.full_name}</span>
                          </div>
                          <p className="text-white text-sm mb-2">{i.discussion_notes}</p>
                          {(i.lead_score_before !== i.lead_score_after || i.lead_status_before !== i.lead_status_after) && (
                            <div className="text-xs text-slate-400 flex gap-4">
                              {i.lead_score_before !== i.lead_score_after && <span>Score: {i.lead_score_before}→{i.lead_score_after}</span>}
                              {i.lead_status_before !== i.lead_status_after && <span>Status: {i.lead_status_before}→{i.lead_status_after}</span>}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
