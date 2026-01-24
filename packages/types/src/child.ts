/**
 * Child-related types for CommonGround
 */

export interface Child {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
}

export interface CreateChildRequest {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface ChildProfileBasic {
  id: string;
  family_file_id: string;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  date_of_birth: string;
  gender: string;
  photo_url?: string;
  approval_status: ChildApprovalStatus;
  approved_by_parent_a: boolean;
  approved_by_parent_b: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChildProfile extends ChildProfileBasic {
  // Medical info
  blood_type?: string;
  allergies?: string[];
  medications?: string[];
  medical_conditions?: string[];
  dietary_restrictions?: string[];
  doctor_name?: string;
  doctor_phone?: string;
  dentist_name?: string;
  dentist_phone?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;

  // Education info
  school_name?: string;
  school_address?: string;
  school_phone?: string;
  grade?: string;
  teacher_name?: string;
  teacher_email?: string;
  bus_number?: string;
  after_school_program?: string;

  // Preferences
  favorite_foods?: string[];
  disliked_foods?: string[];
  favorite_activities?: string[];
  favorite_books?: string[];
  favorite_movies?: string[];
  bedtime_routine?: string;
  comfort_items?: string[];
  fears?: string[];

  // Emergency contacts
  emergency_contacts?: EmergencyContact[];
}

export type ChildApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ChildListResponse {
  items: ChildProfile[];
  total: number;
}

export interface ChildApprovalResponse {
  id: string;
  approval_status: ChildApprovalStatus;
  approved_by_parent_a: boolean;
  approved_by_parent_b: boolean;
  updated_at: string;
}

export interface CreateChildProfileRequest {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  preferred_name?: string;
}

export interface UpdateChildBasicRequest {
  first_name?: string;
  last_name?: string;
  preferred_name?: string;
  date_of_birth?: string;
  gender?: string;
}

export interface UpdateChildMedicalRequest {
  blood_type?: string;
  allergies?: string[];
  medications?: string[];
  medical_conditions?: string[];
  dietary_restrictions?: string[];
  doctor_name?: string;
  doctor_phone?: string;
  dentist_name?: string;
  dentist_phone?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
}

export interface UpdateChildEducationRequest {
  school_name?: string;
  school_address?: string;
  school_phone?: string;
  grade?: string;
  teacher_name?: string;
  teacher_email?: string;
  bus_number?: string;
  after_school_program?: string;
}

export interface UpdateChildPreferencesRequest {
  favorite_foods?: string[];
  disliked_foods?: string[];
  favorite_activities?: string[];
  favorite_books?: string[];
  favorite_movies?: string[];
  bedtime_routine?: string;
  comfort_items?: string[];
  fears?: string[];
}

export interface UpdateChildEmergencyContactsRequest {
  emergency_contacts: EmergencyContact[];
}

export interface ChildPhoto {
  id: string;
  child_id: string;
  photo_url: string;
  caption?: string;
  uploaded_by: string;
  created_at: string;
}

export interface CreateChildPhotoRequest {
  caption?: string;
}

export interface ChildCustodyStatus {
  child_id: string;
  child_name: string;
  current_parent: 'parent_a' | 'parent_b' | 'unknown';
  current_parent_name: string;
  next_exchange?: string;
  next_exchange_time?: string;
}

export interface CustodyStatusResponse {
  children: ChildCustodyStatus[];
  last_updated: string;
}

export interface FamilyFileChild {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  photo_url?: string;
  approval_status: ChildApprovalStatus;
}
