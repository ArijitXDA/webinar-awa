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
  // Enterprise fields
  tags: string[]
  pipeline_stage: string
  priority: string
  lead_temperature: string
  company_name: string
  industry: string
}

interface WhatsAppTemplate {
  id: string
  template_name: string
  template_content: string
  category: string
  is_active: boolean
  created_by: string
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
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([])
  const [selectedWhatsAppLead, setSelectedWhatsAppLead] = useState<Lead | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({})
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    priority: '',
    temperature: '',
    tag: '',
    pipelineStage: ''
  })
  const [search, setSearch] = useState('')

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

  function getFilteredLeads() {
    let filtered = [...leads]

    if (search) {
      const s = search.toLowerCase()
      filtered = filtered.filter(l =>
        l.full_name.toLowerCase().includes(s) ||
        l.mobile.includes(search) ||
        l.company_name?.toLowerCase().includes(s)
      )
    }

    if (filters.priority) filtered = filtered.filter(l => l.priority === filters.priority)
    if (filters.temperature) filtered = filtered.filter(l => l.lead_temperature === filters.temperature)
    if (filters.pipelineStage) filtered = filtered.filter(l => l.pipeline_stage === filters.pipelineStage)
    if (filters.tag) filtered = filtered.filter(l => l.tags?.some(t => t.includes(filters.tag.toLowerCase())))

    return filtered
  }

  function clearFilters() {
    setFilters({
      priority: '',
      temperature: '',
      tag: '',
      pipelineStage: ''
    })
    setSearch('')
  }

  async function loadWhatsAppTemplates() {
    setLoadingTemplates(true)
    try {
      const { data, error } = await supabase
        .from('crm_whatsapp_templates')
        .select('*')
        .eq('is_active', true)
        .order('template_name')

      if (error) throw error
      setWhatsappTemplates(data || [])
    } catch (err) {
      console.error('Error loading WhatsApp templates:', err)
    } finally {
      setLoadingTemplates(false)
    }
  }

  function sendWhatsApp(lead: Lead) {
    setSelectedWhatsAppLead(lead)
    setSelectedTemplate('')
    setDynamicFields({})
    loadWhatsAppTemplates()
    setShowWhatsAppModal(true)
  }

  function extractPlaceholders(templateContent: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g
    const placeholders: string[] = []
    let match
    while ((match = regex.exec(templateContent)) !== null) {
      if (!placeholders.includes(match[1])) {
        placeholders.push(match[1])
      }
    }
    return placeholders
  }

  function getPlaceholderValue(placeholder: string, lead: Lead): string {
    switch (placeholder) {
      case 'lead.full_name':
        return lead.full_name
      case 'lead.course':
        return lead.course || ''
      case 'lead.mobile':
        return lead.country_code + lead.mobile
      case 'lead.email':
        return lead.email || ''
      case 'employee.full_name':
        return currentUser?.full_name || ''
      case 'company.name':
        return 'AIwithArijit'
      default:
        return dynamicFields[placeholder] || `{{${placeholder}}}`
    }
  }

  function composeMessage(templateContent: string, lead: Lead): string {
    let message = templateContent
    const placeholders = extractPlaceholders(templateContent)

    placeholders.forEach(placeholder => {
      const value = getPlaceholderValue(placeholder, lead)
      message = message.replace(new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g'), value)
    })

    return message
  }

  function sendWhatsAppMessage() {
    if (!selectedWhatsAppLead || !selectedTemplate) return

    const template = whatsappTemplates.find(t => t.id === selectedTemplate)
    if (!template) return

    const message = composeMessage(template.template_content, selectedWhatsAppLead)
    const phone = selectedWhatsAppLead.country_code.replace('+', '') + selectedWhatsAppLead.mobile

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
    setShowWhatsAppModal(false)
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

        {/* Filters Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-6 py-3 flex items-center justify-between text-white hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="font-medium">Filters & Search</span>
              {(search || filters.priority || filters.temperature || filters.tag || filters.pipelineStage) && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">Active</span>
              )}
            </div>
            <svg className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showFilters && (
            <div className="px-6 py-4 border-t border-slate-700 space-y-4">
              {/* Search Bar */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Search by name, mobile, company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500"
                />
              </div>

              {/* Filter Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Priority</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">Temperature</label>
                  <select
                    value={filters.temperature}
                    onChange={(e) => setFilters({ ...filters, temperature: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="">All Temperatures</option>
                    <option value="hot">🔥 Hot</option>
                    <option value="warm">🌤️ Warm</option>
                    <option value="cold">❄️ Cold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">Pipeline Stage</label>
                  <select
                    value={filters.pipelineStage}
                    onChange={(e) => setFilters({ ...filters, pipelineStage: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="">All Stages</option>
                    <option value="awareness">Awareness</option>
                    <option value="interest">Interest</option>
                    <option value="consideration">Consideration</option>
                    <option value="intent">Intent</option>
                    <option value="evaluation">Evaluation</option>
                    <option value="purchase">Purchase</option>
                    <option value="retention">Retention</option>
                    <option value="advocacy">Advocacy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">Tag</label>
                  <input
                    type="text"
                    placeholder="Filter by tag..."
                    value={filters.tag}
                    onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
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
                  <span className="text-slate-400 text-sm font-normal ml-2">({getFilteredLeads().length})</span>
                </h2>
              </div>

              <div className="divide-y divide-slate-700 max-h-[600px] overflow-y-auto">
                {getFilteredLeads().map((lead) => (
                  <div key={lead.id} className="p-4 hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-medium truncate">{lead.full_name}</h3>
                          <span className={`${getScoreColor(lead.lead_score)} text-sm`}>
                            {getScoreStars(lead.lead_score)}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm">
                          {lead.country_code} {lead.mobile}
                          {lead.company_name && <span className="ml-2 text-slate-500">• {lead.company_name}</span>}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${LEAD_STATUSES[lead.lead_status]?.color || 'bg-slate-500/20 text-slate-400'}`}>
                            {LEAD_STATUSES[lead.lead_status]?.label || lead.lead_status}
                          </span>
                          {lead.lead_temperature === 'hot' && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">🔥 Hot</span>
                          )}
                          {lead.lead_temperature === 'warm' && (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">🌤️ Warm</span>
                          )}
                          {lead.lead_temperature === 'cold' && (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">❄️ Cold</span>
                          )}
                          {lead.priority === 'urgent' && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded font-medium">URGENT</span>
                          )}
                          {lead.priority === 'high' && (
                            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">High</span>
                          )}
                          {lead.tags && lead.tags.length > 0 && (
                            <>
                              {lead.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                  {tag}
                                </span>
                              ))}
                              {lead.tags.length > 3 && (
                                <span className="px-2 py-0.5 bg-slate-600 text-slate-300 text-xs rounded">
                                  +{lead.tags.length - 3}
                                </span>
                              )}
                            </>
                          )}
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

                {getFilteredLeads().length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    {leads.length === 0 ? (
                      <>
                        {activeTab === 'today' && 'No follow-ups scheduled for today'}
                        {activeTab === 'overdue' && 'No overdue follow-ups! 🎉'}
                        {activeTab === 'upcoming' && 'No upcoming follow-ups'}
                        {activeTab === 'new' && 'No new leads assigned'}
                        {activeTab === 'all' && 'No leads assigned to you'}
                      </>
                    ) : (
                      'No leads match the current filters'
                    )}
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

      {/* WhatsApp Template Modal */}
      {showWhatsAppModal && selectedWhatsAppLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white">Send WhatsApp Message</h2>
                <p className="text-slate-400 text-sm">{selectedWhatsAppLead.full_name} • {selectedWhatsAppLead.country_code} {selectedWhatsAppLead.mobile}</p>
              </div>
              <button onClick={() => setShowWhatsAppModal(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingTemplates ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-slate-400 mt-4">Loading templates...</p>
                </div>
              ) : whatsappTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-slate-400 mb-4">No active WhatsApp templates found</p>
                  <button onClick={() => router.push('/CRM/whatsapp-templates')} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg">
                    Create Templates
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Select Template *</label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => {
                        setSelectedTemplate(e.target.value)
                        setDynamicFields({})
                      }}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="">Choose a template...</option>
                      {whatsappTemplates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.template_name} ({template.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedTemplate && (() => {
                    const template = whatsappTemplates.find(t => t.id === selectedTemplate)
                    if (!template) return null

                    const placeholders = extractPlaceholders(template.template_content)
                    const customPlaceholders = placeholders.filter(p =>
                      !['lead.full_name', 'lead.course', 'lead.mobile', 'lead.email', 'employee.full_name', 'company.name'].includes(p)
                    )

                    return (
                      <>
                        {customPlaceholders.length > 0 && (
                          <div className="bg-slate-900 rounded-lg p-4 space-y-3">
                            <p className="text-sm text-slate-300 font-medium">Fill Custom Fields:</p>
                            {customPlaceholders.map(placeholder => (
                              <div key={placeholder}>
                                <label className="block text-xs text-slate-400 mb-1">
                                  {placeholder.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </label>
                                <input
                                  type="text"
                                  value={dynamicFields[placeholder] || ''}
                                  onChange={(e) => setDynamicFields({ ...dynamicFields, [placeholder]: e.target.value })}
                                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                                  placeholder={`Enter ${placeholder}`}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        <div>
                          <label className="block text-sm text-slate-300 mb-2">Message Preview</label>
                          <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                            <p className="text-green-200 text-sm whitespace-pre-wrap">
                              {composeMessage(template.template_content, selectedWhatsAppLead)}
                            </p>
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="px-4 py-2.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={sendWhatsAppMessage}
                disabled={!selectedTemplate}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold ${
                  selectedTemplate
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-600/50 text-green-200 cursor-not-allowed'
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Send via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
