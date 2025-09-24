import type { User, Message, Conversation } from "@/types";

// Mock users data - temporary for components that still reference it
export const mockUsers: User[] = [];

// Mock function to get user by ID - will be replaced by API call
export function getUserById(id: string): User | undefined {
  // This is a placeholder - in real implementation this would fetch from API
  return mockUsers.find(user => user.id === id);
}

// Mock function to get conversation name - temporary
export function getConversationName(conversation: Conversation, currentUserId: string): string {
  if (conversation.type === 'group') {
    return conversation.name || 'Unnamed Group';
  }

  // For DM, find the other participant
  const otherParticipantId = conversation.participants.find(id => id !== currentUserId);
  if (otherParticipantId) {
    const otherUser = getUserById(otherParticipantId);
    return otherUser?.name || 'Unknown User';
  }

  return 'Unknown';
}

// Mock function to get conversation avatar - temporary
export function getConversationAvatar(conversation: Conversation, currentUserId: string): string | undefined {
  if (conversation.type === 'group') {
    return conversation.avatar;
  }

  // For DM, get the other participant's avatar
  const otherParticipantId = conversation.participants.find(id => id !== currentUserId);
  if (otherParticipantId) {
    const otherUser = getUserById(otherParticipantId);
    return otherUser?.avatar;
  }

  return undefined;
}

export { type Message, type Conversation, type User };