"use client"

import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

interface MessageComposerProps {
    onSend: (content: string) => void
    disabled?: boolean
    className?: string
}

export function MessageComposer({ onSend, disabled, className }: MessageComposerProps) {
    const [text, setText] = useState("")
    const send = useCallback(() => {
        const v = text.trim()
        if (!v || disabled) return
        onSend(v)
        setText("")
    }, [text, disabled, onSend])

    return (
        <div className={className}>
            <div className="border-t p-3">
                <div className="flex items-center gap-2">
                    <Input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
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
