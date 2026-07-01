# MCP Server Setup Guide

## Prerequisites

1. **Database Setup**
   - Supabase project configured with CRM schema
   - Run the API keys migration:
   ```bash
   # Execute this SQL in your Supabase SQL editor
   cat src/mcp/migrations/create_api_keys_table.sql | pbcopy
   # Paste and execute in Supabase
   ```

2. **Environment Variables**
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `MCP_USER_EMAIL`: Email of the employee to authenticate as
   - `MCP_API_KEY`: (Optional) API key for additional authentication

## Build the MCP Server

```bash
npm run build:mcp
```

This will compile TypeScript files to JavaScript in the `dist/mcp` directory.

## Test the MCP Server

### Option 1: Using MCP Inspector (Recommended for Testing)

The MCP Inspector is a visual tool for testing MCP servers:

```bash
# Install MCP Inspector globally (one time)
npm install -g @modelcontextprotocol/inspector

# Run the inspector
npx @modelcontextprotocol/inspector \
  node dist/mcp/server.js
```

Then set environment variables in the inspector UI:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anon key
- `MCP_USER_EMAIL`: Your employee email

### Option 2: Direct Command Line Test

Create a test script:

```bash
#!/bin/bash
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
export MCP_USER_EMAIL="your-email@example.com"

node dist/mcp/server.js
```

The server will output diagnostic logs to stderr. You can test by sending JSON-RPC messages to stdin.

## Configure Claude Desktop

### macOS

Edit: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows

Edit: `%APPDATA%\Claude\claude_desktop_config.json`

### Configuration:

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
        "MCP_USER_EMAIL": "your-email@example.com"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/webinar-awa` with your actual project path.

## Verify Installation

1. **Restart Claude Desktop** after updating the config

2. **Check Server Status**: Look for the MCP icon (🔌) in Claude Desktop

3. **Test a Tool**: Try asking Claude:
   ```
   Search for leads with high priority
   ```

4. **View Logs**: Check the Claude Desktop developer console:
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%APPDATA%\Claude\logs\`

## Common Issues

### Authentication Failed

**Error**: `Employee not found or inactive`

**Solution**:
- Verify the email exists in `crm_employees` table
- Ensure `is_active = true` for the employee
- Check email matches exactly (case-insensitive but must match)

### Permission Denied

**Error**: `Insufficient permissions to access this lead`

**Solution**:
- Check the employee's `job_role` in the database
- Verify the lead's `assigned_to` matches the employee or their subordinates
- Review the permission hierarchy in README.md

### Server Won't Start

**Error**: `NEXT_PUBLIC_SUPABASE_URL environment variable is required`

**Solution**:
- Verify all environment variables are set in the Claude Desktop config
- Ensure there are no typos in variable names
- Check that the Supabase URL and key are correct

### Tools Not Appearing

**Solution**:
- Rebuild the MCP server: `npm run build:mcp`
- Restart Claude Desktop completely
- Check the config file for syntax errors (must be valid JSON)
- Verify the path to `server.js` is absolute and correct

## Generate API Keys (Optional)

To use API key authentication instead of just email:

```typescript
// Run this in a Node.js script or Next.js API route
import { generateApiKey } from './src/mcp/auth'

const employeeId = 'employee-uuid-here'
const apiKey = await generateApiKey(employeeId, 90) // 90 days expiry
console.log('API Key:', apiKey)
```

Then add to your config:

```json
{
  "env": {
    "MCP_USER_EMAIL": "your-email@example.com",
    "MCP_API_KEY": "crm_your_generated_api_key_here"
  }
}
```

## Security Checklist

- [ ] API keys table created with RLS policies
- [ ] Environment variables not committed to Git
- [ ] API keys rotated regularly (90 days)
- [ ] Audit logs monitored for suspicious activity
- [ ] Only trusted employees have access credentials
- [ ] Supabase RLS policies enabled on all tables

## Integration with oStaran

For integrating with your oStaran AI agent, see the example in README.md section "Using with oStaran or Other AI Agents".

The MCP server uses stdio transport, so it's compatible with any MCP client that supports the Model Context Protocol.

## Support

If you encounter issues:

1. Check audit logs in `crm_audit_log` table
2. Review server logs (stderr output)
3. Verify Supabase connection
4. Test with MCP Inspector first
5. Check all environment variables are set correctly
