"use client"

import { useEffect, useRef } from "react"
import type { Conversation } from "@/types"
import { useChat } from "@/lib/chat/context"
import { useAuth } from "@/lib/auth/context"
import { MessageBubble } from "./message-bubble"
import { MessageComposer } from "./message-composer"
import { ConversationHeader } from "./conversation-header"
import { TypingIndicator } from "./typing-indicator"
import { EmptyMessages } from "./empty-messages"
import { MessageLoading, LoadMoreIndicator } from "./message-loading"
import { useInfiniteMessages } from "@/hooks/use-infinite-messages"
import { useMarkAsRead } from "@/hooks/use-mark-as-read"
import { usePresence } from "@/hooks/use-presence"
import { useTypingIndicator } from "@/hooks/use-typing-indicator"
import { useReply } from "@/hooks/use-reply"
import { scrollToBottom, getUserPresenceStatus, isUserOnline } from "@/lib/utils/ui-utils"
import { ScrollToBottom } from "./scroll-to-bottom"
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom"

interface ConversationViewProps {
    conversation: Conversation
    currentUserId: string
    onToggleDetails?: () => void
    showDetails?: boolean
    onBack?: () => void
    onOpenSidebar?: () => void
    onSelectConversation?: (id: string) => void
    onStartChat?: (userId: string) => void
}

export function ConversationView({
    conversation,
    currentUserId,
    onBack,
    onOpenSidebar,
}: ConversationViewProps) {
    const { user } = useAuth()
    const {
        wsConnected,
        sendMessage,
        joinConversation,
        leaveConversation,
        startTyping,
        stopTyping,
    } = useChat()

    const { 
        messages, 
        isLoading: messagesLoading, 
        isLoadingMore, 
        hasMore, 
        scrollRef 
    } = useInfiniteMessages(conversation.id)
    
    useMarkAsRead(conversation.id, wsConnected)
    
    const { presence, getPresenceText } = usePresence()
    const conversationTyping = useTypingIndicator(currentUserId, user?.id)
    const { replyingTo, setReplyingTo, clearReply } = useReply()
    const endRef = useRef<HTMLDivElement>(null)
    const { showScrollButton, scrollToBottom: scrollToBottomSmooth } = useScrollToBottom(scrollRef)


    useEffect(() => {
        joinConversation(conversation.id)
        return () => leaveConversation(conversation.id)
    }, [conversation.id, joinConversation, leaveConversation])




    const send = (content: string) => {
        sendMessage(conversation.id, content, replyingTo?.id)
        clearReply()
    }

    useEffect(() => {
        if (!messagesLoading && messages.length > 0) {
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
                }
            }, 100)
        }
    }, [conversation.id, messagesLoading]) // Only when conversation changes or finishes loading

    const other = conversation.other_participant
    const otherPresence = other ? presence[other.id] : undefined
    const otherStatus = getUserPresenceStatus(other?.status, otherPresence?.status)
    const presenceText = other ? getPresenceText(other, otherPresence) : "Offline"

    return (
        <div className="flex mobile-full-height mobile-no-overscroll min-h-0 flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="flex-shrink-0 bg-background border-b safe-area-top">
                <ConversationHeader
                    conversation={conversation}
                    presenceText={presenceText}
                    isOnline={isUserOnline(otherStatus)}
                    onBack={onBack}
                    onOpenSidebar={onOpenSidebar}
                />
            </div>

            {/* Scrollable Messages Area with Infinite Scroll */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-3 py-2 min-h-0 smooth-scroll relative"
            >
                <div className="space-y-2">
                    {/* Load more indicator at top */}
                    <LoadMoreIndicator 
                        isLoading={isLoadingMore} 
                        hasMore={hasMore}
                    />

                    {messagesLoading ? (
                        <MessageLoading />
                    ) : messages.length === 0 ? (
                        <EmptyMessages isLoading={false} />
                    ) : (
                        messages.map((message) => {
                            const senderId = message.sender_id
                            return (
                                <MessageBubble
                                    key={message.id}
                                    message={message}
                                    isOwn={senderId === (user?.id || currentUserId)}
                                    onReply={setReplyingTo}
                                    replyingTo={replyingTo}
                                    messages={messages}
                                    conversation={conversation}
                                />
                            )
                        })
                    )}

                    <TypingIndicator typingUserIds={conversationTyping[conversation.id] || []} />
                    <div ref={endRef} className="h-0" />
                </div>

            </div>

            {/* Scroll to Bottom Button - Above composer */}
            <div className="relative pb-3">
                <ScrollToBottom 
                    isVisible={showScrollButton}
                    onClick={scrollToBottomSmooth}
                />
            </div>

            {/* Sticky Composer */}
            <div className="flex-shrink-0 bg-background border-t">
                <MessageComposer
                    disabled={!wsConnected}
                    onSend={send}
                    onStartTyping={() => startTyping(conversation.id)}
                    onStopTyping={() => stopTyping(conversation.id)}
                    replyingTo={replyingTo}
                    onCancelReply={clearReply}
                    conversation={conversation}
                />
            </div>
        </div>
    )
}