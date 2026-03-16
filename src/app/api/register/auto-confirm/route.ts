/**
 * POST /api/register/auto-confirm
 *
 * Called automatically by a Supabase pg_net trigger on every INSERT into
 * qr_landing_registrations.  Sends a branded registration-confirmation email
 * (with .ics calendar invite) using the existing nodemailer + template system,
 * then logs the send and updates the confirmation_email_sent flag.
 *
 * Security: protected by x-webhook-secret header === ADMIN_SECRET env var.
 */

import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'
import { buildEmail } from '@/lib/email-templates'
import { generateICS } from '@/lib/ics'

// ─── Supabase (service role) ──────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── SMTP transporter ─────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch { return dateStr }
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Auth check — pg_net sends this header using the ADMIN_SECRET value
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse the Supabase NEW row payload
  //    The pg_net trigger sends: { record: { id, full_name, email, mobile, course_name, webinar_date, webinar_time, ... } }
  //    We also accept a flat payload for flexibility (direct testing).
  let record: {
    id?: string
    full_name?: string
    email?: string
    mobile?: string
    course_name?: string
    webinar_date?: string
    webinar_time?: string
  }

  try {
    const body = await req.json()
    // Supabase webhook sends { type, table, schema, record, old_record }
    record = body?.record ?? body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { id, full_name, email, mobile, course_name, webinar_date, webinar_time } = record

  if (!email || !full_name) {
    return NextResponse.json({ error: 'Missing email or full_name in payload' }, { status: 400 })
  }

  const formattedDate = formatDate(webinar_date)
  const recipientName = full_name

  // 3. Build HTML email body using registration_confirmation template
  const htmlBody = buildEmail('registration_confirmation', {
    name: recipientName,
    course_name,
    webinar_date: formattedDate,
    webinar_time,
    showAIWALogo: true,
    showOStaranLogo: false,
    showTrainerPic: true,
    emojiInBody: true,
    techLogos: [],
  })

  // 4. Build .ics calendar attachment (registration_confirmation has hasICS: true)
  const attachments: nodemailer.SendMailOptions['attachments'] = []
  if (webinar_date && webinar_time) {
    const icsContent = generateICS({
      title: `AIwithArijit Webinar: ${course_name || 'AI Certification'}`,
      description: `You're registered for the ${course_name || 'AI Certification'} webinar.\n\nHosted by AIwithArijit.com`,
      location: 'Online (link will be shared before the webinar)',
      organizerEmail: process.env.SMTP_USER || 'ai@aiwitharijit.com',
      organizerName: 'AIwithArijit',
      attendeeEmail: email,
      attendeeName: recipientName,
      dateStr: webinar_date,
      timeStr: webinar_time,
      durationMinutes: 90,
    })
    if (icsContent) {
      attachments.push({
        filename: 'webinar-invite.ics',
        content: icsContent,
        contentType: 'text/calendar; method=REQUEST',
      })
    }
  }

  // 5. Compose subject
  const subject = `✅ You're Registered for ${course_name || 'the AI Webinar'}, ${recipientName}!`

  // 6. Send email
  let sendError: string | null = null
  try {
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'AIwithArijit'}" <${process.env.SMTP_USER}>`,
      to: `"${recipientName}" <${email}>`,
      subject,
      html: htmlBody,
      attachments,
    })
  } catch (err: unknown) {
    sendError = err instanceof Error ? err.message : String(err)
  }

  // 7. Log to awa_email_log
  await supabase.from('awa_email_log').insert({
    recipient_email: email,
    recipient_name: recipientName,
    template_name: 'registration_confirmation',
    subject,
    status: sendError ? 'failed' : 'sent',
    sent_at: sendError ? null : new Date().toISOString(),
    error_message: sendError ?? null,
    ref_id: id ?? null,
    ref_type: 'webinar_registrant',
  })

  // 8. Update confirmation_email_sent flag if send succeeded
  if (!sendError && id) {
    await supabase
      .from('qr_landing_registrations')
      .update({ confirmation_email_sent: true })
      .eq('id', id)
  }

  // 9. Respond
  if (sendError) {
    console.error('[auto-confirm] Email failed for', email, ':', sendError)
    return NextResponse.json({ success: false, error: sendError }, { status: 500 })
  }

  console.log('[auto-confirm] Confirmation email sent to', email)
  return NextResponse.json({ success: true, email, template: 'registration_confirmation' })
}
