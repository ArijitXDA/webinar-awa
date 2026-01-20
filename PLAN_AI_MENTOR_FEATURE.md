# Implementation Plan: "Collaborate with oStaran" AI Mentor Feature

## Executive Summary
Add an AI-powered sales assistant that analyzes lead history across multiple data sources and provides personalized recommendations to help employees convert leads into customers using OpenAI and Grok APIs.

---

## 1. Feature Overview

### User Flow
1. **Trigger**: Employee clicks "🤖 AI Mentor" button next to a lead in `/CRM/leads`
2. **Data Collection**: System gathers lead history from 9+ database tables
3. **Context Upload**: Employee can optionally upload WhatsApp chat or call transcripts
4. **AI Analysis**: OpenAI/Grok analyzes data and generates recommendations
5. **Actionable Insights**: Employee receives guidance on when, how, and what to pitch

### Key Capabilities
- ✅ Historical context analysis across all customer touchpoints
- ✅ Communication mode recommendation (Phone, WhatsApp, Meeting, etc.)
- ✅ Product pitch customization based on lead profile
- ✅ Success probability scoring
- ✅ Conversation transcript upload for deeper analysis
- ✅ Follow-up timing optimization

---

## 2. Database Schema Changes

### New Tables to Create

#### Table 1: `crm_ai_mentor_sessions`
```sql
CREATE TABLE crm_ai_mentor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id VARCHAR(50) NOT NULL REFERENCES crm_leads(lead_id),
  employee_id UUID NOT NULL REFERENCES crm_employees(id),
  session_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Context data
  lead_context JSONB,  -- Aggregated data from all sources
  whatsapp_transcript TEXT,  -- Uploaded WhatsApp chat
  call_transcript TEXT,  -- Uploaded call/meeting notes

  -- AI Provider
  ai_provider VARCHAR(20) CHECK (ai_provider IN ('openai', 'grok')),
  model_used VARCHAR(50),  -- e.g., 'gpt-4', 'grok-2'

  -- AI Recommendations
  ai_response JSONB,  -- Full AI response
  recommended_timing TEXT,  -- When to reach out
  recommended_mode VARCHAR(50),  -- Communication mode
  recommended_product TEXT,  -- Product to pitch
  pitch_suggestion TEXT,  -- Suggested pitch
  tone_guidance TEXT,  -- Tone recommendations
  success_probability DECIMAL(5,2),  -- 0-100%
  estimated_meetings_required INT,
  probable_conversion_date DATE,

  -- Employee Actions
  employee_rating INT CHECK (employee_rating BETWEEN 1 AND 5),  -- Rating of AI help
  employee_feedback TEXT,
  action_taken TEXT,  -- What employee did after seeing recommendations

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_sessions_lead ON crm_ai_mentor_sessions(lead_id);
CREATE INDEX idx_ai_sessions_employee ON crm_ai_mentor_sessions(employee_id);
CREATE INDEX idx_ai_sessions_date ON crm_ai_mentor_sessions(session_date);
```

#### Table 2: `crm_ai_mentor_analytics`
```sql
CREATE TABLE crm_ai_mentor_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES crm_ai_mentor_sessions(id),

  -- Performance Tracking
  recommendation_followed BOOLEAN,
  actual_conversion_date DATE,
  actual_meetings_required INT,
  recommendation_accuracy_score DECIMAL(5,2),  -- How accurate was AI prediction

  -- ROI Metrics
  time_to_conversion_days INT,
  ai_contribution_score INT CHECK (ai_contribution_score BETWEEN 1 AND 10),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 3. Data Sources for AI Context

### Tables to Query (Read-Only Access)

| Table Name | Data to Extract | Purpose |
|------------|-----------------|---------|
| **crm_leads** | Lead profile, status, source, score, course interest | Core lead information |
| **crm_lead_interactions** | All past interactions, notes, sentiment | Engagement history |
| **certificates** | Completed courses, achievement dates | Past engagement/success |
| **contact_submissions** | Initial inquiry details, pain points | Original intent |
| **lead_gen_response** | Survey/form responses | Interest indicators |
| **quiz_responses** | Quiz scores, topics of interest | Knowledge level |
| **student_master** | Student profile if existing customer | Existing relationship |
| **users** | Account activity, login history | Platform engagement |
| **webinar_ratings** | Webinar attendance, feedback scores | Event participation |
| **crm_employees** | Assigned employee profile, expertise | Relationship context |

### Data Aggregation Query (RPC Function)
```sql
CREATE OR REPLACE FUNCTION get_lead_ai_context(p_lead_id VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_context JSONB;
BEGIN
  SELECT jsonb_build_object(
    'lead_profile', (
      SELECT row_to_json(l.*)
      FROM crm_leads l
      WHERE l.lead_id = p_lead_id
    ),
    'interactions', (
      SELECT jsonb_agg(row_to_json(i.*) ORDER BY i.interaction_date DESC)
      FROM crm_lead_interactions i
      WHERE i.lead_id = p_lead_id
    ),
    'certificates', (
      SELECT jsonb_agg(row_to_json(c.*))
      FROM certificates c
      WHERE c.email = (SELECT email FROM crm_leads WHERE lead_id = p_lead_id)
    ),
    'contact_history', (
      SELECT jsonb_agg(row_to_json(cs.*))
      FROM contact_submissions cs
      WHERE cs.email = (SELECT email FROM crm_leads WHERE lead_id = p_lead_id)
    ),
    'lead_responses', (
      SELECT jsonb_agg(row_to_json(lr.*))
      FROM lead_gen_response lr
      WHERE lr.mobile = (SELECT mobile FROM crm_leads WHERE lead_id = p_lead_id)
    ),
    'quiz_history', (
      SELECT jsonb_agg(row_to_json(qr.*))
      FROM quiz_responses qr
      WHERE qr.email = (SELECT email FROM crm_leads WHERE lead_id = p_lead_id)
    ),
    'student_profile', (
      SELECT row_to_json(sm.*)
      FROM student_master sm
      WHERE sm.email = (SELECT email FROM crm_leads WHERE lead_id = p_lead_id)
    ),
    'user_activity', (
      SELECT row_to_json(u.*)
      FROM users u
      WHERE u.email = (SELECT email FROM crm_leads WHERE lead_id = p_lead_id)
    ),
    'webinar_engagement', (
      SELECT jsonb_agg(row_to_json(wr.*))
      FROM webinar_ratings wr
      WHERE wr.email = (SELECT email FROM crm_leads WHERE lead_id = p_lead_id)
    ),
    'assigned_employee', (
      SELECT row_to_json(e.*)
      FROM crm_employees e
      WHERE e.id = (SELECT assigned_to FROM crm_leads WHERE lead_id = p_lead_id)
    )
  ) INTO v_context;

  RETURN v_context;
END;
$$;

GRANT EXECUTE ON FUNCTION get_lead_ai_context TO anon, authenticated;
```

---

## 4. UI/UX Design

### A. Add Button to Lead Grid

**Location:** `/src/app/CRM/leads/page.tsx` - Actions column (line ~635)

```tsx
{/* AI Mentor Button - Add as 6th button */}
<button
  onClick={() => openAIMentorModal(lead)}
  className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-slate-600 rounded-lg transition-colors"
  title="AI Mentor"
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
</button>
```

### B. AI Mentor Modal Design

**Modal Structure:**
```tsx
{showAIMentorModal && selectedLead && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
    <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg>🤖</svg> AI Mentor: How to Convert {selectedLead.full_name}
          </h2>
          <p className="text-purple-100 text-sm">
            Lead Score: {selectedLead.lead_score}★ | Status: {selectedLead.lead_status}
          </p>
        </div>
        <button onClick={closeModal}>×</button>
      </div>

      {/* Body - 3 Column Layout */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">

          {/* Column 1: Context & Upload */}
          <div className="space-y-4">
            <LeadContextPanel context={leadContext} />
            <TranscriptUploadPanel
              onUploadWhatsApp={handleWhatsAppUpload}
              onUploadCall={handleCallUpload}
            />
          </div>

          {/* Column 2: AI Analysis (Main) */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <AIThinkingAnimation />
            ) : aiRecommendations ? (
              <>
                <RecommendationCard
                  title="⏰ Best Time to Reach Out"
                  content={aiRecommendations.recommended_timing}
                />
                <RecommendationCard
                  title="📱 Communication Mode"
                  content={aiRecommendations.recommended_mode}
                />
                <RecommendationCard
                  title="🎯 Product & Pitch"
                  product={aiRecommendations.recommended_product}
                  pitch={aiRecommendations.pitch_suggestion}
                  tone={aiRecommendations.tone_guidance}
                />
                <SuccessPredictionCard
                  probability={aiRecommendations.success_probability}
                  meetings={aiRecommendations.estimated_meetings_required}
                  conversionDate={aiRecommendations.probable_conversion_date}
                />
              </>
            ) : (
              <button onClick={getAIRecommendations}>
                Get AI Recommendations
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700 px-6 py-4 flex justify-between items-center">
        <RatingComponent onRate={handleRating} />
        <div className="flex gap-3">
          <button onClick={applyRecommendations}>Apply Suggestions</button>
          <button onClick={closeModal}>Close</button>
        </div>
      </div>

    </div>
  </div>
)}
```

---

## 5. AI Integration Architecture

### A. Environment Variables

Add to `.env.local`:
```env
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=2000

# Grok Configuration
GROK_API_KEY=xai-...
GROK_MODEL=grok-2-latest
GROK_MAX_TOKENS=2000

# AI Feature Toggle
AI_MENTOR_ENABLED=true
AI_PROVIDER=openai  # or 'grok' or 'both'
```

### B. API Route Structure

**Create:** `/src/app/api/ai-mentor/analyze/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { leadId, employeeId, whatsappTranscript, callTranscript } = await request.json()

    // 1. Fetch lead context from database
    const { data: context } = await supabase.rpc('get_lead_ai_context', {
      p_lead_id: leadId
    })

    // 2. Build AI prompt
    const prompt = buildAIPrompt(context, whatsappTranscript, callTranscript)

    // 3. Call OpenAI API
    const aiResponse = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: SALES_MENTOR_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })

    // 4. Parse AI response
    const recommendations = JSON.parse(aiResponse.choices[0].message.content)

    // 5. Save session to database
    const { data: session } = await supabase
      .from('crm_ai_mentor_sessions')
      .insert({
        lead_id: leadId,
        employee_id: employeeId,
        lead_context: context,
        whatsapp_transcript: whatsappTranscript,
        call_transcript: callTranscript,
        ai_provider: 'openai',
        model_used: process.env.OPENAI_MODEL,
        ai_response: recommendations,
        recommended_timing: recommendations.timing,
        recommended_mode: recommendations.communication_mode,
        recommended_product: recommendations.product,
        pitch_suggestion: recommendations.pitch,
        tone_guidance: recommendations.tone,
        success_probability: recommendations.success_probability,
        estimated_meetings_required: recommendations.meetings_required,
        probable_conversion_date: recommendations.probable_conversion_date
      })
      .select()
      .single()

    return NextResponse.json({
      success: true,
      session_id: session.id,
      recommendations
    })

  } catch (error) {
    console.error('AI Mentor API Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}
```

### C. AI Prompt Engineering

```typescript
const SALES_MENTOR_SYSTEM_PROMPT = `You are "oStaran AI Mentor", an expert sales assistant helping employees convert leads into customers for AI training programs and courses.

Your role:
1. Analyze all available data about the lead (interactions, webinar attendance, quiz scores, etc.)
2. Provide specific, actionable recommendations
3. Be realistic but optimistic
4. Focus on customer success and genuine value creation

Output Format (JSON):
{
  "timing": "When to reach out (specific day/time with reasoning)",
  "communication_mode": "Best mode (Phone/WhatsApp/Virtual Meeting/In-Person/etc) with reasoning",
  "product": "Which course/program to recommend",
  "pitch": "Customized pitch paragraph (2-3 sentences)",
  "tone": "Tone guidance (professional/friendly/consultative/etc)",
  "success_probability": 75.5,  // 0-100
  "meetings_required": 2,
  "probable_conversion_date": "2026-02-15",
  "reasoning": "Detailed analysis of why these recommendations",
  "objection_handling": "Anticipated objections and responses",
  "referral_strategy": "How to ask for referrals if conversion fails"
}

Important:
- Base recommendations on actual data, not assumptions
- Consider past interaction patterns
- Factor in lead score and engagement history
- Suggest next best action if conversion seems unlikely
- Always maintain ethical sales practices`

function buildAIPrompt(context: any, whatsapp?: string, call?: string): string {
  return `
Analyze this lead and provide sales recommendations:

## Lead Profile
Name: ${context.lead_profile.full_name}
Course Interest: ${context.lead_profile.course}
Lead Score: ${context.lead_profile.lead_score}/5
Status: ${context.lead_profile.lead_status}
Source: ${context.lead_profile.lead_source}
For Whom: ${context.lead_profile.for_whom}

## Past Interactions (${context.interactions?.length || 0} total)
${JSON.stringify(context.interactions, null, 2)}

## Certificates & Completions
${JSON.stringify(context.certificates, null, 2)}

## Webinar Engagement
${JSON.stringify(context.webinar_engagement, null, 2)}

## Quiz History
${JSON.stringify(context.quiz_history, null, 2)}

${whatsapp ? `## WhatsApp Chat History\n${whatsapp}\n` : ''}
${call ? `## Call/Meeting Transcript\n${call}\n` : ''}

## Assigned Employee
${JSON.stringify(context.assigned_employee, null, 2)}

Based on this comprehensive data, provide your recommendations in JSON format.
  `.trim()
}
```

### D. Alternative: Grok API Integration

**Create:** `/src/app/api/ai-mentor/analyze-grok/route.ts`

```typescript
// Similar structure but using Grok API
// Grok is faster for real-time analysis
// OpenAI is better for nuanced recommendations

export async function POST(request: NextRequest) {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'grok-2-latest',
      messages: [/* ... */],
      temperature: 0.7
    })
  })

  // Process and save...
}
```

---

## 6. File Upload Component

**Create:** `/src/components/TranscriptUpload.tsx`

```tsx
'use client'

import { useState } from 'react'

interface TranscriptUploadProps {
  onUploadWhatsApp: (text: string) => void
  onUploadCall: (text: string) => void
}

export function TranscriptUploadPanel({ onUploadWhatsApp, onUploadCall }: TranscriptUploadProps) {
  const [whatsappText, setWhatsappText] = useState('')
  const [callText, setCallText] = useState('')

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'whatsapp' | 'call'
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Read text file
    const text = await file.text()

    if (type === 'whatsapp') {
      setWhatsappText(text)
      onUploadWhatsApp(text)
    } else {
      setCallText(text)
      onUploadCall(text)
    }
  }

  return (
    <div className="bg-slate-700 rounded-xl p-4 space-y-4">
      <h3 className="text-white font-semibold">📤 Upload Context</h3>

      {/* WhatsApp Upload */}
      <div>
        <label className="block text-sm text-slate-300 mb-2">
          WhatsApp Chat (.txt)
        </label>
        <input
          type="file"
          accept=".txt"
          onChange={(e) => handleFileUpload(e, 'whatsapp')}
          className="w-full text-sm text-slate-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-purple-600 file:text-white
            hover:file:bg-purple-700 cursor-pointer"
        />
        {whatsappText && (
          <p className="text-xs text-green-400 mt-1">
            ✓ Uploaded ({whatsappText.length} characters)
          </p>
        )}
      </div>

      {/* Call Transcript Upload */}
      <div>
        <label className="block text-sm text-slate-300 mb-2">
          Call/Meeting Notes (.txt)
        </label>
        <input
          type="file"
          accept=".txt"
          onChange={(e) => handleFileUpload(e, 'call')}
          className="w-full text-sm text-slate-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-600 file:text-white
            hover:file:bg-blue-700 cursor-pointer"
        />
        {callText && (
          <p className="text-xs text-green-400 mt-1">
            ✓ Uploaded ({callText.length} characters)
          </p>
        )}
      </div>

      {/* Manual Text Input Option */}
      <div>
        <label className="block text-sm text-slate-300 mb-2">
          Or paste manually:
        </label>
        <textarea
          rows={4}
          placeholder="Paste WhatsApp chat or call notes here..."
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500"
          onChange={(e) => {
            setWhatsappText(e.target.value)
            onUploadWhatsApp(e.target.value)
          }}
        />
      </div>
    </div>
  )
}
```

---

## 7. Package Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "openai": "^4.24.1",
    "@supabase/supabase-js": "^2.39.0"
  }
}
```

Install:
```bash
npm install openai
```

---

## 8. Security Considerations

### API Key Protection
- ✅ Never expose API keys in client-side code
- ✅ Use Next.js API routes (server-side only)
- ✅ Store keys in environment variables
- ✅ Use Supabase RLS for database security

### Data Privacy
- ✅ Encrypt sensitive transcripts before storing
- ✅ Add RLS policies to `crm_ai_mentor_sessions` table
- ✅ Log AI API calls for audit trail
- ✅ Allow employees to delete AI session data

### RLS Policies

```sql
-- Only allow employees to see their own AI sessions
CREATE POLICY "Employees can view own AI sessions"
ON crm_ai_mentor_sessions
FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

-- Only allow employees to create sessions for their assigned leads
CREATE POLICY "Employees can create AI sessions for assigned leads"
ON crm_ai_mentor_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM crm_leads l
    WHERE l.lead_id = lead_id
      AND l.assigned_to = auth.uid()
  )
);
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create database tables and RPC functions
- [ ] Add AI Mentor button to leads grid
- [ ] Build basic modal UI
- [ ] Implement context aggregation query

### Phase 2: AI Integration (Week 2-3)
- [ ] Set up OpenAI API integration
- [ ] Create API routes for AI analysis
- [ ] Implement prompt engineering
- [ ] Add Grok API as alternative

### Phase 3: File Upload & UX (Week 3-4)
- [ ] Build transcript upload component
- [ ] Add text file parsing
- [ ] Create recommendation display cards
- [ ] Implement success prediction visuals

### Phase 4: Analytics & Feedback (Week 4-5)
- [ ] Add employee rating system
- [ ] Track recommendation accuracy
- [ ] Build analytics dashboard
- [ ] A/B test OpenAI vs Grok

### Phase 5: Future Integrations (Week 6+)
- [ ] Ameyo CRM integration for call data
- [ ] WhatsApp Business API integration
- [ ] Microsoft Teams transcript integration
- [ ] Twilio call recording integration

---

## 10. Success Metrics

Track these KPIs:
1. **Adoption Rate**: % of employees using AI Mentor
2. **Conversion Impact**: Conversion rate (with AI) vs (without AI)
3. **Time to Conversion**: Average days saved using AI recommendations
4. **Recommendation Accuracy**: How often AI predictions match reality
5. **Employee Satisfaction**: Average rating of AI suggestions
6. **Cost per Conversion**: AI API costs vs conversion value

---

## 11. Cost Estimation

### OpenAI API Costs (GPT-4 Turbo)
- Input: $10 per 1M tokens (~$0.01 per request)
- Output: $30 per 1M tokens (~$0.03 per request)
- **Estimated**: $0.04 per AI consultation
- **Monthly** (500 consultations): ~$20

### Grok API Costs
- More cost-effective for high volume
- Faster response times
- **Estimated**: $0.02 per request
- **Monthly** (500 consultations): ~$10

### Recommendation
Start with OpenAI for quality, switch to Grok if volume increases significantly.

---

## 12. Next Steps

1. **Review this plan** and approve approach
2. **Set up API accounts** (OpenAI & Grok)
3. **Create database tables** in Supabase
4. **Implement Phase 1** (Foundation)
5. **Test with sample leads**
6. **Iterate based on feedback**

---

## Questions to Answer Before Implementation

1. Which AI provider should we start with? (OpenAI recommended)
2. What is the maximum acceptable cost per consultation?
3. Should we limit AI consultations per employee per day?
4. Do we need approval workflow for AI suggestions?
5. Should AI suggestions be logged for compliance?
6. What data retention policy for transcripts?
7. Should we anonymize lead data when sending to AI?

---

## File Structure

```
/src
  /app
    /api
      /ai-mentor
        /analyze
          route.ts          # OpenAI integration
        /analyze-grok
          route.ts          # Grok integration
        /sessions
          route.ts          # Fetch past sessions
    /CRM
      /leads
        page.tsx            # Add AI Mentor button + modal
  /components
    /ai-mentor
      AIMentorModal.tsx
      TranscriptUpload.tsx
      RecommendationCard.tsx
      SuccessPrediction.tsx
      LeadContextPanel.tsx
      AIThinkingAnimation.tsx
  /lib
    /ai
      openai.ts             # OpenAI client
      grok.ts               # Grok client
      prompt-builder.ts     # Prompt engineering
```

---

**Status**: 📋 PLANNING COMPLETE
**Ready for**: Database schema creation & API setup
**Estimated Effort**: 4-5 weeks for full implementation
**Risk Level**: Low (well-defined scope, proven technologies)

