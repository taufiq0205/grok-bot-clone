"use client"

import { useChat } from "@ai-sdk/react"
import {
  useLoadTranscript,
  useTriggerChatTransport,
} from "@trigger.dev/sdk/chat/react"
import type { TriggerChatTransport } from "@trigger.dev/sdk/chat"
import { isToolUIPart, getToolName, type UIMessage } from "ai"
import { ChatAvatar } from "@/components/chat-avatar"
import type { ChatBot } from "@/queries/chats"
import { DropdownMenuGroup } from "@/components/ui/dropdown-menu"
import { ChevronDownIcon } from "lucide-react"
import { useState } from "react"
import Image from "next/image"

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
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool"
import {
  PromptInput,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import {
  loadChatTranscript,
  mintChatAccessToken,
  startChatSession,
} from "@/actions/chat"
import type { chatAgent } from "@/trigger/chat"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export function Chat({
  chatId,
  members,
}: {
  chatId: string
  members?: ChatBot[]
}) {
  const [botId, setBotId] = useState(members?.[0]?.id)
  const transport = useTriggerChatTransport<typeof chatAgent>({
    task: "chat-agent",
    clientData: { botId },
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId }) => startChatSession({ chatId }),
  })
  const { messages, isLoading, error } = useLoadTranscript(
    chatId,
    async (params) => {
      const transcript = await loadChatTranscript(params)
      if (transcript.messages.length > 0) await transport.start(chatId)
      return transcript
    },
    { transport }
  )
  if (isLoading)
    return (
      <p role="status" className="p-4">
        Loading messages…
      </p>
    )
  if (error)
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Could not load messages. Please reload to try again.
        </AlertDescription>
      </Alert>
    )
  return (
    <ChatView
      chatId={chatId}
      members={members}
      botId={botId}
      onBotChange={setBotId}
      initialMessages={messages}
      transport={transport}
    />
  )
}

function ChatView({
  chatId,
  members,
  botId,
  onBotChange,
  initialMessages,
  transport,
}: {
  chatId: string
  members?: ChatBot[]
  botId?: string
  onBotChange: (id: string) => void
  initialMessages: UIMessage[]
  transport: TriggerChatTransport
}) {
  const [text, setText] = useState("")
  const { messages, sendMessage, status, error, regenerate, stop } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
    resume: initialMessages.length > 0,
  })
  const pending = status === "submitted" || status === "streaming"

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <Conversation className="min-h-0 overflow-x-hidden">
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 && <ConversationEmptyState />}
          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map((part, index) => {
                  if (part.type === "text")
                    return (
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
                  if (!isToolUIPart(part)) return null
                  const screenshot = getToolName(part) === "viewScreen"
                  const output =
                    screenshot && part.state === "output-available"
                      ? (part.output as {
                          screenshot?: unknown
                          showInChat?: unknown
                        })
                      : undefined
                  if (
                    output?.showInChat === true &&
                    typeof output.screenshot === "string"
                  )
                    return (
                      <Image
                        key={part.toolCallId}
                        src={`data:image/png;base64,${output.screenshot}`}
                        alt="Agent desktop screenshot"
                        width={1280}
                        height={720}
                        unoptimized
                        className="h-auto max-w-full rounded-md border"
                      />
                    )
                  return (
                    <Tool key={part.toolCallId}>
                      <ToolHeader
                        {...(part.type === "dynamic-tool"
                          ? {
                              type: part.type,
                              toolName: part.toolName,
                              state: part.state,
                            }
                          : { type: part.type, state: part.state })}
                      />
                      <ToolContent>
                        {part.input !== undefined && (
                          <ToolInput input={part.input} />
                        )}
                        <ToolOutput
                          output={
                            screenshot
                              ? part.state === "output-available"
                                ? "Screen inspected."
                                : undefined
                              : part.output
                          }
                          errorText={part.errorText}
                        />
                      </ToolContent>
                    </Tool>
                  )
                })}
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
      <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-3 p-4">
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
            if (!text.trim() || pending || (members && !botId)) return
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
          <PromptInputFooter
            className={members ? "justify-between" : "justify-end"}
          >
            {members && (
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger
                  variant="secondary"
                  className="h-8 max-w-full gap-2 rounded-xl px-3 font-medium text-muted-foreground"
                  disabled={pending || !members.length}
                  aria-label="Choose bot to talk to"
                >
                  {botId && (
                    <ChatAvatar
                      seed={
                        members.find((bot) => bot.id === botId)?.avatar ?? botId
                      }
                      className="size-5"
                    />
                  )}
                  <span className="truncate">
                    {members.find((bot) => bot.id === botId)?.name ??
                      "No bots available"}
                  </span>
                  <ChevronDownIcon className="size-4" />
                </PromptInputActionMenuTrigger>
                <PromptInputActionMenuContent>
                  <DropdownMenuGroup>
                    {members.map((bot) => (
                      <PromptInputActionMenuItem
                        key={bot.id}
                        onClick={() => onBotChange(bot.id)}
                      >
                        <ChatAvatar seed={bot.avatar} className="size-5" />
                        {bot.name}
                      </PromptInputActionMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
            )}
            <PromptInputSubmit
              status={status}
              onStop={() => {
                void stop()
                void transport.stopGeneration(chatId)
              }}
              disabled={
                !pending && (!text.trim() || Boolean(members && !botId))
              }
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}
