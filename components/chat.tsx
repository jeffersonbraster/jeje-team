"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import {
  useLoadTranscript,
  useTriggerChatTransport,
} from "@trigger.dev/sdk/chat/react"
import { isStaticToolUIPart } from "ai"
import { MessageSquareIcon } from "lucide-react"

import {
  loadChatTranscript,
  mintChatAccessToken,
  startChatSession,
} from "@/actions/chat"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { Image } from "@/components/ai-elements/image"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool"
import type { chatAgent } from "@/trigger/chat"

import type { ChatUIMessage } from "@/lib/sandbox-tools"
type ChatMessagePart = ChatUIMessage["parts"][number]
type ChatTransport = ReturnType<
  typeof useTriggerChatTransport<typeof chatAgent>
>

// Loads the saved conversation first, then mounts the live chat, so the
// initial messages and the transport's resume cursor match.
function Chat({ chatId }: Readonly<{ chatId: string }>) {
  const transport = useTriggerChatTransport<typeof chatAgent>({
    task: "chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) =>
      startChatSession({ chatId, clientData }),
  })
  const { messages, isLoading } = useLoadTranscript<ChatUIMessage>(
    chatId,
    loadChatTranscript,
    { transport }
  )

  if (isLoading) return <div className="flex-1" />

  return (
    <ChatView
      chatId={chatId}
      transport={transport}
      initialMessages={messages}
    />
  )
}

function ChatView({
  chatId,
  transport,
  initialMessages,
}: Readonly<{
  chatId: string
  transport: ChatTransport
  initialMessages: ChatUIMessage[]
}>) {
  const [input, setInput] = React.useState("")
  const { messages, sendMessage, status, stop } = useChat({
    id: chatId,
    transport,
    messages: initialMessages,
  })

  function handleSubmit(message: PromptInputMessage) {
    if (!message.text.trim()) return
    sendMessage({ text: message.text })
    setInput("")
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation>
        <ConversationContent className="mx-auto w-full md:w-[70%]">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<MessageSquareIcon className="size-12" />}
              title="Start a conversation"
              description="Type a message below to begin chatting"
            />
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) => (
                    <MessagePart key={`${message.id}-${i}`} part={part} />
                  ))}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Full width on mobile, 70% on desktop, lined up with the messages. */}
      <div className="mx-auto w-full p-4 pt-0 md:w-[70%]">
        <PromptInput onSubmit={handleSubmit} className="relative">
          <PromptInputTextarea
            value={input}
            placeholder="Say something..."
            onChange={(event) => setInput(event.currentTarget.value)}
            className="min-h-24 pr-12"
          />
          <PromptInputSubmit
            status={status}
            onStop={stop}
            disabled={!input.trim() && status === "ready"}
            className="absolute right-1 bottom-1"
          />
        </PromptInput>
      </div>
    </div>
  )
}

function MessagePart({ part }: Readonly<{ part: ChatMessagePart }>) {
  if (part.type === "text") {
    return <MessageResponse>{part.text}</MessageResponse>
  }

  // The bot's own look at the screen; never shown in the chat.
  if (part.type === "tool-view_screen") return null

  // A screenshot the bot chose to show the user.
  if (part.type === "tool-show_screen" && part.state === "output-available") {
    return (
      <Image
        base64={part.output.base64}
        mediaType={part.output.mediaType}
        // Required by the type but unused; the image renders from base64.
        uint8Array={new Uint8Array()}
        alt="Screenshot of the bot's sandbox desktop"
      />
    )
  }

  // Every other tool call, and show_screen while it runs or if it fails.
  if (isStaticToolUIPart(part)) {
    return (
      <Tool>
        <ToolHeader type={part.type} state={part.state} />
        <ToolContent>
          <ToolInput input={part.input} />
          <ToolOutput output={part.output} errorText={part.errorText} />
        </ToolContent>
      </Tool>
    )
  }

  return null
}

export { Chat }
