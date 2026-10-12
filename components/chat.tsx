"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import {
  type InferChatUIMessage,
  useLoadTranscript,
  useTriggerChatTransport,
} from "@trigger.dev/sdk/chat/react"
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
import type { chatAgent } from "@/trigger/chat"

type ChatUIMessage = InferChatUIMessage<typeof chatAgent>
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
                  {message.parts.map((part, i) =>
                    part.type === "text" ? (
                      <MessageResponse key={`${message.id}-${i}`}>
                        {part.text}
                      </MessageResponse>
                    ) : null
                  )}
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

export { Chat }
