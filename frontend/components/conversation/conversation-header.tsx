"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, PanelLeftOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/types"

interface ConversationHeaderProps {
  conversation: Conversation
  presenceText: string
  isOnline: boolean
  onBack?: () => void
  onOpenSidebar?: () => void
}

export function ConversationHeader({
  conversation,
  presenceText,
  isOnline,
  onBack,
  onOpenSidebar,
}: ConversationHeaderProps) {
  const title = conversation.other_participant?.display_name ?? "Direct message"

  return (
    <div className="flex-shrink-0 flex items-center gap-2 border-b p-3 bg-background">
      {onBack ? (
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      ) : onOpenSidebar ? (
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onOpenSidebar}>
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      ) : null}

      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">{presenceText}</p>
          <div className="flex items-center gap-1">
            <span className={cn(
              "h-2 w-2 rounded-full",
              isOnline ? "bg-green-500" : "bg-gray-400"
            )} />
            <span className="text-xs text-muted-foreground">
              {isOnline ? "Connected" : "Offline"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}