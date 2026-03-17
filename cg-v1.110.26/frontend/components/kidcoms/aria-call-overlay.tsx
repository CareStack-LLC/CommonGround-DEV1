'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  MicOff,
  VideoOff,
  XOctagon,
  CheckCircle,
  Shield,
} from 'lucide-react';
import type { AriaInterventionData } from './video-call';

interface AriaCallOverlayProps {
  sessionId: string;
  callType: 'parent' | 'circle';
  intervention: AriaInterventionData | null;
  onAcknowledge: (flagId: string) => Promise<void>;
  onCallTerminated?: () => void;
}

type AriaStatus = 'monitoring' | 'warning' | 'muted' | 'terminating';

export default function AriaCallOverlay({
  sessionId,
  callType,
  intervention,
  onAcknowledge,
  onCallTerminated,
}: AriaCallOverlayProps) {
  const [status, setStatus] = useState<AriaStatus>('monitoring');
  const [showWarningBanner, setShowWarningBanner] = useState(false);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [showTerminationOverlay, setShowTerminationOverlay] = useState(false);
  const [terminationCountdown, setTerminationCountdown] = useState(10);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [currentIntervention, setCurrentIntervention] = useState<AriaInterventionData | null>(null);

  // Handle new interventions
  useEffect(() => {
    if (!intervention) return;

    setCurrentIntervention(intervention);

    if (intervention.should_terminate) {
      setStatus('terminating');
      setShowTerminationOverlay(true);
      setTerminationCountdown(10);
    } else if (intervention.requires_acknowledgment) {
      setStatus('muted');
      setShowMuteModal(true);
      setShowWarningBanner(false);
    } else {
      setStatus('warning');
      setShowWarningBanner(true);
      // Auto-dismiss warning after 8 seconds
      const timer = setTimeout(() => {
        setShowWarningBanner(false);
        setStatus('monitoring');
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [intervention]);

  // Termination countdown
  useEffect(() => {
    if (!showTerminationOverlay) return;

    if (terminationCountdown <= 0) {
      onCallTerminated?.();
      return;
    }

    const timer = setTimeout(() => {
      setTerminationCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [showTerminationOverlay, terminationCountdown, onCallTerminated]);

  const handleAcknowledge = useCallback(async () => {
    if (!currentIntervention || isAcknowledging) return;

    setIsAcknowledging(true);
    try {
      await onAcknowledge(currentIntervention.flag_id);
      setShowMuteModal(false);
      setStatus('monitoring');
      setCurrentIntervention(null);
    } catch (err) {
      console.error('Failed to acknowledge violation:', err);
    } finally {
      setIsAcknowledging(false);
    }
  }, [currentIntervention, isAcknowledging, onAcknowledge]);

  return (
    <>
      {/* ARIA Status Indicator - always visible in call controls area */}
      <AriaStatusDot status={status} />

      {/* Warning Banner - slides down from top */}
      {showWarningBanner && currentIntervention && (
        <div className="absolute top-0 left-0 right-0 z-40 animate-slide-down">
          <div className="mx-4 mt-4 bg-amber-500/95 backdrop-blur-sm text-white rounded-xl p-4 shadow-2xl shadow-amber-500/25 border border-amber-400/50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-sm">ARIA Warning</p>
                <p className="text-sm text-amber-50 mt-1">
                  {currentIntervention.message}
                </p>
                {currentIntervention.strike_number > 0 && (
                  <p className="text-xs text-amber-100 mt-1">
                    Strike {currentIntervention.strike_number}/3
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowWarningBanner(false);
                  setStatus('monitoring');
                }}
                className="text-amber-100 hover:text-white p-1"
              >
                <span className="sr-only">Dismiss</span>
                &times;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mute Acknowledgment Modal - blocks interaction */}
      {showMuteModal && currentIntervention && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mx-6 max-w-md w-full bg-slate-900 rounded-2xl p-6 shadow-2xl border border-red-500/30">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                {currentIntervention.violation_source === 'video' ? (
                  <VideoOff className="h-8 w-8 text-red-400" />
                ) : (
                  <MicOff className="h-8 w-8 text-red-400" />
                )}
              </div>

              <h3 className="text-lg font-bold text-white mb-2">
                {currentIntervention.violation_source === 'video'
                  ? 'Video Blocked by ARIA'
                  : 'Microphone Muted by ARIA'}
              </h3>

              <p className="text-slate-300 text-sm mb-4">
                {currentIntervention.message}
              </p>

              <div className="bg-slate-800 rounded-lg p-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Severity</span>
                  <span className={`font-medium ${
                    currentIntervention.severity === 'severe' ? 'text-red-400' :
                    currentIntervention.severity === 'high' ? 'text-orange-400' :
                    'text-amber-400'
                  }`}>
                    {currentIntervention.severity.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-slate-400">Strike</span>
                  <span className="text-white font-medium">
                    {currentIntervention.strike_number}/3
                  </span>
                </div>
              </div>

              <button
                onClick={handleAcknowledge}
                disabled={isAcknowledging}
                className="w-full py-3 px-6 bg-cg-sage hover:bg-cg-sage/90 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAcknowledging ? 'Acknowledging...' : 'I Understand - Unmute Me'}
              </button>

              {currentIntervention.strike_number >= 2 && (
                <p className="text-red-400 text-xs mt-3">
                  One more violation will terminate this call.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Termination Overlay */}
      {showTerminationOverlay && currentIntervention && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-900/80 backdrop-blur-sm">
          <div className="mx-6 max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/30 flex items-center justify-center mx-auto mb-6 animate-pulse">
              <XOctagon className="h-10 w-10 text-red-300" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">
              Call Being Terminated
            </h2>

            <p className="text-red-200 text-sm mb-6">
              {currentIntervention.message}
            </p>

            <div className="text-6xl font-bold text-white mb-4 font-mono">
              {terminationCountdown}
            </div>

            <p className="text-red-300 text-xs">
              This incident has been logged and will be included in the call report.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// ARIA Status Dot - shows monitoring state in call controls
function AriaStatusDot({ status }: { status: AriaStatus }) {
  const statusConfig = {
    monitoring: {
      color: 'bg-green-500',
      pulse: false,
      label: 'ARIA Monitoring',
      icon: Shield,
    },
    warning: {
      color: 'bg-amber-500',
      pulse: true,
      label: 'ARIA Warning',
      icon: AlertTriangle,
    },
    muted: {
      color: 'bg-red-500',
      pulse: true,
      label: 'ARIA Muted',
      icon: ShieldAlert,
    },
    terminating: {
      color: 'bg-red-600',
      pulse: true,
      label: 'Terminating',
      icon: XOctagon,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
      <div className="relative">
        <div className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
        {config.pulse && (
          <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${config.color} animate-ping`} />
        )}
      </div>
      <span className="text-xs text-slate-300 font-medium">{config.label}</span>
    </div>
  );
}
