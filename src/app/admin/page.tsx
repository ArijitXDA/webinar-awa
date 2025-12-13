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
  date_of_birth: string
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

  // Check auth on mount
  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
      fetchCampaigns()
      fetchRegistrations()
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
    } catch (error) {
      console.error('Error fetching registrations:', error)
    } finally {
      setAnalyticsLoading(false)
    }
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
    } catch (error) {
      console.error('Error saving campaign:', error)
      alert('Error saving campaign')
    }
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
    } catch (error) {
      console.error('Error deleting campaign:', error)
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
      campaign_name: campaign.campaign_name || '',
      campaign_description: campaign.campaign_description || '',
      utm_source: campaign.utm_source || '',
      utm_medium: campaign.utm_medium || 'qr_code',
      utm_campaign: campaign.utm_campaign || '',
      utm_term: campaign.utm_term || '',
      utm_content: campaign.utm_content || '',
      placement_location: campaign.placement_location || '',
      placement_city: campaign.placement_city || '',
      is_active: campaign.is_active
    })
    setShowCampaignForm(true)
  }

  function generateQRCode(url: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  function exportToCSV() {
    const headers = ['Name', 'Email', 'Mobile', 'DOB', 'Profession', 'Course', 'Date', 'UTM Source', 'UTM Campaign', 'Device', 'Registered At']
    const rows = registrations.map(r => [
      r.full_name, r.email, r.mobile, r.date_of_birth, r.profession_choice,
      r.course_name, r.webinar_date, r.utm_source || '', r.utm_campaign || '',
      r.device_type || '', r.registered_at
    ])
    
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `webinar_registrations_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg">
              AI
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
            <p className="text-gray-500 text-sm mt-1">webinar.ostaran.com</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
              AI
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-xs text-gray-500">webinar.ostaran.com</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('utm')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'utm'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            📊 UTM & QR Management
          </button>
          <button
            onClick={() => { setActiveTab('analytics'); fetchRegistrations(); }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            📈 Registration Analytics
          </button>
        </div>

        {/* UTM Management Tab */}
        {activeTab === 'utm' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">UTM Campaigns & QR Codes</h2>
              <button
                onClick={() => { setShowCampaignForm(true); setEditingCampaign(null); resetCampaignForm(); }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                + Create New Campaign
              </button>
            </div>

            {/* Campaign Form Modal */}
            {showCampaignForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b">
                    <h3 className="text-lg font-bold">{editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}</h3>
                  </div>
                  <form onSubmit={saveCampaign} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          value={campaignForm.campaign_name}
                          onChange={(e) => setCampaignForm({...campaignForm, campaign_name: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Placement City</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          value={campaignForm.placement_city}
                          onChange={(e) => setCampaignForm({...campaignForm, placement_city: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        rows={2}
                        value={campaignForm.campaign_description}
                        onChange={(e) => setCampaignForm({...campaignForm, campaign_description: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Placement Location</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., Mumbai Local Train Stations"
                        value={campaignForm.placement_location}
                        onChange={(e) => setCampaignForm({...campaignForm, placement_location: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">UTM Source *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., qr_standee, linkedin, facebook"
                          value={campaignForm.utm_source}
                          onChange={(e) => setCampaignForm({...campaignForm, utm_source: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">UTM Medium *</label>
                        <select
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          value={campaignForm.utm_medium}
                          onChange={(e) => setCampaignForm({...campaignForm, utm_medium: e.target.value})}
                        >
                          <option value="qr_code">QR Code</option>
                          <option value="offline">Offline</option>
                          <option value="social">Social</option>
                          <option value="email">Email</option>
                          <option value="paid">Paid</option>
                          <option value="referral">Referral</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">UTM Campaign *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., jan2025_mumbai"
                          value={campaignForm.utm_campaign}
                          onChange={(e) => setCampaignForm({...campaignForm, utm_campaign: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">UTM Term</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          value={campaignForm.utm_term}
                          onChange={(e) => setCampaignForm({...campaignForm, utm_term: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">UTM Content</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          value={campaignForm.utm_content}
                          onChange={(e) => setCampaignForm({...campaignForm, utm_content: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={campaignForm.is_active}
                        onChange={(e) => setCampaignForm({...campaignForm, is_active: e.target.checked})}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <label htmlFor="is_active" className="text-sm text-gray-700">Active Campaign</label>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => { setShowCampaignForm(false); setEditingCampaign(null); }}
                        className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                      >
                        {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Campaigns List */}
            <div className="space-y-4">
              {campaigns.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center text-gray-500">
                  No campaigns yet. Create your first UTM campaign!
                </div>
              ) : (
                campaigns.map((campaign) => (
                  <div key={campaign.id} className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{campaign.campaign_name}</h3>
                        <p className="text-sm text-gray-500">{campaign.campaign_description}</p>
                        {campaign.placement_location && (
                          <p className="text-sm text-indigo-600 mt-1">📍 {campaign.placement_location} {campaign.placement_city && `• ${campaign.placement_city}`}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${campaign.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {campaign.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-xs text-gray-500 mb-1">Campaign URL:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm bg-white px-3 py-2 rounded border break-all">{campaign.full_url}</code>
                        <button
                          onClick={() => copyToClipboard(campaign.full_url)}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <img
                          src={generateQRCode(campaign.full_url)}
                          alt="QR Code"
                          className="w-24 h-24 rounded-lg border"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="grid grid-cols-3 gap-2 text-sm mb-3">
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
                        <div className="flex gap-2">
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

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm border mb-4">
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
                  <input
                    type="text"
                    className="w-full px-2 py-1.5 border rounded text-sm"
                    placeholder="e.g., qr_standee"
                    value={filters.utmSource}
                    onChange={(e) => setFilters({...filters, utmSource: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">UTM Campaign</label>
                  <input
                    type="text"
                    className="w-full px-2 py-1.5 border rounded text-sm"
                    value={filters.utmCampaign}
                    onChange={(e) => setFilters({...filters, utmCampaign: e.target.value})}
                  />
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
