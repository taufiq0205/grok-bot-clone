"use server"

import { and, eq } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { DaytonaNotFoundError, type Sandbox } from "@daytona/sdk"

import { db } from "@/lib/db"
import { getDaytona } from "@/lib/daytona"
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

  let stage = "create sandbox"
  let sandbox: Sandbox | undefined
  try {
    sandbox = await getDaytona().create({ autoDeleteInterval: -1 })
    stage = "create MEMORY.md"
    await sandbox.fs.uploadFile(Buffer.alloc(0), "MEMORY.md", 60)
    stage = "stop sandbox"
    await sandbox.stop()
    const sandboxId = sandbox.id
    stage = "save bot and chat"
    await db.transaction(async (tx) => {
      const [bot] = await tx
        .insert(bots)
        .values(insertBotSchema.parse({ ...parsed.data, userId, sandboxId }))
        .returning({ id: bots.id })
      const [chat] = await tx
        .insert(chats)
        .values({ userId, kind: "direct" })
        .returning({ id: chats.id })
      await tx.insert(chatMembers).values({ chatId: chat.id, botId: bot.id })
    })
  } catch (error) {
    let message = error instanceof Error ? error.message : "Unknown error"
    for (const [key, value] of Object.entries(process.env)) {
      if (value && /KEY|TOKEN|SECRET|PASSWORD|DATABASE_URL/.test(key))
        message = message.replaceAll(value, "[REDACTED]")
    }
    console.error(`Failed to create bot: ${JSON.stringify({ stage, message })}`)
    if (sandbox) {
      try {
        await sandbox.delete()
      } catch {
        console.error("Failed to clean up bot sandbox", sandbox.id)
      }
    }
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
    const bot = await db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(bots)
        .where(and(eq(bots.id, id.data), eq(bots.userId, userId)))
        .returning({ id: bots.id, sandboxId: bots.sandboxId })
      if (deleted?.sandboxId) {
        try {
          const sandbox = await getDaytona().get(deleted.sandboxId)
          await sandbox.delete()
        } catch (error) {
          // A previous deletion may have succeeded before the DB commit failed.
          if (!(error instanceof DaytonaNotFoundError)) throw error
        }
      }
      return deleted
    })
    if (!bot) return { error: "Bot not found. Refresh the page and try again." }
  } catch {
    console.error("Failed to delete bot")
    return { error: "Could not delete your bot. Please try again." }
  }

  revalidatePath("/(dashboard)", "layout")
  return { success: true }
}
