"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import type { z } from "zod"

import { db } from "@/lib/db"
import { type Bot, bots, insertBotSchema } from "@/lib/db/schema"

export type CreateBotInput = z.input<typeof insertBotSchema>

export type CreateBotResult =
  | { success: true; bot: Bot }
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

  const [bot] = await db
    .insert(bots)
    .values({
      ...parsed.data,
      instructions: parsed.data.instructions || null,
      userId,
    })
    .returning()

  revalidatePath("/")

  return { success: true, bot }
}
