import { useState, useEffect, useCallback } from "react"
import { useChat } from "@/lib/chat/context"
import type { Message } from "@/types"

export function useMessages(conversationId: string) {
  const {
    loadMessages,
    onNewMessage,
    onMessageEdited,
    onMessageDeleted,
    onReactionAdded,
    onReactionRemoved,
  } = useChat()

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadConversationMessages = useCallback(async () => {
    setIsLoading(true)
    try {
      const msgs = await loadMessages(conversationId)
      setMessages(msgs)
    } catch (error) {
      console.error('Failed to load messages:', error)
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }, [conversationId, loadMessages])

  useEffect(() => {
    loadConversationMessages()
  }, [loadConversationMessages])

  useEffect(() => {
    const offNew = onNewMessage((msg, cid) => {
      if (cid === conversationId) {
        setMessages(prev => [...prev, msg])
      }
    })

    const offEdit = onMessageEdited((msg, cid) => {
      if (cid === conversationId) {
        setMessages(prev => prev.map(m =>
          m.id === msg.id ? { ...m, ...msg, edited: true } : m
        ))
      }
    })

    const offDel = onMessageDeleted((id) => {
      setMessages(prev => prev.filter(m => m.id !== id))
    })

    const offReactionAdded = onReactionAdded((messageId, emoji, userId) => {
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m

        const reactions = m.reactions || []
        const existingReaction = reactions.find(r => r.emoji === emoji)

        if (existingReaction) {
          if (!existingReaction.userIds.includes(userId)) {
            existingReaction.userIds.push(userId)
          }
          return { ...m, reactions: [...reactions] }
        } else {
          return {
            ...m,
            reactions: [...reactions, { emoji, userIds: [userId] }]
          }
        }
      }))
    })

    const offReactionRemoved = onReactionRemoved((messageId, emoji, userId) => {
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m

        const reactions = (m.reactions || []).map(r => {
          if (r.emoji === emoji) {
            return {
              ...r,
              userIds: r.userIds.filter(id => id !== userId)
            }
          }
          return r
        }).filter(r => r.userIds.length > 0)

        return { ...m, reactions }
      }))
    })

    return () => {
      offNew()
      offEdit()
      offDel()
      offReactionAdded()
      offReactionRemoved()
    }
  }, [conversationId, onNewMessage, onMessageEdited, onMessageDeleted, onReactionAdded, onReactionRemoved])

  return { messages, isLoading, refetch: loadConversationMessages }
}