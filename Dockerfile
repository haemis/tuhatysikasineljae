# Virtual Business Card Bot - Dockerfile
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S bot -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=bot:nodejs /app/dist ./dist

# Copy configuration files
COPY --chown=bot:nodejs env.example .env.example

# Create necessary directories
RUN mkdir -p /app/logs && chown -R bot:nodejs /app/logs

# Switch to non-root user
USER bot

# Expose port (if needed for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('./dist/utils/healthCheck').default.checkHealth().then(console.log).catch(() => process.exit(1))"

# Start the application
CMD ["node", "dist/index.js"] 