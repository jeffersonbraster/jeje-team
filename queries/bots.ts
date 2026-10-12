import "server-only"

import { auth } from "@clerk/nextjs/server"
import { asc, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { chatMembers, chats } from "@/lib/db/schema"

// The signed-in user's chats, most recent first, each with the bot that
// represents it. Group chats aren't handled yet, so every chat uses its
// first member.
export async function getUserChats() {
  const { userId } = await auth.protect()

  const rows = await db.query.chats.findMany({
    where: eq(chats.userId, userId),
    orderBy: desc(chats.lastMessageAt),
    columns: {
      id: true,
      name: true,
      lastMessagePreview: true,
      lastMessageAt: true,
    },
    with: {
      members: {
        orderBy: asc(chatMembers.joinedAt),
        limit: 1,
        with: {
          bot: { columns: { id: true, name: true, avatar: true } },
        },
      },
    },
  })

  return rows.flatMap(({ members, ...chat }) => {
    const bot = members[0]?.bot
    // A chat with no members has nothing to show.
    if (!bot) return []
    return [{ ...chat, name: chat.name ?? bot.name, bot }]
  })
}

export type UserChat = Awaited<ReturnType<typeof getUserChats>>[number]
