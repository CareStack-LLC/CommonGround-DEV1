'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { DailyCall, DailyParticipant } from '@daily-co/daily-js';
import { circleCallsAPI } from '@/lib/api';
import { wsClient, WebSocketMessage, CircleCallAriaAlertEvent } from '@/lib/websocket';
import {
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Loader2,
  ArrowLeft,
  Shield,
  AlertTriangle,
  Heart,
} from 'lucide-react';

interface CircleCallSession {
  sessionId: string;
  roomUrl: string;
  token: string;
  callType: 'video' | 'audio';
  status: string;
  childName: string;
  contactName: string;
}

interface VideoParticipant {
  sessionId: string;
  name: string;
  isLocal: boolean;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  videoOn: boolean;
  audioOn: boolean;
}

function ContactCircleCallContent() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [callSession, setCallSession] = useState<CircleCallSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callEnded, setCallEnded] = useState(false);

  // Daily.co call object
  const callRef = useRef<DailyCall | null>(null);
  const callCreatedRef = useRef(false);
  const [isCallJoined, setIsCallJoined] = useState(false);
  const [isJoiningCall, setIsJoiningCall] = useState(false);

  // Video/audio state
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [participants, setParticipants] = useState<Map<string, VideoParticipant>>(new Map());

  // ARIA Safety Alert state
  const [ariaAlert, setAriaAlert] = useState<{
    severity: string;
    message: string;
    callTerminated: boolean;
  } | null>(null);

  // Contact user data
  const [contactName, setContactName] = useState<string>('');

  useEffect(() => {
    loadCallSession();
  }, [sessionId]);

  // Initialize Daily.co call when session is loaded
  useEffect(() => {
    if (callSession && !callCreatedRef.current && !isJoiningCall) {
      initializeCall();
    }

    return () => {
      if (callRef.current) {
        callRef.current.destroy();
        callRef.current = null;
        callCreatedRef.current = false;
      }
    };
  }, [callSession]);

  // Listen for ARIA alerts via WebSocket
  useEffect(() => {
    if (!sessionId) return;

    const handleAriaAlert = (data: WebSocketMessage) => {
      const alertData = data as unknown as CircleCallAriaAlertEvent;
      if (alertData.session_id !== sessionId) return;

      setAriaAlert({
        severity: alertData.severity,
        message: alertData.message,
        callTerminated: alertData.call_terminated,
      });

      // If call terminated, end the call
      if (alertData.call_terminated) {
        setTimeout(() => {
          handleLeaveCall();
        }, 3000);
      } else {
        // Auto-clear alert after 10 seconds
        setTimeout(() => setAriaAlert(null), 10000);
      }
    };

    wsClient.on('circle_call_aria_alert', handleAriaAlert);

    return () => {
      wsClient.off('circle_call_aria_alert', handleAriaAlert);
    };
  }, [sessionId]);

  function loadCallSession() {
    try {
      const sessionStr = localStorage.getItem('circle_call_session');
      if (!sessionStr) {
        setError('No call session found');
        setIsLoading(false);
        return;
      }

      const session = JSON.parse(sessionStr) as CircleCallSession;
      if (session.sessionId !== sessionId) {
        setError('Session mismatch');
        setIsLoading(false);
        return;
      }

      // Load contact user data
      const userStr = localStorage.getItem('circle_user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setContactName(userData.contactName || session.contactName);
      } else {
        setContactName(session.contactName);
      }

      setCallSession(session);
      setIsLoading(false);
    } catch {
      setError('Failed to load call session');
      setIsLoading(false);
    }
  }

  function updateParticipants(dailyParticipants: Record<string, DailyParticipant>) {
    const newParticipants = new Map<string, VideoParticipant>();

    Object.values(dailyParticipants).forEach((p) => {
      const tracks = p.tracks;
      newParticipants.set(p.session_id, {
        sessionId: p.session_id,
        name: p.user_name || 'Guest',
        isLocal: p.local,
        videoTrack: tracks?.video?.persistentTrack || null,
        audioTrack: tracks?.audio?.persistentTrack || null,
        videoOn: tracks?.video?.state === 'playable',
        audioOn: tracks?.audio?.state === 'playable',
      });
    });

    setParticipants(newParticipants);
  }

  async function initializeCall() {
    if (!callSession || callCreatedRef.current) return;

    try {
      callCreatedRef.current = true;
      setIsJoiningCall(true);
      console.log('[Contact Circle Call] Creating Daily.co call object...');

      // Dynamically import Daily.co SDK
      const DailyIframe = (await import('@daily-co/daily-js')).default;

      const call = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: callSession.callType === 'video',
      });

      callRef.current = call;

      // Event handlers
      call.on('joined-meeting', () => {
        console.log('[Contact Circle Call] Joined meeting');
        setIsCallJoined(true);
        setIsJoiningCall(false);
        updateParticipants(call.participants());
      });

      call.on('participant-joined', () => {
        console.log('[Contact Circle Call] Participant joined');
        updateParticipants(call.participants());
      });

      call.on('participant-left', () => {
        console.log('[Contact Circle Call] Participant left');
        updateParticipants(call.participants());
      });

      call.on('participant-updated', () => {
        updateParticipants(call.participants());
      });

      call.on('track-started', () => {
        updateParticipants(call.participants());
      });

      call.on('track-stopped', () => {
        updateParticipants(call.participants());
      });

      call.on('left-meeting', () => {
        console.log('[Contact Circle Call] Left meeting');
        setIsCallJoined(false);
        handleEndCall();
      });

      call.on('error', (event) => {
        console.error('[Contact Circle Call] Daily.co error:', event);
        setError('Video call error occurred');
        setIsJoiningCall(false);
      });

      // Join the call
      console.log('[Contact Circle Call] Joining room...', { roomUrl: callSession.roomUrl });
      await call.join({
        url: callSession.roomUrl,
        token: callSession.token,
        userName: contactName,
      });

      console.log('[Contact Circle Call] Join completed');
    } catch (err) {
      console.error('[Contact Circle Call] Error initializing call:', err);
      setError('Failed to connect to call');
      setIsJoiningCall(false);
      callCreatedRef.current = false;
    }
  }

  function handleEndCall() {
    localStorage.removeItem('circle_call_session');
    setCallEnded(true);

    setTimeout(() => {
      router.push('/my-circle/contact/dashboard');
    }, 2000);
  }

  async function handleLeaveCall() {
    try {
      if (callRef.current) {
        await callRef.current.leave();
        callRef.current.destroy();
        callRef.current = null;
        callCreatedRef.current = false;
      }

      // Notify backend that call ended
      if (sessionId) {
        await circleCallsAPI.endCall(sessionId).catch(console.error);
      }

      handleEndCall();
    } catch (err) {
      console.error('[Contact Circle Call] Error leaving call:', err);
      handleEndCall();
    }
  }

  function handleGoBack() {
    if (callRef.current) {
      callRef.current.leave();
      callRef.current.destroy();
      callRef.current = null;
      callCreatedRef.current = false;
    }
    localStorage.removeItem('circle_call_session');
    router.push('/my-circle/contact/dashboard');
  }

  const toggleVideo = useCallback(async () => {
    if (callRef.current) {
      const newState = !isVideoOn;
      await callRef.current.setLocalVideo(newState);
      setIsVideoOn(newState);
    }
  }, [isVideoOn]);

  const toggleAudio = useCallback(async () => {
    if (callRef.current) {
      const newState = !isAudioOn;
      await callRef.current.setLocalAudio(newState);
      setIsAudioOn(newState);
    }
  }, [isAudioOn]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50/50 to-cg-background flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-100 to-cg-sage-subtle flex items-center justify-center mx-auto">
              <Heart className="h-10 w-10 text-teal-600 animate-pulse" />
            </div>
          </div>
          <p className="text-xl font-semibold text-foreground">Connecting your call...</p>
          <p className="text-muted-foreground mt-2">Almost there! 🎉</p>
        </div>
      </div>
    );
  }

  if (error || !callSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50/50 to-cg-background flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Oops!</h1>
          <p className="text-muted-foreground mb-6">{error || 'Something went wrong'}</p>
          <button
            onClick={handleGoBack}
            className="px-6 py-3 bg-teal-600 text-white rounded-full font-semibold hover:bg-teal-700 transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (callEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50/50 to-cg-background flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">👋</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Call Ended</h1>
          <p className="text-muted-foreground mb-4">
            You talked with {callSession.childName}!
          </p>
          <p className="text-sm text-gray-500">Returning to dashboard...</p>
        </div>
      </div>
    );
  }

  const participantList = Array.from(participants.values());
  const localParticipant = participantList.find((p) => p.isLocal);
  const remoteParticipants = participantList.filter((p) => !p.isLocal);

  return (
    <div className="flex h-screen bg-gradient-to-b from-teal-50/30 to-cg-background">
      {/* ARIA Safety Alert Overlay */}
      {ariaAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-3xl p-8 mx-4 max-w-md text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {ariaAlert.callTerminated ? 'Call Ending' : 'Safety Notice'}
            </h2>
            <p className="text-muted-foreground mb-4">{ariaAlert.message}</p>
            {!ariaAlert.callTerminated && (
              <button
                onClick={() => setAriaAlert(null)}
                className="px-6 py-2 bg-teal-600 text-white rounded-full font-semibold hover:bg-teal-700"
              >
                I Understand
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-sm border-b border-teal-100/50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleGoBack}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-teal-50 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-foreground font-semibold">
                {isCallJoined ? `Talking with ${callSession.childName}` : 'Connecting...'}
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                {callSession.callType === 'video' ? '📹 Video Call' : '📞 Voice Call'}
                <span className="inline-flex items-center gap-1 text-teal-600">
                  <Shield className="h-3 w-3" /> Protected
                </span>
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isCallJoined ? 'bg-cg-success/20 text-cg-success' : 'bg-amber-100 text-amber-700'}`}>
            {participantList.length} {participantList.length === 1 ? 'person' : 'people'}
          </span>
        </header>

        {/* Video Area */}
        <div className="flex-1 relative overflow-hidden">
          {!isCallJoined ? (
            <div className="h-full bg-gradient-to-br from-teal-600 to-teal-400 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-16 w-16 animate-spin text-white mx-auto mb-4" />
                <p className="text-white text-xl font-semibold">
                  {isJoiningCall ? 'Joining...' : 'Connecting...'}
                </p>
                <p className="text-white/80 mt-2">Almost there! 🚀</p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Layout */}
              <div className="md:hidden h-full relative">
                {remoteParticipants.length > 0 ? (
                  <VideoTile participant={remoteParticipants[0]} isFullScreen />
                ) : (
                  <div className="h-full bg-gradient-to-br from-teal-600 to-teal-400 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-4">⏳</div>
                      <p className="text-white text-lg font-semibold">Waiting for {callSession.childName}...</p>
                    </div>
                  </div>
                )}

                {/* Local participant PiP */}
                {localParticipant && (
                  <div className="absolute top-4 right-4 w-28 h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-teal-600 z-10">
                    <VideoTile participant={localParticipant} isCompact />
                  </div>
                )}
              </div>

              {/* Desktop Layout */}
              <div
                className="hidden md:grid h-full gap-2 p-2"
                style={{
                  gridTemplateColumns: participantList.length === 1 ? '1fr' : '1fr 1fr',
                  gridTemplateRows: '1fr',
                }}
              >
                {participantList.map((participant) => (
                  <VideoTile key={participant.sessionId} participant={participant} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Controls Bar */}
        <div className="bg-teal-600 px-4 py-4 shadow-lg">
          <div className="flex items-center justify-center space-x-4">
            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              disabled={!isCallJoined}
              className={`p-4 rounded-full transition-all transform hover:scale-105 ${
                isAudioOn
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              } ${!isCallJoined ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isAudioOn ? 'Mute' : 'Unmute'}
            >
              {isAudioOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </button>

            {/* Video Toggle */}
            {callSession.callType === 'video' && (
              <button
                onClick={toggleVideo}
                disabled={!isCallJoined}
                className={`p-4 rounded-full transition-all transform hover:scale-105 ${
                  isVideoOn
                    ? 'bg-white/20 hover:bg-white/30 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                } ${!isCallJoined ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
              >
                {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
              </button>
            )}

            {/* End Call */}
            <button
              onClick={handleLeaveCall}
              className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all transform hover:scale-105"
              title="Leave Call"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Video Tile Component (same as child version)
interface VideoTileProps {
  participant: VideoParticipant;
  isFullScreen?: boolean;
  isCompact?: boolean;
}

function VideoTile({ participant, isFullScreen, isCompact }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (participant.videoTrack) {
      const stream = new MediaStream([participant.videoTrack]);
      video.srcObject = stream;
      video.play().catch(console.error);
    } else {
      video.srcObject = null;
    }
  }, [participant.videoTrack]);

  useEffect(() => {
    if (participant.isLocal) return;

    if (participant.audioTrack && audioRef.current) {
      const stream = new MediaStream([participant.audioTrack]);
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(console.error);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }
    };
  }, [participant.audioTrack, participant.isLocal]);

  if (isCompact) {
    return (
      <div className="relative h-full w-full bg-gray-800">
        {participant.videoOn && participant.videoTrack ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={participant.isLocal}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-600 to-teal-500">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold">
              {participant.name[0]?.toUpperCase() || '?'}
            </div>
          </div>
        )}
        {!participant.audioOn && (
          <div className="absolute bottom-1 right-1 p-1 bg-red-500 rounded-full">
            <MicOff className="h-3 w-3 text-white" />
          </div>
        )}
        {!participant.isLocal && <audio ref={audioRef} />}
      </div>
    );
  }

  if (isFullScreen) {
    return (
      <div className="relative h-full w-full bg-gray-900">
        {participant.videoOn && participant.videoTrack ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={participant.isLocal}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-600 to-teal-500">
            <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center text-white text-5xl font-bold">
              {participant.name[0]?.toUpperCase() || '?'}
            </div>
          </div>
        )}
        <div className="absolute bottom-24 left-0 right-0 text-center">
          <span className="text-white text-xl font-bold bg-foreground/80 px-6 py-2 rounded-full backdrop-blur-sm">
            {participant.name}
          </span>
        </div>
        {!participant.audioOn && (
          <div className="absolute bottom-24 right-4 p-2 bg-red-500/80 rounded-full">
            <MicOff className="h-4 w-4 text-white" />
          </div>
        )}
        {!participant.isLocal && <audio ref={audioRef} />}
      </div>
    );
  }

  return (
    <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden h-full shadow-lg border border-teal-100">
      {participant.videoOn && participant.videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-600 to-teal-500">
          <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-white text-4xl font-bold">
            {participant.name[0]?.toUpperCase() || '?'}
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/90 to-transparent p-4">
        <div className="flex items-center justify-between">
          <span className="text-white font-semibold">
            {participant.name}
            {participant.isLocal && ' (You)'}
          </span>
          <div className="flex items-center space-x-2">
            {!participant.audioOn && <MicOff className="h-4 w-4 text-red-400" />}
            {!participant.videoOn && <VideoOff className="h-4 w-4 text-red-400" />}
          </div>
        </div>
      </div>

      {!participant.isLocal && <audio ref={audioRef} />}
    </div>
  );
}

export default function ContactCircleCallPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-teal-50/50 to-cg-background flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-teal-600" />
            <p className="text-xl font-semibold text-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <ContactCircleCallContent />
    </Suspense>
  );
}
