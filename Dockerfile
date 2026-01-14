FROM oven/bun:canary-alpine
WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile

RUN bun run build

EXPOSE 3000

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD bun run -e 'fetch("http://localhost:3000").then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))'

CMD ["bun", "run", "start"]
