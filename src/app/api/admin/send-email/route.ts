import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

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

interface Recipient {
  id: string
  name: string
  email: string
  mobile?: string
  course_name?: string
  webinar_date?: string
  webinar_time?: string
  ref_type?: string
}

function applyVariables(template: string, recipient: Recipient): string {
  return template
    .replace(/\{\{name\}\}/g, recipient.name || '')
    .replace(/\{\{course\}\}/g, recipient.course_name || '')
    .replace(/\{\{webinar_date\}\}/g, recipient.webinar_date
      ? new Date(recipient.webinar_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '')
    .replace(/\{\{webinar_time\}\}/g, recipient.webinar_time || '')
    .replace(/\{\{mobile\}\}/g, recipient.mobile || '')
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { recipients, subject, htmlBody, emailType } = body as {
    recipients: Recipient[]
    subject: string
    htmlBody: string
    emailType: 'confirmation' | 'reminder' | 'custom'
  }

  if (!recipients?.length || !subject || !htmlBody) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  let sent = 0
  let failed = 0
  const errors: { email: string; error: string }[] = []

  for (const recipient of recipients) {
    const personalizedSubject = applyVariables(subject, recipient)
    const personalizedBody = applyVariables(htmlBody, recipient)

    try {
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'AIwithArijit'}" <${process.env.SMTP_USER}>`,
        to: recipient.email,
        subject: personalizedSubject,
        html: personalizedBody,
      })

      // Log to awa_email_log
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
        if (emailType === 'confirmation') {
          await supabase
            .from('qr_landing_registrations')
            .update({ confirmation_email_sent: true })
            .eq('id', recipient.id)
        } else if (emailType === 'reminder') {
          await supabase
            .from('qr_landing_registrations')
            .update({ reminder_email_sent: true })
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
