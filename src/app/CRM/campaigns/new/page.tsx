'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Employee {
  id: string
  full_name: string
  job_role: string
}

const CAMPAIGN_TYPES = [
  { value: 'sales', label: 'Sales Campaign', description: 'Drive new sales and revenue' },
  { value: 'marketing', label: 'Marketing Campaign', description: 'Brand awareness and lead generation' },
  { value: 'service', label: 'Customer Service', description: 'Improve customer satisfaction' },
  { value: 'retention', label: 'Retention Campaign', description: 'Retain existing customers' },
  { value: 'cross_sell', label: 'Cross-Sell/Up-Sell', description: 'Sell additional products' }
]

const CAMPAIGN_CATEGORIES = [
  { value: 'offer', label: 'Special Offer', icon: '🎁', description: 'Limited-time promotional campaigns' },
  { value: 'timely', label: 'Timely/Seasonal', icon: '📅', description: 'Holiday or time-sensitive campaigns' },
  { value: 'targeted', label: 'Targeted Outreach', icon: '🎯', description: 'Specific segment targeting' },
  { value: 'nurture', label: 'Lead Nurturing', icon: '🌱', description: 'Long-term relationship building' }
]

const COMMUNICATION_CHANNELS = [
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'call', label: 'Phone Call', icon: '📞' },
  { value: 'sms', label: 'SMS', icon: '📱' },
  { value: 'in_person', label: 'In-Person', icon: '🤝' }
]

export default function NewCampaignPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  const [formData, setFormData] = useState({
    campaign_name: '',
    campaign_type: 'sales',
    campaign_category: 'targeted',
    description: '',
    objective: '',
    target_audience: '',
    product_focus: '',
    offer_details: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    budget_allocated: '',
    target_leads_count: '',
    target_conversions_count: '',
    target_revenue: '',
    channels_used: [] as string[],
    campaign_owner_id: ''
  })

  useEffect(() => {
    fetchEmployees()
    fetchCurrentUser()
  }, [])

  async function fetchCurrentUser() {
    const sessionToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('crm_session='))
      ?.split('=')[1]

    if (!sessionToken) return

    const { data: sessionData } = await supabase
      .from('crm_sessions')
      .select('employee_id, crm_employees(id, full_name)')
      .eq('session_token', sessionToken)
      .eq('is_valid', true)
      .single()

    if (sessionData) {
      setCurrentUser(sessionData.crm_employees)
      setFormData(prev => ({ ...prev, campaign_owner_id: sessionData.employee_id }))
    }
  }

  async function fetchEmployees() {
    const { data } = await supabase
      .from('crm_employees')
      .select('id, full_name, job_role')
      .eq('is_active', true)
      .order('full_name')

    if (data) setEmployees(data)
  }

  function handleChannelToggle(channel: string) {
    setFormData(prev => ({
      ...prev,
      channels_used: prev.channels_used.includes(channel)
        ? prev.channels_used.filter(c => c !== channel)
        : [...prev.channels_used, channel]
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.campaign_name.trim()) {
      alert('Please enter a campaign name')
      return
    }

    if (formData.channels_used.length === 0) {
      alert('Please select at least one communication channel')
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('crm_campaigns')
        .insert({
          campaign_name: formData.campaign_name.trim(),
          campaign_type: formData.campaign_type,
          campaign_category: formData.campaign_category,
          description: formData.description.trim() || null,
          objective: formData.objective.trim() || null,
          target_audience: formData.target_audience.trim() || null,
          product_focus: formData.product_focus.trim() || null,
          offer_details: formData.offer_details.trim() || null,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          budget_allocated: formData.budget_allocated ? parseFloat(formData.budget_allocated) : null,
          target_leads_count: formData.target_leads_count ? parseInt(formData.target_leads_count) : null,
          target_conversions_count: formData.target_conversions_count ? parseInt(formData.target_conversions_count) : null,
          target_revenue: formData.target_revenue ? parseFloat(formData.target_revenue) : null,
          channels_used: formData.channels_used,
          campaign_owner_id: formData.campaign_owner_id || null,
          created_by: currentUser?.id || null,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      alert('Campaign created successfully!')
      router.push(`/CRM/campaigns/${data.id}`)
    } catch (error: any) {
      console.error('Error creating campaign:', error)
      alert(error.message || 'Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/CRM/campaigns')} className="text-slate-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Create New Campaign</h1>
                <p className="text-sm text-slate-400">Set up a new sales or marketing campaign</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">1</span>
              Basic Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Campaign Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.campaign_name}
                  onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                  placeholder="e.g., Q1 Insurance Push 2026"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Campaign Type</label>
                  <select
                    value={formData.campaign_type}
                    onChange={(e) => setFormData({ ...formData, campaign_type: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {CAMPAIGN_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    {CAMPAIGN_TYPES.find(t => t.value === formData.campaign_type)?.description}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Campaign Category</label>
                  <select
                    value={formData.campaign_category}
                    onChange={(e) => setFormData({ ...formData, campaign_category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {CAMPAIGN_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    {CAMPAIGN_CATEGORIES.find(c => c.value === formData.campaign_category)?.description}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief overview of this campaign..."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Campaign Objective</label>
                <input
                  type="text"
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  placeholder="e.g., Generate 500 qualified leads for new insurance product"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Targeting */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">2</span>
              Targeting & Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Target Audience</label>
                <input
                  type="text"
                  value={formData.target_audience}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                  placeholder="e.g., Corporate decision-makers in BFSI sector"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Product Focus</label>
                <input
                  type="text"
                  value={formData.product_focus}
                  onChange={(e) => setFormData({ ...formData, product_focus: e.target.value })}
                  placeholder="e.g., AI-Powered CRM Enterprise Plan"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Offer Details</label>
                <textarea
                  rows={2}
                  value={formData.offer_details}
                  onChange={(e) => setFormData({ ...formData, offer_details: e.target.value })}
                  placeholder="e.g., 30% off first year + free AI Mentor for 100 recommendations"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">3</span>
              Timeline
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Start Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  End Date <span className="text-slate-500">(optional for ongoing campaigns)</span>
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  min={formData.start_date}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Budget & Goals */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">4</span>
              Budget & Goals
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Budget Allocated (₹)</label>
                <input
                  type="number"
                  value={formData.budget_allocated}
                  onChange={(e) => setFormData({ ...formData, budget_allocated: e.target.value })}
                  placeholder="50000"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Target Revenue (₹)</label>
                <input
                  type="number"
                  value={formData.target_revenue}
                  onChange={(e) => setFormData({ ...formData, target_revenue: e.target.value })}
                  placeholder="500000"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Target Leads Count</label>
                <input
                  type="number"
                  value={formData.target_leads_count}
                  onChange={(e) => setFormData({ ...formData, target_leads_count: e.target.value })}
                  placeholder="500"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Target Conversions</label>
                <input
                  type="number"
                  value={formData.target_conversions_count}
                  onChange={(e) => setFormData({ ...formData, target_conversions_count: e.target.value })}
                  placeholder="50"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Communication Channels */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">5</span>
              Communication Channels <span className="text-red-400">*</span>
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {COMMUNICATION_CHANNELS.map(channel => (
                <button
                  key={channel.value}
                  type="button"
                  onClick={() => handleChannelToggle(channel.value)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.channels_used.includes(channel.value)
                      ? 'border-purple-500 bg-purple-500/20 text-white'
                      : 'border-slate-600 bg-slate-900 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="text-2xl mb-2">{channel.icon}</div>
                  <div className="text-sm font-medium">{channel.label}</div>
                </button>
              ))}
            </div>
            {formData.channels_used.length === 0 && (
              <p className="text-red-400 text-sm mt-2">Please select at least one channel</p>
            )}
          </div>

          {/* Team */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">6</span>
              Campaign Owner
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Assign To</label>
              <select
                value={formData.campaign_owner_id}
                onChange={(e) => setFormData({ ...formData, campaign_owner_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select campaign owner...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} - {emp.job_role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Creating Campaign...' : 'Create Campaign'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/CRM/campaigns')}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
