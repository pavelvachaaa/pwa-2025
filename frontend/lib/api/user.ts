import { User } from '@/types';
import { api, type ApiResponse } from './api';

const USER_API_PREFIX = "/users";

export const usersApi = {
    async getAllUsers(limit = 20): Promise<ApiResponse<User[]>> {
        try {
            const response = await api.get(USER_API_PREFIX, {
                params: { limit: limit.toString() }
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.error || error.message || 'Failed to get users'
            };
        }
    },

    async searchUsers(query: string, limit = 20): Promise<ApiResponse<User[]>> {
        try {
            const response = await api.get(`${USER_API_PREFIX}/search`, {
                params: { q: query, limit: limit.toString() }
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.error || error.message || 'Failed to search users'
            };
        }
    },

    async getUsersPresence(userIds: string[]): Promise<ApiResponse<any[]>> {
        try {
            const response = await api.get(`${USER_API_PREFIX}/presence`, {
                params: { userIds: userIds.join(',') }
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.response?.data?.error || error.message || 'Failed to get presence'
            };
        }
    }
}