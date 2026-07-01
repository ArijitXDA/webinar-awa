import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Recipient {
  id: string
  name: string
  mobile: string
  course_name?: string
  webinar_date?: string
  webinar_time?: string
  ref_type?: string
}

function sanitizePhone(mobile: string): string {
  // Remove all non-digits
  const digits = mobile.replace(/\D/g, '')
  // Add country code 91 if not present
  if (digits.startsWith('91') && digits.length === 12) return digits
  if (digits.length === 10) return `91${digits}`
  return digits
}

async function sendAiSensy(
  phone: string,
  templateName: string,
  templateParams: string[],
  recipientName: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.AISENSY_API_KEY
  const userName = process.env.AISENSY_USERNAME

  if (!apiKey || !userName) {
    return { success: false, error: 'AiSensy credentials not configured' }
  }

  const payload = {
    apiKey,
    campaignName: templateName,
    destination: phone,
    userName,
    templateParams,
    source: 'admin-dashboard',
    media: {},
    buttons: [],
    carouselCards: [],
    location: {},
  }

  const res = await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    return { success: false, error: `AiSensy error ${res.status}: ${text}` }
  }

  const data = await res.json()
  // AiSensy returns { status: 'success' } on success
  if (data.status === 'success' || data.success === true) {
    return { success: true }
  }
  return { success: false, error: JSON.stringify(data) }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { recipients, templateName, templateParams } = body as {
    recipients: Recipient[]
    templateName: string
    templateParams: string[]
  }

  if (!recipients?.length || !templateName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  let sent = 0
  let failed = 0
  const errors: { mobile: string; error: string }[] = []

  for (const recipient of recipients) {
    if (!recipient.mobile) {
      failed++
      errors.push({ mobile: 'N/A', error: `No mobile for ${recipient.name}` })
      continue
    }

    const phone = sanitizePhone(recipient.mobile)

    // Replace {{name}} etc. in template params
    const resolvedParams = templateParams.map(p =>
      p
        .replace(/\{\{name\}\}/g, recipient.name || '')
        .replace(/\{\{course\}\}/g, recipient.course_name || '')
        .replace(/\{\{webinar_date\}\}/g, recipient.webinar_date
          ? new Date(recipient.webinar_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
          : '')
        .replace(/\{\{webinar_time\}\}/g, recipient.webinar_time || '')
    )

    const result = await sendAiSensy(phone, templateName, resolvedParams, recipient.name)

    // Log to whatsapp_log
    await supabase.from('whatsapp_log').insert({
      recipient_name: recipient.name,
      recipient_phone: phone,
      template_name: templateName,
      template_params: resolvedParams,
      status: result.success ? 'sent' : 'failed',
      sent_at: result.success ? new Date().toISOString() : null,
      error_message: result.error || null,
      ref_id: recipient.id || null,
      ref_type: recipient.ref_type || null,
    })

    if (result.success) {
      // Update whatsapp_sent flag on qr_landing_registrations
      if (recipient.ref_type === 'webinar_registrant' && recipient.id) {
        await supabase
          .from('qr_landing_registrations')
          .update({ whatsapp_sent: true })
          .eq('id', recipient.id)
      }
      sent++
    } else {
      errors.push({ mobile: phone, error: result.error || 'Unknown error' })
      failed++
    }

    // Rate limit: ~10 req/sec
    await new Promise(resolve => setTimeout(resolve, 120))
  }

  return NextResponse.json({ sent, failed, errors })
}
