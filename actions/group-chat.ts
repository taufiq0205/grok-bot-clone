"use server"

import { auth } from "@clerk/nextjs/server"
import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import {
  bots,
  chats,
  chatMembers,
  createGroupChatSchema,
} from "@/lib/db/schema"

export async function createGroupChat(input: unknown) {
  const { userId } = await auth.protect()
  const parsed = createGroupChatSchema.safeParse(input)
  if (!parsed.success)
    return { error: "Enter a name and pick at least two bots." }
  try {
    const chatId = await db.transaction(async (tx) => {
      const owned = await tx
        .select({ id: bots.id })
        .from(bots)
        .where(
          and(eq(bots.userId, userId), inArray(bots.id, parsed.data.botIds))
        )
        .for("share")
      if (owned.length !== parsed.data.botIds.length)
        throw new Error("Invalid bots")
      const [group] = await tx
        .insert(chats)
        .values({ userId, kind: "group", name: parsed.data.name })
        .returning({ id: chats.id })
      await tx
        .insert(chatMembers)
        .values(owned.map((bot) => ({ chatId: group.id, botId: bot.id })))
      return group.id
    })
    revalidatePath("/(dashboard)", "layout")
    return { chatId }
  } catch {
    return {
      error: "Could not create the group. Refresh your bot list and try again.",
    }
  }
}
