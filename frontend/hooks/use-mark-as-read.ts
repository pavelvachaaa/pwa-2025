import { useEffect, useRef } from "react"
import { useChat } from "@/lib/chat/context"

/**
 * Hook to automatically mark conversations as read when they become visible
 */
export function useMarkAsRead(conversationId: string, enabled = true) {
  const { markConversationAsRead } = useChat()
  const timeoutRef = useRef<NodeJS.Timeout>()
  const hasMarkedRef = useRef(false)

  useEffect(() => {
    if (!enabled || !conversationId) return

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Reset the marked flag when conversation changes
    hasMarkedRef.current = false

    // Mark as read after a short delay (user has had time to see the conversation)
    timeoutRef.current = setTimeout(() => {
      if (!hasMarkedRef.current) {
        markConversationAsRead(conversationId)
        hasMarkedRef.current = true
      }
    }, 1000) // 1 second delay

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [conversationId, enabled, markConversationAsRead])

  // Mark as read when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      if (enabled && conversationId && !hasMarkedRef.current) {
        markConversationAsRead(conversationId)
      }
    }
  }, [conversationId, enabled, markConversationAsRead])

  // Manual mark as read function
  const markAsRead = () => {
    if (conversationId && !hasMarkedRef.current) {
      markConversationAsRead(conversationId)
      hasMarkedRef.current = true
    }
  }

  return { markAsRead }
}