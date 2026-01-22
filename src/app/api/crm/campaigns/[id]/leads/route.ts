import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Add leads to campaign
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { leadIds, addedBy } = await request.json()

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'leadIds array is required' },
        { status: 400 }
      )
    }

    const campaignId = params.id

    // Prepare campaign_leads records
    const campaignLeads = leadIds.map(leadId => ({
      campaign_id: campaignId,
      lead_id: leadId,
      added_by: addedBy || null,
      response_status: 'pending'
    }))

    // Insert campaign leads (ignore duplicates)
    const { data, error } = await supabase
      .from('crm_campaign_leads')
      .upsert(campaignLeads, {
        onConflict: 'campaign_id,lead_id',
        ignoreDuplicates: true
      })
      .select()

    if (error) throw error

    // Update lead's primary_campaign_id if not set
    await supabase
      .from('crm_leads')
      .update({ primary_campaign_id: campaignId })
      .in('id', leadIds)
      .is('primary_campaign_id', null)

    return NextResponse.json({
      success: true,
      added: data?.length || 0,
      message: `Successfully added ${data?.length || 0} leads to campaign`
    })
  } catch (error: any) {
    console.error('Error adding leads to campaign:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add leads to campaign' },
      { status: 500 }
    )
  }
}

// Remove leads from campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { leadIds } = await request.json()

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'leadIds array is required' },
        { status: 400 }
      )
    }

    const campaignId = params.id

    const { error } = await supabase
      .from('crm_campaign_leads')
      .delete()
      .eq('campaign_id', campaignId)
      .in('lead_id', leadIds)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${leadIds.length} leads from campaign`
    })
  } catch (error: any) {
    console.error('Error removing leads from campaign:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove leads from campaign' },
      { status: 500 }
    )
  }
}
