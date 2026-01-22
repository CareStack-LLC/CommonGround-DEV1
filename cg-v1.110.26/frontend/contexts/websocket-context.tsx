'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  wsClient,
  WebSocketMessage,
  NewMessageEvent,
  TypingEvent,
  UserStatusEvent,
  ExchangeCreatedEvent,
  ExchangeUpdatedEvent,
  ExchangeCheckinEvent,
  ObligationCreatedEvent,
  ObligationUpdatedEvent,
  PaymentReceivedEvent,
  BalanceChangedEvent,
  DashboardUpdateEvent,
  GeofenceEntryEvent,
  EventCreatedEvent,
  EventUpdatedEvent,
  EventDeletedEvent,
  AgreementCreatedEvent,
  AgreementUpdatedEvent,
  AgreementApprovedEvent,
  KidComsCallIncomingEvent,
} from '@/lib/websocket';
import { authAPI } from '@/lib/api';

interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (caseId: string) => void;
  unsubscribe: (caseId: string) => void;
  sendTyping: (caseId: string, isTyping: boolean) => void;
  onNewMessage: (handler: (data: NewMessageEvent) => void) => () => void;
  onTyping: (handler: (data: TypingEvent) => void) => () => void;
  onUserStatus: (handler: (data: UserStatusEvent) => void) => () => void;
  // WS5: New real-time event handlers
  onExchangeCreated: (handler: (data: ExchangeCreatedEvent) => void) => () => void;
  onExchangeUpdated: (handler: (data: ExchangeUpdatedEvent) => void) => () => void;
  onExchangeCheckin: (handler: (data: ExchangeCheckinEvent) => void) => () => void;
  onObligationCreated: (handler: (data: ObligationCreatedEvent) => void) => () => void;
  onObligationUpdated: (handler: (data: ObligationUpdatedEvent) => void) => () => void;
  onPaymentReceived: (handler: (data: PaymentReceivedEvent) => void) => () => void;
  onBalanceChanged: (handler: (data: BalanceChangedEvent) => void) => () => void;
  onDashboardUpdate: (handler: (data: DashboardUpdateEvent) => void) => () => void;
  // WS6: Geofence notifications
  onGeofenceEntry: (handler: (data: GeofenceEntryEvent) => void) => () => void;
  // WS5: Schedule Event notifications
  onEventCreated: (handler: (data: EventCreatedEvent) => void) => () => void;
  onEventUpdated: (handler: (data: EventUpdatedEvent) => void) => () => void;
  onEventDeleted: (handler: (data: EventDeletedEvent) => void) => () => void;
  // WS5: Agreement notifications
  onAgreementCreated: (handler: (data: AgreementCreatedEvent) => void) => () => void;
  onAgreementUpdated: (handler: (data: AgreementUpdatedEvent) => void) => () => void;
  onAgreementApproved: (handler: (data: AgreementApprovedEvent) => void) => () => void;
  // KidComs Call Notifications
  onKidComsCallIncoming: (handler: (data: KidComsCallIncomingEvent) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  // Connect/disconnect based on auth state
  useEffect(() => {
    if (!isAuthenticated) {
      wsClient.disconnect();
      setIsConnected(false);
      return;
    }

    // Get token and connect
    const token = authAPI.getToken();
    if (token) {
      wsClient.connect(token)
        .then(() => {
          setIsConnected(true);
        })
        .catch((error) => {
          console.error('WebSocket connection failed:', error);
          setIsConnected(false);
        });
    }

    // Listen for connection state changes
    const handleStatus = (data: WebSocketMessage) => {
      if (data.message === 'Connected successfully') {
        setIsConnected(true);
      }
    };

    const handleError = () => {
      setIsConnected(false);
    };

    wsClient.on('status', handleStatus);
    wsClient.on('error', handleError);

    return () => {
      wsClient.off('status', handleStatus);
      wsClient.off('error', handleError);
    };
  }, [isAuthenticated]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      wsClient.disconnect();
    };
  }, []);

  const subscribe = useCallback((caseId: string) => {
    wsClient.subscribe(caseId);
  }, []);

  const unsubscribe = useCallback((caseId: string) => {
    wsClient.unsubscribe(caseId);
  }, []);

  const sendTyping = useCallback((caseId: string, isTyping: boolean) => {
    wsClient.sendTyping(caseId, isTyping);
  }, []);

  // Helper to create typed event handlers with cleanup
  const onNewMessage = useCallback((handler: (data: NewMessageEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as NewMessageEvent);
    };
    wsClient.on('new_message', typedHandler);
    return () => wsClient.off('new_message', typedHandler);
  }, []);

  const onTyping = useCallback((handler: (data: TypingEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as TypingEvent);
    };
    wsClient.on('typing', typedHandler);
    return () => wsClient.off('typing', typedHandler);
  }, []);

  const onUserStatus = useCallback((handler: (data: UserStatusEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as UserStatusEvent);
    };
    wsClient.on('user_status', typedHandler);
    return () => wsClient.off('user_status', typedHandler);
  }, []);

  // WS5: New real-time event handlers
  const onExchangeCreated = useCallback((handler: (data: ExchangeCreatedEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as ExchangeCreatedEvent);
    };
    wsClient.on('exchange_created', typedHandler);
    return () => wsClient.off('exchange_created', typedHandler);
  }, []);

  const onExchangeUpdated = useCallback((handler: (data: ExchangeUpdatedEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as ExchangeUpdatedEvent);
    };
    wsClient.on('exchange_updated', typedHandler);
    return () => wsClient.off('exchange_updated', typedHandler);
  }, []);

  const onExchangeCheckin = useCallback((handler: (data: ExchangeCheckinEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as ExchangeCheckinEvent);
    };
    wsClient.on('exchange_checkin', typedHandler);
    return () => wsClient.off('exchange_checkin', typedHandler);
  }, []);

  const onObligationCreated = useCallback((handler: (data: ObligationCreatedEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as ObligationCreatedEvent);
    };
    wsClient.on('obligation_created', typedHandler);
    return () => wsClient.off('obligation_created', typedHandler);
  }, []);

  const onObligationUpdated = useCallback((handler: (data: ObligationUpdatedEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as ObligationUpdatedEvent);
    };
    wsClient.on('obligation_updated', typedHandler);
    return () => wsClient.off('obligation_updated', typedHandler);
  }, []);

  const onPaymentReceived = useCallback((handler: (data: PaymentReceivedEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as PaymentReceivedEvent);
    };
    wsClient.on('payment_received', typedHandler);
    return () => wsClient.off('payment_received', typedHandler);
  }, []);

  const onBalanceChanged = useCallback((handler: (data: BalanceChangedEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as BalanceChangedEvent);
    };
    wsClient.on('balance_changed', typedHandler);
    return () => wsClient.off('balance_changed', typedHandler);
  }, []);

  const onDashboardUpdate = useCallback((handler: (data: DashboardUpdateEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as DashboardUpdateEvent);
    };
    wsClient.on('dashboard_update', typedHandler);
    return () => wsClient.off('dashboard_update', typedHandler);
  }, []);

  // WS6: Geofence entry handler
  const onGeofenceEntry = useCallback((handler: (data: GeofenceEntryEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as GeofenceEntryEvent);
    };
    wsClient.on('geofence_entry', typedHandler);
    return () => wsClient.off('geofence_entry', typedHandler);
  }, []);

  // WS5: Schedule Event handlers
  const onEventCreated = useCallback((handler: (data: EventCreatedEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as EventCreatedEvent);
    };
    wsClient.on('event_created', typedHandler);
    return () => wsClient.off('event_created', typedHandler);
  }, []);

  const onEventUpdated = useCallback((handler: (data: EventUpdatedEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as EventUpdatedEvent);
    };
    wsClient.on('event_updated', typedHandler);
    return () => wsClient.off('event_updated', typedHandler);
  }, []);

  const onEventDeleted = useCallback((handler: (data: EventDeletedEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as EventDeletedEvent);
    };
    wsClient.on('event_deleted', typedHandler);
    return () => wsClient.off('event_deleted', typedHandler);
  }, []);

  // WS5: Agreement handlers
  const onAgreementCreated = useCallback((handler: (data: AgreementCreatedEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as AgreementCreatedEvent);
    };
    wsClient.on('agreement_created', typedHandler);
    return () => wsClient.off('agreement_created', typedHandler);
  }, []);

  const onAgreementUpdated = useCallback((handler: (data: AgreementUpdatedEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as AgreementUpdatedEvent);
    };
    wsClient.on('agreement_updated', typedHandler);
    return () => wsClient.off('agreement_updated', typedHandler);
  }, []);

  const onAgreementApproved = useCallback((handler: (data: AgreementApprovedEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as AgreementApprovedEvent);
    };
    wsClient.on('agreement_approved', typedHandler);
    return () => wsClient.off('agreement_approved', typedHandler);
  }, []);

  // KidComs Call Notification handler
  const onKidComsCallIncoming = useCallback((handler: (data: KidComsCallIncomingEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as KidComsCallIncomingEvent);
    };
    wsClient.on('kidcoms_call_incoming', typedHandler);
    return () => wsClient.off('kidcoms_call_incoming', typedHandler);
  }, []);

  const value: WebSocketContextType = {
    isConnected,
    subscribe,
    unsubscribe,
    sendTyping,
    onNewMessage,
    onTyping,
    onUserStatus,
    onExchangeCreated,
    onExchangeUpdated,
    onExchangeCheckin,
    onObligationCreated,
    onObligationUpdated,
    onPaymentReceived,
    onBalanceChanged,
    onDashboardUpdate,
    onGeofenceEntry,
    onEventCreated,
    onEventUpdated,
    onEventDeleted,
    onAgreementCreated,
    onAgreementUpdated,
    onAgreementApproved,
    onKidComsCallIncoming,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
