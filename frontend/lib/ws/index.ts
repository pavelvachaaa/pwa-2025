export { WebSocketClient } from './client'
export { WSConnection } from './connection'
export type { WSConfig } from './connection'
export { ChatClient } from './chat-client'
export type { MessageData, MessageEditData, MessageDeleteData } from './chat-client'
export { PresenceManager } from './presence-manager'
export type { PresenceData } from './presence-manager'

import { WebSocketClient } from './client'

export const wsClient = new WebSocketClient()

export function useWebSocket() {
  return wsClient
}