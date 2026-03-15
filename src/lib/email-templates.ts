export interface EmailTemplateData {
  name: string
  course_name?: string
  webinar_date?: string   // formatted string e.g. "Saturday, 18 January 2025"
  webinar_time?: string   // e.g. "11:00 AM IST"
  joining_link?: string
  custom_message?: string
  cta_label?: string
  cta_url?: string
}

// ─── Shared wrapper ────────────────────────────────────────────────────────────
function wrapInLayout(body: string, preheader: string = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>AIwithArijit</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f7;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(79,70,229,0.10);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 60%,#a855f7 100%);padding:36px 40px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:rgba(255,255,255,0.18);border-radius:14px;padding:10px 22px;margin-bottom:14px;">
                      <span style="font-size:26px;vertical-align:middle;">🤖</span>
                      <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;vertical-align:middle;margin-left:8px;">AIwithArijit</span>
                    </div>
                    <div style="color:rgba(255,255,255,0.75);font-size:12px;letter-spacing:2px;text-transform:uppercase;margin-top:2px;">AI Education &amp; Certification</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          ${body}

          <!-- FOOTER -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:28px 40px;text-align:center;">
              <p style="margin:0 0 8px;color:#6b7280;font-size:12px;line-height:1.6;">
                © 2025 AIwithArijit.com &nbsp;·&nbsp;
                <a href="mailto:ai@withArijit.com" style="color:#4f46e5;text-decoration:none;">ai@withArijit.com</a>
              </p>
              <p style="margin:0;color:#9ca3af;font-size:11px;">
                You received this because you registered for an AIwithArijit webinar.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── CTA Button ────────────────────────────────────────────────────────────────
function ctaButton(label: string, url: string, color = '#4f46e5'): string {
  return `
  <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
    <tr>
      <td align="center" style="border-radius:10px;background:${color};">
        <a href="${url}" target="_blank"
           style="display:inline-block;padding:14px 36px;background:${color};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`
}

// ─── Webinar details card ───────────────────────────────────────────────────────
function detailsCard(d: EmailTemplateData): string {
  const rows: string[] = []
  if (d.course_name) rows.push(`<tr><td style="color:#6b7280;font-size:13px;padding:6px 0;width:110px;">📚 Course</td><td style="color:#111827;font-size:13px;font-weight:600;padding:6px 0;">${d.course_name}</td></tr>`)
  if (d.webinar_date) rows.push(`<tr><td style="color:#6b7280;font-size:13px;padding:6px 0;">📅 Date</td><td style="color:#111827;font-size:13px;font-weight:600;padding:6px 0;">${d.webinar_date}</td></tr>`)
  if (d.webinar_time) rows.push(`<tr><td style="color:#6b7280;font-size:13px;padding:6px 0;">🕐 Time</td><td style="color:#111827;font-size:13px;font-weight:600;padding:6px 0;">${d.webinar_time}</td></tr>`)
  if (!rows.length) return ''
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#f5f3ff;border:1.5px solid #e0e7ff;border-radius:12px;padding:4px 0;margin:24px 0;">
    <tr><td style="padding:16px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join('')}</table>
    </td></tr>
  </table>`
}

// ─── Greeting block ────────────────────────────────────────────────────────────
function greeting(name: string): string {
  return `<p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#111827;">Hi ${name || 'there'} 👋</p>`
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 1: WEBINAR REMINDER
// ═══════════════════════════════════════════════════════════════════════════════
export function buildReminderEmail(d: EmailTemplateData): string {
  const body = `
  <tr>
    <td style="padding:36px 40px 28px;">
      ${greeting(d.name)}
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
        Just a friendly reminder — your webinar is coming up soon! We can't wait to see you there.
        ${d.custom_message ? `</p><p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">${d.custom_message}` : ''}
      </p>
      ${detailsCard(d)}
      ${d.joining_link ? `
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
        Click the button below to join the webinar at the scheduled time:
      </p>
      ${ctaButton('🎯 Join Webinar Now', d.joining_link)}
      <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
        Or copy this link: <a href="${d.joining_link}" style="color:#4f46e5;">${d.joining_link}</a>
      </p>` : ''}
    </td>
  </tr>
  <tr>
    <td style="padding:0 40px 32px;">
      <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:10px;padding:14px 18px;">
        <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
          💡 <strong>Tip:</strong> Keep this email handy — the joining link is right above. A calendar invite is attached to this email for your convenience.
        </p>
      </div>
    </td>
  </tr>`

  return wrapInLayout(body, `Reminder: Your ${d.course_name || 'AI'} webinar is coming up!`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 2: REGISTRATION CONFIRMATION
// ═══════════════════════════════════════════════════════════════════════════════
export function buildConfirmationEmail(d: EmailTemplateData): string {
  const body = `
  <tr>
    <td style="padding:36px 40px 12px;text-align:center;">
      <div style="display:inline-block;background:#d1fae5;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:16px;">✅</div>
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">You&rsquo;re Registered!</h2>
      <p style="margin:0;font-size:14px;color:#6b7280;">Registration confirmed for ${d.name || 'you'}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 40px 28px;">
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
        Welcome aboard! We have confirmed your spot for the upcoming webinar.
        ${d.custom_message ? `<br/><br/>${d.custom_message}` : ''}
      </p>
      ${detailsCard(d)}
      ${d.joining_link ? `
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
        Your joining link is ready — save it for the day of the webinar:
      </p>
      ${ctaButton('📅 Add to Calendar &amp; Join', d.joining_link, '#059669')}` : ''}
      <p style="margin:24px 0 0;font-size:14px;color:#374151;line-height:1.7;">
        We&rsquo;ll send you a reminder closer to the date. If you have any questions, reply to this email.
      </p>
    </td>
  </tr>`

  return wrapInLayout(body, `You're confirmed for the ${d.course_name || 'AI'} webinar!`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 3: CUSTOM BROADCAST
// ═══════════════════════════════════════════════════════════════════════════════
export function buildCustomEmail(d: EmailTemplateData): string {
  const body = `
  <tr>
    <td style="padding:36px 40px 28px;">
      ${greeting(d.name)}
      <div style="font-size:15px;color:#374151;line-height:1.8;">
        ${d.custom_message || ''}
      </div>
      ${d.cta_label && d.cta_url ? `
      <div style="margin-top:28px;">
        ${ctaButton(d.cta_label, d.cta_url)}
      </div>` : ''}
    </td>
  </tr>`

  return wrapInLayout(body)
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════════
export function buildEmail(
  type: 'reminder' | 'confirmation' | 'custom',
  data: EmailTemplateData
): string {
  switch (type) {
    case 'reminder':     return buildReminderEmail(data)
    case 'confirmation': return buildConfirmationEmail(data)
    default:             return buildCustomEmail(data)
  }
}
