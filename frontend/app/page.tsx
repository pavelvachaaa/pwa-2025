"use client"

import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { ChatLayout } from '@/components/chat-layout'

export default function HomePage() {
    const { user, isAuthenticated, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (isAuthenticated && user) {
        return <ChatLayout></ChatLayout>
    }

    return (
        <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-full bg-primary/10">
                            <MessageCircle className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-semibold">Welcome to PainChat</CardTitle>
                    <CardDescription>
                        A modern chat application with secure authentication
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button className="w-full" asChild>
                        <Link href="/auth/login">Sign In</Link>
                    </Button>

                    <Button variant="outline" className="w-full" asChild>
                        <Link href="/auth/register">Create Account</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}