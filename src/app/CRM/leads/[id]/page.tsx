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

export default function LeadFormPage() {
  const router = useRouter()
  const params = useParams()
  const leadId = params?.id as string
  const isEditMode = Boolean(leadId && leadId !== 'new')

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
    if (isEditMode) loadLead()
    else setLoading(false)
  }, [])

  async function loadLead() {
    const { data, error } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (error) {
      setError('Failed to load lead')
    } else {
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
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    if (isEditMode) {
      await supabase.from('crm_leads').update(form).eq('id', leadId)
      setSuccess('Lead updated successfully')
    } else {
      await supabase.from('crm_leads').insert(form)
      setSuccess('Lead created successfully')
    }

    setSaving(false)
    setTimeout(() => router.push('/CRM/leads'), 1200)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-white">
      <h1 className="text-xl font-bold mb-4">
        {isEditMode ? 'Edit Lead' : 'Create Lead'}
      </h1>

      {error && <p className="text-red-400 mb-4">{error}</p>}
      {success && <p className="text-green-400 mb-4">{success}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <input
          value={form.full_name}
          onChange={e => setForm({ ...form, full_name: e.target.value })}
          placeholder="Full Name"
          className="w-full p-3 bg-slate-800 rounded"
        />

        <button
          disabled={saving}
          className="bg-amber-500 text-slate-900 px-6 py-3 rounded font-semibold"
        >
          {saving ? 'Saving…' : isEditMode ? 'Update Lead' : 'Create Lead'}
        </button>
      </form>
    </div>
  )
}
