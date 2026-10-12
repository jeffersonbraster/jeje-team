import "server-only"

import { auth } from "@clerk/nextjs/server"
import { and, asc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { chatMembers, chats } from "@/lib/db/schema"

// One of the signed-in user's chats with the bot that represents it, or null
// when it doesn't exist or belongs to someone else. Group chats aren't handled
// yet, so the first member stands in for the chat.
export async function getChat(chatId: string) {
  const { userId } = await auth.protect()

  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    columns: { id: true, kind: true, name: true },
    with: {
      members: {
        orderBy: asc(chatMembers.joinedAt),
        limit: 1,
        with: {
          bot: {
            columns: {
              id: true,
              name: true,
              avatar: true,
              job: true,
              instructions: true,
              sandboxId: true,
            },
          },
        },
      },
    },
  })

  const bot = chat?.members[0]?.bot
  if (!chat || !bot) return null

  return { id: chat.id, kind: chat.kind, name: chat.name ?? bot.name, bot }
}

export type ChatWithBot = NonNullable<Awaited<ReturnType<typeof getChat>>>
