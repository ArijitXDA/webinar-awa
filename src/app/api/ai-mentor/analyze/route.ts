import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Initialize Supabase client with service role for backend operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// System prompt for AI Mentor
const SALES_MENTOR_SYSTEM_PROMPT = `You are "oStaran AI Mentor", an expert sales assistant helping employees convert leads into customers for AI training programs and courses.

Your role:
1. Analyze all available data about the lead (interactions, webinar attendance, quiz scores, engagement patterns)
2. Provide specific, actionable recommendations based on actual data
3. Be realistic but optimistic - focus on genuine value creation
4. Consider the lead's journey stage and engagement level
5. Suggest next best actions if conversion seems unlikely

Output Format (MUST be valid JSON):
{
  "timing": "Specific recommendation on when to reach out (day/time with clear reasoning)",
  "communication_mode": "Best mode with reasoning (Phone/WhatsApp/Virtual Meeting/In-Person Meeting/Email)",
  "location_if_meeting": "If in-person, suggest location (office/customer location/restaurant/cafe)",
  "product": "Which specific course/program to recommend based on lead data",
  "pitch": "Customized 2-3 sentence pitch based on lead's interests and engagement",
  "tone": "Tone guidance (professional/friendly/consultative/etc) with reasoning",
  "success_probability": 75.5,
  "meetings_required": 2,
  "probable_conversion_date": "2026-02-15",
  "reasoning": "Detailed analysis explaining all recommendations based on actual lead data",
  "objection_handling": "Anticipated objections and how to address them",
  "referral_strategy": "How to ask for referrals if conversion is unlikely"
}

Important Guidelines:
- Base ALL recommendations on actual data provided, never assumptions
- If data is limited, acknowledge it and suggest information-gathering first
- Consider past interaction patterns and engagement history
- Factor in lead score changes over time
- Be specific with dates and timings
- Maintain ethical sales practices
- Focus on customer success and value creation`

interface AnalyzeRequest {
  leadId: number
  employeeId: string
  whatsappTranscript?: string
  callTranscript?: string
}

interface AIRecommendations {
  timing: string
  communication_mode: string
  location_if_meeting?: string
  product: string
  pitch: string
  tone: string
  success_probability: number
  meetings_required: number
  probable_conversion_date: string
  reasoning: string
  objection_handling: string
  referral_strategy: string
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: AnalyzeRequest = await request.json()
    const { leadId, employeeId, whatsappTranscript, callTranscript } = body

    // Validate required fields
    if (!leadId || !employeeId) {
      return NextResponse.json(
        { error: 'leadId and employeeId are required' },
        { status: 400 }
      )
    }

    // Check if AI Mentor is enabled
    if (process.env.AI_MENTOR_ENABLED !== 'true') {
      return NextResponse.json(
        { error: 'AI Mentor feature is not enabled' },
        { status: 403 }
      )
    }

    // 1. Fetch lead context from database (READ ONLY via RPC function)
    console.log(`[AI Mentor] Fetching context for lead: ${leadId}`)
    const { data: context, error: contextError } = await supabase.rpc('get_lead_ai_context', {
      p_lead_id: leadId
    })

    if (contextError) {
      console.error('[AI Mentor] Error fetching lead context:', contextError)
      return NextResponse.json(
        { error: 'Failed to fetch lead context', details: contextError.message },
        { status: 500 }
      )
    }

    if (!context) {
      return NextResponse.json(
        { error: 'Lead not found or no context available' },
        { status: 404 }
      )
    }

    // 2. Build AI prompt with sanitized data
    const prompt = buildAIPrompt(context, whatsappTranscript, callTranscript)

    console.log(`[AI Mentor] Calling OpenAI API...`)
    const startTime = Date.now()

    // 3. Call OpenAI API (AI has NO database access - only receives text)
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

    const endTime = Date.now()
    const responseTime = endTime - startTime

    console.log(`[AI Mentor] OpenAI response received in ${responseTime}ms`)

    // 4. Parse AI response
    const aiContent = aiResponse.choices[0].message.content
    if (!aiContent) {
      throw new Error('Empty response from AI')
    }

    const recommendations: AIRecommendations = JSON.parse(aiContent)

    // 5. Calculate costs (approximate)
    const tokensUsed = aiResponse.usage?.total_tokens || 0
    const estimatedCost = (tokensUsed / 1000) * 0.04 // Rough estimate for GPT-4

    // 6. Save session to database (WE control what gets written, not AI)
    console.log(`[AI Mentor] Saving session to database...`)
    const { data: session, error: sessionError } = await supabase
      .from('crm_ai_mentor_sessions')
      .insert({
        lead_id: leadId,
        employee_id: employeeId,
        lead_context: context,
        whatsapp_transcript: whatsappTranscript || null,
        call_transcript: callTranscript || null,
        ai_provider: 'openai',
        model_used: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        tokens_used: tokensUsed,
        api_cost: estimatedCost,
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

    if (sessionError) {
      console.error('[AI Mentor] Error saving session:', sessionError)
      // Still return recommendations even if save failed
      return NextResponse.json({
        success: true,
        session_id: null,
        recommendations,
        warning: 'Recommendations generated but failed to save to database'
      })
    }

    console.log(`[AI Mentor] Session saved successfully: ${session.id}`)

    // 7. Return recommendations to frontend
    return NextResponse.json({
      success: true,
      session_id: session.id,
      recommendations,
      metadata: {
        tokens_used: tokensUsed,
        estimated_cost: estimatedCost,
        response_time_ms: responseTime,
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
      }
    })

  } catch (error: any) {
    console.error('[AI Mentor] API Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate AI recommendations',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// Helper function to build the AI prompt
function buildAIPrompt(
  context: any,
  whatsappTranscript?: string,
  callTranscript?: string
): string {
  const lead = context.lead_profile || {}
  const interactions = context.interactions || []
  const interactionSummary = context.interaction_summary || {}
  const engagementScore = context.engagement_score || {}

  return `
## LEAD ANALYSIS REQUEST

### Lead Profile
- **Name**: ${lead.full_name || 'Unknown'}
- **Lead ID**: ${lead.lead_id || 'Unknown'}
- **Lead Score**: ${lead.lead_score || 0}/5 ⭐
- **Status**: ${lead.lead_status || 'Unknown'}
- **Course Interest**: ${lead.course || 'Not specified'}
- **For Whom**: ${lead.for_whom || 'Not specified'}
- **Source**: ${lead.lead_source || 'Unknown'}
- **Days Since Generation**: ${lead.days_since_generation || 'Unknown'} days
- **Next Follow-up**: ${lead.next_followup_date || 'Not scheduled'}
- **Target Conversion**: ${lead.target_conversion_date || 'Not set'}
- **Currently Converted**: ${lead.is_converted ? 'Yes' : 'No'}

### Interaction History
**Total Interactions**: ${interactionSummary.total_count || 0}
**Last Interaction**: ${interactionSummary.last_interaction_days_ago || 'Never'} days ago
**Average Sentiment**: ${interactionSummary.avg_sentiment || 'Unknown'}

${interactions.length > 0 ? '**Recent Interactions**:' : 'No interaction history available.'}
${interactions.slice(0, 10).map((i: any, index: number) => `
${index + 1}. **${i.days_ago} days ago** - ${i.interaction_type}
   - Notes: ${i.interaction_notes || 'No notes'}
   - Sentiment: ${i.sentiment || 'Unknown'}
   - Score After: ${i.lead_score_after || 'N/A'}/5
`).join('\n')}

### Engagement Metrics
- **Webinars Attended**: ${engagementScore.total_webinars_attended || 0}
- **Quizzes Taken**: ${engagementScore.total_quizzes_taken || 0}
- **Certificates Earned**: ${engagementScore.certificates_earned || 0}
- **Contact Form Submissions**: ${engagementScore.contact_submissions || 0}

${context.certificates && context.certificates.length > 0 ? `
### Certificates & Achievements
${context.certificates.map((c: any) => `- ${c.course_name} (${c.completion_date})`).join('\n')}
` : ''}

${context.webinar_engagement && context.webinar_engagement.length > 0 ? `
### Webinar Participation
${context.webinar_engagement.slice(0, 5).map((w: any) => `
- **${w.webinar_name}** (${w.attended_date})
  Rating: ${w.rating || 'N/A'}/5
  ${w.feedback_summary ? `Feedback: ${w.feedback_summary}` : ''}
`).join('\n')}
` : ''}

${context.quiz_history && context.quiz_history.length > 0 ? `
### Quiz Performance
${context.quiz_history.slice(0, 5).map((q: any) => `
- **${q.quiz_name}**: ${q.score || 'N/A'} (${q.completed_at})
  Topics: ${q.topics_of_interest || 'Not specified'}
`).join('\n')}
` : ''}

${whatsappTranscript ? `
### WhatsApp Chat History
\`\`\`
${whatsappTranscript}
\`\`\`
` : ''}

${callTranscript ? `
### Call/Meeting Transcript
\`\`\`
${callTranscript}
\`\`\`
` : ''}

${context.assigned_employee ? `
### Assigned Employee
- **Name**: ${context.assigned_employee.name}
- **Role**: ${context.assigned_employee.role}
- **Level**: ${context.assigned_employee.hierarchy_level}
` : ''}

---

## YOUR TASK
Based on this comprehensive data, provide your expert recommendations in the specified JSON format. Focus on:
1. What the data tells us about the lead's readiness to convert
2. Best timing based on interaction patterns
3. Preferred communication style based on past interactions
4. Which course fits their profile and interests
5. How to handle potential objections
6. Realistic probability of conversion

Remember: Be specific, data-driven, and actionable. If data is limited, acknowledge it and suggest next steps.
  `.trim()
}
