"use client"

import { MonitorIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { DialogTrigger } from "@/components/ui/dialog"
import type { getChat } from "@/queries/chats"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import { useChatDesktop } from "@/components/chat-desktop"

export function ChatHeader({
  chat,
}: {
  chat: NonNullable<Awaited<ReturnType<typeof getChat>>>
}) {
  const { panelRef, panelId, open } = useChatDesktop()

  return (
    <header className="flex h-10 shrink-0 items-center gap-2 border-b px-4">
      <h1 className="min-w-0 flex-1">
        {chat.botId ? (
          <BotDialog
            bot={{
              id: chat.botId,
              name: chat.botName ?? "",
              avatar: chat.botAvatar ?? chat.botId,
              job: chat.botJob ?? "",
              instructions: chat.botInstructions ?? "",
            }}
          >
            <DialogTrigger
              render={<Button variant="ghost" />}
              aria-label={`Edit ${chat.botName ?? "bot"}`}
              className="max-w-full"
            >
              <ChatAvatar
                seed={chat.botAvatar ?? chat.botId}
                className="size-5"
              />
              <span className="truncate">{chat.botName}</span>
            </DialogTrigger>
          </BotDialog>
        ) : (
          "Untitled chat"
        )}
      </h1>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Desktop"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          const panel = panelRef.current
          if (panel?.isCollapsed()) panel.expand()
          else panel?.collapse()
        }}
      >
        <MonitorIcon aria-hidden="true" />
      </Button>
    </header>
  )
}
