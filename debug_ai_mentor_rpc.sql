-- Test if the RPC function exists and works
-- Run this in Supabase SQL Editor to debug

-- 1. Check if function exists
SELECT proname, pronargs, proargnames
FROM pg_proc
WHERE proname = 'get_lead_ai_context';

-- 2. Test the function with a sample lead_id
-- Replace 1 with an actual lead_id from your crm_leads table
SELECT get_lead_ai_context(1);

-- 3. If the above fails, let's check what tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'crm_leads',
    'crm_lead_interactions',
    'certificates',
    'contact_submissions',
    'lead_gen_response',
    'quiz_responses',
    'student_master',
    'users',
    'webinar_ratings'
  )
ORDER BY table_name;

-- 4. Check if the lead exists
SELECT lead_id, full_name, email, mobile
FROM crm_leads
LIMIT 5;
