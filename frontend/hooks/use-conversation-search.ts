import { useMemo, useDeferredValue } from "react"
import type { Conversation } from "@/types"

export function useConversationSearch(conversations: Conversation[], query: string) {
  const deferredQuery = useDeferredValue(query)

  const filteredConversations = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase()

    if (!normalizedQuery) return conversations

    return conversations.filter((conversation) => {
      const displayName = conversation.other_participant?.display_name || "Unknown User"
      return displayName.toLowerCase().includes(normalizedQuery)
    })
  }, [conversations, deferredQuery])

  return filteredConversations
}