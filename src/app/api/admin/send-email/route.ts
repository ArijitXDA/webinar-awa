import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'
import { buildEmail, EmailTemplateData } from '@/lib/email-templates'
import { generateICS } from '@/lib/ics'

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
  webinar_date?: string   // ISO date string e.g. "2025-01-18"
  webinar_time?: string   // e.g. "11:00 AM IST"
  ref_type?: string
}

export interface SendEmailPayload {
  recipients: EmailRecipient[]
  subject: string
  emailType: 'reminder' | 'confirmation' | 'custom'
  // Template fields
  joining_link?: string
  custom_message?: string
  cta_label?: string
  cta_url?: string
  // Duration for .ics (default 90 min)
  webinar_duration_minutes?: number
}

function formatDateForDisplay(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
  } catch { return dateStr }
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
    emailType,
    joining_link,
    custom_message,
    cta_label,
    cta_url,
    webinar_duration_minutes = 90,
  } = body

  if (!recipients?.length || !subject) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  let sent = 0
  let failed = 0
  const errors: { email: string; error: string }[] = []

  for (const recipient of recipients) {
    const formattedDate = formatDateForDisplay(recipient.webinar_date)

    // Build personalized subject
    const personalizedSubject = subject
      .replace(/\{\{name\}\}/g, recipient.name || '')
      .replace(/\{\{course\}\}/g, recipient.course_name || '')
      .replace(/\{\{webinar_date\}\}/g, formattedDate)
      .replace(/\{\{webinar_time\}\}/g, recipient.webinar_time || '')

    // Build template data
    const templateData: EmailTemplateData = {
      name: recipient.name,
      course_name: recipient.course_name,
      webinar_date: formattedDate,
      webinar_time: recipient.webinar_time,
      joining_link,
      custom_message: custom_message
        ?.replace(/\{\{name\}\}/g, recipient.name || '')
        .replace(/\{\{course\}\}/g, recipient.course_name || '')
        .replace(/\{\{webinar_date\}\}/g, formattedDate)
        .replace(/\{\{webinar_time\}\}/g, recipient.webinar_time || ''),
      cta_label,
      cta_url,
    }

    // Build HTML body from template
    const htmlBody = buildEmail(emailType, templateData)

    // Build .ics attachment for reminders (when we have date + time)
    const attachments: nodemailer.SendMailOptions['attachments'] = []
    if (emailType === 'reminder' && recipient.webinar_date && recipient.webinar_time) {
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

      // Log success to awa_email_log
      await supabase.from('awa_email_log').insert({
        recipient_email: recipient.email,
        recipient_name: recipient.name,
        template_name: emailType,
        subject: personalizedSubject,
        status: 'sent',
        sent_at: new Date().toISOString(),
        ref_id: recipient.id || null,
        ref_type: recipient.ref_type || null,
      })

      // Update flags on qr_landing_registrations
      if (recipient.ref_type === 'webinar_registrant' && recipient.id) {
        const updateField = emailType === 'confirmation'
          ? { confirmation_email_sent: true }
          : emailType === 'reminder'
          ? { reminder_email_sent: true }
          : null
        if (updateField) {
          await supabase
            .from('qr_landing_registrations')
            .update(updateField)
            .eq('id', recipient.id)
        }
      }

      sent++
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)

      await supabase.from('awa_email_log').insert({
        recipient_email: recipient.email,
        recipient_name: recipient.name,
        template_name: emailType,
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
