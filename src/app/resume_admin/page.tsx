'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Admin credentials (same as main admin)
const ADMIN_USERNAME = 'arijitwith'
const ADMIN_PASSWORD = 'reach500'

interface Resume {
  id: string
  resume_id: number
  full_name: string
  email: string
  mobile: string
  location: string
  experience: string
  category: string
  sub_category: string
  designation: string
  skills: string[]
  linkedin_url: string | null
  portfolio_url: string | null
  preferred_locations: string | null
  open_to_remote: string | null
  resume_url: string
  resume_filename: string
  status: string
  created_at: string
}

const CATEGORY_LABELS: { [key: string]: string } = {
  'non_tech': '💼 Non-Tech',
  'tech': '💻 Tech',
  'freshers': '🎓 Freshers',
  'leadership': '👔 Leadership'
}

export default function ResumeAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    category: '',
    subCategory: '',
    experience: '',
    dateFrom: '',
    dateTo: ''
  })
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    byCategory: {} as { [key: string]: number }
  })

  const [subCategoryOptions, setSubCategoryOptions] = useState<string[]>([])
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null)

  useEffect(() => {
    const auth = sessionStorage.getItem('resume_admin_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
      fetchResumes()
    }
  }, [])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      sessionStorage.setItem('resume_admin_auth', 'true')
      setLoginError('')
      fetchResumes()
    } else {
      setLoginError('Invalid credentials')
    }
  }

  function handleLogout() {
    setIsAuthenticated(false)
    sessionStorage.removeItem('resume_admin_auth')
  }

  async function fetchResumes() {
    setLoading(true)
    try {
      let query = supabase
        .from('resume_repository')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .limit(500)

      if (filters.category) {
        query = query.eq('category', filters.category)
      }
      if (filters.subCategory) {
        query = query.eq('sub_category', filters.subCategory)
      }
      if (filters.experience) {
        query = query.eq('experience', filters.experience)
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59')
      }

      const { data, error } = await query

      if (error) throw error
      
      let filteredData = data || []
      
      // Client-side search
      if (search.trim()) {
        const searchLower = search.toLowerCase()
        filteredData = filteredData.filter(r =>
          r.full_name?.toLowerCase().includes(searchLower) ||
          r.email?.toLowerCase().includes(searchLower) ||
          r.mobile?.includes(search) ||
          r.designation?.toLowerCase().includes(searchLower) ||
          r.skills?.some(s => s.toLowerCase().includes(searchLower))
        )
      }

      setResumes(filteredData)
      calculateStats(data || [])
      
      // Get unique sub-categories
      if (data) {
        const subs = [...new Set(data.map(d => d.sub_category).filter(Boolean))]
        setSubCategoryOptions(subs.sort())
      }
    } catch (error) {
      console.error('Error fetching resumes:', error)
    } finally {
      setLoading(false)
    }
  }

  function calculateStats(data: Resume[]) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    const byCategory: { [key: string]: number } = {}
    data.forEach(r => {
      byCategory[r.category] = (byCategory[r.category] || 0) + 1
    })

    setStats({
      total: data.length,
      today: data.filter(r => new Date(r.created_at) >= today).length,
      thisWeek: data.filter(r => new Date(r.created_at) >= weekAgo).length,
      byCategory
    })
  }

  function handleSort(column: string) {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchResumes()
    }
  }, [sortBy, sortOrder])

  function exportToCSV() {
    if (resumes.length === 0) return

    const headers = ['ID', 'Name', 'Email', 'Mobile', 'Location', 'Experience', 'Category', 'Sub-Category', 'Role', 'Skills', 'LinkedIn', 'Portfolio', 'Open to Remote', 'Resume URL', 'Submitted']
    const rows = resumes.map(r => [
      r.resume_id,
      r.full_name,
      r.email,
      r.mobile,
      r.location,
      r.experience,
      r.category,
      r.sub_category,
      r.designation,
      r.skills?.join(', ') || '',
      r.linkedin_url || '',
      r.portfolio_url || '',
      r.open_to_remote || '',
      r.resume_url,
      new Date(r.created_at).toLocaleString('en-IN')
    ])

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resume_repository_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  function clearFilters() {
    setSearch('')
    setFilters({
      category: '',
      subCategory: '',
      experience: '',
      dateFrom: '',
      dateTo: ''
    })
  }

  function SortIcon({ column }: { column: string }) {
    if (sortBy !== column) return <span className="text-gray-300 ml-1">↕</span>
    return <span className="text-indigo-600 ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">📄</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Resume Admin</h1>
            <p className="text-gray-500 text-sm mt-1">AIwithArijit.com Repository</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter password"
              />
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button
              type="submit"
              className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-shadow"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">📄</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Resume Repository Admin</h1>
              <p className="text-xs text-gray-500">AIwithArijit.com</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/admin"
              className="px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg"
            >
              ← Main Admin
            </a>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-sm text-gray-500">Total Resumes</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-sm text-gray-500">Today</p>
            <p className="text-3xl font-bold text-green-600">{stats.today}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-sm text-gray-500">💼 Non-Tech</p>
            <p className="text-3xl font-bold text-blue-600">{stats.byCategory['non_tech'] || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-sm text-gray-500">💻 Tech</p>
            <p className="text-3xl font-bold text-purple-600">{stats.byCategory['tech'] || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-sm text-gray-500">🎓 Freshers</p>
            <p className="text-3xl font-bold text-amber-600">{stats.byCategory['freshers'] || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <p className="text-sm text-gray-500">👔 Leadership</p>
            <p className="text-3xl font-bold text-indigo-600">{stats.byCategory['leadership'] || 0}</p>
          </div>
        </div>

        {/* Filters & Export */}
        <div className="bg-white rounded-xl p-4 shadow-sm border mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">🔍 Search & Filter</h3>
            <div className="flex gap-2">
              <button onClick={clearFilters} className="text-xs text-indigo-600 hover:underline">Clear All</button>
              <button
                onClick={exportToCSV}
                className="px-4 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                📥 Export CSV
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Search (Name, Email, Mobile, Role, Skills)</label>
              <input
                type="text"
                className="w-full px-3 py-1.5 border rounded text-sm"
                placeholder="🔍 Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select
                className="w-full px-2 py-1.5 border rounded text-sm"
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value, subCategory: ''})}
              >
                <option value="">All</option>
                <option value="non_tech">💼 Non-Tech</option>
                <option value="tech">💻 Tech</option>
                <option value="freshers">🎓 Freshers</option>
                <option value="leadership">👔 Leadership</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sub-Category</label>
              <select
                className="w-full px-2 py-1.5 border rounded text-sm"
                value={filters.subCategory}
                onChange={(e) => setFilters({...filters, subCategory: e.target.value})}
              >
                <option value="">All</option>
                {subCategoryOptions.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date From</label>
              <input
                type="date"
                className="w-full px-2 py-1.5 border rounded text-sm"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date To</label>
              <input
                type="date"
                className="w-full px-2 py-1.5 border rounded text-sm"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchResumes}
                className="w-full py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Resumes Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : resumes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No resumes found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th 
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('full_name')}
                    >
                      Name <SortIcon column="full_name" />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th 
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('category')}
                    >
                      Category <SortIcon column="category" />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th 
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('experience')}
                    >
                      Exp <SortIcon column="experience" />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skills</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resume</th>
                    <th 
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('created_at')}
                    >
                      Submitted <SortIcon column="created_at" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {resumes.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900">{r.full_name}</div>
                        {r.linkedin_url && (
                          <a href={r.linkedin_url} target="_blank" className="text-xs text-blue-600 hover:underline">LinkedIn</a>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-600 text-xs">{r.email}</span>
                            <a
                              href={`mailto:${r.email}`}
                              className="w-5 h-5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded flex items-center justify-center"
                              title="Email"
                            >
                              <span className="text-xs">📧</span>
                            </a>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-600 text-xs">{r.mobile}</span>
                            <a
                              href={`tel:${r.mobile}`}
                              className="w-5 h-5 bg-green-100 hover:bg-green-200 text-green-600 rounded flex items-center justify-center"
                              title="Call"
                            >
                              <span className="text-xs">📞</span>
                            </a>
                            <a
                              href={`https://wa.me/${r.mobile.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${r.full_name}!\n\nThanks for uploading your resume to AIwithArijit.com\n\nRegards,\nTeam AIwithArijit`)}`}
                              target="_blank"
                              className="w-5 h-5 bg-emerald-100 hover:bg-emerald-200 text-emerald-600 rounded flex items-center justify-center"
                              title="WhatsApp"
                            >
                              <span className="text-xs">💬</span>
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs">{r.location}</td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs block w-fit">
                          {CATEGORY_LABELS[r.category] || r.category}
                        </span>
                        <span className="text-xs text-gray-500">{r.sub_category}</span>
                      </td>
                      <td className="px-3 py-3 text-gray-700 text-xs max-w-[120px] truncate" title={r.designation}>
                        {r.designation}
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs">{r.experience}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {r.skills?.slice(0, 3).map((skill, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {skill}
                            </span>
                          ))}
                          {r.skills?.length > 3 && (
                            <span className="text-xs text-gray-400">+{r.skills.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <a
                          href={r.resume_url}
                          target="_blank"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded text-xs"
                        >
                          📄 View
                        </a>
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          Showing {resumes.length} resume{resumes.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}
