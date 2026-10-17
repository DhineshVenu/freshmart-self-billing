# ==============================================================================
# STAGE 1: Build & Transpilation Environment
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Step 1: Copy dependency definitions first to optimize Docker layer caching
COPY package*.json ./
RUN npm ci

# Step 2: Copy backend TypeScript source code
COPY . .

# Step 3: Compile TypeScript to JavaScript in /app/dist
RUN npm run build

# ==============================================================================
# STAGE 2: Lightweight Production Runtime
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Production environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Install production-only node dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled JavaScript distribution from builder stage
COPY --from=builder /app/dist ./dist

# Security Hardening: Switch execution away from root (UID 0) to unprivileged node user
USER node

# Expose backend REST API port
EXPOSE 5000

# Container Healthcheck (Unit 5 Postgraduate Syllabus Checkpoint)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start production server
CMD ["node", "dist/server.js"]
