# CRM MCP Server - Quick Start

## 1. Build

```bash
npm run build:mcp
```

## 2. Create API Keys Table

Execute this in your Supabase SQL editor:

```sql
-- Copy from src/mcp/migrations/create_api_keys_table.sql
```

## 3. Test Locally (Optional)

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
export MCP_USER_EMAIL="your-email@example.com"

# Run test script
./src/mcp/test-server.sh

# Or use MCP Inspector
npx @modelcontextprotocol/inspector node dist/mcp/server.js
```

## 4. Configure Claude Desktop

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "crm": {
      "command": "node",
      "args": ["/absolute/path/to/webinar-awa/dist/mcp/server.js"],
      "env": {
        "NEXT_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key",
        "MCP_USER_EMAIL": "your-email@example.com"
      }
    }
  }
}
```

**Important**:
- Use absolute path to server.js
- Replace all placeholder values
- Restart Claude Desktop after config change

## 5. Verify

In Claude Desktop, ask:
```
Search for high priority leads
```

## Available Tools

1. **search_leads** - Search and filter leads
2. **get_lead_details** - Get complete lead information
3. **update_lead** - Update lead fields
4. **add_interaction** - Record interactions
5. **get_analytics** - View CRM metrics
6. **bulk_operations** - Bulk update/assign/tag leads

## Permissions

- **Owner/Directors**: Full access to all leads
- **Managers (PMs/Leads)**: Team leads and subordinates
- **Employees**: Only assigned leads
- **Bulk Operations**: Managers and above only

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Authentication failed | Verify email exists in crm_employees and is_active=true |
| Permission denied | Check job_role and lead assignment |
| Tools not appearing | Rebuild (npm run build:mcp) and restart Claude Desktop |
| Server won't start | Verify all environment variables are set |

## Documentation

- **README.md** - Full documentation with examples
- **SETUP.md** - Detailed setup and configuration guide
- **QUICKSTART.md** - This file

## Support

Check audit logs in `crm_audit_log` table for operation history and errors.
