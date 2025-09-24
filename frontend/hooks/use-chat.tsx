"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { wsClient } from "@/lib/ws-client"
import { chatApi } from "@/lib/api/chat"
import { useAuth } from "@/lib/auth/context"
import type { Conversation, Message, User } from "@/types"

interface ChatContextType {
  conversations: Conversation[]
  messages: Record<string, Message[]>
  users: User[]
  isConnected: boolean
  connectionState: string
  loading: boolean
  sendMessage: (conversationId: string, content: string, replyTo?: string) => Promise<void>
  subscribeToConversation: (conversationId: string) => void
  unsubscribeFromConversation: (conversationId: string) => void
  startTyping: (conversationId: string) => void
  stopTyping: (conversationId: string) => void
  markAsRead: (conversationId: string) => void
  createDirectMessage: (userId: string) => Promise<string>
  createGroupChat: (name: string, participants: string[], avatar?: string) => Promise<string>
  addReaction: (messageId: string, emoji: string) => Promise<void>
  removeReaction: (messageId: string, emoji: string) => Promise<void>
  editMessage: (messageId: string, newContent: string) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  pinMessage: (messageId: string) => void
  unpinMessage: (messageId: string) => void
  saveDraft: (conversationId: string, draft: string) => Promise<void>
  getDraft: (conversationId: string) => Promise<string>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [users, setUsers] = useState<User[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState("disconnected")
  const [loading, setLoading] = useState(true)

  // Load conversations when authenticated
  const loadConversations = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setConversations([])
      setMessages({})
      setLoading(false)
      return
    }

    try {
      const response = await chatApi.getConversations()
      if (response.success && response.data) {
        setConversations(response.data)

        // Load messages for each conversation
        const messagesData: Record<string, Message[]> = {}
        for (const conv of response.data) {
          const messagesResponse = await chatApi.getMessages(conv.id)
          if (messagesResponse.success && messagesResponse.data) {
            messagesData[conv.id] = messagesResponse.data
          }
        }
        setMessages(messagesData)
      }
    } catch (error) {
      console.error('[Chat] Failed to load conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  // Connect to WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      wsClient.connect(user.id).catch(console.error)
      loadConversations()
    } else {
      wsClient.disconnect()
      setConversations([])
      setMessages({})
      setLoading(false)
    }

    return () => {
      wsClient.disconnect()
    }
  }, [isAuthenticated, user, loadConversations])

  // Set up WebSocket event listeners
  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true)
      setConnectionState("connected")
      console.log("[Chat] Connected to WebSocket")
    }

    const handleDisconnected = () => {
      setIsConnected(false)
      setConnectionState("disconnected")
      console.log("[Chat] Disconnected from WebSocket")
    }

    const handleNewMessage = (message: Message) => {
      console.log("[Chat] New message received:", message)
      setMessages((prev) => ({
        ...prev,
        [message.conversationId]: [...(prev[message.conversationId] || []), message],
      }))

      // Update conversation's last message and timestamp
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === message.conversationId
            ? {
                ...conv,
                lastMessage: message,
                updatedAt: message.timestamp,
                unreadCount: message.senderId !== user?.id ? conv.unreadCount + 1 : conv.unreadCount,
              }
            : conv,
        ),
      )
    }

    const handleTyping = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      console.log("[Chat] Typing event:", data)
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== data.conversationId) return conv

          const currentTyping = conv.isTyping || []
          let newTyping: string[]

          if (data.isTyping) {
            newTyping = currentTyping.includes(data.userId) ? currentTyping : [...currentTyping, data.userId]
          } else {
            newTyping = currentTyping.filter((id) => id !== data.userId)
          }

          return {
            ...conv,
            isTyping: newTyping.length > 0 ? newTyping : undefined,
          }
        }),
      )
    }

    const handlePresence = (data: { userId: string; status: "online" | "away" | "offline"; lastSeen?: Date }) => {
      console.log("[Chat] Presence update:", data)
      setUsers((prev) =>
        prev.map((user) =>
          user.id === data.userId
            ? {
                ...user,
                status: data.status,
                lastSeen: data.lastSeen,
              }
            : user,
        ),
      )
    }

    const handleMessageRead = (data: { conversationId: string; userId: string; readAt: Date }) => {
      console.log("[Chat] Message read:", data)
      // Update read receipts for messages
      setMessages((prev) => ({
        ...prev,
        [data.conversationId]: (prev[data.conversationId] || []).map((msg) => ({
          ...msg,
          readBy: [...(msg.readBy || []), { userId: data.userId, readAt: data.readAt }],
        })),
      }))
    }

    // Register event listeners
    wsClient.on("connected", handleConnected)
    wsClient.on("disconnected", handleDisconnected)
    wsClient.on("message:new", handleNewMessage)
    wsClient.on("typing", handleTyping)
    wsClient.on("presence", handlePresence)
    wsClient.on("message:read", handleMessageRead)

    // Update connection state periodically
    const stateInterval = setInterval(() => {
      setConnectionState(wsClient.connectionState)
      setIsConnected(wsClient.isConnected)
    }, 1000)

    return () => {
      wsClient.off("connected", handleConnected)
      wsClient.off("disconnected", handleDisconnected)
      wsClient.off("message:new", handleNewMessage)
      wsClient.off("typing", handleTyping)
      wsClient.off("presence", handlePresence)
      wsClient.off("message:read", handleMessageRead)
      clearInterval(stateInterval)
    }
  }, [user])

  const sendMessage = useCallback(
    async (conversationId: string, content: string, replyTo?: string) => {
      if (!content.trim() || !user) return

      try {
        if (isConnected) {
          // Send via WebSocket for real-time delivery
          wsClient.sendMessage({
            conversationId,
            content: content.trim(),
            type: "text",
            replyTo,
          })
        } else {
          // Fallback to HTTP API
          await chatApi.sendMessage({
            conversationId,
            content: content.trim(),
            messageType: "text",
            replyTo,
          })
        }

        // Clear draft when sending
        saveDraft(conversationId, "")
      } catch (error) {
        console.error('[Chat] Failed to send message:', error)
      }
    },
    [isConnected, user],
  )

  const subscribeToConversation = useCallback(
    (conversationId: string) => {
      if (isConnected) {
        wsClient.subscribe(conversationId)
      }
    },
    [isConnected],
  )

  const unsubscribeFromConversation = useCallback(
    (conversationId: string) => {
      if (isConnected) {
        wsClient.unsubscribe(conversationId)
      }
    },
    [isConnected],
  )

  const startTyping = useCallback(
    (conversationId: string) => {
      if (isConnected) {
        wsClient.startTyping(conversationId)
      }
    },
    [isConnected],
  )

  const stopTyping = useCallback(
    (conversationId: string) => {
      if (isConnected) {
        wsClient.stopTyping(conversationId)
      }
    },
    [isConnected],
  )

  const markAsRead = useCallback((conversationId: string) => {
    // Mark conversation as read (reset unread count)
    setConversations((prev) => prev.map((conv) => (conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv)))
  }, [])

  const createDirectMessage = useCallback(
    async (userId: string) => {
      if (!user) return ""

      try {
        const response = await chatApi.createDirectConversation(userId)
        if (response.success && response.data) {
          setConversations((prev) => {
            const exists = prev.find(conv => conv.id === response.data!.id)
            if (exists) return prev
            return [response.data!, ...prev]
          })
          return response.data.id
        }
      } catch (error) {
        console.error('[Chat] Failed to create direct conversation:', error)
      }

      return ""
    },
    [user],
  )

  const createGroupChat = useCallback(
    async (name: string, participants: string[], avatar?: string) => {
      if (!user) return ""

      try {
        const response = await chatApi.createGroupConversation({
          name,
          participants,
          avatarUrl: avatar,
        })
        if (response.success && response.data) {
          setConversations((prev) => [response.data!, ...prev])
          return response.data.id
        }
      } catch (error) {
        console.error('[Chat] Failed to create group conversation:', error)
      }

      return ""
    },
    [user],
  )

  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user) return

      try {
        await chatApi.addReaction(messageId, emoji)

        // Optimistically update UI
        setMessages((prev) => {
          const newMessages = { ...prev }
          Object.keys(newMessages).forEach((convId) => {
            newMessages[convId] = newMessages[convId].map((msg) => {
              if (msg.id === messageId) {
                const reactions = msg.reactions || []
                const existingReaction = reactions.find((r) => r.emoji === emoji)

                if (existingReaction) {
                  if (!existingReaction.userIds.includes(user.id)) {
                    existingReaction.userIds.push(user.id)
                  }
                } else {
                  reactions.push({ emoji, userIds: [user.id] })
                }

                return { ...msg, reactions }
              }
              return msg
            })
          })
          return newMessages
        })
      } catch (error) {
        console.error('[Chat] Failed to add reaction:', error)
      }
    },
    [user],
  )

  const removeReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user) return

      try {
        await chatApi.removeReaction(messageId, emoji)

        // Optimistically update UI
        setMessages((prev) => {
          const newMessages = { ...prev }
          Object.keys(newMessages).forEach((convId) => {
            newMessages[convId] = newMessages[convId].map((msg) => {
              if (msg.id === messageId) {
                const reactions = (msg.reactions || [])
                  .map((r) => ({
                    ...r,
                    userIds: r.emoji === emoji ? r.userIds.filter((id) => id !== user.id) : r.userIds,
                  }))
                  .filter((r) => r.userIds.length > 0)

                return { ...msg, reactions }
              }
              return msg
            })
          })
          return newMessages
        })
      } catch (error) {
        console.error('[Chat] Failed to remove reaction:', error)
      }
    },
    [user],
  )

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    try {
      await chatApi.editMessage(messageId, newContent)

      // Optimistically update UI
      setMessages((prev) => {
        const newMessages = { ...prev }
        Object.keys(newMessages).forEach((convId) => {
          newMessages[convId] = newMessages[convId].map((msg) => {
            if (msg.id === messageId) {
              return {
                ...msg,
                content: newContent,
                edited: true,
                editedAt: new Date(),
              }
            }
            return msg
          })
        })
        return newMessages
      })
    } catch (error) {
      console.error('[Chat] Failed to edit message:', error)
    }
  }, [])

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await chatApi.deleteMessage(messageId)

      // Optimistically update UI
      setMessages((prev) => {
        const newMessages = { ...prev }
        Object.keys(newMessages).forEach((convId) => {
          newMessages[convId] = newMessages[convId].filter((msg) => msg.id !== messageId)
        })
        return newMessages
      })
    } catch (error) {
      console.error('[Chat] Failed to delete message:', error)
    }
  }, [])

  const pinMessage = useCallback(
    (messageId: string) => {
      if (!user) return

      setMessages((prev) => {
        const newMessages = { ...prev }
        Object.keys(newMessages).forEach((convId) => {
          newMessages[convId] = newMessages[convId].map((msg) => {
            if (msg.id === messageId) {
              return {
                ...msg,
                isPinned: true,
                pinnedAt: new Date(),
                pinnedBy: user.id,
              }
            }
            return msg
          })
        })
        return newMessages
      })
    },
    [user],
  )

  const unpinMessage = useCallback((messageId: string) => {
    setMessages((prev) => {
      const newMessages = { ...prev }
      Object.keys(newMessages).forEach((convId) => {
        newMessages[convId] = newMessages[convId].map((msg) => {
          if (msg.id === messageId) {
            return {
              ...msg,
              isPinned: false,
              pinnedAt: undefined,
              pinnedBy: undefined,
            }
          }
          return msg
        })
      })
      return newMessages
    })
  }, [])

  const saveDraft = useCallback(async (conversationId: string, draft: string) => {
    try {
      await chatApi.saveDraft(conversationId, draft)

      // Update local state
      setConversations((prev) => prev.map((conv) => (conv.id === conversationId ? { ...conv, draft } : conv)))
    } catch (error) {
      console.error('[Chat] Failed to save draft:', error)
    }
  }, [])

  const getDraft = useCallback(
    async (conversationId: string) => {
      try {
        const response = await chatApi.getDraft(conversationId)
        if (response.success && response.data) {
          return response.data
        }
      } catch (error) {
        console.error('[Chat] Failed to get draft:', error)
      }

      // Fallback to local state
      const conversation = conversations.find((conv) => conv.id === conversationId)
      return conversation?.draft || ""
    },
    [conversations],
  )

  return (
    <ChatContext.Provider
      value={{
        conversations,
        messages,
        users,
        isConnected,
        connectionState,
        loading,
        sendMessage,
        subscribeToConversation,
        unsubscribeFromConversation,
        startTyping,
        stopTyping,
        markAsRead,
        createDirectMessage,
        createGroupChat,
        addReaction,
        removeReaction,
        editMessage,
        deleteMessage,
        pinMessage,
        unpinMessage,
        saveDraft,
        getDraft,
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
