"use client"

import { useState, useEffect } from "react"
import { Search, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth/context"
import { chatApi } from "@/lib/api/chat"
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
  const { user } = useAuth()

  useEffect(() => {
    if (open) {
      if (searchQuery.trim()) {
        searchUsers(searchQuery)
      } else {
        loadAllUsers()
      }
    }
  }, [open, searchQuery])

  const loadAllUsers = async () => {
    setLoading(true)
    try {
      const response = await chatApi.getAllUsers()
      if (response.success && response.data) {
        setUsers(response.data)
      } else {
        setUsers([])
      }
    } catch (error) {
      console.error('Error loading users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async (query: string) => {
    setLoading(true)
    try {
      const response = await chatApi.searchUsers(query)
      if (response.success && response.data) {
        // Filter out current user
        const filteredUsers = response.data.filter((u) => u.id !== user?.id)
        setUsers(filteredUsers)
      } else {
        setUsers([])
      }
    } catch (error) {
      console.error('Error searching users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleStartChat = (userId: string) => {
    onStartChat(userId)
    onOpenChange(false)
    setSearchQuery("")
    setUsers([])
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
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-muted-foreground">Searching...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No users found" : "No other users available"}
              </div>
            ) : (
              users.map((foundUser) => (
                <button
                  key={foundUser.id}
                  onClick={() => handleStartChat(foundUser.id)}
                  className="w-full p-3 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={foundUser.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{foundUser.name?.charAt(0) || foundUser.email?.charAt(0)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{foundUser.name || foundUser.email}</h3>
                      <p className="text-sm text-muted-foreground truncate">{foundUser.email}</p>
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
