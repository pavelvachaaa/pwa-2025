"use client"

import { useState, useEffect } from "react"
import { Search, MessageSquare, Users, Hash, Clock, ArrowRight } from "lucide-react"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  mockMessages,
  mockConversations,
  mockUsers,
  getConversationName,
  getConversationAvatar,
  getUserById,
} from "@/lib/mock-data"

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectConversation: (conversationId: string) => void
  onStartChat: (userId: string) => void
  currentUserId: string
}

interface SearchResult {
  type: "message" | "conversation" | "contact"
  id: string
  title: string
  subtitle: string
  avatar?: string
  timestamp?: Date
  conversationId?: string
  userId?: string
  content?: string
}

export function GlobalSearch({
  open,
  onOpenChange,
  onSelectConversation,
  onStartChat,
  currentUserId,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  // Search function
  const performSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    const searchResults: SearchResult[] = []
    const lowerQuery = searchQuery.toLowerCase()

    // Search messages
    mockMessages.forEach((message) => {
      if (message.content.toLowerCase().includes(lowerQuery)) {
        const conversation = mockConversations.find((c) => c.id === message.conversationId)
        const sender = getUserById(message.senderId)

        if (conversation && sender) {
          searchResults.push({
            type: "message",
            id: message.id,
            title: `Message from ${sender.name}`,
            subtitle: message.content,
            avatar: sender.avatar,
            timestamp: message.timestamp,
            conversationId: message.conversationId,
            content: message.content,
          })
        }
      }
    })

    // Search conversations
    mockConversations.forEach((conversation) => {
      const name = getConversationName(conversation, currentUserId)
      if (name.toLowerCase().includes(lowerQuery)) {
        const avatar = getConversationAvatar(conversation, currentUserId)

        searchResults.push({
          type: "conversation",
          id: conversation.id,
          title: name,
          subtitle: conversation.type === "group" ? `${conversation.participants.length} members` : "Direct message",
          avatar,
          timestamp: conversation.updatedAt,
          conversationId: conversation.id,
        })
      }
    })

    // Search contacts
    mockUsers.forEach((user) => {
      if (
        user.id !== currentUserId &&
        (user.name.toLowerCase().includes(lowerQuery) || user.email.toLowerCase().includes(lowerQuery))
      ) {
        searchResults.push({
          type: "contact",
          id: user.id,
          title: user.name,
          subtitle: user.email,
          avatar: user.avatar,
          userId: user.id,
        })
      }
    })

    // Sort results by relevance and timestamp
    searchResults.sort((a, b) => {
      // Prioritize exact matches
      const aExact = a.title.toLowerCase() === lowerQuery
      const bExact = b.title.toLowerCase() === lowerQuery
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1

      // Then by timestamp (most recent first)
      if (a.timestamp && b.timestamp) {
        return b.timestamp.getTime() - a.timestamp.getTime()
      }

      return 0
    })

    setResults(searchResults.slice(0, 20)) // Limit to 20 results
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 150)

    return () => clearTimeout(timer)
  }, [query])

  // Handle keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  const handleSelect = (result: SearchResult) => {
    // Add to recent searches
    setRecentSearches((prev) => {
      const updated = [result.title, ...prev.filter((s) => s !== result.title)].slice(0, 5)
      return updated
    })

    // Handle selection based on type
    if (result.type === "message" || result.type === "conversation") {
      if (result.conversationId) {
        onSelectConversation(result.conversationId)
      }
    } else if (result.type === "contact" && result.userId) {
      onStartChat(result.userId)
    }

    onOpenChange(false)
    setQuery("")
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return "now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const getResultIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "message":
        return <MessageSquare className="h-4 w-4" />
      case "conversation":
        return <Hash className="h-4 w-4" />
      case "contact":
        return <Users className="h-4 w-4" />
    }
  }

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text

    const regex = new RegExp(`(${query})`, "gi")
    const parts = text.split(regex)

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900/50 text-foreground">
          {part}
        </mark>
      ) : (
        part
      ),
    )
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} className="max-w-2xl">
      <CommandInput
        placeholder="Search messages, conversations, and contacts..."
        value={query}
        onValueChange={setQuery}
      />

      <CommandList className="max-h-96">
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-6">
            <Search className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{query ? "No results found" : "Start typing to search"}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Press</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
              <span>to open</span>
            </div>
          </div>
        </CommandEmpty>

        {!query && recentSearches.length > 0 && (
          <CommandGroup heading="Recent Searches">
            {recentSearches.map((search, index) => (
              <CommandItem key={index} onSelect={() => setQuery(search)} className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{search}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.length > 0 && (
          <>
            {/* Messages */}
            {results.filter((r) => r.type === "message").length > 0 && (
              <CommandGroup heading="Messages">
                {results
                  .filter((r) => r.type === "message")
                  .map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className="flex items-start gap-3 p-3"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">{getResultIcon(result.type)}</div>
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={result.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{result.title.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{highlightMatch(result.title, query)}</p>
                          {result.timestamp && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {formatTimestamp(result.timestamp)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {highlightMatch(result.subtitle, query)}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}

            {/* Conversations */}
            {results.filter((r) => r.type === "conversation").length > 0 && (
              <CommandGroup heading="Conversations">
                {results
                  .filter((r) => r.type === "conversation")
                  .map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className="flex items-center gap-3 p-3"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">{getResultIcon(result.type)}</div>
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={result.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{result.title.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{highlightMatch(result.title, query)}</p>
                        <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}

            {/* Contacts */}
            {results.filter((r) => r.type === "contact").length > 0 && (
              <CommandGroup heading="People">
                {results
                  .filter((r) => r.type === "contact")
                  .map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className="flex items-center gap-3 p-3"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">{getResultIcon(result.type)}</div>
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={result.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{result.title.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{highlightMatch(result.title, query)}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {highlightMatch(result.subtitle, query)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Start Chat
                      </Badge>
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
          </>
        )}

        {!query && (
          <div className="px-2 py-4">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <span>Press</span>
              <CommandShortcut>⌘K</CommandShortcut>
              <span>to search • Press</span>
              <CommandShortcut>↵</CommandShortcut>
              <span>to select</span>
            </div>
          </div>
        )}
      </CommandList>
    </CommandDialog>
  )
}
