# Deploy CRM MCP Server to Railway

This guide shows how to deploy the CRM MCP server to Railway so it can be accessed by oStaran (or other serverless deployments on Vercel).

## Why Railway?

- ✅ **Vercel is serverless** - cannot run persistent MCP stdio processes
- ✅ **Railway runs 24/7** - perfect for MCP servers
- ✅ **HTTP/SSE support** - works with Vercel function calls
- ✅ **Free tier available** - $5/month credit

## Prerequisites

1. Railway account (https://railway.app)
2. GitHub account with webinar-awa repository

## Step 1: Prepare Railway Deployment

The server is already configured! It supports both:
- **stdio mode** - for Claude Desktop (local)
- **HTTP/SSE mode** - for Vercel/serverless (Railway)

## Step 2: Deploy to Railway

### Option A: Deploy via GitHub (Recommended)

1. **Go to Railway Dashboard**
   - Visit https://railway.app
   - Click "New Project"

2. **Deploy from GitHub**
   - Select "Deploy from GitHub repo"
   - Choose `ArijitXDA/webinar-awa`
   - Select branch: `claude/review-ai-context-XFfuK`

3. **Railway will auto-detect** the configuration from `railway.json`

4. **Add Environment Variables**

   In Railway dashboard, go to Variables tab and add:

   ```
   # Required
   NEXT_PUBLIC_SUPABASE_URL=https://enszifyeqnwcnxaqrmrq.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuc3ppZnllcW53Y254YXFybXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTIyNTcsImV4cCI6MjA2OTY4ODI1N30.eCMgm8ayfG2RNkOSk8iOBEfZMl64gY7a8dLs1W3m79o

   # HTTP Mode
   HTTP_PORT=3000
   USE_HTTP=true

   # Optional: Restrict origins for security
   ALLOWED_ORIGINS=https://your-ostaran.vercel.app,https://your-ostaran-preview.vercel.app
   ```

5. **Deploy**
   - Railway will build and deploy automatically
   - Wait for deployment to complete (2-3 minutes)

6. **Get Your Railway URL**
   - In Railway dashboard, go to Settings → Domains
   - Click "Generate Domain"
   - Copy the URL (e.g., `https://your-app.up.railway.app`)

### Option B: Deploy via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to your project
railway link

# Add environment variables
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://enszifyeqnwcnxaqrmrq.supabase.co
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
railway variables set HTTP_PORT=3000
railway variables set USE_HTTP=true

# Deploy
railway up
```

## Step 3: Verify Deployment

### Test the Health Endpoint

```bash
curl https://your-app.up.railway.app/health
```

Should return:
```json
{
  "status": "ok",
  "mode": "http",
  "tools": 6
}
```

### Test the Tools Endpoint

```bash
curl https://your-app.up.railway.app/tools
```

Should return list of 6 CRM tools.

### Test SSE Connection

```bash
curl "https://your-app.up.railway.app/sse?email=your-email@example.com"
```

Should establish an SSE connection (you'll see connection logs).

## Step 4: Configure oStaran (Vercel)

In your oStaran Vercel project, add these environment variables:

```
CRM_MCP_SERVER_URL=https://your-app.up.railway.app
CRM_MCP_USER_EMAIL=your-email@example.com
CRM_SUPABASE_URL=https://enszifyeqnwcnxaqrmrq.supabase.co
CRM_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 5: Use HTTP Client in oStaran

Copy the HTTP client from `mcp-client-for-ostaran/crm-client-http.ts` (we'll create this next).

The HTTP client uses SSE instead of stdio, perfect for Vercel!

## Monitoring

### View Logs

In Railway dashboard:
- Click on your deployment
- Go to "Deployments" tab
- Click "View Logs"

### Check Metrics

Railway provides:
- CPU usage
- Memory usage
- Network traffic
- Request count

## Costs

**Railway Free Tier:**
- $5/month credit
- ~500 hours/month of usage
- Should be sufficient for development

**If you exceed:**
- Upgrade to Hobby plan ($5/month base + usage)
- Or use usage-based pricing

## Troubleshooting

### Error: "Build failed"

**Solution:** Check that:
- Branch is `claude/review-ai-context-XFfuK`
- Environment variables are set
- Build logs for specific errors

### Error: "Health check failed"

**Solution:**
- Check that `HTTP_PORT=3000` is set
- Verify Railway assigned port matches
- Check deployment logs

### Error: "Authentication failed"

**Solution:**
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Check that email exists in `crm_employees` table

### Error: "Connection timeout"

**Solution:**
- Check Railway service is running
- Verify firewall/network settings
- Check CORS if calling from browser

## Security Best Practices

1. **Restrict CORS Origins**
   ```
   ALLOWED_ORIGINS=https://your-ostaran.vercel.app
   ```

2. **Use API Keys** (optional additional security)
   ```
   MCP_API_KEY=your-secret-api-key
   ```

3. **Monitor Usage**
   - Set up Railway notifications
   - Monitor for unusual activity

4. **Rotate Keys**
   - Rotate Supabase keys periodically
   - Update Railway environment variables

## Updating the Server

When you update the MCP server code:

1. **Push to GitHub**
   ```bash
   git push origin claude/review-ai-context-XFfuK
   ```

2. **Railway auto-deploys**
   - Railway watches your GitHub branch
   - Automatically rebuilds and redeploys
   - Zero-downtime deployment

3. **Or manually trigger**
   - In Railway dashboard, click "Deploy"

## Alternative: Deploy Both Modes

You can deploy two Railway services:

1. **MCP Server (HTTP)** - for oStaran
2. **MCP Server (stdio)** - if needed for other integrations

Just create two Railway projects with different environment variables.

## Next Steps

1. ✅ Deploy to Railway
2. ✅ Get Railway URL
3. ✅ Configure oStaran with Railway URL
4. ✅ Use HTTP MCP client in oStaran
5. ✅ Test end-to-end

---

**Your Railway URL will be:** `https://your-app.up.railway.app`

**Add to oStaran .env:**
```
CRM_MCP_SERVER_URL=https://your-app.up.railway.app
```

Now oStaran (Vercel) can call your MCP server (Railway)! 🚀
