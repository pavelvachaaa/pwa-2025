"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import { chatApi } from "@/lib/api/chat"
import { useAuth } from "@/lib/auth/context"
import { wsClient } from "@/lib/ws"
import type { Conversation, Message } from "@/types"

interface ChatContextType {
  // Conversations state
  conversations: Conversation[]
  loading: boolean

  // WebSocket state
  wsConnected: boolean

  // Chat operations
  sendMessage: (conversationId: string, content: string, replyTo?: string) => Promise<void>
  createConversation: (targetUserId: string) => Promise<Conversation | null>
  loadConversations: () => Promise<void>
  loadMessages: (conversationId: string, limit?: number, offset?: number) => Promise<Message[]>
  joinConversation: (conversationId: string) => Promise<void>
  leaveConversation: (conversationId: string) => void

  // Typing indicators
  startTyping: (conversationId: string) => void
  stopTyping: (conversationId: string) => void
  onTypingStart: (callback: (conversationId: string, userId: string) => void) => () => void
  onTypingStop: (callback: (conversationId: string, userId: string) => void) => () => void

  // Message operations
  editMessage: (messageId: string, content: string) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  addReaction: (messageId: string, emoji: string) => Promise<void>
  removeReaction: (messageId: string, emoji: string) => Promise<void>

  // Conversation management
  markConversationAsRead: (conversationId: string) => Promise<void>

  // Real-time updates
  onNewMessage: (callback: (message: Message, conversationId: string) => void) => () => void
  onMessageEdited: (callback: (message: Message, conversationId: string) => void) => () => void
  onMessageDeleted: (callback: (messageId: string) => void) => () => void
  onReactionAdded: (callback: (messageId: string, emoji: string, userId: string) => void) => () => void
  onReactionRemoved: (callback: (messageId: string, emoji: string, userId: string) => void) => () => void
  onConversationCreated: (callback: (conversation: Conversation, isInitiator: boolean) => void) => () => void
  onConversationMarkedRead: (callback: (conversationId: string, userId: string, readAt: Date) => void) => () => void
  onUserPresenceUpdate: (callback: (userId: string, status: string, lastSeen?: Date) => void) => () => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)
  const wsConnectionRef = useRef<string | null>(null)

  // Load conversations when authenticated
  const loadConversations = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setConversations([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await chatApi.getConversations()
      if (response.success && response.data) {
        setConversations(response.data)
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  // Chat operations
  const sendMessage = useCallback(async (conversationId: string, content: string, replyTo?: string) => {
    if (!wsConnected) {
      throw new Error('WebSocket not connected')
    }

    wsClient.chat.sendMessage({
      conversationId,
      content,
      messageType: 'text',
      replyTo
    })
  }, [wsConnected])

  const createConversation = useCallback(async (targetUserId: string): Promise<Conversation | null> => {
    try {
      const response = await chatApi.createConversation(targetUserId)
      if (response.success && response.data) {
        return response.data
      }
      return null
    } catch (error) {
      console.error('Failed to create conversation:', error)
      return null
    }
  }, [])

  const loadMessages = useCallback(async (conversationId: string, limit = 50, offset = 0): Promise<Message[]> => {
    try {
      const response = await chatApi.getMessages(conversationId, limit, offset)
      if (response.success && response.data) {
        return response.data
      }
      return []
    } catch (error) {
      console.error('Failed to load messages:', error)
      return []
    }
  }, [])

  const joinConversation = useCallback(async (conversationId: string) => {
    if (!wsConnected) {
      console.warn('WebSocket not connected, cannot join conversation')
      return
    }

    wsClient.chat.joinConversation(conversationId)
  }, [wsConnected])

  const leaveConversation = useCallback((conversationId: string) => {
    if (!wsConnected) {
      return
    }

    wsClient.chat.leaveConversation(conversationId)
  }, [wsConnected])

  const editMessage = useCallback(async (messageId: string, content: string) => {
    if (!wsConnected) {
      throw new Error('WebSocket not connected')
    }

    wsClient.chat.editMessage({
      messageId,
      content
    })
  }, [wsConnected])

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!wsConnected) {
      throw new Error('WebSocket not connected')
    }

    wsClient.chat.deleteMessage({
      messageId
    });
  }, [wsConnected])

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!wsConnected) {
      throw new Error('WebSocket not connected')
    }

    wsClient.chat.addReaction({
      messageId,
      emoji
    })
  }, [wsConnected])

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!wsConnected) {
      throw new Error('WebSocket not connected')
    }

    wsClient.chat.removeReaction({
      messageId,
      emoji
    })
  }, [wsConnected])

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    try {
      // Use API call for persistence
      await chatApi.markAsRead(conversationId)
      
      // Also emit WebSocket event for real-time updates
      if (wsConnected) {
        wsClient.chat.markAsRead(conversationId)
      }
    } catch (error) {
      console.error('Failed to mark conversation as read:', error)
      throw error
    }
  }, [wsConnected])

  // Real-time event subscriptions
  const onNewMessage = useCallback((callback: (message: Message, conversationId: string) => void) => {
    const handler = (data: { message: Message; conversationId: string }) => {
      callback(data.message, data.conversationId)
    }

    return wsClient.chat.onNewMessage(handler)
  }, [])

  const onMessageEdited = useCallback((callback: (message: Message, conversationId: string) => void) => {
    const handler = (data: { message: Message; conversationId: string }) => {
      callback(data.message, data.conversationId)
    }

    return wsClient.chat.onMessageEdited(handler)
  }, [])

  const onMessageDeleted = useCallback((callback: (messageId: string) => void) => {
    const handler = (data: { messageId: string }) => {
      callback(data.messageId)
    }

    return wsClient.chat.onMessageDeleted(handler)
  }, [])

  const onReactionAdded = useCallback((callback: (messageId: string, emoji: string, userId: string) => void) => {
    const handler = (data: { messageId: string; emoji: string; userId: string }) => {
      callback(data.messageId, data.emoji, data.userId)
    }

    return wsClient.chat.onReactionAdded(handler)
  }, [])

  const onReactionRemoved = useCallback((callback: (messageId: string, emoji: string, userId: string) => void) => {
    const handler = (data: { messageId: string; emoji: string; userId: string }) => {
      callback(data.messageId, data.emoji, data.userId)
    }

    return wsClient.chat.onReactionRemoved(handler)
  }, [])

  const onConversationCreated = useCallback((callback: (conversation: Conversation, isInitiator: boolean) => void) => {
    const handler = (data: { conversation: Conversation; isInitiator: boolean }) => {
      console.log('[ChatContext] Conversation created:', data)
      callback(data.conversation, data.isInitiator)
    }

    return wsClient.chat.onConversationCreated(handler)
  }, [])

  const onConversationMarkedRead = useCallback((callback: (conversationId: string, userId: string, readAt: Date) => void) => {
    const handler = (data: { conversationId: string; userId: string; readAt: string | Date }) => {
      const readAtDate = typeof data.readAt === 'string' ? new Date(data.readAt) : data.readAt
      callback(data.conversationId, data.userId, readAtDate)
    }

    return wsClient.chat.onConversationMarkedRead(handler)
  }, [])

  const onUserPresenceUpdate = useCallback((callback: (userId: string, status: string, lastSeen?: Date) => void) => {
    const handler = (data: { userId: string; status: string; lastSeen?: string }) => {
      console.log('[ChatContext] Raw presence data received:', data)
      callback(data.userId, data.status, data.lastSeen ? new Date(data.lastSeen) : undefined)
    }

    return wsClient.presence.onUserPresenceUpdate(handler)
  }, [])

  // Typing indicators
  const startTyping = useCallback((conversationId: string) => {
    if (!wsConnected) return
    wsClient.chat.startTyping(conversationId)
  }, [wsConnected])

  const stopTyping = useCallback((conversationId: string) => {
    if (!wsConnected) return
    wsClient.chat.stopTyping(conversationId)
  }, [wsConnected])

  const onTypingStart = useCallback((callback: (conversationId: string, userId: string) => void) => {
    const handler = (data: { conversationId: string; userId: string }) => {
      callback(data.conversationId, data.userId)
    }

    return wsClient.chat.onTypingStart(handler)
  }, [])

  const onTypingStop = useCallback((callback: (conversationId: string, userId: string) => void) => {
    const handler = (data: { conversationId: string; userId: string }) => {
      callback(data.conversationId, data.userId)
    }

    return wsClient.chat.onTypingStop(handler)
  }, [])

  // Load conversations when authenticated
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Connect/disconnect WebSocket based on authentication
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // Only connect if not already connected to this user
      if (wsConnectionRef.current !== user.id) {
        if (wsConnectionRef.current) {
          wsClient.disconnect()
          setWsConnected(false)
        }

        // Connect WebSocket
        wsClient.connect(user.id)
          .then(() => {
            setWsConnected(true)
            console.log('[Chat] WebSocket connected for user:', user.display_name)
          })
          .catch((error) => {
            console.error('[Chat] Failed to connect WebSocket:', error)
            setWsConnected(false)
          })

        wsConnectionRef.current = user.id
      }
    } else {
      // Only disconnect if we have an active connection
      if (wsConnectionRef.current) {
        // Use logout method for clean disconnection with presence update
        wsClient.logout()
        setWsConnected(false)
        wsConnectionRef.current = null
        console.log('[Chat] WebSocket disconnected')
      }
    }

    // Cleanup function to ensure disconnection on component unmount
    return () => {
      if (wsConnectionRef.current) {
        // Use logout method for clean disconnection with presence update
        wsClient.logout()
        wsConnectionRef.current = null
      }
    }
  }, [isAuthenticated, user?.id, user?.display_name])

  // WebSocket event handlers - Always registered to handle reconnection
  useEffect(() => {
    const handleError = (data: any) => {
      console.error('[Chat] WebSocket error:', data)
    }

    const handleConnected = () => {
      console.log('[Chat] WebSocket connected')
      setWsConnected(true)
    }

    const handleReconnected = () => {
      console.log('[Chat] WebSocket reconnected')
      setWsConnected(true)
      // Reload conversations to catch up on any missed updates
      loadConversations()
    }

    const handleDisconnected = () => {
      console.log('[Chat] WebSocket disconnected')
      setWsConnected(false)
    }

    const handleConversationCreated = (conversation: Conversation, isInitiator: boolean) => {
      console.log('[Chat] Conversation created, updating local list:', conversation)
      setConversations(prev => {
        const exists = prev.some(conv => conv.id === conversation.id)
        if (exists) {
          return prev
        }
        return [conversation, ...prev]
      })

      // Auto-join the conversation room so we receive message events
      wsClient.chat.joinConversation(conversation.id)
    }

    const handleConversationMarkedRead = (conversationId: string, userId: string, readAt: Date) => {
      console.log('[Chat] Conversation marked as read, updating unread count:', { conversationId, userId, readAt })
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, unread_count: 0 }
          : conv
      ))
    }

    const handleNewMessage = (message: any, conversationId: string) => {
      console.log('[Chat] New message received, updating sidebar:', { message, conversationId })
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              last_message: {
                content: message.content,
                created_at: message.created_at
              },
              last_message_at: message.created_at,
              unread_count: message.sender_id !== user?.id ? (conv.unread_count || 0) + 1 : conv.unread_count
            }
          }
          return conv
        })

        // Sort: pinned first, then by last message time
        return updated.sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1
          if (!a.is_pinned && b.is_pinned) return 1
          const timeA = new Date(a.last_message_at || 0).getTime()
          const timeB = new Date(b.last_message_at || 0).getTime()
          return timeB - timeA
        })
      })
    }

    const unsubscribeError = wsClient.onError(handleError)
    const unsubscribeConnected = wsClient.onConnected(handleConnected)
    const unsubscribeReconnected = wsClient.onReconnected(handleReconnected)
    const unsubscribeDisconnected = wsClient.onDisconnected(handleDisconnected)
    const unsubscribeConversationCreated = onConversationCreated(handleConversationCreated)
    const unsubscribeConversationMarkedRead = onConversationMarkedRead(handleConversationMarkedRead)
    const unsubscribeNewMessage = onNewMessage(handleNewMessage)

    return () => {
      unsubscribeError()
      unsubscribeConnected()
      unsubscribeReconnected()
      unsubscribeDisconnected()
      unsubscribeConversationCreated()
      unsubscribeConversationMarkedRead()
      unsubscribeNewMessage()
    }
  }, [onConversationCreated, onConversationMarkedRead, onNewMessage, loadConversations, user?.id])

  return (
    <ChatContext.Provider
      value={{
        // State
        conversations,
        loading,
        wsConnected,

        // Chat operations
        sendMessage,
        createConversation,
        loadConversations,
        loadMessages,
        joinConversation,
        leaveConversation,

        // Message operations
        editMessage,
        deleteMessage,
        addReaction,
        removeReaction,

        // Conversation management
        markConversationAsRead,

        // Typing indicators
        startTyping,
        stopTyping,
        onTypingStart,
        onTypingStop,

        // Real-time updates
        onNewMessage,
        onMessageEdited,
        onMessageDeleted,
        onReactionAdded,
        onReactionRemoved,
        onConversationCreated,
        onConversationMarkedRead,
        onUserPresenceUpdate,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider")
  }
  return context
}