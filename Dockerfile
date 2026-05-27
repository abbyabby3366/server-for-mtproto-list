# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend dependency files
COPY frontend/package*.json ./

# Install frontend dependencies (including devDependencies like vite)
RUN npm ci || npm install

# Copy frontend source code
COPY frontend/ ./

# Build the frontend assets to /app/frontend/dist
RUN npm run build

# Stage 2: Serve the application with Node.js backend
FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install backend production dependencies
RUN npm ci --only=production 2>/dev/null || npm install --only=production

# Copy backend files and configurations
COPY server.js ./
COPY proxies.json* ./
COPY transit-ips.json* ./
COPY android-version.json* ./
COPY .env.example* ./

# Copy built frontend assets from the builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port (Render or other hosting platforms will set PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/health || exit 1

# Start the Express server
CMD ["node", "server.js"]
