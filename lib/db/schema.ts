import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { nanoid } from "nanoid"
import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"

export const bots = pgTable(
  "bots",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    avatar: text("avatar")
      .notNull()
      .$defaultFn(() => nanoid()),
    job: text("job").notNull(),
    instructions: text("instructions"),
    sandboxId: text("sandbox_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("bots_user_id_idx").on(table.userId)]
)

export const insertBotSchema = createInsertSchema(bots, {
  name: (schema) => schema.trim().min(1, "Name is required").max(100),
  job: (schema) => schema.trim().min(1, "Job is required").max(200),
  avatar: (schema) => schema.trim().min(1).max(100),
  instructions: (schema) => schema.trim().max(10000),
})

export const createBotSchema = insertBotSchema
  .pick({
    name: true,
    job: true,
    avatar: true,
    instructions: true,
  })
  .extend({
    avatar: z.string().trim().min(1).max(100),
    instructions: z.string().trim().max(10000),
  })

export type CreateBotInput = z.infer<typeof createBotSchema>
