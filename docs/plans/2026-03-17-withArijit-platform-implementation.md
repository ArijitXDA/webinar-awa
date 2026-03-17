# withArijit Platform — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an enterprise-grade edu-platform (Next.js 15) deployed to withArijit.com + ostaran.com replacing bolt.new aiwitharijit.com.

**Architecture:** Monolithic Next.js 15 App Router app with three zones (public/marketing SSG, student dashboard CSR, admin panel). Supabase Edge Functions handle async workloads (Razorpay webhook, email/WhatsApp dispatchers). Two AI agents — GPT-4o mini for visitors, Claude Sonnet 4.6 for students.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui, Supabase, Razorpay, react-email, TanStack Query v5, Zod, @react-pdf/renderer, OpenAI SDK, Anthropic SDK.

**Design doc:** `docs/plans/2026-03-17-withArijit-platform-design.md`

---

## Phase 1: Project Foundation

### Task 1: Initialise Next.js 15 project

**Files:**
- Create: `withArijit-platform/` (new repo root)

**Step 1: Scaffold project**
```bash
npx create-next-app@latest withArijit-platform \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
cd withArijit-platform
```

**Step 2: Verify dev server starts**
```bash
npm run dev
```
Expected: Server running at http://localhost:3000

**Step 3: Initialise git and push**
```bash
git init
git add .
git commit -m "feat: initialise Next.js 15 app with TypeScript and Tailwind"
# Create repo ArijitXDA/withArijit-platform on GitHub, then:
git remote add origin https://github.com/ArijitXDA/withArijit-platform.git
git branch -M main
git push -u origin main
```

---

### Task 2: Install core dependencies

**Step 1: Install all dependencies**
```bash
npm install \
  @supabase/supabase-js \
  @supabase/ssr \
  @tanstack/react-query \
  @tanstack/react-query-devtools \
  zod \
  razorpay \
  @react-pdf/renderer \
  react-email \
  @react-email/components \
  nodemailer \
  @types/nodemailer \
  lucide-react \
  clsx \
  tailwind-merge \
  class-variance-authority \
  date-fns \
  openai \
  @anthropic-ai/sdk \
  jose \
  bcryptjs \
  @types/bcryptjs \
  next-themes
```

**Step 2: Commit**
```bash
git add package.json package-lock.json
git commit -m "feat: install core dependencies"
```

---

### Task 3: Install and configure shadcn/ui

**Step 1: Init shadcn**
```bash
npx shadcn@latest init
```
Choose: Default style, Slate base colour, CSS variables yes.

**Step 2: Add core components used throughout**
```bash
npx shadcn@latest add button card input label badge tabs dialog sheet dropdown-menu avatar toast sonner table form select textarea separator skeleton progress
```

**Step 3: Commit**
```bash
git add -A
git commit -m "feat: add shadcn/ui with core components"
```

---

### Task 4: Configure environment variables

**Files:**
- Create: `.env.local`
- Create: `.env.example`

**Step 1: Create `.env.local`**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://enszifyeqnwcnxaqrmrq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# Razorpay
RAZORPAY_KEY_ID=<key_id>
RAZORPAY_KEY_SECRET=<key_secret>
RAZORPAY_WEBHOOK_SECRET=<webhook_secret>
NEXT_PUBLIC_RAZORPAY_KEY_ID=<key_id>

# SMTP Hostinger
SMTP_USER=ai@withArijit.com
SMTP_PASS=<password>
SMTP_FROM_NAME=AIwithArijit

# Brevo fallback
BREVO_SMTP_USER=ari.bombay@gmail.com
BREVO_SMTP_KEY=<key>
BREVO_FROM_EMAIL=ai@withArijit.com

# Admin auth
ADMIN_JWT_SECRET=<strong_random_string>

# AiSensy
AISENSY_API_KEY=<key>
AISENSY_USERNAME=<username>

# AI
OPENAI_API_KEY=<key>
ANTHROPIC_API_KEY=<key>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 2: Create `.env.example`** (same keys, empty values — safe to commit)

**Step 3: Add `.env.local` to `.gitignore`**
```bash
echo ".env.local" >> .gitignore
```

**Step 4: Commit**
```bash
git add .env.example .gitignore
git commit -m "chore: add env config and example"
```

---

### Task 5: Set up Supabase clients

**Files:**
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/lib/supabase/service.ts`

**Step 1: Create `src/lib/supabase/server.ts`**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

**Step 2: Create `src/lib/supabase/client.ts`**
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 3: Create `src/lib/supabase/service.ts`** (admin/server-only)
```typescript
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

**Step 4: Create `src/lib/supabase/middleware.ts`**
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return { supabaseResponse, user }
}
```

**Step 5: Commit**
```bash
git add src/lib/supabase/
git commit -m "feat: add Supabase client utilities (server, client, service, middleware)"
```

---

### Task 6: Generate Supabase TypeScript types

**Step 1: Install Supabase CLI and generate types**
```bash
npx supabase gen types typescript \
  --project-id enszifyeqnwcnxaqrmrq \
  --schema public > src/lib/supabase/types.ts
```

**Step 2: Commit**
```bash
git add src/lib/supabase/types.ts
git commit -m "feat: add generated Supabase DB types"
```

---

### Task 7: Create route protection middleware

**Files:**
- Create: `src/middleware.ts`

**Step 1: Write middleware**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { jwtVerify } from 'jose'

const STUDENT_PROTECTED = /^\/dashboard/
const ADMIN_PROTECTED = /^\/admin\/(dashboard|students|sessions|session-links|certificates|library|courses|payments|email-queue|ai-spots|crm|partners|audit-log)/

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin route protection
  if (ADMIN_PROTECTED.test(pathname)) {
    const token = request.cookies.get('admin_token')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!))
    } catch {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return NextResponse.next()
  }

  // Student route protection
  if (STUDENT_PROTECTED.test(pathname)) {
    const { supabaseResponse, user } = await updateSession(request)
    if (!user) {
      return NextResponse.redirect(new URL('/signin', request.url))
    }
    return supabaseResponse
  }

  return updateSession(request).then(r => r.supabaseResponse)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

**Step 2: Commit**
```bash
git add src/middleware.ts
git commit -m "feat: add route protection middleware for student and admin zones"
```

---

### Task 8: Add DB migration for student agent conversations

**Files:**
- Create: `supabase/migrations/20260317000000_student_agent_conversations.sql`

**Step 1: Write migration**
```sql
create table public.student_agent_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.student_agent_conversations enable row level security;

create policy "Students can manage own conversations"
  on public.student_agent_conversations
  for all using (
    auth.uid()::text = (
      select email from public.users where id = user_id limit 1
    )
  );
```

**Step 2: Apply migration**
```bash
npx supabase db push
```

**Step 3: Commit**
```bash
git add supabase/migrations/
git commit -m "feat: add student_agent_conversations table with RLS"
```

---

### Task 9: Create shared utility functions

**Files:**
- Create: `src/lib/utils.ts`
- Create: `src/lib/validations/index.ts`

**Step 1: Create `src/lib/utils.ts`**
```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount)
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(date))
}
```

**Step 2: Create `src/lib/validations/index.ts`** (Zod schemas)
```typescript
import { z } from 'zod'

export const contactFormSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(10).max(15),
  purpose: z.string().min(1),
  additional_details: z.string().optional(),
})

export const adminLoginSchema = z.object({
  email: z.string().email(),
  passcode: z.string().min(6),
})

export const paymentOrderSchema = z.object({
  course_id: z.string().uuid(),
  payment_frequency: z.enum(['full', 'half', 'monthly']),
  discount_code: z.string().optional(),
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(10),
})

export const bulkEnrollmentSchema = z.object({
  course_id: z.string().uuid(),
  batch_id: z.string(),
  members: z.array(z.object({
    name: z.string().min(2),
    email: z.string().email(),
    mobile: z.string().min(10),
  })).min(2),
})
```

**Step 3: Commit**
```bash
git add src/lib/
git commit -m "feat: add utility functions and Zod validation schemas"
```

---

## Phase 2: Layouts & Navigation

### Task 10: Public layout — Navbar

**Files:**
- Create: `src/components/shared/Navbar.tsx`
- Create: `src/app/(public)/layout.tsx`

**Step 1: Create `src/components/shared/Navbar.tsx`**
```typescript
'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const NAV_LINKS = [
  { href: '/courses', label: 'Courses' },
  { href: '/ai-certification', label: 'AI Certification' },
  { href: '/free-webinar', label: 'Free Webinar' },
  { href: '/library', label: 'Library' },
  { href: '/ai-spots', label: 'AI Spots' },
  { href: '/about', label: 'About' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/" className="font-bold text-xl tracking-tight">
          withArijit
        </Link>
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" asChild><Link href="/signin">Sign In</Link></Button>
          <Button asChild><Link href="/free-webinar">Join Free</Link></Button>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-gray-100 px-4 py-4 flex flex-col gap-4 bg-white">
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href} className="text-sm" onClick={() => setOpen(false)}>{l.label}</Link>
          ))}
          <Button asChild><Link href="/free-webinar">Join Free</Link></Button>
        </div>
      )}
    </nav>
  )
}
```

**Step 2: Create `src/components/shared/Footer.tsx`**
```typescript
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <p className="text-white font-semibold mb-3">withArijit</p>
          <p className="text-sm">Enterprise AI Education Platform</p>
        </div>
        <div>
          <p className="text-white font-semibold mb-3">Learn</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/courses" className="hover:text-white">Courses</Link>
            <Link href="/ai-certification" className="hover:text-white">AI Certification</Link>
            <Link href="/library" className="hover:text-white">Library</Link>
          </div>
        </div>
        <div>
          <p className="text-white font-semibold mb-3">Platform</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/ai-spots" className="hover:text-white">AI Spots</Link>
            <Link href="/find-ai-job" className="hover:text-white">Find AI Jobs</Link>
            <Link href="/become-a-partner" className="hover:text-white">Become a Partner</Link>
          </div>
        </div>
        <div>
          <p className="text-white font-semibold mb-3">Legal</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/refund-policy" className="hover:text-white">Refund Policy</Link>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-gray-800 text-xs text-center">
        © {new Date().getFullYear()} oStaran Edu Pvt Ltd. All rights reserved.
      </div>
    </footer>
  )
}
```

**Step 3: Create `src/app/(public)/layout.tsx`**
```typescript
import { Navbar } from '@/components/shared/Navbar'
import { Footer } from '@/components/shared/Footer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  )
}
```

**Step 4: Commit**
```bash
git add src/components/shared/ src/app/(public)/layout.tsx
git commit -m "feat: add public layout with Navbar and Footer"
```

---

### Task 11: Dashboard layout — sidebar + top nav

**Files:**
- Create: `src/components/dashboard/DashboardSidebar.tsx`
- Create: `src/components/dashboard/DashboardTopNav.tsx`
- Create: `src/app/(student)/layout.tsx`

**Step 1: Create `src/components/dashboard/DashboardSidebar.tsx`**
```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, BookOpen, Calendar, Library, Award,
  CreditCard, User, Briefcase, Gift, Users
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/courses', label: 'My Courses', icon: BookOpen },
  { href: '/dashboard/sessions', label: 'Sessions', icon: Calendar },
  { href: '/dashboard/library', label: 'Library', icon: Library },
  { href: '/dashboard/certificates', label: 'Certificates', icon: Award },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/career', label: 'Career', icon: Briefcase },
  { href: '/dashboard/referrals', label: 'Referrals', icon: Gift },
  { href: '/dashboard/become-partner', label: 'Become Partner', icon: Users },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-gray-950 text-gray-300 border-r border-gray-800 pt-6">
      <div className="px-4 mb-6">
        <Link href="/" className="font-bold text-white text-lg">withArijit</Link>
      </div>
      <nav className="flex flex-col gap-1 px-2">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === href
                ? 'bg-white/10 text-white'
                : 'hover:bg-white/5 hover:text-white'
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

**Step 2: Create `src/app/(student)/layout.tsx`**
```typescript
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
```

**Step 3: Commit**
```bash
git add src/components/dashboard/ src/app/(student)/
git commit -m "feat: add student dashboard layout with sidebar"
```

---

### Task 12: Admin layout — sidebar

**Files:**
- Create: `src/components/admin/AdminSidebar.tsx`
- Create: `src/app/(admin)/layout.tsx`

**Step 1: Create `src/components/admin/AdminSidebar.tsx`**
```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Calendar, Award, Library,
  BookOpen, CreditCard, Mail, MapPin, UserCheck,
  Building, ScrollText
} from 'lucide-react'

const BASE_NAV = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/sessions', label: 'Sessions', icon: Calendar },
  { href: '/admin/session-links', label: 'Session Links', icon: Calendar },
  { href: '/admin/certificates', label: 'Certificates', icon: Award },
  { href: '/admin/library', label: 'Library', icon: Library },
  { href: '/admin/courses', label: 'Courses', icon: BookOpen },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/email-queue', label: 'Email Queue', icon: Mail },
  { href: '/admin/ai-spots', label: 'AI Spots', icon: MapPin },
]

const SUPER_ADMIN_NAV = [
  { href: '/admin/crm', label: 'CRM', icon: UserCheck },
  { href: '/admin/partners', label: 'Partners', icon: Building },
  { href: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
]

export function AdminSidebar({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const pathname = usePathname()
  const allNav = isSuperAdmin ? [...BASE_NAV, ...SUPER_ADMIN_NAV] : BASE_NAV
  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-gray-900 text-gray-300 border-r border-gray-700 pt-6">
      <div className="px-4 mb-6">
        <Link href="/admin/dashboard" className="font-bold text-white">Admin Panel</Link>
      </div>
      <nav className="flex flex-col gap-1 px-2">
        {allNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === href ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

**Step 2: Create `src/app/(admin)/layout.tsx`**
```typescript
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
```

**Step 3: Commit**
```bash
git add src/components/admin/ src/app/(admin)/
git commit -m "feat: add admin layout with role-aware sidebar"
```

---

## Phase 3: Authentication

### Task 13: Admin auth API routes

**Files:**
- Create: `src/app/api/auth/admin-login/route.ts`
- Create: `src/app/api/auth/admin-logout/route.ts`

**Step 1: Create admin login route**
```typescript
// src/app/api/auth/admin-login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { adminLoginSchema } from '@/lib/validations'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = adminLoginSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { email, passcode } = parsed.data
  const supabase = createServiceClient()

  const { data: admin } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single()

  if (!admin) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

  const valid = await bcrypt.compare(passcode, admin.passcode_hash)
  if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

  const token = await new SignJWT({
    sub: admin.id,
    email: admin.email,
    role: admin.role,
    tier: admin.tier,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!))

  const response = NextResponse.json({
    success: true,
    mustChangePassword: admin.must_change_password,
    tier: admin.tier,
  })
  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  return response
}
```

**Step 2: Create admin logout route**
```typescript
// src/app/api/auth/admin-logout/route.ts
import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('admin_token')
  return response
}
```

**Step 3: Commit**
```bash
git add src/app/api/auth/
git commit -m "feat: add admin login/logout API routes with JWT cookie"
```

---

### Task 14: Admin login page

**Files:**
- Create: `src/app/(admin)/admin/page.tsx`

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, passcode }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    router.push('/admin/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} type="email" required /></div>
            <div><Label>Passcode</Label><Input value={passcode} onChange={e => setPasscode(e.target.value)} type="password" required /></div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

```bash
git add src/app/(admin)/admin/page.tsx
git commit -m "feat: add admin login page"
```

---

### Task 15: Student sign-in and sign-up pages

**Files:**
- Create: `src/app/(student)/signin/page.tsx`
- Create: `src/app/(student)/signup/page.tsx`

**Step 1: Sign-in page (OTP + OAuth)**
```typescript
// src/app/(student)/signin/page.tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function SignInPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendOtp() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
    if (error) { setError(error.message); setLoading(false); return }
    setStep('otp')
    setLoading(false)
  }

  async function verifyOtp() {
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/dashboard` } })
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-8">
        <h1 className="text-2xl font-bold">Sign In</h1>
        {step === 'email' ? (
          <div className="space-y-4">
            <div><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} type="email" /></div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button className="w-full" onClick={sendOtp} disabled={loading}>Send OTP</Button>
            <Button variant="outline" className="w-full" onClick={signInWithGoogle}>Continue with Google</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">OTP sent to {email}</p>
            <div><Label>Enter OTP</Label><Input value={otp} onChange={e => setOtp(e.target.value)} /></div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button className="w-full" onClick={verifyOtp} disabled={loading}>Verify & Sign In</Button>
          </div>
        )}
        <p className="text-sm text-center">New student? <Link href="/signup" className="underline">Sign up</Link></p>
      </div>
    </div>
  )
}
```

**Step 2: Sign-up page (OTP for new users)**
```typescript
// src/app/(student)/signup/page.tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SignUpPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendOtp() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    if (error) { setError(error.message); setLoading(false); return }
    setStep('otp')
    setLoading(false)
  }

  async function verifyOtp() {
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard/profile?onboarding=true')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-8">
        <h1 className="text-2xl font-bold">Create Account</h1>
        {step === 'email' ? (
          <div className="space-y-4">
            <div><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} type="email" /></div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button className="w-full" onClick={sendOtp} disabled={loading}>Send OTP</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">OTP sent to {email}</p>
            <div><Label>Enter OTP</Label><Input value={otp} onChange={e => setOtp(e.target.value)} /></div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button className="w-full" onClick={verifyOtp} disabled={loading}>Verify & Continue</Button>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 3: Commit**
```bash
git add src/app/(student)/signin/ src/app/(student)/signup/
git commit -m "feat: add student sign-in and sign-up pages with OTP + Google OAuth"
```

---

## Phase 4: Public / Marketing Pages

### Task 16: Homepage

**Files:**
- Create: `src/app/(public)/page.tsx`
- Create: `src/components/marketing/HeroSection.tsx`
- Create: `src/components/marketing/StatsBar.tsx`
- Create: `src/components/marketing/CoursesSection.tsx`
- Create: `src/components/marketing/TestimonialsSection.tsx`
- Create: `src/components/marketing/WebinarCTASection.tsx`

**Step 1: Create Hero**
```typescript
// src/components/marketing/HeroSection.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white py-24 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <Badge className="mb-4 bg-indigo-600">India's #1 AI Education Platform</Badge>
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
          Master AI.<br />Build the Future.
        </h1>
        <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
          Enterprise-grade AI certification programs for professionals, students, and leaders.
          Join 10,000+ learners transforming their careers.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild className="bg-indigo-600 hover:bg-indigo-500">
            <Link href="/free-webinar">Join Free Webinar →</Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="border-white/20 text-white hover:bg-white/10">
            <Link href="/courses">Explore Courses</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
```

**Step 2: Compose homepage**
```typescript
// src/app/(public)/page.tsx
import { HeroSection } from '@/components/marketing/HeroSection'
import { StatsBar } from '@/components/marketing/StatsBar'
import { CoursesSection } from '@/components/marketing/CoursesSection'
import { WebinarCTASection } from '@/components/marketing/WebinarCTASection'
import { TestimonialsSection } from '@/components/marketing/TestimonialsSection'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 3600 // ISR: revalidate every hour

export default async function HomePage() {
  const supabase = await createClient()
  const { data: courses } = await supabase.from('awa_courses').select('*').eq('is_active', true).order('sort_order')
  return (
    <>
      <HeroSection />
      <StatsBar />
      <CoursesSection courses={courses ?? []} />
      <WebinarCTASection />
      <TestimonialsSection />
    </>
  )
}
```

**Step 3: Commit**
```bash
git add src/app/(public)/page.tsx src/components/marketing/
git commit -m "feat: add homepage with hero, stats, courses, webinar CTA sections"
```

---

### Task 17: Dynamic course pages

**Files:**
- Create: `src/app/(public)/courses/page.tsx`
- Create: `src/app/(public)/courses/[slug]/page.tsx`

**Step 1: Course catalog**
```typescript
// src/app/(public)/courses/page.tsx
import { createClient } from '@/lib/supabase/server'
import { CourseCard } from '@/components/marketing/CourseCard'
export const revalidate = 3600

export default async function CoursesPage() {
  const supabase = await createClient()
  const { data: courses } = await supabase.from('awa_courses').select('*').eq('is_active', true).order('sort_order')
  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-12">Our Courses</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {(courses ?? []).map(course => <CourseCard key={course.id} course={course} />)}
      </div>
    </div>
  )
}
```

**Step 2: Individual course page (SSG)**
```typescript
// src/app/(public)/courses/[slug]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PaymentModalTrigger } from '@/components/shared/PaymentModalTrigger'

export async function generateStaticParams() {
  const supabase = await createClient()
  const { data } = await supabase.from('awa_courses').select('slug')
  return (data ?? []).map(c => ({ slug: c.slug }))
}

export default async function CoursePage({ params }: { params: { slug: string } }) {
  const supabase = await createClient()
  const { data: course } = await supabase.from('awa_courses').select('*').eq('slug', params.slug).single()
  if (!course) notFound()
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">{course.name}</h1>
      <p className="text-xl text-gray-600 mb-8">{course.description}</p>
      <PaymentModalTrigger courseId={course.id} courseName={course.name} price={course.mrp} />
    </div>
  )
}
```

**Step 3: Commit**
```bash
git add src/app/(public)/courses/
git commit -m "feat: add dynamic course catalog and individual course pages (SSG)"
```

---

### Task 18: AI Certification pages

**Files:**
- Create: `src/app/(public)/ai-certification/page.tsx`
- Create: `src/app/(public)/ai-certification/[segment]/page.tsx`

**Step 1: Master AI Certification page** — static, hand-crafted landing page with full pitch, benefits, curriculum, testimonials, CTA.

**Step 2: Segment pages**
```typescript
// src/app/(public)/ai-certification/[segment]/page.tsx
import { notFound } from 'next/navigation'
import { PaymentModalTrigger } from '@/components/shared/PaymentModalTrigger'

const SEGMENTS: Record<string, { title: string; headline: string; hook: string }> = {
  sales: { title: 'AI for Sales Professionals', headline: 'Close More Deals with AI', hook: 'Automate prospecting, personalise outreach at scale, forecast pipeline with AI.' },
  cxo: { title: 'AI for CXOs & Leaders', headline: 'Lead AI Transformation', hook: 'Build AI strategy, evaluate vendors, lead org-wide AI adoption.' },
  marketing: { title: 'AI for Marketers', headline: 'Scale Content & Campaigns with AI', hook: 'Generate campaigns, analyse performance, personalise at scale.' },
  hr: { title: 'AI for HR & Projects', headline: 'Transform HR with AI', hook: 'Automate screening, build AI HR agents, run AI-powered projects.' },
  pharma: { title: 'AI for Pharma & FMCG', headline: 'AI in Life Sciences & Consumer Goods', hook: 'Regulatory compliance, demand forecasting, supply chain AI.' },
  startups: { title: 'AI for Startups & Entrepreneurs', headline: 'Build AI Products Fast', hook: 'Vibe code your MVP, automate ops, build AI-native businesses.' },
}

export function generateStaticParams() {
  return Object.keys(SEGMENTS).map(segment => ({ segment }))
}

export default function SegmentPage({ params }: { params: { segment: string } }) {
  const seg = SEGMENTS[params.segment]
  if (!seg) notFound()
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">{seg.headline}</h1>
      <p className="text-xl text-gray-600 mb-8">{seg.hook}</p>
      <PaymentModalTrigger />
    </div>
  )
}
```

**Step 3: Commit**
```bash
git add src/app/(public)/ai-certification/
git commit -m "feat: add AI Certification master and segment landing pages"
```

---

### Task 19: Remaining public pages (stub + implement)

Create these as server components with real content:

**Files to create:**
- `src/app/(public)/masterclass/page.tsx`
- `src/app/(public)/free-webinar/page.tsx` (redirects to webinar.oStaran.com)
- `src/app/(public)/library/page.tsx` (public preview, 3 items from DB)
- `src/app/(public)/ai-spots/page.tsx` (all spots from `aispot_master`)
- `src/app/(public)/ai-readiness-quiz/page.tsx` (interactive quiz)
- `src/app/(public)/build-ai-projects/page.tsx`
- `src/app/(public)/find-ai-job/page.tsx`
- `src/app/(public)/become-a-partner/page.tsx`
- `src/app/(public)/about/page.tsx`
- `src/app/(public)/contact/page.tsx`
- `src/app/(public)/privacy/page.tsx`
- `src/app/(public)/terms/page.tsx`
- `src/app/(public)/refund-policy/page.tsx`
- `src/app/(public)/shipping-policy/page.tsx`

**Key pattern for DB-backed pages:**
```typescript
// Example: ai-spots
import { createClient } from '@/lib/supabase/server'
export const revalidate = 3600

export default async function AISpots() {
  const supabase = await createClient()
  const { data: spots } = await supabase.from('aispot_master').select('*').eq('is_approved', true)
  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-12">AI Spots</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(spots ?? []).map(spot => <AISpotCard key={spot.id} spot={spot} />)}
      </div>
    </div>
  )
}
```

**Commit after all stubs are done:**
```bash
git add src/app/(public)/
git commit -m "feat: add all public marketing pages"
```

---

## Phase 5: Payment Infrastructure

### Task 20: Razorpay API routes

**Files:**
- Create: `src/lib/razorpay.ts`
- Create: `src/app/api/payments/create-order/route.ts`
- Create: `src/app/api/payments/verify-payment/route.ts`

**Step 1: Create `src/lib/razorpay.ts`**
```typescript
import Razorpay from 'razorpay'
import crypto from 'crypto'

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
```

**Step 2: Create order route**
```typescript
// src/app/api/payments/create-order/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { razorpay } from '@/lib/razorpay'
import { createServiceClient } from '@/lib/supabase/service'
import { paymentOrderSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = paymentOrderSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { course_id, payment_frequency, discount_code, name, email, mobile } = parsed.data
  const supabase = createServiceClient()

  // Fetch course pricing
  const { data: course } = await supabase.from('awa_courses').select('mrp, gst_percent, name').eq('id', course_id).single()
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  // Calculate amount with GST
  let amount = course.mrp * (1 + course.gst_percent / 100)
  if (payment_frequency === 'half') amount = amount / 2

  // Apply discount if provided
  if (discount_code) {
    const { data: discount } = await supabase.from('discount_codes').select('*').eq('code', discount_code).eq('is_active', true).single()
    if (discount) amount = amount * (1 - discount.discount_percent / 100)
  }

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100), // paise
    currency: 'INR',
    receipt: `order_${Date.now()}`,
    notes: { course_id, name, email, mobile, payment_frequency },
  })

  return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency })
}
```

**Step 3: Verify payment route**
```typescript
// src/app/api/payments/verify-payment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyPaymentSignature } from '@/lib/razorpay'

export async function POST(request: NextRequest) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json()
  const valid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
  if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  return NextResponse.json({ success: true })
}
```

**Step 4: Commit**
```bash
git add src/lib/razorpay.ts src/app/api/payments/
git commit -m "feat: add Razorpay order creation and payment verification API routes"
```

---

### Task 21: Payment Modal component

**Files:**
- Create: `src/components/shared/PaymentModal.tsx`
- Create: `src/components/shared/PaymentModalTrigger.tsx`

**Step 1: Create PaymentModal**
```typescript
'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  courseId?: string
  courseName?: string
  price?: number
}

export function PaymentModal({ open, onClose, courseId, courseName, price }: Props) {
  const [mode, setMode] = useState<'self' | 'gift' | 'bulk'>('self')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [frequency, setFrequency] = useState<'full' | 'half' | 'monthly'>('full')
  const [discountCode, setDiscountCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePay() {
    setLoading(true)
    const res = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: courseId, payment_frequency: frequency, discount_code: discountCode, name, email, mobile }),
    })
    const { orderId, amount, currency } = await res.json()

    const Razorpay = (await import('razorpay')).default
    const rzp = new (window as any).Razorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      order_id: orderId,
      amount,
      currency,
      name: 'withArijit',
      prefill: { name, email, contact: mobile },
      handler: async (response: any) => {
        await fetch('/api/payments/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        })
        window.location.href = '/payment-success'
      },
    })
    rzp.open()
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enroll in {courseName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['self', 'gift', 'bulk'] as const).map(m => (
              <Button key={m} variant={mode === m ? 'default' : 'outline'} size="sm" onClick={() => setMode(m)}>
                {m === 'self' ? 'Self' : m === 'gift' ? 'Gift' : 'Bulk'}
              </Button>
            ))}
          </div>
          <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} type="email" /></div>
          <div><Label>Mobile</Label><Input value={mobile} onChange={e => setMobile(e.target.value)} /></div>
          <div>
            <Label>Payment Plan</Label>
            <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Payment — {formatCurrency(price ?? 0)}</SelectItem>
                <SelectItem value="half">50-50 — {formatCurrency((price ?? 0) / 2)} now</SelectItem>
                <SelectItem value="monthly">Monthly Installments</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Discount Code (optional)</Label><Input value={discountCode} onChange={e => setDiscountCode(e.target.value)} /></div>
          <Button className="w-full" onClick={handlePay} disabled={loading}>
            {loading ? 'Processing…' : 'Pay & Enroll'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Add Razorpay script to layout**
Add to `src/app/layout.tsx`:
```typescript
<Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
```

**Step 3: Commit**
```bash
git add src/components/shared/PaymentModal.tsx
git commit -m "feat: add PaymentModal with self/gift/bulk modes and Razorpay integration"
```

---

### Task 22: Enrollment API routes (self + gift + bulk)

**Files:**
- Create: `src/app/api/enrollment/self/route.ts`
- Create: `src/app/api/enrollment/gift/route.ts`
- Create: `src/app/api/enrollment/bulk/route.ts`

**Step 1: Self enrollment**
```typescript
// src/app/api/enrollment/self/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { queueEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const { payment_id, order_id, course_id, name, email, mobile, amount, discount_code } = await request.json()
  const supabase = createServiceClient()

  // Insert payment record
  await supabase.from('payments').insert({
    user_id: null, // linked after profile creation
    amount,
    payment_date: new Date().toISOString().split('T')[0],
    payment_time: new Date().toTimeString().split(' ')[0],
    currency: 'INR',
    country: 'IN',
    razorpay_payment_id: payment_id,
    razorpay_order_id: order_id,
    coupon_code: discount_code,
    status: 'captured',
  })

  // Insert into student_master_table
  await supabase.from('student_master_table').insert({
    name, email, mobile,
    course_name: course_id,
    enrollment_date: new Date().toISOString(),
    total_payments_count: 1,
    total_amount_paid: amount,
  })

  // Queue confirmation email
  await queueEmail({ to: email, template_name: 'enrollment_confirmation', payload: { name, course_id, amount } })

  return NextResponse.json({ success: true })
}
```

**Step 2: Gift enrollment**
```typescript
// src/app/api/enrollment/gift/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { queueEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const { payer_name, payer_email, friend_email, course_id, payment_id, amount } = await request.json()
  const supabase = createServiceClient()

  await supabase.from('payments').insert({ amount, razorpay_payment_id: payment_id, status: 'captured' })

  // Send friend email to sign up
  await queueEmail({
    to: friend_email,
    template_name: 'gift_enrollment',
    payload: { payer_name, course_id, signup_url: `${process.env.NEXT_PUBLIC_APP_URL}/signup?gifted=true&course=${course_id}` },
  })

  return NextResponse.json({ success: true })
}
```

**Step 3: Bulk enrollment**
```typescript
// src/app/api/enrollment/bulk/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { bulkEnrollmentSchema } from '@/lib/validations'
import { queueEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = bulkEnrollmentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { course_id, batch_id, members } = parsed.data
  const supabase = createServiceClient()

  for (const member of members) {
    await supabase.from('student_master_table').insert({
      name: member.name, email: member.email, mobile: member.mobile,
      course_name: course_id, batch_id, enrollment_date: new Date().toISOString(),
    })
    await queueEmail({
      to: member.email,
      template_name: 'bulk_enrollment_invite',
      payload: { name: member.name, course_id, signup_url: `${process.env.NEXT_PUBLIC_APP_URL}/signup` },
    })
  }

  return NextResponse.json({ success: true, enrolled: members.length })
}
```

**Step 4: Commit**
```bash
git add src/app/api/enrollment/
git commit -m "feat: add self, gift, and bulk enrollment API routes"
```

---

## Phase 6: Student Dashboard Pages

### Task 23: Dashboard home page

**Files:**
- Create: `src/app/(student)/dashboard/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: student } = await supabase.from('users').select('*').eq('email', user.email).single()
  const { data: nextSession } = await supabase
    .from('session_master_table')
    .select('*')
    .eq('batch_id', student?.batch_id)
    .gte('session_date', new Date().toISOString().split('T')[0])
    .order('session_date')
    .limit(1)
    .single()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome back, {student?.full_name?.split(' ')[0] ?? 'Student'}</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-500">Next Class</CardTitle></CardHeader>
          <CardContent>
            {nextSession ? (
              <>
                <p className="font-semibold">{nextSession.session_title}</p>
                <p className="text-sm text-gray-500">{formatDate(nextSession.session_date)}</p>
                <Button size="sm" className="mt-3" asChild>
                  <a href={nextSession.session_link} target="_blank">Join Now</a>
                </Button>
              </>
            ) : <p className="text-sm text-gray-500">No upcoming sessions</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-500">Course</CardTitle></CardHeader>
          <CardContent><p className="font-semibold">{student?.course_name ?? '—'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-gray-500">Batch</CardTitle></CardHeader>
          <CardContent><p className="font-semibold">{student?.batch_day_time ?? '—'}</p></CardContent>
        </Card>
      </div>
    </div>
  )
}
```

```bash
git add src/app/(student)/dashboard/page.tsx
git commit -m "feat: add student dashboard home page"
```

---

### Task 24: Dashboard — Sessions, Certificates, Payments, Profile

Build each as a server component fetching from Supabase. Pattern:

**Sessions page** (`/dashboard/sessions/page.tsx`):
- Fetch `session_master_table` joined with `batch_session_links` for student's `batch_id`
- Display upcoming sessions (join button) and past sessions (recording link)
- Add to Calendar button (generates `.ics` file via `/api/sessions/ical/[id]`)

**Certificates page** (`/dashboard/certificates/page.tsx`):
- Fetch `certificates` by `user_email`
- Download button → `/api/certificates/download/[id]` → signed Supabase Storage URL

**Payments page** (`/dashboard/payments/page.tsx`):
- Fetch `payments` by user email
- GST invoice download → `/api/invoices/download/[id]`
- Installment tracker using `student_master_table` payment fields
- Retry payment button for failed/pending installments

**Profile page** (`/dashboard/profile/page.tsx`):
- Server Action for form submit (updates `users` table)
- Batch + timezone selector
- Profile photo upload → Supabase Storage

**Career page** (`/dashboard/career/page.tsx`):
- Resume upload → Supabase Storage → insert into `resume_repository`
- Toggle consultant visibility
- Apply as trainer form

**Referrals page** (`/dashboard/referrals/page.tsx`):
- Display unique referral code from `users` or `student_master_table`
- Stats: clicks/conversions from `payments` where `referred_by_email = user.email`
- Payout request form

**Commit each page:**
```bash
git add src/app/(student)/dashboard/
git commit -m "feat: add all student dashboard pages (sessions, certs, payments, profile, career, referrals)"
```

---

## Phase 7: Admin Panel Pages

### Task 25: Admin dashboard overview

**Files:**
- Create: `src/app/(admin)/admin/dashboard/page.tsx`

```typescript
import { createServiceClient } from '@/lib/supabase/service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

export default async function AdminDashboard() {
  const supabase = createServiceClient()
  const [{ count: students }, { count: payments }, { data: emailHealth }] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'captured'),
    supabase.from('email_queue').select('status').in('status', ['pending', 'failed']),
  ])

  const pendingEmails = emailHealth?.filter(e => e.status === 'pending').length ?? 0
  const failedEmails = emailHealth?.filter(e => e.status === 'failed').length ?? 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Overview</h1>
      <div className="grid md:grid-cols-4 gap-4">
        <Card><CardHeader><CardTitle className="text-sm text-gray-500">Total Students</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{students}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-gray-500">Successful Payments</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{payments}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-gray-500">Email Queue</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{pendingEmails}</p><p className="text-xs text-red-500">{failedEmails} failed</p></CardContent></Card>
      </div>
    </div>
  )
}
```

```bash
git add src/app/(admin)/admin/dashboard/
git commit -m "feat: add admin dashboard overview page"
```

---

### Task 26: Core admin pages

Build all admin pages using the service client (bypasses RLS). Each follows the same pattern:
- Server component with data fetch
- Searchable/filterable table (using shadcn `Table`)
- Action buttons (edit, delete, add)

**Pages to build:**
- `/admin/students` — `users` + `student_master_table` joined, searchable, CSV export
- `/admin/sessions` — `session_master_table`, CRUD, bulk CSV upload
- `/admin/session-links` — `batch_session_links`, CRUD
- `/admin/certificates` — `certificates`, bulk issue, download
- `/admin/library` — `library`, add/edit/remove
- `/admin/courses` — `awa_courses`, pricing/commission management
- `/admin/payments` — `payments`, filter, manual recording, discount codes
- `/admin/email-queue` — `email_queue` + `awa_email_log`, manual trigger
- `/admin/ai-spots` — `aispot_master`, CRUD

**Super Admin only:**
- `/admin/crm` — `crm_leads` table with full 72-column management
- `/admin/partners` — `partners` hierarchy, commission approval
- `/admin/audit-log` — `admin_audit_log` read-only view

```bash
git add src/app/(admin)/
git commit -m "feat: add all admin panel pages"
```

---

## Phase 8: Email System

### Task 27: Email send utility

**Files:**
- Create: `src/lib/email.ts`

```typescript
import nodemailer from 'nodemailer'
import { createServiceClient } from '@/lib/supabase/service'

function getTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

function getBrevoTransporter() {
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_KEY },
  })
}

export async function sendEmail({ to, subject, html, from }: {
  to: string; subject: string; html: string; from?: string
}) {
  const mailOptions = {
    from: from ?? `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_USER}>`,
    to, subject, html,
  }
  try {
    await getTransporter().sendMail(mailOptions)
  } catch (err: any) {
    // Fallback to Brevo if Hostinger quota hit (550 error)
    if (err.responseCode === 550 || err.code === 'EAUTH') {
      await getBrevoTransporter().sendMail({
        ...mailOptions,
        from: `${process.env.SMTP_FROM_NAME} <${process.env.BREVO_FROM_EMAIL}>`,
      })
    } else throw err
  }
}

export async function queueEmail({ to, template_name, payload, scheduled_at, ref_id, ref_type }: {
  to: string; template_name: string; payload: Record<string, any>;
  scheduled_at?: string; ref_id?: string; ref_type?: string
}) {
  const supabase = createServiceClient()
  await supabase.from('email_queue').insert({
    recipient_email: to,
    template_name,
    payload,
    scheduled_at: scheduled_at ?? new Date().toISOString(),
    status: 'pending',
    retry_count: 0,
    max_retries: 3,
    ref_id,
    ref_type,
  })
}
```

```bash
git add src/lib/email.ts
git commit -m "feat: add email utility with Hostinger primary and Brevo fallback"
```

---

### Task 28: Email templates (react-email)

**Files:**
- Create: `src/emails/templates/EnrollmentConfirmation.tsx`
- Create: `src/emails/templates/WebinarReminder.tsx`
- Create: `src/emails/templates/PaymentFailure.tsx`
- Create: `src/emails/templates/GiftEnrollment.tsx`
- Create: `src/emails/templates/BulkEnrollmentInvite.tsx`
- Create: `src/emails/templates/ClassReminder.tsx`
- Create: `src/emails/templates/InstallmentDue.tsx`
- Create: `src/emails/render.ts`

**Pattern for each template:**
```typescript
// src/emails/templates/EnrollmentConfirmation.tsx
import { Html, Head, Body, Container, Heading, Text, Button, Hr } from '@react-email/components'

interface Props { name: string; course_name: string; amount: number; dashboard_url: string }

export function EnrollmentConfirmation({ name, course_name, amount, dashboard_url }: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading>You're enrolled! 🎉</Heading>
          <Text>Hi {name},</Text>
          <Text>Welcome to <strong>{course_name}</strong>. Your payment of ₹{amount} has been confirmed.</Text>
          <Button href={dashboard_url} style={{ background: '#4f46e5', color: '#fff', padding: '12px 24px', borderRadius: '6px' }}>
            Go to Dashboard
          </Button>
          <Hr />
          <Text style={{ fontSize: '12px', color: '#6b7280' }}>withArijit — AI Education Platform</Text>
        </Container>
      </Body>
    </Html>
  )
}
```

**Render utility:**
```typescript
// src/emails/render.ts
import { render } from '@react-email/render'
import { EnrollmentConfirmation } from './templates/EnrollmentConfirmation'
import { WebinarReminder } from './templates/WebinarReminder'
// ... import all templates

const TEMPLATES: Record<string, (payload: any) => React.ReactElement> = {
  enrollment_confirmation: (p) => <EnrollmentConfirmation {...p} />,
  webinar_reminder: (p) => <WebinarReminder {...p} />,
  // ... all templates
}

export async function renderTemplate(templateName: string, payload: any): Promise<string> {
  const component = TEMPLATES[templateName]
  if (!component) throw new Error(`Unknown template: ${templateName}`)
  return render(component(payload))
}
```

```bash
git add src/emails/
git commit -m "feat: add react-email templates and render utility for all email sequences"
```

---

## Phase 9: Supabase Edge Functions

### Task 29: Razorpay webhook Edge Function

**Files:**
- Create: `supabase/functions/razorpay-webhook/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

serve(async (req) => {
  const body = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''

  // Verify signature
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(Deno.env.get('RAZORPAY_WEBHOOK_SECRET')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  if (expected !== signature) return new Response('Invalid signature', { status: 400 })

  const event = JSON.parse(body)
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity
    const { course_id, name, email, mobile, payment_frequency } = payment.notes

    // Idempotency check
    const { data: existing } = await supabase.from('payments').select('id').eq('razorpay_payment_id', payment.id).single()
    if (existing) return new Response('Already processed', { status: 200 })

    // Insert payment
    await supabase.from('payments').insert({
      amount: payment.amount / 100,
      razorpay_payment_id: payment.id,
      razorpay_order_id: payment.order_id,
      status: 'captured',
      payment_date: new Date().toISOString().split('T')[0],
      payment_time: new Date().toTimeString().split(' ')[0],
      currency: payment.currency,
    })

    // Queue confirmation email
    await supabase.from('email_queue').insert({
      recipient_email: email,
      template_name: 'enrollment_confirmation',
      payload: { name, course_id, amount: payment.amount / 100, dashboard_url: `${Deno.env.get('APP_URL')}/dashboard` },
      status: 'pending',
      scheduled_at: new Date().toISOString(),
      retry_count: 0,
      max_retries: 3,
    })
  }

  return new Response('OK', { status: 200 })
})
```

```bash
git add supabase/functions/razorpay-webhook/
git commit -m "feat: add Razorpay webhook Edge Function with idempotency"
```

---

### Task 30: Email dispatcher Edge Function (cron)

**Files:**
- Create: `supabase/functions/email-dispatcher/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts'

serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Fetch pending emails due now
  const { data: queue } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .lt('retry_count', 3)
    .limit(50)

  for (const item of queue ?? []) {
    try {
      // Mark as processing
      await supabase.from('email_queue').update({ status: 'processing' }).eq('id', item.id)

      // Render template (simplified — in prod, fetch pre-rendered HTML)
      const html = `<p>Email: ${item.template_name}</p><pre>${JSON.stringify(item.payload)}</pre>`

      // Send via SMTP
      const client = new SmtpClient()
      await client.connectTLS({ hostname: 'smtp.hostinger.com', port: 465, username: Deno.env.get('SMTP_USER'), password: Deno.env.get('SMTP_PASS') })
      await client.send({ from: `AIwithArijit <${Deno.env.get('SMTP_USER')}>`, to: item.recipient_email, subject: item.subject ?? 'Update from withArijit', content: html, html: true })
      await client.close()

      // Mark sent, log
      await supabase.from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', item.id)
      await supabase.from('awa_email_log').insert({ recipient_email: item.recipient_email, template_name: item.template_name, subject: item.subject, status: 'sent', sent_at: new Date().toISOString(), ref_id: item.ref_id, ref_type: item.ref_type })
    } catch (err) {
      await supabase.from('email_queue').update({ status: 'pending', retry_count: item.retry_count + 1, error_message: String(err) }).eq('id', item.id)
    }
  }

  return new Response('Done', { status: 200 })
})
```

**Set up cron in Supabase dashboard:** Edge Function scheduled every 5 minutes.

```bash
git add supabase/functions/email-dispatcher/
git commit -m "feat: add email dispatcher Edge Function with retry logic"
```

---

## Phase 10: AI Agents

### Task 31: Visitor AI Agent API route

**Files:**
- Create: `src/app/api/agent/visitor/route.ts`

```typescript
import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase/service'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  const { messages } = await request.json()

  const supabase = createServiceClient()
  const [{ data: courses }, { data: webinar }, { data: kb }] = await Promise.all([
    supabase.from('awa_courses').select('name, description, mrp, target_audience').eq('is_active', true),
    supabase.from('qr_landing_webinar_links').select('webinar_date, webinar_time, webinar_link').order('webinar_date').limit(1).single(),
    supabase.from('agent_knowledge_base').select('title, content').eq('is_active', true),
  ])

  const systemPrompt = `You are an AI assistant for withArijit, India's premier AI education platform.

Available courses: ${JSON.stringify(courses)}
Next free webinar: ${JSON.stringify(webinar)}
Knowledge base: ${kb?.map(k => `${k.title}: ${k.content}`).join('\n')}

Help visitors find the right course, answer pricing/curriculum questions, and guide them to register for the free webinar. Be warm, professional, and concise. Always cite live data — never guess prices or dates.`

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: true,
    max_tokens: 500,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
}
```

```bash
git add src/app/api/agent/visitor/
git commit -m "feat: add visitor AI agent API route (GPT-4o mini, SSE streaming)"
```

---

### Task 32: Student AI Agent API route

**Files:**
- Create: `src/app/api/agent/student/route.ts`

```typescript
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TOOLS: Anthropic.Tool[] = [
  { name: 'get_next_session', description: 'Get the student\'s next upcoming class session with join link', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'get_latest_recording', description: 'Get the latest session recording link', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'get_payment_summary', description: 'Get payment history and next installment due', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'get_certificates', description: 'Get list of earned certificates with download links', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'raise_support_request', description: 'Raise a support ticket on behalf of the student', input_schema: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'] } },
]

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { messages } = await request.json()
  const service = createServiceClient()

  const { data: student } = await service.from('users').select('*').eq('email', user.email).single()

  const systemPrompt = `You are a personal AI assistant for ${student?.full_name ?? 'this student'} on the withArijit platform.
Student details: Course: ${student?.course_name}, Batch: ${student?.batch_day_time}, Email: ${student?.email}.
You can look up their sessions, recordings, payments, and certificates using the tools provided.
Be personal, helpful, and proactive. Always fetch live data before answering questions about schedules or payments.`

  async function executeTool(toolName: string, input: any) {
    if (toolName === 'get_next_session') {
      const { data } = await service.from('session_master_table').select('*').eq('batch_id', student?.batch_id).gte('session_date', new Date().toISOString().split('T')[0]).order('session_date').limit(1).single()
      return JSON.stringify(data)
    }
    if (toolName === 'get_payment_summary') {
      const { data } = await service.from('payments').select('*').eq('user_id', student?.id).order('payment_date', { ascending: false })
      return JSON.stringify(data)
    }
    if (toolName === 'raise_support_request') {
      await service.from('contact_submissions').insert({ name: student?.full_name, email: student?.email, purpose: 'support', additional_details: input.message })
      return JSON.stringify({ success: true })
    }
    return JSON.stringify({ error: 'Unknown tool' })
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      let currentMessages = [{ role: 'user' as const, content: messages[messages.length - 1].content }]

      while (true) {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          tools: TOOLS,
          messages: currentMessages,
          stream: false,
        })

        for (const block of response.content) {
          if (block.type === 'text') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: block.text })}\n\n`))
          }
          if (block.type === 'tool_use') {
            const result = await executeTool(block.name, block.input)
            currentMessages = [...currentMessages,
              { role: 'assistant', content: response.content },
              { role: 'user', content: [{ type: 'tool_result', tool_use_id: block.id, content: result }] },
            ]
          }
        }

        if (response.stop_reason === 'end_turn') break
        if (response.stop_reason !== 'tool_use') break
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
}
```

```bash
git add src/app/api/agent/student/
git commit -m "feat: add student AI agent with Claude Sonnet 4.6 and agentic tools"
```

---

### Task 33: AI Agent chat UI components

**Files:**
- Create: `src/components/shared/VisitorChatWidget.tsx`
- Create: `src/components/dashboard/StudentChatPanel.tsx`

**Pattern for both (SSE consumer):**
```typescript
'use client'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageCircle, X, Send } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string }

export function VisitorChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    if (!input.trim()) return
    const userMsg: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    const res = await fetch('/api/agent/visitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [...messages, userMsg] }),
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const lines = decoder.decode(value).split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          const { text } = JSON.parse(line.slice(6))
          setMessages(prev => {
            const last = { ...prev[prev.length - 1], content: prev[prev.length - 1].content + text }
            return [...prev.slice(0, -1), last]
          })
        }
      }
    }
    setStreaming(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-500 z-50">
      <MessageCircle size={24} />
    </button>
  )

  return (
    <div className="fixed bottom-6 right-6 w-80 h-96 bg-white rounded-2xl shadow-2xl flex flex-col z-50 border">
      <div className="flex items-center justify-between p-4 border-b bg-indigo-600 text-white rounded-t-2xl">
        <span className="font-semibold text-sm">Ask AI</span>
        <button onClick={() => setOpen(false)}><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={`text-sm p-2 rounded-lg ${m.role === 'user' ? 'bg-indigo-50 ml-4' : 'bg-gray-50 mr-4'}`}>
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask anything…" className="text-sm" />
        <Button size="sm" onClick={send} disabled={streaming}><Send size={14} /></Button>
      </div>
    </div>
  )
}
```

**Add to public layout:**
```typescript
// src/app/(public)/layout.tsx — add at bottom of layout
import { VisitorChatWidget } from '@/components/shared/VisitorChatWidget'
// ...
<VisitorChatWidget />
```

```bash
git add src/components/shared/VisitorChatWidget.tsx src/components/dashboard/StudentChatPanel.tsx
git commit -m "feat: add AI chat widget (visitor) and chat panel (student) with SSE streaming"
```

---

## Phase 11: PDF Generation

### Task 34: GST Invoice & Certificate PDF

**Files:**
- Create: `src/lib/pdf.ts`
- Create: `src/app/api/invoices/download/[id]/route.ts`
- Create: `src/app/api/certificates/download/[id]/route.ts`

**PDF utility:**
```typescript
// src/lib/pdf.ts
import { renderToBuffer } from '@react-pdf/renderer'
import { GSTInvoice } from '@/components/pdf/GSTInvoice'
import { CertificatePDF } from '@/components/pdf/CertificatePDF'

export async function generateGSTInvoice(payment: any) {
  return renderToBuffer(<GSTInvoice payment={payment} />)
}

export async function generateCertificate(certificate: any) {
  return renderToBuffer(<CertificatePDF certificate={certificate} />)
}
```

**Download route:**
```typescript
// src/app/api/invoices/download/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateGSTInvoice } from '@/lib/pdf'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const service = createServiceClient()
  const { data: payment } = await service.from('payments').select('*').eq('id', params.id).single()
  if (!payment) return new NextResponse('Not found', { status: 404 })

  const pdfBuffer = await generateGSTInvoice(payment)
  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${params.id}.pdf"`,
    },
  })
}
```

```bash
git add src/lib/pdf.ts src/app/api/invoices/ src/app/api/certificates/
git commit -m "feat: add PDF generation for GST invoices and certificates"
```

---

## Phase 12: Deployment

### Task 35: Configure Vercel deployment

**Files:**
- Create: `vercel.json`

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

**Step 1: Push to GitHub**
```bash
git push origin main
```

**Step 2: Connect to Vercel**
- Go to vercel.com → New Project → Import `ArijitXDA/withArijit-platform`
- Set all environment variables from `.env.local`
- Add custom domains: `www.withArijit.com` and `www.ostaran.com`
- Deploy

**Step 3: Deploy Supabase Edge Functions**
```bash
npx supabase functions deploy razorpay-webhook
npx supabase functions deploy email-dispatcher
npx supabase functions deploy whatsapp-dispatcher

# Set env vars for Edge Functions
npx supabase secrets set RAZORPAY_WEBHOOK_SECRET=<value>
npx supabase secrets set SMTP_USER=<value>
npx supabase secrets set SMTP_PASS=<value>
npx supabase secrets set APP_URL=https://www.withArijit.com
```

**Step 4: Set up Edge Function cron (in Supabase dashboard)**
- `email-dispatcher`: every 5 minutes — `*/5 * * * *`
- `whatsapp-dispatcher`: every 5 minutes — `*/5 * * * *`

**Step 5: Smoke test checklist**
- [ ] Homepage loads and shows courses from DB
- [ ] `/signin` OTP flow works
- [ ] `/admin` login works with correct admin credentials
- [ ] Payment modal opens and Razorpay checkout loads
- [ ] Visitor AI chat widget appears and responds
- [ ] Student dashboard loads after sign-in
- [ ] Email queue processes on cron trigger

```bash
git add vercel.json
git commit -m "chore: add Vercel configuration"
```

---

## Summary Checklist

### Phase 1 — Foundation
- [ ] Task 1: Next.js 15 project scaffold + GitHub push
- [ ] Task 2: Install all dependencies
- [ ] Task 3: shadcn/ui install + core components
- [ ] Task 4: Environment variables
- [ ] Task 5: Supabase client utilities
- [ ] Task 6: Generate TypeScript types from DB
- [ ] Task 7: Middleware (route protection)
- [ ] Task 8: DB migration (student_agent_conversations)
- [ ] Task 9: Shared utils + Zod schemas

### Phase 2 — Layouts
- [ ] Task 10: Public layout (Navbar + Footer)
- [ ] Task 11: Dashboard layout (sidebar)
- [ ] Task 12: Admin layout (sidebar, role-aware)

### Phase 3 — Authentication
- [ ] Task 13: Admin auth API routes
- [ ] Task 14: Admin login page
- [ ] Task 15: Student sign-in + sign-up pages

### Phase 4 — Public Pages
- [ ] Task 16: Homepage + marketing components
- [ ] Task 17: Dynamic course catalog + individual pages
- [ ] Task 18: AI Certification pages
- [ ] Task 19: All remaining public pages

### Phase 5 — Payments
- [ ] Task 20: Razorpay API routes (create-order, verify)
- [ ] Task 21: PaymentModal component
- [ ] Task 22: Enrollment API routes (self, gift, bulk)

### Phase 6 — Student Dashboard
- [ ] Task 23: Dashboard home
- [ ] Task 24: All dashboard pages (sessions, certs, payments, profile, career, referrals)

### Phase 7 — Admin Panel
- [ ] Task 25: Admin overview
- [ ] Task 26: All admin pages + super admin pages

### Phase 8 — Email
- [ ] Task 27: Email send utility (Hostinger + Brevo)
- [ ] Task 28: react-email templates (all sequences)

### Phase 9 — Edge Functions
- [ ] Task 29: Razorpay webhook
- [ ] Task 30: Email dispatcher (cron)

### Phase 10 — AI Agents
- [ ] Task 31: Visitor agent API (GPT-4o mini)
- [ ] Task 32: Student agent API (Claude Sonnet 4.6)
- [ ] Task 33: Chat widget + chat panel UI

### Phase 11 — PDFs
- [ ] Task 34: GST invoice + certificate PDF generation

### Phase 12 — Deployment
- [ ] Task 35: Vercel + domains + Edge Function deploy + smoke test
