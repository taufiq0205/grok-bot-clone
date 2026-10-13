"use client"

import { UserButton } from "@clerk/nextjs"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent />
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
