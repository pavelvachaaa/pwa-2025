"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { Conversation, Message } from "@/types"
import { useChat } from "@/lib/chat/context"
import { useAuth } from "@/lib/auth/context"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { ArrowLeft, PanelLeftOpen } from "lucide-react"
import { MessageBubble } from "./message-bubble"
import { MessageComposer } from "./message-composer"
import { cn } from "@/lib/utils"

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
        loadMessages,
        onNewMessage,
        onMessageEdited,
        onMessageDeleted,
        onReactionAdded,
        onReactionRemoved,
        joinConversation,
        leaveConversation,
        onUserPresenceUpdate,
        startTyping,
        stopTyping,
        onTypingStart,
        onTypingStop,
    } = useChat()

    const [presence, setPresence] = useState<Record<string, { status: string; lastSeen?: Date }>>({})
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())

    const [items, setItems] = useState<Message[]>([])
    const [messagesLoading, setMessagesLoading] = useState(true)
    const endRef = useRef<HTMLDivElement>(null)

    // Load messages when conversation changes
    useEffect(() => {
        const loadConversationMessages = async () => {
            setMessagesLoading(true)
            try {
                const messages = await loadMessages(conversation.id)
                setItems(messages)
            } catch (error) {
                console.error('Failed to load messages:', error)
                setItems([])
            } finally {
                setMessagesLoading(false)
            }
        }

        loadConversationMessages()
    }, [conversation.id, loadMessages])

    useEffect(() => {
        joinConversation(conversation.id)
        return () => leaveConversation(conversation.id)
    }, [conversation.id, joinConversation, leaveConversation])

    useEffect(() => {
        const offNew = onNewMessage((msg, cid) => {
            if (cid === conversation.id) setItems((prev) => [...prev, msg])
        })
        const offEdit = onMessageEdited((msg, cid) => {
            if (cid === conversation.id)
                setItems((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg, edited: true } : m)))
        })
        const offDel = onMessageDeleted((id) => setItems((prev) => prev.filter((m) => m.id !== id)))

        const offReactionAdded = onReactionAdded((messageId, emoji, userId) => {
            setItems((prev) => prev.map((m) => {
                if (m.id !== messageId) return m

                const reactions = m.reactions || []
                const existingReaction = reactions.find(r => r.emoji === emoji)

                if (existingReaction) {
                    if (!existingReaction.userIds.includes(userId)) {
                        existingReaction.userIds.push(userId)
                    }
                    return { ...m, reactions: [...reactions] }
                } else {
                    return {
                        ...m,
                        reactions: [...reactions, { emoji, userIds: [userId] }]
                    }
                }
            }))
        })

        const offReactionRemoved = onReactionRemoved((messageId, emoji, userId) => {
            setItems((prev) => prev.map((m) => {
                if (m.id !== messageId) return m

                const reactions = (m.reactions || []).map(r => {
                    if (r.emoji === emoji) {
                        return {
                            ...r,
                            userIds: r.userIds.filter(id => id !== userId)
                        }
                    }
                    return r
                }).filter(r => r.userIds.length > 0) // Remove empty reactions

                return { ...m, reactions }
            }))
        })
        return () => {
            offNew()
            offEdit()
            offDel()
            offReactionAdded()
            offReactionRemoved()
        }
    }, [conversation.id, onNewMessage, onMessageEdited, onMessageDeleted])

    useEffect(() => {
        return onUserPresenceUpdate((userId, status, lastSeen) => {
            setPresence((p) => ({ ...p, [userId]: { status, lastSeen } }))
        })
    }, [onUserPresenceUpdate])

    // Typing indicators
    useEffect(() => {
        const offTypingStart = onTypingStart((conversationId, userId) => {
            if (conversationId === conversation.id && userId !== user?.id) {
                setTypingUsers(prev => new Set([...prev, userId]))
            }
        })

        const offTypingStop = onTypingStop((conversationId, userId) => {
            if (conversationId === conversation.id) {
                setTypingUsers(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(userId)
                    return newSet
                })
            }
        })

        return () => {
            offTypingStart()
            offTypingStop()
        }
    }, [conversation.id, onTypingStart, onTypingStop, user?.id])

    const send = (content: string) => sendMessage(conversation.id, content)
    const grouped = useMemo(() => items, [items])
    const scrollToBottom = () => endRef.current?.scrollIntoView({ behavior: "smooth" })
    useEffect(() => {
        scrollToBottom()
    }, [grouped.length])

    const other = conversation.other_participant

    const title = other?.display_name ?? "Direct message"

    const otherStatus = other
        ? presence[other.id]?.status ?? other?.status ?? other?.presence?.status ?? "offline"
        : undefined

    const otherLastSeen: Date | undefined = other
        ? presence[other.id]?.lastSeen ?? (other?.last_seen ? new Date(other.last_seen) : other?.lastSeen ? new Date(other.lastSeen) : undefined)
        : undefined

    const presenceText = (() => {
        if (otherStatus === "online") return "Online"
        if (otherStatus === "away") return "Away"
        if (otherStatus === "offline" && otherLastSeen) {
            const d = otherLastSeen
            return `Last seen ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        }
        return (otherStatus || "Offline").toString()
    })()

    return (
        <div className="flex h-full max-h-screen flex-col overflow-hidden">
            {/* Fixed Header */}
            <div className="flex-shrink-0 flex items-center gap-2 border-b p-3 bg-background">
                {onBack ? (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                ) : onOpenSidebar ? (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onOpenSidebar}>
                        <PanelLeftOpen className="h-4 w-4" />
                    </Button>
                ) : null}
                <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold">{title}</h2>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{presenceText}</p>
                        <div className="flex items-center gap-1">
                            <span className={cn("h-2 w-2 rounded-full", otherStatus == "online" ? "bg-green-500" : "bg-gray-400")} />
                            <span className="text-xs text-muted-foreground">{otherStatus == "online" ? "Connected" : "Offline"}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Messages Area */}
            <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-2">
                    {messagesLoading ? (
                        <div className="flex items-center justify-center p-8 text-muted-foreground">
                            <div className="text-center">
                                <div className="mb-2">Loading messages...</div>
                            </div>
                        </div>
                    ) : grouped.length === 0 ? (
                        <div className="flex items-center justify-center p-8 text-muted-foreground">
                            <div className="text-center">
                                <div className="mb-2">No messages yet</div>
                                <div className="text-sm">Start a conversation!</div>
                            </div>
                        </div>
                    ) : (
                        grouped.map((m) => {
                            const senderId = (m as any).sender_id ?? (m as any).senderId
                            return (
                                <MessageBubble key={m.id} message={m} isOwn={senderId === (user?.id || currentUserId)} />
                            )
                        })
                    )}

                    {/* Typing indicators */}
                    {typingUsers.size > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
                            <div className="flex gap-1">
                                <span className="h-1 w-1 animate-bounce rounded-full bg-primary" />
                                <span className="h-1 w-1 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0.1s" }} />
                                <span className="h-1 w-1 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0.2s" }} />
                            </div>
                            <span>
                                {typingUsers.size === 1 ? "Someone is typing..." : `${typingUsers.size} people are typing...`}
                            </span>
                        </div>
                    )}

                    <div ref={endRef} />
                </div>
            </div>

            {/* Fixed Composer */}
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