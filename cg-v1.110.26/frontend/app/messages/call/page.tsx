'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { useARIASentimentShield, type SensitivityLevel, type ARIAIntervention } from '@/hooks/use-aria-sentiment-shield';
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
  User,
} from 'lucide-react';

// Daily.co types
declare global {
  interface Window {
    Daily: any;
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
  intervention_type?: string;
  should_mute?: boolean;
  mute_speaker_id?: string;
  mute_duration_seconds?: number;
}

interface Participant {
  session_id: string;
  user_id?: string;
  user_name?: string;
  local: boolean;
  video: boolean;
  audio: boolean;
  tracks: {
    video?: { state: string; track?: MediaStreamTrack };
    audio?: { state: string; track?: MediaStreamTrack };
  };
}

function ParentCallContent() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyFileId = searchParams.get('family_file_id');
  const callType = searchParams.get('call_type') || 'video';
  const existingSessionId = searchParams.get('session_id'); // For joining existing calls
  const ariaSensitivity = searchParams.get('aria_sensitivity') || 'moderate';

  const [callObject, setCallObject] = useState<any>(null);
  const [session, setSession] = useState<CallSession | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(callType === 'video');
  const [ariaWarning, setAriaWarning] = useState<ARIAWarning | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isInitiating, setIsInitiating] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [isMutedByARIA, setIsMutedByARIA] = useState(false);

  const callStartTime = useRef<number>(0);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const mutedByARIATimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callRef = useRef<any>(null);

  // Handle ARIA interventions from the Sentiment Shield
  const handleARIAIntervention = useCallback((intervention: ARIAIntervention) => {
    console.log('[ARIA Shield] Intervention received:', intervention);
    setAriaWarning({
      type: 'aria_intervention',
      severity: intervention.severity,
      warning_message: intervention.message,
      should_terminate: intervention.type === 'terminate',
      intervention_type: intervention.type,
      should_mute: intervention.type === 'mute',
      mute_speaker_id: intervention.speakerId,
      mute_duration_seconds: intervention.muteDurationSeconds,
    });
  }, []);

  // ARIA Sentiment Shield hook - uses Daily.co transcription
  const {
    isMonitoring,
    isTranscribing,
    startMonitoring,
    stopMonitoring,
    interventions,
  } = useARIASentimentShield({
    callRef,
    sessionId: session?.session_id || '',
    sessionType: 'parent_call',
    userId: user?.id || '',
    userName: profile?.preferred_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Parent',
    sensitivityLevel: ariaSensitivity as SensitivityLevel,
    callStartTime: callStartTime.current,
    onIntervention: handleARIAIntervention,
    onError: (err) => console.error('[ARIA Shield] Error:', err),
  });

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Update video/audio elements when participants change
  const updateVideoElements = useCallback((daily: any) => {
    if (!daily) return;

    const participantsList = daily.participants();
    console.log('Updating participants:', Object.keys(participantsList));

    // Update local video
    const local = participantsList.local;
    if (local && localVideoRef.current) {
      const videoTrack = local.tracks?.video;
      const trackToUse = videoTrack?.persistentTrack || videoTrack?.track;
      console.log('Local video track state:', videoTrack?.state, 'hasTrack:', !!trackToUse);

      if (trackToUse && videoTrack?.state === 'playable') {
        localVideoRef.current.srcObject = new MediaStream([trackToUse]);
        localVideoRef.current.play().catch(e => console.log('Local video play error:', e));
      } else if (!trackToUse || videoTrack?.state === 'off') {
        localVideoRef.current.srcObject = null;
      }
    }

    // Update remote video and audio (first non-local participant)
    const remoteParticipants = Object.values(participantsList).filter((p: any) => !p.local);
    if (remoteParticipants.length > 0) {
      const remote = remoteParticipants[0] as any;
      console.log('Remote participant:', remote.user_name);

      // Remote video
      if (remoteVideoRef.current) {
        const videoTrack = remote.tracks?.video;
        const trackToUse = videoTrack?.persistentTrack || videoTrack?.track;
        console.log('Remote video track state:', videoTrack?.state, 'hasTrack:', !!trackToUse);

        if (trackToUse && videoTrack?.state === 'playable') {
          remoteVideoRef.current.srcObject = new MediaStream([trackToUse]);
          remoteVideoRef.current.play().catch(e => console.log('Remote video play error:', e));
        } else if (!trackToUse || videoTrack?.state === 'off') {
          remoteVideoRef.current.srcObject = null;
        }
      }

      // Remote audio - CRITICAL for hearing the other person!
      if (remoteAudioRef.current) {
        const audioTrack = remote.tracks?.audio;
        const trackToUse = audioTrack?.persistentTrack || audioTrack?.track;
        console.log('Remote audio track state:', audioTrack?.state, 'hasTrack:', !!trackToUse);

        if (trackToUse && (audioTrack?.state === 'playable' || audioTrack?.state === 'loading')) {
          remoteAudioRef.current.srcObject = new MediaStream([trackToUse]);
          remoteAudioRef.current.play().catch(e => console.log('Remote audio play error:', e));
        }
      }
    }

    // Update participants state
    const newParticipants = new Map<string, Participant>();
    Object.entries(participantsList).forEach(([id, p]: [string, any]) => {
      newParticipants.set(id, {
        session_id: p.session_id,
        user_id: p.user_id,
        user_name: p.user_name,
        local: p.local,
        video: p.tracks?.video?.state === 'playable',
        audio: p.tracks?.audio?.state === 'playable',
        tracks: p.tracks,
      });
    });
    setParticipants(newParticipants);
  }, []);

  // Initialize call
  useEffect(() => {
    if (!familyFileId || !user) return;

    const initiateCall = async () => {
      try {
        setIsInitiating(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        let sessionData: CallSession;

        if (existingSessionId) {
          // Join existing call session (from incoming call notification)
          const userName = profile?.preferred_name ||
            `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
            user?.email || 'Parent';

          const response = await fetch(`${apiUrl}/api/v1/parent-calls/${existingSessionId}/join`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
            body: JSON.stringify({
              user_name: userName,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to join call session');
          }

          sessionData = await response.json();
        } else {
          // Create new call session with ARIA sensitivity
          const response = await fetch(`${apiUrl}/api/v1/parent-calls/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
            body: JSON.stringify({
              family_file_id: familyFileId,
              call_type: callType,
              aria_sensitivity_level: ariaSensitivity,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to create call session');
          }

          sessionData = await response.json();
        }

        setSession(sessionData);

        // Load Daily.co script
        if (!window.Daily) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/@daily-co/daily-js';
          script.async = true;
          script.onload = () => {
            joinDailyCall(sessionData);
          };
          script.onerror = () => {
            setError('Failed to load video call library');
            setIsInitiating(false);
          };
          document.body.appendChild(script);
        } else {
          joinDailyCall(sessionData);
        }
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
      if (mutedByARIATimeoutRef.current) {
        clearTimeout(mutedByARIATimeoutRef.current);
      }
      // ARIA Sentiment Shield cleanup is handled by the hook
      callRef.current = null;
    };
  }, [familyFileId, callType, user, existingSessionId, profile]);

  // Start ARIA Sentiment Shield monitoring when call joins
  useEffect(() => {
    if (isJoined && callRef.current && ariaSensitivity !== 'off' && !isMonitoring) {
      // Small delay to ensure audio stream is ready
      const timeoutId = setTimeout(() => {
        startMonitoring();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [isJoined, ariaSensitivity, isMonitoring, startMonitoring]);

  // Stop monitoring when call ends
  useEffect(() => {
    if (!isJoined && isMonitoring) {
      stopMonitoring();
    }
  }, [isJoined, isMonitoring, stopMonitoring]);

  // Join Daily.co call using call object (custom UI)
  const joinDailyCall = async (sessionData: CallSession) => {
    if (!window.Daily) return;

    try {
      // Create call object (not iframe) for custom UI
      const daily = window.Daily.createCallObject({
        audioSource: true,
        videoSource: callType === 'video',
      });

      setCallObject(daily);
      callRef.current = daily; // Store ref for ARIA Sentiment Shield

      // Event listeners
      daily.on('joined-meeting', () => {
        console.log('Joined meeting');
        setIsJoined(true);
        setIsInitiating(false);
        callStartTime.current = Date.now();
        durationInterval.current = setInterval(() => {
          setCallDuration(Math.floor((Date.now() - callStartTime.current) / 1000));
        }, 1000);
        updateVideoElements(daily);
      });

      daily.on('participant-joined', (event: any) => {
        console.log('Participant joined:', event.participant.user_name);
        updateVideoElements(daily);
      });

      daily.on('participant-updated', () => {
        updateVideoElements(daily);
      });

      daily.on('participant-left', (event: any) => {
        console.log('Participant left:', event.participant.user_name);
        updateVideoElements(daily);
      });

      daily.on('track-started', () => {
        updateVideoElements(daily);
      });

      daily.on('track-stopped', () => {
        updateVideoElements(daily);
      });

      daily.on('left-meeting', () => {
        handleEndCall();
      });

      daily.on('error', (error: any) => {
        console.error('Daily error:', error);
        setError(error.errorMsg || 'Call error occurred');
      });

      // Join the call
      await daily.join({
        url: sessionData.room_url,
        token: sessionData.token,
        userName: profile?.preferred_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user?.email || 'Parent',
        startVideoOff: callType === 'audio',
        startAudioOff: false,
      });

      // Setup WebSocket for ARIA warnings
      setupWebSocket(sessionData.session_id);
    } catch (err: any) {
      console.error('Failed to join call:', err);
      setError(err.message || 'Failed to join call');
      setIsInitiating(false);
    }
  };

  // Setup WebSocket for ARIA warnings and call notifications
  const setupWebSocket = (sessionId: string) => {
    // Build WebSocket URL from API URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    // Convert http(s) to ws(s) - keep /api/v1 if present since WS endpoint is at /api/v1/ws
    let wsUrl = apiUrl.replace(/^http/, 'ws');
    // Ensure we have /api/v1/ws path
    if (!wsUrl.includes('/api/v1')) {
      wsUrl = wsUrl + '/api/v1';
    }

    // Get auth token for WebSocket authentication
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.error('No auth token for WebSocket');
      return;
    }

    try {
      const wsConnection = new WebSocket(`${wsUrl}/ws?token=${encodeURIComponent(token)}`);

      wsConnection.onopen = () => {
        console.log('[WebSocket] Connected for ARIA monitoring');
        // Subscribe to the family file for call-related notifications
        if (familyFileId) {
          wsConnection.send(JSON.stringify({
            type: 'subscribe',
            case_id: familyFileId,
          }));
        }
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
        // Don't show error to user - ARIA monitoring is optional
      };

      ws.current = wsConnection;
    } catch (err) {
      console.error('Failed to setup WebSocket:', err);
    }
  };

  // Handle ARIA warning
  const handleARIAWarning = (warning: ARIAWarning) => {
    setAriaWarning(warning);

    // Handle MUTE intervention - mute the offending speaker
    if (warning.should_mute && warning.mute_speaker_id === user?.id) {
      if (callObject) {
        callObject.setLocalAudio(false);
        setIsAudioOn(false);
        setIsMutedByARIA(true);
      }

      // Auto-unmute after duration
      if (mutedByARIATimeoutRef.current) {
        clearTimeout(mutedByARIATimeoutRef.current);
      }
      mutedByARIATimeoutRef.current = setTimeout(() => {
        if (callObject) {
          callObject.setLocalAudio(true);
          setIsAudioOn(true);
          setIsMutedByARIA(false);
        }
      }, (warning.mute_duration_seconds || 2) * 1000);
    }

    if (!warning.should_terminate) {
      // Clear warning after display time (longer for mute)
      const displayDuration = warning.should_mute ?
        Math.max((warning.mute_duration_seconds || 2) * 1000 + 2000, 10000) :
        10000;
      setTimeout(() => {
        setAriaWarning(null);
      }, displayDuration);
    } else {
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

    // Stop ARIA monitoring
    stopMonitoring();

    if (callObject) {
      await callObject.destroy();
    }
    callRef.current = null;

    if (ws.current) {
      ws.current.close();
    }

    router.push('/messages');
  };

  // Get remote participant info
  const getRemoteParticipant = () => {
    const remote = Array.from(participants.values()).find(p => !p.local);
    return remote;
  };

  const remoteParticipant = getRemoteParticipant();
  const participantCount = participants.size;

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
            className="px-6 py-3 bg-[#2C5F5D] text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg"
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
          <div className="w-20 h-20 border-4 border-[#2C5F5D]/30 border-t-[#2C5F5D] rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-white text-xl font-semibold mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
            {callType === 'audio' ? 'Starting Audio Call...' : 'Starting Video Call...'}
          </h2>
          <p className="text-slate-400 text-sm">Connecting you securely</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex flex-col">
      {/* Hidden audio element for remote participant audio - CRITICAL for sound! */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Main Video Area */}
      <div className="flex-1 relative">
        {/* Remote Participant (Full Screen) */}
        {callType === 'video' ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Always render video element so it's ready for tracks */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${remoteParticipant?.video ? '' : 'hidden'}`}
            />
            {/* Show placeholder when no video */}
            {!remoteParticipant?.video && (
              <div className="flex flex-col items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#2C5F5D] to-[#2C5F5D]/70 flex items-center justify-center mb-4 shadow-2xl">
                  <User className="h-16 w-16 text-white" />
                </div>
                <p className="text-white text-xl font-medium" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                  {remoteParticipant?.user_name || 'Waiting for other parent...'}
                </p>
                {!remoteParticipant && (
                  <p className="text-slate-400 text-sm mt-2">They&apos;ll appear here when they join</p>
                )}
              </div>
            )}
          </div>
        ) : (
          // Audio-only call UI
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-36 h-36 rounded-full bg-gradient-to-br from-[#2C5F5D] to-[#2C5F5D]/70 flex items-center justify-center mb-6 shadow-2xl">
              <Phone className="h-16 w-16 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
              {remoteParticipant?.user_name || 'Audio Call'}
            </h2>
            <p className="text-slate-400">
              {remoteParticipant ? 'Voice call connected' : 'Waiting for other parent...'}
            </p>
          </div>
        )}

        {/* Local Video (Picture-in-Picture) - Always render for video calls */}
        {callType === 'video' && (
          <div className={`absolute top-4 right-4 w-32 h-44 md:w-40 md:h-56 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-slate-800 ${isVideoOn ? '' : 'hidden'}`}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-white text-xs font-medium bg-black/50 rounded-lg px-2 py-1 text-center truncate">
                You
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ARIA Warning Overlay */}
      {ariaWarning && (
        <div className="absolute top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-full md:max-w-lg z-50">
          <div className={`rounded-2xl p-5 shadow-2xl backdrop-blur-sm ${
            ariaWarning.severity === 'severe'
              ? 'bg-gradient-to-r from-red-500/95 to-orange-500/95'
              : ariaWarning.should_mute
              ? 'bg-gradient-to-r from-purple-500/95 to-indigo-500/95'
              : 'bg-gradient-to-r from-amber-500/95 to-orange-500/95'
          } text-white`}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                {ariaWarning.should_mute ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                  {ariaWarning.should_terminate ? 'Severe Violation' :
                   ariaWarning.should_mute ? 'Microphone Muted' : 'ARIA Warning'}
                </h3>
                <p className="text-sm opacity-95 mb-2">{ariaWarning.warning_message}</p>
                {ariaWarning.should_terminate && (
                  <p className="text-xs font-semibold bg-white/20 rounded-lg px-3 py-2">
                    Call will be terminated in {ariaWarning.termination_delay || 10} seconds.
                  </p>
                )}
                {ariaWarning.should_mute && ariaWarning.mute_speaker_id === user?.id && (
                  <p className="text-xs font-semibold bg-white/20 rounded-lg px-3 py-2">
                    Your microphone will be unmuted in {ariaWarning.mute_duration_seconds || 2} seconds.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ARIA Muted Indicator - Persistent overlay when muted by ARIA */}
      {isMutedByARIA && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-purple-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
            <MicOff className="h-4 w-4" />
            <span className="text-sm font-medium">Muted by ARIA</span>
          </div>
        </div>
      )}

      {/* Call Controls - Bottom Bar */}
      <div className="bg-gradient-to-t from-slate-900 via-slate-900/98 to-transparent p-4 pb-8 md:p-6">
        <div className="max-w-xl mx-auto">
          {/* Call Info */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2.5 mb-3">
              <Clock className="h-5 w-5 text-white/80" />
              <span className="text-2xl font-bold text-white tabular-nums">{formatDuration(callDuration)}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <Shield className="h-4 w-4 text-[#2C5F5D]" />
              <span className="text-sm text-white/70">ARIA Guardian Active</span>
            </div>
          </div>

          {/* Control Buttons */}
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

            {/* End Call */}
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
              {participantCount} participant{participantCount !== 1 ? 's' : ''} in call
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
            <div className="w-20 h-20 border-4 border-[#2C5F5D]/30 border-t-[#2C5F5D] rounded-full animate-spin mx-auto mb-6"></div>
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
