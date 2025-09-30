"use client"

import { ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ScrollToBottomProps {
  isVisible: boolean
  onClick: () => void
  className?: string
}

export function ScrollToBottom({ isVisible, onClick, className }: ScrollToBottomProps) {
  if (!isVisible) return null

  return (
    <div 
      className={cn(
        "absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full mb-2 z-50",
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-200",
        className
      )}
    >
      <Button
        size="sm"
        variant="ghost"
        onClick={onClick}
        className={cn(
          "h-10 w-10 rounded-full shadow-lg border-0",
          "bg-gray-200 dark:bg-gray-900 text-gray-900 dark:text-gray-100",
          "hover:bg-gray-300 dark:hover:bg-gray-800",
          "transition-all duration-200 hover:scale-105"
        )}
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
    </div>
  )
}