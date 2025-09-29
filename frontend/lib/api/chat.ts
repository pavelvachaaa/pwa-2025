import { api, ApiResponse } from './api';
import type { Conversation, Message, User } from '@/types';

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

  async createConversation(targetUserId: string): Promise<ApiResponse<Conversation>> {
    try {
      const response = await api.post('/chat/conversations', { targetUserId });
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

};