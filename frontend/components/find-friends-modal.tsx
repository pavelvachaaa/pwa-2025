"use client"

import { useState } from "react"
import { Search, UserPlus, Mail, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth/context"
import { chatApi } from "@/lib/api/chat"
import type { User } from "@/types"

interface FindFriendsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartChat: (userId: string) => void
}

export function FindFriendsModal({ open, onOpenChange, onStartChat }: FindFriendsModalProps) {
  const [emailSearch, setEmailSearch] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const { user } = useAuth()

  const handleEmailSearch = async () => {
    if (!emailSearch.trim()) return

    setIsSearching(true)
    try {
      const response = await chatApi.searchUsers(emailSearch)
      if (response.success && response.data) {
        const results = response.data.filter((u) => u.id !== user?.id)
        setSearchResults(results)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Error searching users:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleStartChat = (userId: string) => {
    onStartChat(userId)
    onOpenChange(false)
    setEmailSearch("")
    setSearchResults([])
  }

  const handleClose = () => {
    onOpenChange(false)
    setEmailSearch("")
    setSearchResults([])
  }

  const UserCard = ({ user, showAddButton = true }: { user: User; showAddButton?: boolean }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
      <Avatar className="h-10 w-10">
        <AvatarImage src={user.avatar || "/placeholder.svg"} />
        <AvatarFallback>{user.name?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{user.name || user.email}</h3>
        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
      </div>

      {showAddButton && (
        <Button size="sm" onClick={() => handleStartChat(user.id)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Chat
        </Button>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Find Friends
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Email Search */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Search by Email</h3>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter email address..."
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleEmailSearch} disabled={!emailSearch.trim() || isSearching}>
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Searching...
                  </>
                ) : (
                  "Search"
                )}
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Search Results</h4>
                {searchResults.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            )}

            {emailSearch && searchResults.length === 0 && !isSearching && (
              <div className="text-center py-4 text-muted-foreground">
                <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No users found with that email</p>
              </div>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
