'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface AuditLog {
  id: string
  employee_id: string
  emp_id: string
  action: string
  entity_type: string
  entity_id: string
  description: string
  created_at: string
  employee_name?: string
}

const ACTION_TYPES = [
  { value: 'create', label: 'Created', icon: '➕', color: 'bg-green-500/20 text-green-400' },
  { value: 'update', label: 'Updated', icon: '✏️', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'delete', label: 'Deleted', icon: '🗑️', color: 'bg-red-500/20 text-red-400' },
  { value: 'interaction', label: 'Interaction', icon: '💬', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'bulk_upload', label: 'Bulk Upload', icon: '📤', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'login', label: 'Login', icon: '🔑', color: 'bg-cyan-500/20 text-cyan-400' },
  { value: 'logout', label: 'Logout', icon: '🚪', color: 'bg-slate-500/20 text-slate-400' },
  { value: 'password_reset', label: 'Password Reset', icon: '🔒', color: 'bg-orange-500/20 text-orange-400' },
  { value: 'assignment', label: 'Assignment', icon: '👤', color: 'bg-indigo-500/20 text-indigo-400' }
]

const ENTITY_TYPES = [
  { value: 'lead', label: 'Lead' },
  { value: 'employee', label: 'Employee' },
  { value: 'template', label: 'Template' },
  { value: 'session', label: 'Session' }
]

export default function ActivityTimelinePage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const ITEMS_PER_PAGE = 50

  // Filters
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  useEffect(() => {
    checkSessionAndLoad()
  }, [])

  useEffect(() => {
    if (currentUser) {
      setPage(0)
      setLogs([])
      loadLogs(0, true)
    }
  }, [filterAction, filterEntity, filterEmployee, filterDateFrom, filterDateTo])

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

      // Check if admin
      const isAdmin = ['owner', 'ea_to_owner', 'director', 'ea_to_director'].includes(session.employee.job_role)
      if (!isAdmin) {
        router.push('/CRM/dashboard')
        return
      }

      setCurrentUser(session.employee)
      await loadEmployees()
      await loadLogs(0, true)

    } catch (err) {
      console.error('Session check error:', err)
      router.push('/CRM')
    } finally {
      setLoading(false)
    }
  }

  async function loadEmployees() {
    const { data } = await supabase
      .from('crm_employees')
      .select('id, emp_id, full_name')
      .order('full_name')

    setEmployees(data || [])
  }

  async function loadLogs(pageNum: number, reset: boolean = false) {
    if (reset) {
      setLoadingMore(false)
    } else {
      setLoadingMore(true)
    }

    try {
      let query = supabase
        .from('crm_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageNum * ITEMS_PER_PAGE, (pageNum + 1) * ITEMS_PER_PAGE - 1)

      if (filterAction) {
        query = query.eq('action', filterAction)
      }
      if (filterEntity) {
        query = query.eq('entity_type', filterEntity)
      }
      if (filterEmployee) {
        query = query.eq('employee_id', filterEmployee)
      }
      if (filterDateFrom) {
        query = query.gte('created_at', filterDateFrom)
      }
      if (filterDateTo) {
        query = query.lte('created_at', filterDateTo + 'T23:59:59')
      }

      const { data, error } = await query

      if (error) throw error

      // Get employee names
      const { data: emps } = await supabase.from('crm_employees').select('id, full_name')
      const empMap = Object.fromEntries(emps?.map(e => [e.id, e.full_name]) || [])

      const logsWithNames = data?.map(log => ({
        ...log,
        employee_name: empMap[log.employee_id] || log.emp_id
      })) || []

      if (reset) {
        setLogs(logsWithNames)
      } else {
        setLogs(prev => [...prev, ...logsWithNames])
      }

      setHasMore(logsWithNames.length === ITEMS_PER_PAGE)
      setPage(pageNum)

    } catch (err) {
      console.error('Error loading logs:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  function loadMore() {
    if (!loadingMore && hasMore) {
      loadLogs(page + 1)
    }
  }

  function getActionInfo(action: string) {
    return ACTION_TYPES.find(a => a.value === action) || { value: action, label: action, icon: '📋', color: 'bg-slate-500/20 text-slate-400' }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function clearFilters() {
    setSearch('')
    setFilterAction('')
    setFilterEntity('')
    setFilterEmployee('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  const filteredLogs = search
    ? logs.filter(log =>
        log.description.toLowerCase().includes(search.toLowerCase()) ||
        log.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
        log.emp_id.toLowerCase().includes(search.toLowerCase())
      )
    : logs

  // Group logs by date
  const groupedLogs: Record<string, AuditLog[]> = {}
  filteredLogs.forEach(log => {
    const date = new Date(log.created_at).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    if (!groupedLogs[date]) {
      groupedLogs[date] = []
    }
    groupedLogs[date].push(log)
  })

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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/CRM/dashboard')} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-white font-bold text-lg">Activity Timeline</h1>
                <p className="text-slate-400 text-xs">{filteredLogs.length} activities</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {/* Search */}
            <div className="col-span-2">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search description, employee..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
                />
              </div>
            </div>

            {/* Action Filter */}
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="">All Actions</option>
              {ACTION_TYPES.map(a => (
                <option key={a.value} value={a.value}>{a.icon} {a.label}</option>
              ))}
            </select>

            {/* Entity Filter */}
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="">All Entities</option>
              {ENTITY_TYPES.map(e => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>

            {/* Employee Filter */}
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="">All Employees</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>

            {/* Clear */}
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-amber-400 hover:text-amber-300 text-sm"
            >
              Clear
            </button>

            {/* Date From */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-8">
          {Object.entries(groupedLogs).map(([date, dayLogs]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="sticky top-16 z-10 bg-slate-900 py-2">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-700"></div>
                  <span className="text-slate-400 text-sm font-medium px-3 py-1 bg-slate-800 rounded-full">
                    {date}
                  </span>
                  <div className="h-px flex-1 bg-slate-700"></div>
                </div>
              </div>

              {/* Day's Activities */}
              <div className="space-y-3 mt-4">
                {dayLogs.map((log) => {
                  const actionInfo = getActionInfo(log.action)
                  return (
                    <div
                      key={log.id}
                      className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${actionInfo.color}`}>
                          <span className="text-lg">{actionInfo.icon}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-white">{log.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-slate-400 text-sm">{log.employee_name}</span>
                                <span className="text-slate-600">•</span>
                                <span className={`px-2 py-0.5 rounded text-xs ${actionInfo.color}`}>
                                  {actionInfo.label}
                                </span>
                                {log.entity_type && (
                                  <>
                                    <span className="text-slate-600">•</span>
                                    <span className="text-slate-500 text-xs capitalize">{log.entity_type}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <span className="text-slate-500 text-sm shrink-0">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {filteredLogs.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No activities found
            </div>
          )}

          {/* Load More */}
          {hasMore && filteredLogs.length > 0 && (
            <div className="text-center py-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
