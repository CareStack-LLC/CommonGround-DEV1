'use client';

import { useState } from 'react';
import { Video, Phone, X, Loader2 } from 'lucide-react';
import { IncomingCall, myCircleAPI } from '@/lib/api';

interface IncomingCallAlertProps {
  call: IncomingCall;
  userType: 'child' | 'circle';
  onAccept: (joinData: { roomUrl: string; token: string; sessionId: string }) => void;
  onReject: () => void;
  onDismiss: () => void;
}

export default function IncomingCallAlert({
  call,
  userType,
  onAccept,
  onReject,
  onDismiss,
}: IncomingCallAlertProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  async function handleAccept() {
    setIsAccepting(true);
    try {
      let response;
      if (userType === 'child') {
        response = await myCircleAPI.acceptIncomingCallAsChild(call.session_id);
      } else {
        response = await myCircleAPI.acceptIncomingCallAsCircle(call.session_id);
      }

      onAccept({
        roomUrl: response.room_url,
        token: response.token,
        sessionId: response.session_id,
      });
    } catch (err) {
      console.error('Failed to accept call:', err);
      setIsAccepting(false);
    }
  }

  async function handleReject() {
    setIsRejecting(true);
    try {
      if (userType === 'child') {
        await myCircleAPI.rejectIncomingCallAsChild(call.session_id);
      }
      onReject();
    } catch (err) {
      console.error('Failed to reject call:', err);
      setIsRejecting(false);
    }
  }

  const isVideoCall = call.session_type === 'video_call';
  const CallIcon = isVideoCall ? Video : Phone;

  // Calculate time since ringing
  const ringingSince = call.started_ringing_at
    ? Math.floor((Date.now() - new Date(call.started_ringing_at).getTime()) / 1000)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Caller Info */}
        <div className="text-center mb-8">
          {/* Animated ring indicator */}
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-75" />
            <div className="absolute inset-0 rounded-full bg-green-200 animate-pulse" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
              <CallIcon className="h-10 w-10 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-1">Incoming Call</h2>
          <p className="text-lg text-gray-600 mb-2">
            {call.caller_name}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <CallIcon className="h-4 w-4" />
            <span>{isVideoCall ? 'Video Call' : 'Voice Call'}</span>
          </div>
          {ringingSince > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Calling for {ringingSince}s...
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          {/* Reject Button */}
          <button
            onClick={handleReject}
            disabled={isAccepting || isRejecting}
            className="flex flex-col items-center gap-2 p-4 bg-red-100 hover:bg-red-200 rounded-2xl transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isRejecting ? (
              <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-md">
                <Phone className="h-6 w-6 text-white rotate-[135deg]" />
              </div>
            )}
            <span className="font-semibold text-red-700">Decline</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={handleAccept}
            disabled={isAccepting || isRejecting}
            className="flex flex-col items-center gap-2 p-4 bg-green-100 hover:bg-green-200 rounded-2xl transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isAccepting ? (
              <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                <CallIcon className="h-6 w-6 text-white" />
              </div>
            )}
            <span className="font-semibold text-green-700">Accept</span>
          </button>
        </div>

        {/* Info text */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Call will end automatically if not answered
        </p>
      </div>
    </div>
  );
}
