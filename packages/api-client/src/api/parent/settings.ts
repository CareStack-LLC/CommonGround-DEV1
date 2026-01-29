/**
 * Settings API - User profile and notification preferences
 */

import { apiRequest, getDefaultHeaders } from "../../core/fetch";

export interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  timezone: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  subscription_tier: string;
  subscription_status: string;
  created_at: string;
  is_professional: boolean;
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
  // Email notifications
  email_messages: boolean;
  email_schedule: boolean;
  email_agreements: boolean;
  email_payments: boolean;
  email_court: boolean;
  email_aria: boolean;
  // Push notifications
  push_messages: boolean;
  push_schedule: boolean;
  push_agreements: boolean;
  push_payments: boolean;
  push_court: boolean;
  push_aria: boolean;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface PasswordChangeResponse {
  message: string;
  success: boolean;
}

/**
 * Get current user's profile
 */
export async function getProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>("/users/me/profile", {
    method: "GET",
    headers: await getDefaultHeaders(),
  });
}

/**
 * Update current user's profile
 */
export async function updateProfile(
  data: UserProfileUpdate
): Promise<UserProfile> {
  return apiRequest<UserProfile>("/users/me/profile", {
    method: "PUT",
    headers: await getDefaultHeaders(),
    body: JSON.stringify(data),
  });
}

/**
 * Get notification preferences
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>("/users/me/notifications", {
    method: "GET",
    headers: await getDefaultHeaders(),
  });
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  preferences: NotificationPreferences
): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>("/users/me/notifications", {
    method: "PUT",
    headers: await getDefaultHeaders(),
    body: JSON.stringify(preferences),
  });
}

/**
 * Change password
 */
export async function changePassword(
  request: PasswordChangeRequest
): Promise<PasswordChangeResponse> {
  return apiRequest<PasswordChangeResponse>("/users/me/password", {
    method: "PUT",
    headers: await getDefaultHeaders(),
    body: JSON.stringify(request),
  });
}

export interface PrivacySettings {
  read_receipts: boolean;
  typing_indicator: boolean;
  last_seen: boolean;
  analytics_enabled: boolean;
  crash_reporting: boolean;
}

/**
 * Get privacy settings
 */
export async function getPrivacySettings(): Promise<PrivacySettings> {
  return apiRequest<PrivacySettings>("/users/me/privacy", {
    method: "GET",
    headers: await getDefaultHeaders(),
  });
}

/**
 * Update privacy settings
 */
export async function updatePrivacySettings(
  settings: PrivacySettings
): Promise<PrivacySettings> {
  return apiRequest<PrivacySettings>("/users/me/privacy", {
    method: "PUT",
    headers: await getDefaultHeaders(),
    body: JSON.stringify(settings),
  });
}
