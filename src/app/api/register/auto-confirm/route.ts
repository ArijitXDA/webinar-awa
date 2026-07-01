/**
 * POST /api/register/auto-confirm
 *
 * Called automatically by a Supabase pg_net trigger on every INSERT into
 * qr_landing_registrations.  Sends a branded registration-confirmation email
 * (with .ics calendar invite) then logs the send and updates the flag.
 *
 * Email delivery: Hostinger primary → Brevo fallback (via shared mailer.ts)
 * Security: protected by x-webhook-secret header === ADMIN_SECRET env var.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildEmail } from '@/lib/email-templates'
import { generateICS } from '@/lib/ics'
import { sendMailWithFallback, type MailOptions } from '@/lib/mailer'

// ─── Supabase (service role) ──────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
  //    pg_net trigger sends: { record: { id, full_name, email, ... } }
  //    Also accepts flat payload for direct testing.
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
    record = body?.record ?? body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { id, full_name, email, course_name, webinar_date, webinar_time } = record

  if (!email || !full_name) {
    return NextResponse.json({ error: 'Missing email or full_name in payload' }, { status: 400 })
  }

  const formattedDate = formatDate(webinar_date)
  const recipientName = full_name

  // 3. Build HTML email body
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

  // 4. Build .ics calendar attachment
  const attachments: MailOptions['attachments'] = []
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

  // 5. Subject
  const subject = `✅ You're Registered for ${course_name || 'the AI Webinar'}, ${recipientName}!`

  // 6. Send — Hostinger primary, Brevo fallback
  let sendError: string | null = null
  let provider: 'hostinger' | 'brevo' = 'hostinger'

  try {
    const result = await sendMailWithFallback({
      to: `"${recipientName}" <${email}>`,
      subject,
      html: htmlBody,
      attachments,
    })
    provider = result.provider
    if (result.usedFallback) {
      console.log(`[auto-confirm] Brevo fallback used for ${email}`)
    }
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
    provider: sendError ? null : provider,
  })

  // 8. Update flag on success
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

  console.log(`[auto-confirm] Sent via ${provider} to ${email}`)
  return NextResponse.json({ success: true, email, provider, template: 'registration_confirmation' })
}
