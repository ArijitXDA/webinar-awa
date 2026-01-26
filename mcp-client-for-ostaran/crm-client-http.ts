/**
 * CRM MCP HTTP Client for oStaran (Vercel)
 *
 * This client connects to the CRM MCP server via HTTP/SSE
 * instead of stdio, making it compatible with serverless
 * environments like Vercel.
 *
 * Copy this file to your oStaran project: src/integrations/crm/crm-client.ts
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export interface CRMConfig {
  serverUrl: string;       // Railway URL
  userEmail: string;       // CRM employee email
  apiKey?: string;         // Optional API key
}

export interface Lead {
  id: string;
  lead_id: number;
  full_name: string;
  mobile: string;
  email: string | null;
  lead_source: string;
  lead_status: string;
  lead_score: number;
  priority: string | null;
  lead_temperature: string | null;
  pipeline_stage: string | null;
  assigned_to: string;
  next_followup_date: string | null;
  tags: string[] | null;
  company_name: string | null;
  created_at: string;
  updated_at: string;
}

export class CRMClient {
  private client: Client;
  private transport: SSEClientTransport | null = null;
  private isConnected = false;
  private config: CRMConfig | null = null;

  constructor() {
    this.client = new Client(
      {
        name: 'oStaran-crm-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
  }

  /**
   * Connect to the CRM MCP server via HTTP/SSE
   */
  async connect(config: CRMConfig): Promise<void> {
    if (this.isConnected) {
      console.warn('[CRM Client] Already connected');
      return;
    }

    this.config = config;

    try {
      console.log('[CRM Client] Connecting to MCP server via HTTP/SSE...');

      // Build SSE URL with authentication
      const sseUrl = new URL('/sse', config.serverUrl);
      sseUrl.searchParams.set('email', config.userEmail);
      if (config.apiKey) {
        sseUrl.searchParams.set('apiKey', config.apiKey);
      }

      // Create SSE transport
      this.transport = new SSEClientTransport(sseUrl);

      // Connect client to transport
      await this.client.connect(this.transport);

      this.isConnected = true;
      console.log('[CRM Client] Successfully connected to CRM MCP server');
    } catch (error) {
      console.error('[CRM Client] Failed to connect:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Check if client is connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * List all available CRM tools
   */
  async listTools(): Promise<any[]> {
    this.ensureConnected();
    try {
      const response = await this.client.listTools();
      return response.tools;
    } catch (error) {
      console.error('[CRM Client] Failed to list tools:', error);
      throw error;
    }
  }

  /**
   * Search for leads with various filters
   */
  async searchLeads(params: {
    query?: string;
    status?: string;
    source?: string;
    assignedTo?: string;
    priority?: 'urgent' | 'high' | 'medium' | 'low';
    temperature?: 'hot' | 'warm' | 'cold';
    pipelineStage?: string;
    tag?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    leads: Lead[];
    total: number;
    hasMore: boolean;
  }> {
    return this.callTool('search_leads', params);
  }

  /**
   * Get detailed information about a specific lead
   */
  async getLeadDetails(
    leadId: string,
    options: {
      includeInteractions?: boolean;
      includeAssignmentHistory?: boolean;
    } = {}
  ): Promise<{
    lead: Lead;
    interactions?: any[];
    assignmentHistory?: any[];
  }> {
    return this.callTool('get_lead_details', { leadId, ...options });
  }

  /**
   * Update a lead's information
   */
  async updateLead(
    leadId: string,
    updates: {
      lead_score?: number;
      lead_status?: 'new' | 'contacted' | 'follow_up_again' | 'need_something' | 'converted' | 'not_interested';
      next_followup_date?: string;
      priority?: 'urgent' | 'high' | 'medium' | 'low';
      lead_temperature?: 'hot' | 'warm' | 'cold';
      pipeline_stage?: 'awareness' | 'interest' | 'consideration' | 'intent' | 'evaluation' | 'purchase' | 'retention' | 'advocacy';
      tags?: string[];
      assigned_to?: string;
    }
  ): Promise<{
    success: boolean;
    lead: Lead;
    message: string;
  }> {
    return this.callTool('update_lead', { leadId, updates });
  }

  /**
   * Add an interaction to a lead
   */
  async addInteraction(params: {
    leadId: string;
    interactionType: 'call' | 'whatsapp' | 'email' | 'meeting' | 'note';
    discussionNotes: string;
    leadScore?: number;
    leadStatus?: 'new' | 'contacted' | 'follow_up_again' | 'need_something' | 'converted' | 'not_interested';
    nextFollowupDate?: string;
    priority?: 'urgent' | 'high' | 'medium' | 'low';
    leadTemperature?: 'hot' | 'warm' | 'cold';
    pipelineStage?: 'awareness' | 'interest' | 'consideration' | 'intent' | 'evaluation' | 'purchase' | 'retention' | 'advocacy';
  }): Promise<{
    success: boolean;
    interaction: any;
    lead: Lead;
    message: string;
  }> {
    return this.callTool('add_interaction', params);
  }

  /**
   * Get CRM analytics
   */
  async getAnalytics(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'status' | 'source' | 'priority' | 'pipeline_stage' | 'temperature';
    assignedTo?: string;
  } = {}): Promise<{
    summary: {
      totalLeads: number;
      convertedLeads: number;
      conversionRate: number;
      averageScore: number;
      temperatureDistribution: Record<string, number>;
      priorityBreakdown: Record<string, number>;
    };
    dailyTrends: Array<{
      date: string;
      newLeads: number;
      conversions: number;
      interactions: number;
    }>;
    grouped?: Array<{
      category: string;
      count: number;
      percentage: number;
    }>;
  }> {
    return this.callTool('get_analytics', params);
  }

  /**
   * Perform bulk operations on leads (managers only)
   */
  async bulkOperation(params: {
    leadIds: string[];
    operation: 'update' | 'reassign' | 'tag' | 'untag';
    data: any;
  }): Promise<{
    success: boolean;
    processedCount: number;
    failedCount: number;
    results: Array<{
      leadId: string;
      success: boolean;
      error?: string;
    }>;
    message: string;
  }> {
    return this.callTool('bulk_operations', params);
  }

  /**
   * Call a tool directly with custom arguments
   */
  private async callTool(toolName: string, args: any): Promise<any> {
    this.ensureConnected();

    try {
      const response = await this.client.callTool({
        name: toolName,
        arguments: args,
      });

      // Parse the response content
      if (response.content && response.content.length > 0) {
        const textContent = response.content[0];
        if (textContent.type === 'text') {
          return JSON.parse(textContent.text);
        }
      }

      return response;
    } catch (error: any) {
      console.error(`[CRM Client] Tool '${toolName}' failed:`, error.message);
      throw error;
    }
  }

  /**
   * Ensure client is connected before making calls
   */
  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error('CRM Client is not connected. Call connect() first.');
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    try {
      await this.cleanup();
      console.log('[CRM Client] Disconnected from CRM MCP server');
    } catch (error) {
      console.error('[CRM Client] Error during disconnect:', error);
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    this.isConnected = false;

    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        // Ignore close errors
      }
    }

    this.transport = null;
    this.config = null;
  }
}

// Singleton instance (useful for Next.js API routes)
let crmClientInstance: CRMClient | null = null;

/**
 * Get or create the singleton CRM client instance
 */
export function getCRMClient(): CRMClient {
  if (!crmClientInstance) {
    crmClientInstance = new CRMClient();
  }
  return crmClientInstance;
}

/**
 * Initialize and connect the CRM client
 * @param config CRM configuration
 * @returns Connected CRM client instance
 */
export async function initializeCRM(config: CRMConfig): Promise<CRMClient> {
  const client = getCRMClient();

  if (!client.connected) {
    await client.connect(config);
  }

  return client;
}

/**
 * Disconnect and cleanup the CRM client
 */
export async function shutdownCRM(): Promise<void> {
  if (crmClientInstance) {
    await crmClientInstance.disconnect();
    crmClientInstance = null;
  }
}

// Note: In Vercel/serverless, connections are ephemeral
// The client will disconnect automatically when the function execution ends
// No need for process event handlers like in the stdio version
