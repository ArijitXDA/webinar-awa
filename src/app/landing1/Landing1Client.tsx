'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { STEPS } from './steps';
import type { Answers, PartnerCard, QuestionStep, WebinarCourse } from './types';
import { computeReadiness } from './scoring';
import { ProgressBar } from './components/ui';
import {
  CourseScreen,
  InputScreen,
  LearnScreen,
  LoaderScreen,
  PartnerIntroScreen,
  ProgramScreen,
  ProofScreen,
  QuestionScreen,
  StatementScreen,
  SuccessScreen,
  SummaryScreen,
} from './components/screens';

const FALLBACK_COURSES: WebinarCourse[] = [
  { course_id: 1, course_name: 'Agentic AI Certification for Working Professionals', course_short_name: 'Agentic AI – Professionals', webinar_date: null, webinar_time: null, timezone: 'IST' },
  { course_id: 3, course_name: 'AI Certification for College Students & Job Seekers', course_short_name: 'AI for College & Job Seekers', webinar_date: null, webinar_time: null, timezone: 'IST' },
  { course_id: 4, course_name: 'Agentic AI Development for Tech Professionals', course_short_name: 'Agentic AI – Tech Dev', webinar_date: null, webinar_time: null, timezone: 'IST' },
  { course_id: 5, course_name: 'Digital & Generative AI Transformation for Business Leaders', course_short_name: 'AI for Business Leaders', webinar_date: null, webinar_time: null, timezone: 'IST' },
  { course_id: 2, course_name: 'AI for School Students & Future Readiness', course_short_name: 'AI for Schools', webinar_date: null, webinar_time: null, timezone: 'IST' },
];

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const phoneOk = (v: string) => v.replace(/[^\d]/g, '').length >= 8;

export default function Landing1Client() {
  const params = useSearchParams();
  const partnerCode = params.get('utm_source') || params.get('p') || '';

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [courseId, setCourseId] = useState<number | null>(null);

  const [courses, setCourses] = useState<WebinarCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerCard | null>(null);
  const [partnerLoading, setPartnerLoading] = useState(Boolean(partnerCode));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{ duplicate: boolean; courseName: string | null; when: string | null }>(
    { duplicate: false, courseName: null, when: null },
  );

  const step = STEPS[index];
  const progress = index / (STEPS.length - 1);
  const dailyGoalMinutes = answers['daily_goal'] ? parseInt(answers['daily_goal'], 10) : null;
  const readiness = useMemo(() => computeReadiness(answers), [answers]);

  // Load active webinars (anon client, same as the main landing page).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('qr_landing_webinar_links')
          .select('course_id,course_name,course_short_name,webinar_date,webinar_time,timezone,current_registrations,max_registrations')
          .eq('is_active', true)
          .order('course_order', { ascending: true });
        if (alive) setCourses(data && data.length ? (data as WebinarCourse[]) : FALLBACK_COURSES);
      } catch {
        if (alive) setCourses(FALLBACK_COURSES);
      } finally {
        if (alive) setCoursesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Load the partner card (new RPC, with graceful fallback to the badge RPC).
  useEffect(() => {
    if (!partnerCode) return;
    let alive = true;
    (async () => {
      try {
        const { data, error: rpcErr } = await supabase.rpc('landing1_partner_card', { p_code: partnerCode });
        const row = Array.isArray(data) ? data[0] : data;
        if (!rpcErr && row) {
          if (alive) setPartner(row as PartnerCard);
        } else {
          const badge = await supabase.rpc('partner_public_badge', { p_code: partnerCode });
          const b = Array.isArray(badge.data) ? badge.data[0] : badge.data;
          if (alive && b) {
            setPartner({
              display_name: b.display_name ?? null,
              company_name: b.company_name ?? null,
              avatar_url: b.avatar_url ?? null,
              whatsapp: null,
              partner_code: partnerCode,
            });
          }
        }
      } catch {
        /* no partner badge — flow still works */
      } finally {
        if (alive) setPartnerLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [partnerCode]);

  const goNext = useCallback(() => setIndex((i) => Math.min(STEPS.length - 1, i + 1)), []);
  const goBack = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  const onSelect = useCallback(
    (qStep: QuestionStep, value: string) => {
      setAnswers((a) => ({ ...a, [qStep.field]: value }));
      setTimeout(() => setIndex((i) => Math.min(STEPS.length - 1, i + 1)), 220);
    },
    [],
  );

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/landing1/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          courseId,
          answers,
          readiness_score: readiness,
          daily_goal_minutes: dailyGoalMinutes,
          partner_code: partnerCode,
          utm: {
            utm_source: params.get('utm_source') || partnerCode || null,
            utm_medium: params.get('utm_medium'),
            utm_campaign: params.get('utm_campaign'),
            utm_term: params.get('utm_term'),
            utm_content: params.get('utm_content'),
          },
          referred_by_email: params.get('ref'),
          landing_page_url: typeof window !== 'undefined' ? window.location.href : null,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
      setResult({ duplicate: Boolean(json.duplicate), courseName: json.course_name ?? null, when: json.webinar_when ?? null });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [answers, courseId, dailyGoalMinutes, email, name, params, partnerCode, phone, readiness]);

  const showChrome = !done && step.kind !== 'partnerIntro';

  function renderStep() {
    if (done) {
      return (
        <SuccessScreen
          name={name}
          partner={partner}
          courseName={result.courseName}
          webinarWhen={result.when}
          duplicate={result.duplicate}
        />
      );
    }
    switch (step.kind) {
      case 'partnerIntro':
        return <PartnerIntroScreen partner={partner} loading={partnerLoading} onNext={goNext} />;
      case 'question':
        return <QuestionScreen step={step} selected={answers[step.field]} onSelect={(v) => onSelect(step, v)} />;
      case 'statement':
        return <StatementScreen step={step} onNext={goNext} />;
      case 'loader':
        return <LoaderScreen step={step} onDone={goNext} />;
      case 'email':
        return (
          <InputScreen
            title={step.title}
            subtitle={step.subtitle}
            value={email}
            onChange={setEmail}
            onNext={goNext}
            placeholder="you@example.com"
            inputMode="email"
            type="email"
            canContinue={emailOk(email)}
            error={email && !emailOk(email) ? 'Please enter a valid email address.' : null}
          />
        );
      case 'name':
        return (
          <InputScreen
            title={step.title}
            subtitle={step.subtitle}
            value={name}
            onChange={setName}
            onNext={goNext}
            placeholder="Your name"
            canContinue={name.trim().length >= 2}
          />
        );
      case 'contact':
        return (
          <InputScreen
            title={step.title}
            subtitle={step.subtitle}
            value={phone}
            onChange={setPhone}
            onNext={goNext}
            placeholder="+91 98765 43210"
            inputMode="tel"
            type="tel"
            canContinue={phoneOk(phone)}
            error={phone && !phoneOk(phone) ? 'Please enter a valid phone number.' : null}
          />
        );
      case 'course':
        return (
          <CourseScreen
            title={step.title}
            subtitle={step.subtitle}
            courses={courses}
            loading={coursesLoading}
            selectedId={courseId}
            onSelect={setCourseId}
            onNext={goNext}
          />
        );
      case 'summary':
        return <SummaryScreen answers={answers} score={readiness} dailyGoalMinutes={dailyGoalMinutes} onNext={goNext} />;
      case 'program':
        return <ProgramScreen name={name} onNext={goNext} />;
      case 'learn':
        return <LearnScreen onNext={goNext} />;
      case 'proof':
        return <ProofScreen onSubmit={submit} submitting={submitting} error={error} />;
      default:
        return null;
    }
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-5">
        {showChrome && (
          <div className="mb-6 flex items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <ProgressBar value={progress} />
          </div>
        )}

        <div className="flex flex-1 flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={done ? 'done' : step.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
