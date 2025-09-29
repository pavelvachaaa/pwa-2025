"use client"

import { useState, useCallback } from "react"
import type { Message } from "@/types"

interface UseReplyReturn {
  replyingTo: Message | null
  setReplyingTo: (message: Message | null) => void
  clearReply: () => void
  hasReply: boolean
}

export function useReply(): UseReplyReturn {
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)

  const clearReply = useCallback(() => {
    setReplyingTo(null)
  }, [])

  const hasReply = replyingTo !== null

  return {
    replyingTo,
    setReplyingTo,
    clearReply,
    hasReply,
  }
}