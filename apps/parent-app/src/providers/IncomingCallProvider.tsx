/**
 * Incoming Call Provider
 *
 * Uses WebSocket to receive real-time incoming call notifications
 * and shows an incoming call UI when a child is trying to call.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Vibration,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from './AuthProvider';
import { useFamilyFile } from '@/hooks/useFamilyFile';
import { useRealtime } from './RealtimeProvider';
import { incomingCallAPI } from '@/lib/api';

interface IncomingCall {
  session_id: string;
  caller_id: string;
  caller_name: string;
  caller_type: 'child' | 'circle';
  room_url: string;
  created_at: string;
}

interface IncomingCallContextType {
  incomingCall: IncomingCall | null;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  isCheckingCalls: boolean;
}

const IncomingCallContext = createContext<IncomingCallContextType>({
  incomingCall: null,
  acceptCall: async () => {},
  rejectCall: async () => {},
  isCheckingCalls: false,
});

export function useIncomingCall() {
  return useContext(IncomingCallContext);
}

interface IncomingCallProviderProps {
  children: React.ReactNode;
}

export function IncomingCallProvider({ children }: IncomingCallProviderProps) {
  const { isAuthenticated } = useAuth();
  const { familyFile } = useFamilyFile();
  const { subscribe, isConnected } = useRealtime();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isCheckingCalls, setIsCheckingCalls] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const currentCallRef = useRef<string | null>(null);

  const familyFileId = familyFile?.id || null;

  // Handle incoming call from WebSocket
  const handleIncomingCall = useCallback((data: Record<string, unknown>) => {
    const sessionId = data.session_id as string;

    // Only process if it's a new call
    if (sessionId && sessionId !== currentCallRef.current) {
      currentCallRef.current = sessionId;

      const newCall: IncomingCall = {
        session_id: sessionId,
        caller_id: data.caller_id as string,
        caller_name: data.caller_name as string || data.child_name as string || 'Unknown',
        caller_type: (data.caller_type as 'child' | 'circle') || 'child',
        room_url: '', // Will be fetched when accepting
        created_at: data.timestamp as string || new Date().toISOString(),
      };

      setIncomingCall(newCall);

      // Vibrate to alert user
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, []);

  // Handle call ended from WebSocket
  const handleCallEnded = useCallback((data: Record<string, unknown>) => {
    const sessionId = data.session_id as string;

    // Clear if this is the current incoming call
    if (sessionId && sessionId === currentCallRef.current) {
      currentCallRef.current = null;
      setIncomingCall(null);
      Vibration.cancel();
    }
  }, []);

  // Subscribe to WebSocket events for incoming calls
  useEffect(() => {
    if (!isAuthenticated || !familyFileId) return;

    // Subscribe to incoming call events
    const unsubscribeIncoming = subscribe('kidcoms_call_incoming', handleIncomingCall);
    const unsubscribeEnded = subscribe('kidcoms_call_ended', handleCallEnded);

    return () => {
      unsubscribeIncoming();
      unsubscribeEnded();
    };
  }, [isAuthenticated, familyFileId, subscribe, handleIncomingCall, handleCallEnded]);

  // Fallback: Check for existing calls when reconnecting
  // This ensures we don't miss calls if WebSocket was disconnected
  useEffect(() => {
    if (!isAuthenticated || !familyFileId || !isConnected) return;

    const checkExistingCalls = async () => {
      try {
        setIsCheckingCalls(true);
        const response = await incomingCallAPI.checkIncomingCalls(familyFileId);

        if (response.calls && response.calls.length > 0) {
          const latestCall = response.calls[0];
          if (latestCall && latestCall.session_id !== currentCallRef.current) {
            handleIncomingCall({
              session_id: latestCall.session_id,
              caller_id: latestCall.caller_id,
              caller_name: latestCall.caller_name,
              caller_type: latestCall.caller_type,
              timestamp: latestCall.created_at,
            });
          }
        }
      } catch (error) {
        // Silently fail - might be 404 if no active sessions
        console.log('[IncomingCall] No active incoming calls');
      } finally {
        setIsCheckingCalls(false);
      }
    };

    // Check once when WebSocket connects
    checkExistingCalls();
  }, [isAuthenticated, familyFileId, isConnected, handleIncomingCall]);

  // Pulse animation for incoming call
  useEffect(() => {
    if (incomingCall) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [incomingCall, pulseAnim]);

  // Accept call
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Accept the call via API
      await incomingCallAPI.acceptCall(incomingCall.session_id);

      // Clear incoming call state
      currentCallRef.current = null;
      setIncomingCall(null);
      Vibration.cancel();

      // Navigate to call screen with session info
      router.push({
        pathname: '/call/[sessionId]',
        params: {
          sessionId: incomingCall.session_id,
          recipientName: incomingCall.caller_name,
          recipientType: incomingCall.caller_type,
        },
      });
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  }, [incomingCall]);

  // Reject call
  const rejectCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      // Reject the call via API
      await incomingCallAPI.rejectCall(incomingCall.session_id);

      // Clear incoming call state
      currentCallRef.current = null;
      setIncomingCall(null);
      Vibration.cancel();
    } catch (error) {
      console.error('Failed to reject call:', error);
    }
  }, [incomingCall]);

  const getCallerEmoji = (callerType: string, callerName: string) => {
    if (callerType === 'child') return '👧';
    if (callerName.toLowerCase().includes('grandma')) return '👵';
    if (callerName.toLowerCase().includes('grandpa')) return '👴';
    return '👤';
  };

  return (
    <IncomingCallContext.Provider
      value={{
        incomingCall,
        acceptCall,
        rejectCall,
        isCheckingCalls,
      }}
    >
      {children}

      {/* Incoming Call Modal */}
      <Modal
        visible={!!incomingCall}
        transparent
        animationType="fade"
        onRequestClose={rejectCall}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Caller Avatar */}
            <Animated.View
              style={[
                styles.avatarContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Text style={styles.avatarEmoji}>
                {incomingCall && getCallerEmoji(incomingCall.caller_type, incomingCall.caller_name)}
              </Text>
            </Animated.View>

            {/* Caller Info */}
            <Text style={styles.incomingText}>Incoming Call</Text>
            <Text style={styles.callerName}>
              {incomingCall?.caller_name || 'Unknown'}
            </Text>
            <Text style={styles.callerType}>
              {incomingCall?.caller_type === 'child' ? 'KidsCom Call' : 'Circle Call'}
            </Text>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              {/* Decline Button */}
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={rejectCall}
              >
                <View style={[styles.buttonInner, styles.declineButtonInner]}>
                  <Ionicons
                    name="call"
                    size={32}
                    color="white"
                    style={{ transform: [{ rotate: '135deg' }] }}
                  />
                </View>
                <Text style={styles.buttonLabel}>Decline</Text>
              </TouchableOpacity>

              {/* Accept Button */}
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={acceptCall}
              >
                <View style={[styles.buttonInner, styles.acceptButtonInner]}>
                  <Ionicons name="videocam" size={32} color="white" />
                </View>
                <Text style={styles.buttonLabel}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </IncomingCallContext.Provider>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    alignItems: 'center',
    padding: 32,
  },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#8b5cf6',
  },
  avatarEmoji: {
    fontSize: 70,
  },
  incomingText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  callerName: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  callerType: {
    color: '#8b5cf6',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 48,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 48,
  },
  actionButton: {
    alignItems: 'center',
  },
  buttonInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  declineButton: {},
  declineButtonInner: {
    backgroundColor: '#ef4444',
  },
  acceptButton: {},
  acceptButtonInner: {
    backgroundColor: '#22c55e',
  },
  buttonLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
