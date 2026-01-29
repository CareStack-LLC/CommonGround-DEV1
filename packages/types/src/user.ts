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

export type SubscriptionTier = 'free' | 'essential' | 'complete' | 'premium' | 'web_starter' | 'plus';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'trial' | 'grant';

/**
 * Subscription information with feature flags
 */
export interface Subscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  mobile_access: boolean;
  video_calls_enabled: boolean;
  aria_enabled: boolean;
  max_children: number;
  clearfund_fee_exempt: boolean;
  expires_at?: string;
  trial_ends_at?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  is_grant?: boolean;
  grant_nonprofit?: string;
}

/**
 * Extended user with subscription details
 */
export interface UserWithSubscription extends User {
  subscription: Subscription;
  profile?: UserProfile;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

// Alias for compatibility
export type RegisterCredentials = RegisterRequest;

export interface LoginRequest {
  email: string;
  password: string;
}

// Alias for compatibility
export type LoginCredentials = LoginRequest;

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
  subscription?: Subscription;
  requires_mfa?: boolean;
  mfa_token?: string;
}

/**
 * OAuth login request
 */
export interface OAuthLoginRequest {
  provider: 'google' | 'apple';
  id_token: string;
  access_token?: string;
  nonce?: string;
}

/**
 * MFA verification request
 */
export interface MFAVerifyRequest {
  mfa_token: string;
  code: string;
  factor_id?: string;
}

/**
 * Biometric credential storage
 */
export interface BiometricCredentials {
  email: string;
  encrypted_password: string;
  last_used: string;
}

/**
 * Push notification token registration
 */
export interface PushTokenRegistration {
  token: string;
  platform: 'ios' | 'android' | 'web';
  device_name?: string;
}

export interface ParentInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}
