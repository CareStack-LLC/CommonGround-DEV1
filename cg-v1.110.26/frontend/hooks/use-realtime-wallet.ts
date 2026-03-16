'use client';

import { useEffect } from 'react';
import { useRealtime } from '@/contexts/realtime-context';
import { ObligationRow, WalletTransactionRow } from '@/lib/supabase-realtime';

interface UseRealtimeWalletOptions {
  familyFileId: string | null;
  walletId?: string | null;
  onObligationCreated?: (obligation: ObligationRow) => void;
  onObligationUpdated?: (obligation: ObligationRow) => void;
  onTransactionCreated?: (transaction: WalletTransactionRow) => void;
  onTransactionUpdated?: (transaction: WalletTransactionRow) => void;
  onBalanceChanged?: () => void;
}

/**
 * Hook for subscribing to real-time wallet/finance updates via Supabase Realtime.
 *
 * Replaces WebSocket events: obligation_created, obligation_updated,
 * payment_received, balance_changed
 */
export function useRealtimeWallet({
  familyFileId,
  walletId,
  onObligationCreated,
  onObligationUpdated,
  onTransactionCreated,
  onTransactionUpdated,
  onBalanceChanged,
}: UseRealtimeWalletOptions) {
  const {
    subscribeToFinanceChannel,
    unsubscribeFromFinanceChannel,
    onObligationInsert,
    onObligationUpdate,
    onWalletTransactionInsert,
    onWalletTransactionUpdate,
  } = useRealtime();

  // Subscribe to finance channel on mount
  useEffect(() => {
    if (!familyFileId) return;

    subscribeToFinanceChannel(familyFileId, walletId || undefined);

    return () => {
      unsubscribeFromFinanceChannel(familyFileId);
    };
  }, [familyFileId, walletId, subscribeToFinanceChannel, unsubscribeFromFinanceChannel]);

  // Handle new obligations
  useEffect(() => {
    if (!familyFileId || !onObligationCreated) return;

    const unsubscribe = onObligationInsert((obligation: ObligationRow) => {
      onObligationCreated(obligation);
    });

    return unsubscribe;
  }, [familyFileId, onObligationInsert, onObligationCreated]);

  // Handle obligation updates
  useEffect(() => {
    if (!familyFileId || !onObligationUpdated) return;

    const unsubscribe = onObligationUpdate((obligation: ObligationRow) => {
      onObligationUpdated(obligation);
    });

    return unsubscribe;
  }, [familyFileId, onObligationUpdate, onObligationUpdated]);

  // Handle new transactions
  useEffect(() => {
    if (!familyFileId) return;
    if (!onTransactionCreated && !onBalanceChanged) return;

    const unsubscribe = onWalletTransactionInsert((tx: WalletTransactionRow) => {
      if (onTransactionCreated) onTransactionCreated(tx);
      if (onBalanceChanged) onBalanceChanged();
    });

    return unsubscribe;
  }, [familyFileId, onWalletTransactionInsert, onTransactionCreated, onBalanceChanged]);

  // Handle transaction updates (status changes, completions)
  useEffect(() => {
    if (!familyFileId) return;
    if (!onTransactionUpdated && !onBalanceChanged) return;

    const unsubscribe = onWalletTransactionUpdate((tx: WalletTransactionRow) => {
      if (onTransactionUpdated) onTransactionUpdated(tx);
      if (onBalanceChanged) onBalanceChanged();
    });

    return unsubscribe;
  }, [familyFileId, onWalletTransactionUpdate, onTransactionUpdated, onBalanceChanged]);
}
