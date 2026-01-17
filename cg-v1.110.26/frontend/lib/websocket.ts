/**
 * WebSocket client for real-time messaging.
 *
 * Provides auto-reconnect, heartbeat ping/pong, and event-based message handling.
 */

type MessageHandler = (data: WebSocketMessage) => void;

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export interface NewMessageEvent {
  type: 'new_message';
  message_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  sent_at: string;
  was_flagged: boolean;
}

export interface TypingEvent {
  type: 'typing';
  case_id: string;
  user_id: string;
  is_typing: boolean;
}

export interface UserStatusEvent {
  type: 'user_status';
  user_id: string;
  user_name: string;
  status: 'online' | 'offline';
}

export type WebSocketEventType = 'new_message' | 'typing' | 'user_status' | 'status' | 'error' | 'pong';

class WebSocketClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private subscribedCases: Set<string> = new Set();
  private isConnecting = false;
  private connectionPromise: Promise<void> | null = null;

  /**
   * Get WebSocket URL based on environment.
   */
  private getWsUrl(): string {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    // Convert http(s) to ws(s)
    const wsUrl = apiUrl.replace(/^http/, 'ws');
    return `${wsUrl}/api/v1/ws`;
  }

  /**
   * Connect to WebSocket server.
   */
  connect(token: string): Promise<void> {
    // If already connected with same token, return
    if (this.ws?.readyState === WebSocket.OPEN && this.token === token) {
      return Promise.resolve();
    }

    // If already connecting, return the existing promise
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.token = token;
    this.isConnecting = true;

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.getWsUrl()}?token=${encodeURIComponent(token)}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.startPingInterval();

          // Resubscribe to previously subscribed cases
          this.subscribedCases.forEach((caseId) => {
            this.sendSubscribe(caseId);
          });

          resolve();
        };

        this.ws.onclose = (event) => {
          console.log('[WebSocket] Disconnected', event.code, event.reason);
          this.isConnecting = false;
          this.stopPingInterval();

          // Attempt reconnect if not a normal close
          if (event.code !== 1000) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as WebSocketMessage;
            this.handleMessage(data);
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Disconnect from WebSocket server.
   */
  disconnect(): void {
    this.stopPingInterval();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.token = null;
    this.subscribedCases.clear();
    this.isConnecting = false;
    this.connectionPromise = null;
  }

  /**
   * Subscribe to a case for real-time updates.
   */
  subscribe(caseId: string): void {
    this.subscribedCases.add(caseId);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe(caseId);
    }
  }

  /**
   * Unsubscribe from a case.
   */
  unsubscribe(caseId: string): void {
    this.subscribedCases.delete(caseId);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', case_id: caseId }));
    }
  }

  /**
   * Send typing indicator.
   */
  sendTyping(caseId: string, isTyping: boolean): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'typing',
        case_id: caseId,
        is_typing: isTyping
      }));
    }
  }

  /**
   * Register a message handler.
   */
  on(eventType: string, handler: MessageHandler): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);
  }

  /**
   * Remove a message handler.
   */
  off(eventType: string, handler: MessageHandler): void {
    this.listeners.get(eventType)?.delete(handler);
  }

  /**
   * Check if connected.
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Send subscribe message to server.
   */
  private sendSubscribe(caseId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', case_id: caseId }));
    }
  }

  /**
   * Handle incoming message.
   */
  private handleMessage(data: WebSocketMessage): void {
    const eventType = data.type;

    // Dispatch to listeners
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[WebSocket] Handler error for ${eventType}:`, error);
        }
      });
    }

    // Also dispatch to '*' listeners (catch-all)
    const allHandlers = this.listeners.get('*');
    if (allHandlers) {
      allHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error('[WebSocket] Catch-all handler error:', error);
        }
      });
    }
  }

  /**
   * Start ping interval for keepalive.
   */
  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval.
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Schedule reconnect with exponential backoff.
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnect attempts reached');
      return;
    }

    if (!this.token) {
      console.log('[WebSocket] No token, skipping reconnect');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      if (this.token) {
        this.connect(this.token).catch((error) => {
          console.error('[WebSocket] Reconnect failed:', error);
        });
      }
    }, delay);
  }
}

// Export singleton instance
export const wsClient = new WebSocketClient();
