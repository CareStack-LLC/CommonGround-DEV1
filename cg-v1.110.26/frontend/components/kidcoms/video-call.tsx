'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import DailyIframe, { DailyCall, DailyParticipant } from '@daily-co/daily-js';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Loader2,
} from 'lucide-react';

interface VideoCallProps {
  roomUrl: string;
  token: string;
  userName: string;
  sessionId?: string;
  callType?: 'parent' | 'circle';
  ariaEnabled?: boolean;
  frameCaptureIntervalMs?: number;
  onLeave?: () => void;
  onParticipantJoined?: (participant: DailyParticipant) => void;
  onParticipantLeft?: (participant: DailyParticipant) => void;
  onError?: (error: string) => void;
  onAriaIntervention?: (data: AriaInterventionData) => void;
}

export interface AriaInterventionData {
  type: string;
  flag_id: string;
  participant_id: string;
  severity: string;
  message: string;
  should_terminate: boolean;
  requires_acknowledgment: boolean;
  strike_number: number;
  violation_source?: string;
}

interface ParticipantTile {
  sessionId: string;
  userName: string;
  isLocal: boolean;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  videoOn: boolean;
  audioOn: boolean;
}

export default function VideoCall({
  roomUrl,
  token,
  userName,
  sessionId,
  callType = 'parent',
  ariaEnabled = true,
  frameCaptureIntervalMs = 10000,
  onLeave,
  onParticipantJoined,
  onParticipantLeft,
  onError,
  onAriaIntervention,
}: VideoCallProps) {
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [participants, setParticipants] = useState<Map<string, ParticipantTile>>(new Map());
  const [isJoining, setIsJoining] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const callCreatedRef = useRef(false);
  const callRef = useRef<DailyCall | null>(null);

  // ARIA frame capture refs
  const frameCountRef = useRef(0);
  const frameCaptureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Daily.co call
  useEffect(() => {
    if (callCreatedRef.current) return;
    callCreatedRef.current = true;

    const call = DailyIframe.createCallObject({
      audioSource: true,
      videoSource: true,
    });

    callRef.current = call;
    setCallObject(call);

    const onJoinedMeeting = () => {
      setIsJoining(false);
      updateParticipants(call.participants());
    };

    const onParticipantJoinedEvent = (event: { participant: DailyParticipant }) => {
      onParticipantJoined?.(event.participant);
      updateParticipants(call.participants());
    };

    const onParticipantLeftEvent = (event: { participant: DailyParticipant }) => {
      onParticipantLeft?.(event.participant);
      updateParticipants(call.participants());
    };

    const onParticipantUpdatedEvent = () => {
      updateParticipants(call.participants());
    };

    const onErrorEvent = (event: { errorMsg?: string }) => {
      console.error('Daily.co error:', event);
      const errorMsg = event?.errorMsg || 'Call error';
      setError(errorMsg);
      onError?.(errorMsg);
    };

    const onLeftMeeting = () => {
      onLeave?.();
    };

    call.on('joined-meeting', onJoinedMeeting);
    call.on('participant-joined', onParticipantJoinedEvent as Parameters<typeof call.on>[1]);
    call.on('participant-left', onParticipantLeftEvent as Parameters<typeof call.on>[1]);
    call.on('participant-updated', onParticipantUpdatedEvent as Parameters<typeof call.on>[1]);
    call.on('error', onErrorEvent as Parameters<typeof call.on>[1]);
    call.on('left-meeting', onLeftMeeting);

    call
      .join({
        url: roomUrl,
        token: token,
        userName: userName,
      })
      .catch((err) => {
        console.error('Error joining meeting:', err);
        setError('Failed to join meeting');
        setIsJoining(false);
        onError?.('Failed to join meeting');
      });

    return () => {
      if (callRef.current) {
        callRef.current.off('joined-meeting', onJoinedMeeting);
        callRef.current.off('participant-joined', onParticipantJoinedEvent as Parameters<typeof call.on>[1]);
        callRef.current.off('participant-left', onParticipantLeftEvent as Parameters<typeof call.on>[1]);
        callRef.current.off('participant-updated', onParticipantUpdatedEvent as Parameters<typeof call.on>[1]);
        callRef.current.off('error', onErrorEvent as Parameters<typeof call.on>[1]);
        callRef.current.off('left-meeting', onLeftMeeting);
        callRef.current.leave();
        callRef.current.destroy();
        callRef.current = null;
        callCreatedRef.current = false;
      }
    };
  }, []);

  // ARIA frame capture
  useEffect(() => {
    if (!ariaEnabled || !sessionId || !callObject || isJoining) return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
    const endpoint = callType === 'circle'
      ? `${apiBase}/api/v1/circle-calls/${sessionId}/video-frame`
      : `${apiBase}/api/v1/parent-calls/${sessionId}/video-frame`;

    const captureAndSendFrames = async () => {
      const videoElements = document.querySelectorAll<HTMLVideoElement>('video');

      for (const videoEl of Array.from(videoElements)) {
        if (videoEl.readyState < 2 || videoEl.videoWidth === 0) continue;

        try {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          ctx.drawImage(videoEl, 0, 0, 640, 480);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

          const tile = videoEl.closest('[data-participant-id]');
          const participantId = tile?.getAttribute('data-participant-id') || 'unknown';

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sessionSummary = callObject?.meetingSessionSummary?.() as any;
          const callStartTime = sessionSummary?.startedAt as string | undefined;
          const callTimeSeconds = callStartTime
            ? (Date.now() - new Date(callStartTime).getTime()) / 1000
            : 0;

          frameCountRef.current += 1;

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              frame_b64: base64Data,
              participant_id: participantId,
              frame_number: frameCountRef.current,
              call_time_seconds: callTimeSeconds,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.flagged && result.intervention && onAriaIntervention) {
              onAriaIntervention(result.intervention);
            }
          }
        } catch (err) {
          console.error('ARIA frame capture error:', err);
        }
      }
    };

    frameCaptureIntervalRef.current = setInterval(captureAndSendFrames, frameCaptureIntervalMs);

    return () => {
      if (frameCaptureIntervalRef.current) {
        clearInterval(frameCaptureIntervalRef.current);
        frameCaptureIntervalRef.current = null;
      }
    };
  }, [ariaEnabled, sessionId, callObject, isJoining, callType, frameCaptureIntervalMs, onAriaIntervention]);

  function updateParticipants(dailyParticipants: Record<string, DailyParticipant>) {
    const newParticipants = new Map<string, ParticipantTile>();

    Object.values(dailyParticipants).forEach((p) => {
      const tracks = p.tracks;
      newParticipants.set(p.session_id, {
        sessionId: p.session_id,
        userName: p.user_name || 'Guest',
        isLocal: p.local,
        videoTrack: tracks?.video?.track || null,
        audioTrack: tracks?.audio?.track || null,
        videoOn: tracks?.video?.state === 'playable',
        audioOn: tracks?.audio?.state === 'playable',
      });
    });

    setParticipants(newParticipants);
  }

  const toggleVideo = useCallback(() => {
    if (callObject) {
      callObject.setLocalVideo(!isVideoOn);
      setIsVideoOn(!isVideoOn);
    }
  }, [callObject, isVideoOn]);

  const toggleAudio = useCallback(() => {
    if (callObject) {
      callObject.setLocalAudio(!isAudioOn);
      setIsAudioOn(!isAudioOn);
    }
  }, [callObject, isAudioOn]);

  const leaveCall = useCallback(() => {
    if (callObject) {
      callObject.leave();
    }
  }, [callObject]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0D1B24] rounded-2xl border border-[#1E3A4A]/50">
        <div className="text-center p-8">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <VideoOff className="h-10 w-10 text-red-400" />
          </div>
          <p className="text-white font-semibold mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Connection Error
          </p>
          <p className="text-[#CBD8E0]/60 mb-6 text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
            {error}
          </p>
          <button
            onClick={onLeave}
            className="px-6 py-2.5 bg-[#1E3A4A] hover:bg-[#1E3A4A]/80 text-white rounded-xl font-medium transition-colors border border-[#3DAA8A]/20"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isJoining) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0D1B24] rounded-2xl border border-[#1E3A4A]/50">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-[#3DAA8A] rounded-full blur-xl opacity-20 animate-pulse" />
            <Loader2 className="relative h-12 w-12 animate-spin text-[#3DAA8A] mx-auto mb-4" />
          </div>
          <p className="text-white font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Connecting to call...
          </p>
          <p className="text-[#CBD8E0]/50 text-sm mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>
            Setting up secure connection
          </p>
        </div>
      </div>
    );
  }

  const participantList = Array.from(participants.values());

  return (
    <div className="h-full flex flex-col bg-[#0D1B24] rounded-2xl overflow-hidden border border-[#1E3A4A]/50">
      {/* Video Grid */}
      <div className="flex-1 p-3">
        {participantList.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#3DAA8A]/10 flex items-center justify-center mx-auto mb-4">
                <Video className="h-8 w-8 text-[#3DAA8A]" />
              </div>
              <p className="text-[#CBD8E0]/60" style={{ fontFamily: "'Inter', sans-serif" }}>
                Waiting for others to join...
              </p>
            </div>
          </div>
        ) : (
          <div
            className={`grid gap-3 h-full ${
              participantList.length === 1
                ? 'grid-cols-1'
                : participantList.length === 2
                ? 'grid-cols-2'
                : participantList.length <= 4
                ? 'grid-cols-2 grid-rows-2'
                : 'grid-cols-3 grid-rows-2'
            }`}
          >
            {participantList.map((participant) => (
              <VideoTile
                key={participant.sessionId}
                participant={participant}
                isLarge={participantList.length === 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-[#1E3A4A]/60 backdrop-blur-sm px-6 py-4 flex items-center justify-center space-x-3 border-t border-[#3DAA8A]/10">
        <button
          onClick={toggleAudio}
          className={`p-4 rounded-full transition-all duration-200 ${
            isAudioOn
              ? 'bg-[#1E3A4A] hover:bg-[#1E3A4A]/80 text-white hover:scale-105'
              : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
          }`}
          title={isAudioOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isAudioOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-all duration-200 ${
            isVideoOn
              ? 'bg-[#1E3A4A] hover:bg-[#1E3A4A]/80 text-white hover:scale-105'
              : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
          }`}
          title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
        </button>

        <button
          onClick={leaveCall}
          className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200 hover:scale-105 shadow-lg shadow-red-500/25"
          title="Leave call"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

// Video Tile Component
interface VideoTileProps {
  participant: ParticipantTile;
  isLarge?: boolean;
}

function VideoTile({ participant, isLarge = false }: VideoTileProps) {
  const videoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      if (node && participant.videoTrack) {
        const stream = new MediaStream([participant.videoTrack]);
        node.srcObject = stream;
        node.play().catch(console.error);
      }
    },
    [participant.videoTrack]
  );

  return (
    <div
      data-participant-id={participant.sessionId}
      className={`relative bg-[#1E3A4A]/50 rounded-xl overflow-hidden ring-1 ring-[#3DAA8A]/10 ${
        isLarge ? 'aspect-video' : ''
      }`}
    >
      {participant.videoOn && participant.videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1E3A4A] to-[#0D1B24]">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3DAA8A] to-[#2D6A8F] flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-[#3DAA8A]/20" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {participant.userName[0]?.toUpperCase() || '?'}
          </div>
        </div>
      )}

      {/* Participant Name */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-medium drop-shadow-lg" style={{ fontFamily: "'Inter', sans-serif" }}>
            {participant.userName}
            {participant.isLocal && (
              <span className="text-[#3DAA8A] ml-1">(You)</span>
            )}
          </span>
          <div className="flex items-center space-x-2">
            {!participant.audioOn && (
              <div className="p-1 bg-red-500/20 rounded-full">
                <MicOff className="h-3.5 w-3.5 text-red-400" />
              </div>
            )}
            {!participant.videoOn && (
              <div className="p-1 bg-red-500/20 rounded-full">
                <VideoOff className="h-3.5 w-3.5 text-red-400" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
