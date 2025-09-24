
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

export type WSMessageType = 
  | "message:new" 
  | "message:updated" 
  | "message:read" 
  | "typing" 
  | "presence" 
  | "conversation:updated";

export interface WSMessage {
  type: WSMessageType;
  payload: any;
  timestamp: Date;
}

export interface WSClientConfig {
  url?: string;
  token?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export type WSEventHandler = (data: any) => void;



