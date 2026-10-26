-- ============================================================================
-- landing1 funnel — schema additions for the paginated registration flow
-- Target project: enszifyeqnwcnxaqrmrq (shared oStaran Supabase)
-- Safe to run multiple times (idempotent: IF NOT EXISTS / CREATE OR REPLACE).
-- Apply via Supabase SQL editor (or psql with the project connection string).
-- ============================================================================

-- 1) New columns on the existing registration table ---------------------------
alter table public.qr_landing_registrations
  add column if not exists reg_source        text,         -- channel flag, e.g. 'landing1'
  add column if not exists landing1_quiz      jsonb,        -- full quiz answer map
  add column if not exists daily_goal_minutes integer,      -- chosen daily practice minutes
  add column if not exists readiness_score    integer;      -- 0-100, computed from answers

comment on column public.qr_landing_registrations.reg_source        is 'Registration channel, e.g. landing1 (Coursiv-style funnel).';
comment on column public.qr_landing_registrations.landing1_quiz      is 'JSONB map of landing1 quiz answers (goal, industry, comfort, etc.).';
comment on column public.qr_landing_registrations.daily_goal_minutes is 'Daily AI-practice goal in minutes chosen in the funnel.';
comment on column public.qr_landing_registrations.readiness_score    is 'AI-readiness score 0-100 derived from quiz answers.';

create index if not exists idx_qr_reg_reg_source on public.qr_landing_registrations (reg_source);

-- 2) Additive public RPC for the landing1 partner card ------------------------
-- Does NOT touch the existing partner_public_badge. Returns display name, logo,
-- and the partner's WhatsApp number (from partners.mobile), honouring
-- hide_identity. SECURITY DEFINER so the anon client can read it safely.
create or replace function public.landing1_partner_card(p_code text)
returns table (
  display_name text,
  company_name text,
  avatar_url   text,
  whatsapp     text,
  partner_code text
)
language sql
security definer
set search_path = public
as $$
  with resolved as (
    select coalesce(
      (select partner_id from public.partner_code_aliases
         where lower(code) = lower(p_code) and is_current = true limit 1),
      (select id from public.partners
         where lower(partner_code) = lower(p_code)
            or lower(coalesce(partner_code_v2, '')) = lower(p_code)
         limit 1)
    ) as pid
  )
  select
    case when p.hide_identity then coalesce(nullif(p.company_name, ''), 'An oStaran Partner')
         else coalesce(nullif(p.full_name, ''), nullif(p.company_name, ''), 'An oStaran Partner') end,
    case when p.hide_identity then null else nullif(p.company_name, '') end,
    case when p.hide_identity then null else nullif(p.profile_pic_url, '') end,
    case when p.hide_identity then null else nullif(p.mobile, '') end,
    coalesce(nullif(p.partner_code_v2, ''), p.partner_code)
  from public.partners p
  where p.id = (select pid from resolved)
  limit 1;
$$;

grant execute on function public.landing1_partner_card(text) to anon, authenticated, service_role;
