"use client"

import { useState } from "react"
import { Search, Plus, Users, Settings, LogOut, Command } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { getConversationName, getConversationAvatar, type Conversation } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { NewChatModal } from "./new-chat-modal"
import { NewGroupModal } from "./new-group-modal"
import { FindFriendsModal } from "./find-friends-modal"
import { useChat } from "@/hooks/use-chat"
import { GlobalSearch } from "./global-search" // Import GlobalSearch component

interface ChatSidebarProps {
  conversations: Conversation[]
  selectedConversationId: string | null
  onSelectConversation: (id: string) => void
  currentUserId: string
}

export function ChatSidebar({
  conversations,
  selectedConversationId,
  onSelectConversation,
  currentUserId,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [showNewGroupModal, setShowNewGroupModal] = useState(false)
  const [showFindFriendsModal, setShowFindFriendsModal] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false) // Added global search state

  const { user, signOut } = useAuth()
  const router = useRouter()
  const { createDirectMessage, createGroupChat } = useChat()

  const filteredConversations = conversations.filter((conv) => {
    const name = getConversationName(conv, currentUserId).toLowerCase()
    return name.includes(searchQuery.toLowerCase())
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

  const handleSettingsClick = () => {
    router.push("/settings")
  }

  const handleStartChat = (userId: string) => {
    const conversationId = createDirectMessage(userId)
    if (conversationId) {
      onSelectConversation(conversationId)
    }
  }

  const handleCreateGroup = (name: string, participants: string[], avatar?: string) => {
    const conversationId = createGroupChat(name, participants, avatar)
    if (conversationId) {
      onSelectConversation(conversationId)
    }
  }

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar || "/placeholder.svg"} />
              <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-sidebar-foreground">{user?.name}</h2>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-sidebar-foreground/70">Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleSettingsClick}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 bg-sidebar-accent border-sidebar-border text-sidebar-foreground/70"
            onClick={() => setShowGlobalSearch(true)}
          >
            <Command className="h-4 w-4" />
            Search messages, contacts...
            <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

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
      </div>

      {/* Action Buttons */}
      <div className="p-4 space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 bg-sidebar-accent border-sidebar-border"
          onClick={() => setShowNewChatModal(true)}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 bg-sidebar-accent border-sidebar-border"
          onClick={() => setShowNewGroupModal(true)}
        >
          <Users className="h-4 w-4" />
          New Group
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 bg-sidebar-accent border-sidebar-border"
          onClick={() => setShowFindFriendsModal(true)}
        >
          <Search className="h-4 w-4" />
          Find Friends
        </Button>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {filteredConversations.map((conversation) => {
            const name = getConversationName(conversation, currentUserId)
            const avatar = getConversationAvatar(conversation, currentUserId)
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
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-sidebar"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sidebar-foreground truncate">{name}</h3>
                      {conversation.lastMessage && (
                        <span className="text-xs text-sidebar-foreground/60">
                          {formatLastMessageTime(conversation.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-sidebar-foreground/70 truncate">
                        {conversation.lastMessage?.content || "No messages yet"}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <Badge variant="default" className="ml-2 h-5 min-w-5 text-xs bg-primary">
                          {conversation.unreadCount}
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

      {/* Modal Components */}
      <NewChatModal open={showNewChatModal} onOpenChange={setShowNewChatModal} onStartChat={handleStartChat} />

      <NewGroupModal open={showNewGroupModal} onOpenChange={setShowNewGroupModal} onCreateGroup={handleCreateGroup} />

      <FindFriendsModal
        open={showFindFriendsModal}
        onOpenChange={setShowFindFriendsModal}
        onStartChat={handleStartChat}
      />

      <GlobalSearch
        open={showGlobalSearch}
        onOpenChange={setShowGlobalSearch}
        onSelectConversation={onSelectConversation}
        onStartChat={handleStartChat}
        currentUserId={currentUserId}
      />
    </div>
  )
}
