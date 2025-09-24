"use client"

import { useState } from "react"
import { Search, UserPlus, Mail, Users } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { mockUsers, type MockUser } from "@/lib/mock-data"
import { useAuth } from "@/hooks/use-auth"

interface FindFriendsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartChat: (userId: string) => void
}

export function FindFriendsModal({ open, onOpenChange, onStartChat }: FindFriendsModalProps) {
  const [emailSearch, setEmailSearch] = useState("")
  const [searchResults, setSearchResults] = useState<MockUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const { user } = useAuth()

  // Get suggested friends (users not currently chatting with)
  const suggestedFriends = mockUsers.filter((u) => u.id !== user?.id).slice(0, 4)

  const handleEmailSearch = async () => {
    if (!emailSearch.trim()) return

    setIsSearching(true)

    // Simulate API search delay
    setTimeout(() => {
      const results = mockUsers.filter(
        (u) => u.id !== user?.id && u.email.toLowerCase().includes(emailSearch.toLowerCase()),
      )
      setSearchResults(results)
      setIsSearching(false)
    }, 500)
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

  const UserCard = ({ user, showAddButton = true }: { user: MockUser; showAddButton?: boolean }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatar || "/placeholder.svg"} />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div
          className={`absolute -bottom-1 -right-1 w-3 h-3 ${
            user.status === "online" ? "bg-green-500" : user.status === "away" ? "bg-yellow-500" : "bg-gray-500"
          } rounded-full border-2 border-background`}
        ></div>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{user.name}</h3>
        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        <Badge variant="secondary" className="text-xs mt-1">
          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
        </Badge>
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
                {isSearching ? "Searching..." : "Search"}
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

          <Separator />

          {/* Suggested Friends */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Suggested Friends</h3>
            </div>

            <div className="space-y-2">
              {suggestedFriends.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>

            {suggestedFriends.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <p>No suggestions available</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
