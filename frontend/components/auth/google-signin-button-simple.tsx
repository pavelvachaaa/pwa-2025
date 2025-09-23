'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth/context';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
}

declare global {
  interface Window {
    google: any;
    onGoogleScriptLoad: () => void;
  }
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  disabled = false,
  className,
  text = 'signin_with',
}: GoogleSignInButtonProps) {
  const { loginWithGoogleIdToken } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scriptLoadedRef = useRef(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) {
      setError('Google Client ID not configured');
      setIsLoading(false);
      return;
    }

    // Check if Google script is already loaded
    if (window.google && window.google.accounts) {
      scriptLoadedRef.current = true;
      renderButton();
      return;
    }

    if (scriptLoadedRef.current) {
      return;
    }

    // Check if script is already in the page
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      // Wait a bit for it to load
      const checkGoogleLoaded = () => {
        if (window.google && window.google.accounts) {
          scriptLoadedRef.current = true;
          renderButton();
        } else {
          setTimeout(checkGoogleLoaded, 100);
        }
      };
      checkGoogleLoaded();
      return;
    }

    // Load Google script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      scriptLoadedRef.current = true;
      // Small delay to ensure Google object is ready
      setTimeout(() => {
        if (window.google && window.google.accounts) {
          renderButton();
        } else {
          setError('Google Sign-In failed to initialize');
          setIsLoading(false);
        }
      }, 100);
    };

    script.onerror = () => {
      setError('Failed to load Google Sign-In');
      setIsLoading(false);
    };

    document.head.appendChild(script);
  }, [clientId]);

  const renderButton = () => {
    console.log('renderButton called', {
      googleExists: !!window.google,
      accountsExists: !!(window.google && window.google.accounts),
      buttonRefExists: !!buttonRef.current,
      clientId
    });

    if (!window.google || !window.google.accounts || !buttonRef.current || !clientId) {
      console.log('Missing requirements for button render');
      return;
    }

    try {
      console.log('Initializing Google Sign-In...');
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
      });

      buttonRef.current.innerHTML = '';

      console.log('Rendering Google button...');
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: text,
        shape: 'rectangular',
        width: 300,
      });

      console.log('Google button rendered successfully');
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to render Google button:', err);
      setError('Failed to load Google Sign-In');
      setIsLoading(false);
    }
  };

  const handleCredentialResponse = async (response: { credential: string }) => {
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
  };

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
      <div className={`flex items-center justify-center p-3 border rounded-lg ${className}`}>
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
        <span className="ml-2 text-sm text-gray-600">Loading Google Sign-In...</span>
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