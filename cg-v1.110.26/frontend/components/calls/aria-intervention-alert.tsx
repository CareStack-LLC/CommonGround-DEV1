'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, ShieldAlert, MicOff, PhoneOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ARIAInterventionEvent } from '@/lib/websocket';

interface ARIAInterventionAlertProps {
  intervention: ARIAInterventionEvent | null;
  onDismiss: () => void;
  onMuteApplied?: () => void;
  onTerminateCall?: () => void;
}

export function ARIAInterventionAlert({
  intervention,
  onDismiss,
  onMuteApplied,
  onTerminateCall,
}: ARIAInterventionAlertProps) {
  const [terminationCountdown, setTerminationCountdown] = useState<number | null>(null);
  const [muteCountdown, setMuteCountdown] = useState<number | null>(null);

  // Handle termination countdown
  useEffect(() => {
    if (!intervention) return;

    if (intervention.should_terminate && intervention.termination_delay) {
      setTerminationCountdown(intervention.termination_delay);

      const interval = setInterval(() => {
        setTerminationCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            onTerminateCall?.();
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [intervention, onTerminateCall]);

  // Handle mute countdown
  useEffect(() => {
    if (!intervention) return;

    if (intervention.should_mute && intervention.mute_duration_seconds) {
      setMuteCountdown(Math.ceil(intervention.mute_duration_seconds));
      onMuteApplied?.();

      const interval = setInterval(() => {
        setMuteCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [intervention, onMuteApplied]);

  // Auto-dismiss warnings after 8 seconds
  useEffect(() => {
    if (intervention?.intervention_type === 'warning') {
      const timeout = setTimeout(() => {
        onDismiss();
      }, 8000);
      return () => clearTimeout(timeout);
    }
  }, [intervention, onDismiss]);

  if (!intervention) return null;

  const isWarning = intervention.intervention_type === 'warning';
  const isMute = intervention.intervention_type === 'mute';
  const isTerminate = intervention.intervention_type === 'terminate';

  return (
    <div
      className={cn(
        'fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4',
        'animate-in slide-in-from-top-4 duration-300'
      )}
    >
      <div
        className={cn(
          'rounded-xl shadow-2xl border-2 p-4',
          isWarning && 'bg-amber-50 border-amber-400',
          isMute && 'bg-orange-50 border-orange-500',
          isTerminate && 'bg-red-50 border-red-600'
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'p-2 rounded-full',
              isWarning && 'bg-amber-100',
              isMute && 'bg-orange-100',
              isTerminate && 'bg-red-100'
            )}
          >
            {isWarning && <AlertTriangle className="w-6 h-6 text-amber-600" />}
            {isMute && <MicOff className="w-6 h-6 text-orange-600" />}
            {isTerminate && <PhoneOff className="w-6 h-6 text-red-600" />}
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3
                className={cn(
                  'font-semibold text-lg',
                  isWarning && 'text-amber-800',
                  isMute && 'text-orange-800',
                  isTerminate && 'text-red-800'
                )}
              >
                {isWarning && 'ARIA Warning'}
                {isMute && 'Speaker Muted'}
                {isTerminate && 'Call Terminating'}
              </h3>

              {isWarning && (
                <button
                  onClick={onDismiss}
                  className="p-1 rounded-full hover:bg-amber-200 transition-colors"
                >
                  <X className="w-4 h-4 text-amber-600" />
                </button>
              )}
            </div>

            <p
              className={cn(
                'mt-1 text-sm',
                isWarning && 'text-amber-700',
                isMute && 'text-orange-700',
                isTerminate && 'text-red-700'
              )}
            >
              {intervention.warning_message}
            </p>

            {/* Termination countdown */}
            {isTerminate && terminationCountdown !== null && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-red-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-red-600 h-full transition-all duration-1000 ease-linear"
                    style={{
                      width: `${(terminationCountdown / (intervention.termination_delay || 10)) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-red-800 font-bold text-lg">{terminationCountdown}s</span>
              </div>
            )}

            {/* Mute countdown */}
            {isMute && muteCountdown !== null && (
              <div className="mt-2 text-sm text-orange-600 font-medium">
                Unmuting in {muteCountdown} seconds...
              </div>
            )}
          </div>
        </div>

        {/* ARIA Guardian badge */}
        <div className="mt-3 pt-3 border-t border-current/10 flex items-center gap-2 text-xs opacity-70">
          <ShieldAlert className="w-3 h-3" />
          <span>ARIA Guardian - Protecting your conversation</span>
        </div>
      </div>
    </div>
  );
}

export default ARIAInterventionAlert;
