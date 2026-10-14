import { notFound } from "next/navigation"

import { getChat } from "@/queries/chats"
import { ChatHeader } from "@/components/chat-header"

export default async function Page({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  const { chatId } = await params
  const chat = await getChat(chatId)

  if (!chat) notFound()

  return <ChatHeader chat={chat} />
}
