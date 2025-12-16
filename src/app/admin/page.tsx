'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Admin credentials
const ADMIN_USERNAME = 'arijitwith'
const ADMIN_PASSWORD = 'reach500'

// Base URL for the webinar landing page
const BASE_URL = 'https://webinar.ostaran.com'

interface UTMCampaign {
  id: string
  campaign_id: number
  campaign_name: string
  campaign_description: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_term: string
  utm_content: string
  base_url: string
  full_url: string
  placement_location: string
  placement_city: string
  is_active: boolean
  total_scans: number
  total_registrations: number
  created_at: string
}

interface Registration {
  id: string
  registration_id: number
  full_name: string
  email: string
  mobile: string
  age: string
  profession_choice: string
  course_id: number
  course_name: string
  webinar_date: string
  webinar_time: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  device_type: string
  registered_at: string
  registration_status: string
}

interface DailyCount {
  date: string
  count: number
}

// Simple Line Chart Component
function LineChart({ data, height = 200 }: { data: DailyCount[], height?: number }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        No data available for chart
      </div>
    )
  }

  const maxCount = Math.max(...data.map(d => d.count), 1)
  const padding = 40
  const chartWidth = 100 // percentage
  const chartHeight = height - padding * 2

  // Calculate points for the line
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * 100
    const y = 100 - (d.count / maxCount) * 100
    return { x, y, ...d }
  })

  // Create SVG path
  const linePath = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ')

  // Create area path (for gradient fill)
  const areaPath = `${linePath} L ${points[points.length - 1]?.x || 0} 100 L 0 100 Z`

  return (
    <div className="relative" style={{ height }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-xs text-gray-400">
        <span>{maxCount}</span>
        <span>{Math.round(maxCount / 2)}</span>
        <span>0</span>
      </div>
      
      {/* Chart area */}
      <div className="absolute left-12 right-0 top-0 bottom-8">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          {/* Grid lines */}
          <line x1="0" y1="0" x2="100" y2="0" stroke="#e5e7eb" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2" />
          <line x1="0" y1="100" x2="100" y2="100" stroke="#e5e7eb" strokeWidth="0.5" />
          
          {/* Gradient fill */}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#areaGradient)" />
          
          {/* Line */}
          <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          
          {/* Data points */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366f1" stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        
        {/* Hover tooltips */}
        <div className="absolute inset-0 flex">
          {points.map((p, i) => (
            <div 
              key={i} 
              className="flex-1 group relative"
              style={{ cursor: 'pointer' }}
            >
              <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                {p.date}: {p.count} registrations
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* X-axis labels */}
      <div className="absolute left-12 right-0 bottom-0 h-6 flex justify-between text-xs text-gray-400">
        {data.length <= 7 ? (
          data.map((d, i) => (
            <span key={i} className="text-center" style={{ width: `${100 / data.length}%` }}>
              {new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          ))
        ) : (
          <>
            <span>{new Date(data[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            <span>{new Date(data[Math.floor(data.length / 2)].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            <span>{new Date(data[data.length - 1].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [activeTab, setActiveTab] = useState<'utm' | 'analytics'>('utm')
  
  // UTM State
  const [campaigns, setCampaigns] = useState<UTMCampaign[]>([])
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<UTMCampaign | null>(null)
  const [campaignForm, setCampaignForm] = useState({
    campaign_name: '',
    campaign_description: '',
    utm_source: '',
    utm_medium: 'qr_code',
    utm_campaign: '',
    utm_term: '',
    utm_content: '',
    placement_location: '',
    placement_city: '',
    is_active: true
  })
  
  // Analytics State
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    utmSource: '',
    utmCampaign: '',
    courseId: '',
    profession: ''
  })
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0
  })
  
  // New state for dropdown options and chart data
  const [utmSourceOptions, setUtmSourceOptions] = useState<string[]>([])
  const [utmCampaignOptions, setUtmCampaignOptions] = useState<string[]>([])
  const [dailyRegistrations, setDailyRegistrations] = useState<DailyCount[]>([])

  // Check auth on mount
  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
      fetchCampaigns()
      fetchRegistrations()
      fetchUTMOptions()
    }
  }, [])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      sessionStorage.setItem('admin_auth', 'true')
      setLoginError('')
      fetchCampaigns()
      fetchRegistrations()
      fetchUTMOptions()
    } else {
      setLoginError('Invalid credentials')
    }
  }

  function handleLogout() {
    setIsAuthenticated(false)
    sessionStorage.removeItem('admin_auth')
  }

  async function fetchCampaigns() {
    try {
      const { data, error } = await supabase
        .from('qr_utm_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setCampaigns(data || [])
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    }
  }

  // Fetch unique UTM sources and campaigns for dropdowns
  async function fetchUTMOptions() {
    try {
      // Fetch unique UTM sources from registrations
      const { data: sourceData, error: sourceError } = await supabase
        .from('qr_landing_registrations')
        .select('utm_source')
        .not('utm_source', 'is', null)
        .not('utm_source', 'eq', '')
      
      if (!sourceError && sourceData) {
        const uniqueSources = [...new Set(sourceData.map(d => d.utm_source).filter(Boolean))]
        setUtmSourceOptions(uniqueSources.sort())
      }

      // Fetch unique UTM campaigns from registrations
      const { data: campaignData, error: campaignError } = await supabase
        .from('qr_landing_registrations')
        .select('utm_campaign')
        .not('utm_campaign', 'is', null)
        .not('utm_campaign', 'eq', '')
      
      if (!campaignError && campaignData) {
        const uniqueCampaigns = [...new Set(campaignData.map(d => d.utm_campaign).filter(Boolean))]
        setUtmCampaignOptions(uniqueCampaigns.sort())
      }

      // Also fetch from UTM campaigns table and merge
      const { data: utmTableData, error: utmTableError } = await supabase
        .from('qr_utm_campaigns')
        .select('utm_source, utm_campaign')
      
      if (!utmTableError && utmTableData) {
        const tableSources = utmTableData.map(d => d.utm_source).filter(Boolean)
        const tableCampaigns = utmTableData.map(d => d.utm_campaign).filter(Boolean)
        
        setUtmSourceOptions(prev => [...new Set([...prev, ...tableSources])].sort())
        setUtmCampaignOptions(prev => [...new Set([...prev, ...tableCampaigns])].sort())
      }
    } catch (error) {
      console.error('Error fetching UTM options:', error)
    }
  }

  async function fetchRegistrations() {
    setAnalyticsLoading(true)
    try {
      let query = supabase
        .from('qr_landing_registrations')
        .select('*')
        .order('registered_at', { ascending: false })
        .limit(500)

      if (filters.dateFrom) {
        query = query.gte('registered_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('registered_at', filters.dateTo + 'T23:59:59')
      }
      if (filters.utmSource) {
        query = query.eq('utm_source', filters.utmSource)
      }
      if (filters.utmCampaign) {
        query = query.eq('utm_campaign', filters.utmCampaign)
      }
      if (filters.courseId) {
        query = query.eq('course_id', parseInt(filters.courseId))
      }
      if (filters.profession) {
        query = query.eq('profession_choice', filters.profession)
      }

      const { data, error } = await query

      if (error) throw error
      setRegistrations(data || [])

      // Calculate stats
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      const allData = data || []
      setStats({
        total: allData.length,
        today: allData.filter(r => new Date(r.registered_at) >= today).length,
        thisWeek: allData.filter(r => new Date(r.registered_at) >= weekAgo).length,
        thisMonth: allData.filter(r => new Date(r.registered_at) >= monthAgo).length
      })

      // Calculate daily registrations for chart
      calculateDailyRegistrations(allData)
    } catch (error) {
      console.error('Error fetching registrations:', error)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  function calculateDailyRegistrations(data: Registration[]) {
    if (!data || data.length === 0) {
      setDailyRegistrations([])
      return
    }

    // Group by date
    const dateMap: { [key: string]: number } = {}
    
    data.forEach(reg => {
      const date = new Date(reg.registered_at).toISOString().split('T')[0]
      dateMap[date] = (dateMap[date] || 0) + 1
    })

    // Get date range (last 14 days or from data range)
    const dates = Object.keys(dateMap).sort()
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 13 * 24 * 60 * 60 * 1000) // Last 14 days

    // Fill in missing dates with 0
    const dailyData: DailyCount[] = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      dailyData.push({
        date: dateStr,
        count: dateMap[dateStr] || 0
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    setDailyRegistrations(dailyData)
  }

  async function saveCampaign(e: React.FormEvent) {
    e.preventDefault()
    try {
      const fullUrl = `${BASE_URL}?utm_source=${campaignForm.utm_source}&utm_medium=${campaignForm.utm_medium}&utm_campaign=${campaignForm.utm_campaign}${campaignForm.utm_term ? `&utm_term=${campaignForm.utm_term}` : ''}${campaignForm.utm_content ? `&utm_content=${campaignForm.utm_content}` : ''}`

      const campaignData = {
        ...campaignForm,
        base_url: BASE_URL,
        full_url: fullUrl
      }

      if (editingCampaign) {
        const { error } = await supabase
          .from('qr_utm_campaigns')
          .update(campaignData)
          .eq('id', editingCampaign.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('qr_utm_campaigns')
          .insert([campaignData])
        if (error) throw error
      }

      setShowCampaignForm(false)
      setEditingCampaign(null)
      resetCampaignForm()
      fetchCampaigns()
      fetchUTMOptions() // Refresh dropdown options
    } catch (error) {
      console.error('Error saving campaign:', error)
    }
  }

  function resetCampaignForm() {
    setCampaignForm({
      campaign_name: '',
      campaign_description: '',
      utm_source: '',
      utm_medium: 'qr_code',
      utm_campaign: '',
      utm_term: '',
      utm_content: '',
      placement_location: '',
      placement_city: '',
      is_active: true
    })
  }

  function editCampaign(campaign: UTMCampaign) {
    setEditingCampaign(campaign)
    setCampaignForm({
      campaign_name: campaign.campaign_name,
      campaign_description: campaign.campaign_description || '',
      utm_source: campaign.utm_source,
      utm_medium: campaign.utm_medium,
      utm_campaign: campaign.utm_campaign,
      utm_term: campaign.utm_term || '',
      utm_content: campaign.utm_content || '',
      placement_location: campaign.placement_location || '',
      placement_city: campaign.placement_city || '',
      is_active: campaign.is_active
    })
    setShowCampaignForm(true)
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Are you sure you want to delete this campaign?')) return
    try {
      const { error } = await supabase
        .from('qr_utm_campaigns')
        .delete()
        .eq('id', id)
      if (error) throw error
      fetchCampaigns()
      fetchUTMOptions() // Refresh dropdown options
    } catch (error) {
      console.error('Error deleting campaign:', error)
    }
  }

  function generateQRCode(url: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`
  }

  function exportToCSV() {
    if (registrations.length === 0) return

    const headers = ['Name', 'Email', 'Mobile', 'Age', 'Profession', 'Course', 'UTM Source', 'UTM Campaign', 'Device', 'Registered At']
    const rows = registrations.map(r => [
      r.full_name,
      r.email,
      r.mobile,
      r.age || '',
      r.profession_choice,
      r.course_name,
      r.utm_source || 'Direct',
      r.utm_campaign || '',
      r.device_type || '',
      new Date(r.registered_at).toLocaleString('en-IN')
    ])

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `registrations_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  function clearFilters() {
    setFilters({
      dateFrom: '',
      dateTo: '',
      utmSource: '',
      utmCampaign: '',
      courseId: '',
      profession: ''
    })
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">AI</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
            <p className="text-gray-500 text-sm mt-1">AIwithArijit.com Webinar Dashboard</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter password"
              />
            </div>
            {loginError && (
              <p className="text-red-500 text-sm">{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-shadow"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">AI</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Webinar Admin</h1>
              <p className="text-xs text-gray-500">AIwithArijit.com</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('utm')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'utm' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}
              >
                📊 UTM Campaigns
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'analytics' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}
              >
                📈 Analytics
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* UTM Campaigns Tab */}
        {activeTab === 'utm' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">UTM Campaign Manager</h2>
              <button
                onClick={() => { setShowCampaignForm(true); setEditingCampaign(null); resetCampaignForm(); }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                + New Campaign
              </button>
            </div>

            {/* Campaign Form Modal */}
            {showCampaignForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-bold mb-4">{editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}</h3>
                  <form onSubmit={saveCampaign} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
                        <input
                          type="text"
                          required
                          className="w-full px-3 py-2 border rounded-lg"
                          value={campaignForm.campaign_name}
                          onChange={(e) => setCampaignForm({...campaignForm, campaign_name: e.target.value})}
                          placeholder="e.g., BaaMee Andheri Launch"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">UTM Source *</label>
                        <input
                          type="text"
                          required
                          className="w-full px-3 py-2 border rounded-lg"
                          value={campaignForm.utm_source}
                          onChange={(e) => setCampaignForm({...campaignForm, utm_source: e.target.value})}
                          placeholder="e.g., BaaMee"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">UTM Medium</label>
                        <select
                          className="w-full px-3 py-2 border rounded-lg"
                          value={campaignForm.utm_medium}
                          onChange={(e) => setCampaignForm({...campaignForm, utm_medium: e.target.value})}
                        >
                          <option value="qr_code">QR Code</option>
                          <option value="standee">Standee</option>
                          <option value="poster">Poster</option>
                          <option value="flyer">Flyer</option>
                          <option value="digital">Digital</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">UTM Campaign *</label>
                        <input
                          type="text"
                          required
                          className="w-full px-3 py-2 border rounded-lg"
                          value={campaignForm.utm_campaign}
                          onChange={(e) => setCampaignForm({...campaignForm, utm_campaign: e.target.value})}
                          placeholder="e.g., jan2025_launch"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Placement Location</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-lg"
                          value={campaignForm.placement_location}
                          onChange={(e) => setCampaignForm({...campaignForm, placement_location: e.target.value})}
                          placeholder="e.g., Counter, Window"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Placement City</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-lg"
                          value={campaignForm.placement_city}
                          onChange={(e) => setCampaignForm({...campaignForm, placement_city: e.target.value})}
                          placeholder="e.g., Mumbai, Andheri"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          className="w-full px-3 py-2 border rounded-lg"
                          rows={2}
                          value={campaignForm.campaign_description}
                          onChange={(e) => setCampaignForm({...campaignForm, campaign_description: e.target.value})}
                          placeholder="Brief description of the campaign"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end mt-6">
                      <button
                        type="button"
                        onClick={() => { setShowCampaignForm(false); setEditingCampaign(null); }}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        {editingCampaign ? 'Update' : 'Create'} Campaign
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Campaigns List */}
            <div className="space-y-3">
              {campaigns.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                  No campaigns yet. Create your first UTM campaign!
                </div>
              ) : (
                campaigns.map((campaign) => (
                  <div key={campaign.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{campaign.campaign_name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${campaign.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {campaign.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          {campaign.campaign_description && (
                            <p className="text-sm text-gray-500 mb-2">{campaign.campaign_description}</p>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">{campaign.full_url}</code>
                            <button
                              onClick={() => navigator.clipboard.writeText(campaign.full_url)}
                              className="text-indigo-600 text-xs hover:underline"
                            >
                              Copy
                            </button>
                          </div>
                          <div className="flex gap-2 text-xs flex-wrap">
                            <div className="bg-gray-100 rounded px-2 py-1">
                              <span className="text-gray-500">Source:</span> <span className="font-medium">{campaign.utm_source}</span>
                            </div>
                            <div className="bg-gray-100 rounded px-2 py-1">
                              <span className="text-gray-500">Medium:</span> <span className="font-medium">{campaign.utm_medium}</span>
                            </div>
                            <div className="bg-gray-100 rounded px-2 py-1">
                              <span className="text-gray-500">Campaign:</span> <span className="font-medium">{campaign.utm_campaign}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <a
                              href={generateQRCode(campaign.full_url)}
                              download={`qr_${campaign.utm_campaign}.png`}
                              className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              Download QR
                            </a>
                            <button
                              onClick={() => editCampaign(campaign)}
                              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteCampaign(campaign.id)}
                              className="px-3 py-1.5 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Registration Analytics</h2>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                📥 Export CSV
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <p className="text-sm text-gray-500">Total Registrations</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <p className="text-sm text-gray-500">Today</p>
                <p className="text-3xl font-bold text-green-600">{stats.today}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <p className="text-sm text-gray-500">This Week</p>
                <p className="text-3xl font-bold text-blue-600">{stats.thisWeek}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <p className="text-sm text-gray-500">This Month</p>
                <p className="text-3xl font-bold text-purple-600">{stats.thisMonth}</p>
              </div>
            </div>

            {/* Registrations Over Time Chart */}
            <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">📈 Registrations Over Last 14 Days</h3>
              <LineChart data={dailyRegistrations} height={220} />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm border mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">🔍 Filters</h3>
                <button
                  onClick={clearFilters}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Clear All
                </button>
              </div>
              <div className="grid grid-cols-6 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date From</label>
                  <input
                    type="date"
                    className="w-full px-2 py-1.5 border rounded text-sm"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date To</label>
                  <input
                    type="date"
                    className="w-full px-2 py-1.5 border rounded text-sm"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">UTM Source</label>
                  <select
                    className="w-full px-2 py-1.5 border rounded text-sm"
                    value={filters.utmSource}
                    onChange={(e) => setFilters({...filters, utmSource: e.target.value})}
                  >
                    <option value="">All Sources</option>
                    {utmSourceOptions.map((source) => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">UTM Campaign</label>
                  <select
                    className="w-full px-2 py-1.5 border rounded text-sm"
                    value={filters.utmCampaign}
                    onChange={(e) => setFilters({...filters, utmCampaign: e.target.value})}
                  >
                    <option value="">All Campaigns</option>
                    {utmCampaignOptions.map((campaign) => (
                      <option key={campaign} value={campaign}>{campaign}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Course</label>
                  <select
                    className="w-full px-2 py-1.5 border rounded text-sm"
                    value={filters.courseId}
                    onChange={(e) => setFilters({...filters, courseId: e.target.value})}
                  >
                    <option value="">All Courses</option>
                    <option value="6">Professionals</option>
                    <option value="7">Schools</option>
                    <option value="8">College/Job Seekers</option>
                    <option value="9">Tech Dev</option>
                    <option value="10">Business Leaders</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={fetchRegistrations}
                    className="w-full py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Registrations Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {analyticsLoading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : registrations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No registrations found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profession</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UTM Source</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {registrations.map((reg, idx) => (
                        <tr key={reg.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{reg.full_name}</td>
                          <td className="px-4 py-3 text-gray-600">{reg.email}</td>
                          <td className="px-4 py-3 text-gray-600">{reg.mobile}</td>
                          <td className="px-4 py-3 text-gray-600">{reg.age || '-'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">
                              {reg.course_id === 6 ? 'Professional' : reg.course_id === 7 ? 'School' : reg.course_id === 8 ? 'College' : reg.course_id === 9 ? 'Tech' : 'Leader'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 capitalize">{reg.profession_choice?.replace(/_/g, ' ')}</td>
                          <td className="px-4 py-3">
                            {reg.utm_source ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">{reg.utm_source}</span>
                            ) : (
                              <span className="text-gray-400">Direct</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 capitalize">{reg.device_type || '-'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {new Date(reg.registered_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
