import { useState, useEffect } from "react"
import { useChat } from "@/lib/chat/context"
import { useAuth } from "@/lib/auth/context"

export function useSidebarTyping() {
  const { user } = useAuth()
  const { onTypingStart, onTypingStop } = useChat()
  const [conversationTyping, setConversationTyping] = useState<Record<string, Set<string>>>({})

  useEffect(() => {
    const offTypingStart = onTypingStart((conversationId, userId) => {
      if (userId !== user?.id) {
        setConversationTyping(prev => ({
          ...prev,
          [conversationId]: new Set([...(prev[conversationId] || []), userId])
        }))
      }
    })

    const offTypingStop = onTypingStop((conversationId, userId) => {
      setConversationTyping(prev => {
        const currentTyping = prev[conversationId]
        if (!currentTyping) return prev

        const newSet = new Set(currentTyping)
        newSet.delete(userId)

        if (newSet.size === 0) {
          const { [conversationId]: removed, ...rest } = prev
          return rest
        }

        return {
          ...prev,
          [conversationId]: newSet
        }
      })
    })

    return () => {
      offTypingStart()
      offTypingStop()
    }
  }, [onTypingStart, onTypingStop, user?.id])

  return conversationTyping
}