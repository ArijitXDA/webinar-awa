'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Job role display names
const JOB_ROLE_DISPLAY: Record<string, string> = {
  'owner': 'Owner',
  'ea_to_owner': 'Executive Assistant to Owner',
  'director': 'Director',
  'ea_to_secretary': 'Executive Assistant to Director',
  'pm_ai_spot': 'Project Manager - AI Spot',
  'pm_b2c_btl': 'Project Manager - B2C BTL',
  'pm_stage_2': 'Project Manager - Stage 2',
  'pm_stage_3': 'Project Manager - Stage 3',
  'rm_stage_4': 'Relationship Manager - Stage 4',
  'front_executive': 'Front Executive'
}

export default function CRMDashboardPage() {
  const router = useRouter()
  const [employee, setEmployee] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalLeads: 0,
    newLeads: 0,
    followUpsToday: 0,
    conversions: 0,
    conversionRate: 0
  })

  useEffect(() => {
    checkSessionAndLoadData()
  }, [])

  async function checkSessionAndLoadData() {
    try {
      const sessionData = localStorage.getItem('crm_session')

      if (!sessionData) {
        router.push('/CRM')
        return
      }

      const session = JSON.parse(sessionData)

      // Verify session is valid
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

      // Check if must change password
      if (session.employee.must_change_password) {
        router.push('/CRM/change-password')
        return
      }

      setEmployee(session.employee)

      // Update last activity
      await supabase
        .from('crm_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', dbSession.id)

      // Load dashboard stats
      await loadStats(session.employee.id)

    } catch (err) {
      console.error('Session check error:', err)
      router.push('/CRM')
    } finally {
      setLoading(false)
    }
  }

  async function loadStats(employeeId: string) {
    try {
      // Get leads count for this employee and downline
      const { data: leads, error } = await supabase
        .from('crm_leads')
        .select('*')

      if (leads && !error) {
        const today = new Date().toISOString().split('T')[0]
        
        setStats({
          totalLeads: leads.length,
          newLeads: leads.filter(l => l.lead_status === 'new').length,
          followUpsToday: leads.filter(l => l.next_followup_date === today).length,
          conversions: leads.filter(l => l.is_converted).length,
          conversionRate: leads.length > 0 
            ? Math.round((leads.filter(l => l.is_converted).length / leads.length) * 100) 
            : 0
        })
      }
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  async function handleLogout() {
    try {
      const sessionData = localStorage.getItem('crm_session')
      if (sessionData) {
        const session = JSON.parse(sessionData)
        
        // Invalidate session in DB
        await supabase
          .from('crm_sessions')
          .update({ is_valid: false })
          .eq('session_token', session.token)

        // Log logout
        await supabase.from('crm_audit_log').insert({
          employee_id: session.employee.id,
          emp_id: session.employee.emp_id,
          action: 'logout',
          entity_type: 'session',
          description: 'User logged out'
        })
      }
      
      localStorage.removeItem('crm_session')
      router.push('/CRM')
    } catch (err) {
      console.error('Logout error:', err)
      localStorage.removeItem('crm_session')
      router.push('/CRM')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top Navigation */}
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
                <span className="text-slate-900 text-xl font-black">o</span>
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">
                  <span className="text-amber-400">o</span>CRM
                </h1>
                <p className="text-slate-500 text-xs">Dashboard</p>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-white text-sm font-medium">{employee?.full_name}</p>
                <p className="text-slate-400 text-xs">{JOB_ROLE_DISPLAY[employee?.job_role] || employee?.job_role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome back, {employee?.full_name?.split(' ')[0]}! 👋
          </h2>
          <p className="text-slate-300">
            Here&apos;s your CRM overview for today. Let&apos;s make it productive!
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Total Leads */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm">Total Leads</span>
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalLeads}</p>
          </div>

          {/* New Leads */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm">New Leads</span>
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{stats.newLeads}</p>
          </div>

          {/* Follow-ups Today */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm">Follow-ups Today</span>
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{stats.followUpsToday}</p>
          </div>

          {/* Conversions */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm">Conversions</span>
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{stats.conversions}</p>
          </div>

          {/* Conversion Rate */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm">Conversion Rate</span>
              <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{stats.conversionRate}%</p>
          </div>
        </div>

        {/* Quick Actions */}
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Add Lead */}
          <button
            onClick={() => router.push('/CRM/leads/new')}
            className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:bg-slate-700 hover:border-amber-500/50 transition-all text-left group"
          >
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h4 className="text-white font-medium mb-1">Add New Lead</h4>
            <p className="text-slate-400 text-sm">Create a new lead entry</p>
          </button>

          {/* View Leads */}
          <button
            onClick={() => router.push('/CRM/leads')}
            className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:bg-slate-700 hover:border-blue-500/50 transition-all text-left group"
          >
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <h4 className="text-white font-medium mb-1">View All Leads</h4>
            <p className="text-slate-400 text-sm">Manage your lead pipeline</p>
          </button>

          {/* Templates */}
          <button
            onClick={() => router.push('/CRM/templates')}
            className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:bg-slate-700 hover:border-green-500/50 transition-all text-left group"
          >
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h4 className="text-white font-medium mb-1">WhatsApp Templates</h4>
            <p className="text-slate-400 text-sm">Manage message templates</p>
          </button>

          {/* Reports */}
          <button
            onClick={() => router.push('/CRM/reports')}
            className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:bg-slate-700 hover:border-purple-500/50 transition-all text-left group"
          >
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4 className="text-white font-medium mb-1">Reports & Analytics</h4>
            <p className="text-slate-400 text-sm">View performance insights</p>
          </button>
        </div>

        {/* Admin Section (Only for Owner/EA/Director) */}
        {['owner', 'ea_to_owner', 'director', 'ea_to_secretary'].includes(employee?.job_role) && (
          <>
            <h3 className="text-lg font-semibold text-white mb-4">Administration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Employees */}
              <button
                onClick={() => router.push('/CRM/employees')}
                className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:bg-slate-700 hover:border-red-500/50 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h4 className="text-white font-medium mb-1">Manage Employees</h4>
                <p className="text-slate-400 text-sm">Add, edit, manage team members</p>
              </button>

              {/* Bulk Upload */}
              <button
                onClick={() => router.push('/CRM/leads/bulk-upload')}
                className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:bg-slate-700 hover:border-orange-500/50 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <h4 className="text-white font-medium mb-1">Bulk Lead Upload</h4>
                <p className="text-slate-400 text-sm">Import leads from CSV</p>
              </button>

              {/* Audit Log */}
              <button
                onClick={() => router.push('/CRM/audit-log')}
                className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:bg-slate-700 hover:border-cyan-500/50 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h4 className="text-white font-medium mb-1">Audit Log</h4>
                <p className="text-slate-400 text-sm">View all system activities</p>
              </button>
            </div>
          </>
        )}

        {/* Coming Soon Notice */}
        <div className="mt-8 bg-slate-800/50 border border-dashed border-slate-600 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">
            🚧 More features coming soon! This is Phase 1 of oCRM.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-slate-600 text-xs">
            oCRM v1.0 • © 2025 AIwithArijit.com • All actions are logged
          </p>
        </div>
      </footer>
    </div>
  )
}
