import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://enszifyeqnwcnxaqrmrq.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuc3ppZnllcW53Y254YXFybXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTIyNTcsImV4cCI6MjA2OTY4ODI1N30.eCMgm8ayfG2RNkOSk8iOBEfZMl64gY7a8dLs1W3m79o'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our tables
export interface WebinarLink {
  id: string
  course_id: number
  course_name: string
  course_short_name: string
  duration_minutes: number
  target_audience: string
  age_group: string
  webinar_date: string
  webinar_time: string
  timezone: string
  registration_link: string | null
  ms_teams_link: string | null
  is_active: boolean
  max_registrations: number
  current_registrations: number
  course_description: string
  benefits: string[]
  course_order: number
}

export interface Registration {
  full_name: string
  email: string
  mobile: string
  age: string
  profession_choice: string
  other_profession_description?: string
  course_id: number
  course_name: string
  webinar_date: string
  webinar_time: string
  timezone: string
  marketing_consent: boolean
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  referrer_url?: string
  landing_page_url?: string
  user_agent?: string
  device_type?: string
  browser?: string
}
