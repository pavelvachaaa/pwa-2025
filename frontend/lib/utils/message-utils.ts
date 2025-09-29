import type { Message } from "@/types"

/**
 * Format message timestamp for display
 */
export function formatMessageTime(message: Message): string {
  const ts = new Date(message.created_at || (message as any).timestamp || Date.now())
  return ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

/**
 * Check if a user has reacted to a message with a specific emoji
 */
export function hasUserReacted(message: Message, userId: string, emoji: string): boolean {
  const reaction = message.reactions?.find(r => r.emoji === emoji)
  return reaction?.userIds.includes(userId) ?? false
}

/**
 * Validate and prepare message content for sending
 */
export function validateMessageContent(content: string): string | null {
  const trimmed = content.trim()
  return trimmed || null
}

/**
 * Check if message content has changed for editing
 */
export function hasMessageContentChanged(originalContent: string, newContent: string): boolean {
  const trimmed = newContent.trim()
  return trimmed !== originalContent && trimmed.length > 0
}

/**
 * Find a message by ID in a messages array
 */
export function findMessageById(messages: Message[], messageId: string): Message | null {
  return messages.find(m => m.id === messageId) || null
}

/**
 * Get the replied-to message from a message and messages array
 */
export function getRepliedToMessage(message: Message, messages?: Message[]): Message | null {
  if (!message.reply_to || !messages) return null
  return findMessageById(messages, message.reply_to)
}