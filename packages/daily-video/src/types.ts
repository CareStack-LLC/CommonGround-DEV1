/**
 * Daily.co video calling types
 */

export type CallState =
  | 'idle'
  | 'connecting'
  | 'ringing'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'error';

export type ParticipantType = 'parent' | 'child' | 'circle';

export interface CallParticipant {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userType: ParticipantType;
  avatarUrl?: string;
  isLocal: boolean;
  isVideoOn: boolean;
  isAudioOn: boolean;
  isSpeaking: boolean;
  joinedAt: Date;
}

export interface CallSession {
  id: string;
  roomUrl: string;
  roomName: string;
  token: string;
  status: 'pending' | 'active' | 'ended';
  callerId: string;
  callerType: ParticipantType;
  callerName: string;
  recipientId: string;
  recipientType: ParticipantType;
  recipientName: string;
  familyFileId: string;
  startedAt?: Date;
  endedAt?: Date;
  isRecording: boolean;
}

export interface IncomingCall {
  sessionId: string;
  callerName: string;
  callerType: ParticipantType;
  callerAvatarUrl?: string;
  roomUrl: string;
}

export interface CallOptions {
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  userName?: string;
}

export interface DailyCallState {
  callState: CallState;
  session: CallSession | null;
  participants: CallParticipant[];
  localParticipant: CallParticipant | null;
  isVideoOn: boolean;
  isAudioOn: boolean;
  isSpeakerOn: boolean;
  isRecording: boolean;
  error: string | null;
  callDuration: number;
}

export interface DailyCallActions {
  initiateCall: (
    recipientId: string,
    recipientType: ParticipantType,
    familyFileId: string,
    options?: CallOptions
  ) => Promise<boolean>;
  joinCall: (sessionId: string, options?: CallOptions) => Promise<boolean>;
  endCall: (reason?: 'completed' | 'declined' | 'no_answer' | 'error') => Promise<void>;
  declineCall: (sessionId: string) => Promise<void>;
  toggleVideo: () => void;
  toggleAudio: () => void;
  toggleSpeaker: () => void;
  switchCamera: () => void;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<void>;
}

export type DailyCallContext = DailyCallState & DailyCallActions;
