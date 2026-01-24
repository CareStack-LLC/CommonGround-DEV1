/**
 * Family File types for CommonGround
 */

import type { ParentInfo } from './user';
import type { FamilyFileChild } from './child';

export interface FamilyFile {
  id: string;
  case_id?: string;
  family_name: string;
  state?: string;
  status: FamilyFileStatus;
  parent_a_id: string;
  parent_b_id?: string;
  parent_a?: ParentInfo;
  parent_b?: ParentInfo;
  invitation_token?: string;
  invitation_email?: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyFileDetail extends FamilyFile {
  children?: FamilyFileChild[];
  has_agreement?: boolean;
}

export type FamilyFileStatus = 'pending' | 'active' | 'archived';

export interface FamilyFileCreate {
  family_name: string;
  state?: string;
  other_parent_email?: string;
  children?: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
  }[];
}

export interface FamilyFileUpdate {
  family_name?: string;
  state?: string;
}

export interface FamilyFileInvitation {
  id: string;
  family_file_id: string;
  email: string;
  token: string;
  expires_at: string;
  accepted_at?: string;
}

export interface ProfessionalAccess {
  id: string;
  family_file_id: string;
  professional_id: string;
  professional_name: string;
  professional_type: string;
  firm_name?: string;
  access_type: ProfessionalAccessType;
  granted_by: string;
  granted_at: string;
  expires_at?: string;
  is_active: boolean;
}

export type ProfessionalAccessType = 'read_only' | 'read_write' | 'full';

export interface ProfessionalAccessRequest {
  professional_id: string;
  access_type: ProfessionalAccessType;
  expires_at?: string;
  notes?: string;
}
