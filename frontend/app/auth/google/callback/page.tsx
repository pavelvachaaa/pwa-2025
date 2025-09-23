"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

export default function GoogleCallbackPage() {
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loginWithGoogle } = useAuth()

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const error = searchParams.get('error')

      if (error) {
        setError(`Google authentication failed: ${error}`)
        setIsProcessing(false)
        return
      }

      if (!code) {
        setError('No authorization code received from Google')
        setIsProcessing(false)
        return
      }

      try {
        const redirectUri = `${window.location.origin}/auth/google/callback`
        await loginWithGoogle(code, redirectUri)
        router.push('/')
      } catch (error) {
        console.error('Google login error:', error)
        setError(error instanceof Error ? error.message : 'Google login failed')
        setIsProcessing(false)
      }
    }

    handleCallback()
  }, [searchParams, loginWithGoogle, router])

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold">Signing you in</CardTitle>
            <CardDescription>Please wait while we complete your Google sign-in...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">Sign-in failed</CardTitle>
          <CardDescription>There was an error signing you in with Google</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="text-center">
            <button
              onClick={() => router.push('/auth/login')}
              className="text-primary hover:underline"
            >
              Return to login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}