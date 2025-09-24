"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { mockUsers, type MockUser } from "@/lib/mock-data"
import { useAuth } from "@/hooks/use-auth"

interface NewChatModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartChat: (userId: string) => void
}

export function NewChatModal({ open, onOpenChange, onStartChat }: NewChatModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const { user } = useAuth()

  // Filter out current user and search by name or email
  const filteredUsers = mockUsers.filter((u) => {
    if (u.id === user?.id) return false
    const query = searchQuery.toLowerCase()
    return u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)
  })

  const handleStartChat = (userId: string) => {
    onStartChat(userId)
    onOpenChange(false)
    setSearchQuery("")
  }

  const getStatusColor = (status: MockUser["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "away":
        return "bg-yellow-500"
      case "offline":
        return "bg-gray-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (user: MockUser) => {
    if (user.status === "offline" && user.lastSeen) {
      const now = new Date()
      const diff = now.getTime() - user.lastSeen.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))

      if (hours < 1) return "Last seen recently"
      if (hours < 24) return `Last seen ${hours}h ago`
      return `Last seen ${days}d ago`
    }
    return user.status.charAt(0).toUpperCase() + user.status.slice(1)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Chat</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Users List */}
          <div className="max-h-80 overflow-y-auto space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No users found" : "No users available"}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleStartChat(user.id)}
                  className="w-full p-3 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(user.status)} rounded-full border-2 border-background`}
                      ></div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate">{user.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {getStatusText(user)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
