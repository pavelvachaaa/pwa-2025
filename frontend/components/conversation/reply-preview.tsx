"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Message } from "@/types"
import { cn } from "@/lib/utils"
import { REPLY_PREVIEW_MAX_LENGTH } from "@/lib/utils/chat-constants"
import { truncateText } from "@/lib/utils/ui-utils"

interface ReplyPreviewProps {
  message: Message
  senderName?: string
  onCancel: () => void
  className?: string
}

export function ReplyPreview({ message, senderName, onCancel, className }: ReplyPreviewProps) {
  const truncatedContent = truncateText(message.content, REPLY_PREVIEW_MAX_LENGTH)

  return (
    <div className={cn("flex items-center gap-2 p-2 bg-muted/50 border-l-2 border-primary/50 text-sm", className)}>
      <div className="flex-1 min-w-0">
        <div className="text-primary font-medium text-xs">
          Replying to {senderName || "Someone"}
        </div>
        <div className="text-muted-foreground truncate">
          {truncatedContent}
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
        onClick={onCancel}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}