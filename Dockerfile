# Stage 1: Base image with dependencies
FROM node:22-alpine AS base
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

# Stage 2: Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY app/ ./app/
RUN npm install --legacy-peer-deps

# Stage 3: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./
COPY . .

# Build arguments for Vite (needed at build time)
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Build shared types first, then client and server
RUN npm run build:shared && \
    npm run build:client && \
    npm run build:server

# Stage 4: Production runtime
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create data directory and certs directory with correct permissions
RUN mkdir -p /data/photos /certs && \
    chown -R nodejs:nodejs /data /certs

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/app/shared/dist ./app/shared/dist
COPY --from=builder --chown=nodejs:nodejs /app/app/server/dist ./app/server/dist
COPY --from=builder --chown=nodejs:nodejs /app/app/server/src/db/migrations ./app/server/dist/db/migrations
COPY --from=builder --chown=nodejs:nodejs /app/app/client/dist ./app/client/dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy workspace package.json files for reference
COPY --from=builder --chown=nodejs:nodejs /app/app/client/package.json ./app/client/
COPY --from=builder --chown=nodejs:nodejs /app/app/server/package.json ./app/server/
COPY --from=builder --chown=nodejs:nodejs /app/app/shared/package.json ./app/shared/

USER nodejs

EXPOSE 8080

VOLUME ["/data"]

CMD ["node", "app/server/dist/index.js"]