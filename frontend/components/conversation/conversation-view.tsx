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
        onNewMessage,
        onMessageEdited,
        onMessageDeleted,
        joinConversation,
        leaveConversation,
        onUserPresenceUpdate,
    } = useChat()

    const [presence, setPresence] = useState<Record<string, { status: string; lastSeen?: Date }>>({})

    const initialMessages = (conversation as any).messages as Message[] | undefined
    const [items, setItems] = useState<Message[]>(initialMessages ?? [])
    const endRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setItems(initialMessages ?? [])
    }, [conversation.id])

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
        return () => {
            offNew()
            offEdit()
            offDel()
        }
    }, [conversation.id, onNewMessage, onMessageEdited, onMessageDeleted])

    useEffect(() => {
        return onUserPresenceUpdate((userId, status, lastSeen) => {
            setPresence((p) => ({ ...p, [userId]: { status, lastSeen } }))
        })
    }, [onUserPresenceUpdate])

    const send = (content: string) => sendMessage(conversation.id, content)
    const grouped = useMemo(() => items, [items])
    const scrollToBottom = () => endRef.current?.scrollIntoView({ behavior: "smooth" })
    useEffect(() => {
        scrollToBottom()
    }, [grouped.length])

    const isDM = conversation.type === "dm" || (conversation.participants?.length === 2)
    const other = isDM
        ? (conversation.participants as any[])?.find((p) => p.id !== (user?.id || currentUserId))
        : null

    // Title: prefer display_name > name > username
    const title = isDM
        ? (other?.display_name ?? "Direct message")
        : (conversation.name ?? "Group")

    // Compute presence strictly from the **second participant** (other)
    const otherStatus = other
        ? presence[other.id]?.status ?? other?.status ?? other?.presence?.status ?? "offline"
        : undefined

    const otherLastSeen: Date | undefined = other
        ? presence[other.id]?.lastSeen ?? (other?.last_seen ? new Date(other.last_seen) : other?.lastSeen ? new Date(other.lastSeen) : undefined)
        : undefined

    const presenceText = (() => {
        if (!isDM) return `${conversation.participants?.length || 0} members`
        if (otherStatus === "online") return "Online"
        if (otherStatus === "away") return "Away"
        if (otherStatus === "offline" && otherLastSeen) {
            const d = otherLastSeen
            return `Last seen ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        }
        return (otherStatus || "Offline").toString()
    })()

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b p-3">
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

            <ScrollArea className="flex-1 p-3">
                <div className="space-y-2">
                    {grouped.map((m) => {
                        const senderId = (m as any).sender_id ?? (m as any).senderId
                        return (
                            <MessageBubble key={m.id} message={m} isOwn={senderId === (user?.id || currentUserId)} />
                        )
                    })}
                    <div ref={endRef} />
                </div>
            </ScrollArea>

            <MessageComposer disabled={!wsConnected} onSend={send} />
        </div>
    )
}