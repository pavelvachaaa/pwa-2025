import { useEffect, useState, useCallback, useRef } from 'react'

interface UseScrollToBottomOptions {
  threshold?: number
  debounceMs?: number
}

export function useScrollToBottom(
  scrollRef: React.RefObject<HTMLElement>,
  { threshold = 100, debounceMs = 100 }: UseScrollToBottomOptions = {}
) {
  const [showScrollButton, setShowScrollButton] = useState(false)
  const debounceTimeout = useRef<NodeJS.Timeout>()

  const checkScrollPosition = useCallback(() => {
    if (!scrollRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight <= threshold
    
    setShowScrollButton(!isNearBottom)
  }, [scrollRef, threshold])

  const debouncedCheckScroll = useCallback(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }
    
    debounceTimeout.current = setTimeout(checkScrollPosition, debounceMs)
  }, [checkScrollPosition, debounceMs])

  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return

    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth'
    })
  }, [scrollRef])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    element.addEventListener('scroll', debouncedCheckScroll)
    
    // Initial check
    checkScrollPosition()

    return () => {
      element.removeEventListener('scroll', debouncedCheckScroll)
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
    }
  }, [scrollRef, debouncedCheckScroll, checkScrollPosition])

  // Check scroll position when content changes
  useEffect(() => {
    checkScrollPosition()
  })

  return {
    showScrollButton,
    scrollToBottom
  }
}