"use server"

import { getScreenUrl } from "@/lib/daytona"
import { getChat } from "@/queries/chats"

// A live view of the chat bot's desktop. getChat only returns the signed-in
// user's own chats, so nobody can open another user's sandbox.
export async function getComputerScreenUrl(chatId: string) {
  const chat = await getChat(chatId)
  if (!chat) throw new Error("Chat not found")
  if (!chat.bot.sandboxId) throw new Error("This bot doesn't have a sandbox")

  return getScreenUrl(chat.bot.sandboxId)
}
