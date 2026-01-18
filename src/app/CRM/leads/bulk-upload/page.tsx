'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface ParsedLead {
  full_name: string
  country_code: string
  mobile: string
  email: string
  lead_source: string
  for_whom: string
  course: string
  lead_score: number
  assigned_to?: string
  isValid: boolean
  errors: string[]
  isDuplicate?: boolean
}

export default function BulkUploadPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([])
  const [existingMobiles, setExistingMobiles] = useState<Set<string>>(new Set())
  const [defaultAssignee, setDefaultAssignee] = useState('')
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
      await Promise.all([loadEmployees(), loadExistingMobiles()])

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
      .eq('is_active', true)
      .order('full_name')

    setEmployees(data || [])
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

    // Find column indices
    const nameIdx = header.findIndex(h => h.includes('name'))
    const mobileIdx = header.findIndex(h => h.includes('mobile') || h.includes('phone'))
    const emailIdx = header.findIndex(h => h.includes('email'))
    const sourceIdx = header.findIndex(h => h.includes('source'))
    const forWhomIdx = header.findIndex(h => h.includes('for_whom') || h.includes('category'))
    const courseIdx = header.findIndex(h => h.includes('course'))
    const scoreIdx = header.findIndex(h => h.includes('score'))

    const parsed: ParsedLead[] = []
    const seenMobiles = new Set<string>()

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      const errors: string[] = []

      const name = values[nameIdx]?.trim() || ''
      let mobile = values[mobileIdx]?.trim().replace(/\D/g, '') || ''
      const email = emailIdx >= 0 ? values[emailIdx]?.trim() || '' : ''
      const source = sourceIdx >= 0 ? values[sourceIdx]?.trim().toLowerCase() || 'other' : 'other'
      const forWhom = forWhomIdx >= 0 ? values[forWhomIdx]?.trim().toLowerCase() || 'self' : 'self'
      const course = courseIdx >= 0 ? values[courseIdx]?.trim() || '' : ''
      const score = scoreIdx >= 0 ? parseInt(values[scoreIdx]) || 3 : 3

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
      const validSources = ['webinar', 'self', 'referred', 'resume_upload', 'ai_spot', 'social_media', 'website', 'other']
      const normalizedSource = validSources.includes(source) ? source : 'other'

      // Normalize for_whom
      const validForWhom = ['self', 'kids', 'college', 'working_professional', 'tech_dev', 'other']
      const normalizedForWhom = validForWhom.includes(forWhom) ? forWhom : 'self'

      parsed.push({
        full_name: name,
        country_code: countryCode,
        mobile: mobile,
        email: email,
        lead_source: normalizedSource,
        for_whom: normalizedForWhom,
        course: course,
        lead_score: Math.min(5, Math.max(1, score)),
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

    for (const lead of validLeads) {
      try {
        const { data: newLead, error } = await supabase
          .from('crm_leads')
          .insert({
            full_name: lead.full_name,
            country_code: lead.country_code,
            mobile: lead.mobile,
            email: lead.email || null,
            lead_source: lead.lead_source,
            for_whom: lead.for_whom,
            course: lead.course || null,
            lead_score: lead.lead_score,
            lead_status: 'new',
            lead_generation_date: new Date().toISOString().split('T')[0],
            assigned_to: defaultAssignee,
            generated_by: currentUser.id
          })
          .select()
          .single()

        if (error) throw error

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
    setSuccess(`Successfully uploaded ${successCount} leads!`)

    // Reload existing mobiles
    await loadExistingMobiles()
  }

  function downloadTemplate() {
    const headers = 'name,mobile,email,source,for_whom,course,score'
    const example = 'John Doe,9876543210,john@email.com,webinar,working_professional,AI Fundamentals,3'
    const csv = `${headers}\n${example}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads_template.csv'
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  className="flex items-center justify-center gap-2 w-full px-4 py-8 bg-slate-900 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-amber-500 hover:text-amber-400 cursor-pointer transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Click to upload CSV</span>
                </label>
              </div>
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">Default Assignee</label>
              <select
                value={defaultAssignee}
                onChange={(e) => setDefaultAssignee(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
              >
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </select>

              <div className="mt-4 p-4 bg-slate-900 rounded-lg">
                <h4 className="text-sm font-medium text-slate-300 mb-2">CSV Format</h4>
                <p className="text-xs text-slate-500">
                  Required: name, mobile<br />
                  Optional: email, source, for_whom, course, score
                </p>
              </div>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Source</th>
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
                      <td className="px-4 py-3 text-slate-300 text-sm capitalize">{lead.lead_source}</td>
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
            <div className="space-y-3 text-slate-300 text-sm">
              <p>1. Download the template CSV file using the button above</p>
              <p>2. Fill in the lead data following the column format</p>
              <p>3. Upload your CSV file to preview and validate the data</p>
              <p>4. Review any errors and fix them in your CSV if needed</p>
              <p>5. Click "Upload" to import all valid leads</p>
            </div>

            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <h4 className="text-amber-400 font-medium mb-2">Column Reference</h4>
              <ul className="text-sm text-slate-300 space-y-1">
                <li><strong>name</strong> (required): Full name of the lead</li>
                <li><strong>mobile</strong> (required): 10-digit mobile number</li>
                <li><strong>email</strong>: Email address</li>
                <li><strong>source</strong>: webinar, self, referred, ai_spot, social_media, website, other</li>
                <li><strong>for_whom</strong>: self, kids, college, working_professional, tech_dev, other</li>
                <li><strong>course</strong>: Course name they're interested in</li>
                <li><strong>score</strong>: 1-5 (1=cold, 5=hot)</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
