-- Migration: Add employee ID documents, bank details, and emergency contact fields
-- Run this in Supabase SQL Editor

-- Add new columns to crm_employees table
ALTER TABLE crm_employees
ADD COLUMN IF NOT EXISTS pan_number VARCHAR(10),
ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(12),
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS bank_ifsc_code VARCHAR(11),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS emergency_contact_number VARCHAR(20);

-- Add comments to document the columns
COMMENT ON COLUMN crm_employees.pan_number IS 'Permanent Account Number (PAN) for tax purposes';
COMMENT ON COLUMN crm_employees.aadhaar_number IS 'Aadhaar unique identification number';
COMMENT ON COLUMN crm_employees.bank_account_number IS 'Bank account number for salary payments';
COMMENT ON COLUMN crm_employees.bank_ifsc_code IS 'Bank IFSC code for transfers';
COMMENT ON COLUMN crm_employees.bank_name IS 'Name of the bank';
COMMENT ON COLUMN crm_employees.emergency_contact_name IS 'Name of emergency contact person';
COMMENT ON COLUMN crm_employees.emergency_contact_number IS 'Phone number of emergency contact';

-- Create indexes for better query performance on frequently searched fields
CREATE INDEX IF NOT EXISTS idx_crm_employees_pan_number ON crm_employees(pan_number) WHERE pan_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_employees_aadhaar_number ON crm_employees(aadhaar_number) WHERE aadhaar_number IS NOT NULL;

-- Verify the changes
SELECT column_name, data_type, character_maximum_length, is_nullable
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
