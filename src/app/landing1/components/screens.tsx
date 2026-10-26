'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CURRICULUM, TECH_ICONS } from '@/lib/curriculum';
import type {
  Answers,
  PartnerCard,
  QuestionStep,
  StatementStep,
  LoaderStep,
  WebinarCourse,
} from '../types';
import { readinessBand } from '../scoring';
import { OptionCard, PrimaryButton, ScreenHeading, SmartImage, TextField } from './ui';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

// Normalize a stored mobile into a wa.me-ready number. Most oStaran partners
// store a bare 10-digit Indian number, so default the country code to 91.
function normalizeWa(raw?: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, '');
  if (d.length === 10) d = '91' + d;
  else if (d.length === 11 && d.startsWith('0')) d = '91' + d.slice(1);
  return d.length >= 11 && d.length <= 15 ? d : null;
}

function BrandIcon({ name, size = 22 }: { name: string | null; size?: number }) {
  const icon = name ? TECH_ICONS[name] : null;
  if (icon && icon.path) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill={`#${icon.hex.replace('#', '')}`} aria-hidden>
        <path d={icon.path} />
      </svg>
    );
  }
  return <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary-400" aria-hidden />;
}

// ---------------------------------------------------------------------------
// Partner intro
// ---------------------------------------------------------------------------

export function PartnerIntroScreen({
  partner,
  loading,
  onNext,
}: {
  partner: PartnerCard | null;
  loading: boolean;
  onNext: () => void;
}) {
  const useOstaran = Boolean(partner?.use_ostaran);
  const name = partner?.display_name;
  return (
    <div className="flex flex-col items-center text-center">
      <span className="mb-6 rounded-full bg-primary-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary-600">
        Free AI Certificate Webinar
      </span>

      {loading ? (
        <div className="mb-6 h-24 w-24 animate-pulse rounded-full bg-slate-200" />
      ) : useOstaran ? (
        <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-white p-3 shadow-md ring-4 ring-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/oStaran.png" alt="oStaran" className="h-full w-full object-contain" />
        </div>
      ) : partner ? (
        <div className="mb-5 flex flex-col items-center">
          {partner.avatar_url ? (
            <SmartImage
              src={partner.avatar_url}
              alt={name ?? 'Partner'}
              className={`h-24 w-24 rounded-full shadow-md ring-4 ring-white ${
                partner.is_poc ? 'bg-white object-contain p-2' : 'object-cover'
              }`}
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-3xl font-bold text-white">
              {(name ?? 'O').charAt(0)}
            </div>
          )}
        </div>
      ) : null}

      <h1 className="text-[26px] font-bold leading-tight text-slate-900">
        {useOstaran ? (
          <>You&apos;re invited to master AI with oStaran</>
        ) : name ? (
          <>{name} invites you to master AI with oStaran</>
        ) : (
          <>Master AI and earn your certificate with oStaran</>
        )}
      </h1>
      {partner?.company_name && !useOstaran && (
        <p className="mt-1 text-sm font-medium text-slate-500">{partner.company_name}</p>
      )}
      <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-slate-500">
        Answer a few quick questions and we will build a personalized AI learning path for you — then
        reserve your seat in a free live webinar.
      </p>

      <div className="mt-8 w-full">
        <PrimaryButton onClick={onNext}>Start — it takes 2 minutes</PrimaryButton>
      </div>
      <p className="mt-3 text-xs text-slate-400">No payment required • Limited seats</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question
// ---------------------------------------------------------------------------

export function QuestionScreen({
  step,
  selected,
  onSelect,
}: {
  step: QuestionStep;
  selected?: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <ScreenHeading title={step.title} subtitle={step.subtitle} />
      <div className="flex flex-col gap-3">
        {step.choices.map((c) => (
          <OptionCard
            key={c.value}
            label={c.label}
            sub={c.sub}
            selected={selected === c.value}
            onClick={() => onSelect(c.value)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Statement / interstitial
// ---------------------------------------------------------------------------

export function StatementScreen({ step, onNext }: { step: StatementStep; onNext: () => void }) {
  return (
    <div className="flex flex-col">
      {step.image && (
        <SmartImage
          src={step.image}
          alt=""
          className="mb-7 h-48 w-full rounded-3xl object-cover"
        />
      )}
      {step.eyebrow && (
        <span className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-500">
          {step.eyebrow}
        </span>
      )}
      <h1 className="text-[26px] font-bold leading-tight text-slate-900">{step.title}</h1>
      {step.body && <p className="mt-4 text-[15px] leading-relaxed text-slate-600">{step.body}</p>}
      <div className="mt-8">
        <PrimaryButton onClick={onNext}>{step.cta ?? 'Continue'}</PrimaryButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loader / analyzing
// ---------------------------------------------------------------------------

export function LoaderScreen({ step, onDone }: { step: LoaderStep; onDone: () => void }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const dur = 2600;
    const tick = setInterval(() => {
      const p = Math.min(100, Math.round(((Date.now() - start) / dur) * 100));
      setPct(p);
      if (p >= 100) {
        clearInterval(tick);
        setTimeout(onDone, 450);
      }
    }, 40);
    return () => clearInterval(tick);
  }, [onDone]);

  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-6 h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="url(#g1)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C - (C * pct) / 100}
          />
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3B5BDB" />
              <stop offset="100%" stopColor="#d946ef" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-slate-800">
          {pct}%
        </div>
      </div>
      <h1 className="max-w-sm text-xl font-bold leading-snug text-slate-900">{step.title}</h1>
      {step.testimonial && (
        <div className="mt-8 w-full rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm">
          <p className="text-[15px] leading-relaxed text-slate-700">“{step.testimonial.quote}”</p>
          <p className="mt-3 text-sm font-semibold text-slate-900">{step.testimonial.name}</p>
          <p className="text-xs text-slate-500">{step.testimonial.title}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inputs (email / name / phone)
// ---------------------------------------------------------------------------

export function InputScreen({
  title,
  subtitle,
  value,
  onChange,
  onNext,
  placeholder,
  inputMode,
  type = 'text',
  canContinue,
  error,
}: {
  title: string;
  subtitle?: string;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  placeholder?: string;
  inputMode?: 'text' | 'email' | 'tel';
  type?: string;
  canContinue: boolean;
  error?: string | null;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canContinue) onNext();
      }}
    >
      <ScreenHeading title={title} subtitle={subtitle} />
      <TextField
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={inputMode}
        type={type}
        autoFocus
      />
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      <div className="mt-8">
        <PrimaryButton type="submit" disabled={!canContinue}>
          Continue
        </PrimaryButton>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Course picker
// ---------------------------------------------------------------------------

function formatWebinar(c: WebinarCourse): string {
  if (!c.webinar_date) return 'Live online';
  const d = new Date(`${c.webinar_date}T${c.webinar_time ?? '00:00:00'}`);
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const time = c.webinar_time ? c.webinar_time.slice(0, 5) : '';
  return `${date}${time ? ` • ${time} ${c.timezone ?? 'IST'}` : ''}`;
}

export function CourseScreen({
  title,
  subtitle,
  courses,
  loading,
  selectedId,
  onSelect,
  onNext,
}: {
  title: string;
  subtitle?: string;
  courses: WebinarCourse[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <ScreenHeading title={title} subtitle={subtitle} />
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {courses.map((c) => (
            <OptionCard
              key={c.course_id}
              label={c.course_short_name || c.course_name}
              sub={formatWebinar(c)}
              selected={selectedId === c.course_id}
              onClick={() => onSelect(c.course_id)}
            />
          ))}
        </div>
      )}
      <div className="mt-8">
        <PrimaryButton onClick={onNext} disabled={selectedId == null}>
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Personal summary (honest, computed score)
// ---------------------------------------------------------------------------

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-[15px] font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export function SummaryScreen({
  answers,
  score,
  dailyGoalMinutes,
  onNext,
}: {
  answers: Answers;
  score: number;
  dailyGoalMinutes: number | null;
  onNext: () => void;
}) {
  const band = readinessBand(score);
  const focus = answers['goal'] ?? 'Making AI your advantage';
  const experience =
    answers['tried_courses']?.startsWith('No') || answers['experience'] === 'Completely new to AI'
      ? 'Mostly self-taught so far'
      : 'Some hands-on exposure';
  return (
    <div>
      <ScreenHeading
        title="Your personal summary"
        subtitle="You're ready — you've just been missing a clear starting point."
      />

      <div className="mb-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Current AI skills</span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              band === 'Low'
                ? 'bg-red-50 text-red-500'
                : band === 'Medium'
                ? 'bg-amber-50 text-amber-600'
                : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {band}
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-primary-500 to-accent-500"
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] font-medium text-slate-400">
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SummaryTile label="Your focus" value={focus} />
        <SummaryTile label="Your readiness" value="Ready to learn online" />
        <SummaryTile label="Your pace" value={`${dailyGoalMinutes ?? 20} min a day`} />
        <SummaryTile label="Experience" value={experience} />
      </div>

      <div className="mt-8">
        <PrimaryButton onClick={onNext}>See my program</PrimaryButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Personalized program + with/without
// ---------------------------------------------------------------------------

export function ProgramScreen({ name, onNext }: { name: string; onNext: () => void }) {
  const cert = new Date();
  cert.setDate(cert.getDate() + 28);
  const certDate = cert.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  const without = [
    'No idea where to begin',
    'No recognized credential',
    'Hit-or-miss results',
    'Invisible to employers',
  ];
  const with_ = [
    'A clear, step-by-step path',
    'A shareable AI certificate',
    'Reliable results from AI',
    'Stand out from other professionals',
  ];

  return (
    <div>
      <ScreenHeading
        title={`${name ? name + ', your' : 'Your'} personalized AI Certificate Program`}
        subtitle={`At your chosen pace, we expect you to earn your AI certificate by ${certDate}.`}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-sm font-bold text-slate-500">Without oStaran</p>
          <ul className="space-y-2.5">
            {without.map((t) => (
              <li key={t} className="flex gap-2 text-[13px] text-slate-500">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border-2 border-primary-200 bg-primary-50 p-4">
          <p className="mb-3 text-sm font-bold text-primary-600">With oStaran</p>
          <ul className="space-y-2.5">
            {with_.map((t) => (
              <li key={t} className="flex gap-2 text-[13px] font-medium text-slate-700">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8">
        <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// What you will learn (real curriculum)
// ---------------------------------------------------------------------------

export function LearnScreen({ onNext }: { onNext: () => void }) {
  const groups = CURRICULUM.slice(0, 12);
  const benefits = [
    'Master practical AI tools and build real confidence from day one',
    "Work with the world's top AI: ChatGPT, Gemini, Claude, Grok and more",
    'Earn an AI certificate that helps you stand out at work',
    'Track your progress and see your growth with every lesson',
  ];
  return (
    <div>
      <ScreenHeading
        title="AI is easier than you think"
        subtitle="Your program is designed to make a difference in your AI knowledge from day one."
      />

      <ul className="mb-6 space-y-2.5">
        {benefits.map((b) => (
          <li key={b} className="flex gap-2.5 text-[14px] text-slate-700">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {b}
          </li>
        ))}
      </ul>

      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        A glimpse of what you will explore
      </p>
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="mb-2 text-sm font-semibold" style={{ color: g.accent }}>
              {g.title}
            </p>
            <div className="flex flex-wrap gap-2">
              {g.items.map((it) => (
                <span
                  key={it.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700"
                >
                  <BrandIcon name={it.icon} size={16} />
                  {it.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Social proof + testimonials, then submit
// ---------------------------------------------------------------------------

const TESTIMONIALS = [
  {
    quote: 'Clear, practical and genuinely useful. I finally understand how to put AI to work in my own job.',
    name: 'Dakshayani B P',
    title: 'Scientist, ISRO',
  },
  {
    quote: 'A structured, no-nonsense path. The projects made the concepts stick.',
    name: 'Dr. Harish B Suri',
    title: 'IIM Mumbai / IIT KGP',
  },
  {
    quote: 'I went from curious to confident. The certificate was a real conversation-starter at work.',
    name: 'Suvajit Ray',
    title: 'IIFL',
  },
];

export function ProofScreen({
  onSubmit,
  submitting,
  error,
}: {
  onSubmit: () => void;
  submitting: boolean;
  error?: string | null;
}) {
  const stats = [
    { n: '50,000+', l: 'Learners trained' },
    { n: 'India · USA · Canada', l: 'Across 3 countries' },
    { n: '94%', l: 'Positive reviews' },
  ];
  return (
    <div>
      <ScreenHeading
        title="See how oStaran empowers learners"
        subtitle="Join a community that is already putting AI to work."
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.l} className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
            <p className="text-sm font-bold text-primary-600">{s.n}</p>
            <p className="mt-1 text-[11px] leading-tight text-slate-500">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[14px] leading-relaxed text-slate-700">“{t.quote}”</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{t.name}</p>
            <p className="text-xs text-slate-500">{t.title}</p>
          </div>
        ))}
      </div>

      {error && <p className="mt-5 text-sm text-red-500">{error}</p>}

      <div className="mt-8">
        <PrimaryButton onClick={onSubmit} loading={submitting}>
          Reserve my free seat
        </PrimaryButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Success + partner WhatsApp CTA
// ---------------------------------------------------------------------------

export function SuccessScreen({
  name,
  partner,
  courseName,
  webinarWhen,
  duplicate,
}: {
  name: string;
  partner: PartnerCard | null;
  courseName: string | null;
  webinarWhen: string | null;
  duplicate: boolean;
}) {
  const waNumber = normalizeWa(partner?.whatsapp);
  const waText = encodeURIComponent(
    `Hi${partner?.display_name ? ' ' + partner.display_name : ''}, I just registered for the oStaran AI webinar${
      courseName ? ` (${courseName})` : ''
    }. I'd love any guidance to get started.`,
  );
  const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waText}` : null;

  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 14 }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 text-white"
      >
        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={3}>
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>

      <h1 className="text-[26px] font-bold leading-tight text-slate-900">
        {duplicate ? "You're already registered" : `You're in${name ? ', ' + name : ''}!`}
      </h1>
      <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-slate-600">
        {duplicate
          ? 'We found your existing booking for this webinar. Your joining details are on their way.'
          : 'Your seat is reserved. We have sent your confirmation and joining link by email.'}
      </p>

      {(courseName || webinarWhen) && (
        <div className="mt-6 w-full rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm">
          {courseName && <p className="text-sm font-semibold text-slate-900">{courseName}</p>}
          {webinarWhen && <p className="mt-0.5 text-sm text-slate-500">{webinarWhen}</p>}
        </div>
      )}

      {partner && waLink && (
        <div className="mt-6 w-full rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-sm text-slate-700">
            Have a question? Message{' '}
            <span className="font-semibold">{partner.display_name}</span> directly.
          </p>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:brightness-105"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.01c-.24.68-1.42 1.3-1.95 1.34-.5.04-.97.23-3.27-.68-2.77-1.09-4.5-3.94-4.64-4.12-.13-.18-1.1-1.46-1.1-2.79s.7-1.98.95-2.25c.24-.27.53-.34.71-.34.18 0 .36 0 .51.01.16.01.38-.06.6.46.24.56.79 1.94.86 2.08.07.14.12.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.37.27.14.43.12.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.6-.14.24.09 1.56.74 1.83.87.27.14.45.2.51.3.07.11.07.62-.17 1.3z" />
            </svg>
            Chat on WhatsApp
          </a>
        </div>
      )}

      <a href="https://webinar.ostaran.com" className="mt-8 text-sm font-medium text-primary-600 hover:underline">
        Explore more at oStaran
      </a>
    </div>
  );
}
