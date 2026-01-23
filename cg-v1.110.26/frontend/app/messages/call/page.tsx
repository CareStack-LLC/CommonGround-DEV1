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
        const response = await fetch('/api/v1/parent-calls/', {
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

    // Join call
    daily.join({
      url: sessionData.room_url,
      token: sessionData.token,
      userName: profile?.display_name || user?.email || 'Parent',
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
        await fetch(`/api/v1/parent-calls/${session.session_id}/end`, {
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
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Call Failed</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/messages')}
            className="px-6 py-3 bg-[#2C5F5D] text-white rounded-xl font-semibold hover:bg-[#2C5F5D]/90 transition-colors"
          >
            Back to Messages
          </button>
        </div>
      </div>
    );
  }

  if (isInitiating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#2C5F5D] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-semibold">Connecting call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 relative">
      {/* Daily.co iframe container */}
      <div id="daily-call-container" className="absolute inset-0" />

      {/* ARIA Warning Overlay */}
      {ariaWarning && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-lg w-full px-4">
          <div className={`rounded-2xl p-6 shadow-2xl ${
            ariaWarning.severity === 'severe'
              ? 'bg-gradient-to-r from-red-500 to-orange-500'
              : 'bg-gradient-to-r from-amber-500 to-orange-500'
          } text-white animate-pulse`}>
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-8 w-8 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2">
                  {ariaWarning.should_terminate ? '⚠️ SEVERE VIOLATION' : 'ARIA Warning'}
                </h3>
                <p className="text-sm mb-3">{ariaWarning.warning_message}</p>
                {ariaWarning.should_terminate && (
                  <p className="text-xs font-bold">
                    Call will be terminated in {ariaWarning.termination_delay || 10} seconds unless communication improves.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Call Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent p-6 z-40">
        <div className="max-w-4xl mx-auto">
          {/* Call Info */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-white/70" />
              <span className="text-2xl font-bold text-white">{formatDuration(callDuration)}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-white/70">ARIA Guardian Active</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center items-center gap-4">
            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              className={`p-4 rounded-full transition-all shadow-lg ${
                isAudioOn
                  ? 'bg-white/20 hover:bg-white/30'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
              title={isAudioOn ? 'Mute' : 'Unmute'}
            >
              {isAudioOn ? (
                <Mic className="h-6 w-6 text-white" />
              ) : (
                <MicOff className="h-6 w-6 text-white" />
              )}
            </button>

            {/* Video Toggle */}
            {callType === 'video' && (
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full transition-all shadow-lg ${
                  isVideoOn
                    ? 'bg-white/20 hover:bg-white/30'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
                title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
              >
                {isVideoOn ? (
                  <Video className="h-6 w-6 text-white" />
                ) : (
                  <VideoOff className="h-6 w-6 text-white" />
                )}
              </button>
            )}

            {/* End Call */}
            <button
              onClick={handleEndCall}
              className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-all shadow-lg"
              title="End call"
            >
              <PhoneOff className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Participant Count */}
          <div className="text-center mt-4">
            <p className="text-sm text-white/60">
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
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#2C5F5D] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg font-semibold">Loading...</p>
          </div>
        </div>
      }>
        <ParentCallContent />
      </Suspense>
    </ProtectedRoute>
  );
}
