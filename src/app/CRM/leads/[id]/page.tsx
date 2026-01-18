'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'follow_up_again', label: 'Follow-up Again' },
  { value: 'need_something', label: 'Need Something' },
  { value: 'converted', label: 'Converted' },
  { value: 'not_interested', label: 'Not Interested' }
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

const COUNTRY_CODES = [
  { value: '+91', label: '🇮🇳 +91 (India)' },
  { value: '+1', label: '🇺🇸 +1 (USA/Canada)' },
  { value: '+44', label: '🇬🇧 +44 (UK)' },
  { value: '+971', label: '🇦🇪 +971 (UAE)' },
  { value: '+65', label: '🇸🇬 +65 (Singapore)' },
  { value: '+61', label: '🇦🇺 +61 (Australia)' },
  { value: '+49', label: '🇩🇪 +49 (Germany)' },
  { value: '+33', label: '🇫🇷 +33 (France)' },
  { value: '+81', label: '🇯🇵 +81 (Japan)' },
  { value: '+86', label: '🇨🇳 +86 (China)' }
]

const COURSES = [
  'AI Fundamentals',
  'ChatGPT Mastery',
  'Prompt Engineering',
  'AI for Business',
  'AI for Marketing',
  'AI for HR',
  'AI for Sales',
  'AI Tools Workshop',
  'Generative AI',
  'AI Automation',
  'Agentic AI',
  'Other'
]

interface Employee {
  id: string
  emp_id: string
  full_name: string
}

export default function LeadFormPage() {
  const router = useRouter()
  const params = useParams()
  const leadId = params?.id as string
  const isEditMode = leadId && leadId !== 'new'

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    full_name: '',
    country_code: '+91',
    mobile: '',
    email: '',
    lead_source: 'self',
    for_whom: 'self',
    course: '',
    lead_score: 3,
    lead_status: 'new',
    status_notes: '',
    lead_generation_date: new Date().toISOString().split('T')[0],
    next_followup_date: '',
    target_conversion_date: '',
    assigned_to: ''
  })

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
      await loadEmployees()

      if (isEditMode) {
        await loadLead()
      } else {
        setForm(prev => ({ ...prev, assigned_to: session.employee.id }))
      }

    } catch (err) {
      console.error('Session check error:', err)
      router.push('/CRM')
    } finally {
      setLoading(false)
    }
  }

  async function loadEmployees() {
    try {
      const { data } = await supabase
        .from('crm_employees')
        .select('id, emp_id, full_name')
        .eq('is_active', true)
        .order('full_name')

      setEmployees(data || [])
    } catch (err) {
      console.error('Error loading employees:', err)
    }
  }

  async function loadLead() {
    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', leadId)
        .single()

      if (error) throw error

      if (data) {
        setForm({
          full_name: data.full_name || '',
          country_code: data.country_code || '+91',
          mobile: data.mobile || '',
          email: data.email || '',
          lead_source: data.lead_source || 'self',
          for_whom: data.for_whom || 'self',
          course: data.course || '',
          lead_score: data.lead_score || 3,
          lead_status: data.lead_status || 'new',
          status_notes: data.status_notes || '',
          lead_generation_date: data.lead_generation_date || '',
          next_followup_date: data.next_followup_date || '',
          target_conversion_date: data.target_conversion_date || '',
          assigned_to: data.assigned_to || ''
        })
      }
    } catch (err) {
      console.error('Error loading lead:', err)
      setError('Failed to load lead')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      // Validation
      if (!form.full_name.trim()) {
        setError('Name is required')
        setSaving(false)
        return
      }

      if (!form.mobile.trim() || form.mobile.length < 10) {
        setError('Valid mobile number is required')
        setSaving(false)
        return
      }

      if (isEditMode) {
        // Update existing lead
        const { error: updateError } = await supabase
          .from('crm_leads')
          .update({
            full_name: form.full_name.trim(),
            email: form.email.trim() || null,
            lead_source: form.lead_source,
            for_whom: form.for_whom,
            course: form.course || null,
            lead_score: form.lead_score,
            lead_status: form.lead_status,
            status_notes: form.status_notes || null,
            lead_generation_date: form.lead_generation_date || null,
            next_followup_date: form.next_followup_date || null,
            target_conversion_date: form.target_conversion_date || null,
            assigned_to: form.assigned_to || currentUser.id,
            is_converted: form.lead_status === 'converted',
            conversion_date: form.lead_status === 'converted' ? new Date().toISOString().split('T')[0] : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId)

        if (updateError) throw updateError

        await supabase.from('crm_audit_log').insert({
          employee_id: currentUser.id,
          emp_id: currentUser.emp_id,
          action: 'update',
          entity_type: 'lead',
          entity_id: leadId,
          description: `Updated lead: ${form.full_name}`
        })

        setSuccess('Lead updated successfully!')

      } else {
        // Check for duplicate mobile
        const { data: existing } = await supabase
          .from('crm_leads')
          .select('id')
          .eq('country_code', form.country_code)
          .eq('mobile', form.mobile.trim())
          .single()

        if (existing) {
          setError('A lead with this mobile number already exists')
          setSaving(false)
          return
        }

        // Create new lead
        const { data: newLead, error: createError } = await supabase
          .from('crm_leads')
          .insert({
            full_name: form.full_name.trim(),
            country_code: form.country_code,
            mobile: form.mobile.trim(),
            email: form.email.trim() || null,
            lead_source: form.lead_source,
            for_whom: form.for_whom,
            course: form.course || null,
            lead_score: form.lead_score,
            lead_status: form.lead_status,
            status_notes: form.status_notes || null,
            lead_generation_date: form.lead_generation_date || new Date().toISOString().split('T')[0],
            next_followup_date: form.next_followup_date || null,
            target_conversion_date: form.target_conversion_date || null,
            assigned_to: form.assigned_to || currentUser.id,
            generated_by: currentUser.id
          })
          .select()
          .single()

        if (createError) throw createError

        // Log initial assignment
        await supabase.from('crm_lead_assignments').insert({
          lead_id: newLead.id,
          assigned_from: null,
          assigned_to: form.assigned_to || currentUser.id,
          assigned_by: currentUser.id,
          assignment_reason: 'Initial assignment'
        })

        await supabase.from('crm_audit_log').insert({
          employee_id: currentUser.id,
          emp_id: currentUser.emp_id,
          action: 'create',
          entity_type: 'lead',
          entity_id: newLead.id,
          description: `Created lead: ${form.full_name}`
        })

        setSuccess('Lead created successfully!')
      }

      setTimeout(() => {
        router.push('/CRM/leads')
      }, 1500)

    } catch (err: any) {
      console.error('Save error:', err)
      setError(err.message || 'Failed to save lead')
    } finally {
      setSaving(false)
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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/CRM/leads')}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-white font-bold text-lg">
                {isEditMode ? 'Edit Lead' : 'Add New Lead'}
              </h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Information */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Mobile Number *</label>
                <div className="flex gap-2">
                  <select
                    value={form.country_code}
                    onChange={(e) => setForm({ ...form, country_code: e.target.value })}
                    disabled={isEditMode}
                    className="w-28 px-2 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                  >
                    {COUNTRY_CODES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })}
                    disabled={isEditMode}
                    className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                    placeholder="9876543210"
                    maxLength={10}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>

          {/* Lead Details */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Lead Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Lead Source</label>
                <select
                  value={form.lead_source}
                  onChange={(e) => setForm({ ...form, lead_source: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {LEAD_SOURCES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">For Whom</label>
                <select
                  value={form.for_whom}
                  onChange={(e) => setForm({ ...form, for_whom: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {FOR_WHOM_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Course Interest</label>
                <select
                  value={form.course}
                  onChange={(e) => setForm({ ...form, course: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select course...</option>
                  {COURSES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Lead Score</label>
                <select
                  value={form.lead_score}
                  onChange={(e) => setForm({ ...form, lead_score: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="5">⭐⭐⭐⭐⭐ 5 - Hot Lead</option>
                  <option value="4">⭐⭐⭐⭐ 4 - Warm Lead</option>
                  <option value="3">⭐⭐⭐ 3 - Neutral</option>
                  <option value="2">⭐⭐ 2 - Cool Lead</option>
                  <option value="1">⭐ 1 - Cold Lead</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Status</label>
                <select
                  value={form.lead_status}
                  onChange={(e) => setForm({ ...form, lead_status: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {LEAD_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Assigned To</label>
                <select
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.full_name}</option>
                  ))}
                </select>
              </div>

              {form.lead_status === 'need_something' && (
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-300 mb-1">Status Notes</label>
                  <textarea
                    value={form.status_notes}
                    onChange={(e) => setForm({ ...form, status_notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    placeholder="What does the lead need?"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Dates & Follow-up</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Lead Generation Date</label>
                <input
                  type="date"
                  value={form.lead_generation_date}
                  onChange={(e) => setForm({ ...form, lead_generation_date: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Next Follow-up Date</label>
                <input
                  type="date"
                  value={form.next_followup_date}
                  onChange={(e) => setForm({ ...form, next_followup_date: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Target Conversion Date</label>
                <input
                  type="date"
                  value={form.target_conversion_date}
                  onChange={(e) => setForm({ ...form, target_conversion_date: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/CRM/leads')}
              className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                saving
                  ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-900'
              }`}
            >
              {saving ? 'Saving...' : isEditMode ? 'Update Lead' : 'Create Lead'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
