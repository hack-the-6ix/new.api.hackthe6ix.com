# HT6 API Backend

## Dependencies

* **Drizzle ORM**
* **Hono**

## Local Setup

1. Install **Bun** and **Docker**.
2. Clone the repository:
   `git clone https://github.com/hack-the-6ix/new.api.hackthe6ix.com.git`
3. Navigate into the project:
   `cd new.api.hackthe6ix.com`
4. Install dependencies:
   `bun install`
5. Create the environment file:
   `cp .env.example .env`
6. Start Postgres + API:
   `docker compose up`
   
   **Alternative:**

   * Start only the database: `docker compose up db`
   * Run the API separately: `bun run dev`
8. Apply database schema:
   `bunx drizzle-kit migrate`
9. (Optional) Seed the database:
   `bun run db:seed`

    * To reset and reseed: `bun run db:seed --reset` (DEV ONLY)

## Notes

* Use the Drizzle Kit CLI to interact with the database:
  [https://orm.drizzle.team/docs/kit-overview](https://orm.drizzle.team/docs/kit-overview)
* `bunx drizzle-kit studio` is quite nice

## API Documentation

* Available at the `/docs` endpoint.
* Reference for documenting endpoints:
  [https://hono.dev/examples/hono-openapi](https://hono.dev/examples/hono-openapi)
