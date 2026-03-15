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

interface WebinarRating {
  id: string
  rating_id: number
  email: string
  mobile: string
  full_name: string
  course_name: string
  rating: number
  feedback: string
  source: string
  rated_at: string
  // Joined from registration
  webinar_date?: string
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

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * 100
    const y = 100 - (d.count / maxCount) * 100
    return { x, y, ...d }
  })

  const linePath = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ')

  const areaPath = `${linePath} L ${points[points.length - 1]?.x || 0} 100 L 0 100 Z`

  return (
    <div className="relative" style={{ height }}>
      <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-xs text-gray-400">
        <span>{maxCount}</span>
        <span>{Math.round(maxCount / 2)}</span>
        <span>0</span>
      </div>
      
      <div className="absolute left-12 right-0 top-0 bottom-8">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <line x1="0" y1="0" x2="100" y2="0" stroke="#e5e7eb" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2" />
          <line x1="0" y1="100" x2="100" y2="100" stroke="#e5e7eb" strokeWidth="0.5" />
          
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#areaGradient)" />
          <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366f1" stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        
        <div className="absolute inset-0 flex">
          {points.map((p, i) => (
            <div key={i} className="flex-1 group relative" style={{ cursor: 'pointer' }}>
              <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                {p.date}: {p.count} registrations
              </div>
            </div>
          ))}
        </div>
      </div>
      
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

// Funnel Chart Component
function FunnelChart({ totalRegistrations, totalRated }: { totalRegistrations: number, totalRated: number }) {
  const conversionRate = totalRegistrations > 0 ? ((totalRated / totalRegistrations) * 100).toFixed(1) : '0'
  
  return (
    <div className="flex flex-col items-center">
      {/* Funnel shape */}
      <div className="relative w-full max-w-xs">
        {/* Top - Registrations */}
        <div className="relative">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-t-xl py-4 px-6 text-center">
            <p className="text-xs opacity-80">Total Registrations</p>
            <p className="text-3xl font-bold">{totalRegistrations}</p>
          </div>
          {/* Funnel connector */}
          <div className="h-0 w-0 mx-auto border-l-[60px] border-l-transparent border-r-[60px] border-r-transparent border-t-[20px] border-t-purple-500"></div>
        </div>
        
        {/* Bottom - Rated */}
        <div className="relative mt-1">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl py-4 px-6 text-center mx-8">
            <p className="text-xs opacity-80">Rated</p>
            <p className="text-3xl font-bold">{totalRated}</p>
          </div>
        </div>
        
        {/* Conversion Rate */}
        <div className="text-center mt-4">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
            <span className="text-gray-500">Conversion:</span>
            <span className="font-bold text-indigo-600">{conversionRate}%</span>
          </span>
        </div>
      </div>
    </div>
  )
}

// Rating TreeMap Component
function RatingTreeMap({ ratingDistribution }: { ratingDistribution: { [key: number]: number } }) {
  const total = Object.values(ratingDistribution).reduce((a, b) => a + b, 0)
  
  const ratingColors: { [key: number]: { bg: string, text: string, label: string } } = {
    5: { bg: 'bg-green-500', text: 'text-white', label: '🤩 Excellent' },
    4: { bg: 'bg-lime-500', text: 'text-white', label: '😊 Very Good' },
    3: { bg: 'bg-yellow-400', text: 'text-gray-800', label: '🙂 Good' },
    2: { bg: 'bg-orange-400', text: 'text-white', label: '😐 Fair' },
    1: { bg: 'bg-red-500', text: 'text-white', label: '😞 Poor' },
  }

  // Calculate sizes based on count
  const ratings = [5, 4, 3, 2, 1]
  
  return (
    <div className="space-y-2">
      {ratings.map((rating) => {
        const count = ratingDistribution[rating] || 0
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0'
        const widthPercentage = total > 0 ? Math.max((count / total) * 100, 10) : 10
        
        return (
          <div key={rating} className="flex items-center gap-3">
            <div className="w-16 text-right">
              <span className="text-lg">{'★'.repeat(rating)}{'☆'.repeat(5-rating)}</span>
            </div>
            <div className="flex-1 h-10 bg-gray-100 rounded-lg overflow-hidden relative">
              <div 
                className={`h-full ${ratingColors[rating].bg} ${ratingColors[rating].text} flex items-center justify-between px-3 transition-all duration-500`}
                style={{ width: `${widthPercentage}%`, minWidth: count > 0 ? '80px' : '0' }}
              >
                {count > 0 && (
                  <>
                    <span className="text-xs font-medium truncate">{ratingColors[rating].label}</span>
                    <span className="font-bold">{count}</span>
                  </>
                )}
              </div>
              {count === 0 && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">0</span>
              )}
            </div>
            <div className="w-14 text-right text-sm text-gray-500">{percentage}%</div>
          </div>
        )
      })}
      
      {/* Average Rating */}
      {total > 0 && (
        <div className="mt-4 pt-4 border-t text-center">
          <span className="text-gray-500 text-sm">Average Rating: </span>
          <span className="text-2xl font-bold text-indigo-600">
            {(Object.entries(ratingDistribution).reduce((sum, [r, c]) => sum + (parseInt(r) * c), 0) / total).toFixed(1)}
          </span>
          <span className="text-yellow-500 ml-1">★</span>
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [activeTab, setActiveTab] = useState<'utm' | 'analytics' | 'ratings' | 'communications'>('utm')

  // Communications state
  const [commSubTab, setCommSubTab] = useState<'email' | 'whatsapp' | 'history'>('email')
  const [commSource, setCommSource] = useState<'registrants' | 'users'>('registrants')
  const [emailType, setEmailType] = useState<'confirmation' | 'reminder' | 'custom'>('reminder')
  const [commRecipients, setCommRecipients] = useState<any[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set())
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [waTemplateName, setWaTemplateName] = useState('')
  const [waTemplateParams, setWaTemplateParams] = useState<string[]>(['', '', '', '', ''])
  const [commLoading, setCommLoading] = useState(false)
  const [commSending, setCommSending] = useState(false)
  const [commResult, setCommResult] = useState<{ sent: number; failed: number; errors?: any[] } | null>(null)
  const [emailHistory, setEmailHistory] = useState<any[]>([])
  const [waHistory, setWaHistory] = useState<any[]>([])
  const [commFilter, setCommFilter] = useState({ webinarDate: '', status: '', course: '' })
  
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
  
  const [utmSourceOptions, setUtmSourceOptions] = useState<string[]>([])
  const [utmCampaignOptions, setUtmCampaignOptions] = useState<string[]>([])
  const [dailyRegistrations, setDailyRegistrations] = useState<DailyCount[]>([])

  // Ratings Analytics State
  const [ratings, setRatings] = useState<WebinarRating[]>([])
  const [ratingsLoading, setRatingsLoading] = useState(false)
  const [totalRegistrationsCount, setTotalRegistrationsCount] = useState(0)
  const [ratingDistribution, setRatingDistribution] = useState<{ [key: number]: number }>({})
  const [ratingsSearch, setRatingsSearch] = useState('')
  const [ratingsFilters, setRatingsFilters] = useState({
    rating: '',
    courseName: '',
    dateFrom: '',
    dateTo: ''
  })
  const [ratingsSortBy, setRatingsSortBy] = useState<string>('rated_at')
  const [ratingsSortOrder, setRatingsSortOrder] = useState<'asc' | 'desc'>('desc')
  const [courseNameOptions, setCourseNameOptions] = useState<string[]>([])

  // Check auth on mount
  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
      fetchCampaigns()
      fetchRegistrations()
      fetchUTMOptions()
      fetchRatings()
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
      fetchRatings()
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

  async function fetchUTMOptions() {
    try {
      const { data: sourceData, error: sourceError } = await supabase
        .from('qr_landing_registrations')
        .select('utm_source')
        .not('utm_source', 'is', null)
        .not('utm_source', 'eq', '')
      
      if (!sourceError && sourceData) {
        const uniqueSources = [...new Set(sourceData.map(d => d.utm_source).filter(Boolean))]
        setUtmSourceOptions(uniqueSources.sort())
      }

      const { data: campaignData, error: campaignError } = await supabase
        .from('qr_landing_registrations')
        .select('utm_campaign')
        .not('utm_campaign', 'is', null)
        .not('utm_campaign', 'eq', '')
      
      if (!campaignError && campaignData) {
        const uniqueCampaigns = [...new Set(campaignData.map(d => d.utm_campaign).filter(Boolean))]
        setUtmCampaignOptions(uniqueCampaigns.sort())
      }

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

    const dateMap: { [key: string]: number } = {}
    
    data.forEach(reg => {
      const date = new Date(reg.registered_at).toISOString().split('T')[0]
      dateMap[date] = (dateMap[date] || 0) + 1
    })

    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 13 * 24 * 60 * 60 * 1000)

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

  // Fetch Ratings
  async function fetchRatings() {
    setRatingsLoading(true)
    try {
      // Get total registrations count
      const { count: regCount } = await supabase
        .from('qr_landing_registrations')
        .select('*', { count: 'exact', head: true })
      
      setTotalRegistrationsCount(regCount || 0)

      // Get ratings
      let query = supabase
        .from('webinar_ratings')
        .select('*')
        .order(ratingsSortBy, { ascending: ratingsSortOrder === 'asc' })
        .limit(500)

      if (ratingsFilters.rating) {
        query = query.eq('rating', parseInt(ratingsFilters.rating))
      }
      if (ratingsFilters.courseName) {
        query = query.eq('course_name', ratingsFilters.courseName)
      }
      if (ratingsFilters.dateFrom) {
        query = query.gte('rated_at', ratingsFilters.dateFrom)
      }
      if (ratingsFilters.dateTo) {
        query = query.lte('rated_at', ratingsFilters.dateTo + 'T23:59:59')
      }

      const { data, error } = await query

      if (error) throw error
      
      let filteredData = data || []
      
      // Apply search filter (client-side for name/email/mobile)
      if (ratingsSearch.trim()) {
        const searchLower = ratingsSearch.toLowerCase()
        filteredData = filteredData.filter(r => 
          (r.full_name && r.full_name.toLowerCase().includes(searchLower)) ||
          (r.email && r.email.toLowerCase().includes(searchLower)) ||
          (r.mobile && r.mobile.includes(ratingsSearch))
        )
      }

      setRatings(filteredData)

      // Calculate rating distribution from all ratings (not filtered)
      const { data: allRatings } = await supabase
        .from('webinar_ratings')
        .select('rating')
      
      if (allRatings) {
        const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        allRatings.forEach(r => {
          if (r.rating >= 1 && r.rating <= 5) {
            distribution[r.rating]++
          }
        })
        setRatingDistribution(distribution)
      }

      // Get unique course names for filter
      const { data: courseData } = await supabase
        .from('webinar_ratings')
        .select('course_name')
        .not('course_name', 'is', null)
      
      if (courseData) {
        const uniqueCourses = [...new Set(courseData.map(d => d.course_name).filter(Boolean))]
        setCourseNameOptions(uniqueCourses.sort())
      }

    } catch (error) {
      console.error('Error fetching ratings:', error)
    } finally {
      setRatingsLoading(false)
    }
  }

  // Sort ratings
  function handleRatingsSort(column: string) {
    if (ratingsSortBy === column) {
      setRatingsSortOrder(ratingsSortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setRatingsSortBy(column)
      setRatingsSortOrder('asc')
    }
  }

  // Effect to refetch ratings when sort changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchRatings()
    }
  }, [ratingsSortBy, ratingsSortOrder])

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
      fetchUTMOptions()
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
      fetchUTMOptions()
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

  function exportRatingsToCSV() {
    if (ratings.length === 0) return

    const headers = ['Name', 'Email', 'Mobile', 'Course', 'Rating', 'Feedback', 'Rated At']
    const rows = ratings.map(r => [
      r.full_name || '',
      r.email,
      r.mobile || '',
      r.course_name || '',
      r.rating.toString(),
      r.feedback || '',
      new Date(r.rated_at).toLocaleString('en-IN')
    ])

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell?.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `webinar_ratings_${new Date().toISOString().split('T')[0]}.csv`
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

  function clearRatingsFilters() {
    setRatingsSearch('')
    setRatingsFilters({
      rating: '',
      courseName: '',
      dateFrom: '',
      dateTo: ''
    })
  }

  // Sort icon component
  function SortIcon({ column }: { column: string }) {
    if (ratingsSortBy !== column) {
      return <span className="text-gray-300 ml-1">↕</span>
    }
    return <span className="text-indigo-600 ml-1">{ratingsSortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  // Communications helpers
  const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || ''

  async function loadCommRecipients() {
    setCommLoading(true)
    setCommResult(null)
    setSelectedRecipients(new Set())
    try {
      const params = new URLSearchParams({
        source: commSource,
        emailType,
        ...(commFilter.webinarDate && { webinarDate: commFilter.webinarDate }),
        ...(commFilter.status && { status: commFilter.status }),
        ...(commFilter.course && { course: commFilter.course }),
      })
      const res = await fetch(`/api/admin/recipients?${params}`, {
        headers: { 'x-admin-secret': ADMIN_SECRET }
      })
      const data = await res.json()
      setCommRecipients(data.recipients || [])
    } catch (e) {
      console.error('Error loading recipients', e)
    } finally {
      setCommLoading(false)
    }
  }

  function toggleRecipient(id: string) {
    setSelectedRecipients(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllRecipients() {
    if (selectedRecipients.size === commRecipients.length) {
      setSelectedRecipients(new Set())
    } else {
      setSelectedRecipients(new Set(commRecipients.map(r => r.id)))
    }
  }

  async function sendEmails() {
    const recipients = commRecipients.filter(r => selectedRecipients.has(r.id))
    if (!recipients.length || !emailSubject || !emailBody) return
    setCommSending(true)
    setCommResult(null)
    try {
      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
        body: JSON.stringify({ recipients, subject: emailSubject, htmlBody: emailBody, emailType })
      })
      const data = await res.json()
      setCommResult(data)
    } catch (e) {
      console.error('Error sending emails', e)
    } finally {
      setCommSending(false)
    }
  }

  async function sendWhatsApps() {
    const recipients = commRecipients.filter(r => selectedRecipients.has(r.id))
    if (!recipients.length || !waTemplateName) return
    setCommSending(true)
    setCommResult(null)
    try {
      const res = await fetch('/api/admin/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
        body: JSON.stringify({ recipients, templateName: waTemplateName, templateParams: waTemplateParams.filter(p => p.trim()) })
      })
      const data = await res.json()
      setCommResult(data)
    } catch (e) {
      console.error('Error sending WhatsApp', e)
    } finally {
      setCommSending(false)
    }
  }

  async function loadHistory() {
    const { data: emails } = await supabase
      .from('awa_email_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setEmailHistory(emails || [])

    const { data: was } = await supabase
      .from('whatsapp_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setWaHistory(was || [])
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
                📊 UTM
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'analytics' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}
              >
                📈 Registrations
              </button>
              <button
                onClick={() => { setActiveTab('ratings'); fetchRatings(); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'ratings' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}
              >
                ⭐ Ratings
              </button>
              <button
                onClick={() => setActiveTab('communications')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'communications' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}
              >
                📨 Communications
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

        {/* Ratings Analytics Tab */}
        {activeTab === 'ratings' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">⭐ Ratings & Feedback Analytics</h2>
              <button
                onClick={exportRatingsToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                📥 Export CSV
              </button>
            </div>

            {/* Funnel & TreeMap Charts */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Funnel Chart */}
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">📊 Registration → Rating Funnel</h3>
                <FunnelChart 
                  totalRegistrations={totalRegistrationsCount} 
                  totalRated={Object.values(ratingDistribution).reduce((a, b) => a + b, 0)} 
                />
              </div>

              {/* Rating TreeMap */}
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">⭐ Rating Distribution</h3>
                <RatingTreeMap ratingDistribution={ratingDistribution} />
              </div>
            </div>

            {/* Search & Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm border mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">🔍 Search & Filter</h3>
                <button
                  onClick={clearRatingsFilters}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Clear All
                </button>
              </div>
              <div className="grid grid-cols-7 gap-3">
                {/* Search Bar */}
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Search (Name, Email, Mobile)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-1.5 border rounded text-sm"
                    placeholder="🔍 Search..."
                    value={ratingsSearch}
                    onChange={(e) => setRatingsSearch(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rating</label>
                  <select
                    className="w-full px-2 py-1.5 border rounded text-sm"
                    value={ratingsFilters.rating}
                    onChange={(e) => setRatingsFilters({...ratingsFilters, rating: e.target.value})}
                  >
                    <option value="">All Ratings</option>
                    <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                    <option value="4">⭐⭐⭐⭐ (4)</option>
                    <option value="3">⭐⭐⭐ (3)</option>
                    <option value="2">⭐⭐ (2)</option>
                    <option value="1">⭐ (1)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Course</label>
                  <select
                    className="w-full px-2 py-1.5 border rounded text-sm"
                    value={ratingsFilters.courseName}
                    onChange={(e) => setRatingsFilters({...ratingsFilters, courseName: e.target.value})}
                  >
                    <option value="">All Courses</option>
                    {courseNameOptions.map((course) => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date From</label>
                  <input
                    type="date"
                    className="w-full px-2 py-1.5 border rounded text-sm"
                    value={ratingsFilters.dateFrom}
                    onChange={(e) => setRatingsFilters({...ratingsFilters, dateFrom: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date To</label>
                  <input
                    type="date"
                    className="w-full px-2 py-1.5 border rounded text-sm"
                    value={ratingsFilters.dateTo}
                    onChange={(e) => setRatingsFilters({...ratingsFilters, dateTo: e.target.value})}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={fetchRatings}
                    className="w-full py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>

            {/* Ratings Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              {ratingsLoading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : ratings.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No ratings found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleRatingsSort('full_name')}
                        >
                          Name <SortIcon column="full_name" />
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleRatingsSort('email')}
                        >
                          Email <SortIcon column="email" />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleRatingsSort('course_name')}
                        >
                          Course <SortIcon column="course_name" />
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleRatingsSort('rating')}
                        >
                          Rating <SortIcon column="rating" />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feedback</th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                          onClick={() => handleRatingsSort('rated_at')}
                        >
                          Rated At <SortIcon column="rated_at" />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {ratings.map((r, idx) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{r.full_name || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">{r.email}</span>
                              {r.email && (
                                <a
                                  href={`mailto:${r.email}?subject=Thanks for attending AIwithArijit Webinar&body=Hi ${r.full_name || ''},%0D%0A%0D%0AThanks for your rating!%0D%0A%0D%0ARegards,%0D%0ATeam AIwithArijit`}
                                  className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition-colors"
                                  title="Send Email"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-600">{r.mobile || '-'}</span>
                              {r.mobile && (
                                <>
                                  {/* Phone Call Button */}
                                  <a
                                    href={`tel:${r.mobile}`}
                                    className="inline-flex items-center justify-center w-7 h-7 bg-green-100 hover:bg-green-200 text-green-600 rounded-full transition-colors"
                                    title="Call"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                  </a>
                                  {/* WhatsApp Button */}
                                  <a
                                    href={`https://wa.me/${r.mobile.replace(/[^0-9]/g, '').replace(/^0+/, '91')}?text=${encodeURIComponent(`Hi ${r.full_name || ''}!\n\nThanks for your Rating! 🙏\n\nRegards,\nTeam AIwithArijit\n🌐 AIwithArijit.com`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center w-7 h-7 bg-emerald-100 hover:bg-emerald-200 text-emerald-600 rounded-full transition-colors"
                                    title="WhatsApp"
                                  >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>
                                  </a>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {r.course_name ? (
                              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs truncate max-w-[150px] block">
                                {r.course_name}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-500">{'★'.repeat(r.rating)}</span>
                              <span className="text-gray-300">{'★'.repeat(5 - r.rating)}</span>
                              <span className="ml-1 text-xs text-gray-500">({r.rating})</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-[200px]">
                            {r.feedback ? (
                              <div className="relative group cursor-pointer">
                                <span className="truncate block">
                                  {r.feedback.length > 40 ? r.feedback.substring(0, 40) + '...' : r.feedback}
                                </span>
                                {/* Full Feedback Tooltip */}
                                <div className="hidden group-hover:block absolute z-20 bottom-full left-0 mb-2 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl">
                                  <div className="font-semibold mb-1 text-yellow-400">💬 Full Feedback:</div>
                                  <div className="whitespace-pre-wrap">{r.feedback}</div>
                                  <div className="absolute bottom-0 left-4 transform translate-y-full">
                                    <div className="border-8 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {new Date(r.rated_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Summary Stats */}
            <div className="mt-4 text-center text-sm text-gray-500">
              Showing {ratings.length} rating{ratings.length !== 1 ? 's' : ''}
              {ratingsSearch && ` matching "${ratingsSearch}"`}
            </div>
          </div>
        )}

        {/* Communications Tab */}
        {activeTab === 'communications' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Communications</h2>
              <span className="text-sm text-gray-500">Email & WhatsApp Reminders</span>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-2 mb-6 border-b">
              {(['email', 'whatsapp', 'history'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setCommSubTab(tab); if (tab === 'history') loadHistory() }}
                  className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${commSubTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {tab === 'email' ? '✉️ Email' : tab === 'whatsapp' ? '💬 WhatsApp' : '🕘 History'}
                </button>
              ))}
            </div>

            {/* Shared: Source + Filters + Recipient Loader */}
            {commSubTab !== 'history' && (
              <div className="bg-white rounded-xl border p-5 mb-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Source */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Recipient Source</label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      value={commSource}
                      onChange={e => setCommSource(e.target.value as any)}
                    >
                      <option value="registrants">Webinar Registrants</option>
                      <option value="users">All Users (Students)</option>
                    </select>
                  </div>

                  {/* Email Type (only for email sub-tab) */}
                  {commSubTab === 'email' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email Type</label>
                      <select
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        value={emailType}
                        onChange={e => setEmailType(e.target.value as any)}
                      >
                        <option value="reminder">Webinar Reminder</option>
                        <option value="confirmation">Registration Confirmation</option>
                        <option value="custom">Custom Broadcast</option>
                      </select>
                    </div>
                  )}

                  {/* Filters */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Webinar Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      value={commFilter.webinarDate}
                      onChange={e => setCommFilter(f => ({ ...f, webinarDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Course (contains)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="e.g. AI, Python"
                      value={commFilter.course}
                      onChange={e => setCommFilter(f => ({ ...f, course: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={loadCommRecipients}
                    disabled={commLoading}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {commLoading ? 'Loading...' : 'Load Recipients'}
                  </button>
                  {commRecipients.length > 0 && (
                    <span className="text-sm text-gray-600">
                      <span className="font-semibold text-indigo-600">{commRecipients.length}</span> found,{' '}
                      <span className="font-semibold">{selectedRecipients.size}</span> selected
                    </span>
                  )}
                  {commRecipients.length > 0 && (
                    <button
                      onClick={toggleAllRecipients}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      {selectedRecipients.size === commRecipients.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {/* Recipient Table */}
                {commRecipients.length > 0 && (
                  <div className="overflow-x-auto max-h-48 overflow-y-auto border rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left w-8">
                            <input
                              type="checkbox"
                              checked={selectedRecipients.size === commRecipients.length}
                              onChange={toggleAllRecipients}
                              className="rounded"
                            />
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Name</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Email</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Mobile</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Course</th>
                          {commSource === 'registrants' && (
                            <>
                              <th className="px-3 py-2 text-left font-medium text-gray-600">Webinar Date</th>
                              <th className="px-3 py-2 text-center font-medium text-gray-600">Email Sent</th>
                              <th className="px-3 py-2 text-center font-medium text-gray-600">WA Sent</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {commRecipients.map(r => (
                          <tr key={r.id} className={`hover:bg-gray-50 ${selectedRecipients.has(r.id) ? 'bg-indigo-50' : ''}`}>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={selectedRecipients.has(r.id)}
                                onChange={() => toggleRecipient(r.id)}
                                className="rounded"
                              />
                            </td>
                            <td className="px-3 py-2 font-medium">{r.name}</td>
                            <td className="px-3 py-2 text-gray-500">{r.email}</td>
                            <td className="px-3 py-2 text-gray-500">{r.mobile}</td>
                            <td className="px-3 py-2 text-gray-500">{r.course_name || '-'}</td>
                            {commSource === 'registrants' && (
                              <>
                                <td className="px-3 py-2 text-gray-500">{r.webinar_date || '-'}</td>
                                <td className="px-3 py-2 text-center">
                                  {r.confirmation_email_sent || r.reminder_email_sent
                                    ? <span className="text-green-600">✓</span>
                                    : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {r.whatsapp_sent
                                    ? <span className="text-green-600">✓</span>
                                    : <span className="text-gray-300">—</span>}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* EMAIL Composer */}
            {commSubTab === 'email' && (
              <div className="bg-white rounded-xl border p-5 space-y-4">
                <h3 className="font-semibold text-gray-800">Compose Email</h3>
                <p className="text-xs text-gray-500">
                  Available variables: <code className="bg-gray-100 px-1 rounded">{'{{name}}'}</code>{' '}
                  <code className="bg-gray-100 px-1 rounded">{'{{course}}'}</code>{' '}
                  <code className="bg-gray-100 px-1 rounded">{'{{webinar_date}}'}</code>{' '}
                  <code className="bg-gray-100 px-1 rounded">{'{{webinar_time}}'}</code>
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="e.g. Reminder: Your AI webinar is tomorrow, {{name}}!"
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Body (HTML supported)</label>
                  <textarea
                    rows={12}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                    placeholder={`Hi {{name}},\n\nThis is a reminder that your webinar on {{course}} is scheduled for {{webinar_date}} at {{webinar_time}}.\n\nSee you there!\n\nTeam AIwithArijit`}
                    value={emailBody}
                    onChange={e => setEmailBody(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={sendEmails}
                    disabled={commSending || selectedRecipients.size === 0 || !emailSubject || !emailBody}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {commSending ? 'Sending...' : `Send to ${selectedRecipients.size} recipient${selectedRecipients.size !== 1 ? 's' : ''}`}
                  </button>
                  {commSending && (
                    <span className="text-sm text-gray-500 animate-pulse">Sending emails, please wait…</span>
                  )}
                </div>
                {commResult && (
                  <div className={`p-4 rounded-lg text-sm ${commResult.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <p className="font-semibold">
                      ✅ Sent: {commResult.sent} &nbsp; {commResult.failed > 0 && `❌ Failed: ${commResult.failed}`}
                    </p>
                    {commResult.errors && commResult.errors.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-red-600">
                        {commResult.errors.slice(0, 5).map((e: any, i: number) => (
                          <li key={i}>{e.email}: {e.error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* WHATSAPP Composer */}
            {commSubTab === 'whatsapp' && (
              <div className="bg-white rounded-xl border p-5 space-y-4">
                <h3 className="font-semibold text-gray-800">WhatsApp Template Message (via AiSensy)</h3>
                <p className="text-xs text-gray-500">
                  Enter the exact pre-approved template name from your AiSensy dashboard. Params support{' '}
                  <code className="bg-gray-100 px-1 rounded">{'{{name}}'}</code>{' '}
                  <code className="bg-gray-100 px-1 rounded">{'{{course}}'}</code>{' '}
                  <code className="bg-gray-100 px-1 rounded">{'{{webinar_date}}'}</code>{' '}
                  <code className="bg-gray-100 px-1 rounded">{'{{webinar_time}}'}</code>
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="e.g. webinar_reminder_v1"
                    value={waTemplateName}
                    onChange={e => setWaTemplateName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Template Parameters</label>
                  <div className="space-y-2">
                    {waTemplateParams.map((p, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-12">{'{{' + (i + 1) + '}}'}</span>
                        <input
                          type="text"
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                          placeholder={`Parameter ${i + 1} value or variable`}
                          value={p}
                          onChange={e => {
                            const next = [...waTemplateParams]
                            next[i] = e.target.value
                            setWaTemplateParams(next)
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={sendWhatsApps}
                    disabled={commSending || selectedRecipients.size === 0 || !waTemplateName}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {commSending ? 'Sending...' : `Send WhatsApp to ${selectedRecipients.size}`}
                  </button>
                  {commSending && (
                    <span className="text-sm text-gray-500 animate-pulse">Sending messages, this may take a moment…</span>
                  )}
                </div>
                {commResult && (
                  <div className={`p-4 rounded-lg text-sm ${commResult.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <p className="font-semibold">
                      ✅ Sent: {commResult.sent} &nbsp; {commResult.failed > 0 && `❌ Failed: ${commResult.failed}`}
                    </p>
                    {commResult.errors && commResult.errors.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-red-600">
                        {commResult.errors.slice(0, 5).map((e: any, i: number) => (
                          <li key={i}>{e.mobile}: {e.error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* HISTORY */}
            {commSubTab === 'history' && (
              <div className="space-y-6">
                {/* Email History */}
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-800 mb-3">Email Log (last 50)</h3>
                  {emailHistory.length === 0 ? (
                    <p className="text-gray-400 text-sm">No emails sent yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Recipient</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Subject</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Type</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Sent At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {emailHistory.map(e => (
                            <tr key={e.id}>
                              <td className="px-3 py-2">
                                <div className="font-medium">{e.recipient_name}</div>
                                <div className="text-gray-400">{e.recipient_email}</div>
                              </td>
                              <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{e.subject}</td>
                              <td className="px-3 py-2 text-gray-500">{e.template_name}</td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded-full font-medium ${e.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {e.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                                {e.sent_at ? new Date(e.sent_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* WhatsApp History */}
                <div className="bg-white rounded-xl border p-5">
                  <h3 className="font-semibold text-gray-800 mb-3">WhatsApp Log (last 50)</h3>
                  {waHistory.length === 0 ? (
                    <p className="text-gray-400 text-sm">No WhatsApp messages sent yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Recipient</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Phone</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Template</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Sent At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {waHistory.map(w => (
                            <tr key={w.id}>
                              <td className="px-3 py-2 font-medium">{w.recipient_name}</td>
                              <td className="px-3 py-2 text-gray-500">{w.recipient_phone}</td>
                              <td className="px-3 py-2 text-gray-500">{w.template_name}</td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded-full font-medium ${w.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {w.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                                {w.sent_at ? new Date(w.sent_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
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
        )}
      </div>
    </div>
  )
}
