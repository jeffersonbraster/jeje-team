"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { MessageSquareIcon } from "lucide-react"

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

// Messages live only in memory for now; nothing is saved.
function Chat({ chatId }: Readonly<{ chatId: string }>) {
  const [input, setInput] = React.useState("")
  const { messages, sendMessage, status, stop } = useChat({ id: chatId })

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
