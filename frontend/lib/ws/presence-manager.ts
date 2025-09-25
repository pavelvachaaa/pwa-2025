import { WSConnection } from './connection'
import { WSEventManager } from './event-manager'

export interface PresenceData {
  userId: string
  status: 'online' | 'away' | 'offline'
  lastSeen?: string
}

export class PresenceManager {
  private connection: WSConnection
  private eventManager: WSEventManager

  constructor(connection: WSConnection, eventManager: WSEventManager) {
    this.connection = connection
    this.eventManager = eventManager
  }

  // Presence operations
  updateStatus(status: 'online' | 'away' | 'offline'): void {
    this.connection.emit('presence:update', { status })
    console.log(`[Presence] Status updated to: ${status}`)
  }

  // Event subscriptions
  onUserPresenceUpdate(handler: (data: PresenceData) => void): () => void {
    this.eventManager.on('presence:user_updated', handler)
    return () => this.eventManager.off('presence:user_updated', handler)
  }

  onUserOnline(handler: (data: { userId: string }) => void): () => void {
    const presenceHandler = (data: PresenceData) => {
      if (data.status === 'online') {
        handler({ userId: data.userId })
      }
    }
    this.eventManager.on('presence:user_updated', presenceHandler)
    return () => this.eventManager.off('presence:user_updated', presenceHandler)
  }

  onUserOffline(handler: (data: { userId: string; lastSeen?: Date }) => void): () => void {
    const presenceHandler = (data: PresenceData) => {
      if (data.status === 'offline') {
        handler({
          userId: data.userId,
          lastSeen: data.lastSeen ? new Date(data.lastSeen) : undefined
        })
      }
    }
    this.eventManager.on('presence:user_updated', presenceHandler)
    return () => this.eventManager.off('presence:user_updated', presenceHandler)
  }

}