'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { DailyCall } from '@daily-co/daily-js';

/**
 * ARIA Sentiment Shield - Real-time call monitoring using Daily.co transcription
 *
 * Provides:
 * - Automatic speech-to-text via Daily.co's Deepgram integration
 * - Real-time ARIA sentiment analysis
 * - Intervention handling (warnings, mutes, terminations)
 *
 * Usage:
 * const { startMonitoring, stopMonitoring, isMonitoring, interventions } = useARIASentimentShield({
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

export interface TranscriptChunk {
  sessionId: string;
  speakerId: string;
  speakerName: string;
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

export interface UseARIASentimentShieldOptions {
  callRef: React.MutableRefObject<DailyCall | null>;
  sessionId: string;
  sessionType: 'parent_call' | 'my_circle';
  userId: string;
  userName: string;
  sensitivityLevel?: SensitivityLevel;
  callStartTime?: number;
  onIntervention?: (intervention: ARIAIntervention) => void;
  onTranscript?: (chunk: TranscriptChunk) => void;
  onError?: (error: Error) => void;
}

export interface UseARIASentimentShieldReturn {
  isMonitoring: boolean;
  isTranscribing: boolean;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => void;
  interventions: ARIAIntervention[];
  latestTranscript: string;
  clearInterventions: () => void;
}

export function useARIASentimentShield({
  callRef,
  sessionId,
  sessionType,
  userId,
  userName,
  sensitivityLevel = 'moderate',
  callStartTime,
  onIntervention,
  onTranscript,
  onError,
}: UseARIASentimentShieldOptions): UseARIASentimentShieldReturn {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interventions, setInterventions] = useState<ARIAIntervention[]>([]);
  const [latestTranscript, setLatestTranscript] = useState('');

  const transcriptionStartedRef = useRef(false);
  const eventHandlersSetRef = useRef(false);
  const startTimeRef = useRef<number>(callStartTime || Date.now());

  // Send transcript chunk to backend for ARIA analysis
  const sendTranscriptChunk = useCallback(async (
    text: string,
    speakerId: string,
    speakerName: string,
  ) => {
    if (!sessionId || sensitivityLevel === 'off') return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const now = Date.now();
    const startTime = (now - startTimeRef.current) / 1000;

    try {
      // Determine endpoint based on session type
      const endpoint = sessionType === 'parent_call'
        ? `/api/v1/parent-calls/${sessionId}/transcript-chunk`
        : `/api/v1/calls/${sessionId}/transcript-chunk`;

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          speaker_id: speakerId,
          speaker_name: speakerName,
          content: text,
          confidence: 0.9, // Daily/Deepgram typically has high accuracy
          start_time: startTime,
          end_time: startTime + (text.length * 0.06), // Rough estimate
          sensitivity_level: sensitivityLevel,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('[ARIA Shield] Failed to send chunk:', errorText);
        return;
      }

      // Check for ARIA intervention in response
      const result = await response.json();
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

        setInterventions(prev => [...prev, intervention]);
        onIntervention?.(intervention);
      }
    } catch (err) {
      console.error('[ARIA Shield] Error sending chunk:', err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [sessionId, sessionType, sensitivityLevel, onIntervention, onError]);

  // Handle transcription message from Daily.co
  const handleTranscriptionMessage = useCallback((event: {
    fromId?: string;
    data?: {
      text?: string;
      session_id?: string;
      user_name?: string;
      is_final?: boolean;
      timestamp?: number;
    };
  }) => {
    // Only process transcription messages
    if (event.fromId !== 'transcription') return;

    const { text, session_id, user_name, is_final } = event.data || {};

    if (!text || !is_final) return; // Only process final transcripts

    console.log('[ARIA Shield] Transcript:', text, `(speaker: ${user_name || session_id})`);

    setLatestTranscript(text);

    // Build transcript chunk
    const chunk: TranscriptChunk = {
      sessionId,
      speakerId: session_id || userId,
      speakerName: user_name || userName,
      text,
      timestamp: new Date(),
      isFinal: true,
    };

    onTranscript?.(chunk);

    // Send to backend for ARIA analysis
    if (text.trim()) {
      sendTranscriptChunk(text.trim(), chunk.speakerId, chunk.speakerName);
    }
  }, [sessionId, userId, userName, sendTranscriptChunk, onTranscript]);

  // Handle transcription started event
  const handleTranscriptionStarted = useCallback(() => {
    console.log('[ARIA Shield] Transcription started');
    setIsTranscribing(true);
  }, []);

  // Handle transcription stopped event
  const handleTranscriptionStopped = useCallback(() => {
    console.log('[ARIA Shield] Transcription stopped');
    setIsTranscribing(false);
  }, []);

  // Handle transcription error
  const handleTranscriptionError = useCallback((event: { errorMsg?: string }) => {
    console.error('[ARIA Shield] Transcription error:', event.errorMsg);
    setIsTranscribing(false);
    onError?.(new Error(event.errorMsg || 'Transcription error'));
  }, [onError]);

  // Start ARIA monitoring with Daily.co transcription
  const startMonitoring = useCallback(async () => {
    const call = callRef.current;
    if (!call) {
      console.warn('[ARIA Shield] No call object available');
      return;
    }

    if (sensitivityLevel === 'off') {
      console.log('[ARIA Shield] Monitoring disabled (sensitivity: off)');
      return;
    }

    if (transcriptionStartedRef.current) {
      console.log('[ARIA Shield] Already monitoring');
      return;
    }

    try {
      console.log('[ARIA Shield] Starting monitoring with sensitivity:', sensitivityLevel);

      // Set up event listeners if not already done
      if (!eventHandlersSetRef.current) {
        call.on('transcription-message', handleTranscriptionMessage);
        call.on('transcription-started', handleTranscriptionStarted);
        call.on('transcription-stopped', handleTranscriptionStopped);
        call.on('transcription-error', handleTranscriptionError);
        eventHandlersSetRef.current = true;
      }

      // Start Daily.co transcription
      await call.startTranscription({
        language: 'en',
        model: 'nova-2', // Deepgram's latest model
        profanity_filter: false, // We want raw text for ARIA analysis
        punctuate: true,
        includeRawResponse: false,
      });

      transcriptionStartedRef.current = true;
      setIsMonitoring(true);
      startTimeRef.current = callStartTime || Date.now();

      console.log('[ARIA Shield] Monitoring started successfully');
    } catch (err) {
      console.error('[ARIA Shield] Failed to start monitoring:', err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [
    callRef,
    sensitivityLevel,
    callStartTime,
    handleTranscriptionMessage,
    handleTranscriptionStarted,
    handleTranscriptionStopped,
    handleTranscriptionError,
    onError,
  ]);

  // Stop ARIA monitoring
  const stopMonitoring = useCallback(() => {
    const call = callRef.current;

    if (!transcriptionStartedRef.current) {
      return;
    }

    try {
      console.log('[ARIA Shield] Stopping monitoring');

      if (call) {
        call.stopTranscription();

        // Remove event listeners
        call.off('transcription-message', handleTranscriptionMessage);
        call.off('transcription-started', handleTranscriptionStarted);
        call.off('transcription-stopped', handleTranscriptionStopped);
        call.off('transcription-error', handleTranscriptionError);
      }

      eventHandlersSetRef.current = false;
      transcriptionStartedRef.current = false;
      setIsMonitoring(false);
      setIsTranscribing(false);

      console.log('[ARIA Shield] Monitoring stopped');
    } catch (err) {
      console.error('[ARIA Shield] Error stopping monitoring:', err);
    }
  }, [
    callRef,
    handleTranscriptionMessage,
    handleTranscriptionStarted,
    handleTranscriptionStopped,
    handleTranscriptionError,
  ]);

  // Clear interventions
  const clearInterventions = useCallback(() => {
    setInterventions([]);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (transcriptionStartedRef.current) {
        stopMonitoring();
      }
    };
  }, [stopMonitoring]);

  return {
    isMonitoring,
    isTranscribing,
    startMonitoring,
    stopMonitoring,
    interventions,
    latestTranscript,
    clearInterventions,
  };
}

export default useARIASentimentShield;
