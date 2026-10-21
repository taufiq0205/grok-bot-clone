"use server"

import { auth } from "@clerk/nextjs/server"
import { z } from "zod"

import { getChat } from "@/queries/chats"
import { getDaytona } from "@/lib/daytona"

export async function connectDesktop(chatId: unknown) {
  await auth.protect()
  const id = z.string().min(1).max(100).safeParse(chatId)
  if (!id.success) return { error: "Invalid chat. Refresh and try again." }

  try {
    const chat = await getChat(id.data)
    if (chat?.kind === "group" || !chat?.botSandboxId)
      return {
        error: "This bot has no desktop. Create a new bot to get a desktop.",
      }
    const sandbox = await getDaytona().get(chat.botSandboxId)
    if (["stopped", "archived", "paused"].includes(sandbox.state ?? ""))
      await sandbox.start()
    else if (sandbox.state !== "started") await sandbox.waitUntilStarted()
    await sandbox.computerUse.start()
    const preview = await sandbox.getSignedPreviewUrl(6080, 3600)
    const url = new URL("/websockify", preview.url)
    url.protocol = "wss:"
    return { url: url.toString() }
  } catch {
    console.error("Failed to connect sandbox desktop")
    return { error: "Could not connect to the desktop. Please retry." }
  }
}
