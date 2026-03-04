'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { DailyCall } from '@daily-co/daily-js';

/**
 * Client-side call recording hook
 *
 * Records audio/video from Daily.co call and uploads to backend when call ends.
 */

export interface UseCallRecordingOptions {
  callRef: React.MutableRefObject<DailyCall | null>;
  sessionId: string;
  familyFileId: string;
  onRecordingComplete?: (url: string) => void;
  onError?: (error: Error) => void;
}

export interface UseCallRecordingReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  recordingBlob: Blob | null;
}

export function useCallRecording({
  callRef,
  sessionId,
  familyFileId,
  onRecordingComplete,
  onError,
}: UseCallRecordingOptions): UseCallRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Start recording
  const startRecording = useCallback(async () => {
    const call = callRef.current;
    if (!call || isRecording) {
      console.warn('[Recording] Cannot start - no call or already recording');
      return;
    }

    try {
      const participants = call.participants();
      const local = participants.local;

      // Create AudioContext to mix all audio tracks
      audioContextRef.current = new AudioContext();
      destinationRef.current = audioContextRef.current.createMediaStreamDestination();

      let hasAnyAudio = false;

      // Add local audio
      const localAudioTrack = local?.tracks?.audio?.persistentTrack || local?.tracks?.audio?.track;
      if (localAudioTrack) {
        try {
          const localStream = new MediaStream([localAudioTrack]);
          const localSource = audioContextRef.current.createMediaStreamSource(localStream);
          localSource.connect(destinationRef.current);
          hasAnyAudio = true;
          console.log('[Recording] Local audio track added');
        } catch (e) {
          console.warn('[Recording] Failed to add local audio:', e);
        }
      }

      // Add remote audio
      Object.values(participants).forEach((participant: any) => {
        if (participant.local) return;

        const remoteAudioTrack = participant.tracks?.audio?.persistentTrack || participant.tracks?.audio?.track;
        if (remoteAudioTrack) {
          try {
            const remoteStream = new MediaStream([remoteAudioTrack]);
            const remoteSource = audioContextRef.current!.createMediaStreamSource(remoteStream);
            remoteSource.connect(destinationRef.current!);
            hasAnyAudio = true;
            console.log('[Recording] Remote audio track added:', participant.user_name);
          } catch (e) {
            console.warn('[Recording] Failed to add remote audio:', e);
          }
        }
      });

      if (!hasAnyAudio) {
        console.warn('[Recording] No audio tracks available');
        return;
      }

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      mediaRecorderRef.current = new MediaRecorder(destinationRef.current.stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordingBlob(blob);
        console.log('[Recording] Recording stopped, blob size:', blob.size);
      };

      // Start recording with timeslice for periodic data
      mediaRecorderRef.current.start(10000); // Get data every 10 seconds
      setIsRecording(true);
      console.log('[Recording] Recording started');

    } catch (err) {
      console.error('[Recording] Failed to start recording:', err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [callRef, isRecording, onError]);

  // Stop recording and upload
  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!mediaRecorderRef.current || !isRecording) {
      console.warn('[Recording] Cannot stop - not recording');
      return null;
    }

    return new Promise((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordingBlob(blob);
        setIsRecording(false);

        console.log('[Recording] Recording stopped, uploading...', blob.size, 'bytes');

        // Clean up audio context
        if (audioContextRef.current?.state !== 'closed') {
          audioContextRef.current?.close();
        }
        audioContextRef.current = null;
        destinationRef.current = null;
        mediaRecorderRef.current = null;

        // Upload recording
        if (blob.size > 1000) {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const formData = new FormData();
            formData.append('recording', blob, `call-${sessionId}.webm`);

            const response = await fetch(
              `${apiUrl}/api/v1/parent-calls/${sessionId}/upload-recording`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                },
                body: formData,
              }
            );

            if (!response.ok) {
              const errorText = await response.text();
              console.error('[Recording] Upload failed:', errorText);
              onError?.(new Error(`Upload failed: ${errorText}`));
              resolve(null);
              return;
            }

            const result = await response.json();
            console.log('[Recording] Upload complete:', result.recording_url);
            onRecordingComplete?.(result.recording_url);
            resolve(result.recording_url);
          } catch (err) {
            console.error('[Recording] Upload error:', err);
            onError?.(err instanceof Error ? err : new Error(String(err)));
            resolve(null);
          }
        } else {
          console.log('[Recording] Recording too small to upload');
          resolve(null);
        }
      };

      mediaRecorderRef.current!.stop();
    });
  }, [isRecording, sessionId, onRecordingComplete, onError]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    recordingBlob,
  };
}

export default useCallRecording;
