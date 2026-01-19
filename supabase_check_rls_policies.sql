-- Check Row Level Security policies on crm_employees table
-- Run this in Supabase SQL Editor to diagnose update issues

-- 1. Check if RLS is enabled on the table
SELECT
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'crm_employees';

-- 2. List all RLS policies on crm_employees
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd AS command,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'crm_employees';

-- 3. Check column permissions
SELECT
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.column_privileges
WHERE table_name = 'crm_employees'
ORDER BY grantee, privilege_type;

-- 4. Verify the new columns exist and their properties
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'crm_employees'
    AND column_name IN (
        'pan_number',
        'aadhaar_number',
        'bank_account_number',
        'bank_ifsc_code',
        'bank_name',
        'emergency_contact_name',
        'emergency_contact_number'
    )
ORDER BY column_name;

-- 5. Test if a simple update works (replace with actual employee ID)
-- UNCOMMENT AND UPDATE WITH REAL ID TO TEST:
-- UPDATE crm_employees
-- SET pan_number = 'TEST12345'
-- WHERE id = 'YOUR-EMPLOYEE-ID-HERE'
-- RETURNING id, emp_id, pan_number;
