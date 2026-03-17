# withArijit Platform — Design Document
**Date:** 2026-03-17
**Status:** Approved
**Replaces:** bolt.new aiwitharijit.com deployment
**Domains:** www.withArijit.com + www.ostaran.com (same deployment)

---

## Overview

A single enterprise-grade edu-platform replacing the existing bolt.new `aiwitharijit.com`. One Next.js 15 codebase deployed to Vercel, serving both `www.withArijit.com` and `www.ostaran.com`. Shares the existing Supabase database (`enszifyeqnwcnxaqrmrq`) with all other oStaran apps.

### Ecosystem Map

| App | Domain | Repo | Deployment |
|-----|--------|------|------------|
| **Main Platform** | `withArijit.com` + `ostaran.com` | `ArijitXDA/withArijit-platform` (new) | Vercel |
| Partner Portal | `partner.oStaran.com` | `ArijitXDA/withArijit_Mar26` | Vercel/Netlify |
| Webinar Registration | `webinar.oStaran.com` | `ArijitXDA/webinar-awa` | Vercel/Netlify |
| ~~Student Dashboard~~ | ~~aiwitharijit.com~~ | ~~bolt.new~~ | Retired |

All apps share: `https://enszifyeqnwcnxaqrmrq.supabase.co`

---

## 1. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Supabase (PostgreSQL, 52 tables) |
| Auth (students) | Supabase Auth — Email+OTP, Google, GitHub, LinkedIn SSO |
| Auth (admin) | Custom — Email + bcrypt passcode, httpOnly JWT cookie |
| Payments | Razorpay (server-side order creation + webhook) |
| Email | Hostinger SMTP (primary) + Brevo (fallback quota) |
| WhatsApp | AiSensy API |
| Email Templates | react-email (rendered server-side) |
| Server State | TanStack Query (React Query v5) |
| Mutations | Next.js Server Actions |
| Edge Functions | Supabase Edge Functions (Deno) — selective use |
| AI (visitor) | OpenAI GPT-4o mini |
| AI (student) | Anthropic Claude Sonnet 4.6 |
| Deployment | Vercel (two custom domains) |
| PDF Generation | @react-pdf/renderer (GST invoices, certificates) |
| Validation | Zod (all API routes + Server Actions) |

---

## 2. Architecture

### Approach
**Monolithic Next.js App** as core + **Supabase Edge Functions** for selective async workloads.

- Next.js App Router handles: all pages (SSR/SSG/CSR), API routes, Server Actions, middleware
- Supabase Edge Functions handle: Razorpay webhooks, email queue dispatcher (cron), WhatsApp dispatcher (cron)
- Supabase RLS enforced at DB level as last line of defence

### Data Access Pattern
- **Server Components** (marketing) → Supabase server client → direct DB query (SSR, no API hop)
- **Client Components** (dashboard, admin) → TanStack Query → `/api/` routes → service-role client
- **Mutations** → Next.js Server Actions (profile updates, batch selection, admin actions)

---

## 3. Repository Structure

```
withArijit-platform/
├── app/
│   ├── (public)/                 # Marketing pages — SSG/SSR
│   │   ├── page.tsx              # Homepage
│   │   ├── courses/
│   │   │   ├── page.tsx          # Course catalog
│   │   │   └── [slug]/page.tsx   # Individual course (DB-driven)
│   │   ├── ai-certification/
│   │   │   ├── page.tsx          # Master AI Cert landing
│   │   │   └── [segment]/page.tsx # Segment pages (sales, cxo, marketing, hr, pharma, startups)
│   │   ├── masterclass/
│   │   ├── free-webinar/         # CTA → webinar.oStaran.com
│   │   ├── library/              # Public preview (3 items)
│   │   ├── ai-spots/
│   │   ├── ai-readiness-quiz/
│   │   ├── build-ai-projects/
│   │   ├── find-ai-job/
│   │   ├── become-a-partner/     # CTA → partner.oStaran.com
│   │   ├── about/
│   │   ├── contact/
│   │   ├── blog/                 # Stub for future
│   │   └── [privacy|terms|refund-policy|shipping-policy]/
│   ├── (student)/                # Dashboard — CSR, Supabase Auth protected
│   │   ├── signin/
│   │   ├── signup/
│   │   └── dashboard/
│   │       ├── page.tsx          # Home — upcoming class, stats
│   │       ├── courses/          # My courses + enroll more
│   │       ├── sessions/         # Schedule + recordings
│   │       ├── library/          # Full library access
│   │       ├── certificates/     # Download + LinkedIn share
│   │       ├── payments/         # History + GST invoices + installments
│   │       ├── profile/          # Edit profile + batch + SSO
│   │       ├── career/           # Resume + jobs + consultant + trainer
│   │       ├── referrals/        # Referral code + commission + payout
│   │       └── become-partner/   # CTA → partner.oStaran.com
│   ├── (admin)/                  # Admin panel — custom JWT protected
│   │   ├── admin/
│   │   │   ├── page.tsx          # Admin login
│   │   │   ├── dashboard/
│   │   │   ├── students/
│   │   │   ├── sessions/
│   │   │   ├── session-links/
│   │   │   ├── certificates/
│   │   │   ├── library/
│   │   │   ├── courses/
│   │   │   ├── payments/
│   │   │   ├── email-queue/
│   │   │   ├── ai-spots/
│   │   │   ├── crm/              # Super Admin only
│   │   │   ├── partners/         # Super Admin only
│   │   │   └── audit-log/        # Super Admin only
│   └── api/
│       ├── auth/
│       │   ├── admin-login/
│       │   └── admin-logout/
│       ├── payments/
│       │   ├── create-order/
│       │   ├── verify-payment/
│       │   └── retry-payment/
│       ├── enrollment/
│       │   ├── self/
│       │   ├── gift/
│       │   └── bulk/
│       ├── certificates/
│       │   ├── generate/
│       │   └── download/[id]/
│       ├── invoices/
│       │   └── download/[id]/
│       ├── contact/submit/
│       ├── quiz/submit/
│       └── agent/
│           ├── visitor/          # GPT-4o mini
│           └── student/          # Claude Sonnet 4.6 + action tools
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── marketing/                # Homepage sections, course cards, CTAs
│   ├── dashboard/                # Student dashboard widgets
│   ├── admin/                    # Admin panel components
│   └── shared/                   # PaymentModal, Navbar, Footer, AgentWidget
├── emails/
│   └── templates/                # react-email templates (all sequences)
├── lib/
│   ├── supabase/
│   │   ├── server.ts             # Server-side client
│   │   ├── client.ts             # Browser client
│   │   └── middleware.ts         # Middleware client
│   ├── razorpay.ts
│   ├── email.ts                  # SMTP send + Brevo fallback
│   ├── pdf.ts                    # Invoice + certificate PDF generation
│   └── validations/              # Zod schemas per domain
├── supabase/
│   └── functions/
│       ├── razorpay-webhook/     # Payment events from Razorpay
│       ├── email-dispatcher/     # Cron: process email_queue every 5min
│       └── whatsapp-dispatcher/  # Cron: process whatsapp queue every 5min
├── middleware.ts                 # Route protection
└── .env.local
```

---

## 4. Site Structure

### Zone 1 — Public / Marketing (SSG/SSR, Google-indexed)

| Route | Description |
|-------|-------------|
| `/` | Full edu-platform homepage — hero, free webinar CTA, courses, testimonials, AI spots, stats |
| `/courses` | Dynamic course catalog from `awa_courses` |
| `/courses/[slug]` | DB-driven individual course page |
| `/ai-certification` | Master AI Certification landing |
| `/ai-certification/[segment]` | Segment pages: sales, cxo, marketing, hr, pharma, startups |
| `/masterclass` | Masterclass landing |
| `/free-webinar` | Free 90-min webinar CTA → `webinar.oStaran.com` |
| `/library` | Preview (3 items) → full access post-login |
| `/ai-spots` | AI Spot locations |
| `/ai-readiness-quiz` | Quiz (lead gen → `quiz_responses`) |
| `/build-ai-projects` | Projects showcase |
| `/find-ai-job` | AI Job board |
| `/become-a-partner` | Partner program → `partner.oStaran.com` |
| `/about` | About Arijit + oStaran |
| `/contact` | Contact form |
| `/blog` | Blog (stub) |
| `/privacy`, `/terms`, `/refund-policy`, `/shipping-policy` | Legal |

### Zone 2 — Student Portal (Supabase Auth protected)

| Route | Description |
|-------|-------------|
| `/signin` | Email+OTP, Google, GitHub, LinkedIn SSO |
| `/signup` | New student registration |
| `/dashboard` | Home: upcoming class, quick stats, announcements |
| `/dashboard/courses` | My courses + enroll more + gift + bulk |
| `/dashboard/sessions` | Schedule, join links, recordings, iCal export |
| `/dashboard/library` | Full library with filters and bookmarks |
| `/dashboard/certificates` | Download PDF/PNG + LinkedIn share |
| `/dashboard/payments` | History, GST invoices, installment tracker, retry |
| `/dashboard/profile` | Edit profile, batch, timezone, SSO connections |
| `/dashboard/career` | Resume upload, job search, consultant profile, trainer application |
| `/dashboard/referrals` | Referral code, commission stats, payout request |
| `/dashboard/become-partner` | CTA → `partner.oStaran.com` with pre-filled UTM |

**Mini-Dashboard state:** Payment complete but onboarding incomplete. Shows only profile completion prompt + payment confirmation. Unlocks fully after batch selection + profile complete.

### Zone 3 — Admin Panel (Custom JWT protected)

| Route | Access | Description |
|-------|--------|-------------|
| `/admin` | All admins | Login page |
| `/admin/dashboard` | All admins | Overview: registrations, payments, enrollments, email health |
| `/admin/students` | All admins | Student management, manual enrollment, CSV export |
| `/admin/sessions` | All admins | Session + batch management, bulk CSV upload |
| `/admin/session-links` | All admins | Teams/Meet link management per batch |
| `/admin/certificates` | All admins | Issue, bulk-issue, revoke certificates |
| `/admin/library` | All admins | Add/edit/remove library resources |
| `/admin/courses` | All admins | Manage `awa_courses`, pricing, commission structure |
| `/admin/payments` | All admins | Payment records, failure retry, manual recording, discount codes |
| `/admin/email-queue` | All admins | Queue monitor, manual trigger, retry failed, preview |
| `/admin/ai-spots` | All admins | AI Spot management |
| `/admin/crm` | Super Admin | CRM leads, employee assignment, AI mentor sessions, campaigns |
| `/admin/partners` | Super Admin | Partner hierarchy, commissions, payout approvals, impersonation |
| `/admin/audit-log` | Super Admin | Full audit trail — append-only view |

---

## 5. Authentication & Roles

### Student Auth (Supabase Auth)
- Methods: Email+OTP, Google, GitHub, LinkedIn SSO
- Session: Supabase cookie, validated via Next.js middleware
- Onboarding: Post-payment → profile → batch → full dashboard
- Forgot password: Email OTP reset

### Admin Auth (Custom)
- Method: Email + bcrypt passcode
- Session: httpOnly JWT cookie, SameSite=Strict, 8hr expiry, signed with `ADMIN_JWT_SECRET`
- `must_change_password` flag on first login

### Role Hierarchy
```
Super Admin  → full access including CRM, partners, audit log, impersonation
Admin        → students, sessions, certificates, library, courses, payments, email queue, AI spots
Student (full)    → entire /dashboard
Student (mini)    → mini-dashboard only (payment confirmed, onboarding incomplete)
```

### Middleware Protection
- `/dashboard/*` → valid Supabase session → else `/signin`
- `/admin/*` → valid admin JWT → else `/admin`
- Public routes → no check

---

## 6. Payment & Enrollment Flows

### Flow 1 — Self Enrollment
```
Course CTA → Payment Modal (pre-filled from UTM)
  → Name, Email, Mobile, Course, Discount code, Payment frequency
  → Razorpay checkout (server-side order via /api/payments/create-order)
  → Success → Razorpay webhook → Edge Function
      → Insert payments + student_master_table
      → Generate GST invoice PDF → Supabase Storage
      → Queue confirmation email
      → Redirect → /payment-success → Onboarding → Dashboard
  → Failure → Log in payments → /payment-cancelled → retry email
```

### Flow 2 — Gift Enrollment
```
Gift CTA → Payment Modal (gift mode)
  → Payer details → Course → Razorpay payment
  → Success → Edge Function records payment
  → Prompt payer: "Enter friend's email"
  → Send friend: "{Name} enrolled you — sign up to access dashboard"
  → Friend signs up → batch selection → Dashboard
```

### Flow 3 — Bulk Group Enrollment
```
Bulk CTA → Bulk Modal
  → Course, member count, same batch?
  → Upload CSV (name, email, mobile) or manual entry
  → Validate: email count == member count
  → Razorpay (total = seat price × members)
  → Edge Function: create payment + student records per member
  → Send individual sign-up emails to each member
  → All assigned to selected batch
```

### Payment Frequencies
- **Full:** Single payment at enrollment
- **50-50:** 50% now, 50% on due date (tracked in `student_master_table`)
- **Monthly installments:** 1st–4th payment fields in `student_master_table`

### Razorpay Webhook (Edge Function)
- Validates `razorpay-signature` (HMAC-SHA256)
- Idempotent: checks `razorpay_payment_id` before inserting
- Handles: `payment.captured`, `payment.failed`, `order.paid`

---

## 7. Email Automation & Communications

### Infrastructure
- Primary: Hostinger SMTP (`ai@withArijit.com`)
- Fallback: Brevo (on Hostinger daily quota exhaustion)
- Queue: `email_queue` table → processed by Edge Function cron (every 5min)
- Log: `awa_email_log` (immutable)
- Templates: react-email components in `/emails/templates/`

### Email Sequences

| Sequence | Trigger | Emails |
|----------|---------|--------|
| Post-webinar-registration | `qr_landing_registrations` insert | Confirmation + D-3, D-2, D-1, D-0 (10am, T-2hr, T-15min, Live) |
| Post-webinar feedback | Webinar end time | T+60min, T+120min, D+1, D+2, D+3, D+7 |
| Post-webinar sales | 30min after webinar | Profile-based pitch (5 segments), D+1–D+3 |
| Nurture Bucket 1 | No enrollment in 3 days | Softer engagement sequence |
| Nurture Bucket 2 | No enrollment in 21 days | Long-term nurture |
| Post-enrollment | Payment captured | Confirmation + GST invoice + batch + dashboard link |
| Class reminder | Day before class (C-1) | Session reminder + prior recording |
| Class day | Class day (C-0) | Join link + session materials |
| Payment failure | Payment failed event | Retry link email |
| Installment due | D-7, D-3, D-1 before due | Amount + payment link |

### WhatsApp (AiSensy)
- Parallel channel for all webinar sequences
- Logged in `whatsapp_log`
- Templates managed in `crm_whatsapp_templates`

---

## 8. AI Agent

### Visitor Agent
- **Location:** Floating chat widget on all public pages
- **Model:** OpenAI GPT-4o mini
- **Capabilities:** Course/pricing Q&A, profile-based course guidance, FAQ, webinar CTA nudging
- **Context:** `awa_courses` (live), `qr_landing_webinar_links` (next webinar), `agent_knowledge_base`
- **API route:** `/api/agent/visitor`

### Student Agent
- **Location:** Persistent chat panel in `/dashboard`
- **Model:** Anthropic Claude Sonnet 4.6
- **Q&A capabilities:** Course info, session/batch queries, library guidance, career advice
- **Action capabilities (agentic tools):**
  - Fetch upcoming session + send join link via email/WhatsApp
  - Retrieve latest recording link
  - Check next installment due date + amount
  - Trigger certificate download (signed URL)
  - Show payment history summary
  - Update contact preferences
  - Raise support request
- **API route:** `/api/agent/student` (streaming via Server-Sent Events)
- **Context:** Student profile, enrolled courses, sessions, payments, certificates
- **Persistence:** Conversation history stored in `student_agent_conversations` (new table)

### Architecture
```
Visitor Widget → /api/agent/visitor  → OpenAI GPT-4o mini + knowledge_base
Student Panel  → /api/agent/student  → Claude Sonnet 4.6 + student context + action tools
                                       Agent calls /api/agent/[action] routes (never direct DB)
```

Both agents:
- Streaming responses (SSE, real-time typing)
- Pricing/dates always fetched live from DB (no hallucination)
- Visitor: session-only memory | Student: persisted per-user

---

## 9. Data & API Layer

### API Routes
```
/api/auth/admin-login          POST — validate passcode, issue JWT cookie
/api/auth/admin-logout         POST — clear JWT cookie
/api/payments/create-order     POST — Razorpay order creation
/api/payments/verify-payment   POST — signature verification post-checkout
/api/payments/retry-payment    POST — regenerate order for failed/installment
/api/enrollment/self           POST — enroll student after payment verified
/api/enrollment/gift           POST — gift enrollment + friend email
/api/enrollment/bulk           POST — parse CSV, create student records
/api/certificates/generate     POST — admin: PDF generation + Storage upload
/api/certificates/download/[id] GET — student: signed Storage URL
/api/invoices/download/[id]    GET — student: signed Storage URL for GST invoice
/api/contact/submit            POST — save to contact_submissions + notify email
/api/quiz/submit               POST — save to quiz_responses
/api/agent/visitor             POST — streaming visitor chat
/api/agent/student             POST — streaming student chat + action execution
```

### Supabase Edge Functions
```
/functions/razorpay-webhook    — payment.captured / payment.failed events
/functions/email-dispatcher    — cron every 5min, processes email_queue
/functions/whatsapp-dispatcher — cron every 5min, processes whatsapp queue
```

### Security
1. **Middleware** — route protection before page renders
2. **API auth checks** — every route validates session/JWT
3. **Supabase RLS** — row-level policies (students see own data only)
4. **Razorpay HMAC-SHA256** — webhook signature validation
5. **Admin JWT** — httpOnly, SameSite=Strict, 8hr expiry
6. **Zod** — input validation on all API routes and Server Actions
7. **Rate limiting** — Vercel Edge middleware on `/api/payments/` and `/api/auth/`

---

## 10. Deployment & Infrastructure

### Repository
- **Repo name:** `ArijitXDA/withArijit-platform`
- **Branch strategy:** `main` (production) → `dev` (integration) → `feature/*`

### Vercel
- One project, two custom domains: `www.withArijit.com` + `www.ostaran.com`
- Auto-deploy on push to `main`
- Preview deployments on every PR

### Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
SMTP_USER
SMTP_PASS
SMTP_FROM_NAME
BREVO_SMTP_USER
BREVO_SMTP_KEY
BREVO_FROM_EMAIL
ADMIN_JWT_SECRET
AISENSY_API_KEY
AISENSY_USERNAME
OPENAI_API_KEY
ANTHROPIC_API_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_RAZORPAY_KEY_ID
```

### Performance Targets
- Marketing pages: Lighthouse ≥ 95 (SSG + next/image)
- Dashboard first load: < 2s (code splitting + TanStack Query cache)
- API routes: < 300ms p95

---

## 11. New DB Table Required

One addition to the existing 52-table schema:

```sql
create table public.student_agent_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  messages jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Next.js 15 App Router | SEO for marketing pages, SSR, built-in API routes, Server Actions |
| Monolithic + selective Edge Functions | Right complexity for current scale; Edge Functions only for async webhooks/cron |
| shadcn/ui | Accessible, unstyled primitives — avoids one-off Tailwind component sprawl |
| TanStack Query | Caching, background refetch, optimistic updates for dashboard |
| react-email | Type-safe email templates rendered server-side, version-controlled |
| GPT-4o mini for visitors | Cost-efficient for high public traffic volume |
| Claude Sonnet 4.6 for students | Superior reasoning for agentic actions and personalised guidance |
| Two domains, one Vercel project | withArijit.com (personal brand) + ostaran.com (platform brand) — same experience |
