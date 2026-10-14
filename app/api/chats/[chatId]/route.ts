import { deepSeek } from "@ai-sdk/deepseek"
import { auth } from "@clerk/nextjs/server"
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
} from "ai"
import { z } from "zod"

import { getChat } from "@/queries/chats"

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(["user", "assistant"]),
        parts: z
          .array(z.object({ type: z.literal("text"), text: z.string() }))
          .min(1),
      })
    )
    .min(1),
})

export const maxDuration = 60

export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  await auth.protect()
  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success)
    return Response.json({ error: "Invalid messages." }, { status: 400 })

  const { chatId } = await params
  const chat = await getChat(chatId)
  if (!chat) return Response.json({ error: "Chat not found." }, { status: 404 })
  if (!process.env.DEEPSEEK_API_KEY)
    return Response.json(
      { error: "Configure DEEPSEEK_API_KEY to enable chat." },
      { status: 503 }
    )

  const result = streamText({
    model: deepSeek("deepseek-flash"),
    instructions: chat.botInstructions || "You are a helpful assistant.",
    messages: await convertToModelMessages(parsed.data.messages),
    providerOptions: { deepseek: { thinking: { type: "disabled" } } },
    abortSignal: req.signal,
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: () => "Could not get a reply. Please try again.",
    }),
  })
}
