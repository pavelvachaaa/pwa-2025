"use client"

import { useState, useEffect, useMemo } from "react"
import { Search } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth/context"
import { userApi } from "@/lib/api/user"
import type { User } from "@/types"

interface NewChatModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartChat: (userId: string) => void
}

export function NewChatModal({ open, onOpenChange, onStartChat }: NewChatModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const { user: currentUser } = useAuth()

  // Load users when modal opens
  useEffect(() => {
    if (open) {
      loadUsers()
    }
  }, [open])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const query = searchQuery.trim()
      const response = query
        ? await userApi.searchUsers(query)
        : await userApi.getAllUsers()

      if (response.success && response.data) {
        // Filter out current user
        const filteredUsers = response.data.filter(u => u.id !== currentUser?.id)
        console.log('Loaded users:', filteredUsers) // Debug log
        setUsers(filteredUsers)
      } else {
        console.error('Failed to load users:', response.error) // Debug log
        setUsers([])
      }
    } catch (error) {
      console.error('Failed to load users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    if (!open) return

    const timeoutId = setTimeout(() => {
      loadUsers()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, open])

  // Filter users based on search query (client-side filtering for immediate feedback)
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users
    const query = searchQuery.toLowerCase()
    return users.filter(user =>
      (user.display_name?.toLowerCase() || '').includes(query) ||
      (user.email?.toLowerCase() || '').includes(query)
    )
  }, [users, searchQuery])

  const handleStartChat = async (userId: string) => {
    try {
      onStartChat(userId)
      onOpenChange(false)
      setSearchQuery("")
    } catch (error) {
      console.error('Failed to start chat:', error)
    }
  }

  const getStatusColor = (status: string = 'offline') => {
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

  const getStatusText = (user: User) => {
    if (user.status === "offline" && user.last_seen) {
      const now = new Date()
      const lastSeen = new Date(user.last_seen)
      const diff = now.getTime() - lastSeen.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))

      if (hours < 1) return "Last seen recently"
      if (hours < 24) return `Last seen ${hours}h ago`
      return `Last seen ${days}d ago`
    }
    return (user.status || 'offline').charAt(0).toUpperCase() + (user.status || 'offline').slice(1)
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
              autoFocus
            />
          </div>

          {/* Users List */}
          <div className="max-h-80 overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
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
                        <AvatarImage src={user.avatar_url || "/placeholder.svg"} />
                        <AvatarFallback>{(user.display_name || user.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(user.status)} rounded-full border-2 border-background`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate">{user.display_name || user.email || 'Unknown User'}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {getStatusText(user)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email || 'No email'}</p>
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