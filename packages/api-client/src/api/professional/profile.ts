/**
 * Professional Profile API
 *
 * Profile management for legal professionals
 */

import { fetchWithParentAuth } from '../../core';
import type { ProfessionalType } from './auth';

export interface ProfessionalProfile {
  id: string;
  user_id: string;
  professional_type: ProfessionalType;
  license_number?: string;
  license_state?: string;
  license_verified: boolean;
  license_verified_at?: string;
  credentials?: Record<string, unknown>;
  practice_areas?: string[];
  professional_email?: string;
  professional_phone?: string;
  default_intake_template?: string;
  notification_preferences?: Record<string, boolean>;
  is_active: boolean;
  onboarded_at?: string;
  created_at: string;
  updated_at: string;
  // User info
  user_first_name?: string;
  user_last_name?: string;
  user_email?: string;
}

export interface ProfessionalProfileUpdate {
  professional_type?: ProfessionalType;
  license_number?: string;
  license_state?: string;
  credentials?: Record<string, unknown>;
  practice_areas?: string[];
  professional_email?: string;
  professional_phone?: string;
  default_intake_template?: string;
  notification_preferences?: Record<string, boolean>;
}

export interface FirmMembership {
  id: string;
  professional_id?: string;
  firm_id: string;
  role: FirmRole;
  custom_permissions?: Record<string, boolean>;
  status: MembershipStatus;
  invited_at?: string;
  joined_at?: string;
  invited_by?: string;
  invite_email?: string;
  professional_name?: string;
  professional_email?: string;
  professional_type?: ProfessionalType;
  firm_name?: string;
  firm_slug?: string;
}

export type FirmRole = 'owner' | 'admin' | 'attorney' | 'paralegal' | 'staff';
export type MembershipStatus = 'pending' | 'active' | 'suspended' | 'removed';

export interface ProfessionalProfileWithFirms extends ProfessionalProfile {
  firms: FirmMembership[];
}

/**
 * Get current professional's profile
 */
export async function getProfile(): Promise<ProfessionalProfileWithFirms> {
  return fetchWithParentAuth<ProfessionalProfileWithFirms>('/professional/profile');
}

/**
 * Update professional profile
 */
export async function updateProfile(data: ProfessionalProfileUpdate): Promise<ProfessionalProfile> {
  return fetchWithParentAuth<ProfessionalProfile>('/professional/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Complete professional onboarding
 */
export async function completeOnboarding(data: {
  professional_type: ProfessionalType;
  license_number?: string;
  license_state?: string;
  practice_areas?: string[];
  professional_email?: string;
  professional_phone?: string;
}): Promise<ProfessionalProfile> {
  return fetchWithParentAuth<ProfessionalProfile>('/professional/profile/onboard', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Request license verification
 */
export async function requestLicenseVerification(): Promise<{ message: string; status: string }> {
  return fetchWithParentAuth('/professional/profile/verify-license', {
    method: 'POST',
  });
}
