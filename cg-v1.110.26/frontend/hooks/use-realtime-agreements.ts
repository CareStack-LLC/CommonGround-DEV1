'use client';

import { useEffect } from 'react';
import { useRealtime } from '@/contexts/realtime-context';
import { AgreementRow, AgreementSectionRow } from '@/lib/supabase-realtime';

interface UseRealtimeAgreementsOptions {
  familyFileId: string | null;
  agreementId?: string | null;
  onAgreementCreated?: (agreement: AgreementRow) => void;
  onAgreementUpdated?: (agreement: AgreementRow) => void;
  onAgreementApproved?: (agreement: AgreementRow) => void;
  onSectionUpdated?: (section: AgreementSectionRow) => void;
}

/**
 * Hook for subscribing to real-time agreement updates via Supabase Realtime.
 *
 * Replaces WebSocket events: agreement_created, agreement_updated, agreement_approved
 */
export function useRealtimeAgreements({
  familyFileId,
  agreementId,
  onAgreementCreated,
  onAgreementUpdated,
  onAgreementApproved,
  onSectionUpdated,
}: UseRealtimeAgreementsOptions) {
  const {
    subscribeToLegalChannel,
    unsubscribeFromLegalChannel,
    onAgreementInsert,
    onAgreementUpdate,
    onAgreementSectionUpdate,
  } = useRealtime();

  // Subscribe to legal channel on mount
  useEffect(() => {
    if (!familyFileId) return;

    subscribeToLegalChannel(familyFileId, agreementId || undefined);

    return () => {
      unsubscribeFromLegalChannel(familyFileId);
    };
  }, [familyFileId, agreementId, subscribeToLegalChannel, unsubscribeFromLegalChannel]);

  // Handle new agreements
  useEffect(() => {
    if (!familyFileId || !onAgreementCreated) return;

    const unsubscribe = onAgreementInsert((agreement: AgreementRow) => {
      onAgreementCreated(agreement);
    });

    return unsubscribe;
  }, [familyFileId, onAgreementInsert, onAgreementCreated]);

  // Handle agreement updates (including approval)
  useEffect(() => {
    if (!familyFileId) return;
    if (!onAgreementUpdated && !onAgreementApproved) return;

    const unsubscribe = onAgreementUpdate((agreement: AgreementRow) => {
      // Check if this is an approval event
      if (onAgreementApproved && (agreement.petitioner_approved || agreement.respondent_approved)) {
        onAgreementApproved(agreement);
      }
      if (onAgreementUpdated) {
        onAgreementUpdated(agreement);
      }
    });

    return unsubscribe;
  }, [familyFileId, onAgreementUpdate, onAgreementUpdated, onAgreementApproved]);

  // Handle agreement section updates
  useEffect(() => {
    if (!familyFileId || !onSectionUpdated) return;

    const unsubscribe = onAgreementSectionUpdate((section: AgreementSectionRow) => {
      onSectionUpdated(section);
    });

    return unsubscribe;
  }, [familyFileId, onAgreementSectionUpdate, onSectionUpdated]);
}
