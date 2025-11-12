# New HT6 API Backend

Main dependencies:
- DrizzleORM
- Hono

How to run locally:
1. install bun and docker onto machine
2. `git clone https://github.com/hack-the-6ix/new.api.hackthe6ix.com.git`
3. `cd new.api.hackthe6ix.com`
4. `bun install`
5. `cp .env.example .env` to create env file
6. `docker-compose up` for postgres instance
7. `bun run dev` for hono server

Use Drizzle-kit cli tools for interfacing with database
https://orm.drizzle.team/docs/kit-overview 

