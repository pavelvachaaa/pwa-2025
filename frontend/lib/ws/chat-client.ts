import { WSConnection } from './connection'
import { WSEventManager } from './event-manager'

export interface MessageData {
  conversationId: string
  content: string
  messageType: 'text' | 'image' | 'file'
  replyTo?: string
}

export interface MessageEditData {
  messageId: string
  content: string
}

export interface MessageDeleteData {
  messageId: string
}

export class ChatClient {
  private connection: WSConnection
  private eventManager: WSEventManager

  constructor(connection: WSConnection, eventManager: WSEventManager) {
    this.connection = connection
    this.eventManager = eventManager
  }

  // Chat operations
  sendMessage(data: MessageData): void {
    this.connection.emit('message:send', data)
  }

  editMessage(data: MessageEditData): void {
    this.connection.emit('message:edit', data)
  }

  deleteMessage(data: MessageDeleteData): void {
    this.connection.emit('message:delete', data)
  }

  joinConversation(conversationId: string): void {
    this.connection.emit('conversation:join', { conversationId })
    console.log(`[Chat] Joining conversation: ${conversationId}`)
  }

  leaveConversation(conversationId: string): void {
    this.connection.emit('conversation:leave', { conversationId })
    console.log(`[Chat] Leaving conversation: ${conversationId}`)
  }

  // Typing indicators
  startTyping(conversationId: string): void {
    this.connection.emit('typing:start', { conversationId })
  }

  stopTyping(conversationId: string): void {
    this.connection.emit('typing:stop', { conversationId })
  }

  // Mark as read
  markAsRead(conversationId: string): void {
    this.connection.emit('conversation:mark_read', { conversationId })
  }

  // Event subscriptions
  onNewMessage(handler: (data: { message: any; conversationId: string }) => void): () => void {
    this.eventManager.on('message:new', handler)
    return () => this.eventManager.off('message:new', handler)
  }

  onMessageEdited(handler: (data: { message: any; conversationId: string }) => void): () => void {
    this.eventManager.on('message:edited', handler)
    return () => this.eventManager.off('message:edited', handler)
  }

  onMessageDeleted(handler: (data: { messageId: string }) => void): () => void {
    this.eventManager.on('message:deleted', handler)
    return () => this.eventManager.off('message:deleted', handler)
  }

  onConversationJoined(handler: (data: { conversationId: string }) => void): () => void {
    this.eventManager.on('conversation:joined', handler)
    return () => this.eventManager.off('conversation:joined', handler)
  }

  onTypingStart(handler: (data: { conversationId: string; userId: string }) => void): () => void {
    this.eventManager.on('typing:user_started', handler)
    return () => this.eventManager.off('typing:user_started', handler)
  }

  onTypingStop(handler: (data: { conversationId: string; userId: string }) => void): () => void {
    this.eventManager.on('typing:user_stopped', handler)
    return () => this.eventManager.off('typing:user_stopped', handler)
  }

}