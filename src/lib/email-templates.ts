import { BRAND, TECH_BADGES, TemplateKey } from './email-assets'

// ─── Config passed from admin / API ───────────────────────────────────────────
export interface EmailTemplateData {
  // Recipient
  name: string
  course_name?: string
  webinar_date?: string   // already formatted for display
  webinar_time?: string

  // Links
  joining_link?: string
  recording_link?: string
  certificate_link?: string
  cta_label?: string
  cta_url?: string

  // Promo
  discount_code?: string
  discount_percent?: string

  // Free text
  custom_message?: string

  // Visuals
  showAIWALogo?: boolean
  showOStaranLogo?: boolean
  showTrainerPic?: boolean
  techLogos?: string[]    // keys from TECH_BADGES
  emojiInBody?: boolean   // default true
}

// ─── Emoji stripper ────────────────────────────────────────────────────────────
function maybeStrip(text: string, enabled = true): string {
  if (enabled) return text
  return text.replace(
    /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2702}-\u{27B0}\u{FE0F}]/gu, ''
  ).replace(/\s{2,}/g, ' ').trim()
}

// ─── Shared building blocks ────────────────────────────────────────────────────

/** Header with optional logos */
function renderHeader(showAIWA = true, showOStaran = false): string {
  const hasLogos = showAIWA || showOStaran

  if (!hasLogos) {
    return `
    <tr>
      <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 60%,#a855f7 100%);padding:28px 40px;text-align:center;">
        <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">🤖 AI WithArijit</div>
        <div style="color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">AI Education &amp; Certification</div>
      </td>
    </tr>`
  }

  const logoItems: string[] = []

  if (showAIWA) {
    logoItems.push(`
      <td align="center" style="padding:0 16px;">
        <img src="${BRAND.aiwa.logoUrl}" alt="${BRAND.aiwa.alt}"
             width="${BRAND.aiwa.width}" height="${BRAND.aiwa.height}"
             style="display:block;border-radius:8px;max-width:${BRAND.aiwa.width}px;"
             border="0"/>
      </td>`)
  }

  if (showAIWA && showOStaran) {
    logoItems.push(`
      <td align="center" style="padding:0 12px;color:rgba(255,255,255,0.4);font-size:20px;">·</td>`)
  }

  if (showOStaran) {
    logoItems.push(`
      <td align="center" style="padding:0 16px;">
        <div style="background:#000;border-radius:8px;padding:4px 10px;display:inline-block;">
          <img src="${BRAND.ostaran.logoUrl}" alt="${BRAND.ostaran.alt}"
               width="${BRAND.ostaran.width}" height="${BRAND.ostaran.height}"
               style="display:block;max-width:${BRAND.ostaran.width}px;"
               border="0"/>
        </div>
      </td>`)
  }

  return `
  <tr>
    <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 60%,#a855f7 100%);padding:24px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>${logoItems.join('')}</tr>
          </table>
          <div style="color:rgba(255,255,255,0.65);font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-top:10px;">
            AI Education &amp; Certification
          </div>
        </td></tr>
      </table>
    </td>
  </tr>`
}

/** Trainer signature card */
function renderTrainerCard(emoji = true): string {
  return `
  <tr>
    <td style="padding:0 40px 32px;">
      <table cellpadding="0" cellspacing="0" border="0"
             style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;width:100%;">
        <tr>
          <td style="padding:20px;" width="72" valign="middle">
            <img src="${BRAND.trainer.photoUrl}" alt="${BRAND.trainer.name}"
                 width="64" height="64"
                 style="border-radius:50%;display:block;object-fit:cover;border:2px solid #e0e7ff;"
                 border="0"/>
          </td>
          <td style="padding:20px 20px 20px 0;" valign="middle">
            <div style="font-size:14px;font-weight:700;color:#111827;">${BRAND.trainer.name}</div>
            <div style="font-size:12px;color:#4f46e5;margin-top:2px;">${BRAND.trainer.title}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:6px;line-height:1.5;">
              ${maybeStrip('🌐', emoji)} <a href="https://aiwitharijit.com" style="color:#4f46e5;text-decoration:none;">aiwitharijit.com</a>
              &nbsp;·&nbsp;
              ${maybeStrip('📧', emoji)} <a href="mailto:ai@withArijit.com" style="color:#4f46e5;text-decoration:none;">ai@withArijit.com</a>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

/** Webinar details card */
function renderDetailsCard(d: EmailTemplateData, emoji = true): string {
  const rows: string[] = []
  if (d.course_name) rows.push(`<tr><td style="color:#6b7280;font-size:13px;padding:5px 0;width:110px;">${maybeStrip('📚', emoji)} Course</td><td style="color:#111827;font-size:13px;font-weight:600;padding:5px 0;">${d.course_name}</td></tr>`)
  if (d.webinar_date) rows.push(`<tr><td style="color:#6b7280;font-size:13px;padding:5px 0;">${maybeStrip('📅', emoji)} Date</td><td style="color:#111827;font-size:13px;font-weight:600;padding:5px 0;">${d.webinar_date}</td></tr>`)
  if (d.webinar_time) rows.push(`<tr><td style="color:#6b7280;font-size:13px;padding:5px 0;">${maybeStrip('🕐', emoji)} Time</td><td style="color:#111827;font-size:13px;font-weight:600;padding:5px 0;">${d.webinar_time}</td></tr>`)
  if (!rows.length) return ''
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#f5f3ff;border:1.5px solid #e0e7ff;border-radius:12px;margin:20px 0;">
    <tr><td style="padding:16px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join('')}</table>
    </td></tr>
  </table>`
}

/** CTA button */
function ctaButton(label: string, url: string, color = '#4f46e5'): string {
  return `
  <table cellpadding="0" cellspacing="0" border="0" style="margin:20px auto 0;">
    <tr>
      <td align="center" style="border-radius:10px;background:${color};">
        <a href="${url}" target="_blank"
           style="display:inline-block;padding:14px 36px;background:${color};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`
}

/** Tech badge row */
function renderTechBadges(techLogos: string[], emoji = true): string {
  if (!techLogos?.length) return ''
  const badges = techLogos.map(key => {
    const b = TECH_BADGES[key]
    if (!b) return ''
    const label = emoji ? `${b.emoji} ${b.label}` : b.label
    return `<span style="display:inline-block;background:${b.bg};color:${b.color};padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600;margin:3px 4px;letter-spacing:0.2px;">${label}</span>`
  }).filter(Boolean).join('')
  if (!badges) return ''
  return `
  <div style="margin:20px 0;text-align:center;line-height:2;">
    <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Technologies Covered</div>
    ${badges}
  </div>`
}

/** Shared layout wrapper */
function wrapLayout(bodyRows: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>AIwithArijit</title>
</head>
<body style="margin:0;padding:0;background:#f0f0f5;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader} &zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f0f5;">
    <tr><td align="center" style="padding:28px 12px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0"
             style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(79,70,229,0.12);">
        ${bodyRows}
        <!-- FOOTER -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 6px;color:#6b7280;font-size:12px;">
              © 2025 AIwithArijit.com &nbsp;·&nbsp;
              <a href="mailto:ai@withArijit.com" style="color:#4f46e5;text-decoration:none;">ai@withArijit.com</a>
            </p>
            <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.5;">
              You received this because you registered for an AIwithArijit webinar.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 1 — WEBINAR REMINDER
// ═══════════════════════════════════════════════════════════════════════════════
function tplWebinarReminder(d: EmailTemplateData, em: boolean): string {
  const rows = `
  ${renderHeader(d.showAIWALogo, d.showOStaranLogo)}
  <tr><td style="padding:32px 40px 8px;">
    ${maybeStrip('🔔', em)} <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#4f46e5;">Webinar Reminder</span>
    <h2 style="margin:8px 0 16px;font-size:22px;color:#111827;line-height:1.3;">Hi ${d.name || 'there'} ${maybeStrip('👋', em)}</h2>
    <p style="margin:0 0 6px;font-size:15px;color:#374151;line-height:1.7;">
      Your upcoming webinar is <strong>tomorrow</strong>! ${maybeStrip('🎯', em)} We can't wait to see you there.
    </p>
    ${d.custom_message ? `<p style="margin:12px 0 0;font-size:15px;color:#374151;line-height:1.7;">${d.custom_message}</p>` : ''}
  </td></tr>
  <tr><td style="padding:0 40px;">
    ${renderDetailsCard(d, em)}
    ${renderTechBadges(d.techLogos || [], em)}
    ${d.joining_link ? `
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:16px 0 0;">
      ${maybeStrip('🔗', em)} Click below to join at the scheduled time:
    </p>
    ${ctaButton(maybeStrip('🎯 ', em) + 'Join Webinar Now', d.joining_link)}
    <p style="margin:10px 0 0;font-size:11px;color:#9ca3af;text-align:center;">
      Or copy: <a href="${d.joining_link}" style="color:#4f46e5;">${d.joining_link}</a>
    </p>` : ''}
  </td></tr>
  <tr><td style="padding:20px 40px 8px;">
    <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:10px;padding:14px 18px;font-size:13px;color:#92400e;line-height:1.6;">
      ${maybeStrip('💡', em)} <strong>Tip:</strong> A calendar invite (.ics) is attached — click it to add this webinar to your Google/Apple Calendar automatically!
    </div>
  </td></tr>
  ${d.showTrainerPic ? renderTrainerCard(em) : '<tr><td style="height:24px;"></td></tr>'}`
  return wrapLayout(rows, `Reminder: Your ${d.course_name || 'AI'} webinar is tomorrow!`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 2 — WEBINAR TODAY
// ═══════════════════════════════════════════════════════════════════════════════
function tplWebinarToday(d: EmailTemplateData, em: boolean): string {
  const rows = `
  ${renderHeader(d.showAIWALogo, d.showOStaranLogo)}
  <tr>
    <td style="background:linear-gradient(135deg,#dc2626,#ea580c);padding:20px 40px;text-align:center;">
      <div style="color:#fff;font-size:30px;font-weight:900;letter-spacing:-1px;">${maybeStrip('⏰', em)} IT'S TODAY!</div>
      <div style="color:rgba(255,255,255,0.85);font-size:14px;margin-top:6px;">Your webinar starts ${d.webinar_time ? `at ${d.webinar_time}` : 'soon'}!</div>
    </td>
  </tr>
  <tr><td style="padding:32px 40px 8px;">
    <h2 style="margin:0 0 14px;font-size:20px;color:#111827;">Hi ${d.name || 'there'} ${maybeStrip('👋', em)}</h2>
    <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;">
      ${maybeStrip('🚨', em)} This is your day-of reminder. Your webinar on <strong>${d.course_name || 'AI'}</strong> is happening <strong>TODAY</strong>.
    </p>
    ${d.custom_message ? `<p style="margin:12px 0 0;font-size:15px;color:#374151;line-height:1.7;">${d.custom_message}</p>` : ''}
  </td></tr>
  <tr><td style="padding:0 40px;">
    ${renderDetailsCard(d, em)}
    ${renderTechBadges(d.techLogos || [], em)}
    ${d.joining_link ? `
    ${ctaButton(maybeStrip('🎯 ', em) + 'Join Now — Don\'t Be Late!', d.joining_link, '#dc2626')}
    <p style="margin:10px 0 0;font-size:11px;color:#9ca3af;text-align:center;">
      Link: <a href="${d.joining_link}" style="color:#dc2626;">${d.joining_link}</a>
    </p>` : ''}
  </td></tr>
  ${d.showTrainerPic ? renderTrainerCard(em) : '<tr><td style="height:24px;"></td></tr>'}`
  return wrapLayout(rows, `TODAY: Your ${d.course_name || 'AI'} webinar starts ${d.webinar_time ? `at ${d.webinar_time}` : 'soon'}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 3 — REGISTRATION CONFIRMATION
// ═══════════════════════════════════════════════════════════════════════════════
function tplConfirmation(d: EmailTemplateData, em: boolean): string {
  const rows = `
  ${renderHeader(d.showAIWALogo, d.showOStaranLogo)}
  <tr>
    <td style="padding:32px 40px 8px;text-align:center;">
      <div style="display:inline-block;background:#d1fae5;border-radius:50%;width:68px;height:68px;line-height:68px;font-size:34px;margin-bottom:12px;">${maybeStrip('✅', em)}</div>
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">You're Registered!</h2>
      <p style="margin:0;font-size:14px;color:#6b7280;">Hi ${d.name || 'there'}, your spot is confirmed ${maybeStrip('🎉', em)}</p>
    </td>
  </tr>
  <tr><td style="padding:16px 40px 8px;">
    <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.7;">
      Welcome aboard! We've confirmed your registration for the upcoming webinar.
    </p>
    ${d.custom_message ? `<p style="margin:12px 0 0;font-size:15px;color:#374151;line-height:1.7;">${d.custom_message}</p>` : ''}
    ${renderDetailsCard(d, em)}
    ${renderTechBadges(d.techLogos || [], em)}
    ${d.joining_link ? `
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:4px 0 0;">
      ${maybeStrip('📌', em)} Save your joining link:
    </p>
    ${ctaButton(maybeStrip('📅 ', em) + 'Add to Calendar &amp; Join', d.joining_link, '#059669')}
    <p style="margin:10px 0 0;font-size:11px;color:#9ca3af;text-align:center;">
      Link: <a href="${d.joining_link}" style="color:#059669;">${d.joining_link}</a>
    </p>` : ''}
    <p style="margin:20px 0 0;font-size:14px;color:#374151;line-height:1.7;">
      We'll send you a reminder the day before. See you there! ${maybeStrip('🙌', em)}
    </p>
  </td></tr>
  ${d.showTrainerPic ? renderTrainerCard(em) : '<tr><td style="height:24px;"></td></tr>'}`
  return wrapLayout(rows, `Confirmed: Your spot for the ${d.course_name || 'AI'} webinar is secured!`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 4 — POST-WEBINAR FOLLOW-UP
// ═══════════════════════════════════════════════════════════════════════════════
function tplPostWebinar(d: EmailTemplateData, em: boolean): string {
  const rows = `
  ${renderHeader(d.showAIWALogo, d.showOStaranLogo)}
  <tr><td style="padding:32px 40px 8px;">
    <div style="font-size:36px;text-align:center;margin-bottom:16px;">${maybeStrip('🙏', em)}</div>
    <h2 style="margin:0 0 14px;font-size:22px;color:#111827;text-align:center;">Thank You for Attending!</h2>
    <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;">
      Hi ${d.name || 'there'}, it was absolutely wonderful having you at the <strong>${d.course_name || 'AI'}</strong> webinar. We hope you found it valuable! ${maybeStrip('💡', em)}
    </p>
    ${d.custom_message ? `<p style="margin:12px 0 0;font-size:15px;color:#374151;line-height:1.7;">${d.custom_message}</p>` : ''}
  </td></tr>
  <tr><td style="padding:12px 40px 8px;">
    ${d.recording_link ? `
    <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:20px;margin-bottom:16px;text-align:center;">
      <div style="font-size:13px;color:#1e40af;font-weight:600;margin-bottom:10px;">${maybeStrip('🎬', em)} Webinar Recording Available</div>
      ${ctaButton(maybeStrip('▶️ ', em) + 'Watch the Recording', d.recording_link, '#2563eb')}
    </div>` : ''}
    ${renderTechBadges(d.techLogos || [], em)}
    ${d.cta_label && d.cta_url ? ctaButton(d.cta_label, d.cta_url) : ''}
    <p style="margin:20px 0 0;font-size:14px;color:#374151;line-height:1.7;">
      ${maybeStrip('⭐', em)} Your feedback means the world to us. If you have a moment, please drop us a reply with your thoughts!
    </p>
  </td></tr>
  ${d.showTrainerPic ? renderTrainerCard(em) : '<tr><td style="height:24px;"></td></tr>'}`
  return wrapLayout(rows, `Thanks for attending the ${d.course_name || 'AI'} webinar — recording inside!`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 5 — CERTIFICATE READY
// ═══════════════════════════════════════════════════════════════════════════════
function tplCertificateReady(d: EmailTemplateData, em: boolean): string {
  const rows = `
  ${renderHeader(d.showAIWALogo, d.showOStaranLogo)}
  <tr>
    <td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:20px 40px;text-align:center;">
      <div style="font-size:48px;">${maybeStrip('🎓', em)}</div>
      <div style="color:#fff;font-size:18px;font-weight:700;margin-top:8px;">Certificate of Completion</div>
    </td>
  </tr>
  <tr><td style="padding:32px 40px 8px;">
    <h2 style="margin:0 0 14px;font-size:22px;color:#111827;">Congratulations, ${d.name || 'there'}! ${maybeStrip('🎉', em)}</h2>
    <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;">
      You have successfully completed <strong>${d.course_name || 'the AI Certification'}</strong> webinar. Your certificate is now ready to download! ${maybeStrip('✨', em)}
    </p>
    ${d.custom_message ? `<p style="margin:12px 0 0;font-size:15px;color:#374151;line-height:1.7;">${d.custom_message}</p>` : ''}
    ${renderTechBadges(d.techLogos || [], em)}
    ${d.certificate_link ? `
    <div style="margin:24px 0;text-align:center;">
      ${ctaButton(maybeStrip('📜 ', em) + 'Download Your Certificate', d.certificate_link, '#d97706')}
      <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">Share it on LinkedIn to showcase your achievement! ${maybeStrip('🏆', em)}</p>
    </div>` : ''}
  </td></tr>
  ${d.showTrainerPic ? renderTrainerCard(em) : '<tr><td style="height:24px;"></td></tr>'}`
  return wrapLayout(rows, `Your ${d.course_name || 'AI'} Certificate is Ready — Download Now!`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 6 — COURSE LAUNCH
// ═══════════════════════════════════════════════════════════════════════════════
function tplCourseLaunch(d: EmailTemplateData, em: boolean): string {
  const rows = `
  ${renderHeader(d.showAIWALogo, d.showOStaranLogo)}
  <tr>
    <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:16px 40px 20px;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:30px;padding:6px 20px;color:#fff;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
        ${maybeStrip('🚀', em)} New Course Launch
      </div>
    </td>
  </tr>
  <tr><td style="padding:32px 40px 8px;">
    <h2 style="margin:0 0 14px;font-size:22px;color:#111827;">Hi ${d.name || 'there'} ${maybeStrip('👋', em)}</h2>
    <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;">
      We're thrilled to announce that <strong>${d.course_name || 'a new AI course'}</strong> is now live! ${maybeStrip('🎯', em)} This is the perfect opportunity to level up your AI skills.
    </p>
    ${d.custom_message ? `<p style="margin:12px 0 0;font-size:15px;color:#374151;line-height:1.7;">${d.custom_message}</p>` : ''}
    ${renderDetailsCard(d, em)}
    ${renderTechBadges(d.techLogos || [], em)}
    ${(d.cta_label && d.cta_url) ? ctaButton(d.cta_label, d.cta_url) : d.joining_link ? ctaButton(maybeStrip('🚀 ', em) + 'Register Now — Limited Seats!', d.joining_link) : ''}
  </td></tr>
  ${d.showTrainerPic ? renderTrainerCard(em) : '<tr><td style="height:24px;"></td></tr>'}`
  return wrapLayout(rows, `New Course Alert: ${d.course_name || 'AI'} is now live!`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 7 — SPECIAL OFFER
// ═══════════════════════════════════════════════════════════════════════════════
function tplSpecialOffer(d: EmailTemplateData, em: boolean): string {
  const rows = `
  ${renderHeader(d.showAIWALogo, d.showOStaranLogo)}
  <tr>
    <td style="background:linear-gradient(135deg,#7c3aed,#db2777);padding:20px 40px;text-align:center;">
      <div style="color:#fff;font-size:14px;font-weight:600;letter-spacing:1px;text-transform:uppercase;opacity:0.8;">Exclusive Offer</div>
      ${d.discount_percent ? `<div style="color:#fff;font-size:42px;font-weight:900;line-height:1;margin:8px 0;">${d.discount_percent}% OFF</div>` : `<div style="font-size:36px;margin:8px 0;">${maybeStrip('🎁', em)}</div>`}
      <div style="color:rgba(255,255,255,0.8);font-size:13px;">Just for you, ${d.name || 'valued student'}!</div>
    </td>
  </tr>
  <tr><td style="padding:32px 40px 8px;">
    <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.7;">
      Hi ${d.name || 'there'} ${maybeStrip('👋', em)}, we have an exclusive offer for you! ${maybeStrip('🎉', em)}
    </p>
    ${d.custom_message ? `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">${d.custom_message}</p>` : ''}
    ${d.discount_code ? `
    <div style="text-align:center;margin:20px 0;">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Your Discount Code</div>
      <div style="display:inline-block;background:#faf5ff;border:2.5px dashed #7c3aed;border-radius:12px;padding:14px 32px;">
        <span style="font-size:26px;font-weight:900;color:#7c3aed;letter-spacing:4px;">${d.discount_code}</span>
      </div>
      <div style="font-size:12px;color:#9ca3af;margin-top:8px;">Copy and use at checkout</div>
    </div>` : ''}
    ${renderTechBadges(d.techLogos || [], em)}
    ${d.cta_label && d.cta_url ? ctaButton(d.cta_label, d.cta_url, '#7c3aed') : ''}
    <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;text-align:center;">
      ${maybeStrip('⏳', em)} Limited time offer. Act fast!
    </p>
  </td></tr>
  ${d.showTrainerPic ? renderTrainerCard(em) : '<tr><td style="height:24px;"></td></tr>'}`
  return wrapLayout(rows, `Exclusive offer for you${d.discount_percent ? ` — ${d.discount_percent}% off!` : '!'}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 8 — CUSTOM BROADCAST
// ═══════════════════════════════════════════════════════════════════════════════
function tplCustom(d: EmailTemplateData, em: boolean): string {
  const rows = `
  ${renderHeader(d.showAIWALogo, d.showOStaranLogo)}
  <tr><td style="padding:32px 40px 8px;">
    <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#111827;">Hi ${d.name || 'there'} ${maybeStrip('👋', em)}</p>
    <div style="font-size:15px;color:#374151;line-height:1.8;">
      ${d.custom_message || ''}
    </div>
    ${renderTechBadges(d.techLogos || [], em)}
    ${d.cta_label && d.cta_url ? ctaButton(d.cta_label, d.cta_url) : ''}
  </td></tr>
  ${d.showTrainerPic ? renderTrainerCard(em) : '<tr><td style="height:24px;"></td></tr>'}`
  return wrapLayout(rows)
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════════
export function buildEmail(templateKey: TemplateKey | string, data: EmailTemplateData): string {
  const em = data.emojiInBody !== false  // default true
  switch (templateKey) {
    case 'webinar_reminder':         return tplWebinarReminder(data, em)
    case 'webinar_today':            return tplWebinarToday(data, em)
    case 'registration_confirmation':return tplConfirmation(data, em)
    case 'post_webinar_followup':    return tplPostWebinar(data, em)
    case 'certificate_ready':        return tplCertificateReady(data, em)
    case 'course_launch':            return tplCourseLaunch(data, em)
    case 'special_offer':            return tplSpecialOffer(data, em)
    default:                         return tplCustom(data, em)
  }
}

/** Map template key → DB category for flag updates */
export function templateCategory(key: string): 'reminder' | 'confirmation' | 'custom' {
  if (['webinar_reminder', 'webinar_today'].includes(key)) return 'reminder'
  if (key === 'registration_confirmation') return 'confirmation'
  return 'custom'
}
