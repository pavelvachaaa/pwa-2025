"use client"

import type { Message } from "@/types"
import { cn } from "@/lib/utils"
import { REPLY_INDICATOR_MAX_LENGTH } from "@/lib/utils/chat-constants"
import { truncateText } from "@/lib/utils/ui-utils"

interface ReplyIndicatorProps {
  replyToMessage: Message
  senderName?: string
  className?: string
}

export function ReplyIndicator({ replyToMessage, senderName, className }: ReplyIndicatorProps) {
  const truncatedContent = truncateText(replyToMessage.content, REPLY_INDICATOR_MAX_LENGTH)

  return (
    <div className={cn("border-l-2 border-primary/30 pl-2 py-1 mb-1 text-xs min-w-0", className)}>
      <div className="text-primary/70 font-medium truncate">
        {senderName || "Someone"}
      </div>
      <div className="text-muted-foreground/80 truncate">
        {truncatedContent}
      </div>
    </div>
  )
}