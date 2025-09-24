'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/context';
import { loadGoogleScript, isGoogleScriptReady, type GoogleButtonConfig } from '@/lib/google-signin/script-loader';

// Global flag to prevent multiple initializations
let googleInitialized = false;

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  disabled?: boolean;
  className?: string;
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  theme = 'outline',
  size = 'large',
  text = 'signin_with',
  shape = 'rectangular',
  disabled = false,
  className,
}: GoogleSignInButtonProps) {
  const { loginWithGoogleIdToken } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleCredentialResponse = useCallback(async (response: { credential: string }) => {
    try {
      setIsLoading(true);
      await loginWithGoogleIdToken(response.credential);
      onSuccess?.();
    } catch (err) {
      console.error('Google Sign-In failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Google Sign-In failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [loginWithGoogleIdToken, onSuccess, onError]);

  useEffect(() => {
    if (!clientId) {
      setError('Google Client ID not configured');
      setIsLoading(false);
      return;
    }

    const initializeGoogleSignIn = async () => {
      try {
        await loadGoogleScript();

        if (!isGoogleScriptReady()) {
          throw new Error('Google script not ready');
        }

        // Only initialize once globally
        if (!googleInitialized) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          googleInitialized = true;
        }

        if (buttonRef.current) {
          // Clear any existing content
          buttonRef.current.innerHTML = '';

          const buttonConfig: GoogleButtonConfig = {
            theme,
            size,
            text,
            shape,
            width: 300,
          };

          window.google.accounts.id.renderButton(buttonRef.current, buttonConfig);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize Google Sign-In:', err);
        setError('Failed to load Google Sign-In');
        setIsLoading(false);
        onError?.('Failed to load Google Sign-In');
      }
    };

    initializeGoogleSignIn();
  }, [clientId, theme, size, text, shape, handleCredentialResponse, onError]);

  if (!clientId) {
    return (
      <div className={`text-red-500 text-sm ${className}`}>
        Google Client ID not configured
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-500 text-sm ${className}`}>
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-2 ${className}`}>
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
        <span className="ml-2 text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        ref={buttonRef}
        style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
      />
    </div>
  );
}

