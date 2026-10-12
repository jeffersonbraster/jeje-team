import { notFound } from "next/navigation"

import { Chat } from "@/components/chat"
import { ChatHeader } from "@/components/chat-header"
import {
  ComputerPanel,
  ComputerPanelProvider,
} from "@/components/computer-panel"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { getChat } from "@/queries/chats"

export default async function ChatPage({
  params,
}: Readonly<{
  params: Promise<{ chatId: string }>
}>) {
  const { chatId } = await params
  // getChat checks the session and only returns the user's own chats.
  const chat = await getChat(chatId)
  if (!chat) notFound()

  return (
    // The header's computer button opens and closes the panel on the right.
    <ComputerPanelProvider chatId={chat.id} botName={chat.bot.name}>
      {/* Fixed to the viewport so only the conversation scrolls, not the
          page. The group sets its own height to 100%, so it fills this. */}
      <div className="h-svh overflow-hidden">
        <ResizablePanelGroup>
          {/* Panels wrap their content in an overflow: auto element, which
              would scroll the header and input with the messages. */}
          <ResizablePanel minSize="30" style={{ overflow: "hidden" }}>
            <div className="flex h-full flex-col">
              <ChatHeader chat={chat} />
              {/* Keyed so switching chats starts from a clean slate. */}
              <Chat key={chat.id} chatId={chat.id} />
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ComputerPanel />
        </ResizablePanelGroup>
      </div>
    </ComputerPanelProvider>
  )
}
