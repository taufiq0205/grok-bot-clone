import "server-only"

import { auth } from "@clerk/nextjs/server"
import { and, asc, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { bots, chatMembers, chats } from "@/lib/db/schema"

export async function getUserChats() {
  const { userId } = await auth.protect()
  const firstBot = db
    .select({ name: bots.name, avatar: bots.avatar })
    .from(chatMembers)
    .innerJoin(bots, eq(chatMembers.botId, bots.id))
    .where(and(eq(chatMembers.chatId, chats.id), eq(bots.userId, userId)))
    .orderBy(asc(chatMembers.joinedAt), asc(bots.id))
    .limit(1)
    .as("first_bot")

  return db
    .select({
      id: chats.id,
      name: chats.name,
      lastMessagePreview: chats.lastMessagePreview,
      lastMessageAt: chats.lastMessageAt,
      botName: firstBot.name,
      botAvatar: firstBot.avatar,
    })
    .from(chats)
    .leftJoinLateral(firstBot, eq(chats.userId, userId))
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.lastMessageAt), asc(chats.id))
}

export async function getChat(chatId: string) {
  const { userId } = await auth.protect()
  const firstBot = db
    .select({
      id: bots.id,
      name: bots.name,
      avatar: bots.avatar,
      job: bots.job,
      instructions: bots.instructions,
      sandboxId: bots.sandboxId,
    })
    .from(chatMembers)
    .innerJoin(bots, eq(chatMembers.botId, bots.id))
    .where(and(eq(chatMembers.chatId, chats.id), eq(bots.userId, userId)))
    .orderBy(asc(chatMembers.joinedAt), asc(bots.id))
    .limit(1)
    .as("first_bot")

  const [chat] = await db
    .select({
      id: chats.id,
      botId: firstBot.id,
      botJob: firstBot.job,
      botInstructions: firstBot.instructions,
      botSandboxId: firstBot.sandboxId,
      botName: firstBot.name,
      botAvatar: firstBot.avatar,
    })
    .from(chats)
    .leftJoinLateral(firstBot, eq(chats.userId, userId))
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1)

  return chat
}
