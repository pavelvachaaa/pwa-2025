"use client"

import { useState } from "react"
import { Search, X, Users, Camera } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { mockUsers } from "@/lib/mock-data"
import { useAuth } from "@/hooks/use-auth"

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
  const { user } = useAuth()

  // Filter out current user and search by name or email
  const filteredUsers = mockUsers.filter((u) => {
    if (u.id === user?.id) return false
    const query = searchQuery.toLowerCase()
    return u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)
  })

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
      .map((id) => mockUsers.find((u) => u.id === id)?.name)
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
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No users found" : "No users available"}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent">
                    <Checkbox
                      id={user.id}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => handleUserToggle(user.id)}
                    />
                    <Label htmlFor={user.id} className="flex items-center gap-3 flex-1 cursor-pointer">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <Badge variant={user.status === "online" ? "default" : "secondary"} className="text-xs">
                        {user.status}
                      </Badge>
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
                  const user = mockUsers.find((u) => u.id === userId)
                  if (!user) return null

                  return (
                    <div key={userId} className="flex items-center gap-3 p-2 bg-accent rounded-lg">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{user.name}</span>
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
