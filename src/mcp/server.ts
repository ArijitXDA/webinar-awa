#!/usr/bin/env node
/**
 * CRM MCP Server
 * Model Context Protocol server for CRM operations
 *
 * Usage:
 *   node server.ts
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anon key
 *   MCP_USER_EMAIL - Email of the authenticated user (required)
 *   MCP_API_KEY - Optional API key for additional authentication
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { authenticateUser } from './auth.js'
import { MCPContext, MCPTool } from './types.js'

// Import tools
import { searchLeadsTool } from './tools/search-leads.js'
import { getLeadTool } from './tools/get-lead.js'
import { updateLeadTool } from './tools/update-lead.js'
import { addInteractionTool } from './tools/add-interaction.js'
import { getAnalyticsTool } from './tools/get-analytics.js'
import { bulkOperationsTool } from './tools/bulk-operations.js'

// Check environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'MCP_USER_EMAIL',
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} environment variable is required`)
    process.exit(1)
  }
}

// Tool registry
const tools: MCPTool[] = [
  searchLeadsTool,
  getLeadTool,
  updateLeadTool,
  addInteractionTool,
  getAnalyticsTool,
  bulkOperationsTool,
]

// Create server instance
const server = new Server(
  {
    name: 'crm-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// Global context (authenticated user)
let mcpContext: MCPContext | null = null

/**
 * Initialize authentication
 */
async function initializeAuth() {
  try {
    const email = process.env.MCP_USER_EMAIL!
    const apiKey = process.env.MCP_API_KEY

    console.error(`[MCP Server] Authenticating user: ${email}`)
    mcpContext = await authenticateUser(email, apiKey)
    console.error(
      `[MCP Server] Authentication successful for: ${mcpContext.employee.full_name} (${mcpContext.employee.job_role})`
    )
  } catch (error: any) {
    console.error(`[MCP Server] Authentication failed: ${error.message}`)
    process.exit(1)
  }
}

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: 'object' as const,
        properties: tool.inputSchema.shape as any,
      },
    })),
  }
})

/**
 * Handle tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (!mcpContext) {
    throw new Error('MCP server not authenticated. Please set MCP_USER_EMAIL environment variable.')
  }

  const { name, arguments: args } = request.params

  // Find the tool
  const tool = tools.find((t) => t.name === name)
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`)
  }

  try {
    console.error(`[MCP Server] Executing tool: ${name}`)
    console.error(`[MCP Server] Arguments:`, JSON.stringify(args, null, 2))

    // Validate input
    const validatedArgs = tool.inputSchema.parse(args)

    // Execute tool handler
    const result = await tool.handler(validatedArgs, mcpContext)

    console.error(`[MCP Server] Tool ${name} executed successfully`)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  } catch (error: any) {
    console.error(`[MCP Server] Tool ${name} failed:`, error.message)
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: error.message,
              tool: name,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    }
  }
})

/**
 * Start the server
 */
async function main() {
  console.error('[MCP Server] Starting CRM MCP Server...')

  // Initialize authentication
  await initializeAuth()

  // Create transport
  const transport = new StdioServerTransport()

  // Connect server to transport
  await server.connect(transport)

  console.error('[MCP Server] CRM MCP Server is running')
  console.error(
    `[MCP Server] Authenticated as: ${mcpContext?.employee.full_name} (${mcpContext?.employee.email})`
  )
  console.error(`[MCP Server] Role: ${mcpContext?.employee.job_role}`)
  console.error(`[MCP Server] Available tools: ${tools.length}`)
  tools.forEach((tool) => {
    console.error(`  - ${tool.name}`)
  })
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('[MCP Server] Uncaught exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (error) => {
  console.error('[MCP Server] Unhandled rejection:', error)
  process.exit(1)
})

// Start server
main().catch((error) => {
  console.error('[MCP Server] Failed to start:', error)
  process.exit(1)
})
