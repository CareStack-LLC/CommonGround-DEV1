/**
 * Realtime Provider
 *
 * Provides WebSocket connection state and real-time event handling
 * to the entire app. Broadcasts events to registered listeners.
 *
 * Features:
 * - Centralized WebSocket connection management
 * - Event subscription system for components
 * - Typing indicator state
 * - Online users tracking
 * - Auto-refresh activity feed on updates
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useMemo,
  useRef,
  useEffect,
} from "react";

import { useAuth } from "./AuthProvider";
import { useFamilyFile } from "@/hooks/useFamilyFile";
import { useWebSocket } from "@/hooks/useWebSocket";

type RealtimeEvent =
  | "message"
  | "typing"
  | "user_status"
  | "activity"
  | "exchange_update"
  | "agreement_update"
  | "expense_update"
  | "event_update"
  | "kidcoms_call_incoming"
  | "kidcoms_call_ended";

type EventCallback = (data: Record<string, unknown>) => void;

interface RealtimeContextType {
  isConnected: boolean;
  onlineUsers: string[];
  typingUsers: Map<string, boolean>;
  sendTyping: (isTyping: boolean) => void;
  reconnect: () => void;
  subscribe: (event: RealtimeEvent, callback: EventCallback) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  onlineUsers: [],
  typingUsers: new Map(),
  sendTyping: () => {},
  reconnect: () => {},
  subscribe: () => () => {},
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { isAuthenticated } = useAuth();
  const { familyFile } = useFamilyFile();
  const familyFileId = familyFile?.id || null;

  const [typingUsers, setTypingUsers] = useState<Map<string, boolean>>(
    new Map()
  );
  const listenersRef = useRef<Map<RealtimeEvent, Set<EventCallback>>>(
    new Map()
  );
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Emit event to all listeners
  const emit = useCallback((event: RealtimeEvent, data: Record<string, unknown>) => {
    const listeners = listenersRef.current.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }, []);

  // Handle typing events
  const handleTyping = useCallback((userId: string, isTyping: boolean) => {
    // Clear existing timeout for this user
    const existingTimeout = typingTimeoutsRef.current.get(userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      typingTimeoutsRef.current.delete(userId);
    }

    if (isTyping) {
      // Set typing status
      setTypingUsers((prev) => new Map(prev).set(userId, true));

      // Auto-clear after 5 seconds
      const timeout = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
        typingTimeoutsRef.current.delete(userId);
      }, 5000);

      typingTimeoutsRef.current.set(userId, timeout);
    } else {
      // Clear typing status
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    }

    emit("typing", { userId, isTyping });
  }, [emit]);

  // Handle user status events
  const handleUserStatus = useCallback(
    (userId: string, status: "online" | "offline") => {
      emit("user_status", { userId, status });
    },
    [emit]
  );

  // Handle message events
  const handleMessage = useCallback(
    (message: Record<string, unknown>) => {
      emit("message", message);
    },
    [emit]
  );

  // Handle activity events
  const handleActivity = useCallback(
    (data: Record<string, unknown>) => {
      // Determine event type and emit appropriately
      const eventType = (data.type as RealtimeEvent) || "activity";
      emit(eventType, data);
      // Also emit generic activity for activity feed refresh
      if (eventType !== "activity") {
        emit("activity", data);
      }
    },
    [emit]
  );

  // Set up WebSocket connection
  const { isConnected, onlineUsers, sendTyping, reconnect } = useWebSocket({
    familyFileId,
    enabled: isAuthenticated,
    onMessage: handleMessage,
    onTyping: handleTyping,
    onUserStatus: handleUserStatus,
    onActivity: handleActivity,
  });

  // Subscribe to events
  const subscribe = useCallback(
    (event: RealtimeEvent, callback: EventCallback): (() => void) => {
      if (!listenersRef.current.has(event)) {
        listenersRef.current.set(event, new Set());
      }
      listenersRef.current.get(event)!.add(callback);

      // Return unsubscribe function
      return () => {
        listenersRef.current.get(event)?.delete(callback);
      };
    },
    []
  );

  // Clean up typing timeouts on unmount
  useEffect(() => {
    return () => {
      typingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
    };
  }, []);

  const value = useMemo(
    (): RealtimeContextType => ({
      isConnected,
      onlineUsers,
      typingUsers,
      sendTyping,
      reconnect,
      subscribe,
    }),
    [isConnected, onlineUsers, typingUsers, sendTyping, reconnect, subscribe]
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}
