-- Create API Keys table for MCP authentication
-- This table stores API keys for employees to authenticate with the MCP server

CREATE TABLE IF NOT EXISTS crm_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES crm_employees(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_employee ON crm_api_keys(employee_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON crm_api_keys(api_key) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON crm_api_keys(expires_at) WHERE is_active = true;

-- Add RLS policies
ALTER TABLE crm_api_keys ENABLE ROW LEVEL SECURITY;

-- Only allow employees to view their own API keys
CREATE POLICY "Employees can view own API keys"
  ON crm_api_keys
  FOR SELECT
  USING (employee_id = auth.uid());

-- Only allow employees to insert their own API keys (through service role)
CREATE POLICY "Service role can manage API keys"
  ON crm_api_keys
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE crm_api_keys IS 'Stores API keys for MCP server authentication';
