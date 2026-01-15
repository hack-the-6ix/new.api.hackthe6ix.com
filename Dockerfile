FROM oven/bun:alpine AS builder
WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile

# packages code + dependencies into singular file at dist/server.js
RUN bun run build

# create builds for scripts at dist/scripts/seed.js and dist/scripts/migrate.js
RUN bun run build:scripts

FROM oven/bun:alpine
WORKDIR /app

COPY --from=builder /app/dist .

# copy migration files (required by migrate script)
COPY /migrations ./migrations

EXPOSE 3000

CMD ["bun", "run", "server.js"]