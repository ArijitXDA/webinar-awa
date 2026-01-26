# Railway Dockerfile for MCP Server
FROM node:20-alpine

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

# Start MCP server
CMD ["npm", "run", "mcp:railway"]
