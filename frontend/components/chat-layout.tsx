"use client"

import { useState } from "react"
import { ChatSidebar } from "./chat-sidebar"
import { useAuth } from "@/lib/auth/context"

export function ChatLayout() {
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
    const { user } = useAuth()

    const handleSelectConversation = (id: string) => {
        setSelectedConversationId(id)
    }

    if (!user) return null

    return (
        <div className="flex h-screen bg-background">
            <div className="w-80 border-r border-border flex-shrink-0">
                <ChatSidebar
                    selectedConversationId={selectedConversationId}
                    onSelectConversation={handleSelectConversation}
                />
            </div>

            <div className="flex-1 flex flex-col">
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                        <div className="text-6xl mb-4">💬</div>
                        <h2 className="text-xl font-semibold mb-2">PainChat Application</h2>
                        <p>Your conversations will appear in the sidebar</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
