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
  onLeave?: () => void;
  onParticipantJoined?: (participant: DailyParticipant) => void;
  onParticipantLeft?: (participant: DailyParticipant) => void;
  onError?: (error: string) => void;
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
  onLeave,
  onParticipantJoined,
  onParticipantLeft,
  onError,
}: VideoCallProps) {
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [participants, setParticipants] = useState<Map<string, ParticipantTile>>(new Map());
  const [isJoining, setIsJoining] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track if we've already created a call object (prevents duplicate in React Strict Mode)
  const callCreatedRef = useRef(false);
  const callRef = useRef<DailyCall | null>(null);

  // Initialize Daily.co call
  useEffect(() => {
    // Prevent duplicate call creation in React Strict Mode
    if (callCreatedRef.current) {
      return;
    }
    callCreatedRef.current = true;

    const call = DailyIframe.createCallObject({
      audioSource: true,
      videoSource: true,
    });

    callRef.current = call;
    setCallObject(call);

    // Event handlers
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

    // Set up event handlers
    call.on('joined-meeting', onJoinedMeeting);
    call.on('participant-joined', onParticipantJoinedEvent as Parameters<typeof call.on>[1]);
    call.on('participant-left', onParticipantLeftEvent as Parameters<typeof call.on>[1]);
    call.on('participant-updated', onParticipantUpdatedEvent as Parameters<typeof call.on>[1]);
    call.on('error', onErrorEvent as Parameters<typeof call.on>[1]);
    call.on('left-meeting', onLeftMeeting);

    // Join the meeting
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

    // Cleanup on unmount
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
  }, []); // Remove dependencies to prevent recreation

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
      <div className="h-full flex items-center justify-center bg-gray-900 rounded-xl">
        <div className="text-center p-8">
          <div className="text-red-500 mb-4">
            <VideoOff className="h-16 w-16 mx-auto" />
          </div>
          <p className="text-white mb-4">{error}</p>
          <button
            onClick={onLeave}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isJoining) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900 rounded-xl">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-white">Connecting to call...</p>
        </div>
      </div>
    );
  }

  const participantList = Array.from(participants.values());
  const localParticipant = participantList.find((p) => p.isLocal);
  const remoteParticipants = participantList.filter((p) => !p.isLocal);

  return (
    <div className="h-full flex flex-col bg-gray-900 rounded-xl overflow-hidden">
      {/* Video Grid */}
      <div className="flex-1 p-4">
        {participantList.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-400">Waiting for others to join...</p>
          </div>
        ) : (
          <div
            className={`grid gap-4 h-full ${
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
      <div className="bg-gray-800 px-6 py-4 flex items-center justify-center space-x-4">
        <button
          onClick={toggleAudio}
          className={`p-4 rounded-full transition-colors ${
            isAudioOn
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          title={isAudioOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isAudioOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-colors ${
            isVideoOn
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
        </button>

        <button
          onClick={leaveCall}
          className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white"
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
      className={`relative bg-gray-800 rounded-lg overflow-hidden ${
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
        <div className="w-full h-full flex items-center justify-center bg-gray-700">
          <div className="w-20 h-20 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-semibold">
            {participant.userName[0]?.toUpperCase() || '?'}
          </div>
        </div>
      )}

      {/* Participant Name */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-medium">
            {participant.userName}
            {participant.isLocal && ' (You)'}
          </span>
          <div className="flex items-center space-x-2">
            {!participant.audioOn && (
              <MicOff className="h-4 w-4 text-red-400" />
            )}
            {!participant.videoOn && (
              <VideoOff className="h-4 w-4 text-red-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
