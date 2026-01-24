/**
 * User-related types for CommonGround
 */

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  timezone: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  created_at: string;
  is_professional?: boolean;
}

export interface UserProfileUpdate {
  first_name?: string;
  last_name?: string;
  preferred_name?: string;
  phone?: string;
  timezone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

export interface NotificationPreferences {
  email_messages: boolean;
  email_schedule: boolean;
  email_agreements: boolean;
  email_payments: boolean;
  email_court: boolean;
  email_aria: boolean;
  push_messages: boolean;
  push_schedule: boolean;
  push_agreements: boolean;
  push_payments: boolean;
  push_court: boolean;
  push_aria: boolean;
}

export type SubscriptionTier = 'free' | 'essential' | 'complete' | 'premium';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface ParentInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}
