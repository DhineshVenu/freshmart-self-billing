# ==============================================================================
# STAGE 1: React 19 / Vite Build Environment
# ==============================================================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy package management files first to optimize Docker layer caching
COPY package*.json ./
RUN npm ci

# Copy frontend source code and static assets
COPY . .

# Compile minified production bundles into /app/dist
RUN npm run build

# ==============================================================================
# STAGE 2: Lightweight Production Runtime (NGINX Alpine ~25MB)
# ==============================================================================
FROM nginx:alpine

# Copy compiled static assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Inject custom NGINX configuration for SPA try_files and API reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Document container listening port
EXPOSE 80

# Launch NGINX in foreground (PID 1)
CMD ["nginx", "-g", "daemon off;"]
