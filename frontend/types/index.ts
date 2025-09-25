
export type UserStatus = "online" | "away" | "offline";

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  status?: UserStatus;
  last_seen?: string;
}


export interface AuthSession {
  user: User;
  token: string;
  expiresAt: Date;
}

export interface SignUpData {
  display_name: string;
  email: string;
  password: string;
  avatar_url?: string;
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



export interface ChatContextType {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  users: User[];
  isConnected: boolean;
  connectionState: string;
  sendMessage: (conversationId: string, content: string, replyTo?: string) => void;
  subscribeToConversation: (conversationId: string) => void;
  unsubscribeFromConversation: (conversationId: string) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  markAsRead: (conversationId: string) => void;
  createConversation: (userId: string) => string;
  addReaction: (messageId: string, emoji: string) => void;
  removeReaction: (messageId: string, emoji: string) => void;
  editMessage: (messageId: string, newContent: string) => void;
  deleteMessage: (messageId: string) => void;
  pinMessage: (messageId: string) => void;
  unpinMessage: (messageId: string) => void;
  saveDraft: (conversationId: string, draft: string) => void;
  getDraft: (conversationId: string) => string;
}

export interface MessageComposerProps {
  conversationId: string;
  onSendMessage: (content: string, replyTo?: string) => void;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  isConnected: boolean;
  className?: string;
  replyingTo?: Message;
  onCancelReply?: () => void;
}

export interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  onReply?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  className?: string;
}

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
}

export type MessageType = "text" | "image" | "file";

export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface MessageReadStatus {
  userId: string;
  readAt: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  message_type: MessageType;
  reactions?: MessageReaction[];
  reply_to?: string;
  is_edited?: boolean;
  edited_at?: string;
  readBy?: MessageReadStatus[];
  isPinned?: boolean;
  pinnedAt?: Date;
  pinnedBy?: string;
}

export interface Conversation {
  id: string;
  user_a_id: string;
  user_b_id: string;
  avatar_url?: string;
  participants: User[];
  other_participant: User;
  last_message?: Message;
  unread_count: number;
  isTyping?: string[];
  created_at: string;
  updated_at: string;
  draft?: string;
}