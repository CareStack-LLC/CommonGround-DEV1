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

// WS5: New real-time event types
export interface ExchangeCreatedEvent {
  type: 'exchange_created';
  family_file_id: string;
  exchange_id: string;
  exchange: {
    id: string;
    title: string;
    exchange_type: string;
    scheduled_time: string;
    location: string;
    is_recurring: boolean;
    status: string;
  };
  timestamp: string;
}

export interface ExchangeUpdatedEvent {
  type: 'exchange_updated';
  family_file_id: string;
  exchange_id: string;
  exchange: {
    id: string;
    title: string;
    exchange_type: string;
    scheduled_time: string;
    location: string;
    status: string;
  };
  timestamp: string;
}

export interface ExchangeCheckinEvent {
  type: 'exchange_checkin';
  family_file_id: string;
  exchange_id: string;
  parent_id: string;
  checkin_type: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    in_geofence?: boolean;
    distance_meters?: number;
  };
  timestamp: string;
}

export interface ObligationCreatedEvent {
  type: 'obligation_created';
  family_file_id: string;
  obligation_id: string;
  obligation: {
    id: string;
    title: string;
    purpose_category: string;
    total_amount: string;
    status: string;
    due_date?: string;
  };
  timestamp: string;
}

export interface ObligationUpdatedEvent {
  type: 'obligation_updated';
  family_file_id: string;
  obligation_id: string;
  obligation: {
    id: string;
    title: string;
    status: string;
    amount_funded?: string;
    total_amount?: string;
  };
  timestamp: string;
}

export interface PaymentReceivedEvent {
  type: 'payment_received';
  family_file_id: string;
  obligation_id: string;
  payer_id: string;
  amount: string;
  timestamp: string;
}

export interface BalanceChangedEvent {
  type: 'balance_changed';
  family_file_id: string;
  balance: Record<string, unknown>;
  timestamp: string;
}

export interface DashboardUpdateEvent {
  type: 'dashboard_update';
  family_file_id: string;
  summary: Record<string, unknown>;
  timestamp: string;
}

// WS6: Geofence notifications
export interface GeofenceEntryEvent {
  type: 'geofence_entry';
  family_file_id: string;
  exchange_id: string;
  parent_id: string;
  parent_name: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    distance_meters?: number;
  };
  message: string;
  timestamp: string;
}

// WS5: Schedule Event real-time notifications
export interface EventCreatedEvent {
  type: 'event_created';
  family_file_id: string;
  case_id: string;
  event_id: string;
  event: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    event_category: string;
    visibility: string;
    location?: string;
  };
  timestamp: string;
}

export interface EventUpdatedEvent {
  type: 'event_updated';
  family_file_id: string;
  case_id: string;
  event_id: string;
  event: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    event_category: string;
    visibility: string;
    location?: string;
  };
  timestamp: string;
}

export interface EventDeletedEvent {
  type: 'event_deleted';
  family_file_id: string;
  case_id: string;
  event_id: string;
  timestamp: string;
}

// WS5: Agreement real-time notifications
export interface AgreementCreatedEvent {
  type: 'agreement_created';
  case_id: string;
  agreement_id: string;
  agreement: {
    id: string;
    title: string;
    status: string;
    version: number;
  };
  timestamp: string;
}

export interface AgreementUpdatedEvent {
  type: 'agreement_updated';
  case_id: string;
  agreement_id: string;
  section_id: string;
  section_number: number;
  is_completed: boolean;
  timestamp: string;
}

export interface AgreementApprovedEvent {
  type: 'agreement_approved';
  case_id: string;
  family_file_id: string;
  agreement_id: string;
  agreement: {
    id: string;
    title: string;
    status: string;
    petitioner_approved: boolean;
    respondent_approved: boolean;
  };
  user_role: string;
  timestamp: string;
}

// KidComs Call Notifications
export interface KidComsCallIncomingEvent {
  type: 'kidcoms_call_incoming';
  family_file_id: string;
  session_id: string;
  child_id: string;
  child_name: string;
  caller_id: string;
  caller_name: string;
  session_type: string;
  caller_type?: string;
  target_user_id?: string;
  target_contact_id?: string;
  timestamp: string;
}

// Parent-to-Parent Call Notifications
export interface IncomingCallEvent {
  type: 'incoming_call';
  session_id: string;
  caller_id: string;
  caller_name: string;
  call_type: 'video' | 'audio';
  family_file_id: string;
}

// ARIA Real-time Intervention Events
export interface ARIAInterventionEvent {
  type: 'aria_intervention';
  session_id: string;
  flag_id: string;
  severity: 'high' | 'severe';
  intervention_type: 'warning' | 'mute' | 'terminate';
  warning_message: string;
  should_terminate: boolean;
  termination_delay?: number;
  should_mute: boolean;
  mute_speaker_id?: string;
  mute_duration_seconds?: number;
  call_time_seconds: number;
  timestamp: string;
}

export type WebSocketEventType =
  | 'new_message'
  | 'typing'
  | 'user_status'
  | 'exchange_created'
  | 'exchange_updated'
  | 'exchange_checkin'
  | 'obligation_created'
  | 'obligation_updated'
  | 'payment_received'
  | 'balance_changed'
  | 'dashboard_update'
  | 'geofence_entry'
  | 'event_created'
  | 'event_updated'
  | 'event_deleted'
  | 'agreement_created'
  | 'agreement_updated'
  | 'agreement_approved'
  | 'kidcoms_call_incoming'
  | 'incoming_call'
  | 'aria_intervention'
  | 'status'
  | 'error'
  | 'pong';

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
