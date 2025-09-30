import { useRef, useCallback, useState } from 'react'

interface CombinedGesturesOptions {
  onSwipeReply?: () => void
  onLongPressReact?: (e: React.TouchEvent | React.MouseEvent) => void
  swipeThreshold?: number
  longPressDelay?: number
  disabled?: boolean
}

interface GestureState {
  isPressed: boolean
  isLongPress: boolean
  isSwipeActive: boolean
}

export function useCombinedGestures({
  onSwipeReply,
  onLongPressReact,
  swipeThreshold = 80,
  longPressDelay = 500,
  disabled = false
}: CombinedGesturesOptions) {
  const [state, setState] = useState<GestureState>({
    isPressed: false,
    isLongPress: false,
    isSwipeActive: false
  })

  const elementRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const startPosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const currentPosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const isLongPressRef = useRef<boolean>(false)
  const isSwipeActiveRef = useRef<boolean>(false)

  const getSwipeState = useCallback((distance: number) => {
    const clampedDistance = Math.max(0, Math.min(distance, swipeThreshold * 1.5))
    const progress = clampedDistance / swipeThreshold

    return {
      isActive: distance > swipeThreshold * 0.3,
      distance: clampedDistance,
      opacity: Math.min(progress, 1)
    }
  }, [swipeThreshold])

  const startGesture = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    startPosition.current = { x: clientX, y: clientY }
    currentPosition.current = { x: clientX, y: clientY }
    isLongPressRef.current = false
    isSwipeActiveRef.current = false

    setState(prev => ({ ...prev, isPressed: true }))

    timeoutRef.current = setTimeout(() => {
      if (!isSwipeActiveRef.current) {
        isLongPressRef.current = true
        setState(prev => ({ ...prev, isLongPress: true }))

        try {
          if ('vibrate' in navigator && navigator.vibrate) {
            navigator.vibrate([100, 50, 100])
            console.log('[CombinedGestures] Vibration triggered')
          }
        } catch (error) {
          console.log('[CombinedGestures] Vibration failed:', error)
        }

        if (elementRef.current) {
          elementRef.current.style.transform = 'scale(0.98)'
          setTimeout(() => {
            if (elementRef.current) {
              elementRef.current.style.transform = ''
            }
          }, 100)
        }

        console.log('[CombinedGestures] Long press triggered')
        onLongPressReact?.(e)
      }
    }, longPressDelay)
  }, [disabled, longPressDelay, onLongPressReact])

  const moveGesture = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (disabled || !state.isPressed) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    currentPosition.current = { x: clientX, y: clientY }

    const deltaX = clientX - startPosition.current.x
    const deltaY = clientY - startPosition.current.y

    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }

    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 10 && onSwipeReply) {
      isSwipeActiveRef.current = true
      setState(prev => ({ ...prev, isSwipeActive: true }))

      if (elementRef.current) {
        const swipeState = getSwipeState(deltaX)
        elementRef.current.style.transform = `translateX(${swipeState.distance}px)`
        elementRef.current.style.transition = 'none'

        const replyIcon = elementRef.current.querySelector('[data-swipe-reply-icon]') as HTMLElement
        if (replyIcon) {
          replyIcon.style.opacity = swipeState.opacity.toString()
        }
      }

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        e.preventDefault()
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [disabled, state.isPressed, getSwipeState, onSwipeReply])

  const endGesture = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return

    const deltaX = currentPosition.current.x - startPosition.current.x
    const shouldSwipe = deltaX > swipeThreshold && isSwipeActiveRef.current

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (elementRef.current) {
      elementRef.current.style.transform = ''
      elementRef.current.style.transition = 'transform 0.2s ease-out'

      const replyIcon = elementRef.current.querySelector('[data-swipe-reply-icon]') as HTMLElement
      if (replyIcon) {
        replyIcon.style.opacity = '0'
      }
    }

    if (shouldSwipe) {
      try {
        if ('vibrate' in navigator && navigator.vibrate) {
          navigator.vibrate(75)
        }
      } catch (error) {
        console.log('[CombinedGestures] Swipe vibration failed:', error)
      }

      onSwipeReply?.()
    }

    if (isLongPressRef.current) {
      e.preventDefault()
      e.stopPropagation()
    }

    setState({
      isPressed: false,
      isLongPress: false,
      isSwipeActive: false
    })

    isLongPressRef.current = false
    isSwipeActiveRef.current = false
  }, [disabled, swipeThreshold, onSwipeReply])

  const cancelGesture = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Reset visual state
    if (elementRef.current) {
      elementRef.current.style.transform = ''
      elementRef.current.style.transition = 'transform 0.2s ease-out'

      const replyIcon = elementRef.current.querySelector('[data-swipe-reply-icon]') as HTMLElement
      if (replyIcon) {
        replyIcon.style.opacity = '0'
      }
    }

    setState({
      isPressed: false,
      isLongPress: false,
      isSwipeActive: false
    })

    isLongPressRef.current = false
    isSwipeActiveRef.current = false
  }, [])

  return {
    handlers: {
      onTouchStart: startGesture,
      onTouchMove: moveGesture,
      onTouchEnd: endGesture,
      onTouchCancel: cancelGesture,
      onMouseDown: startGesture,
      onMouseMove: moveGesture,
      onMouseUp: endGesture,
      onMouseLeave: cancelGesture,
    },
    elementRef,
    isPressed: state.isPressed,
    isLongPress: state.isLongPress,
    isSwipeActive: state.isSwipeActive
  }
}