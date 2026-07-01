'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Campaign {
  id: string
  campaign_id: number
  campaign_name: string
  campaign_type: string
  campaign_category: string
  start_date: string
  end_date: string | null
  is_active: boolean
  actual_leads_count: number
  actual_conversions_count: number
  conversion_rate: number
  budget_allocated: number | null
  budget_spent: number
  actual_revenue: number
  roi_percentage: number
  campaign_owner_name: string | null
  status?: string
}

interface Stats {
  active: number
  scheduled: number
  completed: number
  total_leads: number
  total_revenue: number
  avg_roi: number
}

const CAMPAIGN_TYPES = [
  { value: 'sales', label: 'Sales', color: 'blue' },
  { value: 'marketing', label: 'Marketing', color: 'purple' },
  { value: 'service', label: 'Service', color: 'green' },
  { value: 'retention', label: 'Retention', color: 'yellow' },
  { value: 'cross_sell', label: 'Cross-Sell', color: 'orange' }
]

const CAMPAIGN_CATEGORIES = [
  { value: 'offer', label: 'Special Offer', icon: '🎁' },
  { value: 'timely', label: 'Timely/Seasonal', icon: '📅' },
  { value: 'targeted', label: 'Targeted', icon: '🎯' },
  { value: 'nurture', label: 'Nurture', icon: '🌱' }
]

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    active: 0,
    scheduled: 0,
    completed: 0,
    total_leads: 0,
    total_revenue: 0,
    avg_roi: 0
  })

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')

  useEffect(() => {
    fetchCampaigns()
  }, [typeFilter, categoryFilter, statusFilter])

  async function fetchCampaigns() {
    try {
      setLoading(true)

      // Fetch from the view for better performance
      let query = supabase
        .from('vw_campaign_performance')
        .select('*')
        .order('start_date', { ascending: false })

      // Apply filters
      if (typeFilter) {
        query = query.eq('campaign_type', typeFilter)
      }
      if (categoryFilter) {
        query = query.eq('campaign_category', categoryFilter)
      }
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error

      setCampaigns(data || [])

      // Calculate stats
      const activeCount = data?.filter(c => c.status === 'active').length || 0
      const scheduledCount = data?.filter(c => c.status === 'scheduled').length || 0
      const completedCount = data?.filter(c => c.status === 'completed').length || 0
      const totalLeads = data?.reduce((sum, c) => sum + (c.actual_leads_count || 0), 0) || 0
      const totalRevenue = data?.reduce((sum, c) => sum + (c.actual_revenue || 0), 0) || 0
      const avgRoi = data && data.length > 0
        ? data.reduce((sum, c) => sum + (c.roi_percentage || 0), 0) / data.length
        : 0

      setStats({
        active: activeCount,
        scheduled: scheduledCount,
        completed: completedCount,
        total_leads: totalLeads,
        total_revenue: totalRevenue,
        avg_roi: avgRoi
      })
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.campaign_name.toLowerCase().includes(search.toLowerCase())
  )

  function getStatusBadge(status: string) {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'scheduled':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'completed':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
      case 'paused':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  function getTypeBadge(type: string) {
    const typeConfig = CAMPAIGN_TYPES.find(t => t.value === type)
    const color = typeConfig?.color || 'slate'
    return `bg-${color}-500/20 text-${color}-400 border-${color}-500/30`
  }

  function formatCurrency(amount: number) {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`
    }
    return `₹${amount.toFixed(0)}`
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/CRM')} className="text-slate-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">📊 Campaign Management</h1>
                <p className="text-sm text-slate-400">Create and track sales & marketing campaigns</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/CRM/campaigns/new')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Campaign
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Active</p>
            <p className="text-2xl font-bold text-green-400">{stats.active}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Scheduled</p>
            <p className="text-2xl font-bold text-blue-400">{stats.scheduled}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Completed</p>
            <p className="text-2xl font-bold text-slate-400">{stats.completed}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total Leads</p>
            <p className="text-2xl font-bold text-white">{stats.total_leads}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total Revenue</p>
            <p className="text-2xl font-bold text-amber-400">{formatCurrency(stats.total_revenue)}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Avg ROI</p>
            <p className="text-2xl font-bold text-purple-400">{stats.avg_roi.toFixed(0)}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search campaigns..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
            >
              <option value="">All Types</option>
              {CAMPAIGN_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
            >
              <option value="">All Categories</option>
              {CAMPAIGN_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-lg font-semibold text-white mb-2">No campaigns yet</h3>
              <p className="text-slate-400 mb-4">Create your first campaign to start tracking performance</p>
              <button
                onClick={() => router.push('/CRM/campaigns/new')}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg"
              >
                Create Campaign
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Campaign</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Timeline</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Leads</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Conv Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Revenue</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">ROI</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredCampaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-slate-700/50">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{campaign.campaign_name}</p>
                        <p className="text-slate-400 text-xs">{campaign.campaign_owner_name || 'Unassigned'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getTypeBadge(campaign.campaign_type)}`}>
                            {CAMPAIGN_TYPES.find(t => t.value === campaign.campaign_type)?.label}
                          </span>
                          <span className="text-xs text-slate-400">
                            {CAMPAIGN_CATEGORIES.find(c => c.value === campaign.campaign_category)?.icon} {CAMPAIGN_CATEGORIES.find(c => c.value === campaign.campaign_category)?.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        <div className="flex flex-col gap-1">
                          <span>{new Date(campaign.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          {campaign.end_date && (
                            <span className="text-xs text-slate-400">to {new Date(campaign.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border capitalize ${getStatusBadge(campaign.status || 'active')}`}>
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-white font-medium">{campaign.actual_leads_count}</span>
                          <span className="text-xs text-slate-400">{campaign.actual_conversions_count} converted</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            campaign.conversion_rate >= 20 ? 'text-green-400' :
                            campaign.conversion_rate >= 10 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {campaign.conversion_rate.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-amber-400 font-medium">{formatCurrency(campaign.actual_revenue)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${
                          campaign.roi_percentage >= 100 ? 'text-green-400' :
                          campaign.roi_percentage >= 0 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {campaign.roi_percentage >= 0 ? '+' : ''}{campaign.roi_percentage.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => router.push(`/CRM/campaigns/${campaign.id}`)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
