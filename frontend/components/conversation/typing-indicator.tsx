"use client"

interface TypingIndicatorProps {
  typingUserIds: string[]
}

export function TypingIndicator({ typingUserIds }: TypingIndicatorProps) {
  if (typingUserIds.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground bg-muted/30 rounded-lg mx-2 my-1">
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
          style={{ animationDelay: "0.1s" }}
        />
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
          style={{ animationDelay: "0.2s" }}
        />
      </div>
      <span>
        {typingUserIds.length === 1
          ? "Someone is typing..."
          : `${typingUserIds.length} people are typing...`}
      </span>
    </div>
  )
}