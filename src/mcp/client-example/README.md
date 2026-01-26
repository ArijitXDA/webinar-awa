# CRM MCP Client for oStaran

This directory contains the CRM MCP client code that you can integrate into your oStaran AI agent project.

## Quick Setup for oStaran (GitHub-based)

Since both projects are on GitHub, here's the recommended workflow:

### Option 1: Git Submodule (Recommended)

This keeps the CRM server code synced automatically:

```bash
# In your oStaran project root
cd ~/projects/oStaran  # or wherever your oStaran is

# Add webinar-awa as a submodule
git submodule add https://github.com/ArijitXDA/webinar-awa.git crm-mcp-server
git submodule update --init --recursive

# Build the MCP server
cd crm-mcp-server
npm install
npm run build:mcp

# Go back to oStaran root
cd ..

# Copy the client code to your project
mkdir -p src/integrations/crm
cp crm-mcp-server/src/mcp/client-example/crm-client.ts src/integrations/crm/
cp crm-mcp-server/src/mcp/client-example/example-usage.ts src/integrations/crm/

# Install MCP SDK in oStaran
npm install @modelcontextprotocol/sdk
```

**Later, to update the CRM server:**
```bash
cd crm-mcp-server
git pull origin claude/review-ai-context-XFfuK
npm install
npm run build:mcp
cd ..
```

### Option 2: Separate Clone

Keep them as separate repositories:

```bash
# Clone webinar-awa next to oStaran
cd ~/projects
git clone https://github.com/ArijitXDA/webinar-awa.git

# Build the MCP server
cd webinar-awa
npm install
npm run build:mcp

# Go to oStaran
cd ../oStaran

# Copy client code
mkdir -p src/integrations/crm
cp ../webinar-awa/src/mcp/client-example/crm-client.ts src/integrations/crm/
cp ../webinar-awa/src/mcp/client-example/example-usage.ts src/integrations/crm/

# Install MCP SDK
npm install @modelcontextprotocol/sdk
```

### Option 3: Direct Download (Simplest)

Download just the built server without cloning:

```bash
# In oStaran project
cd ~/projects/oStaran

# Create directory for MCP server
mkdir -p external/crm-mcp

# Download the built server (you'll need to build it once first)
# For now, use Option 1 or 2

# Copy client code
mkdir -p src/integrations/crm
# Download these files from GitHub:
# - crm-client.ts
# - example-usage.ts

# Install MCP SDK
npm install @modelcontextprotocol/sdk
```

## Configuration

### Step 1: Set Environment Variables

Create `.env` file in your oStaran project:

```bash
# CRM MCP Server Configuration
CRM_MCP_SERVER_PATH=/absolute/path/to/webinar-awa/dist/mcp/server.js
CRM_MCP_USER_EMAIL=your-email@example.com

# Supabase Configuration
CRM_SUPABASE_URL=https://enszifyeqnwcnxaqrmrq.supabase.co
CRM_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuc3ppZnllcW53Y254YXFybXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTIyNTcsImV4cCI6MjA2OTY4ODI1N30.eCMgm8ayfG2RNkOSk8iOBEfZMl64gY7a8dLs1W3m79o

# Optional: API Key for additional security
# CRM_API_KEY=your-api-key-here
```

**IMPORTANT:** Add `.env` to your `.gitignore` to keep credentials safe!

### Step 2: Update Server Path

The path depends on your setup:

**Option 1 (Submodule):**
```bash
CRM_MCP_SERVER_PATH=/absolute/path/to/oStaran/crm-mcp-server/dist/mcp/server.js
```

**Option 2 (Separate Clone):**
```bash
CRM_MCP_SERVER_PATH=/absolute/path/to/webinar-awa/dist/mcp/server.js
```

**To get the absolute path:**
```bash
# In the webinar-awa directory (or crm-mcp-server if submodule)
cd dist/mcp
pwd
# This shows: /Users/yourname/projects/webinar-awa/dist/mcp

# So your path is:
# /Users/yourname/projects/webinar-awa/dist/mcp/server.js
```

### Step 3: Load Environment Variables

In your oStaran main file:

```typescript
// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Or if using ES modules
import 'dotenv/config';
```

## Basic Usage in oStaran

### Simple Integration

```typescript
import { initializeCRM, getCRMClient, shutdownCRM } from './integrations/crm/crm-client';

async function setupCRM() {
  // Initialize CRM client
  const client = await initializeCRM({
    serverPath: process.env.CRM_MCP_SERVER_PATH!,
    userEmail: process.env.CRM_MCP_USER_EMAIL!,
    supabaseUrl: process.env.CRM_SUPABASE_URL!,
    supabaseKey: process.env.CRM_SUPABASE_KEY!,
    apiKey: process.env.CRM_API_KEY,
  });

  console.log('✅ CRM connected!');
  return client;
}

async function main() {
  const crm = await setupCRM();

  // Use CRM
  const leads = await crm.searchLeads({ priority: 'high', limit: 5 });
  console.log(`Found ${leads.total} high priority leads`);

  // Cleanup on exit
  process.on('SIGINT', async () => {
    await shutdownCRM();
    process.exit(0);
  });
}

main();
```

### Integration with oStaran's AI

If oStaran uses function calling:

```typescript
import { getCRMClient } from './integrations/crm/crm-client';

// Define CRM tools for your LLM
const crmTools = [
  {
    name: 'search_crm_leads',
    description: 'Search for leads in CRM',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
        limit: { type: 'number', default: 10 },
      },
    },
  },
  {
    name: 'add_crm_interaction',
    description: 'Record an interaction with a lead',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        interactionType: { type: 'string', enum: ['call', 'whatsapp', 'email', 'meeting', 'note'] },
        notes: { type: 'string' },
      },
      required: ['leadId', 'interactionType', 'notes'],
    },
  },
  // Add more tools as needed
];

// Handle function calls from LLM
async function handleToolCall(toolName: string, args: any) {
  const crm = getCRMClient();

  switch (toolName) {
    case 'search_crm_leads':
      return await crm.searchLeads(args);

    case 'add_crm_interaction':
      return await crm.addInteraction({
        leadId: args.leadId,
        interactionType: args.interactionType,
        discussionNotes: args.notes,
      });

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
```

## Testing

### Quick Test

```bash
# Copy the example usage file
cp src/integrations/crm/example-usage.ts test-crm.ts

# Update the paths in test-crm.ts
# Then run:
npx ts-node test-crm.ts
```

### Or create a simple test:

```typescript
// test-crm-simple.ts
import { initializeCRM, shutdownCRM } from './src/integrations/crm/crm-client';

async function test() {
  console.log('Connecting to CRM...');

  const crm = await initializeCRM({
    serverPath: process.env.CRM_MCP_SERVER_PATH!,
    userEmail: process.env.CRM_MCP_USER_EMAIL!,
    supabaseUrl: process.env.CRM_SUPABASE_URL!,
    supabaseKey: process.env.CRM_SUPABASE_KEY!,
  });

  console.log('✅ Connected!');

  // List tools
  const tools = await crm.listTools();
  console.log('Available tools:', tools.map(t => t.name));

  // Search leads
  const leads = await crm.searchLeads({ limit: 3 });
  console.log(`\nFound ${leads.total} total leads`);
  leads.leads.forEach(lead => {
    console.log(`- ${lead.full_name}: ${lead.lead_status}`);
  });

  // Get analytics
  const analytics = await crm.getAnalytics();
  console.log(`\nTotal leads: ${analytics.summary.totalLeads}`);
  console.log(`Conversion rate: ${analytics.summary.conversionRate.toFixed(2)}%`);

  await shutdownCRM();
  console.log('\n✅ Test completed!');
}

test().catch(console.error);
```

Run: `npx ts-node test-crm-simple.ts`

## Directory Structure

After setup, your oStaran project should look like:

```
oStaran/
├── src/
│   ├── integrations/
│   │   └── crm/
│   │       ├── crm-client.ts       # CRM MCP client
│   │       └── example-usage.ts    # Usage examples
│   └── ... (your other files)
├── crm-mcp-server/                 # Git submodule (Option 1)
│   └── dist/mcp/server.js          # Built MCP server
├── .env                             # Your environment variables
├── package.json
└── ...
```

Or if using separate clone (Option 2):

```
projects/
├── oStaran/
│   ├── src/integrations/crm/
│   │   ├── crm-client.ts
│   │   └── example-usage.ts
│   └── .env
└── webinar-awa/
    └── dist/mcp/server.js
```

## Available CRM Tools

Once connected, you have access to:

1. **searchLeads()** - Find leads with filters
2. **getLeadDetails()** - Get complete lead info
3. **updateLead()** - Update lead properties
4. **addInteraction()** - Record interactions
5. **getAnalytics()** - View CRM metrics
6. **bulkOperation()** - Bulk update leads (managers only)

See `example-usage.ts` for detailed examples of each.

## Permissions

The MCP server respects your CRM role:

- **Owner/Directors:** Full access to all leads
- **Managers (PMs/Leads):** Access to team and subordinates' leads
- **Employees:** Only assigned leads

## Troubleshooting

### Error: "Cannot find module '@modelcontextprotocol/sdk'"

**Solution:**
```bash
npm install @modelcontextprotocol/sdk
```

### Error: "ENOENT: no such file or directory, stat '/path/to/server.js'"

**Solution:** Check your `CRM_MCP_SERVER_PATH` in `.env`:
```bash
# Get the correct path
cd webinar-awa/dist/mcp  # or crm-mcp-server/dist/mcp
pwd
# Use the output + /server.js in your .env
```

### Error: "Authentication failed"

**Solution:** Verify your email exists in `crm_employees` table:
```sql
SELECT email, full_name, is_active
FROM crm_employees
WHERE email = 'your-email@example.com';
```

### Server logs showing but tools not working

**Solution:** Check server startup logs for authentication success message. If you see "Authentication successful", the issue might be in your tool calls.

## Next Steps

1. ✅ Clone/add webinar-awa repository
2. ✅ Build the MCP server
3. ✅ Copy client code to oStaran
4. ✅ Set up environment variables
5. ✅ Run test to verify connection
6. ✅ Integrate with your AI logic
7. ✅ Deploy!

## Support

Check the parent documentation:
- `../OSTARAN_INTEGRATION.md` - Full integration guide
- `../README.md` - Complete MCP server documentation
- `../SETUP.md` - Troubleshooting and advanced setup

Need help? The CRM MCP server logs to stderr, so check those for detailed error messages.
