"use client"

import { formatDistanceToNowStrict } from "date-fns"
import Link from "next/link"

import { ChatAvatar } from "@/components/chat-avatar"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { UserChat } from "@/queries/bots"

function NavChats({ chats }: Readonly<{ chats: UserChat[] }>) {
  if (chats.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {chats.map((chat) => (
            <SidebarMenuItem key={chat.id}>
              <SidebarMenuButton
                size="lg"
                // Collapsed: centre the 24px avatar in the 32px button.
                className="h-auto gap-3 group-data-[collapsible=icon]:p-1!"
                tooltip={chat.name}
                render={<Link href={`/chats/${chat.id}`} />}
              >
                <ChatAvatar
                  seed={chat.bot.avatar}
                  className="group-data-[collapsible=icon]:size-6"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium">{chat.name}</span>
                    <span
                      className="shrink-0 text-xs text-muted-foreground"
                      suppressHydrationWarning
                    >
                      {formatDistanceToNowStrict(chat.lastMessageAt)}
                    </span>
                  </div>
                  {chat.lastMessagePreview && (
                    <span className="truncate text-xs text-muted-foreground">
                      {chat.lastMessagePreview}
                    </span>
                  )}
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export { NavChats }
