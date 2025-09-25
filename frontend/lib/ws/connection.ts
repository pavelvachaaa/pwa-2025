import { io, Socket } from 'socket.io-client'
import { api } from '../api/api'

export interface WSConfig {
  url?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export class WSConnection {
  private socket: Socket | null = null
  private config: WSConfig
  private isConnecting = false

  constructor(config: WSConfig = {}) {
    this.config = {
      url: config.url || "http://localhost:3333",
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      ...config,
    }
  }

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      return
    }

    if (this.isConnecting) {
      throw new Error("Connection already in progress")
    }

    this.isConnecting = true

    try {
      const token = await this.getAuthToken()
      if (!token) {
        throw new Error('Authentication token not found')
      }

      this.socket = io(this.config.url!, {
        auth: { token },
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.config.maxReconnectAttempts,
        reconnectionDelay: this.config.reconnectInterval
      })

      return new Promise((resolve, reject) => {
        this.socket!.on('connect', () => {
          this.isConnecting = false
          console.log('[WS] Connected to server')
          resolve()
        })

        this.socket!.on('connect_error', (error) => {
          this.isConnecting = false
          console.error('[WS] Connection error:', error)
          reject(new Error(`Connection failed: ${error.message}`))
        })

        this.socket!.on('disconnect', (reason) => {
          this.isConnecting = false
          console.log('[WS] Disconnected:', reason)
        })
      })
    } catch (error) {
      this.isConnecting = false
      throw error
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.isConnecting = false
    console.log('[WS] Disconnected')
  }

  emit(event: string, data?: any): void {
    if (!this.isConnected) {
      console.warn(`[WS] Cannot emit ${event}: not connected`)
      return
    }

    this.socket!.emit(event, data)
    console.log(`[WS] Emitted event: ${event}`, data)
  }

  on(event: string, handler: (...args: any[]) => void): void {
    if (!this.socket) {
      console.warn('[WS] Cannot add listener: not connected')
      return
    }
    this.socket.on(event, handler)
  }

  // Method to set up event handlers after connection
  setupEventHandlers(handlers: { [event: string]: (...args: any[]) => void }): void {
    if (!this.socket) {
      console.warn('[WS] Cannot setup handlers: not connected')
      return
    }

    Object.entries(handlers).forEach(([event, handler]) => {
      this.socket!.on(event, handler)
      console.log(`[WS] Added listener for event: ${event}`)
    })
  }

  off(event: string, handler?: (...args: any[]) => void): void {
    if (!this.socket) return
    this.socket.off(event, handler)
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  get connectionState(): string {
    if (this.isConnecting) return 'connecting'
    if (!this.socket) return 'disconnected'
    return this.socket.connected ? 'connected' : 'disconnected'
  }

  // We "fucked up" here cuz of the secure HTTP cookie 
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
}