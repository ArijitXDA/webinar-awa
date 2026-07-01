'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Template {
  id: string
  template_name: string
  template_content: string
  category: string
  is_active: boolean
  created_at: string
  created_by: string
  created_by_name?: string
}

const CATEGORIES = [
  { value: 'greeting', label: '👋 Greeting' },
  { value: 'follow_up', label: '📞 Follow-up' },
  { value: 'course_info', label: '📚 Course Info' },
  { value: 'payment', label: '💳 Payment' },
  { value: 'reminder', label: '⏰ Reminder' },
  { value: 'thank_you', label: '🙏 Thank You' },
  { value: 'other', label: '📝 Other' }
]

const PLACEHOLDERS = [
  { code: '{{lead.full_name}}', label: 'Lead Name' },
  { code: '{{lead.course}}', label: 'Course Name' },
  { code: '{{employee.full_name}}', label: 'Your Name' },
  { code: '{{company.name}}', label: 'Company Name' }
]

export default function WhatsAppTemplatesPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [search, setSearch] = useState('')

  const [form, setForm] = useState({
    template_name: '',
    template_content: '',
    category: 'greeting',
    is_active: true
  })

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
      await loadTemplates()

    } catch (err) {
      console.error('Session check error:', err)
      router.push('/CRM')
    } finally {
      setLoading(false)
    }
  }

  async function loadTemplates() {
    try {
      const { data, error } = await supabase
        .from('crm_whatsapp_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const { data: emps } = await supabase.from('crm_employees').select('id, full_name')
      const empMap = Object.fromEntries(emps?.map(e => [e.id, e.full_name]) || [])

      const templatesWithNames = data?.map(t => ({
        ...t,
        created_by_name: empMap[t.created_by] || '-'
      })) || []

      setTemplates(templatesWithNames)
    } catch (err) {
      console.error('Error loading templates:', err)
    }
  }

  function openAddModal() {
    setEditingTemplate(null)
    setForm({
      template_name: '',
      template_content: '',
      category: 'greeting',
      is_active: true
    })
    setError('')
    setShowModal(true)
  }

  function openEditModal(template: Template) {
    setEditingTemplate(template)
    setForm({
      template_name: template.template_name,
      template_content: template.template_content,
      category: template.category,
      is_active: template.is_active
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    setError('')

    if (!form.template_name.trim()) {
      setError('Template name is required')
      return
    }

    if (!form.template_content.trim()) {
      setError('Template content is required')
      return
    }

    setSaving(true)

    try {
      if (editingTemplate) {
        const { error: updateError } = await supabase
          .from('crm_whatsapp_templates')
          .update({
            template_name: form.template_name.trim(),
            template_content: form.template_content.trim(),
            category: form.category,
            is_active: form.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTemplate.id)

        if (updateError) throw updateError
        setSuccess('Template updated successfully!')
      } else {
        const { error: insertError } = await supabase
          .from('crm_whatsapp_templates')
          .insert({
            template_name: form.template_name.trim(),
            template_content: form.template_content.trim(),
            category: form.category,
            is_active: form.is_active,
            created_by: currentUser.id
          })

        if (insertError) throw insertError
        setSuccess('Template created successfully!')
      }

      await loadTemplates()
      setShowModal(false)
      setTimeout(() => setSuccess(''), 3000)

    } catch (err: any) {
      console.error('Save error:', err)
      setError(err.message || 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(template: Template) {
    try {
      await supabase
        .from('crm_whatsapp_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id)

      await loadTemplates()
    } catch (err) {
      console.error('Toggle error:', err)
    }
  }

  async function deleteTemplate(template: Template) {
    if (!confirm(`Delete template "${template.template_name}"?`)) return

    try {
      await supabase
        .from('crm_whatsapp_templates')
        .delete()
        .eq('id', template.id)

      await loadTemplates()
      setSuccess('Template deleted!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  function insertPlaceholder(placeholder: string) {
    setForm(prev => ({
      ...prev,
      template_content: prev.template_content + placeholder
    }))
  }

  function previewMessage(template: Template) {
    let preview = template.template_content
      .replace(/\{\{lead\.full_name\}\}/g, 'John Doe')
      .replace(/\{\{lead\.course\}\}/g, 'AI Fundamentals')
      .replace(/\{\{employee\.full_name\}\}/g, currentUser?.full_name || 'Team Member')
      .replace(/\{\{company\.name\}\}/g, 'AIwithArijit')
    return preview
  }

  const filteredTemplates = templates.filter(t => {
    if (filterCategory && t.category !== filterCategory) return false
    if (search) {
      const s = search.toLowerCase()
      if (!t.template_name.toLowerCase().includes(s) && !t.template_content.toLowerCase().includes(s)) return false
    }
    return true
  })

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/CRM/dashboard')} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-white font-bold text-lg">WhatsApp Templates</h1>
                <p className="text-slate-400 text-xs">{templates.length} templates</p>
              </div>
            </div>
            <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Template
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {success && (
          <div className="mb-4 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl">{success}</div>
        )}

        {/* Filters */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates..." className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500" />
            </div>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <div key={template.id} className={`bg-slate-800 border rounded-xl overflow-hidden ${template.is_active ? 'border-slate-700' : 'border-slate-700/50 opacity-60'}`}>
              <div className="p-4 border-b border-slate-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{template.template_name}</h3>
                    <span className="text-xs text-slate-400">
                      {CATEGORIES.find(c => c.value === template.category)?.label}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${template.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                    {template.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="bg-slate-900 rounded-lg p-3 mb-3">
                  <p className="text-slate-300 text-sm whitespace-pre-wrap line-clamp-4">{previewMessage(template)}</p>
                </div>
                <p className="text-xs text-slate-500">Created by {template.created_by_name}</p>
              </div>

              <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-end gap-2">
                <button onClick={() => toggleActive(template)} className={`p-2 rounded-lg transition-colors ${template.is_active ? 'text-green-400 hover:bg-green-500/20' : 'text-slate-400 hover:bg-slate-600'}`} title={template.is_active ? 'Deactivate' : 'Activate'}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {template.is_active ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                </button>
                <button onClick={() => openEditModal(template)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg" title="Edit">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button onClick={() => deleteTemplate(template)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg" title="Delete">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {filteredTemplates.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              No templates found
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-white">
                {editingTemplate ? 'Edit Template' : 'Add Template'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm text-slate-300 mb-1">Template Name *</label>
                <input type="text" value={form.template_name} onChange={(e) => setForm({ ...form, template_name: e.target.value })} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white" placeholder="e.g., Welcome Message" />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Message Content *</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PLACEHOLDERS.map(p => (
                    <button key={p.code} onClick={() => insertPlaceholder(p.code)} type="button" className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs hover:bg-amber-500/30">
                      + {p.label}
                    </button>
                  ))}
                </div>
                <textarea value={form.template_content} onChange={(e) => setForm({ ...form, template_content: e.target.value })} rows={6} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white resize-none" placeholder="Hi {{lead.full_name}}! Welcome to AIwithArijit..." />
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500" />
                <label htmlFor="is_active" className="text-slate-300 text-sm">Active (can be used in lead communications)</label>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Preview</label>
                <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                  <p className="text-green-200 text-sm whitespace-pre-wrap">
                    {form.template_content
                      .replace(/\{\{lead\.full_name\}\}/g, 'John Doe')
                      .replace(/\{\{lead\.course\}\}/g, 'AI Fundamentals')
                      .replace(/\{\{employee\.full_name\}\}/g, currentUser?.full_name || 'Team Member')
                      .replace(/\{\{company\.name\}\}/g, 'AIwithArijit')
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={saving} className={`px-6 py-2.5 rounded-lg font-semibold ${saving ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 text-slate-900'}`}>
                {saving ? 'Saving...' : editingTemplate ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
