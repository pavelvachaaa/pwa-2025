"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { wsClient } from "@/lib/ws-client"
import type { Conversation, Message, User } from "@/types"

interface ChatContextType {
  conversations: Conversation[]
  messages: Record<string, Message[]>
  users: User[]
  isConnected: boolean
  connectionState: string
  sendMessage: (conversationId: string, content: string, replyTo?: string) => void
  subscribeToConversation: (conversationId: string) => void
  unsubscribeFromConversation: (conversationId: string) => void
  startTyping: (conversationId: string) => void
  stopTyping: (conversationId: string) => void
  markAsRead: (conversationId: string) => void
  createDirectMessage: (userId: string) => string
  createGroupChat: (name: string, participants: string[], avatar?: string) => string
  addReaction: (messageId: string, emoji: string) => void
  removeReaction: (messageId: string, emoji: string) => void
  editMessage: (messageId: string, newContent: string) => void
  deleteMessage: (messageId: string) => void
  pinMessage: (messageId: string) => void
  unpinMessage: (messageId: string) => void
  saveDraft: (conversationId: string, draft: string) => void
  getDraft: (conversationId: string) => string
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations)
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
    // Group messages by conversation
    const grouped: Record<string, Message[]> = {}
    mockMessages.forEach((msg) => {
      if (!grouped[msg.conversationId]) {
        grouped[msg.conversationId] = []
      }
      grouped[msg.conversationId].push(msg)
    })
    return grouped
  })
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState("disconnected")

  // Connect to WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      wsClient.connect(user.id).catch(console.error)
    } else {
      wsClient.disconnect()
    }

    return () => {
      wsClient.disconnect()
    }
  }, [isAuthenticated, user])

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
    (conversationId: string, content: string, replyTo?: string) => {
      if (!isConnected || !content.trim()) return

      wsClient.sendMessage({
        conversationId,
        content: content.trim(),
        type: "text",
        replyTo,
      })

      // Clear draft when sending
      saveDraft(conversationId, "")
    },
    [isConnected],
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
    (userId: string) => {
      if (!user) return ""

      // Check if conversation already exists
      const existingConv = conversations.find(
        (conv) => conv.type === "dm" && conv.participants.includes(user.id) && conv.participants.includes(userId),
      )

      if (existingConv) {
        return existingConv.id
      }

      // Create new conversation
      const newConversation: Conversation = {
        id: `conv_${Date.now()}`,
        type: "dm",
        participants: [user.id, userId],
        unreadCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      setConversations((prev) => [newConversation, ...prev])
      return newConversation.id
    },
    [user, conversations],
  )

  const createGroupChat = useCallback(
    (name: string, participants: string[], avatar?: string) => {
      if (!user) return ""

      const newConversation: Conversation = {
        id: `conv_${Date.now()}`,
        type: "group",
        name,
        participants: [user.id, ...participants],
        avatar,
        unreadCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      setConversations((prev) => [newConversation, ...prev])
      return newConversation.id
    },
    [user],
  )

  const addReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!user) return

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
    },
    [user],
  )

  const removeReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!user) return

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
    },
    [user],
  )

  const editMessage = useCallback((messageId: string, newContent: string) => {
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
  }, [])

  const deleteMessage = useCallback((messageId: string) => {
    setMessages((prev) => {
      const newMessages = { ...prev }
      Object.keys(newMessages).forEach((convId) => {
        newMessages[convId] = newMessages[convId].filter((msg) => msg.id !== messageId)
      })
      return newMessages
    })
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

  const saveDraft = useCallback((conversationId: string, draft: string) => {
    setConversations((prev) => prev.map((conv) => (conv.id === conversationId ? { ...conv, draft } : conv)))
  }, [])

  const getDraft = useCallback(
    (conversationId: string) => {
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
