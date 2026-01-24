/**
 * Message types for CommonGround
 */

export interface Message {
  id?: string;
  case_id?: string | null;
  family_file_id?: string | null;
  agreement_id?: string | null;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: MessageType;
  sent_at: string;
  read_at?: string | null;
  acknowledged_at?: string | null;
  was_flagged: boolean;
  original_content?: string;
  thread_id?: string;
  attachments?: MessageAttachment[];
}

export type MessageType = 'text' | 'system' | 'aria_intervention' | 'agreement_update';

export interface MessageAttachment {
  id: string;
  message_id: string;
  family_file_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_category: string;
  storage_path: string;
  storage_url: string;
  sha256_hash: string;
  virus_scanned: boolean;
  uploaded_by: string;
  uploaded_at: string;
}

export interface SendMessageRequest {
  case_id?: string;
  family_file_id?: string;
  agreement_id?: string;
  recipient_id: string;
  content: string;
  thread_id?: string;
  message_type?: string;
}

export interface ARIAAnalysisResponse {
  toxicity_level: ToxicityLevel;
  toxicity_score: number;
  categories: string[];
  triggers: string[];
  explanation: string;
  suggestion: string | null;
  is_flagged: boolean;
  block_send?: boolean;
}

export type ToxicityLevel = 'green' | 'yellow' | 'orange' | 'red';

export interface ARIASettings {
  id: string;
  family_file_id: string;
  sensitivity_level: ARIASensitivityLevel;
  auto_block_severe: boolean;
  notification_threshold: ToxicityLevel;
  created_at: string;
  updated_at: string;
}

export type ARIASensitivityLevel = 'strict' | 'moderate' | 'relaxed' | 'off';

export interface ARIAMetrics {
  total_messages: number;
  flagged_messages: number;
  blocked_messages: number;
  intervention_count: number;
  average_toxicity: number;
  categories: Record<string, number>;
}

export interface ARIAIntervention {
  id: string;
  message_id?: string;
  session_id?: string;
  family_file_id: string;
  intervention_type: 'warning' | 'block' | 'mute' | 'terminate';
  toxicity_level: ToxicityLevel;
  toxicity_score: number;
  categories: string[];
  message_shown: string;
  created_at: string;
}
