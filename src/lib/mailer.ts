/**
 * mailer.ts — Shared SMTP utility
 *
 * Strategy: Hostinger as primary (500/day), Brevo as fallback (300/day).
 * If Hostinger throws a quota / rate-limit error, the same email is
 * automatically retried through Brevo without any caller-side changes.
 *
 * Both routes (send-email + auto-confirm) import sendMailWithFallback()
 * so the logic lives in one place.
 */

import nodemailer from 'nodemailer'

// ─── Transporters ─────────────────────────────────────────────────────────────

/** Primary: Hostinger SMTP (SSL, port 465) */
const hostingerTransport = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

/** Fallback: Brevo SMTP relay (STARTTLS, port 587) */
const brevoTransport = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,   // ari.bombay@gmail.com
    pass: process.env.BREVO_SMTP_KEY,    // xsmtpsib-...
  },
})

// ─── Quota / rate-limit error detection ───────────────────────────────────────

/**
 * Returns true when the SMTP error looks like a quota or rate-limit rejection
 * (as opposed to a bad-credentials / DNS / network error which shouldn't
 * trigger a fallback).
 */
function isQuotaError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return (
    msg.includes('quota')       ||
    msg.includes('daily limit') ||
    msg.includes('exceed')      ||
    msg.includes('too many')    ||
    msg.includes('rate limit')  ||
    msg.includes('throttl')     ||
    msg.includes('421')         ||   // SMTP 421: service temporarily unavailable
    msg.includes('452')              // SMTP 452: insufficient storage / over quota
  )
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface MailOptions {
  to: string
  subject: string
  html: string
  attachments?: nodemailer.SendMailOptions['attachments']
}

export interface SendResult {
  provider: 'hostinger' | 'brevo'
  usedFallback: boolean
}

/**
 * Sends an email via Hostinger.
 * If Hostinger returns a quota / rate-limit error, retries via Brevo.
 * Any other error (bad auth, bad address, network) is re-thrown immediately.
 */
export async function sendMailWithFallback(options: MailOptions): Promise<SendResult> {
  const fromName  = process.env.SMTP_FROM_NAME || 'AIwithArijit'

  // Hostinger FROM: ai@withArijit.com  (existing, verified)
  const hostingerFrom = `"${fromName}" <${process.env.SMTP_USER}>`

  // Brevo FROM: ai@ostaran.com once domain is verified, same as Hostinger for now
  // Change BREVO_FROM_EMAIL in .env to switch without touching code
  const brevoFrom = `"${fromName}" <${process.env.BREVO_FROM_EMAIL || process.env.SMTP_USER}>`

  // ── Try Hostinger ──────────────────────────────────────────────────────────
  try {
    await hostingerTransport.sendMail({ from: hostingerFrom, ...options })
    return { provider: 'hostinger', usedFallback: false }
  } catch (err) {
    if (!isQuotaError(err)) {
      // Not a quota error — surface it immediately, don't waste Brevo quota
      throw err
    }
    console.warn(
      `[mailer] Hostinger quota/rate error — falling back to Brevo.\n` +
      `  to: ${options.to}\n` +
      `  err: ${err instanceof Error ? err.message : err}`
    )
  }

  // ── Fallback: Brevo ────────────────────────────────────────────────────────
  await brevoTransport.sendMail({ from: brevoFrom, ...options })
  return { provider: 'brevo', usedFallback: true }
}
