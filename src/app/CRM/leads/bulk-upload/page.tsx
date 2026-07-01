'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface ParsedLead {
  // Basic fields
  full_name: string
  country_code: string
  mobile: string
  email: string
  lead_source: string
  for_whom: string
  course: string
  lead_score: number

  // Enterprise fields
  tags: string[]
  pipeline_stage: string
  priority: string
  lead_temperature: string
  company_name: string
  industry: string
  job_title: string
  company_size: string
  expected_value: number | null
  annual_revenue_potential: number | null
  deal_size_category: string
  timezone: string
  communication_preference: string
  language_preference: string
  customer_segment: string

  // Assignment
  assigned_to?: string
  primary_campaign_id?: string

  // Validation
  isValid: boolean
  errors: string[]
  isDuplicate?: boolean
}

export default function BulkUploadPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([])
  const [existingMobiles, setExistingMobiles] = useState<Set<string>>(new Set())
  const [defaultAssignee, setDefaultAssignee] = useState('')
  const [defaultCampaign, setDefaultCampaign] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadStats, setUploadStats] = useState({ total: 0, success: 0, failed: 0, duplicates: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      setDefaultAssignee(session.employee.id)
      await Promise.all([
        loadEmployees(),
        loadExistingMobiles(),
        loadCampaigns()
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
      .select('id, campaign_name, campaign_type')
      .eq('is_active', true)
      .order('campaign_name')

    setCampaigns(data || [])
  }

  async function loadExistingMobiles() {
    const { data } = await supabase
      .from('crm_leads')
      .select('country_code, mobile')

    const mobiles = new Set<string>()
    data?.forEach(l => {
      mobiles.add(`${l.country_code}${l.mobile}`)
    })
    setExistingMobiles(mobiles)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      parseCSV(text)
    }
    reader.readAsText(file)
  }

  function parseCSV(text: string) {
    setError('')
    const lines = text.split('\n').map(line => line.trim()).filter(line => line)

    if (lines.length < 2) {
      setError('CSV file must have at least a header row and one data row')
      return
    }

    // Parse header
    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))
    const requiredCols = ['name', 'mobile']
    const missingCols = requiredCols.filter(c => !header.some(h => h.includes(c)))

    if (missingCols.length > 0) {
      setError(`Missing required columns: ${missingCols.join(', ')}`)
      return
    }

    // Find column indices (with flexible matching)
    const getIdx = (patterns: string[]) => {
      for (const pattern of patterns) {
        const idx = header.findIndex(h => h.includes(pattern))
        if (idx >= 0) return idx
      }
      return -1
    }

    const nameIdx = getIdx(['name'])
    const mobileIdx = getIdx(['mobile', 'phone'])
    const emailIdx = getIdx(['email'])
    const sourceIdx = getIdx(['source', 'lead_source'])
    const forWhomIdx = getIdx(['for_whom', 'category', 'for whom'])
    const courseIdx = getIdx(['course', 'product'])
    const scoreIdx = getIdx(['score', 'lead_score'])
    const tagsIdx = getIdx(['tags', 'tag'])
    const stageIdx = getIdx(['stage', 'pipeline_stage', 'pipeline stage'])
    const priorityIdx = getIdx(['priority'])
    const tempIdx = getIdx(['temperature', 'lead_temperature', 'temp'])
    const companyIdx = getIdx(['company', 'company_name', 'company name'])
    const industryIdx = getIdx(['industry'])
    const jobTitleIdx = getIdx(['job_title', 'job title', 'title'])
    const companySizeIdx = getIdx(['company_size', 'company size', 'size'])
    const expectedValueIdx = getIdx(['expected_value', 'expected value', 'deal_value', 'value'])
    const annualRevenueIdx = getIdx(['annual_revenue', 'annual revenue', 'revenue'])
    const dealSizeIdx = getIdx(['deal_size', 'deal size', 'deal_category'])
    const timezoneIdx = getIdx(['timezone', 'time_zone'])
    const commPrefIdx = getIdx(['communication_preference', 'comm_pref', 'preference'])
    const languageIdx = getIdx(['language', 'language_preference'])
    const segmentIdx = getIdx(['segment', 'customer_segment'])

    const parsed: ParsedLead[] = []
    const seenMobiles = new Set<string>()

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      const errors: string[] = []

      const name = values[nameIdx]?.trim() || ''
      let mobile = values[mobileIdx]?.trim().replace(/\D/g, '') || ''
      const email = emailIdx >= 0 ? values[emailIdx]?.trim() || '' : ''
      const source = sourceIdx >= 0 ? values[sourceIdx]?.trim().toLowerCase() || 'website' : 'website'
      const forWhom = forWhomIdx >= 0 ? values[forWhomIdx]?.trim().toLowerCase() || 'self' : 'self'
      const course = courseIdx >= 0 ? values[courseIdx]?.trim() || '' : ''
      const score = scoreIdx >= 0 ? parseInt(values[scoreIdx]) || 3 : 3

      // Parse tags (comma-separated)
      const tagsRaw = tagsIdx >= 0 ? values[tagsIdx]?.trim() || '' : ''
      const tags = tagsRaw ? tagsRaw.split(';').map(t => t.trim().toLowerCase()).filter(t => t) : []

      // Parse enterprise fields
      const stage = stageIdx >= 0 ? values[stageIdx]?.trim() || 'new' : 'new'
      const priority = priorityIdx >= 0 ? values[priorityIdx]?.trim() || 'medium' : 'medium'
      const temperature = tempIdx >= 0 ? values[tempIdx]?.trim() || 'cold' : 'cold'
      const company = companyIdx >= 0 ? values[companyIdx]?.trim() || '' : ''
      const industry = industryIdx >= 0 ? values[industryIdx]?.trim() || '' : ''
      const jobTitle = jobTitleIdx >= 0 ? values[jobTitleIdx]?.trim() || '' : ''
      const companySize = companySizeIdx >= 0 ? values[companySizeIdx]?.trim() || '' : ''
      const expectedValue = expectedValueIdx >= 0 ? parseFloat(values[expectedValueIdx]) || null : null
      const annualRevenue = annualRevenueIdx >= 0 ? parseFloat(values[annualRevenueIdx]) || null : null
      const dealSize = dealSizeIdx >= 0 ? values[dealSizeIdx]?.trim() || 'individual' : 'individual'
      const timezone = timezoneIdx >= 0 ? values[timezoneIdx]?.trim() || 'Asia/Kolkata' : 'Asia/Kolkata'
      const commPref = commPrefIdx >= 0 ? values[commPrefIdx]?.trim() || 'any' : 'any'
      const language = languageIdx >= 0 ? values[languageIdx]?.trim() || 'English' : 'English'
      const segment = segmentIdx >= 0 ? values[segmentIdx]?.trim() || '' : ''

      // Determine country code
      let countryCode = '+91'
      if (mobile.startsWith('91') && mobile.length > 10) {
        mobile = mobile.substring(2)
      } else if (mobile.startsWith('1') && mobile.length === 11) {
        countryCode = '+1'
        mobile = mobile.substring(1)
      }

      // Validation
      if (!name) errors.push('Name is required')
      if (!mobile || mobile.length < 10) errors.push('Invalid mobile number')
      if (email && !email.includes('@')) errors.push('Invalid email format')

      // Check duplicates
      const fullMobile = `${countryCode}${mobile}`
      const isDuplicate = existingMobiles.has(fullMobile) || seenMobiles.has(fullMobile)
      if (isDuplicate) {
        errors.push('Duplicate mobile number')
      }
      seenMobiles.add(fullMobile)

      // Normalize source
      const validSources = ['webinar', 'referral', 'social_media', 'website', 'cold_call', 'event', 'partner', 'other']
      const normalizedSource = validSources.includes(source) ? source : 'website'

      parsed.push({
        full_name: name,
        country_code: countryCode,
        mobile: mobile,
        email: email,
        lead_source: normalizedSource,
        for_whom: forWhom,
        course: course,
        lead_score: Math.min(5, Math.max(1, score)),
        tags: tags,
        pipeline_stage: stage,
        priority: priority,
        lead_temperature: temperature,
        company_name: company,
        industry: industry,
        job_title: jobTitle,
        company_size: companySize,
        expected_value: expectedValue,
        annual_revenue_potential: annualRevenue,
        deal_size_category: dealSize,
        timezone: timezone,
        communication_preference: commPref,
        language_preference: language,
        customer_segment: segment,
        isValid: errors.length === 0,
        errors: errors,
        isDuplicate: isDuplicate
      })
    }

    setParsedLeads(parsed)
    setUploadStats({
      total: parsed.length,
      success: 0,
      failed: 0,
      duplicates: parsed.filter(l => l.isDuplicate).length
    })
  }

  function parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  async function handleUpload() {
    const validLeads = parsedLeads.filter(l => l.isValid)
    if (validLeads.length === 0) {
      setError('No valid leads to upload')
      return
    }

    setUploading(true)
    setError('')
    let successCount = 0
    let failedCount = 0

    const batchId = crypto.randomUUID()
    const newTags = new Set<string>()

    for (const lead of validLeads) {
      try {
        // Collect unique tags
        lead.tags.forEach(tag => newTags.add(tag))

        const { data: newLead, error } = await supabase
          .from('crm_leads')
          .insert({
            full_name: lead.full_name,
            country_code: lead.country_code,
            mobile: lead.mobile,
            email: lead.email || null,
            lead_source: lead.lead_source,
            for_whom: lead.for_whom || null,
            course: lead.course || null,
            lead_score: lead.lead_score,
            lead_status: 'new',
            lead_generation_date: new Date().toISOString(),
            assigned_to: defaultAssignee,
            generated_by: currentUser.id,
            // Enterprise fields
            tags: lead.tags,
            pipeline_stage: lead.pipeline_stage,
            priority: lead.priority,
            lead_temperature: lead.lead_temperature,
            company_name: lead.company_name || null,
            industry: lead.industry || null,
            job_title: lead.job_title || null,
            company_size: lead.company_size || null,
            expected_value: lead.expected_value,
            annual_revenue_potential: lead.annual_revenue_potential,
            deal_size_category: lead.deal_size_category || null,
            timezone: lead.timezone,
            communication_preference: lead.communication_preference,
            language_preference: lead.language_preference,
            customer_segment: lead.customer_segment || null,
            primary_campaign_id: defaultCampaign || null
          })
          .select()
          .single()

        if (error) throw error

        // Add to campaign if specified
        if (defaultCampaign && newLead) {
          await supabase.from('crm_campaign_leads').insert({
            campaign_id: defaultCampaign,
            lead_id: newLead.id,
            response_status: 'pending'
          })
        }

        // Log assignment
        await supabase.from('crm_lead_assignments').insert({
          lead_id: newLead.id,
          assigned_from: null,
          assigned_to: defaultAssignee,
          assigned_by: currentUser.id,
          assignment_reason: 'Bulk upload',
          bulk_batch_id: batchId
        })

        successCount++
      } catch (err) {
        console.error('Failed to upload lead:', lead.full_name, err)
        failedCount++
      }
    }

    // Save new tags to crm_tags table
    if (newTags.size > 0) {
      // Get existing tags
      const { data: existingTags } = await supabase
        .from('crm_tags')
        .select('tag_name')
        .in('tag_name', Array.from(newTags))

      const existingTagNames = new Set(existingTags?.map(t => t.tag_name) || [])
      const tagsToInsert = Array.from(newTags).filter(tag => !existingTagNames.has(tag))

      if (tagsToInsert.length > 0) {
        await supabase.from('crm_tags').insert(
          tagsToInsert.map(tag => ({
            tag_name: tag,
            created_by: currentUser.id,
            is_active: true
          }))
        )
      }
    }

    // Log audit
    await supabase.from('crm_audit_log').insert({
      employee_id: currentUser.id,
      emp_id: currentUser.emp_id,
      action: 'bulk_upload',
      entity_type: 'lead',
      description: `Bulk uploaded ${successCount} leads (${failedCount} failed)`
    })

    setUploadStats(prev => ({
      ...prev,
      success: successCount,
      failed: failedCount
    }))

    setUploading(false)
    setSuccess(`Successfully uploaded ${successCount} leads!${failedCount > 0 ? ` (${failedCount} failed)` : ''}`)

    // Reload existing mobiles
    await loadExistingMobiles()
  }

  function downloadTemplate() {
    const headers = [
      'name', 'mobile', 'email', 'source', 'for_whom', 'course', 'score',
      'tags', 'stage', 'priority', 'temperature',
      'company', 'industry', 'job_title', 'company_size',
      'expected_value', 'annual_revenue', 'deal_size',
      'timezone', 'communication_preference', 'language', 'customer_segment'
    ].join(',')

    const example = [
      'John Doe', '9876543210', 'john@email.com', 'website', 'self', 'AWS Certification', '3',
      'hot-lead;enterprise', 'qualified', 'high', 'warm',
      'Tech Corp', 'Technology', 'Software Engineer', 'medium',
      '50000', '200000', 'small-business',
      'Asia/Kolkata', 'email', 'English', 'Corporate'
    ].join(',')

    const csv = `${headers}\n${example}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads_enterprise_template.csv'
    a.click()
  }

  function clearData() {
    setParsedLeads([])
    setError('')
    setSuccess('')
    setUploadStats({ total: 0, success: 0, failed: 0, duplicates: 0 })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/CRM/leads')}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-white font-bold text-lg">Bulk Upload Leads</h1>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                Enterprise Fields Supported
              </span>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Template
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl">
            {success}
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Upload CSV File</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* File Input */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">Select CSV File</label>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csvUpload"
                />
                <label
                  htmlFor="csvUpload"
                  className="flex flex-col items-center justify-center gap-2 w-full px-4 py-8 bg-slate-900 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-amber-500 hover:text-amber-400 cursor-pointer transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm">Click to upload CSV</span>
                </label>
              </div>
            </div>

            {/* Default Assignee */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">Default Assignee</label>
              <select
                value={defaultAssignee}
                onChange={(e) => setDefaultAssignee(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
              >
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.full_name} - {e.job_role}</option>
                ))}
              </select>

              <label className="block text-sm text-slate-300 mb-2 mt-4">Default Campaign (Optional)</label>
              <select
                value={defaultCampaign}
                onChange={(e) => setDefaultCampaign(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
              >
                <option value="">No Campaign</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.campaign_name} ({c.campaign_type})</option>
                ))}
              </select>
            </div>

            {/* Instructions */}
            <div className="p-4 bg-slate-900 rounded-lg">
              <h4 className="text-sm font-medium text-slate-300 mb-2">CSV Format</h4>
              <p className="text-xs text-slate-500 mb-2">
                <strong className="text-green-400">Required:</strong> name, mobile
              </p>
              <p className="text-xs text-slate-500 mb-2">
                <strong className="text-blue-400">Optional:</strong> email, source, course, score
              </p>
              <p className="text-xs text-slate-500 mb-2">
                <strong className="text-purple-400">Enterprise:</strong> tags, stage, priority, temperature, company, industry, job_title, expected_value
              </p>
              <p className="text-xs text-amber-400 mt-2">
                💡 Separate tags with semicolon (;)
              </p>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        {parsedLeads.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            {/* Stats */}
            <div className="p-4 border-b border-slate-700 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Total:</span>
                <span className="text-white font-semibold">{uploadStats.total}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Valid:</span>
                <span className="text-green-400 font-semibold">{parsedLeads.filter(l => l.isValid).length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Invalid:</span>
                <span className="text-red-400 font-semibold">{parsedLeads.filter(l => !l.isValid).length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Duplicates:</span>
                <span className="text-amber-400 font-semibold">{uploadStats.duplicates}</span>
              </div>

              {uploadStats.success > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">Uploaded:</span>
                  <span className="text-green-400 font-semibold">{uploadStats.success}</span>
                </div>
              )}

              <div className="ml-auto flex gap-2">
                <button
                  onClick={clearData}
                  className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg text-sm"
                >
                  Clear
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || parsedLeads.filter(l => l.isValid).length === 0}
                  className={`px-6 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    uploading || parsedLeads.filter(l => l.isValid).length === 0
                      ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-600 text-slate-900'
                  }`}
                >
                  {uploading ? 'Uploading...' : `Upload ${parsedLeads.filter(l => l.isValid).length} Leads`}
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-96">
              <table className="w-full">
                <thead className="bg-slate-900/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Mobile</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Tags</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Stage</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {parsedLeads.map((lead, idx) => (
                    <tr key={idx} className={`${!lead.isValid ? 'bg-red-500/5' : ''}`}>
                      <td className="px-4 py-3 text-slate-500 text-sm">{idx + 1}</td>
                      <td className="px-4 py-3">
                        {lead.isValid ? (
                          <span className="inline-flex items-center gap-1 text-green-400 text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400 text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Invalid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white text-sm">{lead.full_name || '-'}</td>
                      <td className="px-4 py-3 text-white text-sm">{lead.country_code} {lead.mobile || '-'}</td>
                      <td className="px-4 py-3 text-slate-300 text-sm">{lead.email || '-'}</td>
                      <td className="px-4 py-3 text-slate-300 text-sm">{lead.company_name || '-'}</td>
                      <td className="px-4 py-3">
                        {lead.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {lead.tags.map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-sm capitalize">{lead.pipeline_stage}</td>
                      <td className="px-4 py-3">
                        {lead.errors.length > 0 && (
                          <span className="text-red-400 text-xs">{lead.errors.join(', ')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Instructions */}
        {parsedLeads.length === 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Instructions</h3>
            <div className="space-y-3 text-slate-300 text-sm mb-6">
              <p>1. Download the template CSV file using the button above</p>
              <p>2. Fill in the lead data following the column format</p>
              <p>3. Upload your CSV file to preview and validate the data</p>
              <p>4. Review any errors and fix them in your CSV if needed</p>
              <p>5. Select default assignee and campaign (optional)</p>
              <p>6. Click "Upload" to import all valid leads</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h4 className="text-blue-400 font-medium mb-2">Required Fields</h4>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li><strong>name</strong>: Full name of the lead</li>
                  <li><strong>mobile</strong>: 10-digit mobile number</li>
                </ul>
              </div>

              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <h4 className="text-green-400 font-medium mb-2">Basic Optional Fields</h4>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li><strong>email</strong>: Email address</li>
                  <li><strong>source</strong>: website, webinar, referral, social_media, cold_call, event, partner, other</li>
                  <li><strong>for_whom</strong>: self, kids, college, working_professional, tech_dev, other</li>
                  <li><strong>course</strong>: Course/product name</li>
                  <li><strong>score</strong>: 1-5 (1=cold, 5=hot)</li>
                </ul>
              </div>

              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <h4 className="text-purple-400 font-medium mb-2">Enterprise Fields</h4>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li><strong>tags</strong>: Semicolon-separated tags (e.g., hot-lead;enterprise)</li>
                  <li><strong>stage</strong>: new, contacted, qualified, proposal, negotiation, closed_won, closed_lost</li>
                  <li><strong>priority</strong>: low, medium, high, urgent</li>
                  <li><strong>temperature</strong>: cold, warm, hot</li>
                  <li><strong>company</strong>: Company name</li>
                  <li><strong>industry</strong>: Industry sector</li>
                  <li><strong>job_title</strong>: Job title of the lead</li>
                  <li><strong>company_size</strong>: startup, small, medium, large, enterprise</li>
                </ul>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <h4 className="text-amber-400 font-medium mb-2">Value & Preferences</h4>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li><strong>expected_value</strong>: Expected deal value in ₹</li>
                  <li><strong>annual_revenue</strong>: Annual revenue potential in ₹</li>
                  <li><strong>deal_size</strong>: individual, small-business, mid-market, enterprise</li>
                  <li><strong>timezone</strong>: Asia/Kolkata, America/New_York, etc.</li>
                  <li><strong>communication_preference</strong>: any, email, phone, whatsapp, in_person</li>
                  <li><strong>language</strong>: English, Hindi, Tamil, etc.</li>
                  <li><strong>customer_segment</strong>: Retail, Corporate, HNI, etc.</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <h4 className="text-red-400 font-medium mb-2">⚠️ Important Notes</h4>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Duplicate mobile numbers will be detected and skipped</li>
                <li>• All leads will be assigned to the selected default assignee</li>
                <li>• Tags are case-insensitive and will be converted to lowercase</li>
                <li>• Use semicolon (;) to separate multiple tags, not comma</li>
                <li>• If a campaign is selected, all leads will be added to that campaign</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
