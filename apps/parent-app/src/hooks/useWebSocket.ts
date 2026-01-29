/**
 * WebSocket Hook for Real-time Updates
 *
 * Connects to the backend WebSocket for real-time messaging,
 * typing indicators, and activity updates.
 *
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Keepalive ping/pong
 * - Subscribe to family file updates
 * - Typing indicators
 * - User online/offline status
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import { getAccessToken, getApiUrl } from "@commonground/api-client";

type MessageType =
  | "status"
  | "message"
  | "typing"
  | "user_status"
  | "activity"
  | "exchange_update"
  | "agreement_update"
  | "expense_update"
  | "event_update"
  | "kidcoms_call_incoming"
  | "kidcoms_call_ended"
  | "pong"
  | "error";

interface WebSocketMessage {
  type: MessageType;
  case_id?: string;
  user_id?: string;
  user_name?: string;
  sender_name?: string;
  content?: string;
  is_typing?: boolean;
  status?: "online" | "offline";
  timestamp?: string;
  server_time?: string;
  message?: string;
  online_users?: string[];
  data?: Record<string, unknown>;
}

interface UseWebSocketOptions {
  familyFileId: string | null;
  enabled?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onTyping?: (userId: string, isTyping: boolean) => void;
  onUserStatus?: (userId: string, status: "online" | "offline") => void;
  onActivity?: (data: Record<string, unknown>) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  sendTyping: (isTyping: boolean) => void;
  reconnect: () => void;
  onlineUsers: string[];
}

const PING_INTERVAL = 30000; // 30 seconds
const RECONNECT_BASE_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const MAX_RECONNECT_ATTEMPTS = 10;

export function useWebSocket({
  familyFileId,
  enabled = true,
  onMessage,
  onTyping,
  onUserStatus,
  onActivity,
}: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  // Get WebSocket URL
  const getWsUrl = useCallback(async (): Promise<string | null> => {
    const token = await getAccessToken();
    if (!token) return null;

    const apiUrl = getApiUrl();
    // Convert http(s) to ws(s)
    const wsUrl = apiUrl.replace(/^http/, "ws");
    return `${wsUrl}/ws?token=${encodeURIComponent(token)}`;
  }, []);

  // Send a message through WebSocket
  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Send typing indicator
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!familyFileId) return;
      sendMessage({
        type: "typing",
        case_id: familyFileId,
        is_typing: isTyping,
      });
    },
    [familyFileId, sendMessage]
  );

  // Handle incoming messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        // Handle different message types
        switch (message.type) {
          case "pong":
            // Keepalive response - no action needed
            break;

          case "status":
            console.log("WebSocket status:", message.message);
            if (message.online_users) {
              setOnlineUsers(message.online_users);
            }
            break;

          case "typing":
            if (message.user_id && message.is_typing !== undefined) {
              onTyping?.(message.user_id, message.is_typing);
            }
            break;

          case "user_status":
            if (message.user_id && message.status) {
              onUserStatus?.(message.user_id, message.status);
              // Update online users list
              if (message.status === "online") {
                setOnlineUsers((prev) =>
                  prev.includes(message.user_id!)
                    ? prev
                    : [...prev, message.user_id!]
                );
              } else {
                setOnlineUsers((prev) =>
                  prev.filter((id) => id !== message.user_id)
                );
              }
            }
            break;

          case "activity":
          case "exchange_update":
          case "agreement_update":
          case "expense_update":
          case "event_update":
          case "kidcoms_call_incoming":
          case "kidcoms_call_ended":
            onActivity?.(message.data || message);
            break;

          case "message":
            onMessage?.(message);
            break;

          case "error":
            console.error("WebSocket error:", message.message);
            break;
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    },
    [onMessage, onTyping, onUserStatus, onActivity]
  );

  // Start ping interval
  const startPing = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    pingIntervalRef.current = setInterval(() => {
      sendMessage({ type: "ping" });
    }, PING_INTERVAL);
  }, [sendMessage]);

  // Stop ping interval
  const stopPing = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (!enabled || !familyFileId) return;

    const wsUrl = await getWsUrl();
    if (!wsUrl) {
      console.warn("Cannot connect WebSocket: No auth token");
      return;
    }

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Subscribe to family file updates
        ws.send(
          JSON.stringify({
            type: "subscribe",
            case_id: familyFileId,
          })
        );

        // Start keepalive ping
        startPing();
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);
        setOnlineUsers([]);
        stopPing();

        // Auto-reconnect if not intentionally closed
        if (
          event.code !== 1000 &&
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS &&
          appStateRef.current === "active"
        ) {
          const delay = Math.min(
            RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptsRef.current),
            MAX_RECONNECT_DELAY
          );
          reconnectAttemptsRef.current++;

          console.log(
            `Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
    }
  }, [enabled, familyFileId, getWsUrl, handleMessage, startPing, stopPing]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    stopPing();

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "Intentional disconnect");
      wsRef.current = null;
    }

    setIsConnected(false);
    setOnlineUsers([]);
  }, [stopPing]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    connect();
  }, [connect, disconnect]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          // App came to foreground - reconnect if needed
          if (!isConnected && enabled && familyFileId) {
            reconnectAttemptsRef.current = 0;
            connect();
          }
        } else if (
          appStateRef.current === "active" &&
          nextAppState.match(/inactive|background/)
        ) {
          // App went to background - disconnect to save resources
          disconnect();
        }

        appStateRef.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, [connect, disconnect, enabled, familyFileId, isConnected]);

  // Connect/disconnect based on enabled and familyFileId
  useEffect(() => {
    if (enabled && familyFileId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, familyFileId, connect, disconnect]);

  return {
    isConnected,
    sendTyping,
    reconnect,
    onlineUsers,
  };
}
