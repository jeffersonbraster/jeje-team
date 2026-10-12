"use server"

import { auth } from "@clerk/nextjs/server"
import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { createSandbox, deleteSandbox } from "@/lib/daytona"
import { db } from "@/lib/db"
import {
  type BotInput,
  botInsertSchema,
  bots,
  chatMembers,
  chats,
} from "@/lib/db/schema"

export async function createBot(input: BotInput) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) throw new Error("Unauthorized")

  const data = botInsertSchema.parse(input)

  // Every bot gets its own sandbox.
  const sandboxId = await createSandbox()

  // Every bot starts with a direct chat. All three rows land together or
  // not at all.
  let bot
  try {
    bot = await db.transaction(async (tx) => {
      const [bot] = await tx
        .insert(bots)
        .values({
          ...data,
          instructions: data.instructions || null,
          userId,
          sandboxId,
        })
        .returning()

      const [chat] = await tx
        .insert(chats)
        .values({ userId, kind: "direct" })
        .returning()

      await tx.insert(chatMembers).values({ chatId: chat.id, botId: bot.id })

      return bot
    })
  } catch (error) {
    // The bot wasn't saved, so don't leave its sandbox behind.
    await deleteSandbox(sandboxId).catch((cleanupError) =>
      console.error("Failed to delete sandbox", sandboxId, cleanupError)
    )
    throw error
  }

  // The sidebar's chat list is loaded in the dashboard layout, so refresh the
  // layout and every page under it, not just "/".
  revalidatePath("/(dashboard)", "layout")

  return bot
}

export async function updateBot(botId: string, input: BotInput) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) throw new Error("Unauthorized")

  const data = botInsertSchema.parse(input)

  // Matching on userId too means a user can only edit their own bots.
  const [bot] = await db
    .update(bots)
    .set({ ...data, instructions: data.instructions || null })
    .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
    .returning()

  if (!bot) throw new Error("Bot not found")

  // The bot's name and face show in the sidebar and the chat header.
  revalidatePath("/(dashboard)", "layout")

  return bot
}

export async function deleteBot(botId: string) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) throw new Error("Unauthorized")

  const bot = await db.transaction(async (tx) => {
    // The bot's direct chats go with it; deleting the bot alone would only
    // remove its membership and leave the chats empty.
    const directChats = await tx
      .select({ id: chats.id })
      .from(chatMembers)
      .innerJoin(chats, eq(chats.id, chatMembers.chatId))
      .where(
        and(
          eq(chatMembers.botId, botId),
          eq(chats.kind, "direct"),
          eq(chats.userId, userId)
        )
      )

    // Matching on userId too means a user can only delete their own bots.
    const [bot] = await tx
      .delete(bots)
      .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
      .returning()

    if (!bot) throw new Error("Bot not found")

    if (directChats.length > 0) {
      await tx.delete(chats).where(
        inArray(
          chats.id,
          directChats.map((chat) => chat.id)
        )
      )
    }

    return bot
  })

  // After the rows are gone, so a failed delete never leaves a bot without
  // its sandbox. A sandbox that can't be deleted is logged, not retried.
  if (bot.sandboxId) {
    await deleteSandbox(bot.sandboxId).catch((error) =>
      console.error("Failed to delete sandbox", bot.sandboxId, error)
    )
  }

  revalidatePath("/(dashboard)", "layout")

  return bot
}
