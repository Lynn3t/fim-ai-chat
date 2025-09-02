# Multi-stage build for Next.js + Prisma
# Builder stage
FROM node:20-alpine AS builder
WORKDIR /app

# Reduce noise and avoid telemetry
ENV NEXT_TELEMETRY_DISABLED=1
# Increase Node/V8 heap to avoid OOM during build
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Install deps
COPY package*.json ./
RUN npm ci

# Generate Prisma client early to leverage cache
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and build
COPY . .
# Ensure optional public directory exists to avoid COPY failures in runtime stage
RUN mkdir -p public
RUN npm run build

# Runtime stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Smaller heap is typically enough at runtime (adjust if needed)
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy build artifacts and minimal runtime files
COPY --from=builder /app/.next ./.next
# Copy public assets (may be empty if project has none)
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# Install production deps and ensure Prisma client exists
RUN npm ci --omit=dev && npx prisma generate

EXPOSE 3000

# Apply DB migrations on start, then launch Next
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
