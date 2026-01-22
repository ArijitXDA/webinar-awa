'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type FormStep = 1 | 2 | 3 | 4 | 5 | 6

interface NewLeadForm {
  // Step 1: Basic Information
  full_name: string
  country_code: string
  mobile: string
  email: string
  lead_source: string
  for_whom: string
  course: string

  // Step 2: Classification & Prioritization
  pipeline_stage: string
  priority: string
  lead_temperature: string
  lead_score: number
  tags: string[]

  // Step 3: Source Attribution & Company
  lead_source_detail: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_term: string
  utm_content: string
  referral_source: string
  company_name: string
  industry: string
  job_title: string
  company_size: string

  // Step 4: Value & Revenue
  expected_value: number | null
  annual_revenue_potential: number | null
  deal_size_category: string

  // Step 5: Communication Preferences
  timezone: string
  communication_preference: string
  best_time_to_contact: string
  language_preference: string
  do_not_contact: boolean
  do_not_email: boolean
  do_not_call: boolean
  do_not_whatsapp: boolean

  // Step 6: BFSI Specific & Assignment
  customer_segment: string
  risk_profile: string
  existing_products: string[]
  cross_sell_opportunities: string[]
  assigned_to: string
  primary_campaign_id: string
}

export default function NewLeadPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentStep, setCurrentStep] = useState<FormStep>(1)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tagInput, setTagInput] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)

  const [formData, setFormData] = useState<NewLeadForm>({
    full_name: '',
    country_code: '+91',
    mobile: '',
    email: '',
    lead_source: 'website',
    for_whom: 'self',
    course: '',
    pipeline_stage: 'new',
    priority: 'medium',
    lead_temperature: 'cold',
    lead_score: 3,
    tags: [],
    lead_source_detail: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: '',
    referral_source: '',
    company_name: '',
    industry: '',
    job_title: '',
    company_size: '',
    expected_value: null,
    annual_revenue_potential: null,
    deal_size_category: 'individual',
    timezone: 'Asia/Kolkata',
    communication_preference: 'any',
    best_time_to_contact: '',
    language_preference: 'English',
    do_not_contact: false,
    do_not_email: false,
    do_not_call: false,
    do_not_whatsapp: false,
    customer_segment: '',
    risk_profile: '',
    existing_products: [],
    cross_sell_opportunities: [],
    assigned_to: '',
    primary_campaign_id: ''
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
      setFormData(prev => ({ ...prev, assigned_to: session.employee.id }))

      await Promise.all([
        loadEmployees(),
        loadCampaigns(),
        loadTags()
      ])

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
      .select('id, emp_id, full_name, job_role')
      .eq('is_active', true)
      .order('full_name')

    setEmployees(data || [])
  }

  async function loadCampaigns() {
    const { data } = await supabase
      .from('crm_campaigns')
      .select('id, campaign_name, campaign_type, is_active')
      .eq('is_active', true)
      .order('campaign_name')

    setCampaigns(data || [])
  }

  async function loadTags() {
    // Load existing tags from crm_tags table
    const { data } = await supabase
      .from('crm_tags')
      .select('tag_name')
      .eq('is_active', true)
      .order('tag_name')

    if (data) {
      setAllTags(data.map(t => t.tag_name))
    }
  }

  function validateStep(step: FormStep): boolean {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.full_name.trim()) newErrors.full_name = 'Name is required'
      if (!formData.mobile.trim()) newErrors.mobile = 'Mobile is required'
      if (!/^\d{10}$/.test(formData.mobile)) newErrors.mobile = 'Mobile must be 10 digits'
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email format'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleNext() {
    if (validateStep(currentStep)) {
      setCurrentStep((currentStep + 1) as FormStep)
    }
  }

  function handleBack() {
    setCurrentStep((currentStep - 1) as FormStep)
  }

  function handleInputChange(field: keyof NewLeadForm, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  function handleAddTag(tag: string) {
    const trimmedTag = tag.trim().toLowerCase()
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag]
      }))
      setTagInput('')
      setShowTagSuggestions(false)
    }
  }

  function handleRemoveTag(tag: string) {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  function handleTagInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      handleAddTag(tagInput)
    }
  }

  function getTagSuggestions() {
    if (!tagInput.trim()) return []
    return allTags.filter(tag =>
      tag.toLowerCase().includes(tagInput.toLowerCase()) &&
      !formData.tags.includes(tag)
    ).slice(0, 5)
  }

  function toggleProductSelection(product: string, field: 'existing_products' | 'cross_sell_opportunities') {
    setFormData(prev => {
      const currentProducts = prev[field]
      if (currentProducts.includes(product)) {
        return { ...prev, [field]: currentProducts.filter(p => p !== product) }
      } else {
        return { ...prev, [field]: [...currentProducts, product] }
      }
    })
  }

  async function handleSubmit() {
    if (!validateStep(currentStep)) return

    setSaving(true)
    try {
      // Check for duplicates
      const { data: existingLead } = await supabase
        .from('crm_leads')
        .select('id')
        .eq('country_code', formData.country_code)
        .eq('mobile', formData.mobile)
        .single()

      if (existingLead) {
        setErrors({ mobile: 'A lead with this mobile number already exists' })
        setSaving(false)
        setCurrentStep(1)
        return
      }

      // Create the lead
      const { data: newLead, error } = await supabase
        .from('crm_leads')
        .insert({
          full_name: formData.full_name,
          country_code: formData.country_code,
          mobile: formData.mobile,
          email: formData.email || null,
          lead_source: formData.lead_source,
          for_whom: formData.for_whom || null,
          course: formData.course || null,
          lead_score: formData.lead_score,
          pipeline_stage: formData.pipeline_stage,
          priority: formData.priority,
          lead_temperature: formData.lead_temperature,
          tags: formData.tags,
          lead_source_detail: formData.lead_source_detail || null,
          utm_source: formData.utm_source || null,
          utm_medium: formData.utm_medium || null,
          utm_campaign: formData.utm_campaign || null,
          utm_term: formData.utm_term || null,
          utm_content: formData.utm_content || null,
          referral_source: formData.referral_source || null,
          company_name: formData.company_name || null,
          industry: formData.industry || null,
          job_title: formData.job_title || null,
          company_size: formData.company_size || null,
          expected_value: formData.expected_value,
          annual_revenue_potential: formData.annual_revenue_potential,
          deal_size_category: formData.deal_size_category || null,
          timezone: formData.timezone,
          communication_preference: formData.communication_preference,
          best_time_to_contact: formData.best_time_to_contact || null,
          language_preference: formData.language_preference,
          do_not_contact: formData.do_not_contact,
          do_not_email: formData.do_not_email,
          do_not_call: formData.do_not_call,
          do_not_whatsapp: formData.do_not_whatsapp,
          customer_segment: formData.customer_segment || null,
          risk_profile: formData.risk_profile || null,
          existing_products: formData.existing_products,
          cross_sell_opportunities: formData.cross_sell_opportunities,
          assigned_to: formData.assigned_to || null,
          primary_campaign_id: formData.primary_campaign_id || null,
          generated_by: currentUser.id,
          lead_status: 'new',
          lead_generation_date: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Save new tags to crm_tags table
      const newTags = formData.tags.filter(tag => !allTags.includes(tag))
      if (newTags.length > 0) {
        await supabase.from('crm_tags').insert(
          newTags.map(tag => ({
            tag_name: tag,
            created_by: currentUser.id,
            is_active: true
          }))
        )
      }

      // If assigned to a campaign, add to crm_campaign_leads
      if (formData.primary_campaign_id && newLead) {
        await supabase.from('crm_campaign_leads').insert({
          campaign_id: formData.primary_campaign_id,
          lead_id: newLead.id,
          response_status: 'pending'
        })
      }

      router.push(`/CRM/leads/${newLead.id}`)

    } catch (error: any) {
      console.error('Error creating lead:', error)
      setErrors({ submit: error.message || 'Failed to create lead' })
    } finally {
      setSaving(false)
    }
  }

  const BFSI_PRODUCTS = [
    'Savings Account', 'Current Account', 'Fixed Deposit', 'Recurring Deposit',
    'Personal Loan', 'Home Loan', 'Car Loan', 'Education Loan',
    'Credit Card', 'Debit Card', 'Mutual Funds', 'Insurance',
    'Wealth Management', 'NRI Services', 'Forex', 'Locker'
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Create New Lead</h1>
            <p className="text-slate-400">Fill in the details to add a new lead to your CRM</p>
          </div>
          <button
            onClick={() => router.push('/CRM/leads')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Basic Info' },
              { num: 2, label: 'Classification' },
              { num: 3, label: 'Attribution' },
              { num: 4, label: 'Value' },
              { num: 5, label: 'Preferences' },
              { num: 6, label: 'BFSI & Assign' }
            ].map((step, idx) => (
              <div key={step.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 ${
                    currentStep >= step.num
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {step.num}
                  </div>
                  <span className={`text-xs text-center ${
                    currentStep >= step.num ? 'text-green-400' : 'text-slate-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {idx < 5 && (
                  <div className={`h-1 flex-1 mx-2 ${
                    currentStep > step.num ? 'bg-green-500' : 'bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Basic Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    placeholder="John Doe"
                  />
                  {errors.full_name && <p className="text-red-400 text-sm mt-1">{errors.full_name}</p>}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Code</label>
                    <select
                      value={formData.country_code}
                      onChange={(e) => handleInputChange('country_code', e.target.value)}
                      className="w-full px-2 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    >
                      <option value="+91">+91</option>
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                      <option value="+971">+971</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Mobile <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.mobile}
                      onChange={(e) => handleInputChange('mobile', e.target.value.replace(/\D/g, ''))}
                      maxLength={10}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                      placeholder="9876543210"
                    />
                    {errors.mobile && <p className="text-red-400 text-sm mt-1">{errors.mobile}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    placeholder="john@example.com"
                  />
                  {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Lead Source</label>
                  <select
                    value={formData.lead_source}
                    onChange={(e) => handleInputChange('lead_source', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="website">Website</option>
                    <option value="webinar">Webinar</option>
                    <option value="referral">Referral</option>
                    <option value="social_media">Social Media</option>
                    <option value="cold_call">Cold Call</option>
                    <option value="event">Event</option>
                    <option value="partner">Partner</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">For Whom</label>
                  <select
                    value={formData.for_whom}
                    onChange={(e) => handleInputChange('for_whom', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="self">Self</option>
                    <option value="spouse">Spouse</option>
                    <option value="child">Child</option>
                    <option value="family_member">Family Member</option>
                    <option value="business">Business</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Course/Product</label>
                  <input
                    type="text"
                    value={formData.course}
                    onChange={(e) => handleInputChange('course', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    placeholder="e.g., AWS Certification"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Classification & Prioritization */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Classification & Prioritization</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Pipeline Stage</label>
                  <select
                    value={formData.pipeline_stage}
                    onChange={(e) => handleInputChange('pipeline_stage', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="closed_won">Closed Won</option>
                    <option value="closed_lost">Closed Lost</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Lead Temperature</label>
                  <select
                    value={formData.lead_temperature}
                    onChange={(e) => handleInputChange('lead_temperature', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="cold">Cold</option>
                    <option value="warm">Warm</option>
                    <option value="hot">Hot</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Lead Score (1-5)</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={formData.lead_score}
                    onChange={(e) => handleInputChange('lead_score', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-slate-400 mt-1">
                    <span>1</span>
                    <span className="text-green-400 font-bold">{formData.lead_score}</span>
                    <span>5</span>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tags</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => {
                        setTagInput(e.target.value)
                        setShowTagSuggestions(true)
                      }}
                      onKeyDown={handleTagInputKeyDown}
                      onFocus={() => setShowTagSuggestions(true)}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                      placeholder="Type and press Enter to add tags"
                    />

                    {/* Tag Suggestions */}
                    {showTagSuggestions && getTagSuggestions().length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {getTagSuggestions().map(tag => (
                          <button
                            key={tag}
                            onClick={() => handleAddTag(tag)}
                            className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Tags */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 rounded-full text-sm"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-400 transition-colors"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Source Attribution & Company */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Source Attribution & Company Info</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Lead Source Detail</label>
                  <input
                    type="text"
                    value={formData.lead_source_detail}
                    onChange={(e) => handleInputChange('lead_source_detail', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    placeholder="e.g., Google Ads - Certification Campaign"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">UTM Source</label>
                  <input
                    type="text"
                    value={formData.utm_source}
                    onChange={(e) => handleInputChange('utm_source', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    placeholder="google, facebook, linkedin"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">UTM Medium</label>
                  <input
                    type="text"
                    value={formData.utm_medium}
                    onChange={(e) => handleInputChange('utm_medium', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    placeholder="cpc, email, social"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">UTM Campaign</label>
                  <input
                    type="text"
                    value={formData.utm_campaign}
                    onChange={(e) => handleInputChange('utm_campaign', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    placeholder="summer_promo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Referral Source</label>
                  <input
                    type="text"
                    value={formData.referral_source}
                    onChange={(e) => handleInputChange('referral_source', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    placeholder="Referred by person/company"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    placeholder="Acme Corp"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Industry</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    placeholder="Technology, Finance, Healthcare"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Job Title</label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => handleInputChange('job_title', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    placeholder="Software Engineer, Manager"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Company Size</label>
                  <select
                    value={formData.company_size}
                    onChange={(e) => handleInputChange('company_size', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="">Select size</option>
                    <option value="startup">Startup (1-10)</option>
                    <option value="small">Small (11-50)</option>
                    <option value="medium">Medium (51-200)</option>
                    <option value="large">Large (201-1000)</option>
                    <option value="enterprise">Enterprise (1000+)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Value & Revenue */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Value & Revenue Potential</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Expected Deal Value (₹)</label>
                  <input
                    type="number"
                    value={formData.expected_value || ''}
                    onChange={(e) => handleInputChange('expected_value', e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    placeholder="50000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Annual Revenue Potential (₹)</label>
                  <input
                    type="number"
                    value={formData.annual_revenue_potential || ''}
                    onChange={(e) => handleInputChange('annual_revenue_potential', e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    placeholder="200000"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Deal Size Category</label>
                  <select
                    value={formData.deal_size_category}
                    onChange={(e) => handleInputChange('deal_size_category', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="individual">Individual (&lt; ₹1L)</option>
                    <option value="small-business">Small Business (₹1L - ₹10L)</option>
                    <option value="mid-market">Mid-Market (₹10L - ₹1Cr)</option>
                    <option value="enterprise">Enterprise (&gt; ₹1Cr)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Communication Preferences */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Communication Preferences</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Timezone</label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="America/New_York">America/New York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Communication Preference</label>
                  <select
                    value={formData.communication_preference}
                    onChange={(e) => handleInputChange('communication_preference', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="any">Any</option>
                    <option value="email">Email Only</option>
                    <option value="phone">Phone Only</option>
                    <option value="whatsapp">WhatsApp Only</option>
                    <option value="in_person">In-Person Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Best Time to Contact</label>
                  <input
                    type="text"
                    value={formData.best_time_to_contact}
                    onChange={(e) => handleInputChange('best_time_to_contact', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    placeholder="e.g., 10 AM - 12 PM, Weekdays"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Language Preference</label>
                  <select
                    value={formData.language_preference}
                    onChange={(e) => handleInputChange('language_preference', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Kannada">Kannada</option>
                    <option value="Malayalam">Malayalam</option>
                    <option value="Bengali">Bengali</option>
                  </select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Do Not Contact Preferences</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { key: 'do_not_contact', label: 'Do Not Contact' },
                      { key: 'do_not_email', label: 'Do Not Email' },
                      { key: 'do_not_call', label: 'Do Not Call' },
                      { key: 'do_not_whatsapp', label: 'Do Not WhatsApp' }
                    ].map(item => (
                      <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData[item.key as keyof NewLeadForm] as boolean}
                          onChange={(e) => handleInputChange(item.key as keyof NewLeadForm, e.target.checked)}
                          className="w-4 h-4 text-green-500 bg-slate-900 border-slate-600 rounded focus:ring-green-500"
                        />
                        <span className="text-slate-300 text-sm">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: BFSI Specific & Assignment */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">BFSI Details & Assignment</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Customer Segment</label>
                  <input
                    type="text"
                    value={formData.customer_segment}
                    onChange={(e) => handleInputChange('customer_segment', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                    placeholder="Retail, Corporate, HNI"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Risk Profile</label>
                  <select
                    value={formData.risk_profile}
                    onChange={(e) => handleInputChange('risk_profile', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="">Select risk profile</option>
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Existing Products</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-900 rounded-lg border border-slate-600">
                    {BFSI_PRODUCTS.map(product => (
                      <label key={product} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.existing_products.includes(product)}
                          onChange={() => toggleProductSelection(product, 'existing_products')}
                          className="w-4 h-4 text-green-500 bg-slate-900 border-slate-600 rounded focus:ring-green-500"
                        />
                        <span className="text-slate-300 text-sm">{product}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Cross-Sell Opportunities</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-900 rounded-lg border border-slate-600">
                    {BFSI_PRODUCTS.map(product => (
                      <label key={product} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.cross_sell_opportunities.includes(product)}
                          onChange={() => toggleProductSelection(product, 'cross_sell_opportunities')}
                          className="w-4 h-4 text-blue-500 bg-slate-900 border-slate-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-slate-300 text-sm">{product}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Assign To</label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => handleInputChange('assigned_to', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} - {emp.job_role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Associate with Campaign (Optional)</label>
                  <select
                    value={formData.primary_campaign_id}
                    onChange={(e) => handleInputChange('primary_campaign_id', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  >
                    <option value="">No Campaign</option>
                    {campaigns.map(campaign => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.campaign_name} ({campaign.campaign_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {errors.submit && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
              {errors.submit}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              currentStep === 1
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}
          >
            Back
          </button>

          {currentStep < 6 ? (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating Lead...' : 'Create Lead'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
