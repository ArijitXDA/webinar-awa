# CRM MCP Server

Model Context Protocol (MCP) server for the CRM system. This server enables Claude and other AI agents to interact with your CRM through a secure, permission-based interface.

## Features

- **Email-based Authentication**: Authenticate users by email address
- **Role-based Permissions**: Respects job roles and hierarchy
- **Secure Access Control**: Users can only access leads they have permissions for
- **Comprehensive Tools**: 6 powerful tools for CRM operations
- **Audit Logging**: All operations are logged for security and compliance

## Available Tools

### 1. `search_leads`
Search and filter leads based on multiple criteria.

**Parameters:**
- `query`: Text search across name, mobile, email, company
- `status`: Filter by lead status
- `source`: Filter by lead source
- `assignedTo`: Filter by assigned employee
- `priority`: Filter by priority (urgent, high, medium, low)
- `temperature`: Filter by temperature (hot, warm, cold)
- `pipelineStage`: Filter by pipeline stage
- `tag`: Filter by tag
- `limit`: Maximum results (default 10, max 100)
- `offset`: Pagination offset

**Example:**
```json
{
  "query": "John",
  "status": "contacted",
  "priority": "high",
  "limit": 20
}
```

### 2. `get_lead_details`
Get complete details of a specific lead.

**Parameters:**
- `leadId`: UUID of the lead (required)
- `includeInteractions`: Include interaction history (default false)
- `includeAssignmentHistory`: Include assignment history (default false)

**Example:**
```json
{
  "leadId": "123e4567-e89b-12d3-a456-426614174000",
  "includeInteractions": true
}
```

### 3. `update_lead`
Update lead information.

**Parameters:**
- `leadId`: UUID of the lead (required)
- `updates`: Object containing fields to update
  - `lead_score`: 1-5
  - `lead_status`: new, contacted, follow_up_again, need_something, converted, not_interested
  - `next_followup_date`: YYYY-MM-DD
  - `priority`: urgent, high, medium, low
  - `lead_temperature`: hot, warm, cold
  - `pipeline_stage`: awareness, interest, consideration, intent, evaluation, purchase, retention, advocacy
  - `tags`: Array of tag strings
  - `assigned_to`: Employee ID for reassignment
  - `status_notes`: Notes about the update

**Example:**
```json
{
  "leadId": "123e4567-e89b-12d3-a456-426614174000",
  "updates": {
    "lead_score": 5,
    "priority": "urgent",
    "lead_temperature": "hot",
    "next_followup_date": "2026-02-01"
  }
}
```

### 4. `add_interaction`
Record a new interaction with a lead.

**Parameters:**
- `leadId`: UUID of the lead (required)
- `interactionType`: call, whatsapp, email, meeting, note (required)
- `discussionNotes`: Notes about the interaction (required)
- `leadScore`: Updated lead score (optional)
- `leadStatus`: Updated lead status (optional)
- `nextFollowupDate`: Next follow-up date (optional)
- `priority`: Updated priority (optional)
- `leadTemperature`: Updated temperature (optional)
- `pipelineStage`: Updated pipeline stage (optional)

**Example:**
```json
{
  "leadId": "123e4567-e89b-12d3-a456-426614174000",
  "interactionType": "call",
  "discussionNotes": "Had a productive conversation. Customer is very interested in our AI training programs.",
  "leadScore": 5,
  "leadStatus": "follow_up_again",
  "nextFollowupDate": "2026-02-05"
}
```

### 5. `get_analytics`
Retrieve CRM analytics and performance metrics.

**Parameters:**
- `startDate`: Start date YYYY-MM-DD (optional, default 30 days ago)
- `endDate`: End date YYYY-MM-DD (optional, default today)
- `groupBy`: Group results by: status, source, priority, pipeline_stage, temperature (optional)
- `assignedTo`: Filter for specific employee (optional)

**Example:**
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "groupBy": "status"
}
```

### 6. `bulk_operations`
Perform bulk operations on multiple leads (max 100).

**Parameters:**
- `operation`: update, reassign, tag, untag (required)
- `leadIds`: Array of lead UUIDs (required, max 100)
- `updates`: Updates to apply (required for some operations)

**Example (bulk update):**
```json
{
  "operation": "update",
  "leadIds": ["uuid1", "uuid2", "uuid3"],
  "updates": {
    "priority": "high",
    "lead_temperature": "hot"
  }
}
```

**Example (bulk tag):**
```json
{
  "operation": "tag",
  "leadIds": ["uuid1", "uuid2"],
  "updates": {
    "tags_to_add": ["vip", "enterprise"]
  }
}
```

## Permission System

### Role Hierarchy (from highest to lowest):
1. **owner** (Level 10)
2. **ea_to_owner** (Level 9)
3. **director** (Level 8)
4. **ea_to_director** (Level 7)
5. **pm_*** (Project Managers, Level 6)
6. ***_lead** (Team Leads, Level 5)
7. ***_executive** (Executives, Level 4)

### Access Rules:
- **Top Management** (owner, directors): Can view and edit all leads
- **Managers** (PMs, Leads): Can view and edit their team's leads
- **Employees**: Can view and edit only their assigned leads
- **Bulk Operations**: Require manager role or above

### Hierarchy-based Access:
- Managers can access all leads assigned to their subordinates
- Reporting chain is automatically followed
- Cross-team access requires higher role level

## Setup

### Prerequisites
1. Node.js 18+ installed
2. Supabase project with CRM schema
3. Environment variables configured

### Installation

1. Install dependencies (already done if in main project):
```bash
npm install @modelcontextprotocol/sdk zod
```

2. Set up environment variables:
```bash
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
export MCP_USER_EMAIL="user@example.com"
export MCP_API_KEY="optional-api-key"  # Optional
```

3. Build the server:
```bash
npm run build:mcp
```

4. Run the server:
```bash
npm run mcp:server
```

### Claude Desktop Configuration

Add to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "crm": {
      "command": "node",
      "args": [
        "/absolute/path/to/webinar-awa/dist/mcp/server.js"
      ],
      "env": {
        "NEXT_PUBLIC_SUPABASE_URL": "your-supabase-url",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key",
        "MCP_USER_EMAIL": "your-email@example.com",
        "MCP_API_KEY": "your-optional-api-key"
      }
    }
  }
}
```

### Using with oStaran or Other AI Agents

The MCP server uses stdio transport, so it can be integrated with any MCP-compatible client:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const transport = new StdioClientTransport({
  command: 'node',
  args: ['/path/to/server.js'],
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'your-url',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'your-key',
    MCP_USER_EMAIL: 'user@example.com',
  },
})

const client = new Client({
  name: 'ostaran-client',
  version: '1.0.0',
}, {
  capabilities: {},
})

await client.connect(transport)

// List available tools
const tools = await client.listTools()

// Call a tool
const result = await client.callTool({
  name: 'search_leads',
  arguments: {
    query: 'John',
    limit: 10,
  },
})
```

## API Key Management

To generate an API key for a user:

```typescript
import { generateApiKey } from './auth'

// Generate key that expires in 90 days
const apiKey = await generateApiKey('employee-uuid', 90)
console.log('API Key:', apiKey)
```

Store the API key securely and use it as `MCP_API_KEY` environment variable.

## Security Best Practices

1. **Never commit environment variables** to version control
2. **Use API keys** for production deployments
3. **Rotate API keys** regularly (default 90 days)
4. **Monitor audit logs** for suspicious activity
5. **Limit bulk operations** to trusted managers only
6. **Validate email addresses** before granting access

## Audit Logging

All MCP operations are logged to `crm_audit_log` table:
- Authentication attempts
- Tool executions
- Bulk operations
- Failed access attempts

Query audit logs:
```sql
SELECT * FROM crm_audit_log
WHERE action LIKE 'mcp_%'
ORDER BY created_at DESC
LIMIT 100;
```

## Troubleshooting

### Authentication Failed
- Verify `MCP_USER_EMAIL` matches an active employee email
- Check Supabase connection settings
- Ensure employee `is_active = true`

### Permission Denied
- Verify user's job role
- Check lead assignment and reporting chain
- Review audit logs for details

### Tool Not Found
- Ensure server is running latest version
- Check tool name matches exactly
- Restart Claude Desktop after config changes

## Development

### Adding New Tools

1. Create tool file in `tools/` directory
2. Define Zod schema for input validation
3. Implement handler function
4. Export tool object with name, description, schema, handler
5. Register in `server.ts`

### Testing

```bash
# Run with test user
export MCP_USER_EMAIL="test@example.com"
node dist/mcp/server.js
```

Use the MCP Inspector for testing:
```bash
npx @modelcontextprotocol/inspector node dist/mcp/server.js
```

## Support

For issues or questions:
1. Check audit logs for error details
2. Review permission settings
3. Verify environment configuration
4. Check Supabase connection

## License

Proprietary - Internal use only
