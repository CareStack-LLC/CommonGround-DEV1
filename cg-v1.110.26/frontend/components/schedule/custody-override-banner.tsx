'use client';

import { useState, useEffect } from 'react';
import { Hand, CheckCircle, AlertTriangle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { familyFilesAPI } from '@/lib/api';
import { useWebSocket } from '@/contexts/websocket-context';
import type { CustodyOverrideEvent } from '@/lib/websocket';

interface CustodyOverrideBannerProps {
  /** Called when user wants to refresh dashboard/custody data after acknowledgment */
  onRefresh?: () => void;
}

/**
 * Banner shown when the co-parent claims "With Me" for a child.
 * Shows the claim with Acknowledge/Dispute buttons.
 * Listens for custody_override WebSocket events.
 */
export default function CustodyOverrideBanner({ onRefresh }: CustodyOverrideBannerProps) {
  const [overrideEvents, setOverrideEvents] = useState<CustodyOverrideEvent[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [disputeNotes, setDisputeNotes] = useState('');
  const [showDisputeInput, setShowDisputeInput] = useState<string | null>(null);

  const { onCustodyOverride } = useWebSocket();

  useEffect(() => {
    const unsub = onCustodyOverride((event: CustodyOverrideEvent) => {
      setOverrideEvents(prev => [...prev, event]);
    });
    return unsub;
  }, [onCustodyOverride]);

  const handleAcknowledge = async (event: CustodyOverrideEvent) => {
    const eventKey = `${event.family_file_id}-${event.timestamp}`;
    setProcessing(eventKey);

    try {
      await familyFilesAPI.acknowledgeCustodyOverride(
        event.family_file_id,
        event.child_ids,
        'acknowledged'
      );
      // Remove this event from the list
      setOverrideEvents(prev => prev.filter(e => `${e.family_file_id}-${e.timestamp}` !== `${event.family_file_id}-${event.timestamp}`));
      onRefresh?.();
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleDispute = async (event: CustodyOverrideEvent) => {
    const eventKey = `${event.family_file_id}-${event.timestamp}`;
    setProcessing(eventKey);

    try {
      await familyFilesAPI.acknowledgeCustodyOverride(
        event.family_file_id,
        event.child_ids,
        'disputed',
        disputeNotes || undefined
      );
      setOverrideEvents(prev => prev.filter(e => `${e.family_file_id}-${e.timestamp}` !== `${event.family_file_id}-${event.timestamp}`));
      setShowDisputeInput(null);
      setDisputeNotes('');
      onRefresh?.();
    } catch (err) {
      console.error('Failed to dispute:', err);
    } finally {
      setProcessing(null);
    }
  };

  const dismissEvent = (event: CustodyOverrideEvent) => {
    setOverrideEvents(prev => prev.filter(e => `${e.family_file_id}-${e.timestamp}` !== `${event.family_file_id}-${event.timestamp}`));
  };

  if (overrideEvents.length === 0) return null;

  return (
    <div className="space-y-2">
      {overrideEvents.map((event) => {
        const eventKey = `${event.family_file_id}-${event.timestamp}`;
        const isProcessing = processing === eventKey;
        const isDisputing = showDisputeInput === eventKey;

        return (
          <div
            key={eventKey}
            role="alert"
            className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 shadow-md animate-in slide-in-from-top duration-300"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                <Hand className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
                  {event.message}
                </p>
                {event.notes && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Note: {event.notes}
                  </p>
                )}
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  {new Date(event.timestamp).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>

                {/* Action Buttons */}
                {!isDisputing && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => handleAcknowledge(event)}
                      disabled={isProcessing}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Acknowledge
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setShowDisputeInput(eventKey)}
                      disabled={isProcessing}
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                      Dispute
                    </Button>
                  </div>
                )}

                {/* Dispute Input */}
                {isDisputing && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={disputeNotes}
                      onChange={(e) => setDisputeNotes(e.target.value)}
                      placeholder="Optional: Explain why you are disputing this claim..."
                      rows={2}
                      className="w-full px-3 py-2 border border-red-200 dark:border-red-700 rounded-md bg-background text-foreground placeholder:text-muted-foreground text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleDispute(event)}
                        disabled={isProcessing}
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          'Submit Dispute'
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowDisputeInput(null);
                          setDisputeNotes('');
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => dismissEvent(event)}
                className="text-amber-400 hover:text-amber-600 shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
