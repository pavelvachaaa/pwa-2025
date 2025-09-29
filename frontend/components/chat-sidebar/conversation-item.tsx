"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatLastMessageTime } from "@/utils/time"
import type { Conversation } from "@/types"

interface ConversationItemProps {
  conversation: Conversation
  isSelected: boolean
  isTyping: boolean
  userStatus: string
  onSelect: (id: string) => void
}

export function ConversationItem({
  conversation,
  isSelected,
  isTyping,
  userStatus,
  onSelect,
}: ConversationItemProps) {
  const other = conversation.other_participant
  const displayName = other?.display_name || "Unknown User"
  const avatarUrl = other?.avatar_url || "/placeholder.svg"

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500"
      case "away": return "bg-yellow-500"
      default: return "bg-gray-500"
    }
  }

  const getLastMessagePreview = () => {
    return conversation.last_message?.content || "No messages yet"
  }

  return (
    <button
      onClick={() => onSelect(conversation.id)}
      className={cn(
        "w-full rounded-lg p-3 text-left transition-colors hover:bg-sidebar-accent",
        isSelected && "bg-sidebar-accent"
      )}
      aria-current={isSelected ? "true" : undefined}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-sidebar",
              getStatusColor(userStatus)
            )}
            aria-label={`Status: ${userStatus}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="truncate font-medium text-sidebar-foreground">
              {displayName}
            </h3>
            {conversation.last_message && (
              <span className="text-xs text-sidebar-foreground/60">
                {formatLastMessageTime(conversation.last_message.created_at)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm text-sidebar-foreground/70">
              {getLastMessagePreview()}
            </p>
            {!!conversation.unread_count && conversation.unread_count > 0 && (
              <Badge
                variant="default"
                className="ml-2 h-5 min-w-5 text-xs bg-primary"
              >
                {conversation.unread_count}
              </Badge>
            )}
          </div>

          {isTyping && (
            <div className="mt-1 flex items-center gap-1">
              <div className="flex gap-1">
                <span className="h-1 w-1 animate-bounce rounded-full bg-primary" />
                <span
                  className="h-1 w-1 animate-bounce rounded-full bg-primary"
                  style={{ animationDelay: "0.1s" }}
                />
                <span
                  className="h-1 w-1 animate-bounce rounded-full bg-primary"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
              <span className="text-xs text-primary">typing…</span>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}