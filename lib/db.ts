import "server-only"

import { attachDatabasePool } from "@vercel/functions"
import { db } from "./database"

attachDatabasePool(db.$client)

export { db }
