// ─── Base URL ──────────────────────────────────────────────────────────────────
export const BASE_URL = 'https://webinar.ostaran.com'

// ─── Brand logos & trainer ─────────────────────────────────────────────────────
export const BRAND = {
  aiwa: {
    logoUrl: `${BASE_URL}/logo.jpg`,
    alt: 'AI WithArijit',
    width: 160,
    height: 44,
  },
  ostaran: {
    logoUrl: `${BASE_URL}/oStaran.png`,
    alt: 'oStaran',
    width: 130,
    height: 44,
    darkBg: true, // logo has black background — rendered on dark pill
  },
  trainer: {
    photoUrl: `${BASE_URL}/trainer-arijit.jpg`,
    name: 'Arijit Chowdhury',
    title: 'AI Trainer & Educator',
    website: 'aiwitharijit.com',
  },
}

// ─── Technology badges ─────────────────────────────────────────────────────────
// Rendered as pure HTML spans — no external images, 100% email-client safe
export const TECH_BADGES: Record<string, {
  label: string
  bg: string
  color: string
  emoji: string
}> = {
  python:         { label: 'Python',          bg: '#3776AB', color: '#ffffff', emoji: '🐍' },
  langchain:      { label: 'LangChain',        bg: '#1C3C3C', color: '#ffffff', emoji: '⛓️' },
  claude_ai:      { label: 'Claude AI',        bg: '#D97757', color: '#ffffff', emoji: '🤖' },
  claude_code:    { label: 'Claude Code',      bg: '#bf5c3a', color: '#ffffff', emoji: '💻' },
  cursor:         { label: 'Cursor',           bg: '#1a1a1a', color: '#ffffff', emoji: '✏️' },
  github_copilot: { label: 'GitHub Copilot',   bg: '#24292E', color: '#ffffff', emoji: '🐙' },
  azure:          { label: 'Microsoft Azure',  bg: '#0078D4', color: '#ffffff', emoji: '☁️' },
  aws:            { label: 'Amazon AWS',       bg: '#FF9900', color: '#000000', emoji: '🟠' },
  openai:         { label: 'OpenAI',           bg: '#10a37f', color: '#ffffff', emoji: '✨' },
  gemini:         { label: 'Google Gemini',    bg: '#4285F4', color: '#ffffff', emoji: '💎' },
  n8n:            { label: 'n8n',              bg: '#EA4B71', color: '#ffffff', emoji: '⚡' },
  power_bi:       { label: 'Power BI',         bg: '#F2C811', color: '#000000', emoji: '📊' },
  excel_ai:       { label: 'Excel + AI',       bg: '#217346', color: '#ffffff', emoji: '📈' },
  chatgpt:        { label: 'ChatGPT',          bg: '#10a37f', color: '#ffffff', emoji: '💬' },
}

// ─── Template catalogue ────────────────────────────────────────────────────────
export const TEMPLATE_CATALOGUE = {
  webinar_reminder: {
    label: '🔔 Webinar Reminder',
    category: 'reminder' as const,
    defaultSubject: '🔔 Reminder: Your {{course}} Webinar is Tomorrow, {{name}}!',
    fields: ['joining_link', 'custom_message'] as const,
    hasICS: true,
    description: 'Personalized reminder with webinar details card, "Join Now" button and .ics calendar attachment',
  },
  webinar_today: {
    label: '⏰ Webinar Today!',
    category: 'reminder' as const,
    defaultSubject: '⏰ TODAY: Your {{course}} Webinar Starts at {{webinar_time}}, {{name}}!',
    fields: ['joining_link', 'custom_message'] as const,
    hasICS: false,
    description: 'Urgent day-of reminder with bold countdown header and joining link',
  },
  registration_confirmation: {
    label: '✅ Registration Confirmation',
    category: 'confirmation' as const,
    defaultSubject: '✅ You\'re Registered for {{course}}, {{name}}!',
    fields: ['joining_link', 'custom_message'] as const,
    hasICS: true,
    description: 'Welcome email with registration confirmed badge, details card and .ics invite',
  },
  post_webinar_followup: {
    label: '🙏 Post-Webinar Follow-up',
    category: 'followup' as const,
    defaultSubject: '🙏 Thanks for Attending, {{name}}! Recording Inside',
    fields: ['recording_link', 'custom_message', 'cta_label', 'cta_url'] as const,
    hasICS: false,
    description: 'Thank-you email with recording link and next-steps CTA',
  },
  certificate_ready: {
    label: '🎓 Certificate Ready',
    category: 'certificate' as const,
    defaultSubject: '🎓 Your {{course}} Certificate is Ready, {{name}}!',
    fields: ['certificate_link', 'custom_message'] as const,
    hasICS: false,
    description: 'Certificate completion email with download button',
  },
  course_launch: {
    label: '🚀 Course Launch',
    category: 'announcement' as const,
    defaultSubject: '🚀 New Course Just Launched: {{course}} — Register Now!',
    fields: ['joining_link', 'custom_message', 'cta_label', 'cta_url'] as const,
    hasICS: false,
    description: 'Course announcement with tech badges, details and registration CTA',
  },
  special_offer: {
    label: '🎁 Special Offer / Promo',
    category: 'promo' as const,
    defaultSubject: '🎁 Exclusive Offer Just for You, {{name}}!',
    fields: ['discount_code', 'discount_percent', 'custom_message', 'cta_label', 'cta_url'] as const,
    hasICS: false,
    description: 'Promo email with bold discount code box and urgency CTA',
  },
  custom_broadcast: {
    label: '📢 Custom Broadcast',
    category: 'custom' as const,
    defaultSubject: 'A message from AIwithArijit',
    fields: ['custom_message', 'cta_label', 'cta_url'] as const,
    hasICS: false,
    description: 'Free-form email with branded header/footer and optional CTA button',
  },
} as const

export type TemplateKey = keyof typeof TEMPLATE_CATALOGUE
export type TemplateCategory = typeof TEMPLATE_CATALOGUE[TemplateKey]['category']
