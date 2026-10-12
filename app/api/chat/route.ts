import { openai } from "@ai-sdk/openai"
import { auth } from "@clerk/nextjs/server"
import { convertToModelMessages, streamText, type UIMessage } from "ai"

// Allow streaming responses up to 30 seconds.
export const maxDuration = 30

export async function POST(req: Request) {
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: openai("gpt-5.4-mini"),
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
