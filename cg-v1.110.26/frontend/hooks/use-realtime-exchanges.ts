'use client';

import { useEffect } from 'react';
import { useRealtime } from '@/contexts/realtime-context';
import { CustodyExchangeRow, ExchangeInstanceRow } from '@/lib/supabase-realtime';

interface UseRealtimeExchangesOptions {
  familyFileId: string | null;
  onExchangeCreated?: (exchange: CustodyExchangeRow) => void;
  onExchangeUpdated?: (exchange: CustodyExchangeRow) => void;
  onExchangeCheckin?: (instance: ExchangeInstanceRow) => void;
}

/**
 * Hook for subscribing to real-time custody exchange updates via Supabase Realtime.
 *
 * Replaces WebSocket events: exchange_created, exchange_updated, exchange_checkin
 */
export function useRealtimeExchanges({
  familyFileId,
  onExchangeCreated,
  onExchangeUpdated,
  onExchangeCheckin,
}: UseRealtimeExchangesOptions) {
  const {
    subscribeToScheduleChannel,
    unsubscribeFromScheduleChannel,
    onExchangeInsert,
    onExchangeUpdate,
    onExchangeInstanceUpdate,
  } = useRealtime();

  // Subscribe to schedule channel on mount
  useEffect(() => {
    if (!familyFileId) return;

    subscribeToScheduleChannel(familyFileId);

    return () => {
      unsubscribeFromScheduleChannel(familyFileId);
    };
  }, [familyFileId, subscribeToScheduleChannel, unsubscribeFromScheduleChannel]);

  // Handle new exchanges
  useEffect(() => {
    if (!familyFileId || !onExchangeCreated) return;

    const unsubscribe = onExchangeInsert((exchange: CustodyExchangeRow) => {
      onExchangeCreated(exchange);
    });

    return unsubscribe;
  }, [familyFileId, onExchangeInsert, onExchangeCreated]);

  // Handle exchange updates
  useEffect(() => {
    if (!familyFileId || !onExchangeUpdated) return;

    const unsubscribe = onExchangeUpdate((exchange: CustodyExchangeRow) => {
      onExchangeUpdated(exchange);
    });

    return unsubscribe;
  }, [familyFileId, onExchangeUpdate, onExchangeUpdated]);

  // Handle exchange instance updates (check-ins)
  useEffect(() => {
    if (!familyFileId || !onExchangeCheckin) return;

    const unsubscribe = onExchangeInstanceUpdate((instance: ExchangeInstanceRow) => {
      onExchangeCheckin(instance);
    });

    return unsubscribe;
  }, [familyFileId, onExchangeInstanceUpdate, onExchangeCheckin]);
}
