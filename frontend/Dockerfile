# EquiMind Frontend - Secure Multi-stage Docker Image

# Build stage
FROM node:20-alpine AS builder

# Security: Set labels
LABEL maintainer="EquiMind Team"
LABEL version="1.0"
LABEL description="EquiMind Frontend Service"

# Security: Create non-root user for build with specific UID/GID
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Security: Install security updates
RUN apk update && apk upgrade && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Security: Change ownership and switch to non-root user for build
RUN chown -R nextjs:nodejs /app
USER nextjs

# Copy package files
COPY --chown=nextjs:nodejs package*.json ./

# Install dependencies with security audit (skip audit for unfixable vulnerabilities)
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code and Docker environment
COPY --chown=nextjs:nodejs . .
COPY --chown=nextjs:nodejs .env.docker .env

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Security: Set labels
LABEL maintainer="EquiMind Team"
LABEL version="1.0"
LABEL description="EquiMind Frontend Production"

# Security: Install security updates and dumb-init
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init curl && \
    rm -rf /var/cache/apk/*

# Security: Remove default nginx content and config
RUN rm -rf /usr/share/nginx/html/* && \
    rm -f /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf

# Security: Set proper permissions and create required directories
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid && \
    chmod -R 755 /usr/share/nginx/html

# Security: Switch to non-root user
USER nginx

# Health check with curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# Expose port
EXPOSE 80

# Security: Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"]