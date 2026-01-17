'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { wsClient, WebSocketMessage, NewMessageEvent, TypingEvent, UserStatusEvent } from '@/lib/websocket';
import { authAPI } from '@/lib/api';

interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (caseId: string) => void;
  unsubscribe: (caseId: string) => void;
  sendTyping: (caseId: string, isTyping: boolean) => void;
  onNewMessage: (handler: (data: NewMessageEvent) => void) => () => void;
  onTyping: (handler: (data: TypingEvent) => void) => () => void;
  onUserStatus: (handler: (data: UserStatusEvent) => void) => () => void;
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

  const value: WebSocketContextType = {
    isConnected,
    subscribe,
    unsubscribe,
    sendTyping,
    onNewMessage,
    onTyping,
    onUserStatus,
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
