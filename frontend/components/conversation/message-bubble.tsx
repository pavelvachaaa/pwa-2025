"use client"

import { useState } from "react"
import type { Message } from "@/types"
import { useChat } from "@/lib/chat/context"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MoreHorizontal, Edit, Trash2, Smile, Reply } from "lucide-react"
import { cn } from "@/lib/utils"

interface MessageBubbleProps {
    message: Message
    isOwn?: boolean
    onReply?: (message: Message) => void
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"]

export function MessageBubble({ message, isOwn, onReply }: MessageBubbleProps) {
    const { user } = useAuth()
    const { editMessage, deleteMessage, addReaction, removeReaction } = useChat()
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState(message.content)
    const [showReactions, setShowReactions] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)

    const ts = new Date(message.created_at || (message as any).timestamp || Date.now())
    const time = ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    const commit = async () => {
        const v = value.trim()
        if (v && v !== message.content) {
            try { await editMessage(message.id, v) } catch { /* noop */ }
        }
        setEditing(false)
    }

    const handleReactionClick = (emoji: string) => {
        if (!user) return

        const existingReaction = message.reactions?.find(r => r.emoji === emoji)
        const hasUserReacted = existingReaction?.userIds.includes(user.id)

        if (hasUserReacted) {
            removeReaction(message.id, emoji)
        } else {
            addReaction(message.id, emoji)
        }
        setShowReactions(false)
    }

    return (
        <div className={cn("group relative", isOwn && "flex justify-end")}>
            <div className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
                {/* Message Content */}
                <div className={cn("flex flex-col max-w-xs lg:max-w-md", isOwn && "items-end")}>
                    {/* Text Message */}
                    <div className="relative">
                        <div className={cn("px-4 py-2 rounded-2xl break-words relative", isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-muted-foreground rounded-bl-md")}>
                            {editing ? (
                                <Input
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    onBlur={commit}
                                    onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setValue(message.content) } }}
                                    className="text-sm bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                                    autoFocus
                                />
                            ) : (
                                <p className="text-sm leading-relaxed">{message.content}</p>
                            )}
                            {message.is_edited && !editing && <span className="text-xs opacity-70 ml-2">(edited)</span>}
                        </div>

                        {/* Hover Actions */}
                        <div className={cn("absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-50", isOwn ? "-left-20" : "-right-20")}>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 bg-background border shadow-sm"
                                onClick={() => setShowReactions(!showReactions)}
                            >
                                <Smile className="h-3 w-3" />
                            </Button>

                            <div className="relative">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 bg-background border shadow-sm"
                                    onClick={() => setShowDropdown(!showDropdown)}
                                >
                                    <MoreHorizontal className="h-3 w-3" />
                                </Button>

                                {showDropdown && (
                                    <div className={cn(
                                        "absolute top-full mt-1 bg-background border rounded-lg shadow-lg p-1 z-[100] min-w-[120px]",
                                        isOwn ? "right-0" : "left-0"
                                    )}>
                                        <button
                                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded-sm"
                                            onClick={() => {
                                                onReply?.(message);
                                                setShowDropdown(false);
                                            }}
                                        >
                                            <Reply className="h-4 w-4" />
                                            Reply
                                        </button>
                                        {isOwn && (
                                            <>
                                                <button
                                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded-sm"
                                                    onClick={() => {
                                                        setEditing(true);
                                                        setShowDropdown(false);
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                    Edit
                                                </button>
                                                <button
                                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-destructive/10 text-destructive rounded-sm"
                                                    onClick={() => {
                                                        deleteMessage(message.id);
                                                        setShowDropdown(false);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Emoji Reaction Picker */}
                        {showReactions && (
                            <div className={cn("absolute top-full mt-1 bg-background border rounded-lg shadow-lg p-2 flex gap-1 z-10", isOwn ? "right-0" : "left-0")}>
                                {REACTION_EMOJIS.map((emoji) => (
                                    <Button
                                        key={emoji}
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 hover:bg-muted"
                                        onClick={() => handleReactionClick(emoji)}
                                    >
                                        {emoji}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Reactions Display */}
                    {message.reactions && message.reactions.length > 0 && (
                        <div className={cn("flex flex-wrap gap-1 mt-1", isOwn && "justify-end")}>
                            {message.reactions.map((reaction) => (
                                <Button
                                    key={reaction.emoji}
                                    size="sm"
                                    variant="ghost"
                                    className={cn(
                                        "h-6 px-2 py-0 text-xs rounded-full border",
                                        reaction.userIds.includes(user?.id || "") ? "bg-primary/10 border-primary/20" : "bg-muted/50",
                                    )}
                                    onClick={() => handleReactionClick(reaction.emoji)}
                                >
                                    {reaction.emoji} {reaction.userIds.length}
                                </Button>
                            ))}
                        </div>
                    )}

                    {/* Timestamp */}
                    <span className="text-xs text-muted-foreground mt-1 px-3">{time}</span>
                </div>
            </div>
        </div>
    )
}
