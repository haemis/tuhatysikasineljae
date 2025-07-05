// Telegram Bot Types
export interface TelegramUser {
  id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  language_code?: string;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: {
    id: number;
    type: string;
  };
  text?: string;
  date: number;
}

// Database Types
export interface UserProfile {
  telegram_id: number;
  username?: string;
  name: string;
  title: string;
  description: string;
  github_username?: string;
  linkedin_url?: string;
  website_url?: string;
  world_id?: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  privacy_settings: PrivacySettings;
}

export interface PrivacySettings {
  profile_visible: boolean;
  show_github: boolean;
  show_linkedin: boolean;
  show_website: boolean;
  show_world_id: boolean;
  allow_search: boolean;
  allow_connections: boolean;
}

export interface Connection {
  id: string;
  requester_id: number;
  receiver_id: number;
  status: ConnectionStatus;
  created_at: Date;
  updated_at: Date;
}

export type ConnectionStatus = 'pending' | 'accepted' | 'declined';

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SearchResult {
  user: UserProfile;
  mutual_connections: number;
  is_connected: boolean;
}

export interface ConnectionRequest {
  id: string;
  requester: UserProfile;
  receiver: UserProfile;
  status: ConnectionStatus;
  created_at: Date;
}

// Validation Types
export interface ProfileValidation {
  name: string;
  title: string;
  description: string;
  github_username?: string;
  linkedin_url?: string;
  website_url?: string;
  world_id?: string;
}

// Command Types
export interface BotCommand {
  command: string;
  description: string;
  handler: (ctx: any) => Promise<void>;
}

// Error Types
export interface BotError {
  code: string;
  message: string;
  details?: any;
}

// Configuration Types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export interface BotConfig {
  token: string;
  username: string;
  webhook_url?: string | undefined;
}

export interface AppConfig {
  port: number;
  environment: string;
  log_level: string;
  rate_limit_window_ms: number;
  rate_limit_max_requests: number;
}

// Event Types
export interface UserEvent {
  type: 'profile_created' | 'profile_updated' | 'connection_requested' | 'connection_accepted' | 'connection_declined';
  user_id: number;
  data: any;
  timestamp: Date;
}

// Analytics Types
export interface UserMetrics {
  user_id: number;
  profile_views: number;
  search_queries: number;
  connections_made: number;
  last_active: Date;
}

export interface SystemMetrics {
  total_users: number;
  active_users_24h: number;
  active_users_7d: number;
  total_connections: number;
  search_queries_24h: number;
  average_response_time: number;
} 