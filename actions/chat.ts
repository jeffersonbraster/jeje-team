"use server"

import { auth } from "@trigger.dev/sdk"
import {
  chat,
  type ChatStartSessionParams,
  defaultStorage,
} from "@trigger.dev/sdk/ai"

import type { ChatUIMessage } from "@/lib/sandbox-tools"
import { getChat } from "@/queries/chats"
import type { chatAgent } from "@/trigger/chat"

const startSession = chat.createStartSessionAction<typeof chatAgent>("chat")
const loadTranscript = chat.createLoadTranscriptAction(defaultStorage)

// The browser sends the chat id, so check it belongs to the signed-in user
// before touching its session or transcript. getChat is scoped to the
// session's userId.
async function assertOwnsChat(chatId: string) {
  if (!(await getChat(chatId))) throw new Error("Chat not found")
}

// Creates the chat's session and first run; idempotent per chat id.
export async function startChatSession(
  params: ChatStartSessionParams<typeof chatAgent>
) {
  await assertOwnsChat(params.chatId)
  return startSession(params)
}

// The transport calls this to refresh an expired token.
export async function mintChatAccessToken(chatId: string) {
  await assertOwnsChat(chatId)
  return auth.createPublicToken({
    scopes: { read: { sessions: chatId }, write: { sessions: chatId } },
    expirationTime: "1h",
  })
}

// The saved conversation, for rendering before the chat connects.
export async function loadChatTranscript(params: {
  chatId: string
  limit?: number
}) {
  await assertOwnsChat(params.chatId)
  const transcript = await loadTranscript(params)
  // Stored as plain JSON; these are the agent's messages, tool parts included.
  return { ...transcript, messages: transcript.messages as ChatUIMessage[] }
}
