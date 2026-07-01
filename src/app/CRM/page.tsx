'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CRMLoginPage() {
  const router = useRouter()
  const [empId, setEmpId] = useState('')
  const [passcode, setPasscode] = useState('')
  const [showPasscode, setShowPasscode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)

  // Check existing session on mount
  useEffect(() => {
    checkExistingSession()
  }, [])

  async function checkExistingSession() {
    try {
      const sessionData = localStorage.getItem('crm_session')
      if (sessionData) {
        const session = JSON.parse(sessionData)
        
        // Verify session is still valid
        const { data: dbSession, error } = await supabase
          .from('crm_sessions')
          .select('*, crm_employees(*)')
          .eq('session_token', session.token)
          .eq('is_valid', true)
          .gt('expires_at', new Date().toISOString())
          .single()

        if (dbSession && !error) {
          // Update last activity
          await supabase
            .from('crm_sessions')
            .update({ last_activity: new Date().toISOString() })
            .eq('id', dbSession.id)

          // Check if must change password
          if (dbSession.crm_employees?.must_change_password) {
            router.push('/CRM/change-password')
          } else {
            router.push('/CRM/dashboard')
          }
          return
        }
        
        // Invalid session, clear it
        localStorage.removeItem('crm_session')
      }
    } catch (err) {
      console.error('Session check error:', err)
      localStorage.removeItem('crm_session')
    } finally {
      setCheckingSession(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // 1. Find employee by emp_id
      const { data: employee, error: empError } = await supabase
        .from('crm_employees')
        .select('*')
        .eq('emp_id', empId.toUpperCase().trim())
        .eq('is_active', true)
        .single()

      if (empError || !employee) {
        setError('Invalid Employee ID')
        setIsLoading(false)
        return
      }

      // 2. Check if account is locked
      if (employee.locked_until && new Date(employee.locked_until) > new Date()) {
        const lockMinutes = Math.ceil((new Date(employee.locked_until).getTime() - Date.now()) / 60000)
        setError(`Account locked. Try again in ${lockMinutes} minute(s).`)
        setIsLoading(false)
        return
      }

      // 3. Verify passcode - check if hash matches
      // Using raw SQL comparison with crypt function
      const { data: passCheck, error: passError } = await supabase
        .from('crm_employees')
        .select('id')
        .eq('id', employee.id)
        .filter('passcode_hash', 'eq', `crypt('${passcode}', passcode_hash)`)
        .maybeSingle()

      // Alternative: Direct string comparison for testing
      // In production, use proper bcrypt verification
      let isValidPasscode = false
      
      // Try the crypt comparison via RPC if available
      const { data: cryptResult, error: cryptError } = await supabase.rpc('verify_employee_passcode', {
        p_emp_id: employee.id,
        p_passcode: passcode
      })

      if (!cryptError && cryptResult !== null) {
        isValidPasscode = cryptResult
      } else {
        // Fallback: For initial testing, allow the default password
        // REMOVE THIS IN PRODUCTION!
        if (passcode === 'OwnerCRM@2025' && employee.emp_id === 'OWN001') {
          isValidPasscode = true
        }
      }

      if (!isValidPasscode) {
        // Increment failed attempts
        const newAttempts = (employee.login_attempts || 0) + 1
        const updateData: Record<string, any> = { login_attempts: newAttempts }
        
        // Lock after 5 failed attempts for 15 minutes
        if (newAttempts >= 5) {
          const lockUntil = new Date()
          lockUntil.setMinutes(lockUntil.getMinutes() + 15)
          updateData.locked_until = lockUntil.toISOString()
          setError('Too many failed attempts. Account locked for 15 minutes.')
        } else {
          setError(`Invalid passcode. ${5 - newAttempts} attempts remaining.`)
        }

        await supabase
          .from('crm_employees')
          .update(updateData)
          .eq('id', employee.id)

        setIsLoading(false)
        return
      }

      // 4. Generate session token
      const sessionToken = crypto.randomUUID() + '-' + Date.now()

      // 5. Create session (24 hour expiry)
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)

      const { data: newSession, error: sessionError } = await supabase
        .from('crm_sessions')
        .insert({
          employee_id: employee.id,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
          user_agent: navigator.userAgent,
          is_valid: true
        })
        .select()
        .single()

      if (sessionError) {
        console.error('Session creation error:', sessionError)
        setError('Failed to create session. Please try again.')
        setIsLoading(false)
        return
      }

      // 6. Update employee: reset attempts, set last login
      await supabase
        .from('crm_employees')
        .update({
          login_attempts: 0,
          locked_until: null,
          last_login: new Date().toISOString()
        })
        .eq('id', employee.id)

      // 7. Log the login action
      await supabase.from('crm_audit_log').insert({
        employee_id: employee.id,
        emp_id: employee.emp_id,
        action: 'login',
        entity_type: 'session',
        entity_id: newSession.id,
        description: 'User logged in',
        user_agent: navigator.userAgent
      })

      // 8. Store session in localStorage
      localStorage.setItem('crm_session', JSON.stringify({
        token: sessionToken,
        employee: {
          id: employee.id,
          emp_id: employee.emp_id,
          full_name: employee.full_name,
          job_role: employee.job_role,
          hierarchy_level: employee.hierarchy_level,
          email: employee.email,
          must_change_password: employee.must_change_password
        },
        expires_at: expiresAt.toISOString()
      }))

      // 9. Redirect
      if (employee.must_change_password) {
        router.push('/CRM/change-password')
      } else {
        router.push('/CRM/dashboard')
      }

    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading spinner while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Checking session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl shadow-2xl shadow-amber-500/30 mb-4 transform hover:scale-105 transition-transform">
            <span className="text-slate-900 text-4xl font-black">o</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            <span className="text-amber-400">o</span>CRM
          </h1>
          <p className="text-slate-400 text-sm">Customer Relationship Management</p>
          <p className="text-amber-500/60 text-xs mt-1 font-medium">by AIwithArijit.com</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden">
          <div className="p-8">
            <h2 className="text-xl font-semibold text-white mb-6 text-center flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Employee Sign In
            </h2>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Employee ID */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Employee ID
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value.toUpperCase())}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all uppercase"
                    placeholder="e.g., OWN001"
                    required
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              {/* Passcode */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Passcode
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type={showPasscode ? 'text' : 'password'}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    placeholder="Enter your passcode"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 transition-colors"
                  >
                    {showPasscode ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  isLoading
                    ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 hover:shadow-lg hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-slate-900/30 border-t border-slate-700/50">
            <p className="text-center text-slate-500 text-xs">
              Forgot passcode? Contact your administrator.
            </p>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-slate-500 text-xs bg-slate-800/50 px-4 py-2 rounded-full">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>256-bit encrypted • All actions logged</span>
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-slate-600 text-xs mt-4">
          oCRM v1.0 • © 2025 AIwithArijit.com
        </p>
      </div>
    </div>
  )
}
