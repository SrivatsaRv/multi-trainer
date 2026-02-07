# Stage 1: Base
FROM node:20-alpine AS base
ENV NEXT_TELEMETRY_DISABLED 1
WORKDIR /app

# Stage 2: Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 3: Development target
# Used for local development with hot-reload via volumes
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV development
CMD ["npm", "run", "dev"]

# Stage 4: Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build the application using standalone mode
RUN npm run build

# Stage 5: Runner
FROM base AS runner
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Only copy what's absolutely necessary for standalone mode
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
