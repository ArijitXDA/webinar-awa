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

// Popularity tags for each track
const popularityTags: { [key: number]: string } = {
  1: '⭐ Most popular in India',
  2: '⭐ Most popular in India',
  3: '⭐ Most popular in India',
  4: '⭐ Most popular in Bengaluru',
  5: '⭐ Most popular in Mumbai',
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

// Age options for dropdown
const ageOptions = [
  { value: '', label: 'Select your age' },
  { value: '10-15', label: '10-15 years' },
  { value: '16-18', label: '16-18 years' },
  { value: '19-23', label: '19-23 years' },
  { value: '24-30', label: '24-30 years' },
  { value: '31-40', label: '31-40 years' },
  { value: '41-50', label: '41-50 years' },
  { value: '51-60', label: '51-60 years' },
  { value: '60+', label: '60+ years' },
]

// Testimonials data
const testimonials = [
  {
    quote: "Arijit made Agentic AI easy even for a novice like me. He doesn't just teach concepts — he helps students build real intelligent agents for real-world problems.",
    name: "Dakshayani B P",
    title: "Retired Scientist & Director, ISRO",
    linkedin: "https://www.linkedin.com/in/dakshayani-bp/"
  },
  {
    quote: "Arijit's grip on data science and AI is exceptional. He seamlessly bridges simple tools to advanced AI-ML solutions across industries.",
    name: "Dr. Harish B Suri",
    title: "Professor | IIM Mumbai | IIT Kharagpur",
    linkedin: "https://www.linkedin.com/in/dr-harish-b-suri-8596772/"
  },
  {
    quote: "Arijit has a rare ability to simplify complex AI and analytics concepts. His depth in BI, Cognitive AI and numerical analysis clearly sets him apart.",
    name: "Suvajit Ray",
    title: "Head of Product & Distribution, IIFL Capital",
    linkedin: "https://www.linkedin.com/in/suvajitray/"
  },
  {
    quote: "A rare blend of technical depth, mentorship and strategic thinking.",
    name: "Sourav Choudhury",
    title: "IIM Mumbai | Harvard Business School | Nestle",
    linkedin: "https://www.linkedin.com/in/sourav-choudhury-97b7531/"
  }
]

// Fallback webinar data with UPDATED names and descriptions
const fallbackWebinars = [
  {
    id: '1', course_id: 6, course_name: 'Agentic AI Certification for Working Professionals',
    course_short_name: 'AI for Working Professionals', duration_minutes: 90,
    target_audience: 'Working Professionals across all Non-IT industries - Finance, Healthcare, Manufacturing, Retail, Education, Auto and more. Perfect for those looking to upskill and stay relevant in the AI era.',
    age_group: '24-60 years', webinar_date: '2025-01-19', webinar_time: '11:00:00', timezone: 'IST',
    registration_link: null, ms_teams_link: null, is_active: true, max_registrations: 500, current_registrations: 0,
    course_description: 'Master Agentic AI concepts',
    benefits: ['Official AI Certification', 'Hands-on Training', 'Career Guidance', 'Lifetime AI Library Access', 'Resume Tips'],
    course_order: 1
  },
  {
    id: '2', course_id: 7, course_name: 'AI for School Students & Future Readiness',
    course_short_name: 'AI for Schools (CBSE/ICSE/State Boards)', duration_minutes: 90,
    target_audience: 'School students who want to get ahead. Parents encouraged to join.',
    age_group: '10-16 years', webinar_date: '2025-01-19', webinar_time: '15:00:00', timezone: 'IST',
    registration_link: null, ms_teams_link: null, is_active: true, max_registrations: 500, current_registrations: 0,
    course_description: 'Fun AI introduction',
    benefits: ['Certificate of Participation', 'Live AI projects and demonstrations', 'Career Path Guidance', 'Free Resources', 'Parent Guide'],
    course_order: 2
  },
  {
    id: '3', course_id: 8, course_name: 'AI Certification for College Students & Job Seekers',
    course_short_name: 'AI for College & Job Seekers', duration_minutes: 90,
    target_audience: 'College students, fresh graduates, and job seekers.',
    age_group: '17-23 years', webinar_date: '2025-01-19', webinar_time: '17:00:00', timezone: 'IST',
    registration_link: null, ms_teams_link: null, is_active: true, max_registrations: 500, current_registrations: 0,
    course_description: 'Get job-ready with AI',
    benefits: ['AI Certification for Resume', 'LinkedIn Optimization', 'Internship Opportunities', 'Interview Prep', 'Resources'],
    course_order: 3
  },
  {
    id: '4', course_id: 9, course_name: 'Agentic AI Development for Tech Professionals',
    course_short_name: 'Agentic AI - Tech Dev', duration_minutes: 90,
    target_audience: 'Software Developers, Data Engineers, Data Scientists, ML Engineers.',
    age_group: '20-55 years', webinar_date: '2025-01-19', webinar_time: '19:00:00', timezone: 'IST',
    registration_link: null, ms_teams_link: null, is_active: true, max_registrations: 500, current_registrations: 0,
    course_description: 'Build AI Agents',
    benefits: ['Developer Certification', 'Hands-on Workshop', 'Code Repos', 'Framework Training', 'Dev Community'],
    course_order: 4
  },
  {
    id: '5', course_id: 10, course_name: 'Digital & Generative AI Transformation for Business Leaders',
    course_short_name: 'AI for Business Leaders', duration_minutes: 90,
    target_audience: 'CXOs, Directors, VPs, General Managers, Entrepreneurs.',
    age_group: '30-65 years', webinar_date: '2025-01-19', webinar_time: '21:00:00', timezone: 'IST',
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
    full_name: '', email: '', mobile: '', age: '',
    profession_choice: '', other_profession_description: '', marketing_consent: true,
  })
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})
  const [utmLocation, setUtmLocation] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLandingUrl(window.location.origin + window.location.pathname)
      // Get UTM source for dynamic location tag
      const params = new URLSearchParams(window.location.search)
      const source = params.get('utm_source')
      if (source) {
        setUtmLocation(source)
      }
    }
    fetchWebinars()
  }, [])

  async function fetchWebinars() {
    try {
      const { data, error } = await supabase
        .from('qr_landing_webinar_links')
        .select('*')
        .eq('is_active', true)
        .order('course_order', { ascending: true })

      if (error) {
        console.error('Supabase fetch error:', error)
        setWebinars(fallbackWebinars as any)
      } else {
        // Apply name overrides from fallback for display
        const updatedData = (data && data.length > 0 ? data : fallbackWebinars).map((w: any) => {
          if (w.course_order === 1) {
            return { ...w, course_short_name: 'AI for Working Professionals' }
          }
          if (w.course_order === 2) {
            return { ...w, course_short_name: 'AI for Schools (CBSE/ICSE/State Boards)' }
          }
          return w
        })
        setWebinars(updatedData as any)
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
    if (!formData.age) errors.age = 'Please select your age'
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
        age: formData.age,
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
        .from('qr_landing_registrations')
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
    setFormData({ full_name: '', email: '', mobile: '', age: '', profession_choice: '', other_profession_description: '', marketing_consent: true })
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

  // Open registration for first webinar (Working Professionals)
  function openFirstWebinarRegistration() {
    const firstWebinar = webinars.find(w => w.course_order === 1) || webinars[0]
    if (firstWebinar) {
      openRegistrationModal(firstWebinar)
    }
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
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
          <div className="flex items-center justify-center gap-3 mb-3">
            {/* AIwithArijit.com Logo */}
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-md flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/30">
                AI
              </div>
              <span className="text-sm font-bold text-gray-800">WithArijit.com</span>
            </div>
            
            {/* Divider */}
            <div className="h-5 w-px bg-gray-300"></div>
            
            {/* oStaran.com Logo */}
            <div className="flex items-center gap-1.5">
              <img 
                src="/oStaran.png" 
                alt="oStaran.com" 
                className="w-7 h-7 object-contain"
              />
              <span className="text-sm font-bold text-gray-800">oStaran.com</span>
            </div>
          </div>
          
          {/* Hero Section */}
          <div className="text-center mb-3">
            {/* Urgency Badge - Dark Red */}
            <div className="inline-flex items-center gap-1.5 bg-red-700 text-white px-3 py-1.5 rounded-full text-xs font-bold mb-2 shadow-lg animate-pulse">
              <span>🔥</span>
              <span>100% FREE, Limited Seats</span>
            </div>
            
            {/* Dynamic Location Tag - shows utm_source */}
            {utmLocation && (
              <div className="block mb-2">
                <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs shadow-lg">
                  <span>📍</span>
                  <span>Exclusive at <span className="font-black bg-white/30 px-1.5 py-0.5 rounded text-yellow-100">{utmLocation}</span>, <span className="font-black underline decoration-2 decoration-yellow-200">only for today!</span></span>
                </span>
              </div>
            )}
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2 leading-tight">
              <span className="gradient-text">FREE AI Certification</span>
              <br />in Just 90 Minutes
            </h1>
            <p className="text-sm text-gray-600 max-w-xs mx-auto leading-relaxed mb-2">
              Boost your resume, LinkedIn & career prospects with industry-recognized AI certification
            </p>
            
            {/* Social Proof */}
            <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 px-3 py-1.5 rounded-full text-xs font-semibold mb-2 border border-green-200">
              <span>🎓</span>
              <span>50,000+ trained from India, USA & Canada</span>
            </div>
            
            {/* Micro-trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-gray-600 mb-2">
              <span className="flex items-center gap-1"><span className="text-green-500">✔</span> Online Webinar</span>
              <span className="flex items-center gap-1"><span className="text-green-500">✔</span> Certificate</span>
              <span className="flex items-center gap-1"><span className="text-green-500">✔</span> Expert Trainer</span>
              <span className="flex items-center gap-1"><span className="text-green-500">✔</span> Free Forever</span>
              <span className="flex items-center gap-1"><span className="text-green-500">✔</span> Library Access</span>
            </div>
          </div>
        </div>
      </header>

      {/* Course Cards Section */}
      <section className="relative z-10 px-3 pb-4">
        <div className="max-w-lg mx-auto">
          <h2 className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Choose your webinar
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
                  {/* Popularity Tag */}
                  <div className="px-2.5 pt-2">
                    <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      {popularityTags[webinar.course_order]}
                    </span>
                  </div>
                  
                  <div className="p-2.5 pt-1.5 cursor-pointer" onClick={() => setExpandedCard(expandedCard === webinar.course_id ? null : webinar.course_id)}>
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
                        {/* Age group shown on card */}
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-0.5 text-xs text-indigo-600 font-medium">
                            <UsersIcon /> {webinar.age_group}
                          </span>
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
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {webinar.course_order === 1 
                              ? 'Working Professionals across all Non-IT industries - Finance, Healthcare, Manufacturing, Retail, Education, Auto and more. Perfect for those looking to upskill and stay relevant in the AI era.'
                              : webinar.target_audience}
                          </p>
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
                                <span>{webinar.course_order === 2 && benefit === 'Fun AI Activities' ? 'Live AI projects and demonstrations' : benefit}</span>
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

      {/* Trainer Info Section - WITH IMAGE */}
      <section className="relative z-10 px-3 pb-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
            <p className="text-xs text-center text-gray-500 uppercase tracking-wide mb-3 font-semibold">Your Trainer</p>
            <div className="flex items-center gap-4">
              {/* Trainer Image */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-1 shadow-lg flex-shrink-0">
                <img 
                  src="/trainer-arijit.jpg" 
                  alt="Arijit Chowdhury" 
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-lg">Arijit Chowdhury</p>
                <p className="text-sm text-gray-600 leading-tight">
                  Researcher & Trainer - Agentic AI & Quantum Computing
                </p>
                <p className="text-sm text-indigo-600 font-semibold mt-0.5">
                  IIT-Bombay • Star Analytix • NLDIBM
                </p>
              </div>
            </div>
            <a href="https://www.linkedin.com/in/arijit-chowdhury-86020b19/" target="_blank" rel="noopener noreferrer"
              className="mt-3 w-full py-2 rounded-lg font-semibold text-white text-sm bg-blue-600 hover:bg-blue-700 shadow-md flex items-center justify-center gap-2 transition-colors">
              <LinkedInIcon />View LinkedIn Profile
            </a>
          </div>
        </div>
      </section>

      {/* Testimonials Section - PREMIUM BLACK GOLD THEME */}
      <section className="relative z-10 px-3 pb-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl p-5 shadow-2xl">
            <div className="text-center mb-4">
              <p className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center justify-center gap-2">
                <span>⭐</span> Trusted by Scientists, CXOs & Professors <span>⭐</span>
              </p>
            </div>
            
            <div className="space-y-3">
              {testimonials.map((testimonial, idx) => (
                <div key={idx} className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-4 border border-amber-500/20 relative overflow-hidden">
                  {/* Gold accent line */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
                  
                  {/* Quote mark */}
                  <div className="absolute -top-1 left-3 text-amber-500/30 text-4xl font-serif">"</div>
                  
                  <p className="text-sm text-gray-200 italic leading-relaxed mb-3 relative z-10 pl-4">
                    {testimonial.quote}
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-amber-400 text-sm">— {testimonial.name}</p>
                      <p className="text-xs text-gray-400">{testimonial.title}</p>
                    </div>
                    <a href={testimonial.linkedin} target="_blank" rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 transition-colors">
                      <LinkedInIcon />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 px-3 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-center shadow-xl">
            <p className="text-white text-lg font-bold mb-2">
              🎯 Join the Next Free AI Certification
            </p>
            <p className="text-indigo-100 text-sm mb-4">90 minutes that can transform your career</p>
            <button onClick={openFirstWebinarRegistration}
              className="w-full py-3 rounded-xl font-bold text-indigo-600 text-base bg-white shadow-lg hover:shadow-xl transition-all duration-300 active:scale-[0.98]">
              Register FREE →
            </button>
          </div>
        </div>
      </section>
{/* What You Will Learn Section */}
      <section className="relative z-10 px-4 py-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold mb-2">
              COMPREHENSIVE CURRICULUM
            </span>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
              🎯 What You Will Learn
            </h2>
            <p className="text-sm text-gray-600">
              Master cutting-edge AI tools, frameworks & platforms
            </p>
          </div>

          <div className="space-y-4">
            {/* No-Code Tools */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm">🧠</span>
                <h3 className="font-bold text-gray-900 text-sm">AI Agents – No-Code Tools</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {['⚡ Bolt.new', '🤖 Make.com', '🧩 OpenAI Agent Builder', '📊 Airtable', '🔁 Zapier', '🌐 Bubble'].map((tool) => (
                  <span key={tool} className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">{tool}</span>
                ))}
              </div>
            </div>

            {/* Low-Code Platforms */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center text-white text-sm">⚙️</span>
                <h3 className="font-bold text-gray-900 text-sm">AI Agents – Low-Code Platforms</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {['🔗 n8n', '📈 Streamlit', '🎛️ Gradio', '🗄️ Supabase', '🏢 Power Apps'].map((tool) => (
                  <span key={tool} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{tool}</span>
                ))}
              </div>
            </div>

            {/* AI IDEs */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center text-white text-sm">🤖</span>
                <h3 className="font-bold text-gray-900 text-sm">AI IDEs & Coding Environments</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {['🧠 Cursor', '👨‍💻 GitHub Copilot', '🧩 Claude Code', '🚀 Antigravity'].map((tool) => (
                  <span key={tool} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{tool}</span>
                ))}
              </div>
            </div>

            {/* Agentic Frameworks */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white text-sm">🧩</span>
                <h3 className="font-bold text-gray-900 text-sm">Agentic AI Frameworks</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {['🔗 LangChain', '📚 LlamaIndex', '🕸️ LangGraph', '🤝 AutoGen', '👥 CrewAI', '⚙️ BabyAGI'].map((tool) => (
                  <span key={tool} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">{tool}</span>
                ))}
              </div>
            </div>

            {/* Python Data Analysis */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center text-white text-sm">🐍</span>
                <h3 className="font-bold text-gray-900 text-sm">Python – Data Analysis</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {['📊 Pandas', '🔢 NumPy', '📈 Matplotlib', '🎨 Seaborn'].map((tool) => (
                  <span key={tool} className="px-2.5 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium">{tool}</span>
                ))}
              </div>
            </div>

            {/* Python ML & AI */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center text-white text-sm">🧠</span>
                <h3 className="font-bold text-gray-900 text-sm">Python – ML & AI</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {['🤖 Scikit-learn', '🧠 TensorFlow', '🧩 Keras', '🔥 PyTorch', '📚 Transformers'].map((tool) => (
                  <span key={tool} className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">{tool}</span>
                ))}
              </div>
            </div>

            {/* Model Fine-Tuning */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">🚀</span>
                <h3 className="font-bold text-gray-900 text-sm">Model Fine-Tuning</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {['🧠 LoRA', '⚡ PEFT'].map((tool) => (
                  <span key={tool} className="px-2.5 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-medium">{tool}</span>
                ))}
              </div>
            </div>

            {/* Deployment */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm">☁️</span>
                <h3 className="font-bold text-gray-900 text-sm">Deployment & Production</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {['🐙 GitHub', '▲ Vercel', '🌐 Netlify', '🐳 Docker', '☁️ AWS', '🔷 Azure', '🟡 GCP', '🚄 Render', '🚆 Railway'].map((tool) => (
                  <span key={tool} className="px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full text-xs font-medium">{tool}</span>
                ))}
              </div>
            </div>

            {/* Business Intelligence */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white text-sm">📊</span>
                <h3 className="font-bold text-gray-900 text-sm">Business Intelligence</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {['📊 Power BI', '📈 Tableau', '📑 Advanced Excel', '🐍 Python for BI', '🤖 Copilot for Analytics'].map((tool) => (
                  <span key={tool} className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">{tool}</span>
                ))}
              </div>
            </div>

            {/* Automation & Enterprise */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm">🔁</span>
                <h3 className="font-bold text-gray-900 text-sm">Automation & Enterprise</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {['🔄 Power Automate', '🤖 Copilot Studio', '☁️ OneDrive / SharePoint', '📐 DAX', '🧮 Power Query (M)'].map((tool) => (
                  <span key={tool} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">{tool}</span>
                ))}
              </div>
            </div>

            {/* Daily AI Productivity */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center text-white text-sm">🧰</span>
                <h3 className="font-bold text-gray-900 text-sm">Daily AI Productivity</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {['💬 ChatGPT (Custom GPTs)', '🧠 Claude Projects', '📓 Copilot Notebooks', '📚 NotebookLM', '🔎 Perplexity Spaces', '💎 Gemini Gems', '🗂️ Notion', '🎨 Gamma', '🖌️ Canva'].map((tool) => (
                  <span key={tool} className="px-2.5 py-1 bg-pink-50 text-pink-700 rounded-full text-xs font-medium">{tool}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
            <p className="text-xs text-gray-600 text-center leading-relaxed">
              <span className="font-semibold text-indigo-700">📌 Note:</span> Coverage depth varies by track. 
              <span className="font-medium"> No prior coding knowledge required</span> for non-tech tracks.
            </p>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="relative z-10 py-4 px-4 border-t border-gray-100 bg-white/50">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-xs text-gray-500">
            © 2025 AIwithArijit.com | <a href="mailto:AI@withArijit.com" className="text-indigo-600 hover:underline">AI@withArijit.com</a>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Star Analytix • oStaran • NLDIBM
          </p>
        </div>
      </footer>

      {/* Registration Modal - IMPROVED FOR MOBILE */}
      {showModal && selectedWebinar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="flex-shrink-0 px-4 pt-4 pb-2 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${courseColors[selectedWebinar.course_order] || courseColors[1]} flex items-center justify-center text-sm shadow-md`}>
                    {courseIcons[selectedWebinar.course_order] || '🎯'}
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-sm leading-tight">{selectedWebinar.course_short_name}</h2>
                    <p className="text-xs text-gray-500">{formatDate(selectedWebinar.webinar_date)} • {formatTime(selectedWebinar.webinar_time, selectedWebinar.timezone)}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                  <XIcon />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">
                  {errorMessage}
                </div>
              )}

              {!submitted ? (
                <form onSubmit={handleSubmit} className="space-y-3">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                    <select className={`w-full px-3 py-2.5 rounded-lg border ${formErrors.age ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm`}
                      value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})}>
                      {ageOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    {formErrors.age && <p className="text-red-500 text-xs mt-1">{formErrors.age}</p>}
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
                </form>
              ) : (
                <div className="text-center py-2">
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
                </div>
              )}
            </div>

            {/* Fixed Footer with Submit Button - ALWAYS VISIBLE */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 bg-white rounded-b-2xl">
              {!submitted ? (
                <button type="button" onClick={handleSubmit} disabled={submitting}
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
              ) : (
                <div className="space-y-2">
                  <button onClick={closeModal} className="w-full py-3 rounded-xl font-semibold text-white bg-gray-700 hover:bg-gray-800 shadow-lg transition-all">
                    Done
                  </button>
                  <a href="https://www.AIwithArijit.com" target="_blank" rel="noopener noreferrer"
                    className="w-full py-2 rounded-lg font-medium text-indigo-600 text-sm bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center gap-1 transition-colors">
                    Visit www.AIwithArijit.com →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Styles */}
      <style jsx global>{`
        .gradient-text {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .webinar-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          border: 1px solid rgba(0,0,0,0.05);
          transition: all 0.2s ease;
        }
        .webinar-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .shimmer {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </main>
  )
}
