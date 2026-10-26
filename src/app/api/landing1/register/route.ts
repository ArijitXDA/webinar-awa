import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

type Body = {
  name?: string;
  email?: string;
  phone?: string;
  courseId?: number | null;
  answers?: Record<string, string>;
  readiness_score?: number | null;
  daily_goal_minutes?: number | null;
  partner_code?: string | null;
  utm?: Record<string, string | null>;
  referred_by_email?: string | null;
  landing_page_url?: string | null;
  user_agent?: string | null;
};

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function professionFrom(answers: Record<string, string> | undefined): string {
  const self = answers?.self_description;
  if (self === 'I work for a company') return 'working_professional';
  if (self === 'I work for myself') return 'self_employed';
  return 'other';
}

function deviceFrom(ua: string | null | undefined): string {
  if (!ua) return 'unknown';
  return /Mobi|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop';
}

function whenString(date: string | null, time: string | null, tz: string | null): string | null {
  if (!date) return null;
  const d = new Date(`${date}T${time ?? '00:00:00'}`);
  const datePart = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' });
  const timePart = time ? time.slice(0, 5) : '';
  return `${datePart}${timePart ? ` • ${timePart} ${tz ?? 'IST'}` : ''}`;
}

export async function POST(req: Request) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ ok: false, error: 'Server not configured.' }, { status: 500 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  const email = (body.email ?? '').trim().toLowerCase();
  const phone = (body.phone ?? '').trim();
  const courseId = body.courseId ?? null;

  if (name.length < 2) return NextResponse.json({ ok: false, error: 'Please enter your name.' }, { status: 400 });
  if (!emailOk(email)) return NextResponse.json({ ok: false, error: 'Please enter a valid email.' }, { status: 400 });
  if (phone.replace(/[^\d]/g, '').length < 8)
    return NextResponse.json({ ok: false, error: 'Please enter a valid phone number.' }, { status: 400 });
  if (courseId == null) return NextResponse.json({ ok: false, error: 'Please choose a webinar.' }, { status: 400 });

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Resolve the chosen webinar.
  const { data: course, error: courseErr } = await db
    .from('qr_landing_webinar_links')
    .select('course_id,course_name,webinar_date,webinar_time,timezone')
    .eq('course_id', courseId)
    .maybeSingle();

  if (courseErr || !course) {
    return NextResponse.json({ ok: false, error: 'Selected webinar is unavailable.' }, { status: 400 });
  }

  const webinarWhen = whenString(course.webinar_date, course.webinar_time, course.timezone);

  // Duplicate guard: one registration per (email, webinar_date), mirroring the
  // main landing page behaviour.
  if (course.webinar_date) {
    const { data: existing } = await db
      .from('qr_landing_registrations')
      .select('id')
      .eq('email', email)
      .eq('webinar_date', course.webinar_date)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        course_name: course.course_name,
        webinar_when: webinarWhen,
      });
    }
  }

  const base: Record<string, unknown> = {
    full_name: name,
    email,
    mobile: phone,
    age: body.answers?.age ?? null,
    profession_choice: professionFrom(body.answers),
    course_id: course.course_id,
    course_name: course.course_name,
    webinar_date: course.webinar_date,
    webinar_time: course.webinar_time,
    timezone: course.timezone ?? 'IST',
    marketing_consent: true,
    registration_status: 'registered',
    utm_source: body.utm?.utm_source ?? body.partner_code ?? null,
    utm_medium: body.utm?.utm_medium ?? null,
    utm_campaign: body.utm?.utm_campaign ?? null,
    utm_term: body.utm?.utm_term ?? null,
    utm_content: body.utm?.utm_content ?? null,
    referred_by_email: body.referred_by_email ?? null,
    landing_page_url: body.landing_page_url ?? null,
    user_agent: body.user_agent ?? null,
    device_type: deviceFrom(body.user_agent),
  };

  const extras: Record<string, unknown> = {
    reg_source: 'landing1',
    landing1_quiz: body.answers ?? {},
    daily_goal_minutes: body.daily_goal_minutes ?? null,
    readiness_score: body.readiness_score ?? null,
  };

  // Try the full insert (needs supabase_landing1.sql applied). If the new
  // columns don't exist yet, fall back to a core insert so registration still
  // works — the quiz detail is simply not persisted until the migration runs.
  let insertErr = (await db.from('qr_landing_registrations').insert([{ ...base, ...extras }])).error;
  let degraded = false;
  if (insertErr && /column .* does not exist|reg_source|landing1_quiz|daily_goal_minutes|readiness_score/i.test(insertErr.message)) {
    degraded = true;
    insertErr = (await db.from('qr_landing_registrations').insert([base])).error;
  }

  if (insertErr) {
    return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    duplicate: false,
    degraded,
    course_name: course.course_name,
    webinar_when: webinarWhen,
  });
}
