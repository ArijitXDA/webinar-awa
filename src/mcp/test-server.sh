#!/bin/bash

# MCP Server Test Script
# This script tests if the MCP server can start and authenticate

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing CRM MCP Server...${NC}\n"

# Check if build exists
if [ ! -f "dist/mcp/server.js" ]; then
    echo -e "${RED}Error: dist/mcp/server.js not found${NC}"
    echo "Run 'npm run build:mcp' first"
    exit 1
fi

echo -e "${GREEN}✓ Build files found${NC}"

# Check environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}Error: NEXT_PUBLIC_SUPABASE_URL not set${NC}"
    echo "Set environment variables before running this script:"
    echo "  export NEXT_PUBLIC_SUPABASE_URL=\"your-url\""
    echo "  export NEXT_PUBLIC_SUPABASE_ANON_KEY=\"your-key\""
    echo "  export MCP_USER_EMAIL=\"your-email@example.com\""
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}Error: NEXT_PUBLIC_SUPABASE_ANON_KEY not set${NC}"
    exit 1
fi

if [ -z "$MCP_USER_EMAIL" ]; then
    echo -e "${RED}Error: MCP_USER_EMAIL not set${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment variables set${NC}"

# Test server initialization
echo -e "\n${YELLOW}Testing server initialization...${NC}"
echo "This will start the server for 3 seconds to verify it can authenticate."
echo ""

# Start server in background and capture output
timeout 3s node dist/mcp/server.js 2>&1 &
SERVER_PID=$!

# Wait a moment for server to initialize
sleep 2

# Check if server is still running (authentication successful)
if kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${GREEN}✓ Server started successfully${NC}"
    echo -e "${GREEN}✓ Authentication successful${NC}"

    # Kill the server
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true

    echo -e "\n${GREEN}All tests passed!${NC}"
    echo -e "\nNext steps:"
    echo "1. Review SETUP.md for Claude Desktop configuration"
    echo "2. Or use MCP Inspector: npx @modelcontextprotocol/inspector node dist/mcp/server.js"
    exit 0
else
    echo -e "${RED}✗ Server failed to start${NC}"
    echo "Check the error messages above"
    exit 1
fi
