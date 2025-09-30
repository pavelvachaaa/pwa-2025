"use client"

import { useCallback, useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import type { Message, Conversation } from "@/types"
import { ReplyPreview } from "./reply-preview"
import { useAuth } from "@/lib/auth/context"
import { getSenderName } from "@/lib/utils/chat"
import { validateMessageContent } from "@/lib/utils/message-utils"
import { TypingManager } from "@/lib/utils/typing-utils"

interface MessageComposerProps {
    onSend: (content: string) => void
    onStartTyping?: () => void
    onStopTyping?: () => void
    disabled?: boolean
    className?: string
    replyingTo?: Message | null
    onCancelReply?: () => void
    conversation?: Conversation
}

export function MessageComposer({ 
    onSend, 
    onStartTyping, 
    onStopTyping, 
    disabled, 
    className, 
    replyingTo, 
    onCancelReply,
    conversation 
}: MessageComposerProps) {
    const [text, setText] = useState("")
    const typingManagerRef = useRef<TypingManager | null>(null)

    useEffect(() => {
        if (onStartTyping && onStopTyping && !disabled) {
            typingManagerRef.current = new TypingManager(onStartTyping, onStopTyping)
        } else {
            typingManagerRef.current?.cleanup()
            typingManagerRef.current = null
        }

        return () => {
            typingManagerRef.current?.cleanup()
        }
    }, [onStartTyping, onStopTyping, disabled])

    const send = useCallback(() => {
        const validContent = validateMessageContent(text)
        if (!validContent || disabled) return

        typingManagerRef.current?.stopTyping()
        onSend(validContent)
        setText("")
    }, [text, disabled, onSend])

    const handleTextChange = useCallback((value: string) => {
        setText(value)
        typingManagerRef.current?.handleTextChange(value)
    }, [])

    const { user } = useAuth()

    return (
        <div className={className}>
            {replyingTo && onCancelReply && (
                <ReplyPreview
                    message={replyingTo}
                    senderName={getSenderName(replyingTo.sender_id, user, conversation || null)}
                    onCancel={onCancelReply}
                    className="mx-3"
                />
            )}
            <div className="p-3 pb-2">
                <div className="flex items-center gap-2">
                    <Input
                        value={text}
                        onChange={(e) => handleTextChange(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
                        placeholder={disabled ? "Connecting..." : "Type a message"}
                        disabled={disabled}
                        className="bg-background"
                    />
                    <Button size="sm" onClick={send} disabled={disabled || !text.trim()} className="h-9 w-9 p-0">
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
