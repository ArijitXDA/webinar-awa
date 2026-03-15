import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'
import { buildEmail, templateCategory } from '@/lib/email-templates'
import { generateICS } from '@/lib/ics'
import { TEMPLATE_CATALOGUE } from '@/lib/email-assets'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export interface EmailRecipient {
  id: string
  name: string
  email: string
  mobile?: string
  course_name?: string
  webinar_date?: string
  webinar_time?: string
  ref_type?: string
}

export interface SendEmailPayload {
  recipients: EmailRecipient[]
  subject: string
  templateKey: string
  // Template content
  joining_link?: string
  recording_link?: string
  certificate_link?: string
  discount_code?: string
  discount_percent?: string
  custom_message?: string
  cta_label?: string
  cta_url?: string
  // Visual options
  showAIWALogo?: boolean
  showOStaranLogo?: boolean
  showTrainerPic?: boolean
  techLogos?: string[]
  emojiInBody?: boolean
  webinar_duration_minutes?: number
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch { return dateStr }
}

function applyVars(template: string, r: EmailRecipient, formattedDate: string): string {
  return template
    .replace(/\{\{name\}\}/g, r.name || '')
    .replace(/\{\{course\}\}/g, r.course_name || '')
    .replace(/\{\{webinar_date\}\}/g, formattedDate)
    .replace(/\{\{webinar_time\}\}/g, r.webinar_time || '')
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: SendEmailPayload = await req.json()
  const {
    recipients,
    subject,
    templateKey,
    joining_link,
    recording_link,
    certificate_link,
    discount_code,
    discount_percent,
    custom_message,
    cta_label,
    cta_url,
    showAIWALogo = true,
    showOStaranLogo = false,
    showTrainerPic = false,
    techLogos = [],
    emojiInBody = true,
    webinar_duration_minutes = 90,
  } = body

  if (!recipients?.length || !subject || !templateKey) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const category = templateCategory(templateKey)
  const hasICS = TEMPLATE_CATALOGUE[templateKey as keyof typeof TEMPLATE_CATALOGUE]?.hasICS ?? false

  let sent = 0
  let failed = 0
  const errors: { email: string; error: string }[] = []

  for (const recipient of recipients) {
    const formattedDate = formatDate(recipient.webinar_date)
    const personalizedSubject = applyVars(subject, recipient, formattedDate)

    const personalizedMessage = custom_message
      ? applyVars(custom_message, recipient, formattedDate)
      : undefined

    // Build HTML
    const htmlBody = buildEmail(templateKey, {
      name: recipient.name,
      course_name: recipient.course_name,
      webinar_date: formattedDate,
      webinar_time: recipient.webinar_time,
      joining_link,
      recording_link,
      certificate_link,
      discount_code,
      discount_percent,
      custom_message: personalizedMessage,
      cta_label,
      cta_url,
      showAIWALogo,
      showOStaranLogo,
      showTrainerPic,
      techLogos,
      emojiInBody,
    })

    // Build .ics if template supports it and we have date+time
    const attachments: nodemailer.SendMailOptions['attachments'] = []
    if (hasICS && recipient.webinar_date && recipient.webinar_time) {
      const icsContent = generateICS({
        title: `AIwithArijit Webinar: ${recipient.course_name || 'AI Certification'}`,
        description: joining_link
          ? `Join here: ${joining_link}\n\nHosted by AIwithArijit.com`
          : 'Hosted by AIwithArijit.com',
        location: joining_link || 'Online',
        url: joining_link,
        organizerEmail: process.env.SMTP_USER || 'ai@withArijit.com',
        organizerName: 'AIwithArijit',
        attendeeEmail: recipient.email,
        attendeeName: recipient.name,
        dateStr: recipient.webinar_date,
        timeStr: recipient.webinar_time,
        durationMinutes: webinar_duration_minutes,
      })
      if (icsContent) {
        attachments.push({
          filename: 'webinar-invite.ics',
          content: icsContent,
          contentType: 'text/calendar; method=REQUEST',
        })
      }
    }

    try {
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'AIwithArijit'}" <${process.env.SMTP_USER}>`,
        to: `"${recipient.name}" <${recipient.email}>`,
        subject: personalizedSubject,
        html: htmlBody,
        attachments,
      })

      await supabase.from('awa_email_log').insert({
        recipient_email: recipient.email,
        recipient_name: recipient.name,
        template_name: templateKey,
        subject: personalizedSubject,
        status: 'sent',
        sent_at: new Date().toISOString(),
        ref_id: recipient.id || null,
        ref_type: recipient.ref_type || null,
      })

      if (recipient.ref_type === 'webinar_registrant' && recipient.id) {
        const flag = category === 'confirmation'
          ? { confirmation_email_sent: true }
          : category === 'reminder'
          ? { reminder_email_sent: true }
          : null
        if (flag) {
          await supabase.from('qr_landing_registrations').update(flag).eq('id', recipient.id)
        }
      }

      sent++
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      await supabase.from('awa_email_log').insert({
        recipient_email: recipient.email,
        recipient_name: recipient.name,
        template_name: templateKey,
        subject: personalizedSubject,
        status: 'failed',
        error_message: message,
        ref_id: recipient.id || null,
        ref_type: recipient.ref_type || null,
      })
      errors.push({ email: recipient.email, error: message })
      failed++
    }
  }

  return NextResponse.json({ sent, failed, errors })
}
