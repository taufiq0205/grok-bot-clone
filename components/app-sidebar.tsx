import { UserButton } from "@clerk/nextjs"
import { formatDistanceToNowStrict } from "date-fns"
import { PlusIcon, UsersIcon } from "lucide-react"
import Link from "next/link"
import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { ChatSearch } from "@/components/chat-search"
import { getUserChats } from "@/queries/bots"
import { Button } from "@/components/ui/button"
import { DialogTrigger } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export async function AppSidebar() {
  const chats = await getUserChats()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex justify-end">
          <BotDialog>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Create new chat"
                  />
                }
              >
                <PlusIcon aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DialogTrigger
                    nativeButton={false}
                    render={<DropdownMenuItem />}
                    role="menuitem"
                  >
                    <PlusIcon aria-hidden="true" />
                    Create new bot
                  </DialogTrigger>
                  <DropdownMenuItem>
                    <UsersIcon aria-hidden="true" />
                    Create group chat
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </BotDialog>
        </div>
        <ChatSearch
          chats={chats.map((chat) => ({
            id: chat.id,
            name: chat.name ?? chat.botName ?? "Untitled chat",
            avatar: <ChatAvatar seed={chat.botAvatar ?? chat.id} />,
          }))}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    size="lg"
                    render={<Link href={`/chats/${chat.id}`} />}
                  >
                    <ChatAvatar seed={chat.botAvatar ?? chat.id} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate">
                          {chat.name ?? chat.botName ?? "Untitled chat"}
                        </span>
                        <time
                          dateTime={chat.lastMessageAt.toISOString()}
                          className="shrink-0 text-xs text-muted-foreground"
                        >
                          {formatDistanceToNowStrict(chat.lastMessageAt)}
                        </time>
                      </div>
                      <span className="truncate text-xs text-muted-foreground">
                        {chat.lastMessagePreview}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<div />}
              className="p-0 has-[:focus-visible]:ring-2"
            >
              <UserButton
                showName
                appearance={{
                  elements: {
                    rootBox: "w-full! min-w-0",
                    userButtonTrigger:
                      "w-full! h-8! rounded-md! p-2! bg-transparent! text-inherit! shadow-none! outline-none! hover:bg-transparent! active:bg-transparent!",
                    userButtonBox: "w-full! min-w-0 flex-row-reverse! gap-2!",
                    userButtonAvatarBox: "size-6! shrink-0",
                    userButtonOuterIdentifier:
                      "min-w-0 flex-1 truncate p-0! text-left text-sm! font-normal! text-inherit!",
                  },
                }}
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
