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
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-[#2C5F5D]" />
          <p className="text-xl font-bold text-[#2C3E50]">Connecting your call...</p>
          <p className="text-gray-600 mt-2">Getting everything ready! 🎉</p>
        </div>
      </div>
    );
  }

  if (error || !callSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9] flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-[#2C5F5D] mb-2">Oops!</h1>
          <p className="text-gray-600 mb-6">{error || 'Something went wrong'}</p>
          <button
            onClick={handleGoBack}
            className="px-6 py-3 bg-[#2C5F5D] text-white rounded-full font-semibold hover:bg-[#2C5F5D]/90 transition-all hover:scale-105"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (callEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9] flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">👋</div>
          <h1 className="text-2xl font-bold text-[#2C5F5D] mb-2">Call Ended</h1>
          <p className="text-gray-600 mb-4">
            You talked with {callSession.contactName}!
          </p>
          <p className="text-sm text-gray-400">Going back to your circle...</p>
        </div>
      </div>
    );
  }

  const participantList = Array.from(participants.values());
  const localParticipant = participantList.find((p) => p.isLocal);
  const remoteParticipants = participantList.filter((p) => !p.isLocal);

  return (
    <div className="flex h-screen bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9]">
      {/* ARIA Warning Overlay */}
      {ariaWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-3xl p-8 mx-4 max-w-md text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-[#2C3E50] mb-2">
              {ariaWarning.type === 'terminate' ? 'Call Ending' : 'Friendly Reminder'}
            </h2>
            <p className="text-gray-600 mb-4">{ariaWarning.message}</p>
            {ariaWarning.type !== 'terminate' && (
              <button
                onClick={() => setAriaWarning(null)}
                className="px-6 py-2 bg-[#2C5F5D] text-white rounded-full font-semibold hover:bg-[#2C5F5D]/90"
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
        <header className="hidden md:flex bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-2 items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleGoBack}
              className="p-1.5 text-gray-600 hover:text-[#2C5F5D] hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-[#2C3E50] font-bold">
                {isCallJoined ? `Talking with ${callSession.contactName}` : 'Connecting...'}
              </h1>
              <p className="text-xs text-gray-600 flex items-center gap-1">
                {callSession.callType === 'video' ? '📹 Video Call' : '📞 Voice Call'}
                {isARIAMonitoring && (
                  <span className="inline-flex items-center gap-1 ml-2 text-[#2C5F5D]">
                    <Shield className="h-3 w-3" /> Protected
                  </span>
                )}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${isCallJoined ? 'bg-green-500/20 text-green-700' : 'bg-yellow-500/20 text-yellow-700'
            }`}>
            {participantList.length} {participantList.length === 1 ? 'person' : 'people'} 👥
          </span>
        </header>

        {/* Video Area */}
        <div className="flex-1 relative overflow-hidden">
          {!isCallJoined ? (
            <div className="h-full bg-gradient-to-br from-[#2C5F5D] to-[#D97757]/80 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-16 w-16 animate-spin text-white mx-auto mb-4" />
                <p className="text-white text-xl font-bold">
                  {isJoiningCall ? 'Joining...' : 'Connecting...'}
                </p>
                <p className="text-white/80 mt-2">Almost there! 🚀</p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Layout (FaceTime style) */}
              <div className="md:hidden h-full relative">
                {remoteParticipants.length > 0 ? (
                  <VideoTile participant={remoteParticipants[0]} isFullScreen />
                ) : (
                  <div className="h-full bg-gradient-to-br from-[#2C5F5D] to-[#D97757]/80 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-4">⏳</div>
                      <p className="text-white text-lg font-bold">Waiting for {callSession.contactName}...</p>
                    </div>
                  </div>
                )}

                {/* Local participant PiP */}
                {localParticipant && (
                  <div className="absolute top-4 right-4 w-28 h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-[#2C5F5D] z-10">
                    <VideoTile participant={localParticipant} isCompact />
                  </div>
                )}

                {/* Mobile back button */}
                <button
                  onClick={handleGoBack}
                  className="absolute top-4 left-4 z-10 p-2 bg-white/90 backdrop-blur-sm text-[#2C5F5D] rounded-full shadow-lg"
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
        <div className="bg-[#2C5F5D] px-4 py-4 absolute md:relative bottom-0 left-0 right-0 safe-area-bottom shadow-lg">
          <div className="flex items-center justify-center space-x-3 md:space-x-4">
            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              disabled={!isCallJoined}
              className={`p-4 rounded-full transition-all transform hover:scale-105 ${isAudioOn
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
                } ${!isCallJoined ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isAudioOn ? 'Mute' : 'Unmute'}
            >
              {isAudioOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </button>

            {/* Video Toggle */}
            <button
              onClick={toggleVideo}
              disabled={!isCallJoined}
              className={`p-4 rounded-full transition-all transform hover:scale-105 ${isVideoOn
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
                } ${!isCallJoined ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </button>

            {/* End Call */}
            <button
              onClick={handleLeaveCall}
              className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all transform hover:scale-105"
              title="Leave Call"
            >
              <PhoneOff className="h-6 w-6" />
            </button>

            {/* Divider */}
            <div className="hidden md:block w-px h-10 bg-white/20" />

            {/* Chat Toggle - Desktop only */}
            <button
              onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
              className={`hidden md:flex p-3 rounded-full transition-all ${activePanel === 'chat'
                ? 'bg-white text-[#2C5F5D]'
                : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
              title="Chat"
            >
              <MessageCircle className="h-5 w-5" />
            </button>

            {/* Participants Toggle - Desktop only */}
            <button
              onClick={() => setActivePanel(activePanel === 'participants' ? null : 'participants')}
              className={`hidden md:flex p-3 rounded-full transition-all ${activePanel === 'participants'
                ? 'bg-white text-[#2C5F5D]'
                : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
              title="Participants"
            >
              <Users className="h-5 w-5" />
            </button>

            {/* Theater Mode - Watch Together! */}
            <button
              onClick={() => setIsTheaterMode(true)}
              disabled={!isCallJoined}
              className={`p-4 md:p-3 rounded-full transition-all transform hover:scale-105 ${!isCallJoined
                ? 'bg-white/10 text-white/30 opacity-50 cursor-not-allowed'
                : 'bg-[#D97757] hover:bg-[#D97757]/90 text-white'
                }`}
              title="Watch Together! 🎬"
            >
              <Film className="h-6 w-6 md:h-5 md:w-5" />
            </button>

            {/* Games - Mini & Mega */}
            <button
              onClick={() => setIsArcadeMode(true)}
              disabled={!isCallJoined}
              className={`p-4 md:p-3 flex rounded-full transition-all ${!isCallJoined
                ? 'bg-white/10 text-white/30 opacity-50 cursor-not-allowed'
                : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
              title="Arcade (Mini & Mega)"
            >
              <Gamepad2 className="h-5 w-5" />
            </button>

            {/* Whiteboard - Coming Soon */}
            <button
              disabled
              className="hidden md:flex p-3 rounded-full bg-white/10 text-white/30 opacity-50 cursor-not-allowed"
              title="Draw Together (Coming Soon!)"
            >
              <PenTool className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      {activePanel && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-[#2C3E50] font-bold text-lg capitalize flex items-center gap-2">
              {activePanel === 'chat' ? '💬' : '👥'} {activePanel}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50">
            {activePanel === 'chat' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">💬</div>
                      <p className="text-gray-600 text-sm">No messages yet</p>
                      <p className="text-gray-500 text-xs">Say hi!</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className="p-3 bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-[#2C5F5D]">{msg.sender}</span>
                          <span className="text-xs text-gray-500">
                            {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[#2C3E50] text-sm">{msg.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 bg-gray-100 text-[#2C3E50] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C5F5D] border border-gray-200"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="p-2 bg-[#2C5F5D] hover:bg-[#2C5F5D]/90 text-white rounded-xl disabled:opacity-50"
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
                    className="flex items-center space-x-3 p-3 bg-white rounded-xl shadow-sm border border-gray-200"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2C5F5D] to-[#D97757] flex items-center justify-center text-white text-lg font-bold">
                      {participant.odName[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="text-[#2C3E50] font-bold">
                        {participant.odName}
                        {participant.isLocal && ' (You)'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {participant.isLocal ? '🎤 Speaking' : '👂 Listening'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      {!participant.audioOn && <MicOff className="h-4 w-4 text-red-400" />}
                      {!participant.videoOn && <VideoOff className="h-4 w-4 text-red-400" />}
                      {participant.audioOn && participant.videoOn && (
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
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
        onExit={() => setIsArcadeMode(false)}
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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2C5F5D] to-[#D97757]">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold">
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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2C5F5D] to-[#D97757]/80">
            <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center text-white text-5xl font-bold">
              {participant.odName[0]?.toUpperCase() || '?'}
            </div>
          </div>
        )}
        {/* Name overlay */}
        <div className="absolute bottom-24 left-0 right-0 text-center">
          <span className="text-white text-xl font-bold bg-[#2C3E50]/80 px-6 py-2 rounded-full backdrop-blur-sm">
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
    <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden h-full shadow-lg border border-gray-200">
      {participant.videoOn && participant.videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2C5F5D] to-[#D97757]">
          <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-white text-4xl font-bold">
            {participant.odName[0]?.toUpperCase() || '?'}
          </div>
        </div>
      )}

      {/* Name and status overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#2C3E50]/90 to-transparent p-4">
        <div className="flex items-center justify-between">
          <span className="text-white font-bold">
            {participant.odName}
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

export default function ChildCallPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-[#2C5F5D]" />
            <p className="text-xl font-bold text-[#2C3E50]">Loading...</p>
          </div>
        </div>
      }
    >
      <ChildCallContent />
    </Suspense>
  );
}
