/**
 * CRM MCP Client for oStaran
 *
 * This client connects to the CRM MCP server and provides
 * a clean TypeScript API for all CRM operations.
 *
 * Copy this file to your oStaran project: src/mcp/crm-client.ts
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';

export interface CRMConfig {
  serverPath: string;
  userEmail: string;
  supabaseUrl: string;
  supabaseKey: string;
  apiKey?: string;
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
  private transport: StdioClientTransport | null = null;
  private serverProcess: ChildProcess | null = null;
  private isConnected = false;

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
   * Connect to the CRM MCP server
   */
  async connect(config: CRMConfig): Promise<void> {
    if (this.isConnected) {
      console.warn('[CRM Client] Already connected');
      return;
    }

    try {
      console.log('[CRM Client] Starting MCP server...');

      // Spawn the MCP server process
      this.serverProcess = spawn('node', [config.serverPath], {
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: config.supabaseUrl,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: config.supabaseKey,
          MCP_USER_EMAIL: config.userEmail,
          ...(config.apiKey && { MCP_API_KEY: config.apiKey }),
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Handle server stderr (logs)
      this.serverProcess.stderr?.on('data', (data: Buffer) => {
        const message = data.toString().trim();
        if (message.includes('[MCP Server]')) {
          console.log(message);
        }
      });

      // Handle server errors
      this.serverProcess.on('error', (error: Error) => {
        console.error('[CRM Client] Server process error:', error);
        this.isConnected = false;
      });

      this.serverProcess.on('exit', (code: number | null) => {
        console.log(`[CRM Client] Server process exited with code ${code}`);
        this.isConnected = false;
      });

      // Create transport using server's stdout/stdin
      this.transport = new StdioClientTransport({
        readable: this.serverProcess.stdout!,
        writable: this.serverProcess.stdin!,
      });

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

    if (this.serverProcess) {
      try {
        this.serverProcess.kill('SIGTERM');
        // Give it a moment to shutdown gracefully
        await new Promise(resolve => setTimeout(resolve, 500));
        if (this.serverProcess.killed === false) {
          this.serverProcess.kill('SIGKILL');
        }
      } catch (error) {
        // Ignore kill errors
      }
      this.serverProcess = null;
    }

    this.transport = null;
  }
}

// Singleton instance
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

// Handle process termination
process.on('beforeExit', () => {
  shutdownCRM().catch(console.error);
});

process.on('SIGINT', () => {
  shutdownCRM().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
  shutdownCRM().then(() => process.exit(0));
});
