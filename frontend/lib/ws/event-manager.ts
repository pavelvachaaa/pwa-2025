export type WSEventHandler = (data: any) => void

export class WSEventManager {
  private eventHandlers: Map<string, Set<WSEventHandler>> = new Map()

  on(event: string, handler: WSEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }

  off(event: string, handler: WSEventHandler): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.eventHandlers.delete(event)
      }
    }
  }

  emit(event: string, data: any): void {
    console.log('🔔 [EventManager] Emitting event:', event, 'Data:', data, 'Handlers:', this.getHandlerCount(event));
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data)
        } catch (error) {
          console.error(`[WS] Error in event handler for ${event}:`, error)
        }
      })
    } else {
      console.log('❌ [EventManager] No handlers registered for event:', event);
    }
  }

  clear(): void {
    this.eventHandlers.clear()
  }

  getEventNames(): string[] {
    return Array.from(this.eventHandlers.keys())
  }

  getHandlerCount(event: string): number {
    const handlers = this.eventHandlers.get(event)
    return handlers ? handlers.size : 0
  }
}