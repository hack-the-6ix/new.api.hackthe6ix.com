FROM oven/bun:canary-alpine AS builder
WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile
RUN bun run build

FROM oven/bun:canary-alpine
WORKDIR /app

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["bun", "run", "dist/server.js"]
