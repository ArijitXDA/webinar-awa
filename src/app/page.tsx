'use client'

import { useState, useEffect } from 'react'
import { supabase, WebinarLink, Registration } from '@/lib/supabase'

// Icons as inline SVGs
const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const XIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const WhatsAppIcon = () => (
  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
)

const LinkedInIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

const ShareIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
)

// Color mapping for different course types
const courseColors: { [key: number]: string } = {
  1: 'from-purple-500 to-indigo-600',
  2: 'from-emerald-500 to-teal-600',
  3: 'from-blue-500 to-cyan-600',
  4: 'from-orange-500 to-amber-600',
  5: 'from-rose-500 to-pink-600',
}

const courseIcons: { [key: number]: string } = {
  1: '💼',
  2: '📚',
  3: '🎓',
  4: '💻',
  5: '🏆',
}

// Profession choices for the form
const professionChoices = [
  { value: 'school_student', label: 'School Student' },
  { value: 'college_student', label: 'College Student' },
  { value: 'job_seeker', label: 'Job Seeker' },
  { value: 'working_professional', label: 'Working Professional' },
  { value: 'tech_developer', label: 'Tech Developer' },
  { value: 'data_engineer_scientist', label: 'Data Engineer / Data Scientist' },
  { value: 'home_maker', label: 'Home Maker' },
  { value: 'other', label: 'Other' },
]

// Fallback webinar data
const fallbackWebinars = [
  {
    id: '1', course_id: 1, course_name: 'Agentic AI Certification for Working Professionals',
    course_short_name: 'Agentic AI - Professionals', duration_minutes: 90,
    target_audience: 'Working Professionals across all industries - IT, Finance, Healthcare, Manufacturing, Retail, Education.',
    age_group: '24 to 60 years', webinar_date: '2025-01-19', webinar_time: '11:00:00', timezone: 'IST',
    registration_link: null, ms_teams_link: null, is_active: true, max_registrations: 500, current_registrations: 0,
    course_description: 'Master Agentic AI concepts',
    benefits: ['Official AI Certification', 'Hands-on Training', 'Career Guidance', 'Lifetime AI Library Access', 'Resume Tips'],
    course_order: 1
  },
  {
    id: '2', course_id: 2, course_name: 'AI for School Students & Future Readiness',
    course_short_name: 'AI for Schools', duration_minutes: 90,
    target_audience: 'School students who want to get ahead. Parents encouraged to join.',
    age_group: '10 to 16 years', webinar_date: '2025-01-19', webinar_time: '15:00:00', timezone: 'IST',
    registration_link: null, ms_teams_link: null, is_active: true, max_registrations: 500, current_registrations: 0,
    course_description: 'Fun AI introduction',
    benefits: ['Certificate of Participation', 'Fun AI Activities', 'Career Path Guidance', 'Free Resources', 'Parent Guide'],
    course_order: 2
  },
  {
    id: '3', course_id: 3, course_name: 'AI Certification for College Students & Job Seekers',
    course_short_name: 'AI for College & Job Seekers', duration_minutes: 90,
    target_audience: 'College students, fresh graduates, and job seekers.',
    age_group: '17 to 23 years', webinar_date: '2025-01-19', webinar_time: '17:00:00', timezone: 'IST',
    registration_link: null, ms_teams_link: null, is_active: true, max_registrations: 500, current_registrations: 0,
    course_description: 'Get job-ready with AI',
    benefits: ['AI Certification for Resume', 'LinkedIn Optimization', 'Internship Opportunities', 'Interview Prep', 'Resources'],
    course_order: 3
  },
  {
    id: '4', course_id: 4, course_name: 'Agentic AI Development for Tech Professionals',
    course_short_name: 'Agentic AI - Tech Dev', duration_minutes: 90,
    target_audience: 'Software Developers, Data Engineers, Data Scientists, ML Engineers.',
    age_group: '20 to 55 years', webinar_date: '2025-01-19', webinar_time: '19:00:00', timezone: 'IST',
    registration_link: null, ms_teams_link: null, is_active: true, max_registrations: 500, current_registrations: 0,
    course_description: 'Build AI Agents',
    benefits: ['Developer Certification', 'Hands-on Workshop', 'Code Repos', 'Framework Training', 'Dev Community'],
    course_order: 4
  },
  {
    id: '5', course_id: 5, course_name: 'Digital & Generative AI Transformation for Business Leaders',
    course_short_name: 'AI for Business Leaders', duration_minutes: 90,
    target_audience: 'CXOs, Directors, VPs, General Managers, Entrepreneurs.',
    age_group: '30 to 65 years', webinar_date: '2025-01-19', webinar_time: '21:00:00', timezone: 'IST',
    registration_link: null, ms_teams_link: null, is_active: true, max_registrations: 500, current_registrations: 0,
    course_description: 'Strategic AI transformation',
    benefits: ['Executive AI Certificate', 'Strategy Framework', 'ROI Models', 'Case Studies', 'Consultation'],
    course_order: 5
  }
]

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

// Format time for display
function formatTime(timeStr: string, timezone: string): string {
  const [hours, minutes] = timeStr.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm} ${timezone}`
}

// Get UTM parameters from URL
function getUTMParams(): { [key: string]: string } {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  return {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_term: params.get('utm_term') || '',
    utm_content: params.get('utm_content') || '',
  }
}

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

function getBrowser(): string {
  if (typeof window === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Edge')) return 'Edge'
  return 'Other'
}

export default function Home() {
  const [webinars, setWebinars] = useState<WebinarLink[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCard, setExpandedCard] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedWebinar, setSelectedWebinar] = useState<WebinarLink | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [registeredData, setRegisteredData] = useState<{name: string, date: string, time: string, timezone: string} | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [landingUrl, setLandingUrl] = useState('')
  
  const [formData, setFormData] = useState({
    full_name: '', email: '', mobile: '', date_of_birth: '',
    profession_choice: '', other_profession_description: '', marketing_consent: true,
  })
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLandingUrl(window.location.origin + window.location.pathname)
    }
    fetchWebinars()
  }, [])

  async function fetchWebinars() {
    try {
      const { data, error } = await supabase
        .from('QR_landing_webinar_links')
        .select('*')
        .eq('is_active', true)
        .order('course_order', { ascending: true })

      if (error) {
        console.error('Supabase fetch error:', error)
        setWebinars(fallbackWebinars as any)
      } else {
        setWebinars(data && data.length > 0 ? data : fallbackWebinars as any)
      }
    } catch (error) {
      console.error('Error fetching webinars:', error)
      setWebinars(fallbackWebinars as any)
    } finally {
      setLoading(false)
    }
  }

  function validateForm(): boolean {
    const errors: {[key: string]: string} = {}
    if (!formData.full_name.trim()) errors.full_name = 'Name is required'
    if (!formData.email.trim()) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format'
    if (!formData.mobile.trim()) errors.mobile = 'Mobile is required'
    else if (!/^[+]?[\d\s-]{10,15}$/.test(formData.mobile.replace(/\s/g, ''))) errors.mobile = 'Invalid mobile number'
    if (!formData.date_of_birth) errors.date_of_birth = 'Date of birth is required'
    if (!formData.profession_choice) errors.profession_choice = 'Please select your profession'
    if (formData.profession_choice === 'other' && !formData.other_profession_description.trim()) {
      errors.other_profession_description = 'Please describe your profession'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateForm() || !selectedWebinar) return
    
    setSubmitting(true)
    setErrorMessage(null)
    
    try {
      const utmParams = getUTMParams()
      
      const registrationData = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        mobile: formData.mobile.trim(),
        date_of_birth: formData.date_of_birth,
        profession_choice: formData.profession_choice,
        other_profession_description: formData.profession_choice === 'other' ? formData.other_profession_description.trim() : null,
        course_id: selectedWebinar.course_id,
        course_name: selectedWebinar.course_name,
        webinar_date: selectedWebinar.webinar_date,
        webinar_time: selectedWebinar.webinar_time,
        timezone: selectedWebinar.timezone,
        marketing_consent: formData.marketing_consent,
        utm_source: utmParams.utm_source || null,
        utm_medium: utmParams.utm_medium || null,
        utm_campaign: utmParams.utm_campaign || null,
        utm_term: utmParams.utm_term || null,
        utm_content: utmParams.utm_content || null,
        referrer_url: typeof document !== 'undefined' ? document.referrer || null : null,
        landing_page_url: typeof window !== 'undefined' ? window.location.href : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        device_type: getDeviceType(),
        browser: getBrowser(),
      }

      const { data, error } = await supabase
        .from('QR_landing_registrations')
        .insert([registrationData])
        .select()

      if (error) throw error

      setRegisteredData({
        name: formData.full_name,
        date: formatDate(selectedWebinar.webinar_date),
        time: formatTime(selectedWebinar.webinar_time, selectedWebinar.timezone),
        timezone: selectedWebinar.timezone
      })
      setSubmitted(true)
    } catch (error: any) {
      console.error('Registration error:', error)
      setErrorMessage(error.message || 'Registration failed. Please try again or contact AI@withArijit.com')
    } finally {
      setSubmitting(false)
    }
  }

  function openRegistrationModal(webinar: WebinarLink) {
    setSelectedWebinar(webinar)
    setShowModal(true)
    setSubmitted(false)
    setErrorMessage(null)
    setFormData({ full_name: '', email: '', mobile: '', date_of_birth: '', profession_choice: '', other_profession_description: '', marketing_consent: true })
    setFormErrors({})
  }

  function closeModal() {
    setShowModal(false)
    setSelectedWebinar(null)
    setSubmitted(false)
    setErrorMessage(null)
  }

  function getWhatsAppShareLink(): string {
    const message = encodeURIComponent(
      `🎓 I am attending this 90 minute AI Certification webinar by AI Researcher & trainer Arijit Chowdhury.\n\n` +
      `✅ You also can register yourself now!\n\n` +
      `What you get:\n` +
      `📜 AI Certificates to update your resume\n` +
      `💼 LinkedIn profile boost\n` +
      `🚀 Career prospects with AI skills\n\n` +
      `⏱️ It's a 90 Minute online webinar\n` +
      `💯 It's completely FREE!\n\n` +
      `👉 Register here: ${landingUrl}`
    )
    return `https://wa.me/?text=${message}`
  }

  const trustBadges = [
    { icon: '🎥', text: 'Online Live Sessions' },
    { icon: '👨‍🏫', text: 'Expert Trainers' },
    { icon: '📜', text: 'Career Certificate' },
    { icon: '📚', text: 'AI Library Access' },
    { icon: '🎁', text: 'Get Bonus Codes' },
  ]

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-4 pb-2 px-4">
        <div className="max-w-lg mx-auto">
          {/* Logo */}
          <div className="flex items-center justify-center mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">
                AI
              </div>
              <span className="text-xl font-bold text-gray-800">WithArijit.com</span>
            </div>
          </div>
          
          {/* Hero Section */}
          <div className="text-center mb-3">
            <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold mb-2 shadow-sm">
              <SparklesIcon />
              <span>100% FREE Certification</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2 leading-tight">
              Get <span className="gradient-text">AI Certified</span> in
              <br />90 Minutes
            </h1>
            <p className="text-sm text-gray-600 max-w-xs mx-auto leading-relaxed">
              Boost your resume, LinkedIn & career prospects with industry-recognized AI certification
            </p>
          </div>

          {/* Trainer Info */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 mb-3 border border-indigo-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                AC
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">Arijit Chowdhury</p>
                <p className="text-xs text-gray-600 leading-tight">
                  Researcher & Trainer - Agentic AI & Quantum Computing
                </p>
                <p className="text-xs text-indigo-600 font-medium">
                  IIT-Bombay • Star Analytix • NLDIBM
                </p>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
            {trustBadges.map((badge, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-white rounded-full px-2.5 py-1 shadow-sm border border-gray-100 flex-shrink-0">
                <span className="text-sm">{badge.icon}</span>
                <span className="text-xs text-gray-700 font-medium whitespace-nowrap">{badge.text}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Course Cards Section */}
      <section className="relative z-10 px-3 pb-24">
        <div className="max-w-lg mx-auto">
          <h2 className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Choose Your Track
          </h2>
          
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 shimmer h-16" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {webinars.map((webinar) => (
                <div key={webinar.course_id} className={`webinar-card ${expandedCard === webinar.course_id ? 'ring-2 ring-indigo-500/50' : ''}`}>
                  <div className="p-2.5 cursor-pointer" onClick={() => setExpandedCard(expandedCard === webinar.course_id ? null : webinar.course_id)}>
                    <div className="flex items-start gap-2.5">
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${courseColors[webinar.course_order] || courseColors[1]} flex items-center justify-center text-base shadow-md flex-shrink-0`}>
                        {courseIcons[webinar.course_order] || '🎯'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-0.5 pr-5">{webinar.course_short_name}</h3>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                          <span className="flex items-center gap-0.5"><ClockIcon />{webinar.duration_minutes}min</span>
                          <span className="flex items-center gap-0.5"><CalendarIcon />{formatDate(webinar.webinar_date)}</span>
                          <span>{formatTime(webinar.webinar_time, webinar.timezone)}</span>
                        </div>
                      </div>
                      <div className={`transition-transform duration-300 text-gray-400 ${expandedCard === webinar.course_id ? 'rotate-180' : ''}`}>
                        <ChevronDownIcon />
                      </div>
                    </div>
                  </div>

                  {expandedCard === webinar.course_id && (
                    <div className="px-2.5 pb-2.5 animate-fade-in">
                      <div className="pt-2 border-t border-gray-100">
                        <div className="mb-2">
                          <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-xs font-medium mb-1">
                            <UsersIcon />{webinar.age_group}
                          </span>
                          <p className="text-xs text-gray-600 leading-relaxed">{webinar.target_audience}</p>
                        </div>
                        <div className="mb-2">
                          <h4 className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">What You Get</h4>
                          <ul className="space-y-1">
                            {(Array.isArray(webinar.benefits) ? webinar.benefits : []).slice(0, 5).map((benefit, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-600">
                                <span className="w-3.5 h-3.5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <svg className="w-2 h-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </span>
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); openRegistrationModal(webinar); }}
                          className={`w-full py-2 rounded-lg font-semibold text-white text-sm bg-gradient-to-r ${courseColors[webinar.course_order] || courseColors[1]} shadow-lg hover:shadow-xl transition-all duration-300 active:scale-[0.98]`}>
                          Register Now - FREE
                        </button>
                      </div>
                    </div>
                  )}

                  {expandedCard !== webinar.course_id && (
                    <div className="px-2.5 pb-2.5">
                      <button onClick={(e) => { e.stopPropagation(); openRegistrationModal(webinar); }}
                        className={`w-full py-1.5 rounded-lg font-semibold text-white text-sm bg-gradient-to-r ${courseColors[webinar.course_order] || courseColors[1]} shadow-md hover:shadow-lg transition-all duration-300 active:scale-[0.98]`}>
                        Register FREE
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 py-2 px-4 z-40">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-xs text-gray-500">© 2025 <span className="font-semibold">AIwithArijit.com</span> | Powered by Star Analytix & oStaran</p>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <a href="https://wa.me/919930051053?text=Hi%20Arijit%2C%20I%20want%20to%20know%20more%20about%20the%20AI%20Certification%20Webinar"
        target="_blank" rel="noopener noreferrer" className="whatsapp-btn" aria-label="Chat on WhatsApp">
        <WhatsAppIcon />
      </a>

      {/* Registration Modal - Fixed for mobile scrolling */}
      {showModal && selectedWebinar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={closeModal}>
          <div className="min-h-screen py-4 px-4 flex items-start justify-center overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
              {/* Modal header */}
              <div className={`bg-gradient-to-r ${courseColors[selectedWebinar.course_order] || courseColors[1]} text-white p-4 rounded-t-2xl`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">Register Now</h3>
                    <p className="text-sm opacity-90">{selectedWebinar.course_short_name}</p>
                  </div>
                  <button onClick={closeModal} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                    <XIcon />
                  </button>
                </div>
              </div>

              {/* Modal body - scrollable */}
              <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                {!submitted ? (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-gray-500 mb-0.5">You are registering for</p>
                      <p className="font-semibold text-gray-800 text-sm">{selectedWebinar.course_name}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{formatDate(selectedWebinar.webinar_date)} at {formatTime(selectedWebinar.webinar_time, selectedWebinar.timezone)}</p>
                    </div>

                    {errorMessage && (
                      <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{errorMessage}</div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                      <input type="text" className={`w-full px-3 py-2.5 rounded-lg border ${formErrors.full_name ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm`}
                        placeholder="Enter your full name" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} />
                      {formErrors.full_name && <p className="text-red-500 text-xs mt-1">{formErrors.full_name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                      <input type="email" className={`w-full px-3 py-2.5 rounded-lg border ${formErrors.email ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm`}
                        placeholder="your.email@example.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                      {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                      <input type="tel" className={`w-full px-3 py-2.5 rounded-lg border ${formErrors.mobile ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm`}
                        placeholder="+91 98765 43210" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} />
                      {formErrors.mobile && <p className="text-red-500 text-xs mt-1">{formErrors.mobile}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                      <input type="date" className={`w-full px-3 py-2.5 rounded-lg border ${formErrors.date_of_birth ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm`}
                        value={formData.date_of_birth} onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})} />
                      {formErrors.date_of_birth && <p className="text-red-500 text-xs mt-1">{formErrors.date_of_birth}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">I am a... *</label>
                      <select className={`w-full px-3 py-2.5 rounded-lg border ${formErrors.profession_choice ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm`}
                        value={formData.profession_choice} onChange={(e) => setFormData({...formData, profession_choice: e.target.value})}>
                        <option value="">Select your profession</option>
                        {professionChoices.map((choice) => (<option key={choice.value} value={choice.value}>{choice.label}</option>))}
                      </select>
                      {formErrors.profession_choice && <p className="text-red-500 text-xs mt-1">{formErrors.profession_choice}</p>}
                    </div>

                    {formData.profession_choice === 'other' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Please describe *</label>
                        <input type="text" className={`w-full px-3 py-2.5 rounded-lg border ${formErrors.other_profession_description ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm`}
                          placeholder="Describe your profession" value={formData.other_profession_description} onChange={(e) => setFormData({...formData, other_profession_description: e.target.value})} />
                        {formErrors.other_profession_description && <p className="text-red-500 text-xs mt-1">{formErrors.other_profession_description}</p>}
                      </div>
                    )}

                    <div className="flex items-start gap-2">
                      <input type="checkbox" id="consent" className="w-4 h-4 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={formData.marketing_consent} onChange={(e) => setFormData({...formData, marketing_consent: e.target.checked})} />
                      <label htmlFor="consent" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
                        You authorize <span className="font-semibold">AIwithArijit, Star Analytix, oStaran</span> to send you AI course related communications.
                      </label>
                    </div>

                    <button type="submit" disabled={submitting}
                      className={`w-full py-3 rounded-xl font-bold text-white text-base bg-gradient-to-r ${courseColors[selectedWebinar.course_order] || courseColors[1]} shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed`}>
                      {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Submitting...
                        </span>
                      ) : 'Complete Registration'}
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">🎉 Registration Successful!</h3>
                    <p className="text-gray-600 mb-3 text-sm">
                      Thank you <span className="font-semibold">{registeredData?.name}</span> for registering for the AI Webinar on{' '}
                      <span className="font-semibold">{registeredData?.date}</span> at <span className="font-semibold">{registeredData?.time}</span>.
                    </p>
                    <div className="bg-blue-50 rounded-lg p-3 mb-3">
                      <p className="text-sm text-blue-800">📧 You shall soon receive a <span className="font-semibold">Live Session Registration Link</span> in your email & WhatsApp.</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 mb-3 border border-green-100">
                      <p className="text-sm font-semibold text-gray-800 mb-2 flex items-center justify-center gap-1">
                        <ShareIcon />Invite Friends & Colleagues
                      </p>
                      <a href={getWhatsAppShareLink()} target="_blank" rel="noopener noreferrer"
                        className="w-full py-2 rounded-lg font-semibold text-white text-sm bg-green-500 hover:bg-green-600 shadow-md flex items-center justify-center gap-2 transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        Share on WhatsApp
                      </a>
                    </div>

                    <a href="https://www.linkedin.com/in/arijit-chowdhury-86020b19/" target="_blank" rel="noopener noreferrer"
                      className="w-full py-2 rounded-lg font-semibold text-white text-sm bg-blue-600 hover:bg-blue-700 shadow-md flex items-center justify-center gap-2 mb-3 transition-colors">
                      <LinkedInIcon />View Trainer's Profile
                    </a>

                    <p className="text-xs text-gray-500 mb-3">
                      For queries: <a href="mailto:AI@withArijit.com" className="text-indigo-600 font-semibold hover:underline">AI@withArijit.com</a>
                    </p>
                    <button onClick={closeModal} className="w-full py-2.5 rounded-xl font-semibold text-white bg-gray-700 hover:bg-gray-800 shadow-lg transition-all">
                      Done
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
