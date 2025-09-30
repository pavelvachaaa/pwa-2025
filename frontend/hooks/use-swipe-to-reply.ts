import { useRef, useCallback } from 'react'

interface SwipeToReplyOptions {
  onReply: () => void
  threshold?: number
  disabled?: boolean
}

interface SwipeState {
  isActive: boolean
  distance: number
  opacity: number
}

export function useSwipeToReply({ onReply, threshold = 80, disabled = false }: SwipeToReplyOptions) {
  const startX = useRef<number>(0)
  const startY = useRef<number>(0)
  const currentX = useRef<number>(0)
  const isSwipeActive = useRef<boolean>(false)
  const elementRef = useRef<HTMLDivElement>(null)

  const getSwipeState = useCallback((distance: number): SwipeState => {
    const clampedDistance = Math.max(0, Math.min(distance, threshold * 1.5))
    const progress = clampedDistance / threshold
    
    return {
      isActive: distance > threshold * 0.3,
      distance: clampedDistance,
      opacity: Math.min(progress, 1)
    }
  }, [threshold])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return
    
    const touch = e.touches[0]
    startX.current = touch.clientX
    startY.current = touch.clientY
    currentX.current = touch.clientX
    isSwipeActive.current = false
    
    console.log('[Swipe] Touch start at:', touch.clientX, touch.clientY)
  }, [disabled])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled) return
    
    const touch = e.touches[0]
    currentX.current = touch.clientX
    
    const deltaX = currentX.current - startX.current
    const deltaY = touch.clientY - startY.current
    
    console.log('[Swipe] Touch move - deltaX:', deltaX, 'deltaY:', deltaY)
    
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 10) {
      isSwipeActive.current = true
      console.log('[Swipe] Activating swipe gesture')
      
      if (elementRef.current) {
        const swipeState = getSwipeState(deltaX)
        elementRef.current.style.transform = `translateX(${swipeState.distance}px)`
        elementRef.current.style.transition = 'none'
        
        const replyIcon = elementRef.current.querySelector('[data-swipe-reply-icon]') as HTMLElement
        if (replyIcon) {
          replyIcon.style.opacity = swipeState.opacity.toString()
          console.log('[Swipe] Setting icon opacity to:', swipeState.opacity)
        }
      }
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        e.preventDefault()
      }
    }
  }, [disabled, getSwipeState])

  const handleTouchEnd = useCallback(() => {
    if (disabled) return
    
    const deltaX = currentX.current - startX.current
    const shouldReply = deltaX > threshold && isSwipeActive.current
    
    console.log('[Swipe] Touch end - deltaX:', deltaX, 'threshold:', threshold, 'shouldReply:', shouldReply)
    
    // Reset visual state
    if (elementRef.current) {
      elementRef.current.style.transform = ''
      elementRef.current.style.transition = 'transform 0.2s ease-out'
      
      const replyIcon = elementRef.current.querySelector('[data-swipe-reply-icon]') as HTMLElement
      if (replyIcon) {
        replyIcon.style.opacity = '0'
      }
    }
    
    if (shouldReply) {
      console.log('[Swipe] Triggering reply callback')
      onReply()
    }
    
    // Reset state
    isSwipeActive.current = false
    startX.current = 0
    startY.current = 0
    currentX.current = 0
  }, [disabled, threshold, onReply])

  return {
    swipeHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    elementRef,
    isActive: isSwipeActive.current
  }
}