import { notFound } from "next/navigation"

import { getChat } from "@/queries/chats"
import { ChatHeader } from "@/components/chat-header"
import { Chat } from "@/components/chat"

export default async function Page({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  const { chatId } = await params
  const chat = await getChat(chatId)

  if (!chat) notFound()

  return (
    <div className="flex h-dvh flex-col">
      <ChatHeader chat={chat} />
      <Chat key={chatId} chatId={chatId} />
    </div>
  )
}
