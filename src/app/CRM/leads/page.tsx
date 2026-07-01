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
  // Enterprise fields
  tags: string[]
  pipeline_stage: string
  priority: string
  lead_temperature: string
  company_name: string
  industry: string
  expected_value: number | null
  deal_size_category: string
  customer_segment: string
}

interface Employee {
  id: string
  emp_id: string
  full_name: string
  job_role: string
}

interface WhatsAppTemplate {
  id: string
  template_name: string
  template_content: string
  category: string
  is_active: boolean
  created_by: string
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
    followupTo: '',
    // Enterprise filters
    pipelineStage: '',
    priority: '',
    temperature: '',
    tag: '',
    dealSize: '',
    industry: ''
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
    next_followup_date: '',
    priority: 'medium',
    lead_temperature: 'warm',
    pipeline_stage: 'awareness'
  })
  const [savingInteraction, setSavingInteraction] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([])
  const [selectedWhatsAppLead, setSelectedWhatsAppLead] = useState<Lead | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({})
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // AI Mentor state
  const [showAIMentorModal, setShowAIMentorModal] = useState(false)
  const [selectedAILead, setSelectedAILead] = useState<Lead | null>(null)
  const [aiRecommendations, setAIRecommendations] = useState<any>(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [aiError, setAIError] = useState('')
  const [whatsappTranscript, setWhatsappTranscript] = useState('')
  const [callTranscript, setCallTranscript] = useState('')
  const [aiSessionId, setAISessionId] = useState<string | null>(null)
  const [aiRating, setAIRating] = useState(0)

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
        l.lead_id.toString().includes(search) ||
        l.company_name?.toLowerCase().includes(s)
      )
    }

    // Basic filters
    if (filters.status) filtered = filtered.filter(l => l.lead_status === filters.status)
    if (filters.source) filtered = filtered.filter(l => l.lead_source === filters.source)
    if (filters.forWhom) filtered = filtered.filter(l => l.for_whom === filters.forWhom)
    if (filters.score) filtered = filtered.filter(l => l.lead_score === parseInt(filters.score))
    if (filters.assignedTo) filtered = filtered.filter(l => l.assigned_to === filters.assignedTo)
    if (filters.followupFrom) filtered = filtered.filter(l => l.next_followup_date >= filters.followupFrom)
    if (filters.followupTo) filtered = filtered.filter(l => l.next_followup_date <= filters.followupTo)

    // Enterprise filters
    if (filters.pipelineStage) filtered = filtered.filter(l => l.pipeline_stage === filters.pipelineStage)
    if (filters.priority) filtered = filtered.filter(l => l.priority === filters.priority)
    if (filters.temperature) filtered = filtered.filter(l => l.lead_temperature === filters.temperature)
    if (filters.dealSize) filtered = filtered.filter(l => l.deal_size_category === filters.dealSize)
    if (filters.industry) filtered = filtered.filter(l => l.industry?.toLowerCase().includes(filters.industry.toLowerCase()))
    if (filters.tag) filtered = filtered.filter(l => l.tags?.some(t => t.includes(filters.tag.toLowerCase())))

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
      next_followup_date: lead.next_followup_date || '',
      priority: lead.priority || 'medium',
      lead_temperature: lead.lead_temperature || 'warm',
      pipeline_stage: lead.pipeline_stage || 'awareness'
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
        priority: interactionForm.priority,
        lead_temperature: interactionForm.lead_temperature,
        pipeline_stage: interactionForm.pipeline_stage,
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
        next_followup_date: interactionForm.next_followup_date,
        priority: interactionForm.priority,
        lead_temperature: interactionForm.lead_temperature,
        pipeline_stage: interactionForm.pipeline_stage
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
    setSelectedWhatsAppLead(lead)
    setSelectedTemplate('')
    setDynamicFields({})
    loadWhatsAppTemplates()
    setShowWhatsAppModal(true)
  }

  // AI Mentor functions
  function openAIMentorModal(lead: Lead) {
    setSelectedAILead(lead)
    setShowAIMentorModal(true)
    setAIRecommendations(null)
    setAIError('')
    setWhatsappTranscript('')
    setCallTranscript('')
    setAIRating(0)
    setAISessionId(null)
  }

  async function getAIRecommendations() {
    if (!selectedAILead || !currentUser) return

    setLoadingAI(true)
    setAIError('')

    try {
      const response = await fetch('/api/ai-mentor/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leadId: selectedAILead.lead_id,
          employeeId: currentUser.id,
          whatsappTranscript: whatsappTranscript || undefined,
          callTranscript: callTranscript || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI recommendations')
      }

      setAIRecommendations(data.recommendations)
      setAISessionId(data.session_id)
      setSuccess('AI recommendations generated successfully!')
      setTimeout(() => setSuccess(''), 3000)

    } catch (err: any) {
      console.error('AI Mentor error:', err)
      setAIError(err.message || 'Failed to generate recommendations')
    } finally {
      setLoadingAI(false)
    }
  }

  async function saveAIRating(rating: number) {
    if (!aiSessionId) return

    try {
      const { error } = await supabase
        .from('crm_ai_mentor_sessions')
        .update({
          employee_rating: rating,
          updated_at: new Date().toISOString()
        })
        .eq('id', aiSessionId)

      if (error) throw error

      setAIRating(rating)
      setSuccess(`Thank you for rating the AI recommendations!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error saving rating:', err)
    }
  }

  function handleTranscriptFileUpload(event: React.ChangeEvent<HTMLInputElement>, type: 'whatsapp' | 'call') {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (type === 'whatsapp') {
        setWhatsappTranscript(text)
      } else {
        setCallTranscript(text)
      }
    }
    reader.readAsText(file)
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
    setFilters({
      status: '',
      source: '',
      forWhom: '',
      score: '',
      assignedTo: '',
      followupFrom: '',
      followupTo: '',
      pipelineStage: '',
      priority: '',
      temperature: '',
      tag: '',
      dealSize: '',
      industry: ''
    })
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
            <div className="mt-4 pt-4 border-t border-slate-700">
              {/* Basic Filters */}
              <div className="mb-4">
                <h3 className="text-slate-400 text-xs font-medium mb-3">Basic Filters</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                </div>
              </div>

              {/* Enterprise Filters */}
              <div className="mb-4">
                <h3 className="text-slate-400 text-xs font-medium mb-3">Enterprise Filters</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <select value={filters.pipelineStage} onChange={(e) => { setFilters({ ...filters, pipelineStage: e.target.value }); setPage(1) }} className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm">
                    <option value="">All Pipeline Stages</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="closed_won">Closed Won</option>
                    <option value="closed_lost">Closed Lost</option>
                  </select>
                  <select value={filters.priority} onChange={(e) => { setFilters({ ...filters, priority: e.target.value }); setPage(1) }} className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm">
                    <option value="">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <select value={filters.temperature} onChange={(e) => { setFilters({ ...filters, temperature: e.target.value }); setPage(1) }} className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm">
                    <option value="">All Temperatures</option>
                    <option value="cold">❄️ Cold</option>
                    <option value="warm">🌤️ Warm</option>
                    <option value="hot">🔥 Hot</option>
                  </select>
                  <select value={filters.dealSize} onChange={(e) => { setFilters({ ...filters, dealSize: e.target.value }); setPage(1) }} className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm">
                    <option value="">All Deal Sizes</option>
                    <option value="individual">Individual</option>
                    <option value="small-business">Small Business</option>
                    <option value="mid-market">Mid-Market</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <input
                    type="text"
                    value={filters.tag}
                    onChange={(e) => { setFilters({ ...filters, tag: e.target.value }); setPage(1) }}
                    placeholder="Search by tag..."
                    className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
                  />
                  <input
                    type="text"
                    value={filters.industry}
                    onChange={(e) => { setFilters({ ...filters, industry: e.target.value }); setPage(1) }}
                    placeholder="Search by industry..."
                    className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Date Filters */}
              <div>
                <h3 className="text-slate-400 text-xs font-medium mb-3">Follow-up Date Range</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">From</label>
                    <input type="date" value={filters.followupFrom} onChange={(e) => { setFilters({ ...filters, followupFrom: e.target.value }); setPage(1) }} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">To</label>
                    <input type="date" value={filters.followupTo} onChange={(e) => { setFilters({ ...filters, followupTo: e.target.value }); setPage(1) }} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm" />
                  </div>
                </div>
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
                      <div>
                        <p className="text-white font-medium">{lead.full_name}</p>
                        <p className="text-slate-400 text-xs">{lead.course || lead.company_name || '-'}</p>
                        {lead.tags && lead.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {lead.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="inline-flex px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded">
                                {tag}
                              </span>
                            ))}
                            {lead.tags.length > 2 && (
                              <span className="inline-flex px-1.5 py-0.5 bg-slate-600 text-slate-300 text-[10px] rounded">
                                +{lead.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{lead.country_code} {lead.mobile}</p>
                      <p className="text-slate-400 text-xs truncate max-w-[150px]">{lead.email || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-sm capitalize">{lead.lead_source.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`text-sm ${lead.lead_score >= 4 ? 'text-green-400' : lead.lead_score >= 3 ? 'text-amber-400' : 'text-red-400'}`}>
                          {getScoreStars(lead.lead_score)}
                        </span>
                        <div className="flex items-center gap-1">
                          {lead.lead_temperature === 'hot' && <span className="text-[10px]" title="Hot Lead">🔥</span>}
                          {lead.lead_temperature === 'warm' && <span className="text-[10px]" title="Warm Lead">🌤️</span>}
                          {lead.lead_temperature === 'cold' && <span className="text-[10px]" title="Cold Lead">❄️</span>}
                          {lead.priority === 'urgent' && <span className="px-1 py-0.5 bg-red-500/20 text-red-400 text-[9px] rounded font-medium">URGENT</span>}
                          {lead.priority === 'high' && <span className="px-1 py-0.5 bg-orange-500/20 text-orange-400 text-[9px] rounded font-medium">HIGH</span>}
                        </div>
                      </div>
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
                        <button onClick={() => openAIMentorModal(lead)} className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-slate-600 rounded-lg" title="AI Mentor">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
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
            <div className="px-6 py-4 border-b border-slate-700 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedLead.full_name}</h2>
                  <p className="text-slate-400 text-sm">
                    {selectedLead.country_code} {selectedLead.mobile}
                    {selectedLead.company_name && <span className="ml-2">• {selectedLead.company_name}</span>}
                  </p>
                </div>
                <button onClick={() => setShowInteractionModal(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedLead.lead_temperature === 'hot' && (
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">🔥 Hot</span>
                )}
                {selectedLead.lead_temperature === 'warm' && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">🌤️ Warm</span>
                )}
                {selectedLead.lead_temperature === 'cold' && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">❄️ Cold</span>
                )}
                {selectedLead.priority === 'urgent' && (
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded font-medium">URGENT</span>
                )}
                {selectedLead.priority === 'high' && (
                  <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">High Priority</span>
                )}
                {selectedLead.pipeline_stage && (
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded capitalize">{selectedLead.pipeline_stage}</span>
                )}
                {selectedLead.tags && selectedLead.tags.length > 0 && (
                  <>
                    {selectedLead.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">{tag}</span>
                    ))}
                    {selectedLead.tags.length > 3 && (
                      <span className="px-2 py-0.5 bg-slate-600 text-slate-300 text-xs rounded">+{selectedLead.tags.length - 3}</span>
                    )}
                  </>
                )}
              </div>
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Priority</label>
                        <select value={interactionForm.priority} onChange={(e) => setInteractionForm({ ...interactionForm, priority: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white">
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Temperature</label>
                        <select value={interactionForm.lead_temperature} onChange={(e) => setInteractionForm({ ...interactionForm, lead_temperature: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white">
                          <option value="cold">❄️ Cold</option>
                          <option value="warm">🌤️ Warm</option>
                          <option value="hot">🔥 Hot</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Pipeline Stage</label>
                      <select value={interactionForm.pipeline_stage} onChange={(e) => setInteractionForm({ ...interactionForm, pipeline_stage: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white">
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

      {/* AI Mentor Modal */}
      {showAIMentorModal && selectedAILead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between shrink-0 rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Mentor: How to Convert {selectedAILead.full_name}
                </h2>
                <p className="text-purple-100 text-sm mt-1">
                  Lead Score: {selectedAILead.lead_score}★ | Status: {selectedAILead.lead_status}
                </p>
              </div>
              <button
                onClick={() => setShowAIMentorModal(false)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {aiError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {aiError}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Upload Transcripts */}
                <div className="space-y-4">
                  <div className="bg-slate-700 rounded-xl p-4">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload Context
                    </h3>

                    {/* WhatsApp Upload */}
                    <div className="mb-4">
                      <label className="block text-sm text-slate-300 mb-2">WhatsApp Chat (.txt)</label>
                      <input
                        type="file"
                        accept=".txt"
                        onChange={(e) => handleTranscriptFileUpload(e, 'whatsapp')}
                        className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                      />
                      {whatsappTranscript && (
                        <p className="text-xs text-green-400 mt-1">✓ Uploaded ({whatsappTranscript.length} characters)</p>
                      )}
                    </div>

                    {/* Call Transcript Upload */}
                    <div className="mb-4">
                      <label className="block text-sm text-slate-300 mb-2">Call/Meeting Notes (.txt)</label>
                      <input
                        type="file"
                        accept=".txt"
                        onChange={(e) => handleTranscriptFileUpload(e, 'call')}
                        className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                      />
                      {callTranscript && (
                        <p className="text-xs text-green-400 mt-1">✓ Uploaded ({callTranscript.length} characters)</p>
                      )}
                    </div>

                    {/* Manual Paste */}
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">Or paste manually:</label>
                      <textarea
                        rows={4}
                        placeholder="Paste conversation transcript here..."
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        value={whatsappTranscript || callTranscript}
                        onChange={(e) => setWhatsappTranscript(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Lead Summary */}
                  <div className="bg-slate-700 rounded-xl p-4">
                    <h3 className="text-white font-semibold mb-3">Lead Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Course:</span>
                        <span className="text-white font-medium">{selectedAILead.course}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">For Whom:</span>
                        <span className="text-white">{selectedAILead.for_whom}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Source:</span>
                        <span className="text-white">{selectedAILead.lead_source}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Interactions:</span>
                        <span className="text-white">{selectedAILead.interaction_count ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: AI Recommendations */}
                <div className="lg:col-span-2 space-y-4">
                  {!aiRecommendations && !loadingAI && (
                    <div className="bg-slate-700 rounded-xl p-8 text-center">
                      <svg className="w-16 h-16 mx-auto mb-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <h3 className="text-white text-xl font-bold mb-2">Ready to Get AI Recommendations?</h3>
                      <p className="text-slate-300 mb-6">Click below to analyze this lead and get personalized conversion strategies</p>
                      <button
                        onClick={getAIRecommendations}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105"
                      >
                        Get AI Recommendations
                      </button>
                    </div>
                  )}

                  {loadingAI && (
                    <div className="bg-slate-700 rounded-xl p-8 text-center">
                      <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <h3 className="text-white text-xl font-bold mb-2">AI Mentor is Thinking...</h3>
                      <p className="text-slate-300">Analyzing lead data and generating personalized recommendations</p>
                    </div>
                  )}

                  {aiRecommendations && (
                    <>
                      {/* Timing Recommendation */}
                      <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-4">
                        <h3 className="text-amber-400 font-semibold flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          ⏰ Best Time to Reach Out
                        </h3>
                        <p className="text-white">{String(aiRecommendations.timing ?? '')}</p>
                      </div>

                      {/* Communication Mode */}
                      <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4">
                        <h3 className="text-green-400 font-semibold flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          📱 Communication Mode
                        </h3>
                        <p className="text-white mb-2">{String(aiRecommendations.communication_mode ?? '')}</p>
                        {aiRecommendations.location_if_meeting && (
                          <p className="text-green-200 text-sm">📍 Suggested Location: {String(aiRecommendations.location_if_meeting)}</p>
                        )}
                      </div>

                      {/* Product & Pitch */}
                      <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-4">
                        <h3 className="text-blue-400 font-semibold flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          🎯 Product & Pitch
                        </h3>
                        <p className="text-blue-200 font-medium mb-2">Recommended: {String(aiRecommendations.product ?? '')}</p>
                        <p className="text-white mb-2">{String(aiRecommendations.pitch ?? '')}</p>
                        <p className="text-blue-200 text-sm">💬 Tone: {String(aiRecommendations.tone ?? '')}</p>
                      </div>

                      {/* Success Prediction */}
                      <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4">
                        <h3 className="text-purple-400 font-semibold flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          📊 Success Prediction
                        </h3>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-3xl font-bold text-purple-400 mb-1">{aiRecommendations.success_probability ?? 0}%</div>
                            <div className="text-slate-300 text-xs">Success Rate</div>
                          </div>
                          <div>
                            <div className="text-3xl font-bold text-purple-400 mb-1">{aiRecommendations.meetings_required ?? 0}</div>
                            <div className="text-slate-300 text-xs">Meetings Needed</div>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-purple-400 mb-1">{String(aiRecommendations.probable_conversion_date ?? '')}</div>
                            <div className="text-slate-300 text-xs">Target Date</div>
                          </div>
                        </div>
                      </div>

                      {/* Objection Handling */}
                      <div className="bg-slate-700 rounded-xl p-4">
                        <h3 className="text-white font-semibold mb-2">🛡️ Objection Handling</h3>
                        {typeof aiRecommendations.objection_handling === 'object' ? (
                          <div className="space-y-2">
                            {Object.entries(aiRecommendations.objection_handling).map(([key, value]) => (
                              <div key={key}>
                                <p className="text-slate-200 font-medium text-sm">{key}:</p>
                                <p className="text-slate-300 text-sm ml-3">{String(value)}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-300 text-sm">{aiRecommendations.objection_handling}</p>
                        )}
                      </div>

                      {/* Referral Strategy */}
                      <div className="bg-slate-700 rounded-xl p-4">
                        <h3 className="text-white font-semibold mb-2">🤝 Referral Strategy</h3>
                        {typeof aiRecommendations.referral_strategy === 'object' ? (
                          <div className="space-y-2">
                            {Object.entries(aiRecommendations.referral_strategy).map(([key, value]) => (
                              <div key={key}>
                                <p className="text-slate-200 font-medium text-sm">{key}:</p>
                                <p className="text-slate-300 text-sm ml-3">{String(value)}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-300 text-sm">{aiRecommendations.referral_strategy}</p>
                        )}
                      </div>

                      {/* Reasoning */}
                      <div className="bg-slate-700 rounded-xl p-4">
                        <h3 className="text-white font-semibold mb-2">💡 AI Analysis</h3>
                        <p className="text-slate-300 text-sm">
                          {typeof aiRecommendations.reasoning === 'object'
                            ? JSON.stringify(aiRecommendations.reasoning, null, 2)
                            : aiRecommendations.reasoning}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between shrink-0">
              {aiRecommendations && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 text-sm">Rate this AI recommendation:</span>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => saveAIRating(rating)}
                      className={`text-2xl transition-colors ${
                        aiRating >= rating ? 'text-amber-400' : 'text-slate-600 hover:text-amber-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  {aiRating > 0 && <span className="text-green-400 text-sm ml-2">Thanks for your feedback!</span>}
                </div>
              )}
              <div className="flex gap-3 ml-auto">
                <button
                  onClick={() => setShowAIMentorModal(false)}
                  className="px-4 py-2.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
