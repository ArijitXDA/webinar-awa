/**
 * Example usage of CRM Client in oStaran
 *
 * This file shows how to integrate the CRM MCP client
 * into your oStaran AI agent.
 */

import { initializeCRM, getCRMClient, shutdownCRM } from './crm-client';
import path from 'path';

// Example 1: Basic Setup and Connection
async function example1_basicSetup() {
  console.log('\n=== Example 1: Basic Setup ===\n');

  // Initialize CRM client
  const client = await initializeCRM({
    // Path to the compiled MCP server
    serverPath: path.join(__dirname, '../../../webinar-awa/dist/mcp/server.js'),

    // Your CRM employee email
    userEmail: process.env.CRM_USER_EMAIL || 'your-email@example.com',

    // Supabase credentials
    supabaseUrl: 'https://enszifyeqnwcnxaqrmrq.supabase.co',
    supabaseKey: process.env.CRM_SUPABASE_KEY || 'your-key-here',

    // Optional API key
    apiKey: process.env.CRM_API_KEY,
  });

  // List available tools
  const tools = await client.listTools();
  console.log('Available CRM tools:', tools.map(t => t.name));

  await shutdownCRM();
}

// Example 2: Search and Filter Leads
async function example2_searchLeads() {
  console.log('\n=== Example 2: Search Leads ===\n');

  const client = getCRMClient();

  // Search for high priority leads
  const highPriorityLeads = await client.searchLeads({
    priority: 'high',
    limit: 5,
  });

  console.log(`Found ${highPriorityLeads.total} high priority leads`);
  highPriorityLeads.leads.forEach(lead => {
    console.log(`- ${lead.full_name} (${lead.mobile}) - ${lead.lead_status}`);
  });

  // Search for hot leads in a specific pipeline stage
  const hotLeads = await client.searchLeads({
    temperature: 'hot',
    pipelineStage: 'evaluation',
    limit: 10,
  });

  console.log(`\nFound ${hotLeads.total} hot leads in evaluation stage`);

  // Full text search
  const searchResults = await client.searchLeads({
    query: 'john',
    limit: 5,
  });

  console.log(`\nSearch results for "john": ${searchResults.total} leads found`);
}

// Example 3: Get Lead Details with Interactions
async function example3_leadDetails() {
  console.log('\n=== Example 3: Lead Details ===\n');

  const client = getCRMClient();

  // First, search for a lead
  const leads = await client.searchLeads({ limit: 1 });

  if (leads.leads.length > 0) {
    const leadId = leads.leads[0].id;

    // Get full lead details with interaction history
    const details = await client.getLeadDetails(leadId, {
      includeInteractions: true,
      includeAssignmentHistory: true,
    });

    console.log('Lead:', details.lead.full_name);
    console.log('Status:', details.lead.lead_status);
    console.log('Score:', details.lead.lead_score);
    console.log('Temperature:', details.lead.lead_temperature);

    if (details.interactions) {
      console.log(`\nInteractions (${details.interactions.length}):`);
      details.interactions.slice(0, 3).forEach(interaction => {
        console.log(`- ${interaction.interaction_type}: ${interaction.discussion_notes.substring(0, 50)}...`);
      });
    }
  }
}

// Example 4: Add Interaction (Record a Call)
async function example4_addInteraction() {
  console.log('\n=== Example 4: Add Interaction ===\n');

  const client = getCRMClient();

  // Find a lead to interact with
  const leads = await client.searchLeads({ limit: 1 });

  if (leads.leads.length > 0) {
    const leadId = leads.leads[0].id;

    // Record a call interaction
    const result = await client.addInteraction({
      leadId,
      interactionType: 'call',
      discussionNotes: 'Discussed product features and pricing. Customer is very interested in the AI capabilities. Scheduled a demo for next week.',
      leadScore: 5,
      leadStatus: 'contacted',
      priority: 'high',
      leadTemperature: 'hot',
      pipelineStage: 'consideration',
      nextFollowupDate: '2026-02-01',
    });

    console.log('Interaction added successfully!');
    console.log('Updated lead status:', result.lead.lead_status);
    console.log('Updated lead temperature:', result.lead.lead_temperature);
  }
}

// Example 5: Update Lead Information
async function example5_updateLead() {
  console.log('\n=== Example 5: Update Lead ===\n');

  const client = getCRMClient();

  const leads = await client.searchLeads({ limit: 1 });

  if (leads.leads.length > 0) {
    const leadId = leads.leads[0].id;

    // Update lead priority and status
    const result = await client.updateLead(leadId, {
      priority: 'urgent',
      lead_temperature: 'hot',
      pipeline_stage: 'intent',
      tags: ['enterprise', 'ai-spot', 'decision-maker'],
      next_followup_date: '2026-01-28',
    });

    console.log('Lead updated successfully!');
    console.log('New priority:', result.lead.priority);
    console.log('New tags:', result.lead.tags);
  }
}

// Example 6: Get Analytics
async function example6_analytics() {
  console.log('\n=== Example 6: Analytics ===\n');

  const client = getCRMClient();

  // Get overall analytics
  const analytics = await client.getAnalytics();

  console.log('CRM Summary:');
  console.log(`- Total Leads: ${analytics.summary.totalLeads}`);
  console.log(`- Converted: ${analytics.summary.convertedLeads}`);
  console.log(`- Conversion Rate: ${analytics.summary.conversionRate.toFixed(2)}%`);
  console.log(`- Average Score: ${analytics.summary.averageScore.toFixed(2)}`);

  console.log('\nTemperature Distribution:');
  Object.entries(analytics.summary.temperatureDistribution).forEach(([temp, count]) => {
    console.log(`- ${temp}: ${count}`);
  });

  console.log('\nPriority Breakdown:');
  Object.entries(analytics.summary.priorityBreakdown).forEach(([priority, count]) => {
    console.log(`- ${priority}: ${count}`);
  });

  // Get analytics grouped by status
  const statusAnalytics = await client.getAnalytics({
    groupBy: 'status',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
  });

  console.log('\nLeads by Status (January 2026):');
  statusAnalytics.grouped?.forEach(group => {
    console.log(`- ${group.category}: ${group.count} (${group.percentage.toFixed(1)}%)`);
  });
}

// Example 7: Bulk Operations (Manager Only)
async function example7_bulkOperations() {
  console.log('\n=== Example 7: Bulk Operations ===\n');

  const client = getCRMClient();

  // Search for leads to update
  const leads = await client.searchLeads({
    status: 'new',
    limit: 10,
  });

  if (leads.leads.length > 0) {
    const leadIds = leads.leads.map(l => l.id);

    // Bulk tag operation
    const result = await client.bulkOperation({
      leadIds,
      operation: 'tag',
      data: { tags: ['webinar-2026', 'ai-interested'] },
    });

    console.log(`Processed: ${result.processedCount}/${leadIds.length} leads`);
    console.log(`Failed: ${result.failedCount}`);

    if (result.failedCount > 0) {
      console.log('\nFailed leads:');
      result.results.filter(r => !r.success).forEach(r => {
        console.log(`- ${r.leadId}: ${r.error}`);
      });
    }
  }
}

// Example 8: Integration with oStaran AI Logic
async function example8_aiIntegration() {
  console.log('\n=== Example 8: AI Integration ===\n');

  const client = getCRMClient();

  // Simulate an AI agent query: "Show me urgent leads that need follow-up"
  const aiQuery = "urgent leads needing follow-up";

  console.log(`AI Query: "${aiQuery}"\n`);

  // AI determines to search for urgent leads
  const urgentLeads = await client.searchLeads({
    priority: 'urgent',
    limit: 5,
  });

  console.log(`AI Response: Found ${urgentLeads.total} urgent leads\n`);

  // AI generates a summary
  for (const lead of urgentLeads.leads) {
    const daysUntilFollowup = lead.next_followup_date
      ? Math.ceil((new Date(lead.next_followup_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    console.log(`📞 ${lead.full_name}`);
    console.log(`   Status: ${lead.lead_status} | Temp: ${lead.lead_temperature} | Score: ${lead.lead_score}/5`);

    if (daysUntilFollowup !== null) {
      if (daysUntilFollowup < 0) {
        console.log(`   ⚠️  Overdue follow-up by ${Math.abs(daysUntilFollowup)} days!`);
      } else if (daysUntilFollowup === 0) {
        console.log(`   🔔 Follow-up due today!`);
      } else {
        console.log(`   📅 Follow-up in ${daysUntilFollowup} days`);
      }
    }
    console.log('');
  }

  // AI can then take action based on urgency
  const overdueLeads = urgentLeads.leads.filter(lead => {
    if (!lead.next_followup_date) return false;
    return new Date(lead.next_followup_date) < new Date();
  });

  if (overdueLeads.length > 0) {
    console.log(`🚨 AI Alert: ${overdueLeads.length} urgent leads have overdue follow-ups!`);
  }
}

// Main execution
async function main() {
  try {
    // Initialize once
    await example1_basicSetup();

    // Reconnect for examples
    await initializeCRM({
      serverPath: path.join(__dirname, '../../../webinar-awa/dist/mcp/server.js'),
      userEmail: process.env.CRM_USER_EMAIL || 'your-email@example.com',
      supabaseUrl: 'https://enszifyeqnwcnxaqrmrq.supabase.co',
      supabaseKey: process.env.CRM_SUPABASE_KEY || 'your-key-here',
    });

    // Run examples (comment out the ones you don't want to run)
    await example2_searchLeads();
    await example3_leadDetails();
    // await example4_addInteraction();  // Uncomment to test adding interactions
    // await example5_updateLead();       // Uncomment to test updating leads
    await example6_analytics();
    // await example7_bulkOperations();   // Uncomment to test bulk operations
    await example8_aiIntegration();

    // Cleanup
    await shutdownCRM();

    console.log('\n✅ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    await shutdownCRM();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  example1_basicSetup,
  example2_searchLeads,
  example3_leadDetails,
  example4_addInteraction,
  example5_updateLead,
  example6_analytics,
  example7_bulkOperations,
  example8_aiIntegration,
};
