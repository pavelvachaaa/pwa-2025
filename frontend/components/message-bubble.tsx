"use client"

import type React from "react"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { getUserById, type Message } from "@/lib/mock-data"
import { MediaMessage } from "./media-message"
import { useChat } from "@/hooks/use-chat"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { MoreHorizontal, Reply, Edit, Trash2, Pin, PinOff, Smile } from "lucide-react"

interface MessageBubbleProps {
  message: Message & { attachments?: any[] }
  isOwn: boolean
  showAvatar: boolean
  showTimestamp: boolean
  onReply?: (message: Message) => void
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"]

export function MessageBubble({ message, isOwn, showAvatar, showTimestamp, onReply }: MessageBubbleProps) {
  const { user } = useAuth()
  const { addReaction, removeReaction, editMessage, deleteMessage, pinMessage, unpinMessage, messages } = useChat()
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [showReactions, setShowReactions] = useState(false)

  const sender = getUserById(message.senderId)
  const replyToMessage = message.replyTo
    ? Object.values(messages)
        .flat()
        .find((m) => m.id === message.replyTo)
    : null
  const replyToSender = replyToMessage ? getUserById(replyToMessage.senderId) : null

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const handleReactionClick = (emoji: string) => {
    if (!user) return

    const existingReaction = message.reactions?.find((r) => r.emoji === emoji)
    const hasUserReacted = existingReaction?.userIds.includes(user.id)

    if (hasUserReacted) {
      removeReaction(message.id, emoji)
    } else {
      addReaction(message.id, emoji)
    }
    setShowReactions(false)
  }

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      editMessage(message.id, editContent.trim())
    }
    setIsEditing(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleEdit()
    } else if (e.key === "Escape") {
      setIsEditing(false)
      setEditContent(message.content)
    }
  }

  return (
    <div className={cn("group relative", isOwn && "flex justify-end")}>
      {message.isPinned && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1 px-3">
          <Pin className="h-3 w-3" />
          <span>Pinned message</span>
        </div>
      )}

      <div className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
        {/* Avatar */}
        <div className="flex-shrink-0">
          {showAvatar && !isOwn ? (
            <Avatar className="h-8 w-8">
              <AvatarImage src={sender?.avatar || "/placeholder.svg"} />
              <AvatarFallback>{sender?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-8" />
          )}
        </div>

        {/* Message Content */}
        <div className={cn("flex flex-col max-w-xs lg:max-w-md", isOwn && "items-end")}>
          {/* Sender Name */}
          {showAvatar && !isOwn && <span className="text-xs text-muted-foreground mb-1 px-3">{sender?.name}</span>}

          {replyToMessage && (
            <div
              className={cn(
                "text-xs text-muted-foreground mb-2 px-3 py-1 rounded border-l-2 border-primary/50 bg-muted/50",
                isOwn && "text-right",
              )}
            >
              <div className="font-medium">{replyToSender?.name}</div>
              <div className="truncate">{replyToMessage.content}</div>
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-2 mb-2">
              {message.attachments.map((attachment, index) => (
                <MediaMessage
                  key={index}
                  filename={attachment.filename}
                  url={attachment.url}
                  mimeType={attachment.mimeType}
                  size={attachment.size}
                  thumbnailUrl={attachment.thumbnailUrl}
                  isOwn={isOwn}
                />
              ))}
            </div>
          )}

          {/* Text Message */}
          {message.content && (
            <div className="relative">
              <div
                className={cn(
                  "px-4 py-2 rounded-2xl break-words relative",
                  isOwn
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-muted-foreground rounded-bl-md",
                )}
              >
                {isEditing ? (
                  <Input
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={handleKeyPress}
                    onBlur={handleEdit}
                    className="text-sm bg-transparent border-none p-0 h-auto focus-visible:ring-0"
                    autoFocus
                  />
                ) : (
                  <p className="text-sm leading-relaxed">{message.content}</p>
                )}

                {message.edited && !isEditing && <span className="text-xs opacity-70 ml-2">(edited)</span>}
              </div>

              <div
                className={cn(
                  "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1",
                  isOwn ? "-left-20" : "-right-20",
                )}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 bg-background border shadow-sm"
                  onClick={() => setShowReactions(!showReactions)}
                >
                  <Smile className="h-3 w-3" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 bg-background border shadow-sm">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isOwn ? "end" : "start"}>
                    <DropdownMenuItem onClick={() => onReply?.(message)}>
                      <Reply className="h-4 w-4 mr-2" />
                      Reply
                    </DropdownMenuItem>
                    {isOwn && (
                      <>
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteMessage(message.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={() => (message.isPinned ? unpinMessage(message.id) : pinMessage(message.id))}
                    >
                      {message.isPinned ? (
                        <>
                          <PinOff className="h-4 w-4 mr-2" />
                          Unpin
                        </>
                      ) : (
                        <>
                          <Pin className="h-4 w-4 mr-2" />
                          Pin
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {showReactions && (
                <div
                  className={cn(
                    "absolute top-full mt-1 bg-background border rounded-lg shadow-lg p-2 flex gap-1 z-10",
                    isOwn ? "right-0" : "left-0",
                  )}
                >
                  {REACTION_EMOJIS.map((emoji) => (
                    <Button
                      key={emoji}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-muted"
                      onClick={() => handleReactionClick(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {message.reactions && message.reactions.length > 0 && (
            <div className={cn("flex flex-wrap gap-1 mt-1", isOwn && "justify-end")}>
              {message.reactions.map((reaction) => (
                <Button
                  key={reaction.emoji}
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-6 px-2 py-0 text-xs rounded-full border",
                    reaction.userIds.includes(user?.id || "") ? "bg-primary/10 border-primary/20" : "bg-muted/50",
                  )}
                  onClick={() => handleReactionClick(reaction.emoji)}
                >
                  {reaction.emoji} {reaction.userIds.length}
                </Button>
              ))}
            </div>
          )}

          {/* Timestamp */}
          {showTimestamp && (
            <span className="text-xs text-muted-foreground mt-1 px-3">{formatTime(message.timestamp)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
