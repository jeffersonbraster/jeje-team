import { openai } from "@ai-sdk/openai"
import { chat } from "@trigger.dev/sdk/ai"
import { stepCountIs } from "ai"
import { asc, eq } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { type Bot, chatMembers } from "@/lib/db/schema"
import { createSandboxTools } from "@/lib/sandbox-tools"

type ChatBot = Pick<Bot, "name" | "job" | "instructions" | "sandboxId">

// The bot behind a chat. Group chats aren't handled yet, so the first member
// stands in for the chat.
async function getChatBot(chatId: string): Promise<ChatBot | undefined> {
  const member = await db.query.chatMembers.findFirst({
    where: eq(chatMembers.chatId, chatId),
    orderBy: asc(chatMembers.joinedAt),
    with: {
      bot: {
        columns: { name: true, job: true, instructions: true, sandboxId: true },
      },
    },
  })
  return member?.bot
}

function systemPrompt(bot: ChatBot) {
  return [
    `You are ${bot.name}, an AI teammate. Your job: ${bot.job}.`,
    "You work alongside the person you are talking to as a member of their team. They gave you your name and your job, and they come to you for that job. Stay in that role, and when asked who you are, answer as yourself.",
    bot.instructions &&
      `They also told you how to go about your job:\n\n${bot.instructions}`,
    "You have a sandbox of your own: an isolated Linux machine in the cloud with its own filesystem, network, CPU, memory and disk. It belongs to you alone, is not shared with other teammates, and stays yours for as long as you exist.",
  ]
    .filter(Boolean)
    .join("\n\n")
}

// One durable run per conversation. The conversation is kept in the platform's
// default transcript storage, keyed by chat id.
export const chatAgent = chat.agent({
  id: "chat",
  // Declared here as well as passed to streamText, so each tool's
  // toModelOutput (screenshots as images) still applies on later turns.
  tools: async ({ chatId }) =>
    createSandboxTools((await getChatBot(chatId))?.sandboxId ?? null),
  // streamText comes from the run argument, not from "ai", so the SDK's
  // managed options apply.
  run: async ({ chatId, messages, tools, signal, streamText }) => {
    // Loaded each turn, so edits to the bot apply from the next message.
    const bot = await getChatBot(chatId)
    if (!bot) throw new Error(`No bot found for chat ${chatId}`)

    return streamText({
      model: openai("gpt-5.4-mini"),
      system: systemPrompt(bot),
      messages,
      tools,
      abortSignal: signal,
      // Room for several tool calls in one reply, e.g. look, click, look again.
      stopWhen: stepCountIs(25),
    })
  },
})
