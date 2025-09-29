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
import { useMessages } from "@/hooks/use-messages"
import { usePresence } from "@/hooks/use-presence"
import { useTypingIndicator } from "@/hooks/use-typing-indicator"

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

    const { messages, isLoading: messagesLoading } = useMessages(conversation.id)
    const { presence, getPresenceText } = usePresence()
    const conversationTyping = useTypingIndicator(currentUserId, user?.id)
    const endRef = useRef<HTMLDivElement>(null)


    useEffect(() => {
        joinConversation(conversation.id)
        return () => leaveConversation(conversation.id)
    }, [conversation.id, joinConversation, leaveConversation])




    const send = (content: string) => sendMessage(conversation.id, content)
    const scrollToBottom = () => endRef.current?.scrollIntoView({ behavior: "smooth" })

    useEffect(() => {
        scrollToBottom()
    }, [messages.length])

    const other = conversation.other_participant
    const otherPresence = other ? presence[other.id] : undefined
    const otherStatus = otherPresence?.status ?? other?.status ?? "offline"
    const presenceText = other ? getPresenceText(other, otherPresence) : "Offline"

    return (
        <div className="flex h-full max-h-screen flex-col overflow-hidden">
            <ConversationHeader
                conversation={conversation}
                presenceText={presenceText}
                isOnline={otherStatus === "online"}
                onBack={onBack}
                onOpenSidebar={onOpenSidebar}
            />

            {/* Scrollable Messages Area */}
            <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-2">
                    {messagesLoading || messages.length === 0 ? (
                        <EmptyMessages isLoading={messagesLoading} />
                    ) : (
                        messages.map((message) => {
                            const senderId = message.sender_id
                            return (
                                <MessageBubble
                                    key={message.id}
                                    message={message}
                                    isOwn={senderId === (user?.id || currentUserId)}
                                />
                            )
                        })
                    )}

                    <TypingIndicator typingUserIds={conversationTyping[conversation.id] || []} />
                    <div ref={endRef} />
                </div>
            </div>

            <div className="flex-shrink-0">
                <MessageComposer
                    disabled={!wsConnected}
                    onSend={send}
                    onStartTyping={() => startTyping(conversation.id)}
                    onStopTyping={() => stopTyping(conversation.id)}
                />
            </div>
        </div>
    )
}