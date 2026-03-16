'use client';

/**
 * WebSocket Context - Signaling Only
 *
 * This context now handles ONLY ephemeral signaling events that are NOT
 * backed by database changes. All database-backed real-time events have
 * been migrated to Supabase Realtime (see realtime-context.tsx).
 *
 * Remaining WebSocket events:
 * - incoming_call, call_declined, call_timeout (parent-to-parent calls)
 * - kidcoms_call_incoming (KidComs video calls)
 * - aria_intervention (ARIA real-time interventions during calls)
 * - geofence_entry (GPS-based exchange notifications)
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  wsClient,
  WebSocketMessage,
  GeofenceEntryEvent,
  KidComsCallIncomingEvent,
  IncomingCallEvent,
  CallDeclinedEvent,
  CallTimeoutEvent,
  ARIAInterventionEvent,
} from '@/lib/websocket';
import { authAPI } from '@/lib/api';

interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (caseId: string) => void;
  unsubscribe: (caseId: string) => void;
  // Geofence notifications
  onGeofenceEntry: (handler: (data: GeofenceEntryEvent) => void) => () => void;
  // KidComs Call Notifications
  onKidComsCallIncoming: (handler: (data: KidComsCallIncomingEvent) => void) => () => void;
  // Parent-to-Parent Call Notifications
  onIncomingCall: (handler: (data: IncomingCallEvent) => void) => () => void;
  onCallDeclined: (handler: (data: CallDeclinedEvent) => void) => () => void;
  onCallTimeout: (handler: (data: CallTimeoutEvent) => void) => () => void;
  // ARIA Real-time Intervention Notifications
  onARIAIntervention: (handler: (data: ARIAInterventionEvent) => void) => () => void;
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

  // ============================================================
  // Signaling-Only Event Handlers
  // ============================================================

  // Geofence entry handler
  const onGeofenceEntry = useCallback((handler: (data: GeofenceEntryEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as GeofenceEntryEvent);
    };
    wsClient.on('geofence_entry', typedHandler);
    return () => wsClient.off('geofence_entry', typedHandler);
  }, []);

  // KidComs Call Notification handler
  const onKidComsCallIncoming = useCallback((handler: (data: KidComsCallIncomingEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as KidComsCallIncomingEvent);
    };
    wsClient.on('kidcoms_call_incoming', typedHandler);
    return () => wsClient.off('kidcoms_call_incoming', typedHandler);
  }, []);

  // Parent-to-Parent Call Notification handler
  const onIncomingCall = useCallback((handler: (data: IncomingCallEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as IncomingCallEvent);
    };
    wsClient.on('incoming_call', typedHandler);
    return () => wsClient.off('incoming_call', typedHandler);
  }, []);

  // Call Declined handler
  const onCallDeclined = useCallback((handler: (data: CallDeclinedEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as CallDeclinedEvent);
    };
    wsClient.on('call_declined', typedHandler);
    return () => wsClient.off('call_declined', typedHandler);
  }, []);

  // Call Timeout handler
  const onCallTimeout = useCallback((handler: (data: CallTimeoutEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as CallTimeoutEvent);
    };
    wsClient.on('call_timeout', typedHandler);
    return () => wsClient.off('call_timeout', typedHandler);
  }, []);

  // ARIA Real-time Intervention handler
  const onARIAIntervention = useCallback((handler: (data: ARIAInterventionEvent) => void) => {
    const typedHandler = (data: WebSocketMessage) => {
      handler(data as unknown as ARIAInterventionEvent);
    };
    wsClient.on('aria_intervention', typedHandler);
    return () => wsClient.off('aria_intervention', typedHandler);
  }, []);

  const value: WebSocketContextType = {
    isConnected,
    subscribe,
    unsubscribe,
    onGeofenceEntry,
    onKidComsCallIncoming,
    onIncomingCall,
    onCallDeclined,
    onCallTimeout,
    onARIAIntervention,
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
