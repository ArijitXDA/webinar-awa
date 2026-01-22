'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Campaign {
  id: string
  campaign_id: number
  campaign_name: string
  campaign_type: string
  campaign_category: string
  description: string | null
  start_date: string
  end_date: string | null
  is_active: boolean
  actual_leads_count: number
  actual_conversions_count: number
  conversion_rate: number
  budget_allocated: number | null
  budget_spent: number
  target_leads_count: number | null
  target_conversions_count: number | null
  target_revenue: number | null
  actual_revenue: number
  roi_percentage: number
  channels_used: string[]
  campaign_owner_name: string | null
  status?: string
}

interface CampaignLead {
  id: string
  lead_id: string
  response_status: string
  added_date: string
  emails_sent: number
  whatsapp_sent: number
  calls_made: number
  converted: boolean
  conversion_value: number | null
  lead_name?: string
  lead_mobile?: string
  lead_email?: string | null
  lead_score?: number
}

export default function CampaignDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [campaignLeads, setCampaignLeads] = useState<CampaignLead[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'analytics'>('overview')

  // Add Leads Modal
  const [showAddLeadsModal, setShowAddLeadsModal] = useState(false)
  const [availableLeads, setAvailableLeads] = useState<any[]>([])
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([])
  const [assignTo, setAssignTo] = useState<string>('')
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [addingLeads, setAddingLeads] = useState(false)

  useEffect(() => {
    if (campaignId) {
      fetchCampaignDetails()
      fetchCampaignLeads()
    }
  }, [campaignId])

  async function fetchCampaignDetails() {
    try {
      const { data, error } = await supabase
        .from('crm_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

      if (error) throw error
      setCampaign(data)
    } catch (error) {
      console.error('Error fetching campaign:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCampaignLeads() {
    try {
      const { data, error } = await supabase
        .from('crm_campaign_leads')
        .select(`
          *,
          crm_leads!inner (
            id,
            full_name,
            mobile,
            email,
            lead_score
          )
        `)
        .eq('campaign_id', campaignId)
        .order('added_date', { ascending: false })

      if (error) throw error

      const formattedData = data?.map(item => ({
        ...item,
        lead_name: item.crm_leads.full_name,
        lead_mobile: item.crm_leads.mobile,
        lead_email: item.crm_leads.email,
        lead_score: item.crm_leads.lead_score
      })) || []

      setCampaignLeads(formattedData)
    } catch (error) {
      console.error('Error fetching campaign leads:', error)
    }
  }

  async function toggleCampaignStatus() {
    if (!campaign) return

    try {
      const { error } = await supabase
        .from('crm_campaigns')
        .update({ is_active: !campaign.is_active })
        .eq('id', campaignId)

      if (error) throw error

      setCampaign({ ...campaign, is_active: !campaign.is_active })
      alert(campaign.is_active ? 'Campaign paused' : 'Campaign activated')
    } catch (error: any) {
      alert(error.message || 'Failed to update campaign status')
    }
  }

  async function openAddLeadsModal() {
    setShowAddLeadsModal(true)
    setSelectedLeadIds([])
    setAssignTo(campaign?.campaign_owner_id || '')

    // Fetch available leads not in this campaign
    const { data: allLeads } = await supabase
      .from('crm_leads')
      .select('id, lead_id, full_name, mobile, email, lead_score, lead_status, assigned_to')
      .eq('is_converted', false)
      .order('created_at', { ascending: false })
      .limit(100)

    // Get leads already in campaign
    const leadsInCampaign = campaignLeads.map(cl => cl.lead_id)

    // Filter out leads already in campaign
    const available = (allLeads || []).filter(lead => !leadsInCampaign.includes(lead.id))
    setAvailableLeads(available)

    // Fetch campaign owner and their team
    if (campaign?.campaign_owner_id) {
      const { data: owner } = await supabase
        .from('crm_employees')
        .select('id, full_name, job_role')
        .eq('id', campaign.campaign_owner_id)
        .single()

      const { data: team } = await supabase
        .from('crm_employees')
        .select('id, full_name, job_role')
        .eq('reports_to', campaign.campaign_owner_id)
        .eq('is_active', true)

      const members = [owner, ...(team || [])].filter(Boolean)
      setTeamMembers(members)
    }
  }

  async function handleAddLeadsToCampaign() {
    if (selectedLeadIds.length === 0) {
      alert('Please select at least one lead')
      return
    }

    if (!assignTo) {
      alert('Please select who to assign the leads to')
      return
    }

    try {
      setAddingLeads(true)

      // Add leads to campaign
      const { data, error } = await supabase
        .from('crm_campaign_leads')
        .insert(
          selectedLeadIds.map(leadId => ({
            campaign_id: campaignId,
            lead_id: leadId,
            response_status: 'pending'
          }))
        )

      if (error) throw error

      // Assign leads to selected team member
      const { error: assignError } = await supabase
        .from('crm_leads')
        .update({
          assigned_to: assignTo,
          primary_campaign_id: campaignId
        })
        .in('id', selectedLeadIds)

      if (assignError) throw assignError

      alert(`Successfully added ${selectedLeadIds.length} leads to campaign and assigned to team member`)
      setShowAddLeadsModal(false)
      setSelectedLeadIds([])
      fetchCampaignLeads()
    } catch (error: any) {
      console.error('Error adding leads:', error)
      alert(error.message || 'Failed to add leads to campaign')
    } finally {
      setAddingLeads(false)
    }
  }

  function formatCurrency(amount: number) {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`
    }
    return `₹${amount.toFixed(0)}`
  }

  function getProgressPercentage(actual: number, target: number | null) {
    if (!target || target === 0) return 0
    return Math.min((actual / target) * 100, 100)
  }

  function getResponseStatusBadge(status: string) {
    switch (status) {
      case 'responded':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'converted':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'no_response':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'opted_out':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Campaign Not Found</h2>
          <button
            onClick={() => router.push('/CRM/campaigns')}
            className="text-purple-400 hover:text-purple-300"
          >
            Back to Campaigns
          </button>
        </div>
      </div>
    )
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
                <h1 className="text-xl font-bold text-white">{campaign.campaign_name}</h1>
                <p className="text-sm text-slate-400">Campaign #{campaign.campaign_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleCampaignStatus}
                className={`px-4 py-2 rounded-lg font-medium ${
                  campaign.is_active
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {campaign.is_active ? 'Pause Campaign' : 'Activate Campaign'}
              </button>
              <button
                onClick={openAddLeadsModal}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
              >
                Add Leads
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'leads'
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Leads ({campaignLeads.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'analytics'
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <p className="text-slate-400 text-sm">Total Leads</p>
                <p className="text-3xl font-bold text-white">{campaign.actual_leads_count}</p>
                {campaign.target_leads_count && (
                  <p className="text-xs text-slate-400 mt-1">
                    Target: {campaign.target_leads_count} ({getProgressPercentage(campaign.actual_leads_count, campaign.target_leads_count).toFixed(0)}%)
                  </p>
                )}
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <p className="text-slate-400 text-sm">Conversions</p>
                <p className="text-3xl font-bold text-green-400">{campaign.actual_conversions_count}</p>
                {campaign.target_conversions_count && (
                  <p className="text-xs text-slate-400 mt-1">
                    Target: {campaign.target_conversions_count} ({getProgressPercentage(campaign.actual_conversions_count, campaign.target_conversions_count).toFixed(0)}%)
                  </p>
                )}
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <p className="text-slate-400 text-sm">Conversion Rate</p>
                <p className={`text-3xl font-bold ${
                  campaign.conversion_rate >= 20 ? 'text-green-400' :
                  campaign.conversion_rate >= 10 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {campaign.conversion_rate.toFixed(1)}%
                </p>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <p className="text-slate-400 text-sm">Revenue</p>
                <p className="text-3xl font-bold text-amber-400">{formatCurrency(campaign.actual_revenue)}</p>
                {campaign.target_revenue && (
                  <p className="text-xs text-slate-400 mt-1">
                    Target: {formatCurrency(campaign.target_revenue)} ({getProgressPercentage(campaign.actual_revenue, campaign.target_revenue).toFixed(0)}%)
                  </p>
                )}
              </div>
            </div>

            {/* Progress Bars */}
            {campaign.target_leads_count && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Campaign Progress</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-300">Leads</span>
                      <span className="text-white">{campaign.actual_leads_count} / {campaign.target_leads_count}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div
                        className="bg-blue-500 h-3 rounded-full transition-all"
                        style={{ width: `${getProgressPercentage(campaign.actual_leads_count, campaign.target_leads_count)}%` }}
                      ></div>
                    </div>
                  </div>

                  {campaign.target_conversions_count && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-300">Conversions</span>
                        <span className="text-white">{campaign.actual_conversions_count} / {campaign.target_conversions_count}</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-3">
                        <div
                          className="bg-green-500 h-3 rounded-full transition-all"
                          style={{ width: `${getProgressPercentage(campaign.actual_conversions_count, campaign.target_conversions_count)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {campaign.target_revenue && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-300">Revenue</span>
                        <span className="text-white">{formatCurrency(campaign.actual_revenue)} / {formatCurrency(campaign.target_revenue)}</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-3">
                        <div
                          className="bg-amber-500 h-3 rounded-full transition-all"
                          style={{ width: `${getProgressPercentage(campaign.actual_revenue, campaign.target_revenue)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Campaign Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Campaign Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Type:</span>
                    <span className="text-white capitalize">{campaign.campaign_type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Category:</span>
                    <span className="text-white capitalize">{campaign.campaign_category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Start Date:</span>
                    <span className="text-white">{new Date(campaign.start_date).toLocaleDateString('en-IN')}</span>
                  </div>
                  {campaign.end_date && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">End Date:</span>
                      <span className="text-white">{new Date(campaign.end_date).toLocaleDateString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className={`capitalize ${campaign.is_active ? 'text-green-400' : 'text-yellow-400'}`}>
                      {campaign.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Owner:</span>
                    <span className="text-white">{campaign.campaign_owner_name || 'Unassigned'}</span>
                  </div>
                </div>

                {campaign.description && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-slate-400 text-sm mb-1">Description</p>
                    <p className="text-white text-sm">{campaign.description}</p>
                  </div>
                )}
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-4">Financial Overview</h3>
                <div className="space-y-3 text-sm">
                  {campaign.budget_allocated && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Budget Allocated:</span>
                        <span className="text-white">{formatCurrency(campaign.budget_allocated)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Budget Spent:</span>
                        <span className="text-white">{formatCurrency(campaign.budget_spent)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Budget Remaining:</span>
                        <span className={`${campaign.budget_allocated - campaign.budget_spent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(campaign.budget_allocated - campaign.budget_spent)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Revenue:</span>
                    <span className="text-amber-400 font-semibold">{formatCurrency(campaign.actual_revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ROI:</span>
                    <span className={`font-semibold ${
                      campaign.roi_percentage >= 100 ? 'text-green-400' :
                      campaign.roi_percentage >= 0 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {campaign.roi_percentage >= 0 ? '+' : ''}{campaign.roi_percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-slate-400 text-xs mb-2">Communication Channels</p>
                  <div className="flex flex-wrap gap-2">
                    {campaign.channels_used?.map(channel => (
                      <span key={channel} className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs capitalize">
                        {channel}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leads Tab */}
        {activeTab === 'leads' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            {campaignLeads.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-white mb-2">No leads in this campaign yet</h3>
                <p className="text-slate-400 mb-4">Add leads to start tracking campaign performance</p>
                <button
                  onClick={() => router.push(`/CRM/leads?campaign_id=${campaignId}`)}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg"
                >
                  Add Leads
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Lead</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Added Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Engagement</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {campaignLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-700/50">
                        <td className="px-4 py-3">
                          <p className="text-white font-medium">{lead.lead_name}</p>
                          <p className="text-slate-400 text-xs">Score: {lead.lead_score}/5</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white text-sm">{lead.lead_mobile}</p>
                          {lead.lead_email && (
                            <p className="text-slate-400 text-xs truncate max-w-[150px]">{lead.lead_email}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          {new Date(lead.added_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border capitalize ${getResponseStatusBadge(lead.response_status)}`}>
                            {lead.response_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          <div className="flex gap-2 text-xs">
                            {lead.emails_sent > 0 && <span>📧 {lead.emails_sent}</span>}
                            {lead.whatsapp_sent > 0 && <span>💬 {lead.whatsapp_sent}</span>}
                            {lead.calls_made > 0 && <span>📞 {lead.calls_made}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {lead.converted ? (
                            <span className="text-green-400 font-medium">
                              {lead.conversion_value ? formatCurrency(lead.conversion_value) : 'Converted'}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Campaign Analytics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Response Rate</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {campaignLeads.length > 0
                      ? ((campaignLeads.filter(l => l.response_status === 'responded' || l.response_status === 'converted').length / campaignLeads.length) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Avg Emails Sent</p>
                  <p className="text-2xl font-bold text-white">
                    {campaignLeads.length > 0
                      ? (campaignLeads.reduce((sum, l) => sum + l.emails_sent, 0) / campaignLeads.length).toFixed(1)
                      : 0}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Avg WhatsApp Sent</p>
                  <p className="text-2xl font-bold text-white">
                    {campaignLeads.length > 0
                      ? (campaignLeads.reduce((sum, l) => sum + l.whatsapp_sent, 0) / campaignLeads.length).toFixed(1)
                      : 0}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Avg Calls Made</p>
                  <p className="text-2xl font-bold text-white">
                    {campaignLeads.length > 0
                      ? (campaignLeads.reduce((sum, l) => sum + l.calls_made, 0) / campaignLeads.length).toFixed(1)
                      : 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Lead Response Breakdown</h3>
              <div className="space-y-3">
                {['pending', 'responded', 'converted', 'no_response', 'opted_out'].map(status => {
                  const count = campaignLeads.filter(l => l.response_status === status).length
                  const percentage = campaignLeads.length > 0 ? (count / campaignLeads.length) * 100 : 0
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300 capitalize">{status.replace('_', ' ')}</span>
                        <span className="text-white">{count} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            status === 'converted' ? 'bg-green-500' :
                            status === 'responded' ? 'bg-blue-500' :
                            status === 'no_response' ? 'bg-red-500' :
                            status === 'opted_out' ? 'bg-slate-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Leads Modal */}
      {showAddLeadsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Add Leads to Campaign</h3>
              <button
                onClick={() => setShowAddLeadsModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-blue-300 font-medium text-sm">Leads will be automatically assigned</p>
                    <p className="text-blue-200/70 text-xs mt-1">Select leads and choose a team member to assign them to when adding to the campaign</p>
                  </div>
                </div>
              </div>

              {/* Assign To Dropdown */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Assign Leads To <span className="text-red-400">*</span>
                </label>
                <select
                  value={assignTo}
                  onChange={(e) => setAssignTo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="">Select team member...</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} - {member.job_role}
                      {member.id === campaign?.campaign_owner_id && ' (Campaign Owner)'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">Campaign owner and their team members</p>
              </div>

              {/* Select All / Clear */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-300">
                  {selectedLeadIds.length} of {availableLeads.length} leads selected
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedLeadIds(availableLeads.map(l => l.id))}
                    className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedLeadIds([])}
                    className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Leads List */}
              {availableLeads.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-slate-400">No available leads to add</p>
                  <p className="text-slate-500 text-sm mt-1">All recent leads are already in this campaign</p>
                </div>
              ) : (
                <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-2 text-left">
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.length === availableLeads.length && availableLeads.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLeadIds(availableLeads.map(l => l.id))
                              } else {
                                setSelectedLeadIds([])
                              }
                            }}
                            className="w-4 h-4 bg-slate-700 border-slate-600 rounded"
                          />
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Lead</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Contact</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Score</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Current Owner</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {availableLeads.map(lead => (
                        <tr key={lead.id} className="hover:bg-slate-800/50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.includes(lead.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLeadIds([...selectedLeadIds, lead.id])
                                } else {
                                  setSelectedLeadIds(selectedLeadIds.filter(id => id !== lead.id))
                                }
                              }}
                              className="w-4 h-4 bg-slate-700 border-slate-600 rounded"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-white font-medium text-sm">{lead.full_name}</p>
                            <p className="text-slate-500 text-xs">ID: {lead.lead_id}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-white text-sm">{lead.mobile}</p>
                            {lead.email && <p className="text-slate-400 text-xs">{lead.email}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-medium ${
                              lead.lead_score >= 4 ? 'text-green-400' :
                              lead.lead_score === 3 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {'★'.repeat(lead.lead_score)}{'☆'.repeat(5 - lead.lead_score)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded capitalize">
                              {lead.lead_status?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-400">
                            {lead.assigned_to ? 'Assigned' : 'Unassigned'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                {selectedLeadIds.length} lead{selectedLeadIds.length !== 1 ? 's' : ''} selected
                {assignTo && ` • Will be assigned to selected team member`}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddLeadsModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLeadsToCampaign}
                  disabled={selectedLeadIds.length === 0 || !assignTo || addingLeads}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingLeads ? 'Adding...' : `Add ${selectedLeadIds.length} Lead${selectedLeadIds.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
