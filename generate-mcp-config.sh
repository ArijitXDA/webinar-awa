#!/bin/bash

# Script to generate Claude Desktop MCP configuration
# Run this on your LOCAL machine (not in Docker/container)

echo "=== Claude Desktop MCP Configuration Generator ==="
echo ""

# Get current directory
CURRENT_DIR=$(pwd)

# Check if we're in the webinar-awa directory
if [[ ! -f "package.json" ]] || [[ ! -d "src/mcp" ]]; then
    echo "ERROR: Please run this script from the webinar-awa project root directory"
    exit 1
fi

# Check if server.js exists
if [[ ! -f "dist/mcp/server.js" ]]; then
    echo "ERROR: dist/mcp/server.js not found!"
    echo "Please run: npm run build:mcp"
    exit 1
fi

# Get absolute path
SERVER_PATH="$CURRENT_DIR/dist/mcp/server.js"

echo "✓ Found MCP server at: $SERVER_PATH"
echo ""
echo "=== Your Claude Desktop Configuration ==="
echo ""
echo "Add this to your claude_desktop_config.json:"
echo ""
echo "Config file location:"
echo "  macOS:   ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "  Windows: %APPDATA%\\Claude\\claude_desktop_config.json"
echo "  Linux:   ~/.config/Claude/claude_desktop_config.json"
echo ""
echo "----------------------------------------"
cat <<EOF
{
  "mcpServers": {
    "crm": {
      "command": "node",
      "args": [
        "$SERVER_PATH"
      ],
      "env": {
        "NEXT_PUBLIC_SUPABASE_URL": "https://enszifyeqnwcnxaqrmrq.supabase.co",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuc3ppZnllcW53Y254YXFybXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTIyNTcsImV4cCI6MjA2OTY4ODI1N30.eCMgm8ayfG2RNkOSk8iOBEfZMl64gY7a8dLs1W3m79o",
        "MCP_USER_EMAIL": "YOUR_EMAIL_HERE@example.com"
      }
    }
  }
}
EOF
echo "----------------------------------------"
echo ""
echo "IMPORTANT: Replace YOUR_EMAIL_HERE@example.com with your actual email from crm_employees table!"
echo ""
echo "After updating the config:"
echo "1. Save the file"
echo "2. Completely quit and restart Claude Desktop"
echo "3. Look for the 🔌 icon indicating MCP is connected"
echo ""
