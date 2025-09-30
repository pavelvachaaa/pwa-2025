"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { REACTION_EMOJIS } from "@/lib/utils/chat-constants"
import type { Message } from "@/types"

interface ReactionPickerOverlayProps {
  isVisible: boolean
  position: { x: number; y: number }
  onReactionSelect: (emoji: string) => void
  onClose: () => void
  message?: Message
  userId?: string
  className?: string
}

export function ReactionPickerOverlay({
  isVisible,
  position,
  onReactionSelect,
  onClose,
  message,
  userId,
  className
}: ReactionPickerOverlayProps) {
  const [adjustedPosition, setAdjustedPosition] = useState(position)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isVisible) return

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isVisible, onClose])

  useEffect(() => {
    if (!isVisible || !overlayRef.current) return

    // Adjust position to keep picker within viewport
    const rect = overlayRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    let adjustedX = position.x
    let adjustedY = position.y

    // Prevent going off right edge
    if (adjustedX + rect.width > viewportWidth - 16) {
      adjustedX = viewportWidth - rect.width - 16
    }

    // Prevent going off left edge
    if (adjustedX < 16) {
      adjustedX = 16
    }

    // Prevent going off bottom edge
    if (adjustedY + rect.height > viewportHeight - 16) {
      adjustedY = position.y - rect.height - 16
    }

    // Prevent going off top edge
    if (adjustedY < 16) {
      adjustedY = 16
    }

    setAdjustedPosition({ x: adjustedX, y: adjustedY })
  }, [isVisible, position])

  if (!isVisible) return null

  const content = (
    <div
      ref={overlayRef}
      className={cn(
        "fixed z-50 flex items-center gap-2 p-3 bg-background/95 backdrop-blur-sm border rounded-2xl shadow-lg reaction-picker",
        "animate-in fade-in-0 zoom-in-95 duration-200",
        className
      )}
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {REACTION_EMOJIS.map((emoji) => {
        // Check if user has already reacted with this emoji
        const hasReacted = message && userId && 
          message.reactions?.some(r => r.emoji === emoji && r.userIds.includes(userId))
        
        return (
          <button
            key={emoji}
            onClick={() => {
              onReactionSelect(emoji)
              onClose()
            }}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl touch-target",
              "text-xl transition-all duration-200",
              "hover:bg-accent hover:scale-110 active:scale-95",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              // Show selected state
              hasReacted && "bg-primary/20 border-2 border-primary/40",
              // Mobile optimizations
              "md:h-10 md:w-10 md:text-lg"
            )}
          >
            {emoji}
          </button>
        )
      })}
    </div>
  )

  return createPortal(content, document.body)
}