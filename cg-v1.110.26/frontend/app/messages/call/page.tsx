'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useWebSocket } from '@/contexts/websocket-context';
import type { CallDeclinedEvent } from '@/lib/websocket';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { PageContainer } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { useWhisperARIAShield, type SensitivityLevel, type ARIAIntervention } from '@/hooks/use-whisper-aria-shield';
import { useCallRecording } from '@/hooks/use-call-recording';
import type { ARIAInterventionEvent } from '@/lib/websocket';
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
  X,
  ArrowLeft,
} from 'lucide-react';
import Image from 'next/image';

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
  const { onARIAIntervention, onCallDeclined, isConnected: wsConnected } = useWebSocket();
  const familyFileId = searchParams.get('family_file_id');
  const callType = searchParams.get('call_type') || 'video';
  const existingSessionId = searchParams.get('session_id'); // For joining existing calls
  const ariaSensitivityParam = searchParams.get('aria_sensitivity');
  const ariaSensitivity = (ariaSensitivityParam === 'strict' || ariaSensitivityParam === 'relaxed') ? ariaSensitivityParam : 'moderate';

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
  const [isARIAReady, setIsARIAReady] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [callDeclined, setCallDeclined] = useState(false);
  const [callTimedOut, setCallTimedOut] = useState(false);

  const callStartTime = useRef<number>(0);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const mutedByARIATimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callRef = useRef<any>(null);
  const ringingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // ARIA Sentiment Shield hook - uses OpenAI Whisper transcription
  const {
    isMonitoring,
    isRecording,
    startMonitoring,
    stopMonitoring,
    interventions,
    latestTranscript,
  } = useWhisperARIAShield({
    callRef,
    sessionId: session?.session_id || '',
    userId: user?.id || '',
    userName: profile?.preferred_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Parent',
    sensitivityLevel: ariaSensitivity as SensitivityLevel,
    chunkIntervalMs: 2500, // Send audio every 2.5 seconds for faster response
    onIntervention: handleARIAIntervention,
    onTranscript: (text) => console.log('[ARIA Whisper] Transcribed:', text),
    onError: (err) => console.error('[ARIA Shield] Error:', err),
  });

  // Call recording hook - records mixed audio and uploads when call ends
  const {
    isRecording: isCallRecording,
    startRecording: startCallRecording,
    stopRecording: stopCallRecording,
  } = useCallRecording({
    callRef,
    sessionId: session?.session_id || '',
    familyFileId: familyFileId || '',
    onRecordingComplete: (url) => console.log('[Recording] Uploaded:', url),
    onError: (err) => console.error('[Recording] Error:', err),
  });

  // Track when ARIA recording starts
  useEffect(() => {
    if (isRecording && !isARIAReady) {
      setIsARIAReady(true);
    }
  }, [isRecording, isARIAReady]);

  // ARIA is always on — no "off" state

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
    if (isJoined && callRef.current && !isMonitoring) {
      // Small delay to ensure audio stream is ready
      const timeoutId = setTimeout(() => {
        startMonitoring();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [isJoined, ariaSensitivity, isMonitoring, startMonitoring]);

  // Start call recording when call joins
  useEffect(() => {
    if (isJoined && callRef.current && session?.session_id && !isCallRecording) {
      // Start recording shortly after join to capture all audio
      const timeoutId = setTimeout(() => {
        console.log('[Recording] Starting call recording...');
        startCallRecording();
      }, 1500);
      return () => clearTimeout(timeoutId);
    }
  }, [isJoined, session?.session_id, isCallRecording, startCallRecording]);

  // Stop monitoring when call ends
  useEffect(() => {
    if (!isJoined && isMonitoring) {
      stopMonitoring();
    }
  }, [isJoined, isMonitoring, stopMonitoring]);

  // Handle ARIA warning - memoized to avoid stale closures
  // (Defined before WebSocket effect that uses it)
  const handleARIAWarning = useCallback((warning: ARIAWarning) => {
    console.log('[ARIA] Processing warning:', warning);
    setAriaWarning(warning);

    // Handle MUTE intervention - mute the offending speaker
    if (warning.should_mute && warning.mute_speaker_id === user?.id) {
      if (callObject) {
        console.log('[ARIA] Muting local audio');
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
          console.log('[ARIA] Unmuting local audio');
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
      console.log('[ARIA] Call will be terminated in', warning.termination_delay || 10, 'seconds');
      setTimeout(() => {
        if (callObject) {
          callObject.leave();
        }
      }, (warning.termination_delay || 10) * 1000);
    }
  }, [user?.id, callObject]);

  // Listen for ARIA intervention events via global WebSocket
  useEffect(() => {
    if (!session?.session_id || !wsConnected) return;

    const unsubscribe = onARIAIntervention((event: ARIAInterventionEvent) => {
      // Only handle interventions for this call session
      if (event.session_id !== session.session_id) return;

      console.log('[ARIA] WebSocket intervention received:', event);
      handleARIAWarning({
        type: event.type,
        severity: event.severity,
        warning_message: event.warning_message,
        should_terminate: event.should_terminate,
        termination_delay: event.termination_delay,
        intervention_type: event.intervention_type,
        should_mute: event.should_mute,
        mute_speaker_id: event.mute_speaker_id,
        mute_duration_seconds: event.mute_duration_seconds,
      });
    });

    return () => unsubscribe();
  }, [session?.session_id, wsConnected, onARIAIntervention, handleARIAWarning]);

  // Listen for call declined events
  useEffect(() => {
    if (!session?.session_id || !wsConnected) return;

    const unsubscribe = onCallDeclined((event: CallDeclinedEvent) => {
      if (event.session_id !== session.session_id) return;

      console.log('[Call] Call was declined by:', event.declined_by_name);
      setCallDeclined(true);
      setIsRinging(false);

      // Clear ringing timeout
      if (ringingTimeoutRef.current) {
        clearTimeout(ringingTimeoutRef.current);
        ringingTimeoutRef.current = null;
      }
    });

    return () => unsubscribe();
  }, [session?.session_id, wsConnected, onCallDeclined]);

  // Set ringing state and timeout when call is initiated (not joining existing)
  useEffect(() => {
    // Only for outgoing calls (not joining an existing session)
    if (!existingSessionId && session && isJoined && !callDeclined && !callTimedOut) {
      const remoteCount = Array.from(participants.values()).filter(p => !p.local).length;

      // If no remote participant yet, we're "ringing"
      if (remoteCount === 0) {
        setIsRinging(true);

        // Set 30-second timeout
        if (!ringingTimeoutRef.current) {
          ringingTimeoutRef.current = setTimeout(() => {
            console.log('[Call] Ringing timeout - no answer');
            setCallTimedOut(true);
            setIsRinging(false);
          }, 30000);
        }
      } else {
        // Remote participant joined, stop ringing
        setIsRinging(false);
        if (ringingTimeoutRef.current) {
          clearTimeout(ringingTimeoutRef.current);
          ringingTimeoutRef.current = null;
        }
      }
    }

    return () => {
      if (ringingTimeoutRef.current) {
        clearTimeout(ringingTimeoutRef.current);
        ringingTimeoutRef.current = null;
      }
    };
  }, [existingSessionId, session, isJoined, participants, callDeclined, callTimedOut]);

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

    // Stop call recording and upload (do this before ending session)
    if (isCallRecording) {
      console.log('[Recording] Stopping and uploading recording...');
      await stopCallRecording();
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
      <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted">
        <Navigation />
        <PageContainer className="pb-32">
          <div className="max-w-lg mx-auto pt-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => router.push('/messages')}
                className="p-2.5 rounded-xl bg-card border-2 border-border hover:border-[#2C5F5D]/30 hover:shadow-lg transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-2xl flex items-center justify-center shadow-md">
                  <Phone className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                    Call Failed
                  </h1>
                  <p className="text-sm text-muted-foreground font-medium">Unable to connect</p>
                </div>
              </div>
            </div>

            <Card className="border-2 border-border rounded-2xl shadow-lg">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/10 to-red-600/5 flex items-center justify-center mx-auto mb-6 shadow-md">
                  <AlertTriangle className="h-10 w-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  Something Went Wrong
                </h2>
                <p className="text-muted-foreground mb-8 max-w-sm mx-auto">{error}</p>
                <button
                  onClick={() => router.push('/messages')}
                  className="px-8 py-3.5 bg-gradient-to-r from-[#2C5F5D] to-[#2D6A8F] text-white rounded-xl font-bold hover:shadow-lg transition-all duration-300"
                >
                  Back to Messages
                </button>
              </CardContent>
            </Card>
          </div>
        </PageContainer>
      </div>
    );
  }

  // Call was declined by the other parent
  if (callDeclined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted">
        <Navigation />
        <PageContainer className="pb-32">
          <div className="max-w-lg mx-auto pt-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => router.push('/messages')}
                className="p-2.5 rounded-xl bg-card border-2 border-border hover:border-[#2C5F5D]/30 hover:shadow-lg transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-2xl flex items-center justify-center shadow-md">
                  <PhoneOff className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                    Call Declined
                  </h1>
                  <p className="text-sm text-muted-foreground font-medium">Not available right now</p>
                </div>
              </div>
            </div>

            <Card className="border-2 border-border rounded-2xl shadow-lg">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 flex items-center justify-center mx-auto mb-6 shadow-md">
                  <PhoneOff className="h-10 w-10 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  Call Not Accepted
                </h2>
                <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                  The other parent declined your call. You can try again later or send a message instead.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => router.push('/messages')}
                    className="px-8 py-3.5 bg-gradient-to-r from-[#2C5F5D] to-[#2D6A8F] text-white rounded-xl font-bold hover:shadow-lg transition-all duration-300"
                  >
                    Send a Message
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-3.5 bg-card border-2 border-border text-foreground rounded-xl font-bold hover:border-[#2C5F5D]/30 hover:shadow-lg transition-all duration-300"
                  >
                    Try Again
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </PageContainer>
      </div>
    );
  }

  // Call timed out - no answer after 30 seconds
  if (callTimedOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted">
        <Navigation />
        <PageContainer className="pb-32">
          <div className="max-w-lg mx-auto pt-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => router.push('/messages')}
                className="p-2.5 rounded-xl bg-card border-2 border-border hover:border-[#2C5F5D]/30 hover:shadow-lg transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-500/10 to-slate-600/5 rounded-2xl flex items-center justify-center shadow-md">
                  <Clock className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                    No Answer
                  </h1>
                  <p className="text-sm text-muted-foreground font-medium">Call timed out</p>
                </div>
              </div>
            </div>

            <Card className="border-2 border-border rounded-2xl shadow-lg">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-500/10 to-slate-600/5 flex items-center justify-center mx-auto mb-6 shadow-md">
                  <Clock className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  No Answer
                </h2>
                <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                  The other parent didn&apos;t answer. They may be busy or away. Try again later or send a message.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => router.push('/messages')}
                    className="px-8 py-3.5 bg-gradient-to-r from-[#2C5F5D] to-[#2D6A8F] text-white rounded-xl font-bold hover:shadow-lg transition-all duration-300"
                  >
                    Send a Message
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-3.5 bg-card border-2 border-border text-foreground rounded-xl font-bold hover:border-[#2C5F5D]/30 hover:shadow-lg transition-all duration-300"
                  >
                    Try Again
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </PageContainer>
      </div>
    );
  }

  if (isInitiating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted">
        <Navigation />
        <PageContainer className="pb-32">
          <div className="max-w-lg mx-auto pt-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => router.push('/messages')}
                className="p-2.5 rounded-xl bg-card border-2 border-border hover:border-[#2C5F5D]/30 hover:shadow-lg transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#2C5F5D]/10 to-[#2C5F5D]/5 rounded-2xl flex items-center justify-center shadow-md">
                  {callType === 'video' ? (
                    <Video className="w-6 h-6 text-[#2C5F5D]" />
                  ) : (
                    <Phone className="w-6 h-6 text-[#2C5F5D]" />
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                    {callType === 'video' ? 'Video Call' : 'Audio Call'}
                  </h1>
                  <p className="text-sm text-muted-foreground font-medium">Connecting...</p>
                </div>
              </div>
            </div>

            <Card className="border-2 border-border rounded-2xl shadow-lg">
              <CardContent className="pt-12 pb-12 text-center">
                <div className="w-20 h-20 border-4 border-[#2C5F5D]/20 border-t-[#2C5F5D] rounded-full animate-spin mx-auto mb-8"></div>
                <h2 className="text-2xl font-bold text-foreground mb-3" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  {callType === 'audio' ? 'Starting Audio Call...' : 'Starting Video Call...'}
                </h2>
                <p className="text-muted-foreground font-medium">Connecting you securely</p>
              </CardContent>
            </Card>
          </div>
        </PageContainer>
      </div>
    );
  }

  // ARIA initialization splash screen - show while waiting for ARIA to start recording
  if (isJoined && !isARIAReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted">
        <Navigation />
        <PageContainer className="pb-32">
          <div className="max-w-lg mx-auto pt-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-[#2C5F5D]/10 to-[#2C5F5D]/5 rounded-2xl flex items-center justify-center shadow-md">
                <Shield className="w-6 h-6 text-[#2C5F5D]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  ARIA Guardian
                </h1>
                <p className="text-sm text-muted-foreground font-medium">Initializing protection</p>
              </div>
            </div>

            <Card className="border-2 border-border rounded-2xl shadow-lg">
              <CardContent className="pt-8 pb-8 text-center">
                {/* ARIA Mascot */}
                <div className="relative w-28 h-28 mx-auto mb-6">
                  <Image
                    src="/images/Aria.png"
                    alt="ARIA Guardian"
                    fill
                    className="object-contain animate-pulse"
                    priority
                  />
                </div>

                {/* Loading indicator */}
                <div className="flex justify-center mb-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#2C5F5D] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-[#2C5F5D] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-[#2C5F5D] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  ARIA Guardian Activating
                </h2>
                <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                  Setting up communication monitoring to keep your conversation constructive
                </p>

                {/* Status indicators */}
                <div className="bg-muted rounded-xl p-4 text-left space-y-3 border-2 border-border">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    </div>
                    <span className="text-emerald-700 font-medium">Call connected</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
                    </div>
                    <span className="text-amber-700 font-medium">Initializing ARIA monitoring...</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm opacity-50">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                    </div>
                    <span className="text-muted-foreground font-medium">Ready to communicate</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </PageContainer>
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
                <p className="text-white text-xl font-medium" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                  {remoteParticipant?.user_name || 'Waiting for other parent...'}
                </p>
                {!remoteParticipant && (
                  <p className="text-muted-foreground text-sm mt-2">They&apos;ll appear here when they join</p>
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
            <h2 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              {remoteParticipant?.user_name || 'Audio Call'}
            </h2>
            <p className="text-muted-foreground">
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
          } text-white relative`}>
            {/* Close button - only show for non-terminating warnings */}
            {!ariaWarning.should_terminate && (
              <button
                onClick={() => setAriaWarning(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                aria-label="Dismiss warning"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-start gap-4 pr-8">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                {ariaWarning.should_mute ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
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
            <h2 className="text-white text-xl font-semibold mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Preparing Call...</h2>
            <p className="text-muted-foreground text-sm">Setting up secure connection</p>
          </div>
        </div>
      }>
        <ParentCallContent />
      </Suspense>
    </ProtectedRoute>
  );
}
