import { useState, useEffect, useCallback, useRef } from "react"
import { useChat } from "@/lib/chat/context"
import type { Message } from "@/types"

interface UseInfiniteMessagesReturn {
  messages: Message[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  loadMore: () => Promise<void>
  refetch: () => Promise<void>
  scrollRef: React.RefObject<HTMLDivElement>
}

const MESSAGES_PER_PAGE = 30
const SCROLL_THRESHOLD = 100 // Pixels from top to trigger load more

export function useInfiniteMessages(conversationId: string): UseInfiniteMessagesReturn {
  const {
    loadMessages,
    onNewMessage,
    onMessageEdited,
    onMessageDeleted,
    onReactionAdded,
    onReactionRemoved,
  } = useChat()

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const previousScrollHeight = useRef(0)
  const shouldMaintainScroll = useRef(false)

  // Load initial messages
  const loadInitialMessages = useCallback(async () => {
    setIsLoading(true)
    setOffset(0)
    setHasMore(true)
    
    try {
      const messages = await loadMessages(conversationId, MESSAGES_PER_PAGE, 0)
      const reversedMessages = messages.reverse() 
      
      const uniqueMessages = reversedMessages.filter((msg, index, arr) => 
        arr.findIndex(m => m.id === msg.id) === index
      )
      
      setMessages(uniqueMessages)
      setOffset(messages.length)
      setHasMore(messages.length === MESSAGES_PER_PAGE)
    } catch (error) {
      console.error('Failed to load messages:', error)
      setMessages([])
      setHasMore(false)
    } finally {
      setIsLoading(false)
    }
  }, [conversationId, loadMessages])

  // Load more older messages
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    shouldMaintainScroll.current = true
    
    // Store current scroll state
    const scrollElement = scrollRef.current
    if (scrollElement) {
      previousScrollHeight.current = scrollElement.scrollHeight
    }

    try {
      const olderMessages = await loadMessages(conversationId, MESSAGES_PER_PAGE, offset)
      const reversedMessages = olderMessages.reverse()
      
      setMessages(prev => {
        // Filter out any messages that already exist to prevent duplicates
        const existingIds = new Set(prev.map(m => m.id))
        const newMessages = reversedMessages.filter(m => !existingIds.has(m.id))
        return [...newMessages, ...prev]
      })
      setOffset(prev => prev + olderMessages.length)
      setHasMore(olderMessages.length === MESSAGES_PER_PAGE)
    } catch (error) {
      console.error('Failed to load more messages:', error)
      setHasMore(false)
    } finally {
      setIsLoadingMore(false)
    }
  }, [conversationId, offset, isLoadingMore, hasMore, loadMessages])

  // Maintain scroll position after loading more messages
  useEffect(() => {
    if (shouldMaintainScroll.current && scrollRef.current) {
      const scrollElement = scrollRef.current
      const newScrollHeight = scrollElement.scrollHeight
      const heightDifference = newScrollHeight - previousScrollHeight.current
      
      // Maintain scroll position by adjusting for new content height
      scrollElement.scrollTop = heightDifference
      shouldMaintainScroll.current = false
    }
  }, [messages.length])

  // Scroll event handler for infinite scroll
  useEffect(() => {
    const scrollElement = scrollRef.current
    if (!scrollElement) return

    const handleScroll = () => {
      if (scrollElement.scrollTop < SCROLL_THRESHOLD && hasMore && !isLoadingMore) {
        loadMore()
      }
    }

    scrollElement.addEventListener('scroll', handleScroll)
    return () => scrollElement.removeEventListener('scroll', handleScroll)
  }, [hasMore, isLoadingMore, loadMore])

  // Load initial messages when conversation changes
  useEffect(() => {
    loadInitialMessages()
  }, [loadInitialMessages])

  // Handle real-time message updates
  useEffect(() => {
    const offNew = onNewMessage((msg, cid) => {
      if (cid === conversationId) {
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          if (prev.some(m => m.id === msg.id)) {
            return prev
          }
          return [...prev, msg]
        })
        
        // Auto-scroll to bottom for new messages if user is near bottom
        setTimeout(() => {
          const scrollElement = scrollRef.current
          if (scrollElement) {
            const { scrollTop, scrollHeight, clientHeight } = scrollElement
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
            
            if (isNearBottom) {
              scrollElement.scrollTop = scrollElement.scrollHeight
            }
          }
        }, 0)
      }
    })

    const offEdit = onMessageEdited((msg, cid) => {
      if (cid === conversationId) {
        setMessages(prev => prev.map(m =>
          m.id === msg.id ? { ...m, ...msg, is_edited: true } : m
        ))
      }
    })

    const offDel = onMessageDeleted((id) => {
      setMessages(prev => prev.filter(m => m.id !== id))
    })

    const offReactionAdded = onReactionAdded((messageId, emoji, userId) => {
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m

        const reactions = m.reactions || []
        const existingReaction = reactions.find(r => r.emoji === emoji)

        if (existingReaction) {
          if (!existingReaction.userIds.includes(userId)) {
            existingReaction.userIds.push(userId)
          }
          return { ...m, reactions: [...reactions] }
        } else {
          return {
            ...m,
            reactions: [...reactions, { emoji, userIds: [userId] }]
          }
        }
      }))
    })

    const offReactionRemoved = onReactionRemoved((messageId, emoji, userId) => {
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m

        const reactions = (m.reactions || []).map(r => {
          if (r.emoji === emoji) {
            return {
              ...r,
              userIds: r.userIds.filter(id => id !== userId)
            }
          }
          return r
        }).filter(r => r.userIds.length > 0)

        return { ...m, reactions }
      }))
    })

    return () => {
      offNew()
      offEdit()
      offDel()
      offReactionAdded()
      offReactionRemoved()
    }
  }, [conversationId, onNewMessage, onMessageEdited, onMessageDeleted, onReactionAdded, onReactionRemoved])

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refetch: loadInitialMessages,
    scrollRef,
  }
}