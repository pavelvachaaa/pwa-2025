"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Smile, Paperclip, Send, X, Reply } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileUploadZone } from "./file-upload-zone"
import { MediaMessage } from "./media-message"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getUserById, type Message } from "@/lib/mock-data"
import { useChat } from "@/hooks/use-chat"
import type { UploadedFile } from "@/lib/upload-utils"

interface MessageComposerProps {
  conversationId: string
  onSendMessage: (content: string, attachments?: UploadedFile[], replyTo?: string) => void
  onStartTyping: () => void
  onStopTyping: () => void
  isConnected: boolean
  className?: string
  replyingTo?: Message | null
  onCancelReply?: () => void
}

export function MessageComposer({
  conversationId,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  isConnected,
  className,
  replyingTo,
  onCancelReply,
}: MessageComposerProps) {
  const { getDraft, saveDraft } = useChat()
  const [message, setMessage] = useState("")
  const [attachments, setAttachments] = useState<UploadedFile[]>([])
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const draftTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const loadDraft = async () => {
      const draft = await getDraft(conversationId)
      setMessage(draft)
    }
    loadDraft()
  }, [conversationId, getDraft])

  useEffect(() => {
    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current)
    }

    draftTimeoutRef.current = setTimeout(() => {
      saveDraft(conversationId, message)
    }, 500)

    return () => {
      if (draftTimeoutRef.current) {
        clearTimeout(draftTimeoutRef.current)
      }
    }
  }, [message, conversationId, saveDraft])

  const handleSendMessage = useCallback(() => {
    if ((!message.trim() && attachments.length === 0) || !isConnected) return

    onSendMessage(message.trim(), attachments.length > 0 ? attachments : undefined, replyingTo?.id)
    setMessage("")
    setAttachments([])
    onCancelReply?.()

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    onStopTyping()
  }, [message, attachments, isConnected, onSendMessage, onStopTyping, replyingTo, onCancelReply])

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      } else if (e.key === "Escape" && replyingTo) {
        onCancelReply?.()
      }
    },
    [handleSendMessage, replyingTo, onCancelReply],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMessage(e.target.value)

      if (!isConnected) return

      // Start typing if not already typing
      if (e.target.value.trim()) {
        onStartTyping()
      }

      // Reset typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onStopTyping()
      }, 3000)

      // Stop typing if input is empty
      if (!e.target.value.trim()) {
        onStopTyping()
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = null
        }
      }
    },
    [isConnected, onStartTyping, onStopTyping],
  )

  const handleFileUploaded = useCallback((file: UploadedFile) => {
    setAttachments((prev) => [...prev, file])
    setShowUploadDialog(false)
  }, [])

  const removeAttachment = useCallback((fileId: string) => {
    setAttachments((prev) => prev.filter((file) => file.id !== fileId))
  }, [])

  const replyToSender = replyingTo ? getUserById(replyingTo.senderId) : null

  return (
    <div className={className}>
      {replyingTo && (
        <div className="p-3 border-t border-border bg-muted/30 flex items-center gap-3">
          <Reply className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage src={replyToSender?.avatar || "/placeholder.svg"} />
            <AvatarFallback className="text-xs">{replyToSender?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-foreground">{replyToSender?.name}</div>
            <div className="text-xs text-muted-foreground truncate">{replyingTo.content}</div>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={onCancelReply}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file) => (
              <div key={file.id} className="relative">
                <MediaMessage
                  filename={file.filename}
                  url={file.url}
                  mimeType={file.mimeType}
                  size={file.size}
                  thumbnailUrl={file.thumbnailUrl}
                  isOwn={true}
                  className="max-w-32"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                  onClick={() => removeAttachment(file.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          {/* File Upload Button */}
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 flex-shrink-0">
                <Paperclip className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Files</DialogTitle>
              </DialogHeader>
              <FileUploadZone onFileUploaded={handleFileUploaded} multiple={true} className="mt-4" />
            </DialogContent>
          </Dialog>

          {/* Message Input */}
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder={
                replyingTo ? `Reply to ${replyToSender?.name}...` : isConnected ? "Type a message..." : "Connecting..."
              }
              className="pr-10 bg-background"
              disabled={!isConnected}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={(!message.trim() && attachments.length === 0) || !isConnected}
            size="sm"
            className="h-9 w-9 p-0 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
