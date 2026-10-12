import { notFound } from "next/navigation"

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

  return <ChatHeader chat={chat} />
}
