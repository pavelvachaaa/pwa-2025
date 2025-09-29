"use client"

import { useState, useCallback } from "react"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth/context"
import { useChat } from "@/lib/chat/context"
import { NewChatModal } from "@/components/new-chat-modal"
import { SidebarHeader } from "@/components/chat-sidebar/sidebar-header"
import { ConversationList } from "@/components/chat-sidebar/conversation-list"
import { useConversationSearch } from "@/hooks/use-conversation-search"
import { useSidebarTyping } from "@/hooks/use-sidebar-typing"

interface ChatSidebarProps {
  selectedConversationId: string | null
  onSelectConversation: (id: string) => void
}

export function ChatSidebar({ selectedConversationId, onSelectConversation }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showNewChatModal, setShowNewChatModal] = useState(false)

  const { user, logout } = useAuth()
  const { conversations, createConversation, loading } = useChat()

  const filteredConversations = useConversationSearch(conversations, searchQuery)
  const conversationTyping = useSidebarTyping()

  const handleStartChat = useCallback(async (targetUserId: string) => {
    try {
      const conversation = await createConversation(targetUserId)
      if (conversation) {
        onSelectConversation(conversation.id)
        setShowNewChatModal(false)
      }
    } catch (error) {
      console.error('Failed to start chat:', error)
    }
  }, [createConversation, onSelectConversation])

  const handleNewChat = useCallback(() => {
    setShowNewChatModal(true)
  }, [])

  return (
    <aside className="flex h-full flex-col bg-sidebar" aria-label="Conversations sidebar">
      <SidebarHeader
        user={user}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={logout}
        onNewChat={handleNewChat}
      />

      <Separator className="bg-sidebar-border" />

      <div className="flex-1 overflow-y-auto p-2">
        <ConversationList
          conversations={filteredConversations}
          selectedConversationId={selectedConversationId}
          conversationTyping={conversationTyping}
          isLoading={loading}
          onSelectConversation={onSelectConversation}
        />
      </div>

      <NewChatModal
        open={showNewChatModal}
        onOpenChange={setShowNewChatModal}
        onStartChat={handleStartChat}
      />
    </aside>
  )
}