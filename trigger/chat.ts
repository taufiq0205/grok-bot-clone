import { deepSeek } from "@ai-sdk/deepseek"
import { chat } from "@trigger.dev/sdk/ai"
import { Pool } from "pg"
import { z } from "zod"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  idleTimeoutMillis: 5_000,
  connectionTimeoutMillis: 10_000,
})
pool.on("error", () =>
  console.error("Unexpected idle database connection error")
)

const messagesSchema = z
  .array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant"]),
      parts: z
        .array(z.object({ type: z.literal("text"), text: z.string() }))
        .min(1),
    })
  )
  .min(1)

export const chatAgent = chat.agent({
  id: "chat-agent",
  onValidateMessages: async ({ messages }) => messagesSchema.parse(messages),
  uiMessageStreamOptions: {
    onError: () => "Could not get a reply. Please try again.",
  },
  run: async ({ chatId, messages, signal, streamText }) => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required")
    if (!process.env.DEEPSEEK_API_KEY)
      throw new Error("DEEPSEEK_API_KEY is required")
    const { rows } = await pool.query<{ instructions: string | null }>(
      `SELECT b.instructions FROM chats c
       LEFT JOIN LATERAL (
         SELECT b.instructions FROM chat_members m
         JOIN bots b ON b.id = m.bot_id AND b.user_id = c.user_id
         WHERE m.chat_id = c.id ORDER BY m.joined_at, b.id LIMIT 1
       ) b ON true WHERE c.id = $1`,
      [chatId]
    )
    if (!rows.length) throw new Error("Chat not found.")
    return streamText({
      model: deepSeek("deepseek-flash"),
      instructions: rows[0].instructions || "You are a helpful assistant.",
      messages,
      providerOptions: { deepseek: { thinking: { type: "disabled" } } },
      abortSignal: signal,
    })
  },
})
