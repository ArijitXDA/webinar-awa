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
-- Does NOT touch the existing partner_public_badge. Resolution priority:
--   1. Approved NNWD POC brand  -> POC approved logo + POC name
--   2. Identified partner       -> partner profile pic + name
--   3. Hidden identity / no pic  -> oStaran logo + "oStaran" (use_ostaran=true)
-- SECURITY DEFINER so the anon client can read it safely.
drop function if exists public.landing1_partner_card(text);

create or replace function public.landing1_partner_card(p_code text)
returns table (
  display_name text,
  company_name text,
  avatar_url   text,
  whatsapp     text,
  partner_code text,
  is_poc       boolean,
  use_ostaran  boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pid uuid;
  v_storage constant text := 'https://enszifyeqnwcnxaqrmrq.supabase.co/storage/v1/object/public/';
  pr  record;
  poc record;
begin
  select coalesce(
    (select a.partner_id from public.partner_code_aliases a
       where lower(a.code) = lower(p_code) and a.is_current = true limit 1),
    (select pp.id from public.partners pp
       where lower(pp.partner_code) = lower(p_code)
          or lower(coalesce(pp.partner_code_v2, '')) = lower(p_code)
       limit 1)
  ) into v_pid;

  if v_pid is null then
    return;
  end if;

  select * into pr from public.partners where id = v_pid;

  -- Approved POC brand for this partner, if any.
  select p.display_name as poc_name,
         bv.display_name as bv_name,
         bv.logo_path_approved as logo_path,
         coalesce(nullif(p.contact_whatsapp, ''), nullif(bv.contact_whatsapp, '')) as poc_wa
    into poc
  from public.nnwd_nodes n
  join public.nnwd_pocs p on p.owner_node_id = n.id
  join public.nnwd_poc_brand_versions bv on bv.id = p.approved_version_id
  where n.partner_id = v_pid
    and p.status = 'approved'
    and bv.status = 'approved'
    and bv.logo_path_approved is not null
  order by p.approved_at desc nulls last, p.updated_at desc nulls last
  limit 1;

  if found then
    return query select
      coalesce(nullif(poc.poc_name, ''), nullif(poc.bv_name, ''), 'oStaran Partner'),
      null::text,
      v_storage || poc.logo_path,
      coalesce(poc.poc_wa, nullif(pr.mobile, '')),
      coalesce(nullif(pr.partner_code_v2, ''), pr.partner_code),
      true,
      false;
    return;
  end if;

  if coalesce(pr.hide_identity, false) = true or nullif(pr.profile_pic_url, '') is null then
    return query select
      'oStaran'::text,
      null::text,
      null::text,
      null::text,
      coalesce(nullif(pr.partner_code_v2, ''), pr.partner_code),
      false,
      true;
    return;
  end if;

  return query select
    coalesce(nullif(pr.full_name, ''), nullif(pr.company_name, ''), 'An oStaran Partner'),
    nullif(pr.company_name, ''),
    nullif(pr.profile_pic_url, ''),
    nullif(pr.mobile, ''),
    coalesce(nullif(pr.partner_code_v2, ''), pr.partner_code),
    false,
    false;
end;
$$;

grant execute on function public.landing1_partner_card(text) to anon, authenticated, service_role;
