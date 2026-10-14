import { UserButton } from "@clerk/nextjs"
import { formatDistanceToNowStrict } from "date-fns"
import { PlusIcon, UsersIcon } from "lucide-react"
import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { ChatSearch } from "@/components/chat-search"
import { ChatSidebarButton } from "@/components/chat-sidebar-button"
import { getUserChats } from "@/queries/chats"
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
  SidebarRail,
} from "@/components/ui/sidebar"

export async function AppSidebar() {
  const chats = await getUserChats()

  return (
    <Sidebar collapsible="icon">
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
      <SidebarContent className="group-data-[collapsible=icon]:overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <ChatSidebarButton
                    chatId={chat.id}
                    name={chat.name ?? chat.botName ?? "Untitled chat"}
                  >
                    <ChatAvatar
                      seed={chat.botAvatar ?? chat.id}
                      className="group-data-[collapsible=icon]:size-6"
                    />
                    <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
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
                  </ChatSidebarButton>
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
              className="p-0 group-data-[collapsible=icon]:p-0! has-[:focus-visible]:ring-2"
            >
              <UserButton
                showName
                appearance={{
                  elements: {
                    rootBox: "w-full! min-w-0",
                    userButtonTrigger:
                      "w-full! h-8! rounded-md! p-2! bg-transparent! text-inherit! shadow-none! outline-none! hover:bg-transparent! active:bg-transparent! group-data-[collapsible=icon]:p-1!",
                    userButtonBox:
                      "w-full! min-w-0 flex-row-reverse! gap-2! group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:gap-0!",
                    userButtonAvatarBox: "size-6! shrink-0",
                    userButtonOuterIdentifier:
                      "min-w-0 flex-1 truncate p-0! text-left text-sm! font-normal! text-inherit! group-data-[collapsible=icon]:hidden!",
                  },
                }}
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail tabIndex={0} />
    </Sidebar>
  )
}
