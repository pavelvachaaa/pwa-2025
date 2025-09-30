import { useRef, useCallback, useState } from 'react'

interface LongPressToReactOptions {
  onLongPress: (e: React.TouchEvent | React.MouseEvent) => void
  delay?: number
  disabled?: boolean
}

interface LongPressState {
  isPressed: boolean
  isLongPress: boolean
}

export function useLongPressToReact({ 
  onLongPress, 
  delay = 500, 
  disabled = false 
}: LongPressToReactOptions) {
  const [state, setState] = useState<LongPressState>({
    isPressed: false,
    isLongPress: false
  })
  
  const timeoutRef = useRef<NodeJS.Timeout>()
  const isLongPressRef = useRef<boolean>(false)
  const startPosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    startPosition.current = { x: clientX, y: clientY }
    isLongPressRef.current = false

    setState(prev => ({ ...prev, isPressed: true }))

    timeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true
      setState(prev => ({ ...prev, isLongPress: true }))
      
      if ('vibrate' in navigator) {
        navigator.vibrate(100)
      }
      
      onLongPress(e)
    }, delay)
  }, [disabled, delay, onLongPress])

  const move = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (disabled || !state.isPressed) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const deltaX = Math.abs(clientX - startPosition.current.x)
    const deltaY = Math.abs(clientY - startPosition.current.y)
    
    if (deltaX > 10 || deltaY > 10) {
      cancel()
    }
  }, [disabled, state.isPressed])

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    setState({
      isPressed: false,
      isLongPress: false
    })
    
    isLongPressRef.current = false
  }, [])

  const end = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (isLongPressRef.current) {
      e.preventDefault()
      e.stopPropagation()
    }

    setState({
      isPressed: false,
      isLongPress: false
    })
    
    isLongPressRef.current = false
  }, [disabled])

  return {
    longPressHandlers: {
      onTouchStart: start,
      onTouchMove: move,
      onTouchEnd: end,
      onTouchCancel: cancel,
      onMouseDown: start,
      onMouseMove: move,
      onMouseUp: end,
      onMouseLeave: cancel,
    },
    isPressed: state.isPressed,
    isLongPress: state.isLongPress
  }
}