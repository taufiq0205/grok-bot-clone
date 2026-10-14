"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useState } from "react"

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export function Chat({ chatId }: { chatId: string }) {
  const [text, setText] = useState("")
  const { messages, sendMessage, status, error, regenerate, stop } = useChat({
    transport: new DefaultChatTransport({ api: `/api/chats/${chatId}` }),
  })
  const pending = status === "submitted" || status === "streaming"

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation>
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 && <ConversationEmptyState />}
          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map(
                  (part, index) =>
                    part.type === "text" && (
                      <MessageResponse
                        key={index}
                        isAnimating={
                          status === "streaming" &&
                          message.id === messages.at(-1)?.id
                        }
                      >
                        {part.text}
                      </MessageResponse>
                    )
                )}
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" && (
            <p role="status" className="text-sm text-muted-foreground">
              Thinking…
            </p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Could not get a reply. Please try again.
              <Button
                variant="outline"
                size="sm"
                onClick={() => void regenerate()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <PromptInput
          onSubmit={async () => {
            if (!text.trim() || pending) return
            await sendMessage({ text: text.trim() })
            setText("")
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea
              aria-label="Message"
              value={text}
              onChange={(event) => setText(event.target.value)}
              disabled={pending}
            />
          </PromptInputBody>
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit
              status={status}
              onStop={() => void stop()}
              disabled={!pending && !text.trim()}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}
