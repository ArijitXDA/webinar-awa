'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Lead {
  id: string
  lead_id: number
  full_name: string
  mobile: string
  lead_status: string
  lead_score: number
  assigned_to: string
  assigned_to_name?: string
  created_at: string
}

interface Employee {
  id: string
  emp_id: string
  full_name: string
  job_role: string
  is_active: boolean
  lead_count?: number
}

const LEAD_STATUSES: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-500/20 text-blue-400' },
  contacted: { label: 'Contacted', color: 'bg-cyan-500/20 text-cyan-400' },
  follow_up_again: { label: 'Follow-up', color: 'bg-amber-500/20 text-amber-400' },
  need_something: { label: 'Need Something', color: 'bg-purple-500/20 text-purple-400' },
  converted: { label: 'Converted', color: 'bg-green-500/20 text-green-400' },
  not_interested: { label: 'Not Interested', color: 'bg-red-500/20 text-red-400' }
}

export default function LeadAssignmentPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [targetEmployee, setTargetEmployee] = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterUnassigned, setFilterUnassigned] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    checkSessionAndLoad()
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadLeads()
    }
  }, [filterEmployee, filterStatus, filterUnassigned, currentUser])

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

      // Check admin access
      const isAdmin = ['owner', 'ea_to_owner', 'director', 'ea_to_director', 'pm_ai_spot', 'pm_b2c_btl', 'pm_stage_2', 'pm_stage_3'].includes(session.employee.job_role)
      if (!isAdmin) {
        router.push('/CRM/dashboard')
        return
      }

      setCurrentUser(session.employee)
      await loadEmployees()

    } catch (err) {
      console.error('Session check error:', err)
      router.push('/CRM')
    } finally {
      setLoading(false)
    }
  }

  async function loadEmployees() {
    try {
      const { data: emps } = await supabase
        .from('crm_employees')
        .select('id, emp_id, full_name, job_role, is_active')
        .eq('is_active', true)
        .order('full_name')

      // Get lead counts
      const { data: leads } = await supabase
        .from('crm_leads')
        .select('assigned_to')

      const countMap: Record<string, number> = {}
      leads?.forEach(l => {
        if (l.assigned_to) {
          countMap[l.assigned_to] = (countMap[l.assigned_to] || 0) + 1
        }
      })

      const empsWithCounts = emps?.map(e => ({
        ...e,
        lead_count: countMap[e.id] || 0
      })) || []

      setEmployees(empsWithCounts)
    } catch (err) {
      console.error('Error loading employees:', err)
    }
  }

  async function loadLeads() {
    try {
      let query = supabase
        .from('crm_leads')
        .select('id, lead_id, full_name, mobile, lead_status, lead_score, assigned_to, created_at')
        .order('created_at', { ascending: false })
        .limit(500)

      if (filterEmployee) {
        query = query.eq('assigned_to', filterEmployee)
      }

      if (filterStatus) {
        query = query.eq('lead_status', filterStatus)
      }

      if (filterUnassigned) {
        query = query.is('assigned_to', null)
      }

      const { data, error } = await query

      if (error) throw error

      // Map employee names
      const { data: emps } = await supabase.from('crm_employees').select('id, full_name')
      const empMap = Object.fromEntries(emps?.map(e => [e.id, e.full_name]) || [])

      const leadsWithNames = data?.map(lead => ({
        ...lead,
        assigned_to_name: empMap[lead.assigned_to] || 'Unassigned'
      })) || []

      setLeads(leadsWithNames)
      setSelectedLeads(new Set())

    } catch (err) {
      console.error('Error loading leads:', err)
    }
  }

  function toggleSelectAll() {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)))
    }
  }

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedLeads(newSelected)
  }

  async function assignLeads() {
    if (!targetEmployee || selectedLeads.size === 0) return

    setAssigning(true)
    try {
      const leadIds = Array.from(selectedLeads)

      // Get current assignments for audit
      const { data: currentLeads } = await supabase
        .from('crm_leads')
        .select('id, assigned_to')
        .in('id', leadIds)

      // Update leads
      const { error: updateError } = await supabase
        .from('crm_leads')
        .update({ assigned_to: targetEmployee })
        .in('id', leadIds)

      if (updateError) throw updateError

      // Create assignment records
      const assignments = currentLeads?.map(lead => ({
        lead_id: lead.id,
        assigned_from: lead.assigned_to,
        assigned_to: targetEmployee,
        assigned_by: currentUser.id,
        assignment_reason: 'Bulk reassignment'
      })) || []

      await supabase.from('crm_lead_assignments').insert(assignments)

      // Audit log
      await supabase.from('crm_audit_log').insert({
        employee_id: currentUser.id,
        emp_id: currentUser.emp_id,
        action: 'assignment',
        entity_type: 'lead',
        entity_id: leadIds.join(','),
        description: `Bulk assigned ${leadIds.length} leads to ${employees.find(e => e.id === targetEmployee)?.full_name}`
      })

      setSuccess(`Successfully assigned ${leadIds.length} leads!`)
      setSelectedLeads(new Set())
      setTargetEmployee('')
      await loadLeads()
      await loadEmployees()
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      console.error('Assignment error:', err)
    } finally {
      setAssigning(false)
    }
  }

  const filteredLeads = search
    ? leads.filter(l =>
        l.full_name.toLowerCase().includes(search.toLowerCase()) ||
        l.mobile.includes(search)
      )
    : leads

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
                <h1 className="text-white font-bold text-lg">Lead Assignment</h1>
                <p className="text-slate-400 text-xs">Bulk assign or reassign leads</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {success && (
          <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl">{success}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Employee Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 sticky top-24">
              <h3 className="text-white font-semibold mb-4">Team Workload</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {employees.map(emp => (
                  <div
                    key={emp.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      filterEmployee === emp.id
                        ? 'bg-amber-500/20 border border-amber-500'
                        : 'bg-slate-900 hover:bg-slate-700 border border-transparent'
                    }`}
                    onClick={() => setFilterEmployee(filterEmployee === emp.id ? '' : emp.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{emp.full_name}</p>
                        <p className="text-slate-500 text-xs capitalize">{emp.job_role.replace(/_/g, ' ')}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (emp.lead_count ?? 0) > 50 ? 'bg-red-500/20 text-red-400' :
(emp.lead_count ?? 0) > 20 ? 'bg-amber-500/20 text-amber-400' :
'bg-green-500/20 text-green-400'
                      }`}>
                        {emp.lead_count ?? 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-700">
                <button
                  onClick={() => setFilterUnassigned(!filterUnassigned)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    filterUnassigned
                      ? 'bg-purple-500/20 border border-purple-500'
                      : 'bg-slate-900 hover:bg-slate-700 border border-transparent'
                  }`}
                >
                  <p className="text-white text-sm font-medium">Unassigned Leads</p>
                  <p className="text-slate-500 text-xs">Show leads without assignee</p>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Filters & Actions */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search leads..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value="">All Statuses</option>
                  {Object.entries(LEAD_STATUSES).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>

                {/* Clear Filters */}
                {(filterEmployee || filterStatus || filterUnassigned) && (
                  <button
                    onClick={() => {
                      setFilterEmployee('')
                      setFilterStatus('')
                      setFilterUnassigned(false)
                    }}
                    className="px-3 py-2 text-amber-400 hover:text-amber-300 text-sm"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Bulk Assignment */}
              {selectedLeads.size > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-4">
                  <span className="text-amber-400 font-medium">{selectedLeads.size} selected</span>
                  <select
                    value={targetEmployee}
                    onChange={(e) => setTargetEmployee(e.target.value)}
                    className="flex-1 max-w-xs px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                  >
                    <option value="">Assign to...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.lead_count} leads)
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={assignLeads}
                    disabled={!targetEmployee || assigning}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      !targetEmployee || assigning
                        ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-600 text-slate-900'
                    }`}
                  >
                    {assigning ? 'Assigning...' : 'Assign'}
                  </button>
                  <button
                    onClick={() => setSelectedLeads(new Set())}
                    className="px-3 py-2 text-slate-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Leads Table */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-amber-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Lead</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Mobile</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Score</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Assigned To</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredLeads.map(lead => (
                      <tr key={lead.id} className={`hover:bg-slate-700/50 ${selectedLeads.has(lead.id) ? 'bg-amber-500/10' : ''}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedLeads.has(lead.id)}
                            onChange={() => toggleSelect(lead.id)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-amber-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white font-medium">{lead.full_name}</p>
                          <p className="text-slate-500 text-xs">#{lead.lead_id}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{lead.mobile}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-sm ${
                            lead.lead_score >= 4 ? 'text-green-400' :
                            lead.lead_score >= 3 ? 'text-amber-400' :
                            'text-red-400'
                          }`}>
                            {'★'.repeat(lead.lead_score)}{'☆'.repeat(5 - lead.lead_score)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${LEAD_STATUSES[lead.lead_status]?.color || 'bg-slate-500/20 text-slate-400'}`}>
                            {LEAD_STATUSES[lead.lead_status]?.label || lead.lead_status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={lead.assigned_to ? 'text-slate-300' : 'text-red-400'}>
                            {lead.assigned_to_name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-sm">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredLeads.length === 0 && (
                  <div className="p-12 text-center text-slate-500">
                    No leads found
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-slate-700 text-slate-400 text-sm">
                Showing {filteredLeads.length} leads
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
