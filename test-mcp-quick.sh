#!/bin/bash

# Quick test script for MCP server
export NEXT_PUBLIC_SUPABASE_URL="https://enszifyeqnwcnxaqrmrq.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuc3ppZnllcW53Y254YXFybXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTIyNTcsImV4cCI6MjA2OTY4ODI1N30.eCMgm8ayfG2RNkOSk8iOBEfZMl64gY7a8dLs1W3m79o"
export MCP_USER_EMAIL="your-email@example.com"  # CHANGE THIS!

echo "Testing MCP server..."
timeout 3s node dist/mcp/server.js 2>&1 | head -20

echo ""
echo "If you see 'Authentication successful' above, the server is working!"
