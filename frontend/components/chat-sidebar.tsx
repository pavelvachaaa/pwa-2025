"use client"

import { useMemo, useState, useEffect, useCallback, useDeferredValue } from "react"
import { Search, LogOut, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth/context"
import { useChat } from "@/lib/chat/context"
import { NewChatModal } from "@/components/new-chat-modal"
import { cn } from "@/lib/utils"

interface ChatSidebarProps {
  selectedConversationId: string | null
  onSelectConversation: (id: string) => void
}

export function ChatSidebar({ selectedConversationId, onSelectConversation }: ChatSidebarProps) {
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [presence, setPresence] = useState<Record<string, { status: string; lastSeen?: Date }>>({})
  const [conversationTyping, setConversationTyping] = useState<Record<string, Set<string>>>({})
  const [showNewChatModal, setShowNewChatModal] = useState(false)

  const { user, logout } = useAuth()
  const { conversations, createConversation, onUserPresenceUpdate, onTypingStart, onTypingStop, loading } = useChat()

  // Presence subscription
  const handlePresence = useCallback((userId: string, status: string, lastSeen?: Date) => {
    setPresence((prev) => ({ ...prev, [userId]: { status, lastSeen } }))
  }, [])
  useEffect(() => onUserPresenceUpdate(handlePresence), [onUserPresenceUpdate, handlePresence])

  // Typing indicators subscription
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
        const newTyping = { ...prev }
        if (newTyping[conversationId]) {
          const newSet = new Set(newTyping[conversationId])
          newSet.delete(userId)
          if (newSet.size === 0) {
            delete newTyping[conversationId]
          } else {
            newTyping[conversationId] = newSet
          }
        }
        return newTyping
      })
    })

    return () => {
      offTypingStart()
      offTypingStop()
    }
  }, [onTypingStart, onTypingStop, user?.id])

  const currentUserId = user?.id || ""

  const handleStartChat = useCallback(async (targetUserId: string) => {
    try {
      const conversation = await createConversation(targetUserId)
      if (conversation) {
        onSelectConversation(conversation.id)
      }
    } catch (error) {
      console.error('Failed to start chat:', error)
    }
  }, [createConversation, onSelectConversation])

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    return conversations.filter((c) => {
      const name = c.other_participant?.display_name || "Unknown User"
      return q ? name.toLowerCase().includes(q) : true
    })
  }, [conversations, deferredQuery])

  const formatLastMessageTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "";
    const now = Date.now()
    const diff = now - d.getTime()
    const m = Math.floor(diff / 6e4)
    const h = Math.floor(diff / 36e5)
    const days = Math.floor(diff / 864e5)
    if (m < 1) return "now"
    if (m < 60) return `${m}m`
    if (h < 24) return `${h}h`
    if (days < 7) return `${days}d`
    return d.toLocaleDateString()
  }

  return (
    <aside className="flex h-full flex-col bg-sidebar" aria-label="Conversations sidebar">
      {/* Header */}
      <div className="border-b border-sidebar-border p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar_url || "/placeholder.svg"} />
              <AvatarFallback>{user?.display_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="truncate font-semibold text-sidebar-foreground">{user?.display_name}</h2>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs text-sidebar-foreground/70">Online</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={logout} aria-label="Log out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/50" />
          <Input
            placeholder="Filter conversations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 bg-sidebar-accent border-sidebar-border"
            aria-label="Filter conversations"
          />
        </div>

        {/* New Chat Button */}
        <Button
          variant="outline"
          className="w-full justify-start gap-2 bg-sidebar-accent border-sidebar-border hover:bg-sidebar-accent/80"
          onClick={() => setShowNewChatModal(true)}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="p-3 text-sm text-sidebar-foreground/70">Loading conversations…</div>
        ) : filtered.length === 0 ? (
          <div className="p-3 text-sm text-sidebar-foreground/70">No conversations</div>
        ) : (
          filtered.map((c) => {
            const isSelected = c.id === selectedConversationId
            const other = c.other_participant
            const name = other?.display_name || "Unknown User"
            const avatar = other?.avatar_url || "/placeholder.svg"
            const status = other ? (presence[other.id]?.status || other.status || "offline") : ""

            return (
              <button
                key={c.id}
                onClick={() => onSelectConversation(c.id)}
                className={cn(
                  "w-full rounded-lg p-3 text-left transition-colors hover:bg-sidebar-accent",
                  isSelected && "bg-sidebar-accent"
                )}
                aria-current={isSelected ? "true" : undefined}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={avatar} />
                      <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-sidebar",
                        status === "online" && "bg-green-500",
                        status === "away" && "bg-yellow-500",
                        status === "offline" && "bg-gray-500"
                      )}
                      aria-label={`Status: ${status}`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="truncate font-medium text-sidebar-foreground">{name}</h3>
                      {c.last_message && (
                        <span className="text-xs text-sidebar-foreground/60">
                          {formatLastMessageTime(c.last_message.created_at)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm text-sidebar-foreground/70">
                        {conversationTyping[c.id] && conversationTyping[c.id].size > 0
                          ? "typing..."
                          : c.last_message?.content || "No messages yet"}
                      </p>
                      {!!c.unread_count && c.unread_count > 0 && (
                        <Badge variant="default" className="ml-2 h-5 min-w-5 text-xs bg-primary">{c.unread_count}</Badge>
                      )}
                    </div>

                    {conversationTyping[c.id] && conversationTyping[c.id].size > 0 && (
                      <div className="mt-1 flex items-center gap-1">
                        <div className="flex gap-1">
                          <span className="h-1 w-1 animate-bounce rounded-full bg-primary" />
                          <span className="h-1 w-1 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0.1s" }} />
                          <span className="h-1 w-1 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0.2s" }} />
                        </div>
                        <span className="text-xs text-primary">typing…</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        open={showNewChatModal}
        onOpenChange={setShowNewChatModal}
        onStartChat={handleStartChat}
      />
    </aside>
  )
}
