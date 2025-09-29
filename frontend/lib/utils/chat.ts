import type { User, Conversation } from "@/types"

/**
 * Get the display name of a message sender
 */
export function getSenderName(senderId: string, user: User | null, conversation: Conversation | null): string {
  if (!conversation || !user) return "Someone"
  
  if (senderId === user.id) {
    return "You"
  }
  
  if (senderId === conversation.other_participant?.id) {
    return conversation.other_participant.display_name
  }
  
  const participant = conversation.participants?.find(p => p.id === senderId)
  return participant?.display_name || "Someone"
}