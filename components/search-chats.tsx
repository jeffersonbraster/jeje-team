"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import type { UserChat } from "@/queries/bots"

function SearchChats({ chats }: Readonly<{ chats: UserChat[] }>) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        // Input's look (border, height, padding, text) on a ghost button, so
        // it keeps the button's hover.
        // Collapsed sidebar: a plain 32px icon button like the others.
        className="h-8 w-full min-w-0 justify-start rounded-lg border border-input bg-transparent px-2.5 py-1 text-base font-normal text-muted-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:not-hover:bg-transparent md:text-sm dark:bg-input/30"
        aria-label="Search chats"
      >
        <SearchIcon data-icon="inline-start" />
        <span className="group-data-[collapsible=icon]:hidden">Search</span>
        <Kbd className="ml-auto group-data-[collapsible=icon]:hidden">⌘K</Kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search chats"
        description="Find a chat by name."
      >
        <Command>
          <CommandInput placeholder="Search chats..." />
          <CommandList>
            <CommandEmpty>No chats found.</CommandEmpty>
            <CommandGroup heading="Chats">
              {chats.map((chat) => (
                <CommandItem
                  key={chat.id}
                  value={chat.id}
                  keywords={[chat.name, chat.lastMessagePreview ?? ""]}
                  onSelect={() => {
                    setOpen(false)
                    router.push(`/chats/${chat.id}`)
                  }}
                >
                  <ChatAvatar seed={chat.bot.avatar} className="size-6" />
                  <span className="truncate">{chat.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}

export { SearchChats }
