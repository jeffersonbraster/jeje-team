import { notFound } from "next/navigation"

import { Chat } from "@/components/chat"
import { ChatHeader } from "@/components/chat-header"
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
    // Fixed to the viewport so the conversation scrolls, not the page.
    <div className="flex h-svh flex-col">
      <ChatHeader chat={chat} />
      {/* Keyed so switching chats starts from a clean slate. */}
      <Chat key={chat.id} chatId={chat.id} />
    </div>
  )
}
