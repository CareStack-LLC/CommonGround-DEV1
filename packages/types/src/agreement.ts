/**
 * Agreement types for CommonGround
 */

export interface Agreement {
  id: string;
  case_id: string | null;
  family_file_id: string | null;
  title: string;
  version: number;
  agreement_version: AgreementVersion;
  status: AgreementStatus;
  petitioner_approved: boolean;
  respondent_approved: boolean;
  approved_by_a?: string | null;
  approved_by_b?: string | null;
  approved_at_a?: string | null;
  approved_at_b?: string | null;
  effective_date?: string | null;
  pdf_url?: string | null;
  created_at: string;
  updated_at: string;
}

export type AgreementVersion = 'v1' | 'v2_standard' | 'v2_lite';
export type AgreementStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'expired' | 'active';

export interface AgreementSection {
  id: string;
  agreement_id: string;
  section_number: string;
  section_title: string;
  section_type: string;
  content: string;
  structured_data?: Record<string, unknown>;
  display_order: number;
  is_required: boolean;
  is_completed: boolean;
}

export interface CreateAgreementRequest {
  case_id: string;
  title: string;
  agreement_type?: string;
}

export interface UpdateSectionRequest {
  content?: string;
  section_number?: number | string;
  section_title?: string;
  structured_data?: Record<string, unknown>;
}

export interface AgreementWithSections {
  agreement: Agreement;
  sections: AgreementSection[];
  completion_percentage: number;
}

export interface AgreementQuickSummary {
  id: string;
  title: string;
  status: AgreementStatus;
  completion_percentage: number;
  last_updated: string;
}

export interface QuickAccord {
  id: string;
  family_file_id: string;
  title: string;
  topic: string;
  status: QuickAccordStatus;
  initiated_by: string;
  initiated_by_name?: string;
  conversation_summary?: string;
  final_agreement?: string;
  parent_a_agreed: boolean;
  parent_b_agreed: boolean;
  agreed_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export type QuickAccordStatus = 'active' | 'agreed' | 'expired' | 'cancelled';

export interface QuickAccordCreate {
  title: string;
  topic: string;
  initial_message?: string;
  expires_in_days?: number;
}

export interface ARIAConversationResponse {
  message: string;
  suggestions?: string[];
  is_agreement_ready?: boolean;
  proposed_agreement?: string;
}
