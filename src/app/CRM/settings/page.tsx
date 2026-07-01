'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'admin'>('profile')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Profile form
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    mobile: '',
    location: '',
    city: ''
  })

  // Password form
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  })

  // Preferences
  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    followupReminders: true,
    dailyDigest: false,
    soundEnabled: true
  })

  // Admin settings
  const [adminSettings, setAdminSettings] = useState({
    defaultLeadScore: 3,
    autoAssignLeads: false,
    requireNotes: true,
    sessionTimeout: 24
  })

  const isAdmin = currentUser && ['owner', 'ea_to_owner', 'director', 'ea_to_director'].includes(currentUser.job_role)

  useEffect(() => {
    checkSessionAndLoad()
  }, [])

  async function checkSessionAndLoad() {
    try {
      const sessionData = localStorage.getItem('crm_session')
      if (!sessionData) {
        router.push('/CRM')
        return
      }

      const session = JSON.parse(sessionData)

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

      setCurrentUser(session.employee)

      // Load profile data
      const { data: empData } = await supabase
        .from('crm_employees')
        .select('*')
        .eq('id', session.employee.id)
        .single()

      if (empData) {
        setProfile({
          full_name: empData.full_name || '',
          email: empData.email || '',
          mobile: empData.mobile || '',
          location: empData.location || '',
          city: empData.city || ''
        })
      }

    } catch (err) {
      console.error('Session check error:', err)
      router.push('/CRM')
    } finally {
      setLoading(false)
    }
  }

  async function saveProfile() {
    setError('')
    setSaving(true)

    try {
      const { error: updateError } = await supabase
        .from('crm_employees')
        .update({
          full_name: profile.full_name,
          email: profile.email,
          mobile: profile.mobile,
          location: profile.location,
          city: profile.city
        })
        .eq('id', currentUser.id)

      if (updateError) throw updateError

      // Update session storage
      const sessionData = JSON.parse(localStorage.getItem('crm_session') || '{}')
      sessionData.employee.full_name = profile.full_name
      localStorage.setItem('crm_session', JSON.stringify(sessionData))

      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)

    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  async function changePassword() {
    setError('')

    if (!passwords.current || !passwords.new || !passwords.confirm) {
      setError('All password fields are required')
      return
    }

    if (passwords.new !== passwords.confirm) {
      setError('New passwords do not match')
      return
    }

    if (passwords.new.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (!/[A-Z]/.test(passwords.new) || !/[a-z]/.test(passwords.new) || !/[0-9]/.test(passwords.new)) {
      setError('Password must contain uppercase, lowercase and number')
      return
    }

    setSaving(true)

    try {
      // Verify current password
      const { data: verifyResult } = await supabase.rpc('verify_employee_passcode', {
        p_emp_id: currentUser.emp_id,
        p_passcode: passwords.current
      })

      if (!verifyResult) {
        setError('Current password is incorrect')
        setSaving(false)
        return
      }

      // Update password
      const { error: updateError } = await supabase.rpc('update_employee_passcode', {
        p_employee_id: currentUser.id,
        p_new_passcode: passwords.new
      })

      if (updateError) throw updateError

      setPasswords({ current: '', new: '', confirm: '' })
      setSuccess('Password changed successfully!')
      setTimeout(() => setSuccess(''), 3000)

    } catch (err: any) {
      setError(err.message || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  function savePreferences() {
    // Save to localStorage (could be saved to DB in production)
    localStorage.setItem('crm_preferences', JSON.stringify(prefs))
    setSuccess('Preferences saved!')
    setTimeout(() => setSuccess(''), 3000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/CRM/dashboard')} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-white font-bold text-lg">Settings</h1>
                <p className="text-slate-400 text-xs">Manage your account</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {success && (
          <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl">{success}</div>
        )}

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full px-4 py-3 rounded-lg text-left flex items-center gap-3 transition-colors ${
                  activeTab === 'profile' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </button>

              <button
                onClick={() => setActiveTab('security')}
                className={`w-full px-4 py-3 rounded-lg text-left flex items-center gap-3 transition-colors ${
                  activeTab === 'security' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Security
              </button>

              <button
                onClick={() => setActiveTab('preferences')}
                className={`w-full px-4 py-3 rounded-lg text-left flex items-center gap-3 transition-colors ${
                  activeTab === 'preferences' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Preferences
              </button>

              {isAdmin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`w-full px-4 py-3 rounded-lg text-left flex items-center gap-3 transition-colors ${
                    activeTab === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Admin
                </button>
              )}
            </nav>

            {/* User Info Card */}
            <div className="mt-6 p-4 bg-slate-800 border border-slate-700 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
                  <span className="text-slate-900 font-bold text-lg">
                    {currentUser?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div>
                  <p className="text-white font-medium">{currentUser?.full_name}</p>
                  <p className="text-slate-400 text-xs">{currentUser?.emp_id}</p>
                  <p className="text-amber-400 text-xs capitalize">{currentUser?.job_role?.replace(/_/g, ' ')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Profile Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Email</label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Mobile</label>
                      <input
                        type="text"
                        value={profile.mobile}
                        onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Location/Address</label>
                      <input
                        type="text"
                        value={profile.location}
                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">City</label>
                      <input
                        type="text"
                        value={profile.city}
                        onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={saveProfile}
                      disabled={saving}
                      className={`px-6 py-2.5 rounded-lg font-semibold ${
                        saving
                          ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-600 text-slate-900'
                      }`}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Change Password</h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-1">New Password</label>
                    <input
                      type="password"
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
                    />
                    <p className="text-slate-500 text-xs mt-1">Min 8 chars, uppercase, lowercase, number</p>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={changePassword}
                      disabled={saving}
                      className={`px-6 py-2.5 rounded-lg font-semibold ${
                        saving
                          ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-600 text-slate-900'
                      }`}
                    >
                      {saving ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Active Sessions</h3>
                  <div className="bg-slate-900 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">Current Session</p>
                          <p className="text-slate-500 text-xs">Active now</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Preferences</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Email Notifications</p>
                      <p className="text-slate-500 text-sm">Receive email updates for important events</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prefs.emailNotifications}
                        onChange={(e) => setPrefs({ ...prefs, emailNotifications: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Follow-up Reminders</p>
                      <p className="text-slate-500 text-sm">Get reminded about pending follow-ups</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prefs.followupReminders}
                        onChange={(e) => setPrefs({ ...prefs, followupReminders: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Daily Digest</p>
                      <p className="text-slate-500 text-sm">Receive daily summary of your tasks</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prefs.dailyDigest}
                        onChange={(e) => setPrefs({ ...prefs, dailyDigest: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Sound Effects</p>
                      <p className="text-slate-500 text-sm">Play sounds for notifications</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prefs.soundEnabled}
                        onChange={(e) => setPrefs({ ...prefs, soundEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={savePreferences}
                      className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg font-semibold"
                    >
                      Save Preferences
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Tab */}
            {activeTab === 'admin' && isAdmin && (
              <div className="space-y-6">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-6">System Settings</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Default Lead Score</label>
                      <select
                        value={adminSettings.defaultLeadScore}
                        onChange={(e) => setAdminSettings({ ...adminSettings, defaultLeadScore: parseInt(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
                      >
                        <option value={1}>1 - Cold Lead</option>
                        <option value={2}>2 - Cool Lead</option>
                        <option value={3}>3 - Neutral</option>
                        <option value={4}>4 - Warm Lead</option>
                        <option value={5}>5 - Hot Lead</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Session Timeout (hours)</label>
                      <select
                        value={adminSettings.sessionTimeout}
                        onChange={(e) => setAdminSettings({ ...adminSettings, sessionTimeout: parseInt(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white"
                      >
                        <option value={1}>1 hour</option>
                        <option value={8}>8 hours</option>
                        <option value={24}>24 hours</option>
                        <option value={72}>3 days</option>
                        <option value={168}>1 week</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
                      <div>
                        <p className="text-white font-medium">Require Notes for Interactions</p>
                        <p className="text-slate-500 text-sm">Make discussion notes mandatory</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={adminSettings.requireNotes}
                          onChange={(e) => setAdminSettings({ ...adminSettings, requireNotes: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => router.push('/CRM/employees')}
                      className="p-4 bg-slate-900 hover:bg-slate-700 rounded-lg text-left transition-colors"
                    >
                      <svg className="w-6 h-6 text-blue-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <p className="text-white font-medium">Manage Employees</p>
                      <p className="text-slate-500 text-xs">Add, edit, deactivate</p>
                    </button>

                    <button
                      onClick={() => router.push('/CRM/lead-assignment')}
                      className="p-4 bg-slate-900 hover:bg-slate-700 rounded-lg text-left transition-colors"
                    >
                      <svg className="w-6 h-6 text-amber-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <p className="text-white font-medium">Lead Assignment</p>
                      <p className="text-slate-500 text-xs">Bulk assign leads</p>
                    </button>

                    <button
                      onClick={() => router.push('/CRM/activity')}
                      className="p-4 bg-slate-900 hover:bg-slate-700 rounded-lg text-left transition-colors"
                    >
                      <svg className="w-6 h-6 text-purple-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-white font-medium">Audit Log</p>
                      <p className="text-slate-500 text-xs">View all activities</p>
                    </button>

                    <button
                      onClick={() => router.push('/CRM/analytics')}
                      className="p-4 bg-slate-900 hover:bg-slate-700 rounded-lg text-left transition-colors"
                    >
                      <svg className="w-6 h-6 text-green-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="text-white font-medium">Analytics</p>
                      <p className="text-slate-500 text-xs">View reports</p>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
