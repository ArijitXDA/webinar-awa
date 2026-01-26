#!/usr/bin/env node
/**
 * CRM MCP Server with HTTP/SSE Support
 *
 * Supports both:
 * - stdio transport (for Claude Desktop)
 * - HTTP/SSE transport (for Vercel deployments like oStaran)
 *
 * Usage:
 *   stdio mode: node server.js
 *   HTTP mode:  HTTP_PORT=3000 node server.js
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { authenticateUser } from './auth.js'
import { MCPContext, MCPTool } from './types.js'
import express from 'express'
import cors from 'cors'

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

/**
 * Create and configure MCP server instance
 */
function createMCPServer() {
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

  // List available tools
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

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    // Find the tool
    const tool = tools.find((t) => t.name === name)
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`)
    }

    try {
      console.error(`[MCP Server] Executing tool: ${name}`)
      console.error(`[MCP Server] Arguments:`, JSON.stringify(args, null, 2))

      // Get email from request metadata or use default
      const email = (request as any).meta?.email || process.env.MCP_USER_EMAIL
      const apiKey = (request as any).meta?.apiKey || process.env.MCP_API_KEY

      if (!email) {
        throw new Error('MCP_USER_EMAIL is required for authentication')
      }

      // Authenticate for this request
      const mcpContext = await authenticateUser(email, apiKey)

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

  return server
}

/**
 * Start server in stdio mode (for Claude Desktop)
 */
async function startStdioMode() {
  console.error('[MCP Server] Starting in stdio mode...')

  // Check for user email
  if (!process.env.MCP_USER_EMAIL) {
    console.error('[MCP Server] Error: MCP_USER_EMAIL environment variable is required')
    process.exit(1)
  }

  // Authenticate once for stdio mode
  const email = process.env.MCP_USER_EMAIL
  const apiKey = process.env.MCP_API_KEY

  console.error(`[MCP Server] Authenticating user: ${email}`)
  const mcpContext = await authenticateUser(email, apiKey)
  console.error(
    `[MCP Server] Authentication successful for: ${mcpContext.employee.full_name} (${mcpContext.employee.job_role})`
  )

  // Create server
  const server = createMCPServer()

  // Create transport
  const transport = new StdioServerTransport()

  // Connect server to transport
  await server.connect(transport)

  console.error('[MCP Server] Running in stdio mode')
  console.error(`[MCP Server] Authenticated as: ${mcpContext.employee.full_name}`)
  console.error(`[MCP Server] Role: ${mcpContext.employee.job_role}`)
  console.error(`[MCP Server] Available tools: ${tools.length}`)
}

/**
 * Start server in HTTP mode (for Vercel/serverless)
 */
async function startHttpMode() {
  // Railway provides PORT, fallback to HTTP_PORT for local dev, then 3000
  const port = parseInt(process.env.PORT || process.env.HTTP_PORT || '3000')

  console.error('[MCP Server] Starting in HTTP/SSE mode...')
  console.error(`[MCP Server] Port: ${port}`)

  const app = express()

  // Enable CORS for Vercel deployments
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  }))

  app.use(express.json())

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', mode: 'http', tools: tools.length })
  })

  // SSE endpoint for MCP
  app.get('/sse', async (req, res) => {
    console.error('[MCP Server] New SSE connection')

    // Get auth from query params or headers
    const email = req.query.email as string || req.headers['x-mcp-email'] as string
    const apiKey = req.query.apiKey as string || req.headers['x-mcp-api-key'] as string

    if (!email) {
      res.status(401).json({ error: 'Email required for authentication' })
      return
    }

    try {
      // Authenticate
      const mcpContext = await authenticateUser(email, apiKey)
      console.error(`[MCP Server] SSE authenticated: ${mcpContext.employee.full_name}`)

      // Create server instance
      const server = createMCPServer()

      // Create SSE transport
      const transport = new SSEServerTransport('/message', res)

      // Connect server
      await server.connect(transport)

      console.error('[MCP Server] SSE connection established')
    } catch (error: any) {
      console.error('[MCP Server] SSE authentication failed:', error.message)
      res.status(401).json({ error: error.message })
    }
  })

  // POST endpoint for messages
  app.post('/message', async (req, res) => {
    console.error('[MCP Server] Received message:', req.body)
    // This is handled by SSE transport
    res.json({ received: true })
  })

  // List tools endpoint (for debugging)
  app.get('/tools', async (req, res) => {
    res.json({
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
      })),
    })
  })

  // Bind to 0.0.0.0 for Railway (required for external access)
  app.listen(port, '0.0.0.0', () => {
    console.error(`[MCP Server] HTTP server listening on 0.0.0.0:${port}`)
    console.error(`[MCP Server] SSE endpoint: /sse`)
    console.error(`[MCP Server] Health check: /health`)
    console.error(`[MCP Server] Available tools: ${tools.length}`)
  })
}

/**
 * Main entry point
 */
async function main() {
  // Determine mode based on environment
  // Railway sets PORT, local dev might use HTTP_PORT or USE_HTTP
  const useHttp = process.env.PORT || process.env.HTTP_PORT || process.env.USE_HTTP === 'true'

  if (useHttp) {
    await startHttpMode()
  } else {
    await startStdioMode()
  }
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
