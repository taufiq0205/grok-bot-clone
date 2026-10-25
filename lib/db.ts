import "server-only"

import { attachDatabasePool } from "@vercel/functions"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required")
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  idleTimeoutMillis: process.env.NODE_ENV === "development" ? 60_000 : 5_000,
  connectionTimeoutMillis: 10_000,
})
pool.on("error", () =>
  console.error("Unexpected idle database connection error")
)
attachDatabasePool(pool)

export const db = drizzle({ client: pool })
