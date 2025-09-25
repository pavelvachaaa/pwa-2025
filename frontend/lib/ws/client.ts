import { WSConnection, WSConfig } from './connection'
import { WSEventManager, WSEventHandler } from './event-manager'
import { ChatClient, MessageData, MessageEditData, MessageDeleteData } from './chat-client'
import { PresenceManager, PresenceData } from './presence-manager'

export class WebSocketClient {
  private connection: WSConnection
  private eventManager: WSEventManager
  private chatClient: ChatClient
  private presenceManager: PresenceManager

  public get chat() { return this.chatClient }
  public get presence() { return this.presenceManager }

  constructor(config: WSConfig = {}) {
    this.connection = new WSConnection(config)
    this.eventManager = new WSEventManager()
    this.chatClient = new ChatClient(this.connection, this.eventManager)
    this.presenceManager = new PresenceManager(this.connection, this.eventManager)
  }

  async connect(userId: string): Promise<void> {
    await this.connection.connect()

    this.setupAllEventHandlers()

    this.eventManager.emit('connected', { userId })
  }

  disconnect(): void {
    this.connection.disconnect()
    this.eventManager.emit('disconnected', {})
  }

  logout(): void {
    if (this.connection.isConnected) {
      this.connection.emit('user:logout')
    } else {
      this.disconnect()
    }
  }

  get isConnected(): boolean {
    return this.connection.isConnected
  }

  get connectionState(): string {
    return this.connection.connectionState
  }

  // Connection events
  onConnected(handler: (data: { userId: string }) => void): () => void {
    this.eventManager.on('connected', handler)
    return () => this.eventManager.off('connected', handler)
  }

  onDisconnected(handler: (data: any) => void): () => void {
    this.eventManager.on('disconnected', handler)
    return () => this.eventManager.off('disconnected', handler)
  }

  onError(handler: (data: { message: string }) => void): () => void {
    this.eventManager.on('error', handler)
    return () => this.eventManager.off('error', handler)
  }

  on(event: string, handler: WSEventHandler): void {
    this.eventManager.on(event, handler)
  }

  off(event: string, handler: WSEventHandler): void {
    this.eventManager.off(event, handler)
  }

  private setupAllEventHandlers(): void {
    console.log('[WS] Setting up all event handlers after connection')

    // Set up global connection event handlers
    this.connection.setupEventHandlers({
      'error': (data) => {
        console.error('[WS] Server error:', data)
        this.eventManager.emit('error', data)
      },
      'disconnect': (reason) => {
        console.log('[WS] Connection lost:', reason)
        this.eventManager.emit('disconnected', { reason })
      }
    })

    // Set up chat event handlers
    this.connection.setupEventHandlers({
      'message:new': (data) => {
        console.log('[Chat] New message:', data)
        this.eventManager.emit('message:new', data)
      },
      'message:edited': (data) => {
        console.log('[Chat] Message edited:', data)
        this.eventManager.emit('message:edited', data)
      },
      'message:deleted': (data) => {
        console.log('[Chat] Message deleted:', data)
        this.eventManager.emit('message:deleted', data)
      },
      'conversation:joined': (data) => {
        console.log('[Chat] Joined conversation:', data)
        this.eventManager.emit('conversation:joined', data)
      },
      'typing:user_started': (data) => {
        console.log('[Chat] User started typing:', data)
        this.eventManager.emit('typing:user_started', data)
      },
      'typing:user_stopped': (data) => {
        console.log('[Chat] User stopped typing:', data)
        this.eventManager.emit('typing:user_stopped', data)
      }
    })

    // Set up presence event handlers
    this.connection.setupEventHandlers({
      'presence:user_updated': (data) => {
        console.log('[Presence] User presence updated:', data)
        this.eventManager.emit('presence:user_updated', data)
      }
    })

    console.log('[WS] All event handlers set up successfully')
  }
}