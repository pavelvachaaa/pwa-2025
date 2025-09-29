"use client"

import { ConversationItem } from "./conversation-item"
import { usePresence } from "@/hooks/use-presence"
import type { Conversation } from "@/types"

interface ConversationListProps {
  conversations: Conversation[]
  selectedConversationId: string | null
  conversationTyping: Record<string, Set<string>>
  isLoading: boolean
  onSelectConversation: (id: string) => void
}

export function ConversationList({
  conversations,
  selectedConversationId,
  conversationTyping,
  isLoading,
  onSelectConversation,
}: ConversationListProps) {
  const { presence } = usePresence()

  if (isLoading) {
    return (
      <div className="p-3 text-sm text-sidebar-foreground/70">
        Loading conversations…
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="p-3 text-sm text-sidebar-foreground/70">
        No conversations
      </div>
    )
  }

  return (
    <>
      {conversations.map((conversation) => {
        const other = conversation.other_participant
        const userPresence = other ? presence[other.id] : undefined
        const userStatus = userPresence?.status || other?.status || "offline"
        const isTyping = conversationTyping[conversation.id]?.size > 0

        return (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isSelected={conversation.id === selectedConversationId}
            isTyping={isTyping}
            userStatus={userStatus}
            onSelect={onSelectConversation}
          />
        )
      })}
    </>
  )
}