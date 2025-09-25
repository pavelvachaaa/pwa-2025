import type { WSClientConfig, WSEventHandler } from '@/types';
import { io, Socket } from 'socket.io-client';
import { api } from './api/api';

class WSClient {
  private socket: Socket | null = null
  private config: WSClientConfig
  private eventHandlers: Map<string, Set<WSEventHandler>> = new Map()
  private reconnectAttempts = 0
  private isConnecting = false
  private token: string | null = null

  constructor(config: WSClientConfig = {}) {
    this.config = {
      url: config.url || "http://localhost:3333",
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      ...config,
    }
  }

  async connect(userId: string): Promise<void> {
    return new Promise( async (resolve, reject) => {
      if (this.socket?.connected) {
        resolve()
        return
      }

      if (this.isConnecting) {
        reject(new Error("Connection already in progress"))
        return
      }

      this.isConnecting = true

      try {
        // Get auth token from API
        const token = await this.getAuthToken()
        if (!token) {
          throw new Error('Authentication token not found')
        }

        this.token = token

        this.socket = io(this.config.url!, {
          auth: {
            token: token
          },
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: this.config.maxReconnectAttempts,
          reconnectionDelay: this.config.reconnectInterval
        })

        this.setupEventHandlers()

        this.socket.on('connect', () => {
          this.isConnecting = false
          this.reconnectAttempts = 0
          console.log('[WS] Connected to server')
          this.emit('connected', { userId })
          resolve()
        })

        this.socket.on('connect_error', (error) => {
          this.isConnecting = false
          console.error('[WS] Connection error:', error)
          this.emit('disconnected', {})
          reject(new Error(`Connection failed: ${error.message}`))
        })

        this.socket.on('disconnect', (reason) => {
          this.isConnecting = false
          console.log('[WS] Disconnected:', reason)
          this.emit('disconnected', { reason })
        })

      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const response = await api.get<{ token: string }>('/auth/getToken')

      if (response.success && response.data?.token) {
        return response.data.token
      }

      console.error('[WS] Failed to get auth token:', response.error)
      return null
    } catch (error) {
      console.error('[WS] Failed to get auth token:', error)
      return null
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return

    // Handle incoming messages
    this.socket.on('message:new', (data) => {
      console.log('[WS] New message received:', data)
      this.emit('message:new', data.message)
    })

    this.socket.on('message:edited', (data) => {
      console.log('[WS] Message edited:', data)
      this.emit('message:updated', data.message)
    })

    this.socket.on('message:deleted', (data) => {
      console.log('[WS] Message deleted:', data)
      this.emit('message:deleted', data)
    })

    this.socket.on('message:reaction_added', (data) => {
      console.log('[WS] Reaction added:', data)
      this.emit('message:reaction', data)
    })

    this.socket.on('message:reaction_removed', (data) => {
      console.log('[WS] Reaction removed:', data)
      this.emit('message:reaction', data)
    })

    // Handle typing indicators
    this.socket.on('typing:user_started', (data) => {
      console.log('[WS] User started typing:', data)
      this.emit('typing', {
        conversationId: data.conversationId,
        userId: data.userId,
        isTyping: true
      })
    })

    this.socket.on('typing:user_stopped', (data) => {
      console.log('[WS] User stopped typing:', data)
      this.emit('typing', {
        conversationId: data.conversationId,
        userId: data.userId,
        isTyping: false
      })
    })

    // Handle presence updates
    this.socket.on('presence:user_updated', (data) => {
      console.log('[WS] User presence updated:', data)
      this.emit('presence', data)
    })

    // Handle read status
    this.socket.on('conversation:read_by_user', (data) => {
      console.log('[WS] Message read by user:', data)
      this.emit('message:read', data)
    })

    // Handle errors
    this.socket.on('error', (data) => {
      console.error('[WS] Server error:', data)
      this.emit('error', data)
    })

    // Handle conversation events
    this.socket.on('conversation:joined', (data) => {
      console.log('[WS] Joined conversation:', data)
      this.emit('conversation:joined', data)
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    console.log('[WS] Disconnected')
  }

  subscribe(conversationId: string): void {
    if (!this.socket?.connected) {
      console.warn('[WS] Cannot subscribe: not connected')
      return
    }

    this.socket.emit('conversation:join', { conversationId })
    console.log(`[WS] Subscribing to conversation: ${conversationId}`)
  }

  unsubscribe(conversationId: string): void {
    if (!this.socket?.connected) {
      return
    }

    this.socket.emit('conversation:leave', { conversationId })
    console.log(`[WS] Unsubscribing from conversation: ${conversationId}`)
  }

  sendMessage(payload: {
    conversationId: string
    content: string
    type?: string
    replyTo?: string
  }): void {
    if (!this.socket?.connected) {
      console.warn('[WS] Cannot send message: not connected')
      return
    }

    this.socket.emit('message:send', {
      conversationId: payload.conversationId,
      content: payload.content,
      messageType: payload.type || 'text',
      replyTo: payload.replyTo
    })

    console.log('[WS] Message sent:', payload)
  }

  startTyping(conversationId: string): void {
    if (!this.socket?.connected) {
      return
    }

    this.socket.emit('typing:start', { conversationId })
  }

  stopTyping(conversationId: string): void {
    if (!this.socket?.connected) {
      return
    }

    this.socket.emit('typing:stop', { conversationId })
  }

  markAsRead(conversationId: string): void {
    if (!this.socket?.connected) {
      return
    }

    this.socket.emit('conversation:mark_read', { conversationId })
  }

  updatePresence(status: 'online' | 'away' | 'offline'): void {
    if (!this.socket?.connected) {
      return
    }

    this.socket.emit('presence:update', { status })
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

  get isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  get connectionState(): string {
    if (!this.socket) return 'disconnected'

    if (this.socket.connected) return 'connected'
    if (this.isConnecting) return 'connecting'
    if (this.socket.disconnected) return 'disconnected'

    return 'unknown'
  }
}

export const wsClient = new WSClient()

export function useWebSocket() {
  return wsClient
}