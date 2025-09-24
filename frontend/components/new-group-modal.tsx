"use client"

import { useState, useEffect } from "react"
import { Search, X, Users, Camera, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth/context"
import { chatApi } from "@/lib/api/chat"
import type { User } from "@/types"

interface NewGroupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateGroup: (name: string, participants: string[], avatar?: string) => void
}

export function NewGroupModal({ open, onOpenChange, onCreateGroup }: NewGroupModalProps) {
  const [step, setStep] = useState<"participants" | "details">("participants")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [groupName, setGroupName] = useState("")
  const [groupAvatar, setGroupAvatar] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers(searchQuery)
    } else {
      setUsers([])
    }
  }, [searchQuery])

  const searchUsers = async (query: string) => {
    setLoading(true)
    try {
      const response = await chatApi.searchUsers(query)
      if (response.success && response.data) {
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

  const handleUserToggle = (userId: string) => {
    setSelectedUsers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const handleCreateGroup = () => {
    if (groupName.trim() && selectedUsers.length > 0) {
      onCreateGroup(groupName.trim(), selectedUsers, groupAvatar || undefined)
      onOpenChange(false)
      // Reset form
      setStep("participants")
      setSelectedUsers([])
      setGroupName("")
      setGroupAvatar("")
      setSearchQuery("")
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset form
    setStep("participants")
    setSelectedUsers([])
    setGroupName("")
    setGroupAvatar("")
    setSearchQuery("")
  }

  const getSelectedUserNames = () => {
    return selectedUsers
      .map((id) => users.find((u) => u.id === id)?.name || users.find((u) => u.id === id)?.email)
      .filter(Boolean)
      .join(", ")
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{step === "participants" ? "Select Participants" : "Group Details"}</DialogTitle>
        </DialogHeader>

        {step === "participants" ? (
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Selected Users Summary */}
            {selectedUsers.length > 0 && (
              <div className="p-3 bg-accent rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">{selectedUsers.length} selected</span>
                </div>
                <p className="text-sm text-muted-foreground">{getSelectedUserNames()}</p>
              </div>
            )}

            {/* Users List */}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2 text-muted-foreground">Searching...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No users found" : "Start typing to search for users..."}
                </div>
              ) : (
                users.map((foundUser) => (
                  <div key={foundUser.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent">
                    <Checkbox
                      id={foundUser.id}
                      checked={selectedUsers.includes(foundUser.id)}
                      onCheckedChange={() => handleUserToggle(foundUser.id)}
                    />
                    <Label htmlFor={foundUser.id} className="flex items-center gap-3 flex-1 cursor-pointer">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={foundUser.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{foundUser.name?.charAt(0) || foundUser.email?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{foundUser.name || foundUser.email}</p>
                        <p className="text-sm text-muted-foreground truncate">{foundUser.email}</p>
                      </div>
                    </Label>
                  </div>
                ))
              )}
            </div>

            {/* Next Button */}
            <Button onClick={() => setStep("details")} disabled={selectedUsers.length === 0} className="w-full">
              Next ({selectedUsers.length} selected)
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Group Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={groupAvatar || "/diverse-group-meeting.png"} />
                  <AvatarFallback>
                    <Users className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 h-8 w-8 p-0 rounded-full bg-transparent"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Group Photo</h3>
                <p className="text-sm text-muted-foreground">Add a photo for your group</p>
              </div>
            </div>

            {/* Group Name */}
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>

            {/* Selected Participants */}
            <div className="space-y-2">
              <Label>Participants ({selectedUsers.length})</Label>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {selectedUsers.map((userId) => {
                  const selectedUser = users.find((u) => u.id === userId)
                  if (!selectedUser) return null

                  return (
                    <div key={userId} className="flex items-center gap-3 p-2 bg-accent rounded-lg">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={selectedUser.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{selectedUser.name?.charAt(0) || selectedUser.email?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{selectedUser.name || selectedUser.email}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 ml-auto"
                        onClick={() => handleUserToggle(userId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("participants")} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedUsers.length === 0}
                className="flex-1"
              >
                Create Group
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
