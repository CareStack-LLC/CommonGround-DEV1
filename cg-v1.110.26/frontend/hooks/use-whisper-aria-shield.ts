'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { DailyCall } from '@daily-co/daily-js';

/**
 * ARIA Sentiment Shield with OpenAI Whisper Transcription
 *
 * Captures audio from Daily.co call, sends to backend for Whisper transcription,
 * and handles ARIA interventions.
 *
 * Usage:
 * const { startMonitoring, stopMonitoring, isMonitoring, interventions } = useWhisperARIAShield({
 *   callRef,
 *   sessionId,
 *   userId,
 *   userName,
 *   sensitivityLevel: 'moderate',
 *   onIntervention: (intervention) => handleIntervention(intervention),
 * });
 */

export type SensitivityLevel = 'strict' | 'moderate' | 'relaxed' | 'off';

export interface ARIAIntervention {
  id: string;
  type: 'warning' | 'mute' | 'terminate';
  message: string;
  severity: string;
  speakerId?: string;
  muteDurationSeconds?: number;
  timestamp: Date;
}

export interface UseWhisperARIAShieldOptions {
  callRef: React.MutableRefObject<DailyCall | null>;
  sessionId: string;
  userId: string;
  userName: string;
  sensitivityLevel?: SensitivityLevel;
  chunkIntervalMs?: number; // How often to send audio chunks (default: 5000ms)
  onIntervention?: (intervention: ARIAIntervention) => void;
  onTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
}

export interface UseWhisperARIAShieldReturn {
  isMonitoring: boolean;
  isRecording: boolean;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => void;
  interventions: ARIAIntervention[];
  latestTranscript: string;
  clearInterventions: () => void;
}

export function useWhisperARIAShield({
  callRef,
  sessionId,
  userId,
  userName,
  sensitivityLevel = 'moderate',
  chunkIntervalMs = 5000,
  onIntervention,
  onTranscript,
  onError,
}: UseWhisperARIAShieldOptions): UseWhisperARIAShieldReturn {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interventions, setInterventions] = useState<ARIAIntervention[]>([]);
  const [latestTranscript, setLatestTranscript] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const chunkIndexRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Send audio chunk to backend for Whisper transcription
  const sendAudioChunk = useCallback(async (audioBlob: Blob) => {
    if (!sessionId || sensitivityLevel === 'off' || audioBlob.size < 1000) {
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const currentTime = (Date.now() - startTimeRef.current) / 1000;

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, `chunk_${chunkIndexRef.current}.webm`);
      formData.append('speaker_id', userId);
      formData.append('speaker_name', userName);
      formData.append('chunk_index', String(chunkIndexRef.current));
      formData.append('start_time', String(currentTime));

      chunkIndexRef.current++;

      console.log(`[Whisper ARIA] Sending audio chunk ${chunkIndexRef.current} (${audioBlob.size} bytes)`);

      const response = await fetch(`${apiUrl}/api/v1/parent-calls/${sessionId}/audio-chunk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('[Whisper ARIA] Failed to process audio:', errorText);
        return;
      }

      const result = await response.json();

      // Handle transcription result
      if (result.transcription?.text) {
        console.log('[Whisper ARIA] Transcribed:', result.transcription.text);
        setLatestTranscript(result.transcription.text);
        onTranscript?.(result.transcription.text);
      }

      // Handle intervention (also sent via WebSocket, but handle immediate response too)
      if (result.intervention) {
        const intervention: ARIAIntervention = {
          id: result.intervention.flag_id || `int-${Date.now()}`,
          type: result.intervention.intervention_type,
          message: result.intervention.warning_message,
          severity: result.intervention.severity,
          speakerId: result.intervention.mute_speaker_id,
          muteDurationSeconds: result.intervention.mute_duration_seconds,
          timestamp: new Date(),
        };

        console.log('[Whisper ARIA] Intervention received:', intervention);
        setInterventions(prev => [...prev, intervention]);
        onIntervention?.(intervention);
      }
    } catch (err) {
      console.error('[Whisper ARIA] Error sending audio:', err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [sessionId, userId, userName, sensitivityLevel, onIntervention, onTranscript, onError]);

  // Start recording and sending audio
  const startRecording = useCallback(async () => {
    const call = callRef.current;
    if (!call) {
      console.warn('[Whisper ARIA] No call object available');
      return;
    }

    try {
      // Get local audio track from Daily.co
      const participants = call.participants();
      const local = participants.local;

      if (!local?.tracks?.audio?.track) {
        console.warn('[Whisper ARIA] No local audio track available');
        return;
      }

      // Create AudioContext to mix tracks
      audioContextRef.current = new AudioContext();
      destinationRef.current = audioContextRef.current.createMediaStreamDestination();

      // Add local audio
      const localStream = new MediaStream([local.tracks.audio.track]);
      const localSource = audioContextRef.current.createMediaStreamSource(localStream);
      localSource.connect(destinationRef.current);

      // Optionally add remote audio for full conversation capture
      Object.values(participants).forEach((participant: any) => {
        if (!participant.local && participant.tracks?.audio?.track) {
          const remoteStream = new MediaStream([participant.tracks.audio.track]);
          const remoteSource = audioContextRef.current!.createMediaStreamSource(remoteStream);
          remoteSource.connect(destinationRef.current!);
        }
      });

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      mediaRecorderRef.current = new MediaRecorder(destinationRef.current.stream, {
        mimeType,
        audioBitsPerSecond: 64000,
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        // Send accumulated audio when recording stops
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          sendAudioChunk(audioBlob);
          audioChunksRef.current = [];
        }
      };

      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);

      console.log('[Whisper ARIA] Recording started');

      // Set up interval to send chunks periodically
      recordingIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          // Small delay before restarting to collect data
          setTimeout(() => {
            if (mediaRecorderRef.current && audioContextRef.current?.state !== 'closed') {
              try {
                mediaRecorderRef.current.start();
              } catch (e) {
                console.warn('[Whisper ARIA] Could not restart recording:', e);
              }
            }
          }, 100);
        }
      }, chunkIntervalMs);

    } catch (err) {
      console.error('[Whisper ARIA] Failed to start recording:', err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [callRef, chunkIntervalMs, sendAudioChunk, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }
    audioContextRef.current = null;
    destinationRef.current = null;

    setIsRecording(false);
    console.log('[Whisper ARIA] Recording stopped');
  }, []);

  // Start ARIA monitoring
  const startMonitoring = useCallback(async () => {
    if (sensitivityLevel === 'off') {
      console.log('[Whisper ARIA] Monitoring disabled (sensitivity: off)');
      return;
    }

    if (isMonitoring) {
      console.log('[Whisper ARIA] Already monitoring');
      return;
    }

    console.log('[Whisper ARIA] Starting monitoring with sensitivity:', sensitivityLevel);

    startTimeRef.current = Date.now();
    chunkIndexRef.current = 0;
    setIsMonitoring(true);

    // Small delay to ensure audio tracks are ready
    setTimeout(() => {
      startRecording();
    }, 500);

    console.log('[Whisper ARIA] Monitoring started');
  }, [sensitivityLevel, isMonitoring, startRecording]);

  // Stop ARIA monitoring
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;

    console.log('[Whisper ARIA] Stopping monitoring');

    stopRecording();
    setIsMonitoring(false);

    console.log('[Whisper ARIA] Monitoring stopped');
  }, [isMonitoring, stopRecording]);

  // Clear interventions
  const clearInterventions = useCallback(() => {
    setInterventions([]);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    isMonitoring,
    isRecording,
    startMonitoring,
    stopMonitoring,
    interventions,
    latestTranscript,
    clearInterventions,
  };
}

export default useWhisperARIAShield;
