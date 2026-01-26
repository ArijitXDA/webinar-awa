# oStaran (Vercel) + CRM MCP Server (Railway) Setup

Since oStaran is deployed on **Vercel** (serverless), we need the MCP server running on **Railway** (always-on service).

## Architecture

```
┌─────────────────────┐
│  oStaran (Vercel)   │
│  Serverless         │
└──────────┬──────────┘
           │ HTTP/SSE
           ▼
┌─────────────────────┐
│ MCP Server (Railway)│
│ Always Running      │
└──────────┬──────────┘
           │ Supabase API
           ▼
┌─────────────────────┐
│ Supabase Database   │
│ CRM Data            │
└─────────────────────┘
```

## Step 1: Deploy MCP Server to Railway

Follow the **RAILWAY_DEPLOYMENT.md** guide in this repository.

**Quick steps:**
1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Select `ArijitXDA/webinar-awa`
4. Branch: `claude/review-ai-context-XFfuK`
5. Add environment variables (see RAILWAY_DEPLOYMENT.md)
6. Get your Railway URL (e.g., `https://your-app.up.railway.app`)

## Step 2: Configure oStaran Environment Variables

In your oStaran Vercel project, add these environment variables:

### Via Vercel Dashboard

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add:

```
CRM_MCP_SERVER_URL=https://your-app.up.railway.app
CRM_MCP_USER_EMAIL=your-email@example.com
CRM_API_KEY=optional-api-key
```

Replace `https://your-app.up.railway.app` with your actual Railway URL.

### Via Vercel CLI

```bash
vercel env add CRM_MCP_SERVER_URL
# Enter: https://your-app.up.railway.app

vercel env add CRM_MCP_USER_EMAIL
# Enter: your-email@example.com

vercel env add CRM_API_KEY
# Enter: optional-api-key (or leave blank)
```

## Step 3: Copy HTTP Client to oStaran

```bash
# In your oStaran project
mkdir -p src/integrations/crm

# Copy the HTTP client (NOT the stdio client!)
cp path/to/webinar-awa/mcp-client-for-ostaran/crm-client-http.ts src/integrations/crm/crm-client.ts

# Install MCP SDK
npm install @modelcontextprotocol/sdk
```

**Important:** Use `crm-client-http.ts`, NOT `crm-client.ts` (which is for stdio/local use).

## Step 4: Use in oStaran Code

### Initialize in API Route or Server Action

```typescript
// src/app/api/crm/route.ts (or similar)
import { initializeCRM } from '@/integrations/crm/crm-client';

export async function GET(request: Request) {
  try {
    // Initialize CRM client
    const crm = await initializeCRM({
      serverUrl: process.env.CRM_MCP_SERVER_URL!,
      userEmail: process.env.CRM_MCP_USER_EMAIL!,
      apiKey: process.env.CRM_API_KEY,
    });

    // Use CRM tools
    const leads = await crm.searchLeads({ priority: 'high', limit: 10 });

    // Disconnect when done (serverless cleanup)
    await crm.disconnect();

    return Response.json({ leads });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### Initialize in Server Component

```typescript
// src/app/dashboard/page.tsx (Server Component)
import { initializeCRM } from '@/integrations/crm/crm-client';

export default async function DashboardPage() {
  const crm = await initializeCRM({
    serverUrl: process.env.CRM_MCP_SERVER_URL!,
    userEmail: process.env.CRM_MCP_USER_EMAIL!,
  });

  const analytics = await crm.getAnalytics();
  await crm.disconnect();

  return (
    <div>
      <h1>CRM Dashboard</h1>
      <p>Total Leads: {analytics.summary.totalLeads}</p>
      <p>Conversion Rate: {analytics.summary.conversionRate}%</p>
    </div>
  );
}
```

### Initialize in AI Agent Logic

```typescript
// src/lib/ai/crm-tools.ts
import { initializeCRM, getCRMClient } from '@/integrations/crm/crm-client';

// Initialize once
let initialized = false;

async function ensureCRMInitialized() {
  if (!initialized) {
    await initializeCRM({
      serverUrl: process.env.CRM_MCP_SERVER_URL!,
      userEmail: process.env.CRM_MCP_USER_EMAIL!,
    });
    initialized = true;
  }
  return getCRMClient();
}

// Define CRM tools for your AI
export const crmTools = [
  {
    name: 'search_crm_leads',
    description: 'Search for leads in the CRM',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        priority: {
          type: 'string',
          enum: ['urgent', 'high', 'medium', 'low'],
        },
        limit: { type: 'number', default: 10 },
      },
    },
    execute: async (params: any) => {
      const crm = await ensureCRMInitialized();
      return await crm.searchLeads(params);
    },
  },
  {
    name: 'get_crm_analytics',
    description: 'Get CRM analytics and metrics',
    parameters: {
      type: 'object',
      properties: {
        groupBy: {
          type: 'string',
          enum: ['status', 'source', 'priority', 'pipeline_stage'],
        },
      },
    },
    execute: async (params: any) => {
      const crm = await ensureCRMInitialized();
      return await crm.getAnalytics(params);
    },
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
          enum: ['call', 'whatsapp', 'email', 'meeting', 'note'],
        },
        discussionNotes: { type: 'string' },
        leadScore: { type: 'number', minimum: 1, maximum: 5 },
      },
      required: ['leadId', 'interactionType', 'discussionNotes'],
    },
    execute: async (params: any) => {
      const crm = await ensureCRMInitialized();
      return await crm.addInteraction(params);
    },
  },
];

// Use with your AI framework
export async function handleAIToolCall(toolName: string, args: any) {
  const tool = crmTools.find((t) => t.name === toolName);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  return await tool.execute(args);
}
```

## Step 5: Test the Integration

### Test API Route

```bash
# Deploy to Vercel
vercel deploy

# Test the endpoint
curl https://your-ostaran.vercel.app/api/crm
```

### Check Railway Logs

In Railway dashboard:
- Go to your deployment
- Click "View Logs"
- You should see connection logs from oStaran

## Important Differences from stdio Version

### ✅ HTTP/SSE Version (for Vercel)

```typescript
// Use crm-client-http.ts
import { initializeCRM } from '@/integrations/crm/crm-client';

await initializeCRM({
  serverUrl: process.env.CRM_MCP_SERVER_URL!,  // Railway URL
  userEmail: process.env.CRM_MCP_USER_EMAIL!,
});
```

### ❌ stdio Version (for local/Claude Desktop)

```typescript
// Use crm-client.ts
import { initializeCRM } from '@/integrations/crm/crm-client';

await initializeCRM({
  serverPath: '/path/to/server.js',  // Local file path
  userEmail: process.env.CRM_MCP_USER_EMAIL!,
  supabaseUrl: process.env.CRM_SUPABASE_URL!,
  supabaseKey: process.env.CRM_SUPABASE_KEY!,
});
```

## Connection Management in Serverless

**Important:** Vercel functions are stateless!

### Best Practices:

1. **Create connection per request**
   ```typescript
   // API route
   const crm = await initializeCRM(config);
   const result = await crm.searchLeads({...});
   await crm.disconnect();  // Always disconnect!
   ```

2. **Use connection pooling** (advanced)
   ```typescript
   // Reuse connection across warm invocations
   let globalClient: CRMClient | null = null;

   export async function getCRM() {
     if (!globalClient || !globalClient.connected) {
       globalClient = await initializeCRM(config);
     }
     return globalClient;
   }
   ```

3. **Handle timeouts**
   ```typescript
   const timeout = 10000; // 10 seconds
   const result = await Promise.race([
     crm.searchLeads(params),
     new Promise((_, reject) =>
       setTimeout(() => reject(new Error('Timeout')), timeout)
     ),
   ]);
   ```

## Troubleshooting

### Error: "Failed to connect to MCP server"

**Check:**
1. Railway server is running (check Railway dashboard)
2. `CRM_MCP_SERVER_URL` is correct in Vercel
3. Railway environment variables are set

### Error: "Authentication failed"

**Check:**
1. `CRM_MCP_USER_EMAIL` matches an active employee in the database
2. Railway has the correct Supabase credentials
3. Employee record has `is_active = true`

### Error: "Function timeout"

**Solutions:**
- Increase Vercel function timeout (requires Pro plan)
- Optimize queries (use pagination, filters)
- Check Railway server performance

### Error: "CORS error"

**Solution:**
In Railway, add `ALLOWED_ORIGINS` environment variable:
```
ALLOWED_ORIGINS=https://your-ostaran.vercel.app,https://your-ostaran-git-*.vercel.app
```

## Performance Tips

1. **Cache results** when possible
   ```typescript
   // Use Vercel's Data Cache
   const leads = await fetch('...', { next: { revalidate: 60 } });
   ```

2. **Batch requests**
   ```typescript
   // Get multiple resources in parallel
   const [leads, analytics] = await Promise.all([
     crm.searchLeads({}),
     crm.getAnalytics({}),
   ]);
   ```

3. **Use edge functions** for lower latency
   ```typescript
   // edge runtime
   export const runtime = 'edge';
   ```

## Cost Optimization

**Vercel:**
- Use edge functions when possible (faster, cheaper)
- Implement caching to reduce function invocations
- Use ISR (Incremental Static Regeneration) for dashboards

**Railway:**
- Monitor usage in dashboard
- Scale down during low traffic
- Use sleep mode for development (wakes on request)

## Next Steps

1. ✅ Deploy MCP server to Railway
2. ✅ Configure Vercel environment variables
3. ✅ Copy HTTP client to oStaran
4. ✅ Implement CRM tools in your AI logic
5. ✅ Test end-to-end
6. ✅ Monitor and optimize

---

**Your Setup:**
- **MCP Server:** `https://your-app.up.railway.app`
- **oStaran:** `https://your-ostaran.vercel.app`
- **Database:** Supabase Cloud

Now oStaran (Vercel) can access your CRM via the MCP server (Railway)! 🚀
