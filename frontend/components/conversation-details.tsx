"use client"

import { Users, ImageIcon, File, Settings, Bell, Palette, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { getConversationName, getConversationAvatar, getUserById, type Conversation } from "@/lib/mock-data"

interface ConversationDetailsProps {
  conversation: Conversation
  currentUserId: string
}

export function ConversationDetails({ conversation, currentUserId }: ConversationDetailsProps) {
  const name = getConversationName(conversation, currentUserId)
  const avatar = getConversationAvatar(conversation, currentUserId)

  const participants = conversation.participants.map((id) => getUserById(id)).filter(Boolean)

  const themeColors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-pink-500", "bg-orange-500", "bg-red-500"]

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-6 text-center border-b border-border">
        <Avatar className="h-20 w-20 mx-auto mb-4">
          <AvatarImage src={avatar || "/placeholder.svg"} />
          <AvatarFallback className="text-2xl">{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-semibold text-card-foreground mb-1">{name}</h2>
        <p className="text-sm text-muted-foreground">
          {conversation.type === "group" ? `${participants.length} members` : "Direct message"}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Participants */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-card-foreground">
              {conversation.type === "group" ? "Members" : "Participant"}
            </span>
          </div>

          <div className="space-y-2">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={participant.avatar || "/placeholder.svg"} />
                    <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div
                    className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-card ${
                      participant.status === "online"
                        ? "bg-green-500"
                        : participant.status === "away"
                          ? "bg-yellow-500"
                          : "bg-gray-400"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-card-foreground">{participant.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{participant.status}</p>
                </div>
              </div>
            ))}
          </div>

          {conversation.type === "group" && (
            <Button variant="outline" className="w-full mt-3 bg-transparent">
              Add Member
            </Button>
          )}
        </div>

        <Separator />

        {/* Shared Media */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-card-foreground">Shared Media</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-square bg-muted rounded-lg flex items-center justify-center hover:bg-muted/80 cursor-pointer"
              >
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full bg-transparent">
            View All Media
          </Button>
        </div>

        <Separator />

        {/* Theme Colors */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-card-foreground">Theme Color</span>
          </div>

          <div className="flex gap-2">
            {themeColors.map((color, index) => (
              <button
                key={index}
                className={`w-8 h-8 rounded-full ${color} hover:scale-110 transition-transform ${
                  index === 0 ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""
                }`}
              />
            ))}
          </div>
        </div>

        <Separator />

        {/* Settings */}
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-card-foreground">Settings</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-card-foreground">Notifications</span>
            </div>
            <Switch defaultChecked />
          </div>

          <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
            <File className="h-4 w-4" />
            Search in Conversation
          </Button>

          {conversation.type === "group" && (
            <Button variant="destructive" className="w-full justify-start gap-2">
              <LogOut className="h-4 w-4" />
              Leave Group
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
