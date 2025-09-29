let isGoogleScriptLoaded = false;
let isGoogleScriptLoading = false;
const loadPromises: Promise<void>[] = [];

export function loadGoogleScript(): Promise<void> {
  if (isGoogleScriptLoaded) {
    return Promise.resolve();
  }

  if (isGoogleScriptLoading) {
    const existingPromise = loadPromises[loadPromises.length - 1];
    if (existingPromise) {
      return existingPromise;
    }
  }

  isGoogleScriptLoading = true;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isGoogleScriptLoaded = true;
      isGoogleScriptLoading = false;
      resolve();
    };

    script.onerror = () => {
      isGoogleScriptLoading = false;
      reject(new Error('Failed to load Google Sign-In script'));
    };

    document.head.appendChild(script);
  });

  loadPromises.push(promise);
  return promise;
}

export function isGoogleScriptReady(): boolean {
  return isGoogleScriptLoaded && typeof window !== 'undefined' && !!window.google;
}

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: GoogleInitConfig) => void;
          renderButton: (element: HTMLElement, config: GoogleButtonConfig) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

export interface GoogleInitConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

export interface GoogleButtonConfig {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
}

export interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
  client_id?: string;
}