/**
 * ClearFund API Client for Parents
 *
 * Expense tracking and financial management between co-parents.
 * Features:
 * - Create obligations (shared expenses)
 * - Track funding and contributions
 * - Upload receipts and verification
 * - View balance and ledger
 */

import { fetchWithParentAuth } from '../../core';

// ============================================================
// Types
// ============================================================

export type ObligationPurpose =
  | 'medical'
  | 'education'
  | 'sports'
  | 'device'
  | 'camp'
  | 'clothing'
  | 'transportation'
  | 'child_support'
  | 'extracurricular'
  | 'childcare'
  | 'other';

export type ObligationStatus =
  | 'pending_funding'
  | 'partially_funded'
  | 'fully_funded'
  | 'in_progress'
  | 'pending_verification'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type PaymentMethod = 'card' | 'bank_transfer' | 'existing_credit';

export interface Obligation {
  id: string;
  family_file_id: string;
  created_by_id: string;
  child_id?: string;
  purpose: ObligationPurpose;
  description: string;
  total_amount: number;
  parent_a_share: number;
  parent_b_share: number;
  parent_a_funded: number;
  parent_b_funded: number;
  balance_remaining: number;
  status: ObligationStatus;
  due_date?: string;
  vendor_name?: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  created_at: string;
  updated_at: string;
  child_name?: string;
  created_by_name?: string;
}

export interface ObligationFunding {
  id: string;
  obligation_id: string;
  funded_by_id: string;
  amount: number;
  payment_method: PaymentMethod;
  stripe_payment_intent_id?: string;
  notes?: string;
  created_at: string;
  funded_by_name?: string;
}

export interface VerificationArtifact {
  id: string;
  obligation_id: string;
  type: 'transaction' | 'receipt' | 'vendor_confirmation' | 'manual';
  file_url?: string;
  description?: string;
  verified_amount?: number;
  uploaded_by_id: string;
  created_at: string;
  uploaded_by_name?: string;
}

export interface LedgerEntry {
  id: string;
  family_file_id: string;
  obligation_id?: string;
  entry_type: 'funding' | 'spending' | 'refund' | 'adjustment';
  amount: number;
  running_balance: number;
  description: string;
  parent_id: string;
  created_at: string;
  parent_name?: string;
  obligation_description?: string;
}

export interface BalanceSummary {
  family_file_id: string;
  parent_a_id: string;
  parent_b_id: string;
  parent_a_total_funded: number;
  parent_b_total_funded: number;
  parent_a_total_owed: number;
  parent_b_total_owed: number;
  net_balance: number; // Positive = parent_a owes parent_b
  pending_obligations_count: number;
  total_obligations_amount: number;
}

// ============================================================
// Obligation Management
// ============================================================

/**
 * Create a new shared expense obligation
 */
export async function createObligation(data: {
  family_file_id: string;
  child_id?: string;
  purpose: ObligationPurpose;
  description: string;
  total_amount: number;
  parent_a_share_percent?: number; // Default 50%
  due_date?: string;
  vendor_name?: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
}): Promise<Obligation> {
  return fetchWithParentAuth('/clearfund/obligations', {
    method: 'POST',
    body: data,
  });
}

/**
 * Get all obligations for a family
 */
export async function getObligations(
  familyFileId: string,
  filters?: {
    status?: ObligationStatus;
    purpose?: ObligationPurpose;
    child_id?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ items: Obligation[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.purpose) params.set('purpose', filters.purpose);
  if (filters?.child_id) params.set('child_id', filters.child_id);
  if (filters?.limit) params.set('limit', filters.limit.toString());
  if (filters?.offset) params.set('offset', filters.offset.toString());
  const query = params.toString() ? `?${params}` : '';
  return fetchWithParentAuth(`/clearfund/obligations/family/${familyFileId}${query}`);
}

/**
 * Get a specific obligation
 */
export async function getObligation(obligationId: string): Promise<Obligation> {
  return fetchWithParentAuth(`/clearfund/obligations/${obligationId}`);
}

/**
 * Update an obligation
 */
export async function updateObligation(
  obligationId: string,
  data: {
    description?: string;
    due_date?: string;
    vendor_name?: string;
  }
): Promise<Obligation> {
  return fetchWithParentAuth(`/clearfund/obligations/${obligationId}`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * Cancel an obligation
 */
export async function cancelObligation(
  obligationId: string,
  reason: string
): Promise<Obligation> {
  return fetchWithParentAuth(`/clearfund/obligations/${obligationId}/cancel`, {
    method: 'POST',
    body: { reason },
  });
}

// ============================================================
// Funding
// ============================================================

/**
 * Record a funding contribution
 */
export async function recordFunding(data: {
  obligation_id: string;
  amount: number;
  payment_method: PaymentMethod;
  notes?: string;
}): Promise<ObligationFunding> {
  return fetchWithParentAuth('/clearfund/funding', {
    method: 'POST',
    body: data,
  });
}

/**
 * Get funding history for an obligation
 */
export async function getFundingHistory(
  obligationId: string
): Promise<{ items: ObligationFunding[]; total: number }> {
  return fetchWithParentAuth(`/clearfund/obligations/${obligationId}/funding`);
}

// ============================================================
// Verification
// ============================================================

/**
 * Upload a receipt or verification document
 */
export async function uploadVerification(data: {
  obligation_id: string;
  type: 'receipt' | 'vendor_confirmation' | 'manual';
  file_url?: string;
  description?: string;
  verified_amount?: number;
}): Promise<VerificationArtifact> {
  return fetchWithParentAuth('/clearfund/verification', {
    method: 'POST',
    body: data,
  });
}

/**
 * Get verification documents for an obligation
 */
export async function getVerifications(
  obligationId: string
): Promise<{ items: VerificationArtifact[]; total: number }> {
  return fetchWithParentAuth(`/clearfund/obligations/${obligationId}/verification`);
}

// ============================================================
// Ledger & Balance
// ============================================================

/**
 * Get balance summary for a family
 */
export async function getBalanceSummary(familyFileId: string): Promise<BalanceSummary> {
  return fetchWithParentAuth(`/clearfund/balance/${familyFileId}`);
}

/**
 * Get ledger entries for a family
 */
export async function getLedger(
  familyFileId: string,
  filters?: {
    limit?: number;
    offset?: number;
  }
): Promise<{ items: LedgerEntry[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.limit) params.set('limit', filters.limit.toString());
  if (filters?.offset) params.set('offset', filters.offset.toString());
  const query = params.toString() ? `?${params}` : '';
  return fetchWithParentAuth(`/clearfund/ledger/${familyFileId}${query}`);
}

// ============================================================
// Analytics
// ============================================================

/**
 * Get expense analytics for a family
 */
export async function getExpenseAnalytics(
  familyFileId: string,
  period?: 'week' | 'month' | 'quarter' | 'year'
): Promise<{
  total_spent: number;
  by_purpose: Record<ObligationPurpose, number>;
  by_child: Record<string, number>;
  parent_a_contribution: number;
  parent_b_contribution: number;
  compliance_rate: number;
}> {
  const query = period ? `?period=${period}` : '';
  return fetchWithParentAuth(`/clearfund/analytics/${familyFileId}${query}`);
}
