"use client"

import { useAuth } from '@/lib/auth/context'
import { UserProfile, UserProfileCard } from '@/components/auth/user-profile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

export default function HomePage() {
    const { user, isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (isAuthenticated && user) {
        return (
            <div className="min-h-[calc(100vh-3.5rem)] bg-background p-4">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold mb-2">Welcome back, {user.display_name}!</h1>
                        <p className="text-muted-foreground">Your authentication system is working perfectly.</p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <UserProfileCard />

                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                                <CardDescription>What would you like to do today?</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Button className="w-full" asChild>
                                    <Link href="/chat">
                                        <MessageCircle className="mr-2 h-4 w-4" />
                                        Start Chatting
                                    </Link>
                                </Button>

                                <Button variant="outline" className="w-full" asChild>
                                    <Link href="/profile">
                                        View Profile Settings
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        )
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