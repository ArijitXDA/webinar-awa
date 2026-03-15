/**
 * Generates an .ics (iCalendar) file content for a webinar event.
 * Compatible with Google Calendar, Apple Calendar, Outlook.
 */

export interface ICSEventData {
  title: string
  description?: string
  location?: string
  url?: string
  organizerEmail: string
  organizerName: string
  attendeeEmail?: string
  attendeeName?: string
  /** e.g. "2025-01-18" */
  dateStr: string
  /** e.g. "11:00 AM IST" or "11:00 AM" — we parse this to UTC */
  timeStr: string
  /** Duration in minutes, default 90 */
  durationMinutes?: number
}

/** Convert a date string + time string to UTC for .ics */
function parseToUTC(dateStr: string, timeStr: string): Date | null {
  try {
    // Remove IST / timezone labels, keep HH:MM AM/PM
    const cleanTime = timeStr.replace(/\s*(IST|UTC|GMT|EST|PST|CST)\s*/i, '').trim()
    const combined = `${dateStr} ${cleanTime}`
    const d = new Date(combined)
    if (isNaN(d.getTime())) return null
    // IST is UTC+5:30 — subtract offset if "IST" was in the string
    if (/IST/i.test(timeStr)) {
      d.setMinutes(d.getMinutes() - 330) // subtract 5h 30m
    }
    return d
  } catch {
    return null
  }
}

/** Format a Date to ics DTSTART/DTEND format: 20250118T053000Z */
function toICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Escape special chars in ics text fields */
function escICS(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

/** Generate a simple unique ID */
function uid(): string {
  return `awa-webinar-${Date.now()}-${Math.random().toString(36).slice(2)}@aiwitharijit.com`
}

export function generateICS(event: ICSEventData): string | null {
  const start = parseToUTC(event.dateStr, event.timeStr)
  if (!start) return null

  const end = new Date(start.getTime() + (event.durationMinutes ?? 90) * 60 * 1000)
  const now = toICSDate(new Date())

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AIwithArijit//Webinar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid()}`,
    `DTSTAMP:${now}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${escICS(event.title)}`,
  ]

  if (event.description) lines.push(`DESCRIPTION:${escICS(event.description)}`)
  if (event.location)    lines.push(`LOCATION:${escICS(event.location)}`)
  if (event.url)         lines.push(`URL:${event.url}`)

  lines.push(`ORGANIZER;CN="${escICS(event.organizerName)}":MAILTO:${event.organizerEmail}`)

  if (event.attendeeEmail) {
    lines.push(`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=FALSE;CN="${escICS(event.attendeeName || '')}":MAILTO:${event.attendeeEmail}`)
  }

  lines.push(
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Your AIwithArijit webinar starts in 1 hour!',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Your AIwithArijit webinar starts in 15 minutes!',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  )

  // Fold lines > 75 chars per RFC 5545
  return lines.map(line => {
    if (line.length <= 75) return line
    const chunks: string[] = []
    chunks.push(line.slice(0, 75))
    let i = 75
    while (i < line.length) {
      chunks.push(' ' + line.slice(i, i + 74))
      i += 74
    }
    return chunks.join('\r\n')
  }).join('\r\n')
}
