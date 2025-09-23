
export type UserStatus = "online" | "away" | "offline";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  status: UserStatus;
  lastSeen?: Date;
}


export interface AuthSession {
  user: User;
  token: string;
  expiresAt: Date;
}

export interface SignUpData {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (data: SignUpData) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}


export interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
