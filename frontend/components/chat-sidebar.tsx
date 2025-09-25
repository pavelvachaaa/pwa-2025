"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, LogOut } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth/context"
import { useChat } from "@/lib/chat/context"
import type { Conversation } from "@/types"
import { cn } from "@/lib/utils"

interface ChatSidebarProps {
  selectedConversationId: string | null
  onSelectConversation: (id: string) => void
}

export function ChatSidebar({
  selectedConversationId,
  onSelectConversation,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [userPresence, setUserPresence] = useState<Record<string, { status: string; lastSeen?: Date }>>({})

  const { user, logout } = useAuth()
  const { conversations, onUserPresenceUpdate } = useChat()

  // Handle user presence updates
  const handlePresenceUpdate = useCallback((userId: string, status: string, lastSeen?: Date) => {
    console.log('[ChatSidebar] Presence update received:', { userId, status, lastSeen })
    setUserPresence(prev => ({
      ...prev,
      [userId]: { status, lastSeen }
    }))
  }, [])

  // Subscribe to presence updates
  useEffect(() => {
    const unsubscribe = onUserPresenceUpdate(handlePresenceUpdate)
    return unsubscribe
  }, [onUserPresenceUpdate, handlePresenceUpdate])

  const currentUserId = user?.id || ''

  const filteredConversations = conversations.filter((conv) => {
    let name = 'Unknown';

    if (conv.type === 'group') {
      name = conv.name || 'Unnamed Group';
    } else if (conv.type === 'dm') {
      const otherParticipant = conv.participants?.find(
        (participant) => participant.id !== currentUserId
      );
      if (otherParticipant) {
        name = otherParticipant.display_name || 'Unknown User';
      }
    }

    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const formatLastMessageTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return "now"
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return date.toLocaleDateString()
  }


  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar_url || "/placeholder.svg"} />
              <AvatarFallback>{user?.display_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-sidebar-foreground">{user?.display_name}</h2>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-sidebar-foreground/70">Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-sidebar-foreground/50" />
          <Input
            placeholder="Filter conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-sidebar-accent border-sidebar-border"
          />
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {filteredConversations.map((conversation) => {
            let name = 'Unknown';
            let avatar = '/placeholder.svg';

            if (conversation.type === 'group') {
              name = conversation.name || 'Unnamed Group';
              avatar = conversation.avatar_url || '/placeholder.svg';
            } else if (conversation.type === 'dm') {
              const otherParticipant = conversation.participants?.find(
                (participant) => participant.id !== currentUserId
              );
              if (otherParticipant) {
                name = otherParticipant.display_name || 'Unknown User';
                avatar = otherParticipant.avatar_url || '/placeholder.svg';
              }
            }

            const otherUser = conversation.type === 'dm'
              ? conversation.participants?.find(p => p.id !== currentUserId)
              : null;
            const realtimePresence = otherUser ? userPresence[otherUser.id] : null;
            const userStatus = realtimePresence?.status || otherUser?.status || 'offline';

            const isSelected = conversation.id === selectedConversationId

            return (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={cn(
                  "w-full p-3 rounded-lg text-left hover:bg-sidebar-accent transition-colors",
                  isSelected && "bg-sidebar-accent",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={avatar || "/placeholder.svg"} />
                      <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {conversation.type === "dm" && (
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-sidebar",
                        userStatus === 'online' && "bg-green-500",
                        userStatus === 'away' && "bg-yellow-500",
                        userStatus === 'offline' && "bg-gray-500"
                      )}></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sidebar-foreground truncate">{name}</h3>
                      {conversation.last_message && (
                        <span className="text-xs text-sidebar-foreground/60">
                          {formatLastMessageTime(new Date(conversation.last_message.created_at))}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-sidebar-foreground/70 truncate">
                        {conversation.last_message?.content || "No messages yet"}
                      </p>
                      {conversation.unread_count > 0 && (
                        <Badge variant="default" className="ml-2 h-5 min-w-5 text-xs bg-primary">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>

                    {conversation.isTyping && conversation.isTyping.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <div className="flex gap-1">
                          <div className="w-1 h-1 bg-primary rounded-full animate-bounce"></div>
                          <div
                            className="w-1 h-1 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-1 h-1 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                        <span className="text-xs text-primary">typing...</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

    </div>
  )
}
