'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  totalLeads: number
  newLeads: number
  followupsToday: number
  conversions: number
  conversionRate: number
  totalEmployees: number
  activeEmployees: number
  todayInteractions: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    newLeads: 0,
    followupsToday: 0,
    conversions: 0,
    conversionRate: 0,
    totalEmployees: 0,
    activeEmployees: 0,
    todayInteractions: 0
  })
  const [recentLeads, setRecentLeads] = useState<any[]>([])
  const [upcomingFollowups, setUpcomingFollowups] = useState<any[]>([])

  const isAdmin = currentUser && ['owner', 'ea_to_owner', 'director', 'ea_to_director'].includes(currentUser.job_role)

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

      // Update last activity
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

    // Load leads stats
    const { data: leads } = await supabase.from('crm_leads').select('id, lead_status, is_converted, next_followup_date')

    // Load employees stats
    const { data: employees } = await supabase.from('crm_employees').select('id, is_active')

    // Load today's interactions
    const { data: interactions } = await supabase
      .from('crm_lead_interactions')
      .select('id')
      .gte('created_at', today)

    // Load recent leads
    const { data: recent } = await supabase
      .from('crm_leads')
      .select('id, full_name, lead_status, created_at, course')
      .order('created_at', { ascending: false })
      .limit(5)

    // Load upcoming followups
    const { data: followups } = await supabase
      .from('crm_leads')
      .select('id, full_name, next_followup_date, lead_status, mobile, country_code')
      .gte('next_followup_date', today)
      .order('next_followup_date', { ascending: true })
      .limit(5)

    if (leads) {
      const totalLeads = leads.length
      const newLeads = leads.filter(l => l.lead_status === 'new').length
      const followupsToday = leads.filter(l => l.next_followup_date === today).length
      const conversions = leads.filter(l => l.is_converted).length

      setStats({
        totalLeads,
        newLeads,
        followupsToday,
        conversions,
        conversionRate: totalLeads > 0 ? Math.round((conversions / totalLeads) * 100) : 0,
        totalEmployees: employees?.length || 0,
        activeEmployees: employees?.filter(e => e.is_active).length || 0,
        todayInteractions: interactions?.length || 0
      })
    }

    setRecentLeads(recent || [])
    setUpcomingFollowups(followups || [])
  }

  async function handleLogout() {
    try {
      const sessionData = localStorage.getItem('crm_session')
      if (sessionData) {
        const session = JSON.parse(sessionData)
        await supabase
          .from('crm_sessions')
          .update({ is_valid: false })
          .eq('session_token', session.token)
      }
      localStorage.removeItem('crm_session')
      router.push('/CRM')
    } catch (err) {
      console.error('Logout error:', err)
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
      new: 'New',
      contacted: 'Contacted',
      follow_up_again: 'Follow-up',
      need_something: 'Need Something',
      converted: 'Converted',
      not_interested: 'Not Interested'
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
              <div className="text-right hidden sm:block">
                <p className="text-white font-medium text-sm">{currentUser?.full_name}</p>
                <p className="text-slate-400 text-xs capitalize">{currentUser?.job_role?.replace(/_/g, ' ')}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
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

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
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

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Follow-ups Today</p>
                <p className="text-2xl font-bold text-amber-400">{stats.followupsToday}</p>
              </div>
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <button
            onClick={() => router.push('/CRM/leads')}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-amber-500/50 hover:bg-slate-800/80 transition-all group"
          >
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-white font-medium text-sm text-center">Leads</p>
          </button>

          <button
            onClick={() => router.push('/CRM/leads/new')}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-amber-500/50 hover:bg-slate-800/80 transition-all group"
          >
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-white font-medium text-sm text-center">Add Lead</p>
          </button>

          <button
            onClick={() => router.push('/CRM/analytics')}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-amber-500/50 hover:bg-slate-800/80 transition-all group"
          >
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-white font-medium text-sm text-center">Analytics</p>
          </button>

          <button
            onClick={() => router.push('/CRM/whatsapp-templates')}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-amber-500/50 hover:bg-slate-800/80 transition-all group"
          >
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <p className="text-white font-medium text-sm text-center">Templates</p>
          </button>

          {isAdmin && (
            <button
              onClick={() => router.push('/CRM/employees')}
              className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-amber-500/50 hover:bg-slate-800/80 transition-all group"
            >
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-white font-medium text-sm text-center">Employees</p>
            </button>
          )}

          <button
            onClick={() => router.push('/CRM/leads/bulk-upload')}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-amber-500/50 hover:bg-slate-800/80 transition-all group"
          >
            <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p className="text-white font-medium text-sm text-center">Bulk Upload</p>
          </button>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Leads */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Recent Leads</h3>
              <button
                onClick={() => router.push('/CRM/leads')}
                className="text-amber-400 hover:text-amber-300 text-sm"
              >
                View All →
              </button>
            </div>
            <div className="divide-y divide-slate-700">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => router.push(`/CRM/leads/${lead.id}`)}
                  className="px-6 py-4 hover:bg-slate-700/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{lead.full_name}</p>
                      <p className="text-slate-400 text-sm">{lead.course || 'No course'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(lead.lead_status)}`}>
                        {getStatusLabel(lead.lead_status)}
                      </span>
                      <p className="text-slate-500 text-xs mt-1">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {recentLeads.length === 0 && (
                <div className="px-6 py-8 text-center text-slate-500">No recent leads</div>
              )}
            </div>
          </div>

          {/* Upcoming Follow-ups */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Upcoming Follow-ups</h3>
              <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full text-xs font-medium">
                {stats.followupsToday} today
              </span>
            </div>
            <div className="divide-y divide-slate-700">
              {upcomingFollowups.map((lead) => (
                <div
                  key={lead.id}
                  className="px-6 py-4 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{lead.full_name}</p>
                      <p className="text-slate-400 text-sm">{lead.country_code} {lead.mobile}</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className={`text-sm ${
                        lead.next_followup_date === new Date().toISOString().split('T')[0]
                          ? 'text-amber-400 font-medium'
                          : 'text-slate-300'
                      }`}>
                        {new Date(lead.next_followup_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const phone = lead.country_code.replace('+', '') + lead.mobile
                          window.open(`https://wa.me/${phone}`, '_blank')
                        }}
                        className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {upcomingFollowups.length === 0 && (
                <div className="px-6 py-8 text-center text-slate-500">No upcoming follow-ups</div>
              )}
            </div>
          </div>
        </div>

        {/* Admin Stats */}
        {isAdmin && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-400 text-sm">Total Employees</p>
              <p className="text-2xl font-bold text-white">{stats.totalEmployees}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-400 text-sm">Active Employees</p>
              <p className="text-2xl font-bold text-green-400">{stats.activeEmployees}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-400 text-sm">Today's Interactions</p>
              <p className="text-2xl font-bold text-purple-400">{stats.todayInteractions}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-400 text-sm">Conversion Rate</p>
              <p className="text-2xl font-bold text-amber-400">{stats.conversionRate}%</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
