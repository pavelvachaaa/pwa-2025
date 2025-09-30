"use client"

import { useState } from "react"
import type { Message, Conversation } from "@/types"
import { useChat } from "@/lib/chat/context"
import { useAuth } from "@/lib/auth/context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MoreHorizontal, Edit, Trash2, Smile, Reply } from "lucide-react"
import { cn } from "@/lib/utils"
import { ReplyIndicator } from "./reply-indicator"
import { ReactionPickerOverlay } from "./reaction-picker-overlay"
import { getSenderName } from "@/lib/utils/chat"
import { REACTION_EMOJIS } from "@/lib/utils/chat-constants"
import { formatMessageTime, hasUserReacted, hasMessageContentChanged, getRepliedToMessage } from "@/lib/utils/message-utils"
import { useCombinedGestures } from "@/hooks/use-combined-gestures"

interface MessageBubbleProps {
    message: Message
    isOwn?: boolean
    onReply?: (message: Message) => void
    replyingTo?: Message | null
    messages?: Message[]
    conversation?: Conversation
}

export function MessageBubble({ message, isOwn, onReply, messages, conversation }: MessageBubbleProps) {
    const { user } = useAuth()
    const { editMessage, deleteMessage, addReaction, removeReaction } = useChat()
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState(message.content)
    const [showReactions, setShowReactions] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const [reactionOverlay, setReactionOverlay] = useState<{
        visible: boolean
        position: { x: number; y: number }
    }>({
        visible: false,
        position: { x: 0, y: 0 }
    })

    const time = formatMessageTime(message)

    const commit = async () => {
        if (hasMessageContentChanged(message.content, value)) {
            try { await editMessage(message.id, value.trim()) } catch { /* noop */ }
        }
        setEditing(false)
    }

    const handleReactionClick = (emoji: string) => {
        if (!user) return

        if (hasUserReacted(message, user.id, emoji)) {
            removeReaction(message.id, emoji)
        } else {
            addReaction(message.id, emoji)
        }
        setShowReactions(false)
    }

    // Gesture handlers
    const handleSwipeToReply = () => {
        console.log('[MessageBubble] Swipe to reply triggered for message:', message.id)
        if (onReply && !editing) {
            onReply(message)
        }
    }


    const handleLongPressReact = (e: React.TouchEvent | React.MouseEvent) => {
        if (editing) return
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

        setReactionOverlay({
            visible: true,
            position: { x: clientX - 120, y: clientY - 60 } // Center picker on touch point
        })
        setShowReactions(false)
        setShowDropdown(false)
    }

    const handleOverlayReactionSelect = (emoji: string) => {
        handleReactionClick(emoji)
        setReactionOverlay(prev => ({ ...prev, visible: false }))
    }

    const handleOverlayClose = () => {
        setReactionOverlay(prev => ({ ...prev, visible: false }))
    }

    // Initialize combined gesture hook
    const gestures = useCombinedGestures({
        onSwipeReply: handleSwipeToReply,
        onLongPressReact: handleLongPressReact,
        disabled: editing
    })

    const replyToMessage = getRepliedToMessage(message, messages)

    return (
        <>
            <div 
                className={cn(
                    "group relative w-full gesture-area",
                    gestures.isPressed && "long-press-active",
                    isOwn && "flex justify-end"
                )}
                ref={gestures.elementRef}
                {...gestures.handlers}
            >
                {/* Swipe to reply visual feedback */}
                <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none opacity-0 transition-opacity duration-200"
                    data-swipe-reply-icon
                >
                    <Reply className="h-5 w-5 text-primary" />
                    <span className="text-sm text-primary font-medium">Reply</span>
                </div>

                <div className={cn("flex flex-col", isOwn && "items-end")}>
                    <div className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
                        <div className="flex flex-col min-w-0 max-w-xs lg:max-w-md">
                        {/* Reply Indicator with strict width constraint */}
                        {replyToMessage && (
                            <ReplyIndicator
                                replyToMessage={replyToMessage}
                                senderName={getSenderName(replyToMessage.sender_id, user, conversation || null)}
                                className={cn("mb-1 w-full", isOwn && "self-end")}
                            />
                        )}
                        
                        {/* Text Message inherits width constraint from parent */}
                        <div className="relative w-full">
                            <div className={cn("px-4 py-2 rounded-2xl break-words relative", isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-gray-200 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-bl-md")}>
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
                                <div className={cn("absolute top-full mt-1 bg-background/80 backdrop-blur-md border rounded-lg shadow-lg p-2 flex gap-1 z-10", isOwn ? "right-0" : "left-0")}>
                                    {REACTION_EMOJIS.map((emoji) => {
                                        const userReacted = hasUserReacted(message, user?.id || "", emoji)
                                        return (
                                            <Button
                                                key={emoji}
                                                size="sm"
                                                variant="ghost"
                                                className={cn(
                                                    "h-8 w-8 p-0 transition-all duration-200",
                                                    "hover:bg-white/20 hover:backdrop-blur-sm hover:scale-110 hover:shadow-md",
                                                    userReacted && "bg-primary/20 border border-primary/30"
                                                )}
                                                onClick={() => handleReactionClick(emoji)}
                                            >
                                                {emoji}
                                            </Button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Timestamp */}
                        <span className="text-xs text-muted-foreground mt-1 px-3">{time}</span>
                    </div>
                </div>

                {/* Reactions Display - Completely separate from message bubble */}
                {message.reactions && message.reactions.length > 0 && (
                    <div className={cn("flex flex-wrap gap-1 mt-1 w-full max-w-sm", isOwn ? "justify-end" : "justify-start")}>
                        {message.reactions.map((reaction) => {
                            const userReacted = hasUserReacted(message, user?.id || "", reaction.emoji)
                            return (
                                <Button
                                    key={reaction.emoji}
                                    size="default"
                                    variant="ghost"
                                    className={cn(
                                        "h-6 px-2 py-0 text-xs rounded-lg border transition-all duration-200",
                                        "hover:scale-105 hover:shadow-sm",
                                        userReacted 
                                            ? "bg-primary/15 border-primary/40 text-primary hover:bg-primary/20" 
                                            : "bg-muted/50 border-muted hover:bg-muted/70",
                                    )}
                                    onClick={() => handleReactionClick(reaction.emoji)}
                                >
                                    {reaction.emoji} {reaction.userIds.length}
                                </Button>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
        
        {/* Reaction Picker Overlay */}
        <ReactionPickerOverlay
            isVisible={reactionOverlay.visible}
            position={reactionOverlay.position}
            onReactionSelect={handleOverlayReactionSelect}
            onClose={handleOverlayClose}
            message={message}
            userId={user?.id}
        />
    </>
    )
}
