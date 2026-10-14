"use server"

import { and, eq } from "drizzle-orm"
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

export async function updateBot(botId: unknown, input: unknown) {
  const { userId } = await auth.protect()
  const id = insertBotSchema.shape.id.unwrap().safeParse(botId)
  const parsed = createBotSchema.safeParse(input)
  if (!id.success || !id.data || !parsed.success) {
    return { error: "Check the bot details and try again." }
  }

  try {
    const [bot] = await db
      .update(bots)
      .set(parsed.data)
      .where(and(eq(bots.id, id.data), eq(bots.userId, userId)))
      .returning({ id: bots.id })
    if (!bot) return { error: "Bot not found. Refresh the page and try again." }
  } catch {
    console.error("Failed to update bot")
    return { error: "Could not update your bot. Please try again." }
  }

  revalidatePath("/(dashboard)", "layout")
  return { success: true }
}

export async function deleteBot(botId: unknown) {
  const { userId } = await auth.protect()
  const id = insertBotSchema.shape.id.unwrap().safeParse(botId)
  if (!id.success || !id.data)
    return { error: "Invalid bot. Refresh the page and try again." }

  try {
    const [bot] = await db
      .delete(bots)
      .where(and(eq(bots.id, id.data), eq(bots.userId, userId)))
      .returning({ id: bots.id })
    if (!bot) return { error: "Bot not found. Refresh the page and try again." }
  } catch {
    console.error("Failed to delete bot")
    return { error: "Could not delete your bot. Please try again." }
  }

  revalidatePath("/(dashboard)", "layout")
  return { success: true }
}
