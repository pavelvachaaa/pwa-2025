"use client"

import { useState, useEffect } from "react"
import { ChatSidebar } from "./chat-sidebar"
import { ConversationView } from "./conversation-view"
import { ConversationDetails } from "./conversation-details"
import { useChat } from "@/hooks/use-chat"
import { useAuth } from "@/lib/auth/context"
import { useIsMobile } from "@/components/ui/use-mobile"

export function ChatLayout() {
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
    const [showDetails, setShowDetails] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const { user } = useAuth()
    const { conversations, subscribeToConversation, unsubscribeFromConversation, markAsRead, createDirectMessage } =
        useChat() // Added createDirectMessage
    const isMobile = useIsMobile()

    const selectedConversation = selectedConversationId
        ? conversations.find((c) => c.id === selectedConversationId)
        : null

    useEffect(() => {
        if (selectedConversationId) {
            subscribeToConversation(selectedConversationId)
            markAsRead(selectedConversationId)

            return () => {
                unsubscribeFromConversation(selectedConversationId)
            }
        }
    }, [selectedConversationId, subscribeToConversation, unsubscribeFromConversation, markAsRead])

    const handleSelectConversation = (id: string) => {
        setSelectedConversationId(id)
        if (isMobile) {
            setSidebarOpen(false)
        }
    }

    const handleBackToSidebar = () => {
        if (isMobile) {
            setSelectedConversationId(null)
        }
    }

    const handleStartChat = async (userId: string) => {
        const conversationId = await createDirectMessage(userId)
        if (conversationId) {
            handleSelectConversation(conversationId)
        }
    }

    if (!user) return null

    return (
        <div className="flex h-screen bg-background">
            {isMobile ? (
                <>
                    {!selectedConversationId ? (
                        <div className="w-full">
                            <ChatSidebar
                                conversations={conversations}
                                selectedConversationId={selectedConversationId}
                                onSelectConversation={handleSelectConversation}
                                currentUserId={user.id}
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            <ConversationView
                                conversation={selectedConversation!}
                                currentUserId={user.id}
                                onToggleDetails={() => setShowDetails(!showDetails)}
                                showDetails={showDetails}
                                onBack={handleBackToSidebar}
                                onOpenSidebar={undefined}
                                onSelectConversation={handleSelectConversation} // Pass conversation selection handler
                                onStartChat={handleStartChat} // Pass start chat handler
                            />
                        </div>
                    )}
                </>
            ) : (
                <>
                    <div className="w-80 border-r border-border flex-shrink-0">
                        <ChatSidebar
                            conversations={conversations}
                            selectedConversationId={selectedConversationId}
                            onSelectConversation={handleSelectConversation}
                            currentUserId={user.id}
                        />
                    </div>

                    <div className="flex-1 flex flex-col">
                        {selectedConversation ? (
                            <ConversationView
                                conversation={selectedConversation}
                                currentUserId={user.id}
                                onToggleDetails={() => setShowDetails(!showDetails)}
                                showDetails={showDetails}
                                onBack={undefined}
                                onOpenSidebar={undefined}
                                onSelectConversation={handleSelectConversation} // Pass conversation selection handler
                                onStartChat={handleStartChat} // Pass start chat handler
                            />
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <div className="text-6xl mb-4">💬</div>
                                    <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
                                    <p>Choose a conversation from the sidebar to start chatting</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedConversation && showDetails && (
                        <div className="w-80 border-l border-border flex-shrink-0">
                            <ConversationDetails conversation={selectedConversation} currentUserId={user.id} />
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
