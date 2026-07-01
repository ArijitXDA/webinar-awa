import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const source = searchParams.get('source') || 'registrants'
  const webinarDate = searchParams.get('webinarDate') || ''
  const status = searchParams.get('status') || ''
  const course = searchParams.get('course') || ''
  const emailType = searchParams.get('emailType') || ''

  if (source === 'registrants') {
    let query = supabase
      .from('qr_landing_registrations')
      .select('id, full_name, email, mobile, course_name, webinar_date, webinar_time, registration_status, confirmation_email_sent, reminder_email_sent, whatsapp_sent')
      .order('registered_at', { ascending: false })

    if (webinarDate) {
      query = query.eq('webinar_date', webinarDate)
    }
    if (status) {
      query = query.eq('registration_status', status)
    }
    if (course) {
      query = query.ilike('course_name', `%${course}%`)
    }
    if (emailType === 'confirmation') {
      query = query.or('confirmation_email_sent.is.null,confirmation_email_sent.eq.false')
    }
    if (emailType === 'reminder') {
      // Get upcoming webinars (today and next 7 days)
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      query = query.gte('webinar_date', today).lte('webinar_date', nextWeek)
      query = query.or('reminder_email_sent.is.null,reminder_email_sent.eq.false')
    }

    const { data, error } = await query.limit(1000)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const recipients = (data || []).map(r => ({
      id: r.id,
      name: r.full_name,
      email: r.email,
      mobile: r.mobile,
      course_name: r.course_name,
      webinar_date: r.webinar_date,
      webinar_time: r.webinar_time,
      registration_status: r.registration_status,
      confirmation_email_sent: r.confirmation_email_sent,
      reminder_email_sent: r.reminder_email_sent,
      whatsapp_sent: r.whatsapp_sent,
      ref_type: 'webinar_registrant'
    }))

    return NextResponse.json({ recipients, total: recipients.length })
  }

  if (source === 'users') {
    let query = supabase
      .from('users')
      .select('user_id, name, email, mobile_no, course_name, start_date')
      .order('created_at', { ascending: false })

    if (course) {
      query = query.ilike('course_name', `%${course}%`)
    }

    const { data, error } = await query.limit(1000)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const recipients = (data || []).map(r => ({
      id: r.user_id,
      name: r.name,
      email: r.email,
      mobile: r.mobile_no,
      course_name: r.course_name,
      webinar_date: r.start_date,
      webinar_time: null,
      ref_type: 'user'
    }))

    return NextResponse.json({ recipients, total: recipients.length })
  }

  return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
}
