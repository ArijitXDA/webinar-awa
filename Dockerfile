# Railway Dockerfile for MCP Server
FROM node:20-alpine

# Add curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy TypeScript config and source
COPY tsconfig.mcp.json ./
COPY src/mcp ./src/mcp

# Install TypeScript for build
RUN npm install -D typescript

# Build MCP server
RUN npm run build:mcp

# Expose port (Railway will provide PORT env var)
EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start MCP server directly with node (not npm)
CMD ["node", "dist/mcp/server-http.js"]
