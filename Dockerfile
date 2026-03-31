# ─── Stage 1: deps ───────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# ─── Stage 2: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Which app to build — passed at build time, e.g. --build-arg APP=persta
ARG APP=core

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:${APP}

# ─── Stage 3: runtime ────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ARG APP=core
ENV APP=${APP}
ENV NODE_ENV=production

# Only production node_modules
COPY --from=deps /app/node_modules ./node_modules
# Compiled output
COPY --from=builder /app/dist ./dist

EXPOSE 6000

CMD node dist/apps/${APP}/main
