/**
 * CRM MCP Server Authentication
 * Handles email-based authentication and session validation
 */

import { createClient } from '@supabase/supabase-js'
import { Employee, MCPContext } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Authenticate user by email and return employee context
 * @param email - Employee email address
 * @param apiKey - Optional API key for authentication
 * @returns MCPContext with employee details
 */
export async function authenticateUser(
  email: string,
  apiKey?: string
): Promise<MCPContext> {
  try {
    // Validate email format
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email format')
    }

    // Query employee by email
    const { data: employee, error } = await supabase
      .from('crm_employees')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .single()

    if (error || !employee) {
      throw new Error('Employee not found or inactive')
    }

    // If API key is provided, validate it
    if (apiKey) {
      const isValidKey = await validateApiKey(employee.id, apiKey)
      if (!isValidKey) {
        throw new Error('Invalid API key')
      }
    }

    // Log authentication attempt
    await supabase.from('crm_audit_log').insert({
      employee_id: employee.id,
      emp_id: employee.emp_id,
      action: 'mcp_auth',
      entity_type: 'auth',
      entity_id: employee.id,
      description: `MCP authentication successful for ${email}`,
    })

    return {
      employee: employee as Employee,
      email: employee.email,
    }
  } catch (error: any) {
    // Log failed authentication
    await supabase.from('crm_audit_log').insert({
      employee_id: null,
      emp_id: null,
      action: 'mcp_auth_failed',
      entity_type: 'auth',
      entity_id: null,
      description: `MCP authentication failed for ${email}: ${error.message}`,
    })

    throw new Error(`Authentication failed: ${error.message}`)
  }
}

/**
 * Validate API key for employee
 * @param employeeId - Employee ID
 * @param apiKey - API key to validate
 * @returns True if valid
 */
async function validateApiKey(
  employeeId: string,
  apiKey: string
): Promise<boolean> {
  try {
    // Check if API keys table exists and validate
    const { data, error } = await supabase
      .from('crm_api_keys')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (error || !data) {
      return false
    }

    // Update last used timestamp
    await supabase
      .from('crm_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)

    return true
  } catch (error) {
    console.error('API key validation error:', error)
    return false
  }
}

/**
 * Get employee's reporting hierarchy (subordinates)
 * @param employeeId - Employee ID
 * @returns Array of subordinate employee IDs
 */
export async function getSubordinates(employeeId: string): Promise<string[]> {
  const subordinates: string[] = []
  const queue: string[] = [employeeId]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)

    const { data, error } = await supabase
      .from('crm_employees')
      .select('id')
      .eq('reports_to', currentId)
      .eq('is_active', true)

    if (!error && data) {
      for (const emp of data) {
        subordinates.push(emp.id)
        queue.push(emp.id)
      }
    }
  }

  return subordinates
}

/**
 * Check if employee is in the reporting chain
 * @param employeeId - Employee to check
 * @param managerId - Potential manager
 * @returns True if managerId is in the reporting chain above employeeId
 */
export async function isInReportingChain(
  employeeId: string,
  managerId: string
): Promise<boolean> {
  let currentId: string | null = employeeId
  const visited = new Set<string>()

  while (currentId && !visited.has(currentId)) {
    if (currentId === managerId) {
      return true
    }

    visited.add(currentId)

    const { data, error }: { data: { reports_to: string | null } | null; error: any } = await supabase
      .from('crm_employees')
      .select('reports_to')
      .eq('id', currentId)
      .single()

    if (error || !data || !data.reports_to) {
      break
    }

    currentId = data.reports_to
  }

  return false
}

/**
 * Generate a new API key for an employee
 * @param employeeId - Employee ID
 * @param expiresInDays - Number of days until expiration (default 90)
 * @returns Generated API key
 */
export async function generateApiKey(
  employeeId: string,
  expiresInDays: number = 90
): Promise<string> {
  // Generate a secure random API key
  const apiKey = `crm_${Buffer.from(
    Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
  )
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 32)}`

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  // Store API key
  const { error } = await supabase.from('crm_api_keys').insert({
    employee_id: employeeId,
    api_key: apiKey,
    expires_at: expiresAt.toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
  })

  if (error) {
    throw new Error(`Failed to generate API key: ${error.message}`)
  }

  return apiKey
}
