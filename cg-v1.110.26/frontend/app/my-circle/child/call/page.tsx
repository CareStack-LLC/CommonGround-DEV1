'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { DailyCall, DailyParticipant } from '@daily-co/daily-js';
import { useARIASentimentShield, type ARIAIntervention } from '@/hooks/use-aria-sentiment-shield';
import {
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  MessageCircle,
  Film,
  Gamepad2,
  PenTool,
  Users,
  Loader2,
  ArrowLeft,
  Send,
  Shield,
  AlertTriangle,
} from 'lucide-react';
// Dynamically import TheaterMode to avoid SSR issues with Daily.co
const TheaterMode = dynamic(
  () => import('@/components/kidcoms/theater-mode').then((mod) => mod.TheaterMode),
  { ssr: false }
);
// Dynamically import ArcadeMode
const ArcadeMode = dynamic(
  () => import('@/components/kidcoms/arcade-mode').then((mod) => mod.ArcadeMode),
  { ssr: false }
);
// Dynamically import WhiteboardMode (Excalidraw is browser-only)
const WhiteboardMode = dynamic(
  () => import('@/components/kidcoms/whiteboard-mode').then((mod) => mod.WhiteboardMode),
  { ssr: false }
);

interface CallSession {
  sessionId: string;
  roomUrl: string;
  token: string;
  participantName: string;
  contactName: string;
  callType: 'video' | 'voice';
}

interface VideoParticipant {
  odId: string;
  odName: string;
  isLocal: boolean;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  videoOn: boolean;
  audioOn: boolean;
}

function ChildCallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [callSession, setCallSession] = useState<CallSession | null>(null);
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

  // Side panel
  const [activePanel, setActivePanel] = useState<'chat' | 'participants' | null>(null);
  const [messages, setMessages] = useState<{ id: string; sender: string; content: string; time: Date }[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Theater mode
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  // Arcade mode
  const [isArcadeMode, setIsArcadeMode] = useState(false);
  // Whiteboard mode
  const [isWhiteboardMode, setIsWhiteboardMode] = useState(false);

  // Child user data
  const [childUserId, setChildUserId] = useState<string>('');
  const [childUserName, setChildUserName] = useState<string>('');

  // ARIA Sentiment Shield state
  const [ariaWarning, setAriaWarning] = useState<{
    type: string;
    message: string;
    severity: string;
  } | null>(null);
  const callStartTime = useRef<number>(0);

  // Handle ARIA interventions
  const handleARIAIntervention = useCallback((intervention: ARIAIntervention) => {
    console.log('[ARIA Shield] Child call intervention:', intervention);
    setAriaWarning({
      type: intervention.type,
      message: intervention.message,
      severity: intervention.severity,
    });

    // Auto-clear warning after 10 seconds for non-terminate interventions
    if (intervention.type !== 'terminate') {
      setTimeout(() => setAriaWarning(null), 10000);
    }
  }, []);

  // ARIA Sentiment Shield hook - for child safety monitoring
  const {
    isMonitoring: isARIAMonitoring,
    isTranscribing,
    startMonitoring: startARIAMonitoring,
    stopMonitoring: stopARIAMonitoring,
  } = useARIASentimentShield({
    callRef,
    sessionId: callSession?.sessionId || '',
    sessionType: 'my_circle',
    userId: childUserId,
    userName: childUserName,
    sensitivityLevel: 'moderate', // Default moderate for child calls
    callStartTime: callStartTime.current,
    onIntervention: handleARIAIntervention,
    onError: (err) => console.error('[ARIA Shield] Error:', err),
  });

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

  // Start ARIA Sentiment Shield when call joins
  useEffect(() => {
    if (isCallJoined && callRef.current && !isARIAMonitoring) {
      // Set call start time
      callStartTime.current = Date.now();
      // Delay to ensure audio is ready
      const timeoutId = setTimeout(() => {
        startARIAMonitoring();
      }, 1500);
      return () => clearTimeout(timeoutId);
    }
  }, [isCallJoined, isARIAMonitoring, startARIAMonitoring]);

  // Stop ARIA monitoring when call ends
  useEffect(() => {
    if (!isCallJoined && isARIAMonitoring) {
      stopARIAMonitoring();
    }
  }, [isCallJoined, isARIAMonitoring, stopARIAMonitoring]);

  // Listen for theater mode messages at session level (to auto-enter theater mode)
  useEffect(() => {
    const call = callRef.current;
    if (!call || !isCallJoined) return;

    const handleTheaterMessage = (event: { data: { type?: string; data?: { action?: string; senderId?: string } } }) => {
      const message = event.data;
      if (message.type !== 'theater_control') return;

      // If someone else starts theater mode and we're not in it, auto-enter
      if (message.data?.action === 'start' && message.data?.senderId !== childUserId && !isTheaterMode) {
        console.log('Theater: Auto-entering theater mode (other participant started)');
        setIsTheaterMode(true);
      }

      // If someone else stops theater mode
      if (message.data?.action === 'stop' && message.data?.senderId !== childUserId && isTheaterMode) {
        console.log('Theater: Other participant exited theater mode');
      }
    };

    call.on('app-message', handleTheaterMessage);
    return () => {
      call.off('app-message', handleTheaterMessage);
    };
  }, [isCallJoined, isTheaterMode, childUserId]);

  function loadCallSession() {
    try {
      const sessionStr = localStorage.getItem('child_call_session');
      if (!sessionStr) {
        setError('No call session found');
        setIsLoading(false);
        return;
      }

      const session = JSON.parse(sessionStr) as CallSession;
      if (session.sessionId !== sessionId) {
        setError('Session mismatch');
        setIsLoading(false);
        return;
      }

      // Load child user data
      const userStr = localStorage.getItem('child_user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setChildUserId(userData.childId || userData.userId || '');
        setChildUserName(userData.childName || session.participantName);
      } else {
        setChildUserName(session.participantName);
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
        odId: p.session_id,
        odName: p.user_name || 'Guest',
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
      console.log('Creating Daily.co call object for child...');

      // Dynamically import Daily.co SDK (requires browser APIs)
      const DailyIframe = (await import('@daily-co/daily-js')).default;

      const call = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: callSession.callType === 'video',
      });

      callRef.current = call;

      // Event handlers
      call.on('joined-meeting', () => {
        console.log('Daily.co: Child joined meeting');
        setIsCallJoined(true);
        setIsJoiningCall(false);
        updateParticipants(call.participants());
      });

      call.on('participant-joined', () => {
        console.log('Daily.co: participant-joined');
        updateParticipants(call.participants());
      });

      call.on('participant-left', () => {
        console.log('Daily.co: participant-left');
        updateParticipants(call.participants());
      });

      call.on('participant-updated', () => {
        updateParticipants(call.participants());
      });

      call.on('track-started', () => {
        console.log('Daily.co: track-started');
        updateParticipants(call.participants());
      });

      call.on('track-stopped', () => {
        console.log('Daily.co: track-stopped');
        updateParticipants(call.participants());
      });

      call.on('left-meeting', () => {
        console.log('Daily.co: left-meeting');
        setIsCallJoined(false);
        handleEndCall();
      });

      call.on('error', (event) => {
        console.error('Daily.co error:', event);
        setError('Video call error occurred');
        setIsJoiningCall(false);
      });

      // Join the call
      console.log('Joining Daily.co room...', { roomUrl: callSession.roomUrl });
      await call.join({
        url: callSession.roomUrl,
        token: callSession.token,
        userName: callSession.participantName,
      });

      console.log('Daily.co join completed for child');
    } catch (err) {
      console.error('Error initializing Daily.co call:', err);
      setError('Failed to connect to call');
      setIsJoiningCall(false);
      callCreatedRef.current = false;
    }
  }

  function handleEndCall() {
    localStorage.removeItem('child_call_session');
    setCallEnded(true);

    setTimeout(() => {
      router.push('/my-circle/child/dashboard');
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
      handleEndCall();
    } catch (err) {
      console.error('Error leaving call:', err);
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
    localStorage.removeItem('child_call_session');
    router.push('/my-circle/child/dashboard');
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

  function handleSendMessage() {
    if (!newMessage.trim()) return;

    // Add message locally (in a real implementation, this would go through the backend)
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: childUserName,
        content: newMessage.trim(),
        time: new Date(),
      },
    ]);
    setNewMessage('');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cg-ink via-foreground to-cg-ink flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-cg-sage/20 rounded-full blur-2xl animate-pulse" />
            <Loader2 className="relative h-16 w-16 animate-spin mx-auto mb-4 text-cg-sage" />
          </div>
          <p className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Connecting your call...</p>
          <p className="text-cg-mist/60 mt-2" style={{ fontFamily: "'Inter', sans-serif" }}>Getting everything ready!</p>
        </div>
      </div>
    );
  }

  if (error || !callSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cg-ink via-foreground to-cg-ink flex items-center justify-center p-4">
        <div className="bg-foreground/80 backdrop-blur-sm rounded-3xl shadow-lg border border-cg-sage/20 p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Oops!</h1>
          <p className="text-cg-mist/70 mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>{error || 'Something went wrong'}</p>
          <button
            onClick={handleGoBack}
            className="px-6 py-3 bg-cg-sage text-white rounded-full font-semibold hover:bg-cg-sage/90 transition-all hover:scale-105"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (callEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cg-ink via-foreground to-cg-ink flex items-center justify-center p-4">
        <div className="bg-foreground/80 backdrop-blur-sm rounded-3xl shadow-lg border border-cg-sage/20 p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">👋</div>
          <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Call Ended</h1>
          <p className="text-cg-mist/70 mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            You talked with {callSession.contactName}!
          </p>
          <p className="text-sm text-cg-mist/40" style={{ fontFamily: "'Inter', sans-serif" }}>Going back to your circle...</p>
        </div>
      </div>
    );
  }

  const participantList = Array.from(participants.values());
  const localParticipant = participantList.find((p) => p.isLocal);
  const remoteParticipants = participantList.filter((p) => !p.isLocal);

  return (
    <div className="flex h-screen bg-cg-ink">
      {/* ARIA Warning Overlay */}
      {ariaWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-foreground rounded-3xl p-8 mx-4 max-w-md text-center shadow-2xl border border-cg-sage/20">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-cg-amber" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {ariaWarning.type === 'terminate' ? 'Call Ending' : 'Friendly Reminder'}
            </h2>
            <p className="text-cg-mist/70 mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>{ariaWarning.message}</p>
            {ariaWarning.type !== 'terminate' && (
              <button
                onClick={() => setAriaWarning(null)}
                className="px-6 py-2 bg-cg-sage text-white rounded-full font-semibold hover:bg-cg-sage/90"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                I Understand
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        {/* Header - Desktop */}
        <header className="hidden md:flex bg-cg-ink/90 backdrop-blur-sm border-b border-cg-sage/10 px-4 py-2 items-center justify-between">
          <div className="flex items-center space-x-3">
            <button aria-label="Back"
              onClick={handleGoBack}
              className="p-1.5 text-cg-mist/60 hover:text-cg-sage hover:bg-foreground rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-white font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {isCallJoined ? `Talking with ${callSession.contactName}` : 'Connecting...'}
              </h1>
              <p className="text-xs text-cg-mist/50 flex items-center gap-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                {callSession.callType === 'video' ? '📹 Video Call' : '📞 Voice Call'}
                {isARIAMonitoring && (
                  <span className="inline-flex items-center gap-1 ml-2 text-cg-sage">
                    <Shield className="h-3 w-3" /> Protected
                  </span>
                )}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${isCallJoined ? 'bg-cg-sage/20 text-cg-sage' : 'bg-cg-amber/20 text-cg-amber'
            }`} style={{ fontFamily: "var(--font-mono)" }}>
            {participantList.length} {participantList.length === 1 ? 'person' : 'people'}
          </span>
        </header>

        {/* Video Area */}
        <div className="flex-1 relative overflow-hidden">
          {!isCallJoined ? (
            <div className="h-full bg-gradient-to-br from-foreground to-cg-ink flex items-center justify-center">
              <div className="text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-cg-sage/20 rounded-full blur-2xl animate-pulse" />
                  <Loader2 className="relative h-16 w-16 animate-spin text-cg-sage mx-auto mb-4" />
                </div>
                <p className="text-white text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {isJoiningCall ? 'Joining...' : 'Connecting...'}
                </p>
                <p className="text-cg-mist/50 mt-2" style={{ fontFamily: "'Inter', sans-serif" }}>Almost there!</p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Layout (FaceTime style) */}
              <div className="md:hidden h-full relative">
                {remoteParticipants.length > 0 ? (
                  <VideoTile participant={remoteParticipants[0]} isFullScreen />
                ) : (
                  <div className="h-full bg-gradient-to-br from-foreground to-cg-ink flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-4">⏳</div>
                      <p className="text-white text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Waiting for {callSession.contactName}...</p>
                    </div>
                  </div>
                )}

                {/* Local participant PiP */}
                {localParticipant && (
                  <div className="absolute top-4 right-4 w-28 h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-cg-sage/50 z-10">
                    <VideoTile participant={localParticipant} isCompact />
                  </div>
                )}

                {/* Mobile back button */}
                <button aria-label="Back"
                  onClick={handleGoBack}
                  className="absolute top-4 left-4 z-10 p-2 bg-cg-ink/80 backdrop-blur-sm text-white rounded-full shadow-lg border border-cg-sage/20"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </div>

              {/* Desktop Layout (Grid) */}
              <div
                className="hidden md:grid h-full gap-2 p-2"
                style={{
                  gridTemplateColumns:
                    participantList.length === 1
                      ? '1fr'
                      : participantList.length === 2
                        ? '1fr 1fr'
                        : '1fr 1fr',
                  gridTemplateRows:
                    participantList.length <= 2 ? '1fr' : participantList.length <= 4 ? '1fr 1fr' : '1fr 1fr',
                }}
              >
                {participantList.map((participant) => (
                  <VideoTile key={participant.odId} participant={participant} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Controls Bar */}
        <div className="bg-cg-ink px-4 py-4 absolute md:relative bottom-0 left-0 right-0 safe-area-bottom shadow-lg border-t border-cg-sage/10">
          <div className="flex items-center justify-center space-x-3 md:space-x-4">
            {/* Audio Toggle */}
            <button aria-label="Toggle microphone"
              onClick={toggleAudio}
              disabled={!isCallJoined}
              className={`p-4 rounded-full transition-all transform hover:scale-105 ${isAudioOn
                ? 'bg-foreground hover:bg-foreground/80 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
                } ${!isCallJoined ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isAudioOn ? 'Mute' : 'Unmute'}
            >
              {isAudioOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </button>

            {/* Video Toggle */}
            <button aria-label="Toggle camera"
              onClick={toggleVideo}
              disabled={!isCallJoined}
              className={`p-4 rounded-full transition-all transform hover:scale-105 ${isVideoOn
                ? 'bg-foreground hover:bg-foreground/80 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25'
                } ${!isCallJoined ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </button>

            {/* End Call */}
            <button aria-label="End call"
              onClick={handleLeaveCall}
              className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all transform hover:scale-105 shadow-lg shadow-red-500/25"
              title="Leave Call"
            >
              <PhoneOff className="h-6 w-6" />
            </button>

            {/* Divider */}
            <div className="hidden md:block w-px h-10 bg-cg-sage/20" />

            {/* Chat Toggle - Desktop only */}
            <button aria-label="Open chat"
              onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
              className={`hidden md:flex p-3 rounded-full transition-all ${activePanel === 'chat'
                ? 'bg-cg-sage text-white'
                : 'bg-foreground hover:bg-foreground/80 text-cg-mist'
                }`}
              title="Chat"
            >
              <MessageCircle className="h-5 w-5" />
            </button>

            {/* Participants Toggle - Desktop only */}
            <button
              onClick={() => setActivePanel(activePanel === 'participants' ? null : 'participants')}
              className={`hidden md:flex p-3 rounded-full transition-all ${activePanel === 'participants'
                ? 'bg-cg-sage text-white'
                : 'bg-foreground hover:bg-foreground/80 text-cg-mist'
                }`}
              title="Participants"
            >
              <Users className="h-5 w-5" />
            </button>

            {/* Theater Mode - Watch Together! */}
            <button aria-label="Theater mode"
              onClick={() => setIsTheaterMode(true)}
              disabled={!isCallJoined}
              className={`p-4 md:p-3 rounded-full transition-all transform hover:scale-105 ${!isCallJoined
                ? 'bg-foreground/50 text-cg-mist/30 opacity-50 cursor-not-allowed'
                : 'bg-cg-amber hover:bg-cg-amber/90 text-white shadow-lg shadow-cg-amber/20'
                }`}
              title="Watch Together!"
            >
              <Film className="h-6 w-6 md:h-5 md:w-5" />
            </button>

            {/* Games - Links to KidSpace Arcade */}
            <button aria-label="Arcade mode"
              onClick={() => setIsArcadeMode(true)}
              disabled={!isCallJoined}
              className={`p-4 md:p-3 flex rounded-full transition-all ${!isCallJoined
                ? 'bg-foreground/50 text-cg-mist/30 opacity-50 cursor-not-allowed'
                : 'bg-foreground hover:bg-foreground/80 text-white'
                }`}
              title="Arcade Games"
            >
              <Gamepad2 className="h-5 w-5" />
            </button>

            {/* Whiteboard - Draw Together */}
            <button aria-label="Whiteboard"
              onClick={() => setIsWhiteboardMode(true)}
              disabled={!isCallJoined}
              className={`hidden md:flex p-3 rounded-full transition-all ${!isCallJoined
                ? 'bg-foreground/50 text-cg-mist/30 opacity-50 cursor-not-allowed'
                : 'bg-foreground hover:bg-foreground/80 text-white'
                }`}
              title="Draw Together"
            >
              <PenTool className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      {activePanel && (
        <div className="w-80 bg-cg-ink border-l border-cg-sage/10 flex flex-col">
          <div className="p-4 border-b border-cg-sage/10">
            <h3 className="text-white font-bold text-lg capitalize flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {activePanel === 'chat' ? '💬' : '👥'} {activePanel}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activePanel === 'chat' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">💬</div>
                      <p className="text-cg-mist/60 text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>No messages yet</p>
                      <p className="text-cg-mist/40 text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>Say hi!</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className="p-3 bg-foreground/60 rounded-xl border border-cg-sage/10">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-cg-sage" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{msg.sender}</span>
                          <span className="text-xs text-cg-mist/40" style={{ fontFamily: "var(--font-mono)" }}>
                            {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-white text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>{msg.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 border-t border-cg-sage/10">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 bg-foreground text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cg-sage border border-cg-sage/20 placeholder-cg-mist/40"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    />
                    <button aria-label="Send message"
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="p-2 bg-cg-sage hover:bg-cg-sage/90 text-white rounded-xl disabled:opacity-50"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activePanel === 'participants' && (
              <div className="p-4 space-y-3">
                {participantList.map((participant) => (
                  <div
                    key={participant.odId}
                    className="flex items-center space-x-3 p-3 bg-foreground/60 rounded-xl border border-cg-sage/10"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cg-sage to-cg-slate flex items-center justify-center text-white text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {participant.odName[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {participant.odName}
                        {participant.isLocal && ' (You)'}
                      </p>
                      <p className="text-xs text-cg-mist/50" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {participant.isLocal ? '🎤 Speaking' : '👂 Listening'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      {!participant.audioOn && <MicOff className="h-4 w-4 text-red-400" />}
                      {!participant.videoOn && <VideoOff className="h-4 w-4 text-red-400" />}
                      {participant.audioOn && participant.videoOn && (
                        <span className="w-2 h-2 bg-cg-sage rounded-full" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Theater Mode Overlay */}
      <TheaterMode
        isActive={isTheaterMode}
        userId={childUserId}
        userName={childUserName}
        callRef={callRef}
        participants={participants}
        isVideoOn={isVideoOn}
        isAudioOn={isAudioOn}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        onExit={() => setIsTheaterMode(false)}
      />

      {/* Arcade Mode Overlay */}
      <ArcadeMode
        isActive={isArcadeMode}
        userId={childUserId}
        callRef={callRef}
        participants={participants}
        onExit={() => setIsArcadeMode(false)}
      />

      {/* Whiteboard Mode Overlay */}
      <WhiteboardMode
        isActive={isWhiteboardMode}
        userId={childUserId}
        userName={childUserName}
        callRef={callRef}
        onExit={() => setIsWhiteboardMode(false)}
      />
    </div>
  );
}

// Video Tile Component
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

  // Handle audio for remote participants
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

  // Compact mode for PiP
  if (isCompact) {
    return (
      <div className="relative h-full w-full bg-foreground">
        {participant.videoOn && participant.videoTrack ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={participant.isLocal}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cg-sage to-cg-slate">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {participant.odName[0]?.toUpperCase() || '?'}
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

  // Full screen mode for remote participant on mobile
  if (isFullScreen) {
    return (
      <div className="relative h-full w-full bg-cg-ink">
        {participant.videoOn && participant.videoTrack ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={participant.isLocal}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-foreground to-cg-ink">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cg-sage to-cg-slate flex items-center justify-center text-white text-5xl font-bold shadow-2xl shadow-cg-sage/20" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {participant.odName[0]?.toUpperCase() || '?'}
            </div>
          </div>
        )}
        {/* Name overlay */}
        <div className="absolute bottom-24 left-0 right-0 text-center">
          <span className="text-white text-xl font-bold bg-cg-ink/80 px-6 py-2 rounded-full backdrop-blur-sm border border-cg-sage/20" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {participant.odName}
          </span>
        </div>
        {/* Status indicators */}
        <div className="absolute bottom-24 right-4 flex items-center space-x-2">
          {!participant.audioOn && (
            <div className="p-2 bg-red-500/80 rounded-full">
              <MicOff className="h-4 w-4 text-white" />
            </div>
          )}
          {!participant.videoOn && (
            <div className="p-2 bg-red-500/80 rounded-full">
              <VideoOff className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
        {!participant.isLocal && <audio ref={audioRef} />}
      </div>
    );
  }

  // Default grid tile mode for desktop
  return (
    <div className="relative bg-foreground/50 rounded-2xl overflow-hidden h-full ring-1 ring-cg-sage/10">
      {participant.videoOn && participant.videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-foreground to-cg-ink">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cg-sage to-cg-slate flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-cg-sage/20" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {participant.odName[0]?.toUpperCase() || '?'}
          </div>
        </div>
      )}

      {/* Name and status overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cg-ink/90 to-transparent p-4">
        <div className="flex items-center justify-between">
          <span className="text-white font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>
            {participant.odName}
            {participant.isLocal && <span className="text-cg-sage ml-1">(You)</span>}
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

export default function ChildCallPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cg-ink flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-cg-sage" />
            <p className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Loading...</p>
          </div>
        </div>
      }
    >
      <ChildCallContent />
    </Suspense>
  );
}
