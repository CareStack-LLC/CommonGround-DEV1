/**
 * Circle Contact types for CommonGround
 *
 * Circle contacts are approved adults (grandparents, relatives, etc.)
 * who can communicate with children through KidComs.
 */

export interface CircleContact {
  id: string;
  family_file_id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  email: string;
  phone?: string;
  photo_url?: string;
  approval_status: CircleApprovalStatus;
  approved_by_parent_a: boolean;
  approved_by_parent_b: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Child connections
  connected_children?: string[];
  has_user_account?: boolean;
}

export type CircleApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface CircleContactCreate {
  first_name: string;
  last_name: string;
  relationship: string;
  email: string;
  phone?: string;
  child_ids?: string[];
}

export interface CircleContactUpdate {
  first_name?: string;
  last_name?: string;
  relationship?: string;
  phone?: string;
  is_active?: boolean;
}

export interface CircleContactList {
  items: CircleContact[];
  total: number;
}

export interface RelationshipChoice {
  value: string;
  label: string;
}

export interface CirclePermission {
  id: string;
  circle_contact_id: string;
  child_id: string;
  family_file_id: string;
  // Feature permissions
  can_video_call: boolean;
  can_voice_call: boolean;
  can_chat: boolean;
  can_theater: boolean;
  // Time restrictions
  allowed_days?: number[]; // [0-6] for Sun-Sat
  allowed_start_time?: string; // "09:00"
  allowed_end_time?: string; // "20:00"
  // Session restrictions
  max_call_duration_minutes: number;
  require_parent_present: boolean;
  // Audit
  set_by_parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CirclePermissionList {
  items: CirclePermission[];
}

export interface CircleUser {
  id: string;
  circle_contact_id: string;
  email: string;
  email_verified: boolean;
  last_login?: string;
  is_active: boolean;
  created_at: string;
}

export interface CircleUserInvite {
  id: string;
  circle_contact_id: string;
  email: string;
  token: string;
  expires_at: string;
  accepted_at?: string;
  status: 'pending' | 'accepted' | 'expired';
}

export interface CircleLoginResponse {
  access_token: string;
  token_type: string;
  circle_user: CircleUser;
  circle_contact: CircleContact;
  family_file_id: string;
  connected_children: ChildContact[];
}

export interface ChildContact {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
  avatar_id?: string;
  permissions?: CirclePermission;
}
