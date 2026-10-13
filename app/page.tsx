import { auth } from "@clerk/nextjs/server"
import { PlusIcon } from "lucide-react"
import Link from "next/link"

import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default async function Page() {
  await auth.protect()

  return (
    <main className="flex min-h-[calc(100svh-4rem)] items-center justify-center p-6">
      <Empty className="bot-empty max-w-5xl gap-10 px-0 py-12">
        <EmptyHeader className="max-w-4xl gap-6">
          <EmptyMedia className="mb-10">
            <ChatAvatar seed={crypto.randomUUID()} className="size-20" />
          </EmptyMedia>
          <EmptyTitle>
            <h1>Meet your first bot</h1>
          </EmptyTitle>
          <EmptyDescription>
            Every bot gets its own personality, memory, and face. Spin one up
            and start the conversation.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="max-w-none">
          <Button
            variant="secondary"
            size="lg"
            className="h-auto gap-3 rounded-3xl px-6 py-4"
            render={<Link href="/dashboard" prefetch={false} />}
            nativeButton={false}
          >
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            Create a new bot
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
