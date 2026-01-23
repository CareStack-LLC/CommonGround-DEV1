'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  AlertTriangle,
  Shield,
  Clock,
} from 'lucide-react';

// Daily.co types (simplified)
declare global {
  interface Window {
    DailyIframe: any;
  }
}

interface CallSession {
  session_id: string;
  room_url: string;
  token: string;
  call_type: string;
  status: string;
}

interface ARIAWarning {
  type: string;
  severity: string;
  warning_message: string;
  should_terminate: boolean;
  termination_delay?: number;
}

function ParentCallContent() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyFileId = searchParams.get('family_file_id');
  const callType = searchParams.get('call_type') || 'video';

  const [callObject, setCallObject] = useState<any>(null);
  const [session, setSession] = useState<CallSession | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(callType === 'video');
  const [ariaWarning, setAriaWarning] = useState<ARIAWarning | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isInitiating, setIsInitiating] = useState(true);

  const callStartTime = useRef<number>(0);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const ws = useRef<WebSocket | null>(null);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize call
  useEffect(() => {
    if (!familyFileId || !user) return;

    const initiateCall = async () => {
      try {
        setIsInitiating(true);

        // Create call session
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/v1/parent-calls/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({
            family_file_id: familyFileId,
            call_type: callType,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create call session');
        }

        const sessionData: CallSession = await response.json();
        setSession(sessionData);

        // Load Daily.co iframe script
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@daily-co/daily-js';
        script.async = true;
        script.onload = () => {
          joinDailyCall(sessionData);
        };
        document.body.appendChild(script);

        setIsInitiating(false);
      } catch (err: any) {
        console.error('Failed to initiate call:', err);
        setError(err.message || 'Failed to start call');
        setIsInitiating(false);
      }
    };

    initiateCall();

    return () => {
      if (callObject) {
        callObject.destroy();
      }
      if (ws.current) {
        ws.current.close();
      }
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [familyFileId, callType, user]);

  // Join Daily.co call
  const joinDailyCall = (sessionData: CallSession) => {
    if (!window.DailyIframe) return;

    const daily = window.DailyIframe.createFrame({
      iframeStyle: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        border: 0,
      },
      showLeaveButton: false,
      showFullscreenButton: true,
    });

    setCallObject(daily);

    // Join call - start with video off for audio-only calls
    daily.join({
      url: sessionData.room_url,
      token: sessionData.token,
      userName: profile?.preferred_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user?.email || 'Parent',
      startVideoOff: callType === 'audio',
      startAudioOff: false,
    });

    // Event listeners
    daily.on('joined-meeting', () => {
      callStartTime.current = Date.now();
      durationInterval.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime.current) / 1000));
      }, 1000);
    });

    daily.on('participant-joined', (event: any) => {
      setParticipants(prev => [...prev, event.participant]);
    });

    daily.on('participant-left', (event: any) => {
      setParticipants(prev => prev.filter(p => p.session_id !== event.participant.session_id));
    });

    daily.on('left-meeting', () => {
      handleEndCall();
    });

    // Setup WebSocket for ARIA warnings
    setupWebSocket(sessionData.session_id);
  };

  // Setup WebSocket for ARIA warnings
  const setupWebSocket = (sessionId: string) => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const wsConnection = new WebSocket(`${wsUrl}/ws`);

    wsConnection.onopen = () => {
      console.log('WebSocket connected for ARIA monitoring');
    };

    wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'aria_intervention' && data.session_id === sessionId) {
          handleARIAWarning(data);
        }
        if (data.type === 'call_terminated' && data.session_id === sessionId) {
          alert('This call has been terminated by ARIA due to severe communication violations.');
          handleEndCall();
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    wsConnection.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.current = wsConnection;
  };

  // Handle ARIA warning
  const handleARIAWarning = (warning: ARIAWarning) => {
    setAriaWarning(warning);

    // Auto-dismiss warning after delay (if not terminating)
    if (!warning.should_terminate) {
      setTimeout(() => {
        setAriaWarning(null);
      }, 10000);
    } else {
      // Show countdown for termination
      setTimeout(() => {
        if (callObject) {
          callObject.leave();
        }
      }, (warning.termination_delay || 10) * 1000);
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (callObject) {
      callObject.setLocalAudio(!isAudioOn);
      setIsAudioOn(!isAudioOn);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (callObject) {
      callObject.setLocalVideo(!isVideoOn);
      setIsVideoOn(!isVideoOn);
    }
  };

  // End call
  const handleEndCall = async () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }

    if (session) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        await fetch(`${apiUrl}/api/v1/parent-calls/${session.session_id}/end`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        });
      } catch (err) {
        console.error('Failed to end call session:', err);
      }
    }

    if (callObject) {
      callObject.destroy();
    }

    if (ws.current) {
      ws.current.close();
    }

    router.push('/messages');
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl mx-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Call Failed</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/messages')}
            className="px-6 py-3 bg-[var(--portal-primary,#2C5F5D)] text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg"
          >
            Back to Messages
          </button>
        </div>
      </div>
    );
  }

  if (isInitiating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-[var(--portal-primary,#2C5F5D)]/30 border-t-[var(--portal-primary,#2C5F5D)] rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-white text-xl font-semibold mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
            {callType === 'audio' ? 'Starting Audio Call...' : 'Starting Video Call...'}
          </h2>
          <p className="text-slate-400 text-sm">Connecting you securely</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 relative">
      {/* Daily.co iframe container */}
      <div id="daily-call-container" className="absolute inset-0" />

      {/* Audio-only call overlay - show when no video */}
      {callType === 'audio' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[var(--portal-primary,#2C5F5D)] to-[var(--portal-primary,#2C5F5D)]/70 flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
              <Phone className="h-16 w-16 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
              Audio Call
            </h2>
            <p className="text-slate-400">Voice only - no video</p>
          </div>
        </div>
      )}

      {/* ARIA Warning Overlay */}
      {ariaWarning && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-lg w-full px-4">
          <div className={`rounded-2xl p-5 shadow-2xl backdrop-blur-sm ${
            ariaWarning.severity === 'severe'
              ? 'bg-gradient-to-r from-red-500/95 to-orange-500/95'
              : 'bg-gradient-to-r from-amber-500/95 to-orange-500/95'
          } text-white`}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                  {ariaWarning.should_terminate ? 'Severe Violation' : 'ARIA Warning'}
                </h3>
                <p className="text-sm opacity-95 mb-2">{ariaWarning.warning_message}</p>
                {ariaWarning.should_terminate && (
                  <p className="text-xs font-semibold bg-white/20 rounded-lg px-3 py-2">
                    Call will be terminated in {ariaWarning.termination_delay || 10} seconds unless communication improves.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Call Controls - Mobile-optimized bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900/98 to-transparent pb-safe z-40">
        <div className="max-w-xl mx-auto px-4 py-6 md:py-8">
          {/* Call Info */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2.5 mb-3">
              <Clock className="h-5 w-5 text-white/80" />
              <span className="text-2xl font-bold text-white tabular-nums">{formatDuration(callDuration)}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <Shield className="h-4 w-4 text-[var(--portal-primary,#2C5F5D)]" />
              <span className="text-sm text-white/70">ARIA Guardian Active</span>
            </div>
          </div>

          {/* Control Buttons - Larger touch targets for mobile */}
          <div className="flex justify-center items-center gap-5">
            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              className={`w-14 h-14 md:w-16 md:h-16 rounded-full transition-all shadow-lg flex items-center justify-center ${
                isAudioOn
                  ? 'bg-white/15 hover:bg-white/25 border-2 border-white/20'
                  : 'bg-red-500 hover:bg-red-600 border-2 border-red-400'
              }`}
              title={isAudioOn ? 'Mute' : 'Unmute'}
            >
              {isAudioOn ? (
                <Mic className="h-6 w-6 md:h-7 md:w-7 text-white" />
              ) : (
                <MicOff className="h-6 w-6 md:h-7 md:w-7 text-white" />
              )}
            </button>

            {/* End Call - Larger and prominent */}
            <button
              onClick={handleEndCall}
              className="w-16 h-16 md:w-18 md:h-18 rounded-full bg-red-500 hover:bg-red-600 transition-all shadow-xl flex items-center justify-center border-2 border-red-400"
              title="End call"
            >
              <PhoneOff className="h-7 w-7 md:h-8 md:w-8 text-white" />
            </button>

            {/* Video Toggle - Only show for video calls */}
            {callType === 'video' && (
              <button
                onClick={toggleVideo}
                className={`w-14 h-14 md:w-16 md:h-16 rounded-full transition-all shadow-lg flex items-center justify-center ${
                  isVideoOn
                    ? 'bg-white/15 hover:bg-white/25 border-2 border-white/20'
                    : 'bg-red-500 hover:bg-red-600 border-2 border-red-400'
                }`}
                title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
              >
                {isVideoOn ? (
                  <Video className="h-6 w-6 md:h-7 md:w-7 text-white" />
                ) : (
                  <VideoOff className="h-6 w-6 md:h-7 md:w-7 text-white" />
                )}
              </button>
            )}
          </div>

          {/* Participant Count */}
          <div className="text-center mt-4">
            <p className="text-sm text-white/50">
              {participants.length + 1} participant{participants.length !== 0 ? 's' : ''} in call
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ParentCallPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
          <div className="text-center">
            <div className="w-20 h-20 border-4 border-[var(--portal-primary,#2C5F5D)]/30 border-t-[var(--portal-primary,#2C5F5D)] rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-white text-xl font-semibold mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Preparing Call...</h2>
            <p className="text-slate-400 text-sm">Setting up secure connection</p>
          </div>
        </div>
      }>
        <ParentCallContent />
      </Suspense>
    </ProtectedRoute>
  );
}
