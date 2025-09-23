import type { User, AuthSession } from '@/types';

const mockUsers: User[] = [
    {
        id: "1",
        email: "demo@example.com",
        name: "Demo User",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face",
        status: "online",
    },
    {
        id: "2",
        email: "alice@example.com",
        name: "Alice Johnson",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=32&h=32&fit=crop&crop=face",
        status: "online",
    },
    {
        id: "3",
        email: "bob@example.com",
        name: "Bob Smith",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face",
        status: "away",
    },
]

class AuthMockService {
    private currentSession: AuthSession | null = null

    constructor() {
        // Load session from localStorage on initialization
        if (typeof window !== "undefined") {
            const savedSession = localStorage.getItem("auth_session")
            if (savedSession) {
                try {
                    const session = JSON.parse(savedSession)
                    if (new Date(session.expiresAt) > new Date()) {
                        this.currentSession = {
                            ...session,
                            expiresAt: new Date(session.expiresAt),
                        }
                    } else {
                        localStorage.removeItem("auth_session")
                    }
                } catch (error) {
                    localStorage.removeItem("auth_session")
                }
            }
        }
    }

    async signIn(email: string, password: string): Promise<{ user: User; token: string } | { error: string }> {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 800))

        const user = mockUsers.find((u) => u.email === email)
        if (!user || password !== "password") {
            return { error: "Invalid email or password" }
        }

        const token = `mock_token_${user.id}_${Date.now()}`
        const session: AuthSession = {
            user,
            token,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        }

        this.currentSession = session
        if (typeof window !== "undefined") {
            localStorage.setItem("auth_session", JSON.stringify(session))
        }

        return { user, token }
    }

    async signUp(data: { name: string; email: string; password: string; avatar?: string }): Promise<
        { user: User; token: string } | { error: string }
    > {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Check if user already exists
        if (mockUsers.find((u) => u.email === data.email)) {
            return { error: "User with this email already exists" }
        }

        const newUser: User = {
            id: `user_${Date.now()}`,
            email: data.email,
            name: data.name,
            avatar:
                data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=6366f1&color=fff`,
            status: "online",
        }

        mockUsers.push(newUser)

        const token = `mock_token_${newUser.id}_${Date.now()}`
        const session: AuthSession = {
            user: newUser,
            token,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }

        this.currentSession = session
        if (typeof window !== "undefined") {
            localStorage.setItem("auth_session", JSON.stringify(session))
        }

        return { user: newUser, token }
    }

    async signInWithGoogle(): Promise<{ user: User; token: string }> {
        // Simulate OAuth flow delay
        await new Promise((resolve) => setTimeout(resolve, 1200))

        const googleUser: User = {
            id: "google_demo_user",
            email: "demo.google@gmail.com",
            name: "Google Demo User",
            avatar: "https://lh3.googleusercontent.com/a/default-user=s32-c",
            status: "online",
        }

        const token = `mock_google_token_${Date.now()}`
        const session: AuthSession = {
            user: googleUser,
            token,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }

        this.currentSession = session
        if (typeof window !== "undefined") {
            localStorage.setItem("auth_session", JSON.stringify(session))
        }

        return { user: googleUser, token }
    }

    async signOut(): Promise<void> {
        this.currentSession = null
        if (typeof window !== "undefined") {
            localStorage.removeItem("auth_session")
        }
    }

    getSession(): AuthSession | null {
        return this.currentSession
    }

    isAuthenticated(): boolean {
        return this.currentSession !== null && new Date() < this.currentSession.expiresAt
    }
}

export const authMock = new AuthMockService()
