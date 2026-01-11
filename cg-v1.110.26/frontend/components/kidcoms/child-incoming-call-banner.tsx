'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, PhoneIncoming, X, Video, Loader2 } from 'lucide-react';
import { myCircleAPI, IncomingCall } from '@/lib/api';

interface ChildIncomingCallBannerProps {
  pollInterval?: number; // ms, default 3000
}

export function ChildIncomingCallBanner({
  pollInterval = 3000,
}: ChildIncomingCallBannerProps) {
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [dismissedSessionIds, setDismissedSessionIds] = useState<Set<string>>(new Set());

  const checkForIncomingCalls = useCallback(async () => {
    try {
      const token = localStorage.getItem('child_token');
      if (!token) return;

      const response = await myCircleAPI.getIncomingCallsForChild();

      // Find a call that hasn't been dismissed
      const availableCall = response.items.find(
        (call) => !dismissedSessionIds.has(call.session_id)
      );

      if (availableCall) {
        setIncomingCall(availableCall);
      } else {
        setIncomingCall(null);
      }
    } catch (error) {
      // Silently fail - user might not be authenticated
      console.debug('Error checking for incoming calls:', error);
    }
  }, [dismissedSessionIds]);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('child_token');
    if (!token) return;

    // Initial check
    checkForIncomingCalls();

    // Set up polling
    const interval = setInterval(checkForIncomingCalls, pollInterval);

    return () => clearInterval(interval);
  }, [checkForIncomingCalls, pollInterval]);

  const handleJoin = async () => {
    if (!incomingCall) return;

    setIsJoining(true);
    try {
      const joinData = await myCircleAPI.acceptIncomingCallAsChild(incomingCall.session_id);

      // Store session info for the call page
      localStorage.setItem('child_call_session', JSON.stringify({
        sessionId: joinData.session_id,
        roomUrl: joinData.room_url,
        token: joinData.token,
        participantName: joinData.participant_name,
        contactName: incomingCall.caller_name,
        callType: incomingCall.session_type === 'voice_call' ? 'voice' : 'video',
        isIncoming: true,
      }));

      setIncomingCall(null);
      router.push(`/my-circle/child/call?session=${joinData.session_id}`);
    } catch (error) {
      console.error('Error joining call:', error);
      setIsJoining(false);
    }
  };

  const handleReject = async () => {
    if (!incomingCall) return;

    setIsRejecting(true);
    try {
      await myCircleAPI.rejectIncomingCallAsChild(incomingCall.session_id);
      setDismissedSessionIds((prev) => new Set(prev).add(incomingCall.session_id));
      setIncomingCall(null);
    } catch (error) {
      console.error('Error rejecting call:', error);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDismiss = () => {
    if (incomingCall) {
      setDismissedSessionIds((prev) => new Set(prev).add(incomingCall.session_id));
      setIncomingCall(null);
    }
  };

  if (!incomingCall) {
    return null;
  }

  const callerName = incomingCall.caller_name || 'Someone';
  const isVideoCall = incomingCall.session_type === 'video_call';

  const CallIcon = isVideoCall ? Video : Phone;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95">
        {/* Animated calling indicator */}
        <div className="relative mx-auto w-28 h-28 mb-6">
          <div className="absolute inset-0 rounded-full bg-teal-100 animate-ping opacity-75" />
          <div className="absolute inset-0 rounded-full bg-emerald-200 animate-pulse" />
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg">
            <CallIcon className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Caller Info */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {callerName}
          </h2>
          <p className="text-lg text-gray-500">is calling you!</p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mt-2">
            <CallIcon className="h-4 w-4" />
            <span>{isVideoCall ? 'Video Call' : 'Voice Call'}</span>
          </div>
        </div>

        {/* Action Buttons - Kid-friendly large buttons */}
        <div className="grid grid-cols-2 gap-4">
          {/* Reject Button */}
          <button
            onClick={handleReject}
            disabled={isJoining || isRejecting}
            className="flex flex-col items-center gap-3 p-6 bg-red-100 hover:bg-red-200 rounded-2xl transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isRejecting ? (
              <Loader2 className="h-10 w-10 text-red-600 animate-spin" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-md">
                <X className="h-8 w-8 text-white" />
              </div>
            )}
            <span className="font-bold text-red-700 text-lg">Not Now</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={handleJoin}
            disabled={isJoining || isRejecting}
            className="flex flex-col items-center gap-3 p-6 bg-emerald-100 hover:bg-emerald-200 rounded-2xl transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isJoining ? (
              <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-md">
                <CallIcon className="h-8 w-8 text-white" />
              </div>
            )}
            <span className="font-bold text-emerald-700 text-lg">Answer!</span>
          </button>
        </div>

        {/* Fun message */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Someone wants to talk to you!
        </p>
      </div>
    </div>
  );
}

export default ChildIncomingCallBanner;
