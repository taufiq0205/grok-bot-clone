"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import {
  bots,
  chatMembers,
  chats,
  createBotSchema,
  insertBotSchema,
} from "@/lib/db/schema"

export async function createBot(input: unknown) {
  const { userId } = await auth.protect()
  const parsed = createBotSchema.safeParse(input)
  if (!parsed.success) {
    return { error: "Check the bot details and try again." }
  }

  try {
    await db.transaction(async (tx) => {
      const [bot] = await tx
        .insert(bots)
        .values(insertBotSchema.parse({ ...parsed.data, userId }))
        .returning({ id: bots.id })
      const [chat] = await tx
        .insert(chats)
        .values({ userId, kind: "direct" })
        .returning({ id: chats.id })
      await tx.insert(chatMembers).values({ chatId: chat.id, botId: bot.id })
    })
  } catch {
    console.error("Failed to create bot")
    return { error: "Could not create your bot. Please try again." }
  }

  revalidatePath("/(dashboard)", "layout")
  return { success: true }
}
