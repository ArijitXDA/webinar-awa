'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  totalLeads: number
  newLeads: number
  followupsToday: number
  overdueFollowups: number
  conversions: number
  conversionRate: number
  totalEmployees: number
  todayInteractions: number
}

interface Lead {
  id: string
  full_name: string
  country_code: string
  mobile: string
  email?: string
  course?: string
}

interface WhatsAppTemplate {
  id: string
  template_name: string
  template_content: string
  category: string
  is_active: boolean
  created_by: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    newLeads: 0,
    followupsToday: 0,
    overdueFollowups: 0,
    conversions: 0,
    conversionRate: 0,
    totalEmployees: 0,
    todayInteractions: 0
  })
  const [recentLeads, setRecentLeads] = useState<any[]>([])
  const [upcomingFollowups, setUpcomingFollowups] = useState<any[]>([])
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([])
  const [selectedWhatsAppLead, setSelectedWhatsAppLead] = useState<Lead | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({})
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [showIntegrationsModal, setShowIntegrationsModal] = useState(false)
  const [activeIntegrationTab, setActiveIntegrationTab] = useState<'social' | 'communication' | 'automation' | 'mcp' | 'api'>('social')
  const [integrations, setIntegrations] = useState({
    facebook: { connected: false, accessToken: '', pageId: '' },
    instagram: { connected: false, accessToken: '', businessAccountId: '' },
    twitter: { connected: false, apiKey: '', apiSecret: '', accessToken: '', accessSecret: '' },
    linkedin: { connected: false, clientId: '', clientSecret: '', accessToken: '' },
    exotel: { connected: false, apiKey: '', apiToken: '', sid: '' },
    twilio: { connected: false, accountSid: '', authToken: '', phoneNumber: '' },
    aisensy: { connected: false, apiKey: '', instanceId: '' },
    slack: { connected: false, botToken: '', webhookUrl: '' },
    n8n: { connected: false, webhookUrl: '', apiKey: '' },
    make: { connected: false, webhookUrl: '', apiKey: '' },
    zapier: { connected: false, webhookUrl: '', apiKey: '' },
    mcpConnector: { connected: false, serverUrl: '', apiKey: '' },
    azureApi: { connected: false, clientId: '', clientSecret: '', tenantId: '', subscriptionId: '' }
  })

  const isOwner = currentUser?.job_role === 'owner'
  const isAdmin = currentUser && ['owner', 'ea_to_owner', 'director', 'ea_to_director'].includes(currentUser.job_role)
  const isManager = currentUser && ['owner', 'ea_to_owner', 'director', 'ea_to_director', 'pm_ai_spot', 'pm_b2c_btl', 'pm_stage_2', 'pm_stage_3'].includes(currentUser.job_role)

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

      await supabase
        .from('crm_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('session_token', session.token)

      setCurrentUser(session.employee)
      await loadDashboardData()

    } catch (err) {
      console.error('Session check error:', err)
      router.push('/CRM')
    } finally {
      setLoading(false)
    }
  }

  async function loadDashboardData() {
    const today = new Date().toISOString().split('T')[0]

    const { data: leads } = await supabase.from('crm_leads').select('id, lead_status, is_converted, next_followup_date')
    const { data: employees } = await supabase.from('crm_employees').select('id, is_active')
    const { data: interactions } = await supabase.from('crm_lead_interactions').select('id').gte('created_at', today)
    const { data: recent } = await supabase.from('crm_leads').select('id, full_name, lead_status, created_at, course').order('created_at', { ascending: false }).limit(5)
    const { data: followups } = await supabase.from('crm_leads').select('id, full_name, next_followup_date, mobile, country_code').gte('next_followup_date', today).order('next_followup_date', { ascending: true }).limit(5)

    if (leads) {
      const totalLeads = leads.length
      const newLeads = leads.filter(l => l.lead_status === 'new').length
      const followupsToday = leads.filter(l => l.next_followup_date === today).length
      const overdueFollowups = leads.filter(l => l.next_followup_date && l.next_followup_date < today && !l.is_converted && l.lead_status !== 'not_interested').length
      const conversions = leads.filter(l => l.is_converted).length

      setStats({
        totalLeads,
        newLeads,
        followupsToday,
        overdueFollowups,
        conversions,
        conversionRate: totalLeads > 0 ? Math.round((conversions / totalLeads) * 100) : 0,
        totalEmployees: employees?.filter(e => e.is_active).length || 0,
        todayInteractions: interactions?.length || 0
      })
    }

    setRecentLeads(recent || [])
    setUpcomingFollowups(followups || [])
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

  async function handleLogout() {
    try {
      const sessionData = localStorage.getItem('crm_session')
      if (sessionData) {
        const session = JSON.parse(sessionData)
        await supabase.from('crm_sessions').update({ is_valid: false }).eq('session_token', session.token)
      }
      localStorage.removeItem('crm_session')
      router.push('/CRM')
    } catch (err) {
      localStorage.removeItem('crm_session')
      router.push('/CRM')
    }
  }

  function getStatusBadge(status: string) {
    const colors: Record<string, string> = {
      new: 'bg-blue-500/20 text-blue-400',
      contacted: 'bg-cyan-500/20 text-cyan-400',
      follow_up_again: 'bg-amber-500/20 text-amber-400',
      need_something: 'bg-purple-500/20 text-purple-400',
      converted: 'bg-green-500/20 text-green-400',
      not_interested: 'bg-red-500/20 text-red-400'
    }
    return colors[status] || 'bg-slate-500/20 text-slate-400'
  }

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      new: 'New', contacted: 'Contacted', follow_up_again: 'Follow-up',
      need_something: 'Need Info', converted: 'Converted', not_interested: 'Not Interested'
    }
    return labels[status] || status
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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
                <span className="text-slate-900 font-bold text-lg">o</span>
              </div>
              <div>
                <h1 className="text-white font-bold">oCRM Dashboard</h1>
                <p className="text-slate-400 text-xs">AIwithArijit.com</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/CRM/settings')} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg" title="Settings">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <div className="text-right hidden sm:block">
                <p className="text-white font-medium text-sm">{currentUser?.full_name}</p>
                <p className="text-slate-400 text-xs capitalize">{currentUser?.job_role?.replace(/_/g, ' ')}</p>
              </div>
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg" title="Logout">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Alert for Overdue */}
        {stats.overdueFollowups > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-red-400 font-medium">You have {stats.overdueFollowups} overdue follow-ups!</p>
                <p className="text-red-300/70 text-sm">Please address these leads as soon as possible</p>
              </div>
            </div>
            <button onClick={() => router.push('/CRM/followups')} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium">
              View Now
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors cursor-pointer" onClick={() => router.push('/CRM/leads')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Leads</p>
                <p className="text-2xl font-bold text-white">{stats.totalLeads}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors cursor-pointer" onClick={() => router.push('/CRM/my-tasks')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Today's Follow-ups</p>
                <p className="text-2xl font-bold text-amber-400">{stats.followupsToday}</p>
              </div>
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors cursor-pointer" onClick={() => router.push('/CRM/leads?status=new')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">New Leads</p>
                <p className="text-2xl font-bold text-cyan-400">{stats.newLeads}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-sm">Conversions</p>
                <p className="text-2xl font-bold text-green-400">{stats.conversions}</p>
                <p className="text-green-400/70 text-xs">{stats.conversionRate}% rate</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-3">
          {/* Core Actions */}
          <button onClick={() => router.push('/CRM/leads')} className="bg-slate-800 border border-slate-700 rounded-xl p-3 hover:border-amber-500/50 transition-all group">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-white font-medium text-xs text-center">Leads</p>
          </button>

          <button onClick={() => router.push('/CRM/leads/new')} className="bg-slate-800 border border-slate-700 rounded-xl p-3 hover:border-amber-500/50 transition-all group">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-white font-medium text-xs text-center">Add Lead</p>
          </button>

          <button onClick={() => router.push('/CRM/my-tasks')} className="bg-slate-800 border border-slate-700 rounded-xl p-3 hover:border-amber-500/50 transition-all group">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="text-white font-medium text-xs text-center">My Tasks</p>
          </button>

          <button onClick={() => router.push('/CRM/followups')} className="bg-slate-800 border border-slate-700 rounded-xl p-3 hover:border-amber-500/50 transition-all group relative">
            {stats.overdueFollowups > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">{stats.overdueFollowups}</span>
            )}
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-white font-medium text-xs text-center">Follow-ups</p>
          </button>

          <button onClick={() => router.push('/CRM/analytics')} className="bg-slate-800 border border-slate-700 rounded-xl p-3 hover:border-amber-500/50 transition-all group">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-white font-medium text-xs text-center">Analytics</p>
          </button>

          <button onClick={() => router.push('/CRM/campaigns')} className="bg-slate-800 border border-slate-700 rounded-xl p-3 hover:border-amber-500/50 transition-all group">
            <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-white font-medium text-xs text-center">Campaigns</p>
          </button>

          <button onClick={() => router.push('/CRM/whatsapp-templates')} className="bg-slate-800 border border-slate-700 rounded-xl p-3 hover:border-amber-500/50 transition-all group">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <p className="text-white font-medium text-xs text-center">Templates</p>
          </button>

          <button onClick={() => router.push('/CRM/leads/bulk-upload')} className="bg-slate-800 border border-slate-700 rounded-xl p-3 hover:border-amber-500/50 transition-all group">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p className="text-white font-medium text-xs text-center">Upload</p>
          </button>

          {/* Manager Actions */}
          {isManager && (
            <button onClick={() => router.push('/CRM/lead-assignment')} className="bg-slate-800 border border-slate-700 rounded-xl p-3 hover:border-amber-500/50 transition-all group">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <p className="text-white font-medium text-xs text-center">Assign</p>
            </button>
          )}

          {/* Admin Actions */}
          {isAdmin && (
            <button onClick={() => router.push('/CRM/employees')} className="bg-slate-800 border border-slate-700 rounded-xl p-3 hover:border-amber-500/50 transition-all group">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-white font-medium text-xs text-center">Team</p>
            </button>
          )}

          {/* Owner Only - Integrations */}
          {isOwner && (
            <button onClick={() => setShowIntegrationsModal(true)} className="bg-slate-800 border border-slate-700 rounded-xl p-3 hover:border-amber-500/50 transition-all group">
              <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
              </div>
              <p className="text-white font-medium text-xs text-center">Integrations</p>
            </button>
          )}
        </div>

        {/* Admin Quick Links */}
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => router.push('/CRM/activity')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Activity Log
            </button>
            <button onClick={() => router.push('/CRM/settings')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Leads */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Recent Leads</h3>
              <button onClick={() => router.push('/CRM/leads')} className="text-amber-400 hover:text-amber-300 text-sm">View All →</button>
            </div>
            <div className="divide-y divide-slate-700">
              {recentLeads.map((lead) => (
                <div key={lead.id} onClick={() => router.push(`/CRM/leads/${lead.id}`)} className="px-6 py-4 hover:bg-slate-700/50 cursor-pointer transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{lead.full_name}</p>
                      <p className="text-slate-400 text-sm">{lead.course || 'No course'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(lead.lead_status)}`}>{getStatusLabel(lead.lead_status)}</span>
                      <p className="text-slate-500 text-xs mt-1">{new Date(lead.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
              {recentLeads.length === 0 && <div className="px-6 py-8 text-center text-slate-500">No recent leads</div>}
            </div>
          </div>

          {/* Upcoming Follow-ups */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Upcoming Follow-ups</h3>
              <button onClick={() => router.push('/CRM/followups')} className="text-amber-400 hover:text-amber-300 text-sm">View All →</button>
            </div>
            <div className="divide-y divide-slate-700">
              {upcomingFollowups.map((lead) => (
                <div key={lead.id} className="px-6 py-4 hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{lead.full_name}</p>
                      <p className="text-slate-400 text-sm">{lead.country_code} {lead.mobile}</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className={`text-sm ${lead.next_followup_date === new Date().toISOString().split('T')[0] ? 'text-amber-400 font-medium' : 'text-slate-300'}`}>
                        {new Date(lead.next_followup_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); sendWhatsApp(lead) }} className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {upcomingFollowups.length === 0 && <div className="px-6 py-8 text-center text-slate-500">No upcoming follow-ups</div>}
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

      {/* Integrations Modal */}
      {showIntegrationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white">CRM Integrations</h2>
                <p className="text-slate-400 text-sm">Connect external platforms and services</p>
              </div>
              <button onClick={() => setShowIntegrationsModal(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="px-6 py-3 border-b border-slate-700 overflow-x-auto">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveIntegrationTab('social')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                    activeIntegrationTab === 'social'
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Social Media
                </button>
                <button
                  onClick={() => setActiveIntegrationTab('communication')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                    activeIntegrationTab === 'communication'
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Communication
                </button>
                <button
                  onClick={() => setActiveIntegrationTab('automation')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                    activeIntegrationTab === 'automation'
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Automation
                </button>
                <button
                  onClick={() => setActiveIntegrationTab('mcp')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                    activeIntegrationTab === 'mcp'
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  CRM MCP
                </button>
                <button
                  onClick={() => setActiveIntegrationTab('api')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                    activeIntegrationTab === 'api'
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Azure & BI
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Social Media Tab */}
              {activeIntegrationTab === 'social' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Social Media Lead Inflow</h3>

                  {/* Facebook */}
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">📘</span>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">Facebook</h4>
                          <p className="text-slate-400 text-xs">Connect Facebook Ads & Pages for lead capture</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        integrations.facebook.connected ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {integrations.facebook.connected ? 'Connected' : 'Not Connected'}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Access Token</label>
                        <input
                          type="password"
                          value={integrations.facebook.accessToken}
                          onChange={(e) => setIntegrations({...integrations, facebook: {...integrations.facebook, accessToken: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter Facebook access token"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Page ID</label>
                        <input
                          type="text"
                          value={integrations.facebook.pageId}
                          onChange={(e) => setIntegrations({...integrations, facebook: {...integrations.facebook, pageId: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter page ID"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
                        Sign in with Facebook
                      </button>
                      <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">
                        Save Credentials
                      </button>
                    </div>
                  </div>

                  {/* Instagram */}
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">📷</span>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">Instagram</h4>
                          <p className="text-slate-400 text-xs">Connect Instagram Business for lead generation</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        integrations.instagram.connected ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {integrations.instagram.connected ? 'Connected' : 'Not Connected'}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Access Token</label>
                        <input
                          type="password"
                          value={integrations.instagram.accessToken}
                          onChange={(e) => setIntegrations({...integrations, instagram: {...integrations.instagram, accessToken: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter Instagram access token"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Business Account ID</label>
                        <input
                          type="text"
                          value={integrations.instagram.businessAccountId}
                          onChange={(e) => setIntegrations({...integrations, instagram: {...integrations.instagram, businessAccountId: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter business account ID"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm rounded-lg">
                        Sign in with Instagram
                      </button>
                      <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">
                        Save Credentials
                      </button>
                    </div>
                  </div>

                  {/* X (Twitter) */}
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-600/20 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">𝕏</span>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">X (Twitter)</h4>
                          <p className="text-slate-400 text-xs">Connect X for lead capture and engagement</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        integrations.twitter.connected ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {integrations.twitter.connected ? 'Connected' : 'Not Connected'}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">API Key</label>
                        <input
                          type="password"
                          value={integrations.twitter.apiKey}
                          onChange={(e) => setIntegrations({...integrations, twitter: {...integrations.twitter, apiKey: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter API key"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">API Secret</label>
                        <input
                          type="password"
                          value={integrations.twitter.apiSecret}
                          onChange={(e) => setIntegrations({...integrations, twitter: {...integrations.twitter, apiSecret: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter API secret"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Access Token</label>
                        <input
                          type="password"
                          value={integrations.twitter.accessToken}
                          onChange={(e) => setIntegrations({...integrations, twitter: {...integrations.twitter, accessToken: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter access token"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Access Token Secret</label>
                        <input
                          type="password"
                          value={integrations.twitter.accessSecret}
                          onChange={(e) => setIntegrations({...integrations, twitter: {...integrations.twitter, accessSecret: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter access token secret"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg">
                        Sign in with X
                      </button>
                      <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">
                        Save Credentials
                      </button>
                    </div>
                  </div>

                  {/* LinkedIn */}
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">💼</span>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">LinkedIn</h4>
                          <p className="text-slate-400 text-xs">Connect LinkedIn for B2B lead generation</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        integrations.linkedin.connected ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {integrations.linkedin.connected ? 'Connected' : 'Not Connected'}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Client ID</label>
                        <input
                          type="text"
                          value={integrations.linkedin.clientId}
                          onChange={(e) => setIntegrations({...integrations, linkedin: {...integrations.linkedin, clientId: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter client ID"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Client Secret</label>
                        <input
                          type="password"
                          value={integrations.linkedin.clientSecret}
                          onChange={(e) => setIntegrations({...integrations, linkedin: {...integrations.linkedin, clientSecret: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter client secret"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm rounded-lg">
                        Sign in with LinkedIn
                      </button>
                      <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">
                        Save Credentials
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Communication Tab */}
              {activeIntegrationTab === 'communication' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Communication Integration</h3>

                  {/* Exotel */}
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">📞</span>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">Exotel</h4>
                          <p className="text-slate-400 text-xs">Connect Exotel for call recordings & analytics</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        integrations.exotel.connected ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {integrations.exotel.connected ? 'Connected' : 'Not Connected'}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">API Key</label>
                        <input
                          type="password"
                          value={integrations.exotel.apiKey}
                          onChange={(e) => setIntegrations({...integrations, exotel: {...integrations.exotel, apiKey: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter API key"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">API Token</label>
                        <input
                          type="password"
                          value={integrations.exotel.apiToken}
                          onChange={(e) => setIntegrations({...integrations, exotel: {...integrations.exotel, apiToken: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter API token"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">SID</label>
                        <input
                          type="text"
                          value={integrations.exotel.sid}
                          onChange={(e) => setIntegrations({...integrations, exotel: {...integrations.exotel, sid: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter SID"
                        />
                      </div>
                    </div>
                    <button className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg">
                      Connect Exotel
                    </button>
                  </div>

                  {/* Twilio */}
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">☎️</span>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">Twilio</h4>
                          <p className="text-slate-400 text-xs">Connect Twilio for call recordings & SMS</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        integrations.twilio.connected ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {integrations.twilio.connected ? 'Connected' : 'Not Connected'}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Account SID</label>
                        <input
                          type="text"
                          value={integrations.twilio.accountSid}
                          onChange={(e) => setIntegrations({...integrations, twilio: {...integrations.twilio, accountSid: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter account SID"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Auth Token</label>
                        <input
                          type="password"
                          value={integrations.twilio.authToken}
                          onChange={(e) => setIntegrations({...integrations, twilio: {...integrations.twilio, authToken: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter auth token"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={integrations.twilio.phoneNumber}
                          onChange={(e) => setIntegrations({...integrations, twilio: {...integrations.twilio, phoneNumber: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="+1234567890"
                        />
                      </div>
                    </div>
                    <button className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg">
                      Connect Twilio
                    </button>
                  </div>

                  {/* AiSensy */}
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">💬</span>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">AiSensy</h4>
                          <p className="text-slate-400 text-xs">WhatsApp Business API for automated messaging</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        integrations.aisensy.connected ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {integrations.aisensy.connected ? 'Connected' : 'Not Connected'}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">API Key</label>
                        <input
                          type="password"
                          value={integrations.aisensy.apiKey}
                          onChange={(e) => setIntegrations({...integrations, aisensy: {...integrations.aisensy, apiKey: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter API key"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Instance ID</label>
                        <input
                          type="text"
                          value={integrations.aisensy.instanceId}
                          onChange={(e) => setIntegrations({...integrations, aisensy: {...integrations.aisensy, instanceId: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter instance ID"
                        />
                      </div>
                    </div>
                    <button className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg">
                      Connect AiSensy
                    </button>
                  </div>

                  {/* Slack */}
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">#️⃣</span>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">Slack</h4>
                          <p className="text-slate-400 text-xs">Get real-time CRM notifications in Slack</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        integrations.slack.connected ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {integrations.slack.connected ? 'Connected' : 'Not Connected'}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Bot Token</label>
                        <input
                          type="password"
                          value={integrations.slack.botToken}
                          onChange={(e) => setIntegrations({...integrations, slack: {...integrations.slack, botToken: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="xoxb-..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Webhook URL</label>
                        <input
                          type="text"
                          value={integrations.slack.webhookUrl}
                          onChange={(e) => setIntegrations({...integrations, slack: {...integrations.slack, webhookUrl: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="https://hooks.slack.com/..."
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg">
                        Sign in with Slack
                      </button>
                      <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">
                        Save Credentials
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Automation Tab */}
              {activeIntegrationTab === 'automation' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">External Automation Integrations</h3>

                  {/* n8n */}
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">🔗</span>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">n8n</h4>
                          <p className="text-slate-400 text-xs">Workflow automation with n8n</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        integrations.n8n.connected ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {integrations.n8n.connected ? 'Connected' : 'Not Connected'}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Webhook URL</label>
                        <input
                          type="text"
                          value={integrations.n8n.webhookUrl}
                          onChange={(e) => setIntegrations({...integrations, n8n: {...integrations.n8n, webhookUrl: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="https://your-n8n-instance.com/webhook/..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">API Key (Optional)</label>
                        <input
                          type="password"
                          value={integrations.n8n.apiKey}
                          onChange={(e) => setIntegrations({...integrations, n8n: {...integrations.n8n, apiKey: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter API key"
                        />
                      </div>
                    </div>
                    <button className="mt-3 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm rounded-lg">
                      Connect n8n
                    </button>
                  </div>

                  {/* Make.com */}
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">⚡</span>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">Make.com</h4>
                          <p className="text-slate-400 text-xs">Visual workflow automation with Make</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        integrations.make.connected ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {integrations.make.connected ? 'Connected' : 'Not Connected'}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Webhook URL</label>
                        <input
                          type="text"
                          value={integrations.make.webhookUrl}
                          onChange={(e) => setIntegrations({...integrations, make: {...integrations.make, webhookUrl: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="https://hook.integromat.com/..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">API Key (Optional)</label>
                        <input
                          type="password"
                          value={integrations.make.apiKey}
                          onChange={(e) => setIntegrations({...integrations, make: {...integrations.make, apiKey: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter API key"
                        />
                      </div>
                    </div>
                    <button className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg">
                      Connect Make.com
                    </button>
                  </div>

                  {/* Zapier */}
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">⚙️</span>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">Zapier</h4>
                          <p className="text-slate-400 text-xs">Connect with 5000+ apps via Zapier</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        integrations.zapier.connected ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {integrations.zapier.connected ? 'Connected' : 'Not Connected'}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Webhook URL</label>
                        <input
                          type="text"
                          value={integrations.zapier.webhookUrl}
                          onChange={(e) => setIntegrations({...integrations, zapier: {...integrations.zapier, webhookUrl: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="https://hooks.zapier.com/..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">API Key (Optional)</label>
                        <input
                          type="password"
                          value={integrations.zapier.apiKey}
                          onChange={(e) => setIntegrations({...integrations, zapier: {...integrations.zapier, apiKey: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter API key"
                        />
                      </div>
                    </div>
                    <button className="mt-3 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg">
                      Connect Zapier
                    </button>
                  </div>
                </div>
              )}

              {/* MCP Tab */}
              {activeIntegrationTab === 'mcp' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">CRM MCP Connector for Claude</h3>

                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">🤖</span>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">CRM MCP Server</h4>
                          <p className="text-slate-400 text-xs">Model Context Protocol connector for Claude AI integration</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        integrations.mcpConnector.connected ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {integrations.mcpConnector.connected ? 'Connected' : 'Not Connected'}
                      </div>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
                      <p className="text-amber-200 text-sm">
                        <span className="font-semibold">About MCP:</span> Model Context Protocol allows Claude to directly access your CRM data, search leads, update records, and run analytics through natural language.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">MCP Server URL</label>
                        <input
                          type="text"
                          value={integrations.mcpConnector.serverUrl}
                          onChange={(e) => setIntegrations({...integrations, mcpConnector: {...integrations.mcpConnector, serverUrl: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="http://localhost:3000/mcp"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">API Key</label>
                        <input
                          type="password"
                          value={integrations.mcpConnector.apiKey}
                          onChange={(e) => setIntegrations({...integrations, mcpConnector: {...integrations.mcpConnector, apiKey: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter API key for MCP server"
                        />
                      </div>
                    </div>
                    <div className="mt-4 bg-slate-800 rounded-lg p-3">
                      <h5 className="text-white text-sm font-medium mb-2">Available MCP Tools:</h5>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-300">
                          <span className="text-green-400">✓</span> search_leads
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <span className="text-green-400">✓</span> get_lead_details
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <span className="text-green-400">✓</span> update_lead
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <span className="text-green-400">✓</span> add_interaction
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <span className="text-green-400">✓</span> get_analytics
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <span className="text-green-400">✓</span> bulk_operations
                        </div>
                      </div>
                    </div>
                    <button className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg">
                      Connect MCP Server
                    </button>
                  </div>
                </div>
              )}

              {/* Azure & BI Tab */}
              {activeIntegrationTab === 'api' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Azure & Business Intelligence API</h3>

                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">☁️</span>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">Azure Data Integration</h4>
                          <p className="text-slate-400 text-xs">Connect to Azure Data Factory, Data Lake & Power BI</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        integrations.azureApi.connected ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {integrations.azureApi.connected ? 'Connected' : 'Not Connected'}
                      </div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
                      <p className="text-blue-200 text-sm">
                        <span className="font-semibold">Integration Features:</span> Export CRM data to Azure Data Lake, trigger Data Factory pipelines, sync with Power BI dashboards, and enable advanced analytics.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Client ID</label>
                        <input
                          type="text"
                          value={integrations.azureApi.clientId}
                          onChange={(e) => setIntegrations({...integrations, azureApi: {...integrations.azureApi, clientId: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Azure AD Client ID"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Client Secret</label>
                        <input
                          type="password"
                          value={integrations.azureApi.clientSecret}
                          onChange={(e) => setIntegrations({...integrations, azureApi: {...integrations.azureApi, clientSecret: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Enter client secret"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Tenant ID</label>
                        <input
                          type="text"
                          value={integrations.azureApi.tenantId}
                          onChange={(e) => setIntegrations({...integrations, azureApi: {...integrations.azureApi, tenantId: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Azure AD Tenant ID"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Subscription ID</label>
                        <input
                          type="text"
                          value={integrations.azureApi.subscriptionId}
                          onChange={(e) => setIntegrations({...integrations, azureApi: {...integrations.azureApi, subscriptionId: e.target.value}})}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                          placeholder="Azure Subscription ID"
                        />
                      </div>
                    </div>
                    <div className="mt-4 bg-slate-800 rounded-lg p-3">
                      <h5 className="text-white text-sm font-medium mb-2">Supported Services:</h5>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-300">
                          <span className="text-blue-400">📊</span> Power BI Dashboards
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <span className="text-blue-400">🏭</span> Data Factory
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <span className="text-blue-400">💾</span> Data Lake Storage
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <span className="text-blue-400">🔍</span> Synapse Analytics
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 bg-slate-800 rounded-lg p-3">
                      <h5 className="text-white text-sm font-medium mb-2">API Endpoints (JSON):</h5>
                      <div className="bg-slate-900 rounded p-2 text-xs text-slate-300 font-mono overflow-x-auto">
                        <pre>{JSON.stringify({
                          "export_leads": "/api/export/leads",
                          "sync_analytics": "/api/sync/analytics",
                          "trigger_pipeline": "/api/trigger/pipeline",
                          "webhook_url": "https://your-crm.com/api/azure/webhook"
                        }, null, 2)}</pre>
                      </div>
                    </div>
                    <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
                      Connect Azure Services
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowIntegrationsModal(false)}
                className="px-4 py-2.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
