/**
 * Stub DailyCallProvider for Expo Go
 * Provides no-op implementations when native modules aren't available
 */

import React, { createContext, useContext, ReactNode } from 'react';
import {
  CallState,
  CallSession,
  CallParticipant,
  ParticipantType,
  CallOptions,
  DailyCallContext,
} from './types';

const stubContext: DailyCallContext = {
  callState: 'idle',
  session: null,
  participants: [],
  localParticipant: null,
  isVideoOn: false,
  isAudioOn: false,
  isSpeakerOn: false,
  isRecording: false,
  error: 'Video calling not available in Expo Go',
  callDuration: 0,
  initiateCall: async () => {
    console.warn('Video calling not available in Expo Go');
    return false;
  },
  joinCall: async () => {
    console.warn('Video calling not available in Expo Go');
    return false;
  },
  endCall: async () => {
    console.warn('Video calling not available in Expo Go');
  },
  declineCall: async () => {
    console.warn('Video calling not available in Expo Go');
  },
  toggleVideo: () => {
    console.warn('Video calling not available in Expo Go');
  },
  toggleAudio: () => {
    console.warn('Video calling not available in Expo Go');
  },
  toggleSpeaker: () => {
    console.warn('Video calling not available in Expo Go');
  },
  switchCamera: () => {
    console.warn('Video calling not available in Expo Go');
  },
  startRecording: async () => {
    console.warn('Video calling not available in Expo Go');
    return false;
  },
  stopRecording: async () => {
    console.warn('Video calling not available in Expo Go');
  },
};

const DailyCallContextInternal = createContext<DailyCallContext>(stubContext);

interface DailyCallProviderProps {
  children: ReactNode;
  userType: ParticipantType;
  videoAPI: any;
  onIncomingCall?: (call: { sessionId: string; callerName: string }) => void;
  onCallEnded?: (sessionId: string) => void;
}

export function DailyCallProvider({ children }: DailyCallProviderProps) {
  // In Expo Go, just pass through children with stub context
  return (
    <DailyCallContextInternal.Provider value={stubContext}>
      {children}
    </DailyCallContextInternal.Provider>
  );
}

export function useDailyCall(): DailyCallContext {
  return useContext(DailyCallContextInternal);
}
