'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWebSocket } from '@/contexts/websocket-context';
import { useAuth } from '@/lib/auth-context';
import { Phone, Video, PhoneOff, User } from 'lucide-react';
import type { IncomingCallEvent } from '@/lib/websocket';

interface IncomingCall {
  session_id: string;
  caller_id: string;
  caller_name: string;
  call_type: 'video' | 'audio';
  family_file_id: string;
}

export function IncomingCallNotification() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { onIncomingCall, isConnected } = useWebSocket();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isRinging, setIsRinging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle incoming call event
  const handleIncomingCall = useCallback((data: IncomingCallEvent) => {
    console.log('[IncomingCall] Received:', data);
    setIncomingCall({
      session_id: data.session_id,
      caller_id: data.caller_id,
      caller_name: data.caller_name,
      call_type: data.call_type,
      family_file_id: data.family_file_id,
    });
    setIsRinging(true);

    // Auto-dismiss after 30 seconds if not answered
    timeoutRef.current = setTimeout(() => {
      setIncomingCall(null);
      setIsRinging(false);
    }, 30000);
  }, []);

  // Subscribe to incoming call events
  useEffect(() => {
    if (!isAuthenticated || !isConnected) return;

    const unsubscribe = onIncomingCall(handleIncomingCall);
    return () => unsubscribe();
  }, [isAuthenticated, isConnected, onIncomingCall, handleIncomingCall]);

  // Play ringtone when ringing
  useEffect(() => {
    if (isRinging) {
      // Create audio element for ringtone (using a simple tone)
      // In production, you'd use an actual ringtone audio file
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 440; // A4 note
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;

        oscillator.start();

        // Ring pattern: on for 1s, off for 0.5s
        const ringInterval = setInterval(() => {
          gainNode.gain.value = gainNode.gain.value === 0 ? 0.3 : 0;
        }, 1000);

        return () => {
          clearInterval(ringInterval);
          oscillator.stop();
          audioContext.close();
        };
      } catch (err) {
        console.log('Audio not available:', err);
      }
    }
  }, [isRinging]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleAccept = () => {
    if (!incomingCall) return;

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Navigate to call page
    router.push(`/messages/call?family_file_id=${incomingCall.family_file_id}&call_type=${incomingCall.call_type}&session_id=${incomingCall.session_id}`);

    setIncomingCall(null);
    setIsRinging(false);
  };

  const handleDecline = async () => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Notify the caller that the call was declined
    if (incomingCall) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        await fetch(`${apiUrl}/api/v1/parent-calls/${incomingCall.session_id}/decline`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        });
      } catch (err) {
        console.error('Failed to notify caller of decline:', err);
      }
    }

    setIncomingCall(null);
    setIsRinging(false);
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl border border-slate-700">
        {/* Caller Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#2C5F5D] to-[#2C5F5D]/70 flex items-center justify-center shadow-xl">
              <User className="h-12 w-12 text-white" />
            </div>
            {/* Pulsing ring animation */}
            <div className="absolute inset-0 rounded-full border-4 border-[#2C5F5D] animate-ping opacity-30" />
          </div>
        </div>

        {/* Call Info */}
        <div className="text-center mb-8">
          <h2 className="text-white text-2xl font-semibold mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
            {incomingCall.caller_name}
          </h2>
          <p className="text-slate-400 flex items-center justify-center gap-2">
            {incomingCall.call_type === 'video' ? (
              <>
                <Video className="h-4 w-4" />
                Incoming Video Call
              </>
            ) : (
              <>
                <Phone className="h-4 w-4" />
                Incoming Audio Call
              </>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-8">
          {/* Decline Button */}
          <button
            onClick={handleDecline}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 transition-all shadow-lg flex items-center justify-center"
            title="Decline"
          >
            <PhoneOff className="h-7 w-7 text-white" />
          </button>

          {/* Accept Button */}
          <button
            onClick={handleAccept}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 transition-all shadow-lg flex items-center justify-center animate-pulse"
            title="Accept"
          >
            {incomingCall.call_type === 'video' ? (
              <Video className="h-7 w-7 text-white" />
            ) : (
              <Phone className="h-7 w-7 text-white" />
            )}
          </button>
        </div>

        {/* Swipe hint for mobile */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Tap to answer or decline
        </p>
      </div>
    </div>
  );
}
