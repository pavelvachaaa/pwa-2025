import type { WSMessage, WSClientConfig, WSEventHandler } from '@/types';

class WSClient {
  private ws: WebSocket | null = null
  private config: WSClientConfig
  private eventHandlers: Map<string, Set<WSEventHandler>> = new Map()
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private isConnecting = false
  private subscriptions: Set<string> = new Set()

  constructor(config: WSClientConfig = {}) {
    this.config = {
      url: config.url || "ws://localhost:3001",
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      ...config,
    }
  }

  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      if (this.isConnecting) {
        reject(new Error("Connection already in progress"))
        return
      }

      this.isConnecting = true

      try {
        // In a real implementation, this would connect to an actual WebSocket server
        // For demo purposes, we'll simulate the connection
        this.simulateConnection(token)
        resolve()
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  private simulateConnection(token?: string) {
    // Simulate WebSocket connection for demo
    console.log("[WS] Simulating WebSocket connection...")

    // Create a mock WebSocket-like object
    const mockWS = {
      readyState: 1, // OPEN
      send: (data: string) => {
        console.log("[WS] Mock send:", data)
        // Simulate server responses
        this.simulateServerResponse(JSON.parse(data))
      },
      close: () => {
        console.log("[WS] Mock connection closed")
        this.handleDisconnect()
      },
    }

    this.ws = mockWS as any
    this.isConnecting = false
    this.reconnectAttempts = 0

    // Simulate connection success
    setTimeout(() => {
      this.emit("connected", { token })
      console.log("[WS] Mock connection established")

      // Start simulating real-time events
      this.startMockEvents()
    }, 500)
  }

  private simulateServerResponse(message: any) {
    // Simulate server processing and responses
    switch (message.type) {
      case "subscribe":
        console.log(`[WS] Subscribed to conversation: ${message.conversationId}`)
        this.emit("subscribed", { conversationId: message.conversationId })
        break

      case "message:send":
        // Simulate message being sent and broadcast
        const newMessage = {
          id: `msg_${Date.now()}`,
          conversationId: message.conversationId,
          senderId: message.senderId,
          content: message.content,
          timestamp: new Date(),
          type: "text",
        }

        // Simulate slight delay
        setTimeout(() => {
          this.emit("message:new", newMessage)
        }, 100)
        break

      case "typing:start":
        this.emit("typing", {
          conversationId: message.conversationId,
          userId: message.userId,
          isTyping: true,
        })
        break

      case "typing:stop":
        this.emit("typing", {
          conversationId: message.conversationId,
          userId: message.userId,
          isTyping: false,
        })
        break
    }
  }

  private startMockEvents() {
    // Simulate random real-time events for demo
    const events = [() => this.simulateTyping(), () => this.simulatePresenceUpdate(), () => this.simulateMessageRead()]

    const runRandomEvent = () => {
      if (this.ws?.readyState === 1) {
        const randomEvent = events[Math.floor(Math.random() * events.length)]
        randomEvent()
      }

      // Schedule next random event
      setTimeout(runRandomEvent, Math.random() * 10000 + 5000) // 5-15 seconds
    }

    // Start the random events
    setTimeout(runRandomEvent, 3000)
  }

  private simulateTyping() {
    const conversationIds = ["conv_1", "conv_2", "conv_3"]
    const userIds = ["2", "3", "4", "5"]

    const conversationId = conversationIds[Math.floor(Math.random() * conversationIds.length)]
    const userId = userIds[Math.floor(Math.random() * userIds.length)]

    // Start typing
    this.emit("typing", {
      conversationId,
      userId,
      isTyping: true,
    })

    // Stop typing after 2-5 seconds
    setTimeout(
      () => {
        this.emit("typing", {
          conversationId,
          userId,
          isTyping: false,
        })
      },
      Math.random() * 3000 + 2000,
    )
  }

  private simulatePresenceUpdate() {
    const userIds = ["2", "3", "4", "5"]
    const statuses = ["online", "away", "offline"]

    const userId = userIds[Math.floor(Math.random() * userIds.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]

    this.emit("presence", {
      userId,
      status,
      lastSeen: status === "offline" ? new Date() : undefined,
    })
  }

  private simulateMessageRead() {
    const conversationIds = ["conv_1", "conv_2", "conv_3"]
    const userIds = ["2", "3", "4", "5"]

    const conversationId = conversationIds[Math.floor(Math.random() * conversationIds.length)]
    const userId = userIds[Math.floor(Math.random() * userIds.length)]

    this.emit("message:read", {
      conversationId,
      userId,
      readAt: new Date(),
    })
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.subscriptions.clear()
    console.log("[WS] Disconnected")
  }

  subscribe(conversationId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[WS] Cannot subscribe: not connected")
      return
    }

    this.subscriptions.add(conversationId)
    this.send({
      type: "subscribe",
      conversationId,
    })
  }

  unsubscribe(conversationId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    this.subscriptions.delete(conversationId)
    this.send({
      type: "unsubscribe",
      conversationId,
    })
  }

  sendMessage(payload: {
    conversationId: string
    content: string
    type?: string
    replyTo?: string
  }): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[WS] Cannot send message: not connected")
      return
    }

    const currentUserId = this.getCurrentUserId()

    this.send({
      type: "message:send",
      ...payload,
      senderId: currentUserId,
      timestamp: new Date(),
    })
  }

  startTyping(conversationId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    const currentUserId = this.getCurrentUserId()

    this.send({
      type: "typing:start",
      conversationId,
      userId: currentUserId,
    })
  }

  stopTyping(conversationId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    const currentUserId = this.getCurrentUserId()

    this.send({
      type: "typing:stop",
      conversationId,
      userId: currentUserId,
    })
  }

  private getCurrentUserId(): string {
    try {
      const authData = localStorage.getItem("auth")
      if (authData) {
        const { user } = JSON.parse(authData)
        return user?.id || "1"
      }
    } catch (error) {
      console.warn("[WS] Could not get user ID from auth:", error)
    }
    return "1" // fallback
  }

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

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data)
        } catch (error) {
          console.error(`[WS] Error in event handler for ${event}:`, error)
        }
      })
    }
  }

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  private handleDisconnect(): void {
    this.ws = null
    this.isConnecting = false

    this.emit("disconnected", {})

    // Attempt to reconnect
    if (this.reconnectAttempts < this.config.maxReconnectAttempts!) {
      this.reconnectAttempts++
      console.log(`[WS] Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`)

      this.reconnectTimer = setTimeout(() => {
        this.connect(this.config.token).catch((error) => {
          console.error("[WS] Reconnection failed:", error)
        })
      }, this.config.reconnectInterval)
    } else {
      console.error("[WS] Max reconnection attempts reached")
      this.emit("reconnect_failed", {})
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  get connectionState(): string {
    if (!this.ws) return "disconnected"

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "connecting"
      case WebSocket.OPEN:
        return "connected"
      case WebSocket.CLOSING:
        return "closing"
      case WebSocket.CLOSED:
        return "disconnected"
      default:
        return "unknown"
    }
  }
}

// Singleton instance
export const wsClient = new WSClient()

// Hook for using WebSocket in React components
export function useWebSocket() {
  return wsClient
}
