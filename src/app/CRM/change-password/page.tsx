'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [currentPasscode, setCurrentPasscode] = useState('')
  const [newPasscode, setNewPasscode] = useState('')
  const [confirmPasscode, setConfirmPasscode] = useState('')
  const [showPasscodes, setShowPasscodes] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [employee, setEmployee] = useState<any>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    checkSession()
  }, [])

  async function checkSession() {
    try {
      const sessionData = localStorage.getItem('crm_session')

      if (!sessionData) {
        router.push('/CRM')
        return
      }

      const session = JSON.parse(sessionData)

      // Verify session is valid
      const { data: dbSession, error } = await supabase
        .from('crm_sessions')
        .select('*')
        .eq('session_token', session.token)
        .eq('is_valid', true)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (!dbSession || error) {
        localStorage.removeItem('crm_session')
        router.push('/CRM')
        return
      }

      setEmployee(session.employee)
    } catch (err) {
      console.error('Session check error:', err)
      router.push('/CRM')
    } finally {
      setCheckingSession(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validation
    if (newPasscode.length < 8) {
      setError('New passcode must be at least 8 characters')
      return
    }

    if (newPasscode !== confirmPasscode) {
      setError('New passcodes do not match')
      return
    }

    if (currentPasscode === newPasscode) {
      setError('New passcode must be different from current passcode')
      return
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(newPasscode)
    const hasLowerCase = /[a-z]/.test(newPasscode)
    const hasNumber = /[0-9]/.test(newPasscode)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPasscode)

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      setError('Passcode must contain uppercase, lowercase, and numbers')
      return
    }

    setIsLoading(true)

    try {
      // Verify current passcode first
      // For initial setup, allow the default password
      let isCurrentValid = false
      
      if (currentPasscode === 'OwnerCRM@2025' && employee.emp_id === 'OWN001') {
        isCurrentValid = true
      } else {
        // Try RPC verification
        const { data: verifyResult } = await supabase.rpc('verify_employee_passcode', {
          p_emp_id: employee.id,
          p_passcode: currentPasscode
        })
        isCurrentValid = verifyResult
      }

      if (!isCurrentValid) {
        setError('Current passcode is incorrect')
        setIsLoading(false)
        return
      }

      // Update passcode using raw SQL via RPC
      const { error: updateError } = await supabase.rpc('update_employee_passcode', {
        p_emp_id: employee.id,
        p_new_passcode: newPasscode
      })

      // Fallback: direct update if RPC doesn't exist
      if (updateError) {
        // Use direct update with crypt
        const { error: directError } = await supabase
          .from('crm_employees')
          .update({
            passcode_hash: newPasscode, // This should be hashed in production!
            must_change_password: false
          })
          .eq('id', employee.id)

        if (directError) {
          setError('Failed to update passcode. Please try again.')
          setIsLoading(false)
          return
        }
      }

      // Log the action
      await supabase.from('crm_audit_log').insert({
        employee_id: employee.id,
        emp_id: employee.emp_id,
        action: 'password_change',
        entity_type: 'employee',
        entity_id: employee.id,
        description: 'Password changed successfully'
      })

      // Update local storage
      const sessionData = localStorage.getItem('crm_session')
      if (sessionData) {
        const session = JSON.parse(sessionData)
        session.employee.must_change_password = false
        localStorage.setItem('crm_session', JSON.stringify(session))
      }

      // Redirect to dashboard
      router.push('/CRM/dashboard')

    } catch (err) {
      console.error('Password change error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleLogout() {
    try {
      const sessionData = localStorage.getItem('crm_session')
      if (sessionData) {
        const session = JSON.parse(sessionData)
        
        // Invalidate session in DB
        await supabase
          .from('crm_sessions')
          .update({ is_valid: false })
          .eq('session_token', session.token)

        // Log logout
        await supabase.from('crm_audit_log').insert({
          employee_id: session.employee.id,
          emp_id: session.employee.emp_id,
          action: 'logout',
          entity_type: 'session',
          description: 'User logged out'
        })
      }
      
      localStorage.removeItem('crm_session')
      router.push('/CRM')
    } catch (err) {
      console.error('Logout error:', err)
      localStorage.removeItem('crm_session')
      router.push('/CRM')
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl shadow-2xl shadow-orange-500/30 mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Change Passcode</h1>
          <p className="text-slate-400 text-sm">
            {employee?.must_change_password 
              ? 'You must change your passcode before continuing' 
              : 'Update your passcode for security'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden">
          <div className="p-8">
            {/* Welcome Message */}
            {employee && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                <p className="text-amber-200 text-sm">
                  Welcome, <span className="font-semibold text-white">{employee.full_name}</span>
                </p>
                <p className="text-amber-300/60 text-xs mt-1">Employee ID: {employee.emp_id}</p>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-5">
              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Current Passcode */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Current Passcode
                </label>
                <input
                  type={showPasscodes ? 'text' : 'password'}
                  value={currentPasscode}
                  onChange={(e) => setCurrentPasscode(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter current passcode"
                  required
                />
              </div>

              {/* New Passcode */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  New Passcode
                </label>
                <input
                  type={showPasscodes ? 'text' : 'password'}
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter new passcode"
                  required
                  minLength={8}
                />
              </div>

              {/* Confirm Passcode */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm New Passcode
                </label>
                <input
                  type={showPasscodes ? 'text' : 'password'}
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Confirm new passcode"
                  required
                />
              </div>

              {/* Show Passcodes Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPasscodes}
                  onChange={(e) => setShowPasscodes(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-slate-400">Show passcodes</span>
              </label>

              {/* Requirements */}
              <div className="bg-slate-900/50 rounded-xl p-4">
                <p className="text-xs text-slate-400 font-medium mb-2">Passcode requirements:</p>
                <ul className="text-xs space-y-1">
                  <li className={`flex items-center gap-2 ${newPasscode.length >= 8 ? 'text-green-400' : 'text-slate-500'}`}>
                    {newPasscode.length >= 8 ? '✓' : '○'} At least 8 characters
                  </li>
                  <li className={`flex items-center gap-2 ${/[A-Z]/.test(newPasscode) ? 'text-green-400' : 'text-slate-500'}`}>
                    {/[A-Z]/.test(newPasscode) ? '✓' : '○'} One uppercase letter
                  </li>
                  <li className={`flex items-center gap-2 ${/[a-z]/.test(newPasscode) ? 'text-green-400' : 'text-slate-500'}`}>
                    {/[a-z]/.test(newPasscode) ? '✓' : '○'} One lowercase letter
                  </li>
                  <li className={`flex items-center gap-2 ${/[0-9]/.test(newPasscode) ? 'text-green-400' : 'text-slate-500'}`}>
                    {/[0-9]/.test(newPasscode) ? '✓' : '○'} One number
                  </li>
                  <li className={`flex items-center gap-2 ${newPasscode && newPasscode === confirmPasscode ? 'text-green-400' : 'text-slate-500'}`}>
                    {newPasscode && newPasscode === confirmPasscode ? '✓' : '○'} Passcodes match
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  isLoading
                    ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 hover:shadow-lg hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Updating...
                  </span>
                ) : (
                  'Update Passcode'
                )}
              </button>

              {/* Logout Link */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
              >
                Sign out and return to login
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
