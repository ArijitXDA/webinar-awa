// Builds the professional, co-branded congratulations email for a landing1
// registration. The inviting Partner/POC is presented as acknowledging the
// registration together with oStaran; their logo, name, email, website and
// address appear alongside oStaran's in the footer. Falls back to oStaran-only
// branding when there is no identified partner.

type PartnerBrand = {
  display_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  address?: string | null;
  website?: string | null;
  whatsapp?: string | null;
  is_poc?: boolean | null;
  use_ostaran?: boolean | null;
};

const OSTARAN = {
  logo: 'https://webinar.ostaran.com/ostaran-logo-transparent.png',
  website: 'https://www.ostaran.com',
  websiteLabel: 'www.ostaran.com',
  email: 'ai@ostaran.com',
};

function esc(s?: string | null): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildCongratsEmail(input: {
  name: string;
  email: string;
  courseName: string;
  webinarWhen: string | null;
  joinUrl: string;
  partner: PartnerBrand | null;
}): { subject: string; html: string; replyTo: string } {
  const { name, email, courseName, webinarWhen, joinUrl, partner } = input;

  const hasPartner = Boolean(
    partner &&
      !partner.use_ostaran &&
      partner.display_name &&
      partner.display_name !== 'oStaran',
  );
  const pName = hasPartner ? esc(partner!.display_name) : '';
  const pLogo = hasPartner ? partner!.avatar_url || '' : '';
  const replyTo = hasPartner && partner!.email ? partner!.email : OSTARAN.email;
  const safeName = esc(name);

  const subject = hasPartner
    ? `${name}, your seat is confirmed — ${partner!.display_name} & oStaran`
    : `${name}, your oStaran webinar seat is confirmed`;

  const headerLogos =
    hasPartner && pLogo
      ? `<img src="${esc(pLogo)}" alt="${pName}" style="height:46px;max-width:160px;object-fit:contain;vertical-align:middle;">
         <span style="display:inline-block;width:1px;height:34px;background:#e2e8f0;margin:0 18px;vertical-align:middle;"></span>
         <img src="${OSTARAN.logo}" alt="oStaran" style="height:40px;vertical-align:middle;">`
      : `<img src="${OSTARAN.logo}" alt="oStaran" style="height:46px;">`;

  const intro = hasPartner
    ? `<strong>${pName}</strong>, together with <strong>oStaran</strong>, is delighted to confirm your place.`
    : `<strong>oStaran</strong> is delighted to confirm your place.`;

  const partnerFooter = hasPartner
    ? `<td style="vertical-align:top;padding:0 16px;width:50%;">
         <p style="margin:0 0 10px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;">Your oStaran Partner</p>
         ${pLogo ? `<img src="${esc(pLogo)}" alt="${pName}" style="height:32px;max-width:130px;object-fit:contain;margin-bottom:10px;">` : ''}
         <p style="margin:0;font-weight:700;color:#0f172a;font-size:14px;">${pName}</p>
         ${partner!.email ? `<p style="margin:5px 0 0;font-size:13px;color:#475569;">${esc(partner!.email)}</p>` : ''}
         ${partner!.website ? `<p style="margin:3px 0 0;font-size:13px;"><a href="${esc(partner!.website)}" style="color:#3B5BDB;text-decoration:none;">${esc(partner!.website)}</a></p>` : ''}
         ${partner!.address ? `<p style="margin:3px 0 0;font-size:13px;color:#475569;line-height:1.5;">${esc(partner!.address)}</p>` : ''}
       </td>`
    : '';

  const ostaranFooter = `<td style="vertical-align:top;padding:0 16px;width:50%;">
      <p style="margin:0 0 10px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;">oStaran</p>
      <img src="${OSTARAN.logo}" alt="oStaran" style="height:30px;margin-bottom:10px;">
      <p style="margin:0;font-size:13px;"><a href="${OSTARAN.website}" style="color:#3B5BDB;text-decoration:none;">${OSTARAN.websiteLabel}</a></p>
      <p style="margin:3px 0 0;font-size:13px;color:#475569;">${OSTARAN.email}</p>
      <p style="margin:6px 0 0;font-size:12px;color:#94a3b8;">An AI education initiative by Star Analytix</p>
    </td>`;

  const whenRow = webinarWhen
    ? `<tr><td style="padding:7px 0;color:#64748b;font-size:13px;width:130px;">When</td><td style="padding:7px 0;color:#0f172a;font-size:14px;font-weight:600;">${esc(webinarWhen)} (IST)</td></tr>`
    : '';

  const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Registration Confirmed</title></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Roboto,Arial,Helvetica,sans-serif;color:#1f2937;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your seat for the oStaran AI webinar is confirmed. Here are your joining details.</div>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td align="center" style="padding:28px 12px;">
  <table width="620" cellpadding="0" cellspacing="0" role="presentation" style="max-width:620px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e9f0;">

    <tr><td style="height:5px;line-height:5px;background:linear-gradient(90deg,#3B5BDB,#6366f1,#d946ef);">&nbsp;</td></tr>

    <tr><td align="center" style="padding:30px 28px 10px;">
      ${headerLogos}
    </td></tr>

    <tr><td align="center" style="padding:6px 36px 4px;">
      <p style="margin:0;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#3B5BDB;font-weight:700;">Registration Confirmed</p>
      <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25;color:#0f172a;">Congratulations, ${safeName}!</h1>
    </td></tr>

    <tr><td style="padding:16px 36px 4px;color:#475569;font-size:15px;line-height:1.7;">
      <p style="margin:0;">${intro} Your place in the free live AI certificate webinar is reserved.</p>
    </td></tr>

    <tr><td style="padding:18px 36px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f8fafc;border:1px solid #e5e9f0;border-radius:10px;">
        <tr><td style="padding:20px 22px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr><td style="padding:7px 0;color:#64748b;font-size:13px;width:130px;">Programme</td><td style="padding:7px 0;color:#0f172a;font-size:14px;font-weight:600;">${esc(courseName)}</td></tr>
            ${whenRow}
            <tr><td style="padding:7px 0;color:#64748b;font-size:13px;">Mode</td><td style="padding:7px 0;color:#0f172a;font-size:14px;font-weight:600;">Live online — join in your browser</td></tr>
            <tr><td style="padding:7px 0;color:#64748b;font-size:13px;">Name</td><td style="padding:7px 0;color:#0f172a;font-size:14px;font-weight:600;">${safeName}</td></tr>
            <tr><td style="padding:7px 0;color:#64748b;font-size:13px;">Email</td><td style="padding:7px 0;color:#0f172a;font-size:14px;font-weight:600;">${esc(email)}</td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>

    <tr><td align="center" style="padding:6px 36px 10px;">
      <a href="${esc(joinUrl)}" style="display:inline-block;background:linear-gradient(90deg,#3B5BDB,#6366f1);color:#ffffff;padding:15px 40px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700;">Join the Webinar</a>
      <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">This is your personal joining link — please do not share it.</p>
    </td></tr>

    <tr><td style="padding:16px 36px 6px;color:#475569;font-size:14px;line-height:1.7;">
      <p style="margin:0 0 6px;font-weight:700;color:#0f172a;">What you will take away</p>
      <ul style="margin:0;padding-left:20px;">
        <li>Hands-on practice with today's leading AI tools</li>
        <li>A clear, structured path to a recognised AI certificate</li>
        <li>Practical skills you can apply at work from day one</li>
      </ul>
    </td></tr>

    <tr><td style="padding:22px 36px 10px;"><div style="height:1px;background:#e5e9f0;"></div></td></tr>

    <tr><td style="padding:4px 20px 26px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
        ${partnerFooter}
        ${ostaranFooter}
      </tr></table>
    </td></tr>

    <tr><td style="padding:16px 36px;background:#f8fafc;border-top:1px solid #e5e9f0;">
      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">You are receiving this because you registered for a free oStaran AI webinar. AIwithArijit and oStaran are education brands of Star Analytix.</p>
    </td></tr>

  </table>
</td></tr></table>
</body>
</html>`;

  return { subject, html, replyTo };
}
