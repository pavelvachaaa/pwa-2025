"use client"

import { useCallback, useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

interface MessageComposerProps {
    onSend: (content: string) => void
    onStartTyping?: () => void
    onStopTyping?: () => void
    disabled?: boolean
    className?: string
}

export function MessageComposer({ onSend, onStartTyping, onStopTyping, disabled, className }: MessageComposerProps) {
    const [text, setText] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const typingTimeoutRef = useRef<NodeJS.Timeout>()

    const send = useCallback(() => {
        const v = text.trim()
        if (!v || disabled) return

        // Stop typing when sending
        if (isTyping) {
            onStopTyping?.()
            setIsTyping(false)
        }

        onSend(v)
        setText("")
    }, [text, disabled, onSend, onStopTyping, isTyping])

    const handleTextChange = useCallback((value: string) => {
        setText(value)

        if (!onStartTyping || !onStopTyping || disabled) return

        // Start typing if not already typing
        if (!isTyping && value.trim()) {
            onStartTyping()
            setIsTyping(true)
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }

        // Set timeout to stop typing after 1 second of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            if (isTyping) {
                onStopTyping()
                setIsTyping(false)
            }
        }, 1000)
    }, [onStartTyping, onStopTyping, disabled, isTyping])

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }
        }
    }, [])

    return (
        <div className={className}>
            <div className="border-t p-3">
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
