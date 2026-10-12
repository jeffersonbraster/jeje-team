"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import type { z } from "zod"

import { db } from "@/lib/db"
import {
  type Bot,
  bots,
  type Chat,
  chatMembers,
  chats,
  insertBotSchema,
} from "@/lib/db/schema"

export type CreateBotInput = z.input<typeof insertBotSchema>

export type CreateBotResult =
  | { success: true; bot: Bot; chat: Chat }
  | { success: false; error: string }

export async function createBot(
  input: CreateBotInput
): Promise<CreateBotResult> {
  // Server actions are public endpoints, so check the session first.
  const { userId } = await auth.protect()

  const parsed = insertBotSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid bot.",
    }
  }

  // Every bot starts with a direct chat. All three rows land together or
  // not at all.
  const { bot, chat } = await db.transaction(async (tx) => {
    const [bot] = await tx
      .insert(bots)
      .values({
        ...parsed.data,
        instructions: parsed.data.instructions || null,
        userId,
      })
      .returning()

    const [chat] = await tx
      .insert(chats)
      .values({ userId, kind: "direct" })
      .returning()

    await tx.insert(chatMembers).values({ chatId: chat.id, botId: bot.id })

    return { bot, chat }
  })

  revalidatePath("/")

  return { success: true, bot, chat }
}
