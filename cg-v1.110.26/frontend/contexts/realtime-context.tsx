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
  subscribeToMessages,
  subscribeToActivities,
  setupPresence,
  setupTypingBroadcast,
  sendTypingIndicator,
  trackPresence,
  untrackPresence,
  MessageRow,
  ActivityRow,
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

  // Message events
  onMessageInsert: (handler: (message: MessageRow) => void) => () => void;
  onMessageUpdate: (handler: (message: MessageRow) => void) => () => void;

  // Activity events
  onActivityInsert: (handler: (activity: ActivityRow) => void) => () => void;

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
  const messageInsertHandlers = useRef<Set<(message: MessageRow) => void>>(new Set());
  const messageUpdateHandlers = useRef<Set<(message: MessageRow) => void>>(new Set());
  const activityInsertHandlers = useRef<Set<(activity: ActivityRow) => void>>(new Set());
  const typingHandlers = useRef<Set<(payload: TypingPayload) => void>>(new Set());

  // Handle auth state changes - cleanup on logout
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Cleanup all channels
      channelsRef.current.forEach((channel) => {
        channel.unsubscribe();
      });
      channelsRef.current.clear();
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
      channelsRef.current.forEach((channel) => {
        channel.unsubscribe();
      });
      channelsRef.current.clear();

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
    onMessageInsert,
    onMessageUpdate,
    onActivityInsert,
    onlineUsers,
    isUserOnline,
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
