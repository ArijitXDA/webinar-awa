# MCP Client Integration for oStaran

This guide shows how to integrate the CRM MCP server into your oStaran AI agent.

## Prerequisites

1. **oStaran project** - Your AI agent project
2. **CRM MCP Server** - The webinar-awa MCP server (this repository)
3. **Node.js** - Version 18 or higher

## Architecture

```
┌─────────────┐         MCP Protocol (stdio)        ┌──────────────┐
│   oStaran   │ ◄──────────────────────────────────► │  CRM Server  │
│  AI Agent   │         stdin/stdout/stderr          │     Node     │
└─────────────┘                                       └──────────────┘
                                                             │
                                                             ▼
                                                      ┌──────────────┐
                                                      │  Supabase    │
                                                      │  CRM Database│
                                                      └──────────────┘
```

## Installation

### Step 1: Add MCP SDK to oStaran

In your oStaran project:

```bash
npm install @modelcontextprotocol/sdk
# or
yarn add @modelcontextprotocol/sdk
```

### Step 2: Clone CRM MCP Server (or reference it)

You have two options:

**Option A: Clone as a sibling directory**
```bash
# If oStaran is at: ~/projects/oStaran
# Clone CRM at:     ~/projects/webinar-awa

cd ~/projects
git clone https://github.com/ArijitXDA/webinar-awa.git
cd webinar-awa
npm install
npm run build:mcp
```

**Option B: Add as git submodule**
```bash
cd ~/projects/oStaran
git submodule add https://github.com/ArijitXDA/webinar-awa.git crm-mcp
cd crm-mcp
npm install
npm run build:mcp
```

## Implementation

### Step 3: Create MCP Client Manager

Create a file: `src/mcp/crm-client.ts` (or `.js`) in your oStaran project:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import path from 'path';

export class CRMClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private serverProcess: any = null;

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
   * @param serverPath - Absolute path to the CRM server.js file
   * @param userEmail - Email of the CRM employee
   * @param supabaseUrl - Supabase project URL
   * @param supabaseKey - Supabase anon key
   * @param apiKey - Optional API key for authentication
   */
  async connect(
    serverPath: string,
    userEmail: string,
    supabaseUrl: string,
    supabaseKey: string,
    apiKey?: string
  ): Promise<void> {
    try {
      // Spawn the MCP server process
      this.serverProcess = spawn('node', [serverPath], {
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKey,
          MCP_USER_EMAIL: userEmail,
          ...(apiKey && { MCP_API_KEY: apiKey }),
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Handle server errors
      this.serverProcess.stderr.on('data', (data: Buffer) => {
        console.error(`[CRM MCP Server]: ${data.toString()}`);
      });

      this.serverProcess.on('error', (error: Error) => {
        console.error('[CRM MCP Server] Process error:', error);
      });

      this.serverProcess.on('exit', (code: number) => {
        console.log(`[CRM MCP Server] Process exited with code ${code}`);
      });

      // Create transport
      this.transport = new StdioClientTransport({
        stdin: this.serverProcess.stdout,
        stdout: this.serverProcess.stdin,
      });

      // Connect client to transport
      await this.client.connect(this.transport);

      console.log('[oStaran] Connected to CRM MCP server');
    } catch (error) {
      console.error('[oStaran] Failed to connect to CRM MCP server:', error);
      throw error;
    }
  }

  /**
   * Get list of available CRM tools
   */
  async listTools(): Promise<any[]> {
    try {
      const response = await this.client.listTools();
      return response.tools;
    } catch (error) {
      console.error('[oStaran] Failed to list tools:', error);
      throw error;
    }
  }

  /**
   * Search for leads
   */
  async searchLeads(params: {
    query?: string;
    status?: string;
    priority?: 'urgent' | 'high' | 'medium' | 'low';
    temperature?: 'hot' | 'warm' | 'cold';
    limit?: number;
    offset?: number;
  }): Promise<any> {
    return this.callTool('search_leads', params);
  }

  /**
   * Get lead details
   */
  async getLeadDetails(
    leadId: string,
    options?: {
      includeInteractions?: boolean;
      includeAssignmentHistory?: boolean;
    }
  ): Promise<any> {
    return this.callTool('get_lead_details', { leadId, ...options });
  }

  /**
   * Update a lead
   */
  async updateLead(
    leadId: string,
    updates: {
      lead_score?: number;
      lead_status?: string;
      next_followup_date?: string;
      priority?: string;
      lead_temperature?: string;
      pipeline_stage?: string;
      tags?: string[];
      assigned_to?: string;
    }
  ): Promise<any> {
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
    leadStatus?: string;
    nextFollowupDate?: string;
    priority?: string;
    leadTemperature?: string;
    pipelineStage?: string;
  }): Promise<any> {
    return this.callTool('add_interaction', params);
  }

  /**
   * Get CRM analytics
   */
  async getAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'status' | 'source' | 'priority' | 'pipeline_stage';
    assignedTo?: string;
  }): Promise<any> {
    return this.callTool('get_analytics', params || {});
  }

  /**
   * Perform bulk operations
   */
  async bulkOperation(params: {
    leadIds: string[];
    operation: 'update' | 'reassign' | 'tag' | 'untag';
    data: any;
  }): Promise<any> {
    return this.callTool('bulk_operations', params);
  }

  /**
   * Call a tool directly
   */
  private async callTool(toolName: string, args: any): Promise<any> {
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
    } catch (error) {
      console.error(`[oStaran] Tool ${toolName} failed:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    try {
      if (this.transport) {
        await this.client.close();
      }
      if (this.serverProcess) {
        this.serverProcess.kill();
      }
      console.log('[oStaran] Disconnected from CRM MCP server');
    } catch (error) {
      console.error('[oStaran] Error disconnecting:', error);
    }
  }
}

// Singleton instance
let crmClient: CRMClient | null = null;

/**
 * Get or create CRM client instance
 */
export function getCRMClient(): CRMClient {
  if (!crmClient) {
    crmClient = new CRMClient();
  }
  return crmClient;
}

/**
 * Initialize CRM client with configuration
 */
export async function initializeCRM(config: {
  serverPath: string;
  userEmail: string;
  supabaseUrl: string;
  supabaseKey: string;
  apiKey?: string;
}): Promise<CRMClient> {
  const client = getCRMClient();
  await client.connect(
    config.serverPath,
    config.userEmail,
    config.supabaseUrl,
    config.supabaseKey,
    config.apiKey
  );
  return client;
}
```

### Step 4: Create Configuration File

Create `config/crm-mcp.json` in oStaran:

```json
{
  "serverPath": "/absolute/path/to/webinar-awa/dist/mcp/server.js",
  "supabaseUrl": "https://enszifyeqnwcnxaqrmrq.supabase.co",
  "supabaseKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuc3ppZnllcW53Y254YXFybXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTIyNTcsImV4cCI6MjA2OTY4ODI1N30.eCMgm8ayfG2RNkOSk8iOBEfZMl64gY7a8dLs1W3m79o",
  "userEmail": "your-email@example.com"
}
```

Or use environment variables (`.env`):

```bash
CRM_MCP_SERVER_PATH=/absolute/path/to/webinar-awa/dist/mcp/server.js
CRM_MCP_USER_EMAIL=your-email@example.com
CRM_SUPABASE_URL=https://enszifyeqnwcnxaqrmrq.supabase.co
CRM_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
CRM_API_KEY=optional-api-key
```

### Step 5: Use in oStaran

Example usage in your oStaran agent:

```typescript
import { initializeCRM } from './mcp/crm-client';
import path from 'path';

// Initialize CRM client
const crmClient = await initializeCRM({
  serverPath: process.env.CRM_MCP_SERVER_PATH!,
  userEmail: process.env.CRM_MCP_USER_EMAIL!,
  supabaseUrl: process.env.CRM_SUPABASE_URL!,
  supabaseKey: process.env.CRM_SUPABASE_KEY!,
  apiKey: process.env.CRM_API_KEY,
});

// Example: Search for high priority leads
const leads = await crmClient.searchLeads({
  priority: 'high',
  limit: 10,
});

console.log('High priority leads:', leads);

// Example: Get lead details
const leadDetails = await crmClient.getLeadDetails('lead-uuid-here', {
  includeInteractions: true,
});

console.log('Lead details:', leadDetails);

// Example: Add an interaction
const result = await crmClient.addInteraction({
  leadId: 'lead-uuid-here',
  interactionType: 'call',
  discussionNotes: 'Discussed pricing and timeline. Very interested.',
  leadScore: 5,
  leadStatus: 'contacted',
  priority: 'high',
  leadTemperature: 'hot',
});

console.log('Interaction added:', result);

// Example: Get analytics
const analytics = await crmClient.getAnalytics({
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  groupBy: 'status',
});

console.log('Monthly analytics:', analytics);

// Don't forget to disconnect when done
process.on('exit', () => {
  crmClient.disconnect();
});
```

## Integration with oStaran's AI Logic

If oStaran uses LLM function calling, you can expose CRM tools:

```typescript
// Define tools for your LLM
const crmTools = [
  {
    name: 'search_crm_leads',
    description: 'Search for leads in the CRM system',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        priority: {
          type: 'string',
          enum: ['urgent', 'high', 'medium', 'low'],
          description: 'Filter by priority'
        },
        temperature: {
          type: 'string',
          enum: ['hot', 'warm', 'cold'],
          description: 'Filter by lead temperature'
        },
        limit: { type: 'number', description: 'Max results', default: 10 }
      }
    },
    handler: async (params: any) => {
      return await crmClient.searchLeads(params);
    }
  },
  {
    name: 'get_crm_lead',
    description: 'Get detailed information about a specific lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'Lead UUID' },
        includeInteractions: { type: 'boolean', default: false }
      },
      required: ['leadId']
    },
    handler: async (params: any) => {
      return await crmClient.getLeadDetails(params.leadId, {
        includeInteractions: params.includeInteractions
      });
    }
  },
  {
    name: 'add_crm_interaction',
    description: 'Record an interaction with a lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        interactionType: {
          type: 'string',
          enum: ['call', 'whatsapp', 'email', 'meeting', 'note']
        },
        discussionNotes: { type: 'string' },
        leadScore: { type: 'number', minimum: 1, maximum: 5 },
        priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] }
      },
      required: ['leadId', 'interactionType', 'discussionNotes']
    },
    handler: async (params: any) => {
      return await crmClient.addInteraction(params);
    }
  },
  // Add more tools as needed...
];

// When LLM calls a function
async function handleFunctionCall(functionName: string, args: any) {
  const tool = crmTools.find(t => t.name === functionName);
  if (tool) {
    return await tool.handler(args);
  }
  throw new Error(`Unknown function: ${functionName}`);
}
```

## Error Handling

```typescript
try {
  const leads = await crmClient.searchLeads({ priority: 'high' });
  // Handle success
} catch (error: any) {
  if (error.message.includes('Authentication failed')) {
    console.error('Invalid email or API key');
  } else if (error.message.includes('Insufficient permissions')) {
    console.error('User does not have access to these leads');
  } else {
    console.error('CRM operation failed:', error.message);
  }
}
```

## Testing

Create a test file `test-crm.ts`:

```typescript
import { initializeCRM } from './mcp/crm-client';

async function testCRM() {
  console.log('Connecting to CRM MCP server...');

  const client = await initializeCRM({
    serverPath: '/path/to/webinar-awa/dist/mcp/server.js',
    userEmail: 'your-email@example.com',
    supabaseUrl: 'https://enszifyeqnwcnxaqrmrq.supabase.co',
    supabaseKey: 'your-key-here',
  });

  console.log('Connected! Listing available tools...');
  const tools = await client.listTools();
  console.log('Available tools:', tools.map(t => t.name));

  console.log('\nSearching for leads...');
  const leads = await client.searchLeads({ limit: 5 });
  console.log(`Found ${leads.total} leads:`, leads.leads);

  console.log('\nGetting analytics...');
  const analytics = await client.getAnalytics();
  console.log('Analytics:', analytics);

  await client.disconnect();
  console.log('Disconnected');
}

testCRM().catch(console.error);
```

Run: `ts-node test-crm.ts` or `node test-crm.js`

## Deployment Considerations

### For Production:

1. **Path Resolution**: Use environment variables for the server path
2. **Error Recovery**: Implement reconnection logic if server crashes
3. **Logging**: Add proper logging for debugging
4. **Security**: Never commit credentials; use environment variables
5. **Process Management**: Ensure server process is properly terminated

### Example Production Setup:

```typescript
class ProductionCRMClient extends CRMClient {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  async connectWithRetry(): Promise<void> {
    while (this.reconnectAttempts < this.maxReconnectAttempts) {
      try {
        await this.connect(
          process.env.CRM_MCP_SERVER_PATH!,
          process.env.CRM_MCP_USER_EMAIL!,
          process.env.CRM_SUPABASE_URL!,
          process.env.CRM_SUPABASE_KEY!,
          process.env.CRM_API_KEY
        );
        this.reconnectAttempts = 0;
        return;
      } catch (error) {
        this.reconnectAttempts++;
        console.error(`Connection attempt ${this.reconnectAttempts} failed`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    throw new Error('Failed to connect after max attempts');
  }
}
```

## Benefits for oStaran

1. ✅ **Direct CRM Access** - No REST API needed
2. ✅ **Type Safety** - Full TypeScript support
3. ✅ **Real-time** - Direct database access via MCP
4. ✅ **Permissions** - Automatic role-based filtering
5. ✅ **Audit Trail** - All operations logged
6. ✅ **Efficient** - No HTTP overhead

## Next Steps

1. Clone/download the webinar-awa repository
2. Build the MCP server: `npm run build:mcp`
3. Add the client code to oStaran
4. Configure credentials
5. Test the connection
6. Integrate with your AI logic

Need help with any specific step?
