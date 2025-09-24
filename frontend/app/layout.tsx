import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Suspense } from "react"
import "./globals.css"
import { AuthProvider } from "@/lib/auth/context"
import { ChatProvider } from "@/hooks/use-chat"

export const metadata: Metadata = {
    title: "PainChat",
    description: "A sleek, modern chat application",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" className="dark">
            <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
                <Suspense fallback={null}>
                    <AuthProvider>
                        <ChatProvider>
                            {children}
                        </ChatProvider>
                    </AuthProvider>
                </Suspense >
            </body>
        </html>
    )
}
