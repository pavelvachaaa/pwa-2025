"use client"

import { useEffect, useState } from "react"
import { ChatSidebar } from "./chat-sidebar"
import { ConversationView } from "./conversation/conversation-view"
import { useAuth } from "@/lib/auth/context"
import { useChat } from "@/lib/chat/context"
import { useIsMobile } from "@/hooks/use-mobile"

export function ChatLayout() {
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
    const [showDetails, setShowDetails] = useState(false)
    const [hasNavigatedBack, setHasNavigatedBack] = useState(false)
    const { user } = useAuth()
    const { conversations, loading } = useChat()
    const isMobile = useIsMobile()

    // Restore last selection from sessionStorage
    useEffect(() => {
        const saved = typeof window !== "undefined" ? sessionStorage.getItem("chat:selectedConversationId") : null
        if (saved) setSelectedConversationId(saved)
    }, [])

    // Persist selection
    useEffect(() => {
        if (selectedConversationId) sessionStorage.setItem("chat:selectedConversationId", selectedConversationId)
    }, [selectedConversationId])

    useEffect(() => {
        // Only auto-select first conversation on initial load, not after mobile navigation back
        if (!loading && !hasNavigatedBack && (!selectedConversationId || !conversations.some((c) => c.id === selectedConversationId))) {
            const first = conversations[0]
            setSelectedConversationId(first ? first.id : null)
        }
    }, [loading, conversations, selectedConversationId, hasNavigatedBack])

    const selectedConversation = selectedConversationId
        ? conversations.find((c) => c.id === selectedConversationId) || null
        : null

    const handleSelectConversation = (id: string) => {
        setSelectedConversationId(id)
        setHasNavigatedBack(false) // Reset when user explicitly selects a conversation
        if (isMobile) setShowDetails(false)
    }

    const handleBackToSidebar = () => {
        if (isMobile) {
            setSelectedConversationId(null)
            setHasNavigatedBack(true)
        }
    }

    if (!user) return null

    return (
        <div className="flex h-screen bg-background">
            {isMobile ? (
                !selectedConversation ? (
                    <div className="w-full">
                        <ChatSidebar selectedConversationId={selectedConversationId} onSelectConversation={handleSelectConversation} />
                    </div>
                ) : (
                    <div className="flex flex-1 flex-col">
                        <ConversationView
                            conversation={selectedConversation}
                            currentUserId={user.id}
                            onBack={handleBackToSidebar}
                            onOpenSidebar={undefined}
                            onToggleDetails={() => setShowDetails((v) => !v)}
                            showDetails={showDetails}
                        />
                    </div>
                )
            ) : (
                <>
                    <div className="flex-shrink-0 w-80 border-r border-border">
                        <ChatSidebar selectedConversationId={selectedConversationId} onSelectConversation={handleSelectConversation} />
                    </div>

                    <div className="flex flex-1 flex-col">
                        {selectedConversation ? (
                            <ConversationView
                                conversation={selectedConversation}
                                currentUserId={user.id}
                                onBack={undefined}
                                onOpenSidebar={undefined}
                                onToggleDetails={() => setShowDetails((v) => !v)}
                                showDetails={showDetails}
                            />
                        ) : (
                            <div className="flex flex-1 items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <div className="mb-4 text-6xl">💬</div>
                                    <h2 className="mb-2 text-xl font-semibold">Select a conversation</h2>
                                    <p>Choose a conversation from the sidebar to start chatting</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedConversation && showDetails && (
                        <div className="flex-shrink-0 w-80 border-l border-border">{/* Optional details panel */}</div>
                    )}
                </>
            )}
        </div>
    )
}
