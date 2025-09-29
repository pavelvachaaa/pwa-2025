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

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
            typingTimeoutRef.current = undefined
        }

        if (value.trim() && !isTyping) {
            onStartTyping()
            setIsTyping(true)
        }

        if (value.trim()) {
            typingTimeoutRef.current = setTimeout(() => {
                onStopTyping()
                setIsTyping(false)
            }, 1000)
        } else {
            if (isTyping) {
                onStopTyping()
                setIsTyping(false)
            }
        }
    }, [onStartTyping, onStopTyping, disabled, isTyping])

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }
            if (isTyping && onStopTyping) {
                onStopTyping()
            }
        }
    }, [isTyping, onStopTyping])

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
