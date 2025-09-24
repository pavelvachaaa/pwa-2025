"use client"

import { useRef, useEffect, useState } from "react"
import { Phone, Video, Info, MoreVertical, Pin, ArrowLeft, Menu, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  getConversationName,
  getConversationAvatar,
  getUserById,
  type Conversation,
  type Message,
} from "@/lib/mock-data"
import { useChat } from "@/hooks/use-chat"
import { useIsMobile } from "@/hooks/use-mobile"
import { MessageBubble } from "./message-bubble"
import { MessageComposer } from "./message-composer"
import { GlobalSearch } from "./global-search" // Import GlobalSearch component
import { cn } from "@/lib/utils"
import type { UploadedFile } from "@/lib/upload-utils"

interface ConversationViewProps {
  conversation: Conversation
  currentUserId: string
  onToggleDetails: () => void
  showDetails: boolean
  onBack?: () => void // Added optional back handler for mobile
  onOpenSidebar?: () => void // Added optional sidebar opener for mobile
  onSelectConversation?: (id: string) => void // Added conversation selection handler
  onStartChat?: (userId: string) => void // Added start chat handler
}

export function ConversationView({
  conversation,
  currentUserId,
  onToggleDetails,
  showDetails,
  onBack,
  onOpenSidebar,
  onSelectConversation, // Added conversation selection prop
  onStartChat, // Added start chat prop
}: ConversationViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages, sendMessage, startTyping, stopTyping, connectionState, isConnected } = useChat()
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [showPinnedMessages, setShowPinnedMessages] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false) // Added global search state
  const isMobile = useIsMobile()

  const name = getConversationName(conversation, currentUserId)
  const avatar = getConversationAvatar(conversation, currentUserId)
  const conversationMessages = messages[conversation.id] || []

  const pinnedMessages = conversationMessages.filter((msg) => msg.isPinned)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversationMessages])

  const handleSendMessage = (content: string, attachments?: UploadedFile[], replyToId?: string) => {
    if (!isConnected) return

    // For now, just send the text content
    // In a real implementation, you'd handle attachments here
    if (content.trim()) {
      sendMessage(conversation.id, content, replyToId)
    }

    // TODO: Handle file attachments
    if (attachments && attachments.length > 0) {
      console.log("Sending attachments:", attachments)
      // You would send attachment messages here
    }
  }

  const handleStartTyping = () => {
    if (isConnected) {
      startTyping(conversation.id)
    }
  }

  const handleStopTyping = () => {
    if (isConnected) {
      stopTyping(conversation.id)
    }
  }

  const handleReply = (message: Message) => {
    setReplyingTo(message)
  }

  const handleCancelReply = () => {
    setReplyingTo(null)
  }

  const getParticipantStatus = () => {
    if (conversation.type === "group") {
      return `${conversation.participants.length} members`
    }

    const otherParticipant = conversation.participants.find((id) => id !== currentUserId)
    const user = getUserById(otherParticipant!)
    if (user?.status === "online") return "Online"
    if (user?.status === "away") return "Away"
    if (user?.lastSeen) {
      const diff = Date.now() - user.lastSeen.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours < 1) return "Last seen recently"
      if (hours < 24) return `Last seen ${hours}h ago`
      return "Last seen a while ago"
    }
    return "Offline"
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2 md:gap-3">
          {isMobile && (
            <>
              {onBack ? (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mr-1" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              ) : (
                onOpenSidebar && (
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mr-1" onClick={onOpenSidebar}>
                    <Menu className="h-4 w-4" />
                  </Button>
                )
              )}
            </>
          )}
          <Avatar className="h-8 w-8 md:h-10 md:w-10">
            <AvatarImage src={avatar || "/placeholder.svg"} />
            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-card-foreground text-sm md:text-base">{name}</h2>
            <div className="flex items-center gap-2">
              <p className="text-xs md:text-sm text-muted-foreground">{getParticipantStatus()}</p>
              <div className="flex items-center gap-1">
                <div
                  className={cn("w-1.5 h-1.5 md:w-2 md:h-2 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")}
                />
                <span className="text-xs text-muted-foreground capitalize">{connectionState}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setShowGlobalSearch(true)}
            title="Search messages and contacts"
          >
            <Search className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
          {pinnedMessages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 w-8 p-0", showPinnedMessages && "bg-accent")}
              onClick={() => setShowPinnedMessages(!showPinnedMessages)}
            >
              <Pin className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Phone className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Video className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 w-8 p-0", showDetails && "bg-accent")}
              onClick={onToggleDetails}
            >
              <Info className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
        </div>
      </div>

      {pinnedMessages.length > 0 && (
        <Collapsible open={showPinnedMessages} onOpenChange={setShowPinnedMessages}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start p-3 border-b border-border bg-muted/30 hover:bg-muted/50"
            >
              <Pin className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">
                {pinnedMessages.length} pinned message{pinnedMessages.length > 1 ? "s" : ""}
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-b border-border bg-muted/20">
            <ScrollArea className="max-h-48 p-3">
              <div className="space-y-2">
                {pinnedMessages.map((msg) => {
                  const sender = getUserById(msg.senderId)
                  return (
                    <div key={msg.id} className="flex items-start gap-2 p-2 rounded-lg bg-background/50">
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarImage src={sender?.avatar || "/placeholder.svg"} />
                        <AvatarFallback className="text-xs">{sender?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground">{sender?.name}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">{msg.content}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-3 md:p-4">
        <div className="space-y-3 md:space-y-4">
          {conversationMessages.map((msg, index) => {
            const prevMessage = index > 0 ? conversationMessages[index - 1] : null
            const showAvatar = !prevMessage || prevMessage.senderId !== msg.senderId
            const showTimestamp =
              !prevMessage || msg.timestamp.getTime() - prevMessage.timestamp.getTime() > 5 * 60 * 1000 // 5 minutes

            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.senderId === currentUserId}
                showAvatar={showAvatar}
                showTimestamp={showTimestamp}
                onReply={handleReply}
              />
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Typing Indicator */}
      {conversation.isTyping && conversation.isTyping.length > 0 && (
        <div className="px-3 md:px-4 py-2">
          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full animate-bounce"></div>
              <div
                className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
            <span>
              {conversation.isTyping.length === 1 ? "Someone is" : `${conversation.isTyping.length} people are`}{" "}
              typing...
            </span>
          </div>
        </div>
      )}

      {/* Message Composer */}
      <MessageComposer
        conversationId={conversation.id}
        onSendMessage={handleSendMessage}
        onStartTyping={handleStartTyping}
        onStopTyping={handleStopTyping}
        isConnected={isConnected}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
      />

      {onSelectConversation && onStartChat && (
        <GlobalSearch
          open={showGlobalSearch}
          onOpenChange={setShowGlobalSearch}
          onSelectConversation={onSelectConversation}
          onStartChat={onStartChat}
          currentUserId={currentUserId}
        />
      )}
    </div>
  )
}
