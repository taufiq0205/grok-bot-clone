"use server"

import { auth } from "@clerk/nextjs/server"
import { auth as triggerAuth } from "@trigger.dev/sdk"
import { chat, defaultStorage } from "@trigger.dev/sdk/ai"
import { z } from "zod"

import { getChat } from "@/queries/chats"

const startSession = chat.createStartSessionAction("chat-agent")
const loadTranscript = chat.createLoadTranscriptAction(defaultStorage)

async function authorizeChat(chatId: string) {
  await auth.protect()
  z.string().min(1).max(100).parse(chatId)
  if (!(await getChat(chatId))) throw new Error("Chat not found.")
}

export async function startChatSession({ chatId }: { chatId: string }) {
  await authorizeChat(chatId)
  return startSession({ chatId })
}

export async function mintChatAccessToken(chatId: string) {
  await authorizeChat(chatId)
  return triggerAuth.createPublicToken({
    scopes: { read: { sessions: chatId }, write: { sessions: chatId } },
    expirationTime: "1h",
  })
}

export async function loadChatTranscript({ chatId }: { chatId: string }) {
  await authorizeChat(chatId)
  return loadTranscript({ chatId })
}
