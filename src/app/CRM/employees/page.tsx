'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Job roles with hierarchy levels
const JOB_ROLES = [
  { value: 'owner', label: 'Owner', level: 1 },
  { value: 'ea_to_owner', label: 'Executive Assistant to Owner', level: 1 },
  { value: 'director', label: 'Director', level: 2 },
  { value: 'ea_to_secretary', label: 'Executive Assistant to Director', level: 2 },
  { value: 'pm_ai_spot', label: 'Project Manager - AI Spot', level: 3 },
  { value: 'pm_b2c_btl', label: 'Project Manager - B2C BTL', level: 3 },
  { value: 'pm_stage_2', label: 'Project Manager - Stage 2', level: 3 },
  { value: 'pm_stage_3', label: 'Project Manager - Stage 3', level: 3 },
  { value: 'rm_stage_4', label: 'Relationship Manager - Stage 4', level: 4 },
  { value: 'front_executive', label: 'Front Executive', level: 5 }
]

const COMPENSATION_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'contract', label: 'Contract' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'front_executive', label: 'Front Executive' }
]

const JOB_ROLE_DISPLAY: Record<string, string> = Object.fromEntries(
  JOB_ROLES.map(r => [r.value, r.label])
)

interface Employee {
  id: string
  emp_id: string
  full_name: string
  mobile: string
  email: string
  location: string
  city: string
  country: string
  dob: string
  doj: string
  gender: string
  job_role: string
  hierarchy_level: number
  compensation_type: string
  comp_monthly: number
  comp_per_lead: number
  comp_per_conversion: number
  comp_per_cross_sell: number
  reports_to: string | null
  reports_to_name?: string
  is_active: boolean
  last_login: string
  created_at: string
}

export default function EmployeesPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    emp_id: '',
    full_name: '',
    mobile: '',
    email: '',
    location: '',
    city: '',
    country: 'India',
    dob: '',
    doj: new Date().toISOString().split('T')[0],
    gender: '',
    job_role: 'front_executive',
    compensation_type: 'full_time',
    comp_monthly: 0,
    comp_per_lead: 0,
    comp_per_conversion: 0,
    comp_per_cross_sell: 0,
    reports_to: '',
    initial_passcode: ''
  })

  useEffect(() => {
    checkSessionAndLoad()
  }, [])

  useEffect(() => {
    filterEmployees()
  }, [employees, search, filterRole, filterStatus])

  async function checkSessionAndLoad() {
    try {
      const sessionData = localStorage.getItem('crm_session')
      if (!sessionData) {
        router.push('/CRM')
        return
      }

      const session = JSON.parse(sessionData)

      // Verify session
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

      // Check if user has admin access
      const adminRoles = ['owner', 'ea_to_owner', 'director', 'ea_to_secretary']
      if (!adminRoles.includes(session.employee.job_role)) {
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
      const { data, error } = await supabase
        .from('crm_employees')
        .select('*')
        .order('hierarchy_level', { ascending: true })
        .order('full_name', { ascending: true })

      if (error) throw error

      // Get reports_to names
      const employeesWithManager = data?.map(emp => {
        const manager = data?.find(e => e.id === emp.reports_to)
        return {
          ...emp,
          reports_to_name: manager?.full_name || '-'
        }
      }) || []

      setEmployees(employeesWithManager)
    } catch (err) {
      console.error('Error loading employees:', err)
    }
  }

  function filterEmployees() {
    let filtered = [...employees]

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(e =>
        e.full_name.toLowerCase().includes(searchLower) ||
        e.emp_id.toLowerCase().includes(searchLower) ||
        e.mobile.includes(search) ||
        e.email?.toLowerCase().includes(searchLower)
      )
    }

    // Role filter
    if (filterRole) {
      filtered = filtered.filter(e => e.job_role === filterRole)
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(e => e.is_active === (filterStatus === 'active'))
    }

    setFilteredEmployees(filtered)
  }

  function openAddModal() {
    setEditingEmployee(null)
    setFormData({
      emp_id: generateEmpId(),
      full_name: '',
      mobile: '',
      email: '',
      location: '',
      city: '',
      country: 'India',
      dob: '',
      doj: new Date().toISOString().split('T')[0],
      gender: '',
      job_role: 'front_executive',
      compensation_type: 'full_time',
      comp_monthly: 0,
      comp_per_lead: 0,
      comp_per_conversion: 0,
      comp_per_cross_sell: 0,
      reports_to: currentUser?.id || '',
      initial_passcode: generatePasscode()
    })
    setError('')
    setShowModal(true)
  }

  function openEditModal(emp: Employee) {
    setEditingEmployee(emp)
    setFormData({
      emp_id: emp.emp_id,
      full_name: emp.full_name,
      mobile: emp.mobile,
      email: emp.email || '',
      location: emp.location || '',
      city: emp.city || '',
      country: emp.country || 'India',
      dob: emp.dob || '',
      doj: emp.doj || '',
      gender: emp.gender || '',
      job_role: emp.job_role,
      compensation_type: emp.compensation_type || 'full_time',
      comp_monthly: emp.comp_monthly || 0,
      comp_per_lead: emp.comp_per_lead || 0,
      comp_per_conversion: emp.comp_per_conversion || 0,
      comp_per_cross_sell: emp.comp_per_cross_sell || 0,
      reports_to: emp.reports_to || '',
      initial_passcode: ''
    })
    setError('')
    setShowModal(true)
  }

  function generateEmpId() {
    const prefix = 'EMP'
    const num = String(employees.length + 1).padStart(3, '0')
    return `${prefix}${num}`
  }

  function generatePasscode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let passcode = ''
    for (let i = 0; i < 8; i++) {
      passcode += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return passcode + '@1'
  }

  async function handleSave() {
    setError('')
    setSaving(true)

    try {
      // Validation
      if (!formData.full_name.trim()) {
        setError('Full name is required')
        setSaving(false)
        return
      }

      if (!formData.mobile.trim() || formData.mobile.length < 10) {
        setError('Valid mobile number is required')
        setSaving(false)
        return
      }

      // Get hierarchy level from job role
      const roleInfo = JOB_ROLES.find(r => r.value === formData.job_role)
      const hierarchyLevel = roleInfo?.level || 5

      if (editingEmployee) {
        // Update existing employee
        const { error: updateError } = await supabase
          .from('crm_employees')
          .update({
            full_name: formData.full_name.trim(),
            mobile: formData.mobile.trim(),
            email: formData.email.trim() || null,
            location: formData.location.trim() || null,
            city: formData.city.trim() || null,
            country: formData.country.trim() || null,
            dob: formData.dob || null,
            doj: formData.doj || null,
            gender: formData.gender || null,
            job_role: formData.job_role,
            hierarchy_level: hierarchyLevel,
            compensation_type: formData.compensation_type,
            comp_monthly: formData.comp_monthly,
            comp_per_lead: formData.comp_per_lead,
            comp_per_conversion: formData.comp_per_conversion,
            comp_per_cross_sell: formData.comp_per_cross_sell,
            reports_to: formData.reports_to || null,
            updated_at: new Date().toISOString(),
            updated_by: currentUser.id
          })
          .eq('id', editingEmployee.id)

        if (updateError) throw updateError

        // Log action
        await supabase.from('crm_audit_log').insert({
          employee_id: currentUser.id,
          emp_id: currentUser.emp_id,
          action: 'update',
          entity_type: 'employee',
          entity_id: editingEmployee.id,
          description: `Updated employee: ${formData.full_name}`
        })

        setSuccess('Employee updated successfully!')

      } else {
        // Create new employee with hashed passcode
        const { data: newEmp, error: createError } = await supabase.rpc('create_employee_with_passcode', {
          p_emp_id: formData.emp_id.toUpperCase(),
          p_full_name: formData.full_name.trim(),
          p_mobile: formData.mobile.trim(),
          p_email: formData.email.trim() || null,
          p_job_role: formData.job_role,
          p_hierarchy_level: hierarchyLevel,
          p_reports_to: formData.reports_to || null,
          p_passcode: formData.initial_passcode,
          p_created_by: currentUser.id
        })

        if (createError) {
          // Fallback: direct insert if RPC doesn't exist
          const { error: insertError } = await supabase
            .from('crm_employees')
            .insert({
              emp_id: formData.emp_id.toUpperCase(),
              full_name: formData.full_name.trim(),
              mobile: formData.mobile.trim(),
              email: formData.email.trim() || null,
              location: formData.location.trim() || null,
              city: formData.city.trim() || null,
              country: formData.country.trim() || null,
              dob: formData.dob || null,
              doj: formData.doj || null,
              gender: formData.gender || null,
              job_role: formData.job_role,
              hierarchy_level: hierarchyLevel,
              compensation_type: formData.compensation_type,
              comp_monthly: formData.comp_monthly,
              comp_per_lead: formData.comp_per_lead,
              comp_per_conversion: formData.comp_per_conversion,
              comp_per_cross_sell: formData.comp_per_cross_sell,
              reports_to: formData.reports_to || null,
              passcode_hash: formData.initial_passcode, // Note: Should be hashed in production!
              must_change_password: true,
              created_by: currentUser.id
            })

          if (insertError) throw insertError
        }

        // Log action
        await supabase.from('crm_audit_log').insert({
          employee_id: currentUser.id,
          emp_id: currentUser.emp_id,
          action: 'create',
          entity_type: 'employee',
          entity_id: newEmp || null,
          description: `Created employee: ${formData.full_name} (${formData.emp_id})`
        })

        setSuccess(`Employee created! Initial passcode: ${formData.initial_passcode}`)
      }

      await loadEmployees()
      setTimeout(() => {
        setShowModal(false)
        setSuccess('')
      }, 2000)

    } catch (err: any) {
      console.error('Save error:', err)
      setError(err.message || 'Failed to save employee')
    } finally {
      setSaving(false)
    }
  }

  async function toggleEmployeeStatus(emp: Employee) {
    if (emp.job_role === 'owner') {
      setError('Cannot deactivate the Owner account')
      return
    }

    try {
      const newStatus = !emp.is_active

      await supabase
        .from('crm_employees')
        .update({
          is_active: newStatus,
          updated_at: new Date().toISOString(),
          updated_by: currentUser.id
        })
        .eq('id', emp.id)

      // Log action
      await supabase.from('crm_audit_log').insert({
        employee_id: currentUser.id,
        emp_id: currentUser.emp_id,
        action: newStatus ? 'activate' : 'deactivate',
        entity_type: 'employee',
        entity_id: emp.id,
        description: `${newStatus ? 'Activated' : 'Deactivated'} employee: ${emp.full_name}`
      })

      await loadEmployees()
      setSuccess(`Employee ${newStatus ? 'activated' : 'deactivated'} successfully!`)
      setTimeout(() => setSuccess(''), 3000)

    } catch (err) {
      console.error('Toggle status error:', err)
    }
  }

  async function resetPassword(emp: Employee) {
    const newPasscode = generatePasscode()

    try {
      const { error } = await supabase.rpc('update_employee_passcode', {
        p_emp_id: emp.id,
        p_new_passcode: newPasscode
      })

      if (error) {
        // Fallback
        await supabase
          .from('crm_employees')
          .update({
            passcode_hash: newPasscode,
            must_change_password: true
          })
          .eq('id', emp.id)
      }

      // Also set must_change_password
      await supabase
        .from('crm_employees')
        .update({ must_change_password: true })
        .eq('id', emp.id)

      // Log action
      await supabase.from('crm_audit_log').insert({
        employee_id: currentUser.id,
        emp_id: currentUser.emp_id,
        action: 'password_reset',
        entity_type: 'employee',
        entity_id: emp.id,
        description: `Reset password for: ${emp.full_name}`
      })

      setSuccess(`Password reset! New passcode: ${newPasscode}`)
      setTimeout(() => setSuccess(''), 5000)

    } catch (err) {
      console.error('Reset password error:', err)
      setError('Failed to reset password')
    }
  }

  // Get potential managers (employees with higher or equal hierarchy level)
  function getPotentialManagers() {
    const selectedRole = JOB_ROLES.find(r => r.value === formData.job_role)
    if (!selectedRole) return []

    return employees.filter(e => {
      const empRole = JOB_ROLES.find(r => r.value === e.job_role)
      return empRole && empRole.level < selectedRole.level && e.is_active
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading employees...</p>
        </div>
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
              <button
                onClick={() => router.push('/CRM/dashboard')}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-white font-bold text-lg">Employee Management</h1>
                <p className="text-slate-400 text-xs">{employees.length} employees</p>
              </div>
            </div>

            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Employee
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {success}
          </div>
        )}

        {error && !showModal && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
            <button onClick={() => setError('')} className="ml-auto">×</button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, ID, mobile, email..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Role Filter */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Roles</option>
              {JOB_ROLES.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Employees Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Reports To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Last Login</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className={`hover:bg-slate-700/50 ${!emp.is_active ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                          emp.job_role === 'owner' ? 'bg-amber-500' :
                          emp.hierarchy_level <= 2 ? 'bg-purple-500' :
                          emp.hierarchy_level === 3 ? 'bg-blue-500' :
                          'bg-slate-600'
                        }`}>
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-medium">{emp.full_name}</p>
                          <p className="text-slate-400 text-sm">{emp.emp_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-white text-sm">{emp.mobile}</p>
                      <p className="text-slate-400 text-xs">{emp.email || '-'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        emp.job_role === 'owner' ? 'bg-amber-500/20 text-amber-400' :
                        emp.hierarchy_level <= 2 ? 'bg-purple-500/20 text-purple-400' :
                        emp.hierarchy_level === 3 ? 'bg-blue-500/20 text-blue-400' :
                        emp.hierarchy_level === 4 ? 'bg-green-500/20 text-green-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {JOB_ROLE_DISPLAY[emp.job_role] || emp.job_role}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-300 text-sm">
                      {emp.reports_to_name || '-'}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        emp.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-400 text-sm">
                      {emp.last_login ? new Date(emp.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1">
                        {/* Edit */}
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        {/* Reset Password */}
                        <button
                          onClick={() => resetPassword(emp)}
                          className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-600 rounded-lg transition-colors"
                          title="Reset Password"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </button>

                        {/* Toggle Status */}
                        {emp.job_role !== 'owner' && (
                          <button
                            onClick={() => toggleEmployeeStatus(emp)}
                            className={`p-2 rounded-lg transition-colors ${
                              emp.is_active 
                                ? 'text-slate-400 hover:text-red-400 hover:bg-slate-600' 
                                : 'text-slate-400 hover:text-green-400 hover:bg-slate-600'
                            }`}
                            title={emp.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {emp.is_active ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      No employees found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Initial Passcode (for new employees) */}
              {!editingEmployee && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <p className="text-amber-400 text-sm font-medium mb-1">Initial Passcode</p>
                  <p className="text-white font-mono text-lg">{formData.initial_passcode}</p>
                  <p className="text-amber-300/70 text-xs mt-1">Share this with the employee. They must change it on first login.</p>
                </div>
              )}

              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Employee ID *</label>
                    <input
                      type="text"
                      value={formData.emp_id}
                      onChange={(e) => setFormData({ ...formData, emp_id: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                      disabled={!!editingEmployee}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Mobile *</label>
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="+91..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Select...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Location/Address</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Country</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Job Info */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">Job Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Job Role *</label>
                    <select
                      value={formData.job_role}
                      onChange={(e) => setFormData({ ...formData, job_role: e.target.value, reports_to: '' })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      disabled={editingEmployee?.job_role === 'owner'}
                    >
                      {JOB_ROLES.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Reports To</label>
                    <select
                      value={formData.reports_to}
                      onChange={(e) => setFormData({ ...formData, reports_to: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      disabled={formData.job_role === 'owner'}
                    >
                      <option value="">None (Top Level)</option>
                      {getPotentialManagers().map(manager => (
                        <option key={manager.id} value={manager.id}>
                          {manager.full_name} ({JOB_ROLE_DISPLAY[manager.job_role]})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Compensation Type</label>
                    <select
                      value={formData.compensation_type}
                      onChange={(e) => setFormData({ ...formData, compensation_type: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {COMPENSATION_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Date of Joining</label>
                    <input
                      type="date"
                      value={formData.doj}
                      onChange={(e) => setFormData({ ...formData, doj: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Compensation */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">Compensation (₹)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Monthly</label>
                    <input
                      type="number"
                      value={formData.comp_monthly}
                      onChange={(e) => setFormData({ ...formData, comp_monthly: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Per Lead</label>
                    <input
                      type="number"
                      value={formData.comp_per_lead}
                      onChange={(e) => setFormData({ ...formData, comp_per_lead: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Per Conversion</label>
                    <input
                      type="number"
                      value={formData.comp_per_conversion}
                      onChange={(e) => setFormData({ ...formData, comp_per_conversion: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Per Cross-Sell</label>
                    <input
                      type="number"
                      value={formData.comp_per_cross_sell}
                      onChange={(e) => setFormData({ ...formData, comp_per_cross_sell: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-slate-800 px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-colors ${
                  saving
                    ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-900'
                }`}
              >
                {saving ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Create Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
