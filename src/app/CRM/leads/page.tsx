'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
}

interface Employee {
  id: string
  emp_id: string
  full_name: string
  job_role: string
}

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    await Promise.all([loadLeads(), loadEmployees()])
    setLoading(false)
  }

  async function loadLeads() {
    const { data: leadsData } = await supabase
      .from('crm_leads')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: interactions } = await supabase
      .from('crm_lead_interactions')
      .select('lead_id')

    const interactionMap: Record<string, number> = {}
    interactions?.forEach(i => {
      interactionMap[i.lead_id] = (interactionMap[i.lead_id] || 0) + 1
    })

    const { data: emps } = await supabase
      .from('crm_employees')
      .select('id, full_name')

    const empMap = Object.fromEntries(emps?.map(e => [e.id, e.full_name]) || [])

    const enriched =
      leadsData?.map(l => ({
        ...l,
        assigned_to_name: empMap[l.assigned_to] || '-',
        generated_by_name: empMap[l.generated_by] || '-',
        interaction_count: interactionMap[l.id] ?? 0
      })) || []

    setLeads(enriched)
  }

  async function loadEmployees() {
    const { data } = await supabase
      .from('crm_employees')
      .select('id, emp_id, full_name, job_role')
      .eq('is_active', true)
      .order('full_name')

    setEmployees(data || [])
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <table className="w-full text-white">
        <tbody>
          {leads.map(lead => (
            <tr key={lead.id} className="border-b border-slate-700">
              <td className="py-2">{lead.full_name}</td>
              <td className="py-2">{lead.country_code} {lead.mobile}</td>
              <td className="py-2 text-center">
                <button
                  onClick={() => router.push(`/CRM/leads/${lead.id}`)}
                  className="relative p-2 text-slate-400 hover:text-amber-400"
                >
                  💬
                  {(lead.interaction_count ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-900 text-[10px] font-bold rounded-full flex items-center justify-center">
                      {lead.interaction_count ?? 0}
                    </span>
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
