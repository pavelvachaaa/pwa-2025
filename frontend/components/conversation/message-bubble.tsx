"use client"

import { useState } from "react"
import type { Message } from "@/types"
import { useChat } from "@/lib/chat/context"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface MessageBubbleProps {
    message: Message
    isOwn?: boolean
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
    const { editMessage, deleteMessage } = useChat()
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState(message.content)

    const ts = new Date(message.created_at || (message as any).timestamp || Date.now())
    const time = ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    const commit = async () => {
        const v = value.trim()
        if (v && v !== message.content) {
            try { await editMessage(message.id, v) } catch { /* noop */ }
        }
        setEditing(false)
    }

    return (
        <div className={cn("group", isOwn ? "flex justify-end" : "")}>
            <div className={cn("max-w-xs rounded-2xl px-4 py-2 text-sm", isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-muted-foreground rounded-bl-md")}>
                {editing ? (
                    <Input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onBlur={commit}
                        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setValue(message.content) } }}
                        className="h-7 border-none bg-transparent p-0 text-sm focus-visible:ring-0"
                        autoFocus
                    />
                ) : (
                    <span>{message.content}</span>
                )}
                {message.is_edited && !editing && <span className="ml-2 opacity-70">(edited)</span>}
            </div>

            {/* hover actions */}
            {isOwn && !editing && (
                <div className={cn("ml-1 inline-flex items-center opacity-0 transition-opacity group-hover:opacity-100", isOwn ? "order-first -ml-20" : "")}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                <MoreHorizontal className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isOwn ? "end" : "start"}>
                            <DropdownMenuItem onClick={() => setEditing(true)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteMessage(message.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}

            <div className={cn("mt-1 text-xs text-muted-foreground", isOwn ? "text-right" : "")}>{time}</div>
        </div>
    )
}
