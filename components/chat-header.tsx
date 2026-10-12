import { BotDialog } from "@/components/bot-dialog"
import { chatAvatarUri } from "@/components/chat-avatar"
import { ComputerPanelToggle } from "@/components/computer-panel"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { ChatWithBot } from "@/queries/chats"

function ChatHeader({ chat }: Readonly<{ chat: ChatWithBot }>) {
  return (
    <>
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 px-4">
        <h1 className="-ml-2 min-w-0">
          <BotDialog
            bot={chat.bot}
            trigger={
              <Button variant="ghost" className="max-w-full">
                <Avatar size="sm">
                  <AvatarImage src={chatAvatarUri(chat.bot.avatar)} alt="" />
                  <AvatarFallback>{chat.bot.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{chat.name}</span>
              </Button>
            }
          />
        </h1>
        <ComputerPanelToggle />
      </header>
      <Separator />
    </>
  )
}

export { ChatHeader }
