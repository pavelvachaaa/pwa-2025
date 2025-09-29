"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface MessageLoadingProps {
  className?: string
  text?: string
}

export function MessageLoading({ className, text = "Loading messages..." }: MessageLoadingProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2 py-4 text-muted-foreground", className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  )
}

interface LoadMoreIndicatorProps {
  isLoading: boolean
  hasMore: boolean
  className?: string
}

export function LoadMoreIndicator({ isLoading, hasMore, className }: LoadMoreIndicatorProps) {
  if (!hasMore && !isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-4 text-muted-foreground", className)}>
        <span className="text-xs">No more messages</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center gap-2 py-4 text-muted-foreground", className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">Loading older messages...</span>
      </div>
    )
  }

  return null
}