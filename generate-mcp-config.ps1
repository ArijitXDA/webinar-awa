# PowerShell Script to generate Claude Desktop MCP configuration
# Run this on your LOCAL machine (not in Docker/container)

Write-Host "=== Claude Desktop MCP Configuration Generator ===" -ForegroundColor Cyan
Write-Host ""

# Get current directory
$CURRENT_DIR = Get-Location

# Check if we're in the webinar-awa directory
if (-not (Test-Path "package.json") -or -not (Test-Path "src/mcp" -PathType Container)) {
    Write-Host "ERROR: Please run this script from the webinar-awa project root directory" -ForegroundColor Red
    exit 1
}

# Check if server.js exists
if (-not (Test-Path "dist/mcp/server.js")) {
    Write-Host "ERROR: dist/mcp/server.js not found!" -ForegroundColor Red
    Write-Host "Please run: npm run build:mcp" -ForegroundColor Yellow
    exit 1
}

# Get absolute path and escape backslashes for JSON
$SERVER_PATH = Join-Path $CURRENT_DIR "dist\mcp\server.js"
$SERVER_PATH_JSON = $SERVER_PATH -replace '\\', '\\'

Write-Host "✓ Found MCP server at: $SERVER_PATH" -ForegroundColor Green
Write-Host ""
Write-Host "=== Your Claude Desktop Configuration ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Add this to your claude_desktop_config.json:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Config file location:"
Write-Host "  Windows: $env:APPDATA\Claude\claude_desktop_config.json" -ForegroundColor Yellow
Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Gray

$config = @"
{
  "mcpServers": {
    "crm": {
      "command": "node",
      "args": [
        "$SERVER_PATH_JSON"
      ],
      "env": {
        "NEXT_PUBLIC_SUPABASE_URL": "https://enszifyeqnwcnxaqrmrq.supabase.co",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuc3ppZnllcW53Y254YXFybXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMTIyNTcsImV4cCI6MjA2OTY4ODI1N30.eCMgm8ayfG2RNkOSk8iOBEfZMl64gY7a8dLs1W3m79o",
        "MCP_USER_EMAIL": "YOUR_EMAIL_HERE@example.com"
      }
    }
  }
}
"@

Write-Host $config
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""
Write-Host "IMPORTANT: Replace YOUR_EMAIL_HERE@example.com with your actual email from crm_employees table!" -ForegroundColor Yellow
Write-Host ""
Write-Host "After updating the config:"
Write-Host "1. Save the file"
Write-Host "2. Completely quit and restart Claude Desktop"
Write-Host "3. Look for the 🔌 icon indicating MCP is connected"
Write-Host ""

# Optionally copy to clipboard if available
if (Get-Command Set-Clipboard -ErrorAction SilentlyContinue) {
    Write-Host "💡 Tip: Configuration copied to clipboard!" -ForegroundColor Green
    $config | Set-Clipboard
}
