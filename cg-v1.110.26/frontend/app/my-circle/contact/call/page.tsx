'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { DailyCall, DailyParticipant } from '@daily-co/daily-js';
import {
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  MessageCircle,
  Film,
  Users,
  Loader2,
  ArrowLeft,
  Send,
} from 'lucide-react';

// Dynamically import TheaterMode to avoid SSR issues with Daily.co
const TheaterMode = dynamic(
  () => import('@/components/kidcoms/theater-mode').then((mod) => mod.TheaterMode),
  { ssr: false }
);

const CHILD_AVATARS: Record<string, string> = {
  lion: '🦁',
  panda: '🐼',
  unicorn: '🦄',
  bear: '🐻',
  cat: '🐱',
  dog: '🐶',
  rabbit: '🐰',
  fox: '🦊',
  koala: '🐨',
  penguin: '🐧',
  monkey: '🐵',
  dragon: '🐉',
};

interface CircleCallSession {
  sessionId: string;
  roomUrl: string;
  token: string;
  childName: string;
  childAvatar?: string;
  sessionType: 'video_call' | 'voice_call';
  contactName: string;
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

function CircleContactCallContent() {
  const router = useRouter();

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

  // Side panel
  const [activePanel, setActivePanel] = useState<'chat' | 'participants' | null>(null);
  const [messages, setMessages] = useState<{ id: string; sender: string; content: string; time: Date }[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Theater mode
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // Circle contact user data
  const [circleUserId, setCircleUserId] = useState<string>('');
  const [circleUserName, setCircleUserName] = useState<string>('');

  useEffect(() => {
    loadCallSession();
  }, []);

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

  // Listen for theater mode messages
  useEffect(() => {
    const call = callRef.current;
    if (!call || !isCallJoined) return;

    const handleTheaterMessage = (event: { data: { type?: string; data?: { action?: string; senderId?: string } } }) => {
      const message = event.data;
      if (message.type !== 'theater_control') return;

      // If someone else starts theater mode and we're not in it, auto-enter
      if (message.data?.action === 'start' && message.data?.senderId !== circleUserId && !isTheaterMode) {
        console.log('Theater: Auto-entering theater mode (other participant started)');
        setIsTheaterMode(true);
      }
    };

    call.on('app-message', handleTheaterMessage);
    return () => {
      call.off('app-message', handleTheaterMessage);
    };
  }, [isCallJoined, isTheaterMode, circleUserId]);

  function loadCallSession() {
    try {
      const sessionStr = localStorage.getItem('circle_call_session');
      if (!sessionStr) {
        setError('No call session found');
        setIsLoading(false);
        return;
      }

      const session = JSON.parse(sessionStr) as CircleCallSession;

      // Load circle user data
      const userStr = localStorage.getItem('circle_user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setCircleUserId(userData.userId || userData.contactId || '');
        setCircleUserName(userData.contactName || session.contactName);
      } else {
        setCircleUserName(session.contactName);
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
      console.log('Creating Daily.co call object for circle contact...');

      // Dynamically import Daily.co SDK
      const DailyIframe = (await import('@daily-co/daily-js')).default;

      const call = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: callSession.sessionType === 'video_call',
      });

      callRef.current = call;

      // Event handlers
      call.on('joined-meeting', () => {
        console.log('Daily.co: Circle contact joined meeting');
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
        userName: callSession.contactName,
      });

      console.log('Daily.co join completed for circle contact');
    } catch (err) {
      console.error('Error initializing Daily.co call:', err);
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

  function handleSendMessage() {
    if (!newMessage.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: circleUserName,
        content: newMessage.trim(),
        time: new Date(),
      },
    ]);
    setNewMessage('');
  }

  function getChildAvatar(avatarId?: string): string {
    if (avatarId && CHILD_AVATARS[avatarId]) {
      return CHILD_AVATARS[avatarId];
    }
    return '🧒';
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-500 via-cyan-500 to-blue-500 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4" />
          <p className="text-xl font-bold">Connecting your call...</p>
          <p className="text-white/80 mt-2">Getting everything ready!</p>
        </div>
      </div>
    );
  }

  if (error || !callSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-500 via-cyan-500 to-blue-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h1>
          <p className="text-gray-600 mb-6">{error || 'Something went wrong'}</p>
          <button
            onClick={handleGoBack}
            className="px-6 py-3 bg-teal-500 text-white rounded-full font-semibold hover:bg-teal-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (callEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-500 via-cyan-500 to-blue-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">{getChildAvatar(callSession.childAvatar)}</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Call Ended</h1>
          <p className="text-gray-600 mb-4">
            You talked with {callSession.childName}!
          </p>
          <p className="text-sm text-gray-400">Going back to your dashboard...</p>
        </div>
      </div>
    );
  }

  const participantList = Array.from(participants.values());
  const localParticipant = participantList.find((p) => p.isLocal);
  const remoteParticipants = participantList.filter((p) => !p.isLocal);

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        {/* Header - Desktop */}
        <header className="hidden md:flex bg-gradient-to-r from-teal-600/50 to-cyan-600/50 px-4 py-2 items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleGoBack}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getChildAvatar(callSession.childAvatar)}</span>
              <div>
                <h1 className="text-white font-bold">
                  {isCallJoined ? `Calling ${callSession.childName}` : 'Connecting...'}
                </h1>
                <p className="text-xs text-white/60">
                  {callSession.sessionType === 'video_call' ? '📹 Video Call' : '📞 Voice Call'}
                </p>
              </div>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            isCallJoined ? 'bg-green-500/30 text-green-300' : 'bg-yellow-500/30 text-yellow-300'
          }`}>
            {participantList.length} {participantList.length === 1 ? 'person' : 'people'} 👥
          </span>
        </header>

        {/* Video Area */}
        <div className="flex-1 relative">
          {!isCallJoined ? (
            <div className="h-full bg-gradient-to-br from-teal-900 to-cyan-900 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">{getChildAvatar(callSession.childAvatar)}</div>
                <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
                <p className="text-white text-xl font-bold">
                  {isJoiningCall ? 'Joining...' : 'Connecting...'}
                </p>
                <p className="text-white/60 mt-2">Calling {callSession.childName}...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Layout (FaceTime style) */}
              <div className="md:hidden h-full relative">
                {remoteParticipants.length > 0 ? (
                  <VideoTile participant={remoteParticipants[0]} isFullScreen childAvatar={callSession.childAvatar} />
                ) : (
                  <div className="h-full bg-gradient-to-br from-teal-800 to-cyan-800 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-7xl mb-4">{getChildAvatar(callSession.childAvatar)}</div>
                      <p className="text-white text-lg font-bold">Waiting for {callSession.childName}...</p>
                      <p className="text-white/60 text-sm mt-2">They should be joining soon!</p>
                    </div>
                  </div>
                )}

                {/* Local participant PiP */}
                {localParticipant && (
                  <div className="absolute top-4 right-4 w-28 h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-teal-400 z-10">
                    <VideoTile participant={localParticipant} isCompact />
                  </div>
                )}

                {/* Mobile back button */}
                <button
                  onClick={handleGoBack}
                  className="absolute top-4 left-4 z-10 p-2 bg-black/40 backdrop-blur-sm text-white rounded-full"
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
        <div className="bg-gray-800/90 md:bg-gray-800 px-4 py-4 absolute md:relative bottom-0 left-0 right-0 backdrop-blur-sm md:backdrop-blur-none safe-area-bottom">
          <div className="flex items-center justify-center space-x-3 md:space-x-4">
            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              disabled={!isCallJoined}
              className={`p-4 rounded-full transition-all transform hover:scale-105 ${
                isAudioOn
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
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
              className={`p-4 rounded-full transition-all transform hover:scale-105 ${
                isVideoOn
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
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
            <div className="hidden md:block w-px h-10 bg-gray-600" />

            {/* Chat Toggle - Desktop only */}
            <button
              onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
              className={`hidden md:flex p-3 rounded-full transition-all ${
                activePanel === 'chat'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title="Chat"
            >
              <MessageCircle className="h-5 w-5" />
            </button>

            {/* Participants Toggle - Desktop only */}
            <button
              onClick={() => setActivePanel(activePanel === 'participants' ? null : 'participants')}
              className={`hidden md:flex p-3 rounded-full transition-all ${
                activePanel === 'participants'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title="Participants"
            >
              <Users className="h-5 w-5" />
            </button>

            {/* Theater Mode */}
            <button
              onClick={() => setIsTheaterMode(true)}
              disabled={!isCallJoined}
              className={`p-4 md:p-3 rounded-full transition-all transform hover:scale-105 ${
                !isCallJoined
                  ? 'bg-gray-700 text-gray-500 opacity-50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white'
              }`}
              title="Watch Together!"
            >
              <Film className="h-6 w-6 md:h-5 md:w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      {activePanel && (
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-bold text-lg capitalize flex items-center gap-2">
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
                      <p className="text-gray-400 text-sm">No messages yet</p>
                      <p className="text-gray-500 text-xs">Say hi!</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className="p-3 bg-gray-700 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-teal-400">{msg.sender}</span>
                          <span className="text-xs text-gray-500">
                            {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-white text-sm">{msg.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 border-t border-gray-700">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 bg-gray-700 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl disabled:opacity-50"
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
                    className="flex items-center space-x-3 p-3 bg-gray-700 rounded-xl"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-lg font-bold">
                      {participant.odName[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold">
                        {participant.odName}
                        {participant.isLocal && ' (You)'}
                      </p>
                      <p className="text-xs text-gray-400">
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
        userId={circleUserId}
        userName={circleUserName}
        callRef={callRef}
        participants={participants}
        isVideoOn={isVideoOn}
        isAudioOn={isAudioOn}
        onToggleVideo={toggleVideo}
        onToggleAudio={toggleAudio}
        onExit={() => setIsTheaterMode(false)}
      />
    </div>
  );
}

// Video Tile Component
interface VideoTileProps {
  participant: VideoParticipant;
  isFullScreen?: boolean;
  isCompact?: boolean;
  childAvatar?: string;
}

function VideoTile({ participant, isFullScreen, isCompact, childAvatar }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  function getChildAvatar(avatarId?: string): string {
    if (avatarId && CHILD_AVATARS[avatarId]) {
      return CHILD_AVATARS[avatarId];
    }
    return '🧒';
  }

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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-700 to-cyan-700">
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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-800 to-cyan-800">
            <div className="text-8xl">
              {!participant.isLocal ? getChildAvatar(childAvatar) : participant.odName[0]?.toUpperCase() || '?'}
            </div>
          </div>
        )}
        {/* Name overlay */}
        <div className="absolute bottom-24 left-0 right-0 text-center">
          <span className="text-white text-xl font-bold bg-black/40 px-6 py-2 rounded-full backdrop-blur-sm">
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
    <div className="relative bg-gray-800 rounded-2xl overflow-hidden h-full">
      {participant.videoOn && participant.videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-700 to-cyan-700">
          <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-white text-4xl font-bold">
            {participant.odName[0]?.toUpperCase() || '?'}
          </div>
        </div>
      )}

      {/* Name and status overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
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

export default function CircleContactCallPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-teal-500 via-cyan-500 to-blue-500 flex items-center justify-center">
          <div className="text-center text-white">
            <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4" />
            <p className="text-xl font-bold">Loading...</p>
          </div>
        </div>
      }
    >
      <CircleContactCallContent />
    </Suspense>
  );
}
