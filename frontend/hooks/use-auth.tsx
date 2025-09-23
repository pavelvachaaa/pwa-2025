"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { authMock } from "@/lib/auth-mock"
import type { User, AuthContextType, SignUpData } from "@/types"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Check for existing session on mount
        const session = authMock.getSession()
        if (session && authMock.isAuthenticated()) {
            setUser(session.user)
        }
        setIsLoading(false)
    }, [])

    const signIn = async (email: string, password: string) => {
        setIsLoading(true)
        try {
            const result = await authMock.signIn(email, password)
            if ("error" in result) {
                return { error: result.error }
            }
            setUser(result.user)
            return {}
        } finally {
            setIsLoading(false)
        }
    }

    const signUp = async (data: SignUpData) => {
        setIsLoading(true)
        try {
            const result = await authMock.signUp(data)
            if ("error" in result) {
                return { error: result.error }
            }
            setUser(result.user)
            return {}
        } finally {
            setIsLoading(false)
        }
    }

    const signInWithGoogle = async () => {
        setIsLoading(true)
        try {
            const result = await authMock.signInWithGoogle()
            setUser(result.user)
        } finally {
            setIsLoading(false)
        }
    }

    const signOut = async () => {
        await authMock.signOut()
        setUser(null)
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                signIn,
                signUp,
                signInWithGoogle,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    return context
}
