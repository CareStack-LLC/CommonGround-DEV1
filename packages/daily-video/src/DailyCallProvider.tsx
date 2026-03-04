/**
 * Daily.co Call Provider
 * Provides video calling functionality using Daily.co SDK
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import Daily, {
  DailyCall,
  DailyEvent,
  DailyEventObjectParticipant,
  DailyEventObjectParticipantLeft,
  DailyParticipant,
} from '@daily-co/react-native-daily-js';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

import {
  CallState,
  CallSession,
  CallParticipant,
  ParticipantType,
  CallOptions,
  DailyCallContext,
} from './types';

// API functions - these should be imported from @commonground/api-client
// but we define the interface here for type safety
interface VideoAPI {
  initiateCall: (
    request: {
      recipient_id: string;
      recipient_type: ParticipantType;
      family_file_id: string;
    },
    authType: 'parent' | 'child' | 'circle'
  ) => Promise<{
    session: {
      id: string;
      room_url: string;
      room_name: string;
      status: string;
      caller_id: string;
      caller_type: ParticipantType;
      caller_name: string;
      recipient_id: string;
      recipient_type: ParticipantType;
      recipient_name: string;
      family_file_id: string;
    };
    room_config: {
      room_url: string;
      room_name: string;
      token: string;
      expires_at: string;
    };
  }>;
  joinCall: (
    sessionId: string,
    authType: 'parent' | 'child' | 'circle'
  ) => Promise<{
    session: any;
    room_config: {
      room_url: string;
      token: string;
    };
  }>;
  endCall: (
    sessionId: string,
    reason: string,
    authType: 'parent' | 'child' | 'circle'
  ) => Promise<void>;
  declineCall: (sessionId: string, authType: 'parent' | 'child' | 'circle') => Promise<void>;
  startRecording: (sessionId: string) => Promise<{ recording_id: string }>;
  stopRecording: (sessionId: string) => Promise<void>;
}

interface DailyCallProviderProps {
  children: ReactNode;
  userType: ParticipantType;
  videoAPI: VideoAPI;
  onIncomingCall?: (call: { sessionId: string; callerName: string }) => void;
  onCallEnded?: (sessionId: string) => void;
}

const DailyCallContextInternal = createContext<DailyCallContext | undefined>(undefined);

export function DailyCallProvider({
  children,
  userType,
  videoAPI,
  onIncomingCall,
  onCallEnded,
}: DailyCallProviderProps) {
  const callRef = useRef<DailyCall | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [callState, setCallState] = useState<CallState>('idle');
  const [session, setSession] = useState<CallSession | null>(null);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<CallParticipant | null>(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  // Convert Daily participant to our format
  const convertParticipant = useCallback(
    (dailyParticipant: DailyParticipant, isLocal: boolean): CallParticipant => ({
      id: dailyParticipant.user_id || dailyParticipant.session_id,
      sessionId: dailyParticipant.session_id,
      userId: dailyParticipant.user_id || '',
      userName: dailyParticipant.user_name || 'Unknown',
      userType: (dailyParticipant.userData?.userType as ParticipantType) || 'parent',
      avatarUrl: dailyParticipant.userData?.avatarUrl as string | undefined,
      isLocal,
      isVideoOn: dailyParticipant.video || false,
      isAudioOn: dailyParticipant.audio || false,
      isSpeaking: false, // Will be updated by active-speaker events
      joinedAt: new Date(dailyParticipant.joined_at || Date.now()),
    }),
    []
  );

  // Set up Daily.co event handlers
  const setupEventHandlers = useCallback(
    (call: DailyCall) => {
      call.on('joining-meeting', () => {
        setCallState('connecting');
      });

      call.on('joined-meeting', (event) => {
        setCallState('connected');
        if (event?.participants?.local) {
          setLocalParticipant(convertParticipant(event.participants.local, true));
        }

        // Start duration timer
        durationIntervalRef.current = setInterval(() => {
          setCallDuration((d) => d + 1);
        }, 1000);
      });

      call.on('participant-joined', (event: DailyEventObjectParticipant | undefined) => {
        if (event?.participant && !event.participant.local) {
          setParticipants((prev) => [
            ...prev.filter((p) => p.sessionId !== event.participant.session_id),
            convertParticipant(event.participant, false),
          ]);
        }
      });

      call.on('participant-updated', (event: DailyEventObjectParticipant | undefined) => {
        if (event?.participant) {
          if (event.participant.local) {
            setLocalParticipant(convertParticipant(event.participant, true));
            setIsVideoOn(event.participant.video || false);
            setIsAudioOn(event.participant.audio || false);
          } else {
            setParticipants((prev) =>
              prev.map((p) =>
                p.sessionId === event.participant.session_id
                  ? convertParticipant(event.participant, false)
                  : p
              )
            );
          }
        }
      });

      call.on('participant-left', (event: DailyEventObjectParticipantLeft | undefined) => {
        if (event?.participant) {
          setParticipants((prev) =>
            prev.filter((p) => p.sessionId !== event.participant.session_id)
          );
        }
      });

      call.on('left-meeting', () => {
        setCallState('ended');
        cleanup();
      });

      call.on('error', (event) => {
        console.error('Daily.co error:', event);
        setError(event?.errorMsg || 'An error occurred');
        setCallState('error');
      });

      call.on('network-quality-change', (event) => {
        if (event?.quality === 'very-low') {
          setCallState('reconnecting');
        } else if (callState === 'reconnecting') {
          setCallState('connected');
        }
      });
    },
    [callState, convertParticipant]
  );

  // Cleanup function
  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (callRef.current) {
      callRef.current.destroy();
      callRef.current = null;
    }

    setSession(null);
    setParticipants([]);
    setLocalParticipant(null);
    setCallDuration(0);
    setIsRecording(false);
    setError(null);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Initiate a call
  const initiateCall = useCallback(
    async (
      recipientId: string,
      recipientType: ParticipantType,
      familyFileId: string,
      options: CallOptions = {}
    ): Promise<boolean> => {
      try {
        setCallState('connecting');
        setError(null);

        // Call the API to initiate the call
        const response = await videoAPI.initiateCall(
          {
            recipient_id: recipientId,
            recipient_type: recipientType,
            family_file_id: familyFileId,
          },
          userType
        );

        const { session: apiSession, room_config } = response;

        // Create session object
        // Recording is automatic based on family settings - check API response for recording_enabled
        const recordingEnabled = (apiSession as any).recording_enabled ?? false;
        const newSession: CallSession = {
          id: apiSession.id,
          roomUrl: room_config.room_url,
          roomName: room_config.room_name,
          token: room_config.token,
          status: 'pending',
          callerId: apiSession.caller_id,
          callerType: apiSession.caller_type,
          callerName: apiSession.caller_name,
          recipientId: apiSession.recipient_id,
          recipientType: apiSession.recipient_type,
          recipientName: apiSession.recipient_name,
          familyFileId: apiSession.family_file_id,
          isRecording: recordingEnabled, // Recording starts automatically when call is active
        };

        // Update isRecording state based on session
        setIsRecording(recordingEnabled);

        setSession(newSession);
        setCallState('ringing');

        // Create Daily.co call object
        const call = Daily.createCallObject({
          videoSource: options.videoEnabled !== false,
          audioSource: options.audioEnabled !== false,
        });

        callRef.current = call;
        setupEventHandlers(call);

        // Join the room
        await call.join({
          url: room_config.room_url,
          token: room_config.token,
          userName: options.userName,
          userData: {
            userType,
          },
        });

        setIsVideoOn(options.videoEnabled !== false);
        setIsAudioOn(options.audioEnabled !== false);

        return true;
      } catch (err) {
        console.error('Failed to initiate call:', err);
        setError(err instanceof Error ? err.message : 'Failed to initiate call');
        setCallState('error');
        cleanup();
        return false;
      }
    },
    [userType, videoAPI, setupEventHandlers, cleanup]
  );

  // Join an existing call
  const joinCall = useCallback(
    async (sessionId: string, options: CallOptions = {}): Promise<boolean> => {
      try {
        setCallState('connecting');
        setError(null);

        // Call the API to join the call
        const response = await videoAPI.joinCall(sessionId, userType);
        const { session: apiSession, room_config } = response;

        // Recording is automatic based on family settings - check API response for recording_enabled
        const recordingEnabled = (apiSession as any).recording_enabled ?? false;

        // Create session object
        const newSession: CallSession = {
          id: apiSession.id,
          roomUrl: room_config.room_url,
          roomName: apiSession.room_name,
          token: room_config.token,
          status: 'active',
          callerId: apiSession.caller_id,
          callerType: apiSession.caller_type,
          callerName: apiSession.caller_name,
          recipientId: apiSession.recipient_id,
          recipientType: apiSession.recipient_type,
          recipientName: apiSession.recipient_name,
          familyFileId: apiSession.family_file_id,
          isRecording: recordingEnabled, // Recording starts automatically when call is active
        };

        setSession(newSession);
        setIsRecording(recordingEnabled);

        // Create Daily.co call object
        const call = Daily.createCallObject({
          videoSource: options.videoEnabled !== false,
          audioSource: options.audioEnabled !== false,
        });

        callRef.current = call;
        setupEventHandlers(call);

        // Join the room
        await call.join({
          url: room_config.room_url,
          token: room_config.token,
          userName: options.userName,
          userData: {
            userType,
          },
        });

        setIsVideoOn(options.videoEnabled !== false);
        setIsAudioOn(options.audioEnabled !== false);

        return true;
      } catch (err) {
        console.error('Failed to join call:', err);
        setError(err instanceof Error ? err.message : 'Failed to join call');
        setCallState('error');
        cleanup();
        return false;
      }
    },
    [userType, videoAPI, setupEventHandlers, cleanup]
  );

  // End the current call
  const endCall = useCallback(
    async (reason: 'completed' | 'declined' | 'no_answer' | 'error' = 'completed') => {
      try {
        if (session) {
          await videoAPI.endCall(session.id, reason, userType);
        }

        if (callRef.current) {
          await callRef.current.leave();
        }

        setCallState('ended');
        onCallEnded?.(session?.id || '');
        cleanup();
      } catch (err) {
        console.error('Failed to end call:', err);
        cleanup();
      }
    },
    [session, userType, videoAPI, onCallEnded, cleanup]
  );

  // Decline an incoming call
  const declineCall = useCallback(
    async (sessionId: string) => {
      try {
        await videoAPI.declineCall(sessionId, userType);
      } catch (err) {
        console.error('Failed to decline call:', err);
      }
    },
    [userType, videoAPI]
  );

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (callRef.current) {
      callRef.current.setLocalVideo(!isVideoOn);
      setIsVideoOn(!isVideoOn);
    }
  }, [isVideoOn]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (callRef.current) {
      callRef.current.setLocalAudio(!isAudioOn);
      setIsAudioOn(!isAudioOn);
    }
  }, [isAudioOn]);

  // Toggle speaker (earpiece vs loudspeaker)
  const toggleSpeaker = useCallback(async () => {
    const newSpeakerState = !isSpeakerOn;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: !newSpeakerState, // false = speaker, true = earpiece
        staysActiveInBackground: true,
      });
      setIsSpeakerOn(newSpeakerState);
    } catch (error) {
      console.error('[DailyCall] Error toggling speaker:', error);
    }
  }, [isSpeakerOn]);

  // Switch camera (front/back)
  const switchCamera = useCallback(() => {
    if (callRef.current) {
      callRef.current.cycleCamera();
    }
  }, []);

  // Start recording (parent only)
  // NOTE: Recording is automatic based on family settings.
  // This function is kept for API compatibility but recording
  // starts automatically when the call becomes active.
  const startRecording = useCallback(async (): Promise<boolean> => {
    if (!session || userType !== 'parent') {
      return false;
    }

    // Recording is automatic - if session has recording enabled, it's already recording
    if (session.isRecording) {
      console.log('[DailyCall] Recording is automatic - already recording');
      return true;
    }

    // Try to call API, but don't fail if endpoint doesn't exist
    try {
      await videoAPI.startRecording(session.id);
      setIsRecording(true);
      return true;
    } catch (err) {
      // Recording is controlled by family settings, not manual start/stop
      console.log('[DailyCall] Recording is automatic based on family settings');
      return false;
    }
  }, [session, userType, videoAPI]);

  // Stop recording (parent only)
  // NOTE: Recording is automatic and stops when the call ends.
  // This function is kept for API compatibility.
  const stopRecording = useCallback(async () => {
    if (!session || userType !== 'parent') {
      return;
    }

    // Recording stops automatically when call ends
    // Try to call API, but don't fail if endpoint doesn't exist
    try {
      await videoAPI.stopRecording(session.id);
      setIsRecording(false);
    } catch (err) {
      // Recording stops automatically when call ends
      console.log('[DailyCall] Recording stops automatically when call ends');
    }
  }, [session, userType, videoAPI]);

  const contextValue: DailyCallContext = {
    callState,
    session,
    participants,
    localParticipant,
    isVideoOn,
    isAudioOn,
    isSpeakerOn,
    isRecording,
    error,
    callDuration,
    initiateCall,
    joinCall,
    endCall,
    declineCall,
    toggleVideo,
    toggleAudio,
    toggleSpeaker,
    switchCamera,
    startRecording,
    stopRecording,
  };

  return (
    <DailyCallContextInternal.Provider value={contextValue}>
      {children}
    </DailyCallContextInternal.Provider>
  );
}

export function useDailyCall(): DailyCallContext {
  const context = useContext(DailyCallContextInternal);
  if (context === undefined) {
    throw new Error('useDailyCall must be used within a DailyCallProvider');
  }
  return context;
}
