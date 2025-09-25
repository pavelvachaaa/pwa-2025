import { api, ApiResponse } from './api';
import type { Conversation, Message, User } from '@/types';

interface ConversationsResponse {
  conversations: Conversation[];
}

interface MessagesResponse {
  messages: Message[];
}

interface CreateConversationRequest {
  targetUserId?: string;
  name?: string;
  participants?: string[];
  avatarUrl?: string;
}

interface SendMessageRequest {
  conversationId: string;
  content: string;
  messageType?: string;
  replyTo?: string;
}

interface SearchUsersResponse {
  users: User[];
}

export const chatApi = {
  // Conversations
  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    try {
      const response = await api.get('/chat/conversations');
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch conversations'
      };
    }
  },

  async createDirectConversation(targetUserId: string): Promise<ApiResponse<Conversation>> {
    try {
      const response = await api.post('/chat/conversations/direct', { targetUserId });
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to create conversation'
      };
    }
  },

  async createGroupConversation(data: CreateConversationRequest): Promise<ApiResponse<Conversation>> {
    try {
      const response = await api.post('/chat/conversations/group', data);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to create group conversation'
      };
    }
  },

  // Messages
  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<ApiResponse<Message[]>> {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/messages`, {
        params: { limit: limit.toString(), offset: offset.toString() }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch messages'
      };
    }
  },

  async sendMessage(data: SendMessageRequest): Promise<ApiResponse<Message>> {
    try {
      const response = await api.post('/chat/messages', data);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to send message'
      };
    }
  },

  async editMessage(messageId: string, content: string): Promise<ApiResponse<Message>> {
    try {
      const response = await api.put(`/chat/messages/${messageId}`, { content });
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to edit message'
      };
    }
  },

  async deleteMessage(messageId: string): Promise<ApiResponse<void>> {
    try {
      await api.delete(`/chat/messages/${messageId}`);
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to delete message'
      };
    }
  },

  // Message interactions
  async addReaction(messageId: string, emoji: string): Promise<ApiResponse<void>> {
    try {
      await api.post(`/chat/messages/${messageId}/reactions`, { emoji });
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to add reaction'
      };
    }
  },

  async removeReaction(messageId: string, emoji: string): Promise<ApiResponse<void>> {
    try {
      await api.delete(`/chat/messages/${messageId}/reactions`, {
        body: JSON.stringify({ emoji }),
        headers: { 'Content-Type': 'application/json' }
      });
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to remove reaction'
      };
    }
  },

  // Read status
  async markAsRead(conversationId: string): Promise<ApiResponse<void>> {
    try {
      await api.post(`/chat/conversations/${conversationId}/read`);
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to mark as read'
      };
    }
  },

  // Drafts
  async getDraft(conversationId: string): Promise<ApiResponse<string>> {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/draft`);
      return {
        success: true,
        data: response.data.content || ''
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get draft'
      };
    }
  },

  async saveDraft(conversationId: string, content: string): Promise<ApiResponse<void>> {
    try {
      await api.post(`/chat/conversations/${conversationId}/draft`, { content });
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to save draft'
      };
    }
  },

};