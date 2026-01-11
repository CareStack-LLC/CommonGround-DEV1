'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import DailyIframe, { DailyCall, DailyParticipant } from '@daily-co/daily-js';
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
  AlertCircle,
  ChevronLeft,
  Send,
} from 'lucide-react';
import { kidcomsAPI, KidComsSession, KidComsMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { TheaterMode } from '@/components/kidcoms/theater-mode';

interface VideoParticipant {
  odId: string;
  odName: string;
  isLocal: boolean;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  videoOn: boolean;
  audioOn: boolean;
}

function SessionContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const sessionId = params.sessionId as string;
  const familyFileId = searchParams.get('case');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<KidComsSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);

  // Daily.co call object
  const callRef = useRef<DailyCall | null>(null);
  const [isCallJoined, setIsCallJoined] = useState(false);
  const [isJoiningCall, setIsJoiningCall] = useState(false);

  // Video/audio state
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [participants, setParticipants] = useState<Map<string, VideoParticipant>>(new Map());

  // Side panel
  const [activePanel, setActivePanel] = useState<'chat' | 'participants' | null>(null);
  const [messages, setMessages] = useState<KidComsMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Theater mode
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // Load session data
  useEffect(() => {
    loadSession();
  }, [sessionId]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!session) return;

    const pollData = async () => {
      try {
        const messagesData = await kidcomsAPI.getMessages(sessionId);
        setMessages(messagesData.items);
      } catch (err) {
        console.error('Error polling messages:', err);
      }
    };

    const interval = setInterval(pollData, 3000);
    return () => clearInterval(interval);
  }, [sessionId, session?.id]);

  // Initialize Daily.co call when token and roomUrl are available
  useEffect(() => {
    if (token && roomUrl && !callRef.current && !isJoiningCall) {
      console.log('Initializing Daily.co call...');
      initializeCall();
    }

    return () => {
      if (callRef.current) {
        callRef.current.destroy();
        callRef.current = null;
      }
    };
  }, [token, roomUrl]);

  // Listen for theater mode messages at session level (to auto-enter theater mode)
  useEffect(() => {
    const call = callRef.current;
    if (!call || !isCallJoined) return;

    const handleTheaterMessage = (event: { data: { type?: string; data?: { action?: string; senderId?: string } } }) => {
      const message = event.data;
      if (message.type !== 'theater_control') return;

      // If someone else starts theater mode and we're not in it, auto-enter
      if (message.data?.action === 'start' && message.data?.senderId !== user?.id && !isTheaterMode) {
        console.log('Theater: Auto-entering theater mode (other participant started)');
        setIsTheaterMode(true);
      }

      // If someone else stops theater mode
      if (message.data?.action === 'stop' && message.data?.senderId !== user?.id && isTheaterMode) {
        console.log('Theater: Other participant exited theater mode');
        // Optionally exit theater mode too, or just let them stay
      }
    };

    call.on('app-message', handleTheaterMessage);
    return () => {
      call.off('app-message', handleTheaterMessage);
    };
  }, [isCallJoined, isTheaterMode, user?.id]);

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
    if (!token || !roomUrl) return;

    try {
      setIsJoiningCall(true);
      console.log('Creating Daily.co call object...');

      const call = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: true,
      });

      callRef.current = call;

      // Event handlers
      call.on('joined-meeting', () => {
        console.log('Daily.co: joined-meeting');
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
      });

      call.on('error', (event) => {
        console.error('Daily.co error:', event);
        setError('Video call error occurred');
        setIsJoiningCall(false);
      });

      // Join the call
      console.log('Joining Daily.co room...', { roomUrl });
      await call.join({
        url: roomUrl,
        token: token,
      });

      console.log('Daily.co join completed');

    } catch (err) {
      console.error('Error initializing Daily.co call:', err);
      setError('Failed to initialize video call');
      setIsJoiningCall(false);
    }
  }

  async function loadSession() {
    try {
      setIsLoading(true);
      setError(null);

      const sessionData = await kidcomsAPI.getSession(sessionId);
      setSession(sessionData);

      if (sessionData.status === 'active' || sessionData.status === 'waiting') {
        const joinData = await kidcomsAPI.joinSession(sessionId);
        setToken(joinData.token);
        setRoomUrl(joinData.room_url);
      }

      const messagesData = await kidcomsAPI.getMessages(sessionId);
      setMessages(messagesData.items);
    } catch (err) {
      console.error('Error loading session:', err);
      setError('Failed to load session');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleEndCall() {
    try {
      if (callRef.current) {
        await callRef.current.leave();
        callRef.current.destroy();
        callRef.current = null;
      }

      await kidcomsAPI.endSession(sessionId);
      router.push(familyFileId ? `/family-files/${familyFileId}/kidcoms` : '/kidcoms');
    } catch (err) {
      console.error('Error ending call:', err);
    }
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

  async function handleSendMessage() {
    if (!newMessage.trim()) return;

    try {
      setIsSendingMessage(true);
      const message = await kidcomsAPI.sendMessage(sessionId, newMessage.trim());
      setMessages((prev) => [...prev, message]);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSendingMessage(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-white">Connecting to call...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-white mb-4">{error || 'Session not found'}</p>
          <button
            onClick={() => router.push(familyFileId ? `/family-files/${familyFileId}/kidcoms` : '/kidcoms')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Back to KidComs
          </button>
        </div>
      </div>
    );
  }

  const participantList = Array.from(participants.values());
  const localParticipant = participantList.find(p => p.isLocal);
  const remoteParticipants = participantList.filter(p => !p.isLocal);

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        {/* Header - hidden on mobile during call */}
        <header className="bg-gray-800/50 px-4 py-2 flex items-center justify-between md:flex hidden">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push(familyFileId ? `/family-files/${familyFileId}/kidcoms` : '/kidcoms')}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-white font-medium text-sm">{session.title || 'Video Call'}</h1>
              <p className="text-xs text-gray-400">
                {isCallJoined ? 'Connected' : isJoiningCall ? 'Connecting...' : session.status}
              </p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded text-xs ${
            isCallJoined ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {participantList.length} in call
          </span>
        </header>

        {/* Video Area */}
        <div className="flex-1 relative">
          {!isCallJoined ? (
            <div className="h-full bg-gray-800 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
                <p className="text-gray-400">{isJoiningCall ? 'Joining call...' : 'Connecting...'}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Layout (FaceTime style) */}
              <div className="md:hidden h-full relative">
                {remoteParticipants.length > 0 ? (
                  <VideoTile participant={remoteParticipants[0]} isFullScreen />
                ) : (
                  <div className="h-full bg-gray-800 flex items-center justify-center">
                    <div className="text-center">
                      <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">Waiting for others to join...</p>
                    </div>
                  </div>
                )}

                {/* Local PiP */}
                {localParticipant && (
                  <div className="absolute top-4 right-4 w-28 h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-700 z-10">
                    <VideoTile participant={localParticipant} isCompact />
                  </div>
                )}

                {/* Mobile header overlay */}
                <div className="absolute top-4 left-4 z-10">
                  <button
                    onClick={() => router.push(familyFileId ? `/family-files/${familyFileId}/kidcoms` : '/kidcoms')}
                    className="p-2 bg-black/40 backdrop-blur-sm text-white rounded-full"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Desktop Layout (Grid) */}
              <div className="hidden md:grid h-full gap-2 p-2" style={{
                gridTemplateColumns: participantList.length === 1 ? '1fr' :
                  participantList.length === 2 ? '1fr 1fr' :
                  participantList.length <= 4 ? '1fr 1fr' : '1fr 1fr 1fr',
                gridTemplateRows: participantList.length <= 2 ? '1fr' :
                  participantList.length <= 4 ? '1fr 1fr' : '1fr 1fr'
              }}>
                {participantList.map((participant) => (
                  <VideoTile key={participant.odId} participant={participant} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Controls Bar */}
        <div className="bg-gray-800/90 md:bg-gray-800 px-4 py-3 md:py-3 absolute md:relative bottom-0 left-0 right-0 backdrop-blur-sm md:backdrop-blur-none safe-area-bottom">
          <div className="flex items-center justify-center space-x-4 md:space-x-3">
            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              disabled={!isCallJoined}
              className={`p-4 md:p-3 rounded-full transition-colors ${
                isAudioOn
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              } ${!isCallJoined ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isAudioOn ? <Mic className="h-6 w-6 md:h-5 md:w-5" /> : <MicOff className="h-6 w-6 md:h-5 md:w-5" />}
            </button>

            {/* Video Toggle */}
            <button
              onClick={toggleVideo}
              disabled={!isCallJoined}
              className={`p-4 md:p-3 rounded-full transition-colors ${
                isVideoOn
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              } ${!isCallJoined ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isVideoOn ? <Video className="h-6 w-6 md:h-5 md:w-5" /> : <VideoOff className="h-6 w-6 md:h-5 md:w-5" />}
            </button>

            {/* End Call */}
            <button
              onClick={handleEndCall}
              className="p-4 md:p-3 rounded-full bg-red-600 hover:bg-red-700 text-white"
            >
              <PhoneOff className="h-6 w-6 md:h-5 md:w-5" />
            </button>

            {/* Divider - hidden on mobile */}
            <div className="hidden md:block w-px h-8 bg-gray-700" />

            {/* Chat Toggle - hidden on mobile */}
            <button
              onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
              className={`hidden md:flex p-3 rounded-full transition-colors ${
                activePanel === 'chat'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              <MessageCircle className="h-5 w-5" />
            </button>

            {/* Participants Toggle - hidden on mobile */}
            <button
              onClick={() => setActivePanel(activePanel === 'participants' ? null : 'participants')}
              className={`hidden md:flex p-3 rounded-full transition-colors ${
                activePanel === 'participants'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              <Users className="h-5 w-5" />
            </button>

            {/* Theater Mode - visible on all devices */}
            <button
              onClick={() => setIsTheaterMode(true)}
              disabled={!isCallJoined}
              className={`p-4 md:p-3 rounded-full transition-colors ${
                !isCallJoined
                  ? 'bg-gray-700 text-gray-500 opacity-50 cursor-not-allowed'
                  : 'bg-gray-700 hover:bg-purple-600 text-gray-300 hover:text-white'
              }`}
              title="Theater Mode"
            >
              <Film className="h-6 w-6 md:h-5 md:w-5" />
            </button>

            <button disabled className="hidden md:flex p-3 rounded-full bg-gray-700 text-gray-500 opacity-50 cursor-not-allowed" title="Arcade (Coming Soon)">
              <Gamepad2 className="h-5 w-5" />
            </button>
            <button disabled className="hidden md:flex p-3 rounded-full bg-gray-700 text-gray-500 opacity-50 cursor-not-allowed" title="Whiteboard (Coming Soon)">
              <PenTool className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      {activePanel && (
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold capitalize">{activePanel}</h3>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activePanel === 'chat' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                  {messages.length === 0 ? (
                    <p className="text-gray-500 text-center text-sm">No messages yet</p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.aria_flagged ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-purple-400">{msg.sender_name}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.sent_at).toLocaleTimeString()}
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
                      className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isSendingMessage || !newMessage.trim()}
                      className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activePanel === 'participants' && (
              <div className="p-4 space-y-3">
                {session.participants.map((participant, index) => (
                  <div
                    key={participant.id || index}
                    className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
                      {participant.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{participant.name}</p>
                      <p className="text-xs text-gray-400 capitalize">
                        {participant.participant_type.replace('_', ' ')}
                      </p>
                    </div>
                    {participant.joined_at && (
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                    )}
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
        userId={user?.id || ''}
        userName={user?.first_name || 'Guest'}
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
}

function VideoTile({ participant, isFullScreen, isCompact }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

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

    if (participant.audioTrack) {
      const audio = new Audio();
      const stream = new MediaStream([participant.audioTrack]);
      audio.srcObject = stream;
      audio.play().catch(console.error);

      return () => {
        audio.pause();
        audio.srcObject = null;
      };
    }
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
          <div className="w-full h-full flex items-center justify-center bg-gray-700">
            <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white text-lg font-semibold">
              {participant.odName[0]?.toUpperCase() || '?'}
            </div>
          </div>
        )}
        {!participant.audioOn && (
          <div className="absolute bottom-1 right-1 p-1 bg-red-500 rounded-full">
            <MicOff className="h-3 w-3 text-white" />
          </div>
        )}
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
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="w-32 h-32 rounded-full bg-purple-600 flex items-center justify-center text-white text-5xl font-semibold">
              {participant.odName[0]?.toUpperCase() || '?'}
            </div>
          </div>
        )}
        {/* Name overlay */}
        <div className="absolute bottom-20 left-0 right-0 text-center">
          <span className="text-white text-lg font-medium bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm">
            {participant.odName}
          </span>
        </div>
        {/* Status indicators */}
        <div className="absolute bottom-20 right-4 flex items-center space-x-2">
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
      </div>
    );
  }

  // Default grid tile mode for desktop
  return (
    <div className="relative bg-gray-800 rounded-xl overflow-hidden h-full">
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
          <div className="w-24 h-24 rounded-full bg-purple-600 flex items-center justify-center text-white text-3xl font-semibold">
            {participant.odName[0]?.toUpperCase() || '?'}
          </div>
        </div>
      )}

      {/* Name and status overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-medium">
            {participant.odName}
            {participant.isLocal && ' (You)'}
          </span>
          <div className="flex items-center space-x-2">
            {!participant.audioOn && <MicOff className="h-4 w-4 text-red-400" />}
            {!participant.videoOn && <VideoOff className="h-4 w-4 text-red-400" />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
      </div>
    }>
      <SessionContent />
    </Suspense>
  );
}
