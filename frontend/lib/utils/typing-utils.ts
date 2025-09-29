import { TYPING_TIMEOUT_MS } from "./chat-constants"

/**
 * Manages typing indicator state with debounced timeout
 */
export class TypingManager {
  private timeoutRef: NodeJS.Timeout | undefined
  private isTypingState = false

  constructor(
    private onStartTyping: () => void,
    private onStopTyping: () => void,
    private timeoutMs: number = TYPING_TIMEOUT_MS
  ) {}

  /**
   * Handle text change - starts typing or resets timeout
   */
  handleTextChange(value: string): void {
    // Clear existing timeout
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef)
      this.timeoutRef = undefined
    }

    const hasContent = value.trim().length > 0

    // Start typing if we have content and weren't typing before
    if (hasContent && !this.isTypingState) {
      this.onStartTyping()
      this.isTypingState = true
    }

    // Set timeout to stop typing if we have content
    if (hasContent) {
      this.timeoutRef = setTimeout(() => {
        this.onStopTyping()
        this.isTypingState = false
        this.timeoutRef = undefined
      }, this.timeoutMs)
    } else if (this.isTypingState) {
      // Stop typing immediately if no content
      this.onStopTyping()
      this.isTypingState = false
    }
  }

  /**
   * Force stop typing (e.g., when sending message)
   */
  stopTyping(): void {
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef)
      this.timeoutRef = undefined
    }
    
    if (this.isTypingState) {
      this.onStopTyping()
      this.isTypingState = false
    }
  }

  /**
   * Clean up on unmount
   */
  cleanup(): void {
    this.stopTyping()
  }

  get isTyping(): boolean {
    return this.isTypingState
  }
}