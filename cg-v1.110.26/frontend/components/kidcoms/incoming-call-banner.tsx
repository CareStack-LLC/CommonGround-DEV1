'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, PhoneIncoming, X, Video, User } from 'lucide-react';
import { kidcomsAPI, KidComsSession } from '@/lib/api';

interface IncomingCallBannerProps {
  familyFileId: string;
  pollInterval?: number; // ms, default 5000
}

export function IncomingCallBanner({
  familyFileId,
  pollInterval = 5000,
}: IncomingCallBannerProps) {
  const router = useRouter();
  const [incomingSession, setIncomingSession] = useState<KidComsSession | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [dismissedSessionIds, setDismissedSessionIds] = useState<Set<string>>(new Set());

  const checkForIncomingCalls = useCallback(async () => {
    try {
      const response = await kidcomsAPI.getActiveSessions(familyFileId);

      // Find a session that hasn't been dismissed
      const availableSession = response.items.find(
        (session) => !dismissedSessionIds.has(session.id)
      );

      if (availableSession && !isDismissed) {
        setIncomingSession(availableSession);
      } else if (!availableSession) {
        setIncomingSession(null);
      }
    } catch (error) {
      // Silently fail - user might not be authenticated or endpoint unavailable
      console.debug('Error checking for incoming calls:', error);
    }
  }, [familyFileId, dismissedSessionIds, isDismissed]);

  useEffect(() => {
    // Initial check
    checkForIncomingCalls();

    // Set up polling
    const interval = setInterval(checkForIncomingCalls, pollInterval);

    return () => clearInterval(interval);
  }, [checkForIncomingCalls, pollInterval]);

  const handleJoin = () => {
    if (incomingSession) {
      router.push(`/family-files/${familyFileId}/kidcoms/session/${incomingSession.id}`);
    }
  };

  const handleDismiss = () => {
    if (incomingSession) {
      setDismissedSessionIds((prev) => new Set(prev).add(incomingSession.id));
      setIncomingSession(null);
    }
  };

  if (!incomingSession) {
    return null;
  }

  // Get caller info from participants
  const caller = incomingSession.participants?.find(
    (p) => p.id === incomingSession.initiated_by_id
  );
  const callerName = caller?.name || 'Someone';

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 max-w-sm relative overflow-hidden">
        {/* Subtle accent gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-cg-sage/5 to-transparent pointer-events-none" />

        {/* Pulsing ring effect */}
        <div className="absolute -inset-1 bg-cg-sage/20 rounded-2xl opacity-50 animate-pulse" />

        <div className="relative flex items-start gap-4">
          {/* Animated phone icon */}
          <div className="flex-shrink-0">
            <div className="w-14 h-14 bg-cg-sage-subtle rounded-full flex items-center justify-center animate-bounce shadow-md">
              <PhoneIncoming className="h-7 w-7 text-cg-sage" />
            </div>
          </div>

          {/* Call info */}
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-semibold text-lg">Incoming Video Call</p>
            <p className="text-muted-foreground text-sm flex items-center mt-1">
              <User className="h-4 w-4 mr-1.5" />
              {callerName} is calling...
            </p>
            {incomingSession.title && (
              <p className="text-muted-foreground/70 text-xs mt-1 truncate">
                {incomingSession.title}
              </p>
            )}
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="relative mt-5 flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-medium transition-all flex items-center justify-center"
          >
            <Phone className="h-4 w-4 mr-2 rotate-[135deg]" />
            Decline
          </button>
          <button
            onClick={handleJoin}
            className="flex-1 px-4 py-2.5 bg-cg-success hover:bg-cg-success/90 text-white rounded-xl font-medium transition-all flex items-center justify-center shadow-md"
          >
            <Video className="h-4 w-4 mr-2" />
            Join Call
          </button>
        </div>

        {/* Session type indicator */}
        <div className="relative mt-3 flex items-center justify-center">
          <span className="text-muted-foreground text-xs capitalize">
            {incomingSession.session_type.replace('_', ' ')} session
          </span>
        </div>
      </div>
    </div>
  );
}

export default IncomingCallBanner;
