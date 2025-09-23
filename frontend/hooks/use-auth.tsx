"use client"

import { useAuth as useRealAuth, AuthProvider as RealAuthProvider } from "@/lib/auth/context"
import type { ReactNode } from "react"

// Re-export the new auth system with the old interface for backward compatibility
export function AuthProvider({ children }: { children: ReactNode }) {
    return <RealAuthProvider>{children}</RealAuthProvider>
}

export function useAuth() {
    const auth = useRealAuth()

    // Map new auth interface to old interface for backward compatibility
    const signIn = async (email: string, password: string) => {
        try {
            await auth.login({ email, password })
            return {}
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Login failed' }
        }
    }

    const signUp = async (data: { email: string; password: string; displayName: string }) => {
        try {
            await auth.register(data)
            return {}
        } catch (error) {
            return { error: error instanceof Error ? error.message : 'Registration failed' }
        }
    }

    const signInWithGoogle = async () => {
        try {
            const url = await auth.startGoogleLogin()
            window.location.href = url
        } catch (error) {
            throw error
        }
    }

    const signOut = async () => {
        await auth.logout()
    }

    return {
        user: auth.user,
        isLoading: auth.loading,
        isAuthenticated: auth.isAuthenticated,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
    }
}
