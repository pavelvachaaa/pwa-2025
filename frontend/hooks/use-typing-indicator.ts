import { useState, useEffect, useCallback } from "react"
import { useChat } from "@/lib/chat/context"

export function useTypingIndicator(currentUserId: string, userId?: string) {
  const { onTypingStart, onTypingStop } = useChat()
  const [conversationTyping, setConversationTyping] = useState<Record<string, string[]>>({})

  const handleTypingStart = useCallback((conversationId: string, typingUserId: string) => {
    if (typingUserId !== userId && typingUserId !== currentUserId) {
      setConversationTyping(prev => {
        const currentTyping = prev[conversationId] || []
        if (!currentTyping.includes(typingUserId)) {
          return {
            ...prev,
            [conversationId]: [...currentTyping, typingUserId]
          }
        }
        return prev
      })
    }
  }, [userId, currentUserId])

  const handleTypingStop = useCallback((conversationId: string, typingUserId: string) => {
    setConversationTyping(prev => {
      const currentTyping = prev[conversationId]
      if (!currentTyping) return prev

      const newTyping = currentTyping.filter(id => id !== typingUserId)
      if (newTyping.length === 0) {
        const { [conversationId]: removed, ...rest } = prev
        return rest
      } else {
        return {
          ...prev,
          [conversationId]: newTyping
        }
      }
    })
  }, [])

  useEffect(() => {
    const offTypingStart = onTypingStart(handleTypingStart)
    const offTypingStop = onTypingStop(handleTypingStop)

    return () => {
      offTypingStart()
      offTypingStop()
    }
  }, [onTypingStart, onTypingStop, handleTypingStart, handleTypingStop])

  return conversationTyping
}