import { openai } from "@ai-sdk/openai"
import { chat } from "@trigger.dev/sdk/ai"

// One durable run per conversation. The conversation is kept in the platform's
// default transcript storage, keyed by chat id.
export const chatAgent = chat.agent({
  id: "chat",
  // streamText comes from the run argument, not from "ai", so the SDK's
  // managed options apply.
  run: async ({ messages, signal, streamText }) =>
    streamText({
      model: openai("gpt-5.4-mini"),
      messages,
      abortSignal: signal,
    }),
})
