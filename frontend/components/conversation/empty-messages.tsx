"use client"

interface EmptyMessagesProps {
  isLoading: boolean
}

export function EmptyMessages({ isLoading }: EmptyMessagesProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <div className="text-center">
          <div className="mb-2">Loading messages...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center p-8 text-muted-foreground">
      <div className="text-center">
        <div className="mb-2">No messages yet</div>
        <div className="text-sm">Start a conversation!</div>
      </div>
    </div>
  )
}