# oStaran MCP Integration - Quick Setup Guide

Since both `webinar-awa` (CRM) and `oStaran` are on GitHub, here's the fastest way to integrate:

## Step-by-Step Setup

### 1. In Your oStaran Project

```bash
# Navigate to oStaran project
cd /path/to/oStaran

# Add webinar-awa as a git submodule
git submodule add https://github.com/ArijitXDA/webinar-awa.git crm-mcp-server

# Initialize and update the submodule
git submodule update --init --recursive

# Go into the submodule
cd crm-mcp-server

# Checkout the correct branch
git checkout claude/review-ai-context-XFfuK

# Install dependencies
npm install

# Build the MCP server
npm run build:mcp

# Go back to oStaran root
cd ..
```

### 2. Copy Client Code to oStaran

```bash
# Create integration directory
mkdir -p src/integrations/crm

# Copy the MCP client
cp crm-mcp-server/mcp-client-for-ostaran/crm-client.ts src/integrations/crm/

# Copy usage examples (optional)
cp crm-mcp-server/mcp-client-for-ostaran/example-usage.ts src/integrations/crm/

# Install MCP SDK
npm install @modelcontextprotocol/sdk
```

### 3. Configure Environment Variables

Create `.env` file in oStaran root:

```bash
# CRM MCP Configuration
CRM_MCP_SERVER_PATH=/absolute/path/to/oStaran/crm-mcp-server/dist/mcp/server.js
CRM_MCP_USER_EMAIL=your-email@example.com

# Supabase (CRM Database)
CRM_SUPABASE_URL=https://enszifyeqnwcnxaqrmrq.supabase.co
CRM_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuc3ppZnllcW53Y254YXFybXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTIyNTcsImV4cCI6MjA2OTY4ODI1N30.eCMgm8ayfG2RNkOSk8iOBEfZMl64gY7a8dLs1W3m79o
```

**To get the absolute path:**
```bash
cd crm-mcp-server/dist/mcp
pwd
# Copy the output and add /server.js
# Example: /Users/arijit/Projects/oStaran/crm-mcp-server/dist/mcp/server.js
```

### 4. Add to Your .gitignore

```bash
echo ".env" >> .gitignore
```

### 5. Use in oStaran Code

```typescript
// In your oStaran main file
import { initializeCRM, getCRMClient } from './integrations/crm/crm-client';
import 'dotenv/config'; // Load environment variables

async function setupCRM() {
  const crm = await initializeCRM({
    serverPath: process.env.CRM_MCP_SERVER_PATH!,
    userEmail: process.env.CRM_MCP_USER_EMAIL!,
    supabaseUrl: process.env.CRM_SUPABASE_URL!,
    supabaseKey: process.env.CRM_SUPABASE_KEY!,
  });

  console.log('✅ CRM connected!');
  return crm;
}

// In your AI agent logic
async function handleCRMQuery(query: string) {
  const crm = getCRMClient();

  // Example: Search for high priority leads
  if (query.includes('high priority')) {
    const leads = await crm.searchLeads({ priority: 'high', limit: 10 });
    return leads;
  }

  // Example: Get analytics
  if (query.includes('analytics')) {
    const analytics = await crm.getAnalytics();
    return analytics;
  }

  // Add more handlers...
}

// Initialize on startup
setupCRM().then(() => {
  console.log('oStaran ready with CRM integration!');
});
```

## Quick Test

```bash
# In oStaran project root
npx ts-node src/integrations/crm/example-usage.ts
```

This will:
1. ✅ Connect to CRM MCP server
2. ✅ List available tools
3. ✅ Search for leads
4. ✅ Get analytics
5. ✅ Show example AI integration

## Available CRM Operations

```typescript
// Search leads
const leads = await crm.searchLeads({
  priority: 'high',
  temperature: 'hot',
  limit: 10
});

// Get lead details
const details = await crm.getLeadDetails(leadId, {
  includeInteractions: true
});

// Add interaction
await crm.addInteraction({
  leadId: 'uuid-here',
  interactionType: 'call',
  discussionNotes: 'Discussed pricing...',
  leadScore: 5,
  priority: 'high'
});

// Update lead
await crm.updateLead(leadId, {
  lead_status: 'contacted',
  priority: 'urgent',
  tags: ['hot-lead', 'enterprise']
});

// Get analytics
const analytics = await crm.getAnalytics({
  groupBy: 'status',
  startDate: '2026-01-01'
});
```

## Updating CRM Server Later

When there are updates to the CRM server:

```bash
cd crm-mcp-server
git pull origin claude/review-ai-context-XFfuK
npm install
npm run build:mcp
cd ..
```

## Your Project Structure

After setup:

```
oStaran/
├── crm-mcp-server/              # Git submodule
│   ├── dist/mcp/server.js       # Built MCP server
│   └── src/mcp/...
├── src/
│   ├── integrations/
│   │   └── crm/
│   │       ├── crm-client.ts    # CRM client
│   │       └── example-usage.ts # Examples
│   └── ... (your oStaran code)
├── .env                          # Your config (not committed)
├── .gitignore                    # Include .env
└── package.json
```

## Documentation

- **Complete guide**: `crm-mcp-server/src/mcp/OSTARAN_INTEGRATION.md`
- **Client docs**: `src/integrations/crm/README.md` (after copying)
- **Examples**: `src/integrations/crm/example-usage.ts`

## What You Get

✅ **6 CRM Tools**
- Search leads with filters
- Get lead details
- Update leads
- Add interactions
- View analytics
- Bulk operations

✅ **Permission Aware**
- Respects your CRM role
- Filters accessible leads
- Audit logging

✅ **Production Ready**
- TypeScript types
- Error handling
- Auto cleanup
- Process management

✅ **AI-Friendly**
- Clean function API
- JSON responses
- Easy integration

---

**Need the absolute path?** Run this in oStaran:
```bash
cd crm-mcp-server/dist/mcp && pwd && echo "/server.js"
```

**Ready to test?** Run:
```bash
npx ts-node src/integrations/crm/example-usage.ts
```

That's it! Your oStaran AI agent now has full CRM access! 🚀
