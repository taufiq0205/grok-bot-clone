"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createGroupChat } from "@/actions/group-chat"
import {
  createGroupChatSchema,
  type CreateGroupChatInput,
} from "@/lib/db/schema"
import type { ChatBot } from "@/queries/chats"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldError,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"

export function GroupChatDialog({
  bots,
  open,
  onOpenChange: setOpen,
}: {
  bots: ChatBot[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const form = useForm<CreateGroupChatInput>({
    resolver: zodResolver(createGroupChatSchema),
    defaultValues: { name: "", botIds: [] },
  })
  const selected = useWatch({ control: form.control, name: "botIds" })
  function onSubmit(values: CreateGroupChatInput) {
    form.clearErrors("root")
    startTransition(async () => {
      try {
        const result = await createGroupChat(values)
        if (result.error) {
          form.setError("root", { message: result.error })
          return
        }
        setOpen(false)
        form.reset()
        toast.add({ title: "Group chat created.", type: "success" })
        router.push(`/chats/${result.chatId}`)
      } catch {
        form.setError("root", {
          message: "Could not create the group. Please try again.",
        })
      }
    })
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (pending) return
        setOpen(value)
        if (!value) form.reset()
      }}
    >
      <DialogContent
        showCloseButton={!pending}
        className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>New group chat</DialogTitle>
          <DialogDescription>
            Name the group and pick which bots are in it.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-6"
        >
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="group-name">Name</FieldLabel>
                  <Input
                    {...field}
                    id="group-name"
                    placeholder="Weekend plans"
                    maxLength={100}
                    disabled={pending}
                    aria-invalid={fieldState.invalid}
                    aria-describedby={
                      fieldState.invalid ? "group-name-error" : undefined
                    }
                  />
                  <FieldError
                    id="group-name-error"
                    errors={[fieldState.error]}
                  />
                </Field>
              )}
            />
            <Controller
              name="botIds"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <span id="group-bots-label" className="text-sm font-medium">
                    Bots
                  </span>
                  <div
                    role="group"
                    aria-labelledby="group-bots-label"
                    className="flex flex-col gap-3"
                  >
                    {bots.map((bot) => (
                      <FieldLabel
                        key={bot.id}
                        htmlFor={`group-bot-${bot.id}`}
                        className="flex items-center gap-3"
                      >
                        <Checkbox
                          id={`group-bot-${bot.id}`}
                          checked={field.value.includes(bot.id)}
                          disabled={pending}
                          onBlur={field.onBlur}
                          aria-invalid={fieldState.invalid}
                          aria-describedby={
                            fieldState.invalid ? "group-bots-error" : undefined
                          }
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked
                                ? [...field.value, bot.id]
                                : field.value.filter((id) => id !== bot.id)
                            )
                          }
                        />
                        <ChatAvatar seed={bot.avatar} className="size-6" />
                        {bot.name}
                      </FieldLabel>
                    ))}
                    {bots.length < 2 && (
                      <p className="text-sm text-muted-foreground">
                        Create at least two bots to start a group chat.
                      </p>
                    )}
                  </div>
                  <FieldError
                    id="group-bots-error"
                    errors={[fieldState.error]}
                  />
                </Field>
              )}
            />
          </FieldGroup>
          <FieldError errors={[form.formState.errors.root]} />
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={pending} />}
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending || selected.length < 2}>
              {pending ? "Creating…" : "Create group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
