'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

// Star Rating Component
function StarRating({ rating, onRate, disabled }: { rating: number, onRate: (r: number) => void, disabled: boolean }) {
  const [hover, setHover] = useState(0)
  
  return (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onRate(star)}
          onMouseEnter={() => !disabled && setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={`text-4xl sm:text-5xl transition-all duration-200 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'}`}
        >
          <span className={`${(hover || rating) >= star ? 'text-yellow-400' : 'text-gray-300'}`}>
            ★
          </span>
        </button>
      ))}
    </div>
  )
}

// Rating Labels
const ratingLabels: { [key: number]: { text: string, emoji: string, color: string } } = {
  1: { text: 'Poor', emoji: '😞', color: 'text-red-500' },
  2: { text: 'Fair', emoji: '😐', color: 'text-orange-500' },
  3: { text: 'Good', emoji: '🙂', color: 'text-yellow-500' },
  4: { text: 'Very Good', emoji: '😊', color: 'text-lime-500' },
  5: { text: 'Excellent!', emoji: '🤩', color: 'text-green-500' },
}

export default function WebinarRatingsPage() {
  // Steps: 'email' -> 'rating' -> 'submitted'
  const [step, setStep] = useState<'email' | 'rating' | 'submitted'>('email')
  
  // Form data
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [userName, setUserName] = useState('')
  const [courseName, setCourseName] = useState('')
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  
  // State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsMobile, setNeedsMobile] = useState(false)
  const [alreadyRated, setAlreadyRated] = useState(false)

  // Step 1: Check email
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      // Check if already rated
      const { data: existingRating } = await supabase
        .from('webinar_ratings')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .single()
      
      if (existingRating) {
        setAlreadyRated(true)
        setStep('submitted')
        setLoading(false)
        return
      }

      // Look up email in registrations
      const { data: registration, error: regError } = await supabase
        .from('qr_landing_registrations')
        .select('full_name, mobile, course_name')
        .eq('email', email.toLowerCase().trim())
        .order('registered_at', { ascending: false })
        .limit(1)
        .single()
      
      if (registration) {
        setUserName(registration.full_name)
        setMobile(registration.mobile || '')
        setCourseName(registration.course_name || '')
        setNeedsMobile(false)
        setStep('rating')
      } else {
        // Email not found - need mobile
        setNeedsMobile(true)
        setStep('rating')
      }
    } catch (err) {
      console.error('Error looking up email:', err)
      // If no record found, ask for mobile
      setNeedsMobile(true)
      setStep('rating')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Submit rating
  async function handleRatingSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (rating === 0) {
      setError('Please select a rating')
      return
    }
    
    if (needsMobile && !mobile.trim()) {
      setError('Please enter your mobile number')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const { error: insertError } = await supabase
        .from('webinar_ratings')
        .insert([{
          email: email.toLowerCase().trim(),
          mobile: mobile.trim() || null,
          full_name: userName || null,
          course_name: courseName || null,
          rating: rating,
          feedback: feedback.trim() || null,
          source: 'whatsapp_campaign',
          rated_at: new Date().toISOString()
        }])
      
      if (insertError) throw insertError
      
      setStep('submitted')
    } catch (err: any) {
      console.error('Error submitting rating:', err)
      if (err.code === '23505') {
        setAlreadyRated(true)
        setStep('submitted')
      } else {
        setError('Failed to submit rating. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
              AI
            </div>
            <span className="text-sm font-bold text-gray-800">WithArijit.com</span>
          </div>
          <div className="h-5 w-px bg-gray-300"></div>
          <div className="flex items-center gap-1.5">
            <img src="/oStaran.png" alt="oStaran" className="w-8 h-8 object-contain" />
            <span className="text-sm font-bold text-gray-800">oStaran.com</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-center">
            <h1 className="text-xl font-bold text-white mb-1">
              {step === 'submitted' ? '🎉 Thank You!' : '⭐ Rate Your Experience'}
            </h1>
            <p className="text-indigo-100 text-sm">
              {step === 'submitted' 
                ? 'Your feedback helps us improve' 
                : 'AI Certification Webinar by Arijit'}
            </p>
          </div>

          <div className="p-6">
            {/* Step 1: Email Entry */}
            {step === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl">📧</span>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Enter the email you used during registration
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                    required
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-70"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Checking...
                    </span>
                  ) : 'Continue →'}
                </button>
              </form>
            )}

            {/* Step 2: Rating */}
            {step === 'rating' && (
              <form onSubmit={handleRatingSubmit} className="space-y-5">
                {/* Greeting */}
                {userName && (
                  <div className="text-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                    <p className="text-green-800 text-sm">
                      Welcome back, <span className="font-bold">{userName}</span>! 👋
                    </p>
                    {courseName && (
                      <p className="text-green-600 text-xs mt-1">
                        {courseName}
                      </p>
                    )}
                  </div>
                )}

                {/* Mobile Input (if needed) */}
                {needsMobile && (
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                    <p className="text-amber-800 text-sm mb-3">
                      📱 We couldn't find your registration. Please enter your mobile:
                    </p>
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="Your mobile number"
                      className="w-full px-4 py-2.5 rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                      required
                    />
                  </div>
                )}

                {/* Star Rating */}
                <div className="text-center py-4">
                  <p className="text-gray-700 font-medium mb-4">How was your experience?</p>
                  <StarRating rating={rating} onRate={setRating} disabled={loading} />
                  {rating > 0 && (
                    <div className={`mt-3 text-lg font-semibold ${ratingLabels[rating].color} animate-fade-in`}>
                      {ratingLabels[rating].emoji} {ratingLabels[rating].text}
                    </div>
                  )}
                </div>

                {/* Feedback (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Any feedback? <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="What did you like? What can we improve?"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm resize-none"
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || rating === 0}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Submitting...
                    </span>
                  ) : 'Submit Rating ⭐'}
                </button>

                {/* Back button */}
                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(''); }}
                  className="w-full py-2 text-gray-500 text-sm hover:text-gray-700"
                >
                  ← Back to email
                </button>
              </form>
            )}

            {/* Step 3: Submitted */}
            {step === 'submitted' && (
              <div className="text-center py-4">
                {alreadyRated ? (
                  <>
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">🙏</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Already Submitted!</h2>
                    <p className="text-gray-600 text-sm mb-6">
                      You've already rated this webinar.<br />Thank you for your feedback!
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">🎉</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Thank You!</h2>
                    <p className="text-gray-600 text-sm mb-2">
                      Your rating has been submitted successfully.
                    </p>
                    {rating > 0 && (
                      <div className="flex justify-center gap-1 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                        ))}
                      </div>
                    )}
                    <p className="text-gray-500 text-xs">
                      Your feedback helps us create better learning experiences.
                    </p>
                  </>
                )}

                {/* CTA */}
                <div className="mt-6 space-y-3">
                  <a
                    href="https://www.AIwithArijit.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-center"
                  >
                    Explore More Courses →
                  </a>
                  <a
                    href="https://www.linkedin.com/in/arijit-chowdhury-86020b19/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all text-center text-sm"
                  >
                    Connect on LinkedIn
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-6">
          © 2025 AIwithArijit.com • oStaran.com
        </p>
      </div>

      {/* Styles */}
      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  )
}
