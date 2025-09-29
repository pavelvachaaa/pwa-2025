"use client"

import { useState } from "react"
import { Search, LogOut, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { User } from "@/types"

interface SidebarHeaderProps {
  user: User | null
  searchQuery: string
  onSearchChange: (query: string) => void
  onLogout: () => void
  onNewChat: () => void
}

export function SidebarHeader({
  user,
  searchQuery,
  onSearchChange,
  onLogout,
  onNewChat,
}: SidebarHeaderProps) {
  return (
    <div className="border-b border-sidebar-border p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatar_url || "/placeholder.svg"} />
            <AvatarFallback>{user?.display_name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-sidebar-foreground">
              {user?.display_name}
            </h2>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs text-sidebar-foreground/70">Online</span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onLogout}
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/50" />
        <Input
          placeholder="Filter conversations..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-sidebar-accent border-sidebar-border"
          aria-label="Filter conversations"
        />
      </div>

      <Button
        variant="outline"
        className="w-full justify-start gap-2 bg-sidebar-accent border-sidebar-border hover:bg-sidebar-accent/80"
        onClick={onNewChat}
      >
        <Plus className="h-4 w-4" />
        New Chat
      </Button>
    </div>
  )
}