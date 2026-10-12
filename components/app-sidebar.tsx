"use client"

import * as React from "react"
import { UserButton } from "@clerk/nextjs"
import { PlusIcon, UsersIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { NavChats } from "@/components/nav-chats"
import { SearchChats } from "@/components/search-chats"
import { Button } from "@/components/ui/button"
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  sidebarMenuButtonVariants,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import type { UserChat } from "@/queries/bots"

function AppSidebar({ chats }: Readonly<{ chats: UserChat[] }>) {
  const [botDialogOpen, setBotDialogOpen] = React.useState(false)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex justify-end group-data-[collapsible=icon]:justify-start">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Create"
                  // Ghost keeps its background while the menu is open; only
                  // show it on hover.
                  className="aria-expanded:not-hover:bg-transparent"
                />
              }
            >
              <PlusIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setBotDialogOpen(true)}>
                  <PlusIcon />
                  Create new bot
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <UsersIcon />
                  Create group chat
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <SearchChats chats={chats} />
        {/* Lives outside the menu so it stays mounted after the menu closes. */}
        <BotDialog open={botDialogOpen} onOpenChange={setBotDialogOpen} />
      </SidebarHeader>
      <SidebarContent>
        <NavChats chats={chats} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <UserButton
              showName
              appearance={{
                elements: {
                  rootBox: "w-full group-data-[collapsible=icon]:w-8",
                  // Same classes as a size="lg" SidebarMenuButton
                  userButtonTrigger: cn(
                    sidebarMenuButtonVariants({ size: "lg" }),
                    // Collapsed: centre the 24px avatar in the 32px button.
                    "group-data-[collapsible=icon]:p-1!"
                  ),
                  // Clerk puts the name before the avatar; flip it.
                  userButtonBox: "w-full flex-row-reverse justify-end gap-2",
                  userButtonOuterIdentifier:
                    "truncate p-0 text-sm font-medium text-sidebar-foreground",
                  userButtonAvatarBox: "size-6 rounded-lg",
                },
              }}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export { AppSidebar }
