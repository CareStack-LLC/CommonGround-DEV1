'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/lib/auth-context';
import {
  createFamilyFileChannel,
  createScheduleChannel,
  createFinanceChannel,
  createLegalChannel,
  subscribeToMessages,
  subscribeToActivities,
  subscribeToExchanges,
  subscribeToExchangeInstances,
  subscribeToScheduleEvents,
  subscribeToObligations,
  subscribeToWalletTransactions,
  subscribeToAgreements,
  subscribeToAgreementSections,
  setupPresence,
  setupTypingBroadcast,
  sendTypingIndicator,
  trackPresence,
  untrackPresence,
  MessageRow,
  ActivityRow,
  CustodyExchangeRow,
  ExchangeInstanceRow,
  ScheduleEventRow,
  ObligationRow,
  WalletTransactionRow,
  AgreementRow,
  AgreementSectionRow,
  PresenceState,
  TypingPayload,
  ConnectionState,
} from '@/lib/supabase-realtime';

interface OnlineUser {
  userId: string;
  userName: string;
  onlineAt: string;
  status: 'online' | 'away' | 'busy';
}

interface RealtimeContextType {
  // Connection state
  connectionState: ConnectionState;
  isConnected: boolean;

  // Channel management
  subscribeToFamilyFile: (familyFileId: string) => void;
  unsubscribeFromFamilyFile: (familyFileId: string) => void;

  // Domain channel management
  subscribeToScheduleChannel: (familyFileId: string) => void;
  unsubscribeFromScheduleChannel: (familyFileId: string) => void;
  subscribeToFinanceChannel: (familyFileId: string, walletId?: string) => void;
  unsubscribeFromFinanceChannel: (familyFileId: string) => void;
  subscribeToLegalChannel: (familyFileId: string, agreementId?: string) => void;
  unsubscribeFromLegalChannel: (familyFileId: string) => void;

  // Message events
  onMessageInsert: (handler: (message: MessageRow) => void) => () => void;
  onMessageUpdate: (handler: (message: MessageRow) => void) => () => void;

  // Activity events
  onActivityInsert: (handler: (activity: ActivityRow) => void) => () => void;

  // Schedule domain events
  onExchangeInsert: (handler: (exchange: CustodyExchangeRow) => void) => () => void;
  onExchangeUpdate: (handler: (exchange: CustodyExchangeRow) => void) => () => void;
  onExchangeInstanceUpdate: (handler: (instance: ExchangeInstanceRow) => void) => () => void;
  onScheduleEventInsert: (handler: (event: ScheduleEventRow) => void) => () => void;
  onScheduleEventUpdate: (handler: (event: ScheduleEventRow) => void) => () => void;
  onScheduleEventDelete: (handler: (old: { id: string }) => void) => () => void;

  // Finance domain events
  onObligationInsert: (handler: (obligation: ObligationRow) => void) => () => void;
  onObligationUpdate: (handler: (obligation: ObligationRow) => void) => () => void;
  onWalletTransactionInsert: (handler: (tx: WalletTransactionRow) => void) => () => void;
  onWalletTransactionUpdate: (handler: (tx: WalletTransactionRow) => void) => () => void;

  // Legal domain events
  onAgreementInsert: (handler: (agreement: AgreementRow) => void) => () => void;
  onAgreementUpdate: (handler: (agreement: AgreementRow) => void) => () => void;
  onAgreementSectionUpdate: (handler: (section: AgreementSectionRow) => void) => () => void;

  // Presence
  onlineUsers: Map<string, OnlineUser>;
  isUserOnline: (userId: string) => boolean;

  // Typing indicators
  sendTyping: (familyFileId: string, isTyping: boolean, agreementId?: string) => void;
  onTypingChange: (handler: (payload: TypingPayload) => void) => () => void;
  typingUsers: Map<string, { userName: string; timeout: NodeJS.Timeout }>;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(new Map());
  const [typingUsers, setTypingUsers] = useState<
    Map<string, { userName: string; timeout: NodeJS.Timeout }>
  >(new Map());

  // Refs for channels and handlers
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const scheduleChannelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const financeChannelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const legalChannelsRef = useRef<Map<string, RealtimeChannel>>(new Map());

  // Message & Activity handlers (existing)
  const messageInsertHandlers = useRef<Set<(message: MessageRow) => void>>(new Set());
  const messageUpdateHandlers = useRef<Set<(message: MessageRow) => void>>(new Set());
  const activityInsertHandlers = useRef<Set<(activity: ActivityRow) => void>>(new Set());
  const typingHandlers = useRef<Set<(payload: TypingPayload) => void>>(new Set());

  // Schedule domain handlers
  const exchangeInsertHandlers = useRef<Set<(exchange: CustodyExchangeRow) => void>>(new Set());
  const exchangeUpdateHandlers = useRef<Set<(exchange: CustodyExchangeRow) => void>>(new Set());
  const exchangeInstanceUpdateHandlers = useRef<Set<(instance: ExchangeInstanceRow) => void>>(new Set());
  const scheduleEventInsertHandlers = useRef<Set<(event: ScheduleEventRow) => void>>(new Set());
  const scheduleEventUpdateHandlers = useRef<Set<(event: ScheduleEventRow) => void>>(new Set());
  const scheduleEventDeleteHandlers = useRef<Set<(old: { id: string }) => void>>(new Set());

  // Finance domain handlers
  const obligationInsertHandlers = useRef<Set<(obligation: ObligationRow) => void>>(new Set());
  const obligationUpdateHandlers = useRef<Set<(obligation: ObligationRow) => void>>(new Set());
  const walletTransactionInsertHandlers = useRef<Set<(tx: WalletTransactionRow) => void>>(new Set());
  const walletTransactionUpdateHandlers = useRef<Set<(tx: WalletTransactionRow) => void>>(new Set());

  // Legal domain handlers
  const agreementInsertHandlers = useRef<Set<(agreement: AgreementRow) => void>>(new Set());
  const agreementUpdateHandlers = useRef<Set<(agreement: AgreementRow) => void>>(new Set());
  const agreementSectionUpdateHandlers = useRef<Set<(section: AgreementSectionRow) => void>>(new Set());

  // Handle auth state changes - cleanup on logout
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Cleanup all channels
      channelsRef.current.forEach((channel) => channel.unsubscribe());
      channelsRef.current.clear();
      scheduleChannelsRef.current.forEach((channel) => channel.unsubscribe());
      scheduleChannelsRef.current.clear();
      financeChannelsRef.current.forEach((channel) => channel.unsubscribe());
      financeChannelsRef.current.clear();
      legalChannelsRef.current.forEach((channel) => channel.unsubscribe());
      legalChannelsRef.current.clear();
      setConnectionState('disconnected');
      setOnlineUsers(new Map());
      setTypingUsers(new Map());
      return;
    }
  }, [isAuthenticated, user]);

  // Subscribe to a family file
  const subscribeToFamilyFile = useCallback(
    (familyFileId: string) => {
      if (!user || channelsRef.current.has(familyFileId)) return;

      setConnectionState('connecting');

      const userName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';
      const channel = createFamilyFileChannel(familyFileId, user.id, userName);

      // Subscribe to messages
      subscribeToMessages(
        channel,
        familyFileId,
        (message) => {
          messageInsertHandlers.current.forEach((handler) => handler(message));
        },
        (message) => {
          messageUpdateHandlers.current.forEach((handler) => handler(message));
        }
      );

      // Subscribe to activities
      subscribeToActivities(channel, familyFileId, (activity) => {
        activityInsertHandlers.current.forEach((handler) => handler(activity));
      });

      // Set up presence
      setupPresence(
        channel,
        (state) => {
          const users = new Map<string, OnlineUser>();
          Object.entries(state).forEach(([key, presences]) => {
            if (presences.length > 0) {
              const presence = presences[0];
              users.set(key, {
                userId: presence.user_id,
                userName: presence.user_name,
                onlineAt: presence.online_at,
                status: presence.status,
              });
            }
          });
          setOnlineUsers(users);
        },
        (_key, _current, newPresences) => {
          if (newPresences.length > 0) {
            const presence = newPresences[0];
            setOnlineUsers((prev) => {
              const next = new Map(prev);
              next.set(presence.user_id, {
                userId: presence.user_id,
                userName: presence.user_name,
                onlineAt: presence.online_at,
                status: presence.status,
              });
              return next;
            });
          }
        },
        (key) => {
          setOnlineUsers((prev) => {
            const next = new Map(prev);
            next.delete(key);
            return next;
          });
        }
      );

      // Set up typing broadcast
      setupTypingBroadcast(channel, (payload) => {
        // Don't show own typing
        if (payload.user_id === user.id) return;

        typingHandlers.current.forEach((handler) => handler(payload));

        // Auto-clear typing after 3 seconds
        setTypingUsers((prev) => {
          const next = new Map(prev);
          const existing = next.get(payload.user_id);
          if (existing) {
            clearTimeout(existing.timeout);
          }

          if (payload.is_typing) {
            const timeout = setTimeout(() => {
              setTypingUsers((p) => {
                const n = new Map(p);
                n.delete(payload.user_id);
                return n;
              });
            }, 3000);
            next.set(payload.user_id, { userName: payload.user_name, timeout });
          } else {
            next.delete(payload.user_id);
          }
          return next;
        });
      });

      // Subscribe and track presence
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionState('connected');
          await trackPresence(channel, {
            user_id: user.id,
            user_name: userName,
            online_at: new Date().toISOString(),
            status: 'online',
          });
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionState('error');
        } else if (status === 'CLOSED') {
          setConnectionState('disconnected');
        }
      });

      channelsRef.current.set(familyFileId, channel);
    },
    [user]
  );

  // Unsubscribe from a family file
  const unsubscribeFromFamilyFile = useCallback((familyFileId: string) => {
    const channel = channelsRef.current.get(familyFileId);
    if (channel) {
      untrackPresence(channel);
      channel.unsubscribe();
      channelsRef.current.delete(familyFileId);
    }
  }, []);

  // Event handler registration - returns cleanup function
  const onMessageInsert = useCallback((handler: (message: MessageRow) => void) => {
    messageInsertHandlers.current.add(handler);
    return () => {
      messageInsertHandlers.current.delete(handler);
    };
  }, []);

  const onMessageUpdate = useCallback((handler: (message: MessageRow) => void) => {
    messageUpdateHandlers.current.add(handler);
    return () => {
      messageUpdateHandlers.current.delete(handler);
    };
  }, []);

  const onActivityInsert = useCallback((handler: (activity: ActivityRow) => void) => {
    activityInsertHandlers.current.add(handler);
    return () => {
      activityInsertHandlers.current.delete(handler);
    };
  }, []);

  const onTypingChange = useCallback((handler: (payload: TypingPayload) => void) => {
    typingHandlers.current.add(handler);
    return () => {
      typingHandlers.current.delete(handler);
    };
  }, []);

  // ============================================================
  // Schedule Domain Channel
  // ============================================================

  const subscribeToScheduleChannel = useCallback(
    (familyFileId: string) => {
      if (scheduleChannelsRef.current.has(familyFileId)) return;

      const channel = createScheduleChannel(familyFileId);

      subscribeToExchanges(
        channel,
        familyFileId,
        (exchange) => exchangeInsertHandlers.current.forEach((h) => h(exchange)),
        (exchange) => exchangeUpdateHandlers.current.forEach((h) => h(exchange))
      );

      subscribeToExchangeInstances(channel, (instance) =>
        exchangeInstanceUpdateHandlers.current.forEach((h) => h(instance))
      );

      subscribeToScheduleEvents(
        channel,
        familyFileId,
        (event) => scheduleEventInsertHandlers.current.forEach((h) => h(event)),
        (event) => scheduleEventUpdateHandlers.current.forEach((h) => h(event)),
        (old) => scheduleEventDeleteHandlers.current.forEach((h) => h(old))
      );

      channel.subscribe();
      scheduleChannelsRef.current.set(familyFileId, channel);
    },
    []
  );

  const unsubscribeFromScheduleChannel = useCallback((familyFileId: string) => {
    const channel = scheduleChannelsRef.current.get(familyFileId);
    if (channel) {
      channel.unsubscribe();
      scheduleChannelsRef.current.delete(familyFileId);
    }
  }, []);

  // ============================================================
  // Finance Domain Channel
  // ============================================================

  const subscribeToFinanceChannel = useCallback(
    (familyFileId: string, walletId?: string) => {
      if (financeChannelsRef.current.has(familyFileId)) return;

      const channel = createFinanceChannel(familyFileId);

      subscribeToObligations(
        channel,
        familyFileId,
        (obligation) => obligationInsertHandlers.current.forEach((h) => h(obligation)),
        (obligation) => obligationUpdateHandlers.current.forEach((h) => h(obligation))
      );

      if (walletId) {
        subscribeToWalletTransactions(
          channel,
          walletId,
          (tx) => walletTransactionInsertHandlers.current.forEach((h) => h(tx)),
          (tx) => walletTransactionUpdateHandlers.current.forEach((h) => h(tx))
        );
      }

      channel.subscribe();
      financeChannelsRef.current.set(familyFileId, channel);
    },
    []
  );

  const unsubscribeFromFinanceChannel = useCallback((familyFileId: string) => {
    const channel = financeChannelsRef.current.get(familyFileId);
    if (channel) {
      channel.unsubscribe();
      financeChannelsRef.current.delete(familyFileId);
    }
  }, []);

  // ============================================================
  // Legal Domain Channel
  // ============================================================

  const subscribeToLegalChannel = useCallback(
    (familyFileId: string, agreementId?: string) => {
      if (legalChannelsRef.current.has(familyFileId)) return;

      const channel = createLegalChannel(familyFileId);

      subscribeToAgreements(
        channel,
        familyFileId,
        (agreement) => agreementInsertHandlers.current.forEach((h) => h(agreement)),
        (agreement) => agreementUpdateHandlers.current.forEach((h) => h(agreement))
      );

      if (agreementId) {
        subscribeToAgreementSections(channel, agreementId, (section) =>
          agreementSectionUpdateHandlers.current.forEach((h) => h(section))
        );
      }

      channel.subscribe();
      legalChannelsRef.current.set(familyFileId, channel);
    },
    []
  );

  const unsubscribeFromLegalChannel = useCallback((familyFileId: string) => {
    const channel = legalChannelsRef.current.get(familyFileId);
    if (channel) {
      channel.unsubscribe();
      legalChannelsRef.current.delete(familyFileId);
    }
  }, []);

  // ============================================================
  // Schedule Domain Event Handler Registrations
  // ============================================================

  const onExchangeInsert = useCallback((handler: (exchange: CustodyExchangeRow) => void) => {
    exchangeInsertHandlers.current.add(handler);
    return () => { exchangeInsertHandlers.current.delete(handler); };
  }, []);

  const onExchangeUpdate = useCallback((handler: (exchange: CustodyExchangeRow) => void) => {
    exchangeUpdateHandlers.current.add(handler);
    return () => { exchangeUpdateHandlers.current.delete(handler); };
  }, []);

  const onExchangeInstanceUpdate = useCallback((handler: (instance: ExchangeInstanceRow) => void) => {
    exchangeInstanceUpdateHandlers.current.add(handler);
    return () => { exchangeInstanceUpdateHandlers.current.delete(handler); };
  }, []);

  const onScheduleEventInsert = useCallback((handler: (event: ScheduleEventRow) => void) => {
    scheduleEventInsertHandlers.current.add(handler);
    return () => { scheduleEventInsertHandlers.current.delete(handler); };
  }, []);

  const onScheduleEventUpdate = useCallback((handler: (event: ScheduleEventRow) => void) => {
    scheduleEventUpdateHandlers.current.add(handler);
    return () => { scheduleEventUpdateHandlers.current.delete(handler); };
  }, []);

  const onScheduleEventDelete = useCallback((handler: (old: { id: string }) => void) => {
    scheduleEventDeleteHandlers.current.add(handler);
    return () => { scheduleEventDeleteHandlers.current.delete(handler); };
  }, []);

  // ============================================================
  // Finance Domain Event Handler Registrations
  // ============================================================

  const onObligationInsert = useCallback((handler: (obligation: ObligationRow) => void) => {
    obligationInsertHandlers.current.add(handler);
    return () => { obligationInsertHandlers.current.delete(handler); };
  }, []);

  const onObligationUpdate = useCallback((handler: (obligation: ObligationRow) => void) => {
    obligationUpdateHandlers.current.add(handler);
    return () => { obligationUpdateHandlers.current.delete(handler); };
  }, []);

  const onWalletTransactionInsert = useCallback((handler: (tx: WalletTransactionRow) => void) => {
    walletTransactionInsertHandlers.current.add(handler);
    return () => { walletTransactionInsertHandlers.current.delete(handler); };
  }, []);

  const onWalletTransactionUpdate = useCallback((handler: (tx: WalletTransactionRow) => void) => {
    walletTransactionUpdateHandlers.current.add(handler);
    return () => { walletTransactionUpdateHandlers.current.delete(handler); };
  }, []);

  // ============================================================
  // Legal Domain Event Handler Registrations
  // ============================================================

  const onAgreementInsert = useCallback((handler: (agreement: AgreementRow) => void) => {
    agreementInsertHandlers.current.add(handler);
    return () => { agreementInsertHandlers.current.delete(handler); };
  }, []);

  const onAgreementUpdate = useCallback((handler: (agreement: AgreementRow) => void) => {
    agreementUpdateHandlers.current.add(handler);
    return () => { agreementUpdateHandlers.current.delete(handler); };
  }, []);

  const onAgreementSectionUpdate = useCallback((handler: (section: AgreementSectionRow) => void) => {
    agreementSectionUpdateHandlers.current.add(handler);
    return () => { agreementSectionUpdateHandlers.current.delete(handler); };
  }, []);

  // Send typing indicator
  const sendTyping = useCallback(
    (familyFileId: string, isTyping: boolean, agreementId?: string) => {
      if (!user) return;
      const channel = channelsRef.current.get(familyFileId);
      if (channel) {
        const userName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';
        sendTypingIndicator(channel, {
          user_id: user.id,
          user_name: userName,
          is_typing: isTyping,
          family_file_id: familyFileId,
          agreement_id: agreementId,
        });
      }
    },
    [user]
  );

  // Check if user is online
  const isUserOnline = useCallback(
    (userId: string) => {
      return onlineUsers.has(userId);
    },
    [onlineUsers]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      channelsRef.current.forEach((channel) => channel.unsubscribe());
      channelsRef.current.clear();
      scheduleChannelsRef.current.forEach((channel) => channel.unsubscribe());
      scheduleChannelsRef.current.clear();
      financeChannelsRef.current.forEach((channel) => channel.unsubscribe());
      financeChannelsRef.current.clear();
      legalChannelsRef.current.forEach((channel) => channel.unsubscribe());
      legalChannelsRef.current.clear();

      // Clear all typing timeouts
      typingUsers.forEach((data) => {
        clearTimeout(data.timeout);
      });
    };
  }, []);

  const value: RealtimeContextType = {
    connectionState,
    isConnected: connectionState === 'connected',
    subscribeToFamilyFile,
    unsubscribeFromFamilyFile,
    // Domain channels
    subscribeToScheduleChannel,
    unsubscribeFromScheduleChannel,
    subscribeToFinanceChannel,
    unsubscribeFromFinanceChannel,
    subscribeToLegalChannel,
    unsubscribeFromLegalChannel,
    // Message events
    onMessageInsert,
    onMessageUpdate,
    // Activity events
    onActivityInsert,
    // Schedule domain events
    onExchangeInsert,
    onExchangeUpdate,
    onExchangeInstanceUpdate,
    onScheduleEventInsert,
    onScheduleEventUpdate,
    onScheduleEventDelete,
    // Finance domain events
    onObligationInsert,
    onObligationUpdate,
    onWalletTransactionInsert,
    onWalletTransactionUpdate,
    // Legal domain events
    onAgreementInsert,
    onAgreementUpdate,
    onAgreementSectionUpdate,
    // Presence
    onlineUsers,
    isUserOnline,
    // Typing
    sendTyping,
    onTypingChange,
    typingUsers,
  };

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
