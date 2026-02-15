"use client";

import { useState } from "react";
import { Lock, Unlock, AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FieldLockIndicatorProps {
    fieldPath: string;
    caseNumber?: string;
    isLocked: boolean;
    lockedAt?: string;
    unlockReason?: string;
    canUnlock?: boolean;
    onUnlock?: (reason: string) => void;
}

/**
 * FieldLockIndicator — displays a lock badge on court-order-locked fields.
 *
 * Per spec:
 * - Locked fields display: 🔒 Locked by Case-[case-number]
 * - Tooltip: "This field is set by court order. Contact your attorney to request changes."
 * - Professionals can unlock specific fields (requires confirmation + reason)
 */
export function FieldLockIndicator({
    fieldPath,
    caseNumber,
    isLocked,
    lockedAt,
    unlockReason,
    canUnlock = false,
    onUnlock,
}: FieldLockIndicatorProps) {
    const [showUnlockDialog, setShowUnlockDialog] = useState(false);
    const [reason, setReason] = useState("");
    const [confirming, setConfirming] = useState(false);

    const handleUnlock = () => {
        if (!reason.trim()) return;
        setConfirming(true);
        onUnlock?.(reason);
        setTimeout(() => {
            setShowUnlockDialog(false);
            setReason("");
            setConfirming(false);
        }, 300);
    };

    if (!isLocked) {
        // Show unlock history if previously unlocked
        if (unlockReason) {
            return (
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <Unlock className="h-3 w-3" />
                    <span>Unlocked: {unlockReason}</span>
                </div>
            );
        }
        return null;
    }

    return (
        <div className="relative inline-block">
            {/* Lock Badge */}
            <div className="group relative inline-flex items-center">
                <Badge
                    className="bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 
                     transition-colors cursor-default text-xs font-medium gap-1.5 py-1 px-2.5
                     shadow-sm"
                >
                    <Lock className="h-3 w-3 text-amber-600" />
                    <span>🔒 Locked by Case-{caseNumber || "unknown"}</span>
                </Badge>

                {/* Tooltip */}
                <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 
                      bg-slate-900 text-white text-xs rounded-lg p-3 shadow-xl 
                      opacity-0 group-hover:opacity-100 pointer-events-none 
                      transition-opacity duration-200 z-50"
                >
                    <div className="flex items-start gap-2">
                        <Info className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium mb-1">Court-Order Locked Field</p>
                            <p className="text-slate-300 leading-relaxed">
                                This field is set by court order. Contact your attorney to request changes.
                            </p>
                            {lockedAt && (
                                <p className="text-slate-400 mt-1.5 text-[10px]">
                                    Locked {new Date(lockedAt).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                </div>
            </div>

            {/* Professional Unlock Button */}
            {canUnlock && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-6 text-xs text-slate-500 hover:text-amber-700 hover:bg-amber-50 px-2"
                    onClick={() => setShowUnlockDialog(true)}
                >
                    <Unlock className="h-3 w-3 mr-1" />
                    Unlock
                </Button>
            )}

            {/* Unlock Dialog */}
            {showUnlockDialog && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Unlock Court-Ordered Field</h3>
                                <p className="text-xs text-muted-foreground">
                                    This action will be logged in the case timeline
                                </p>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-amber-800">
                                <strong>Field:</strong> {fieldPath.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            </p>
                            <p className="text-sm text-amber-800 mt-1">
                                <strong>Locked by:</strong> Case-{caseNumber || "unknown"}
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="text-sm font-medium text-slate-700 block mb-1.5">
                                Reason for unlocking <span className="text-red-500">*</span>
                            </label>
                            <Input
                                placeholder="e.g., New court order filed, superseding previous..."
                                value={reason}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
                                className="w-full"
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowUnlockDialog(false)}>
                                Cancel
                            </Button>
                            <Button
                                className="bg-amber-600 hover:bg-amber-700 text-white"
                                onClick={handleUnlock}
                                disabled={!reason.trim() || confirming}
                            >
                                <Unlock className="h-4 w-4 mr-2" />
                                Confirm Unlock
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---- FieldLockSummary: shows lock status for an agreement ----
interface FieldLockSummaryProps {
    locks: Array<{
        id: string;
        field_path: string;
        case_number: string;
        display: string;
        is_locked: boolean;
        locked_at: string | null;
        agreement_id: string;
        unlocked_at: string | null;
        unlock_reason: string | null;
    }>;
    onUnlock?: (lockId: string, reason: string) => void;
    canUnlock?: boolean;
}

export function FieldLockSummary({ locks, onUnlock, canUnlock = false }: FieldLockSummaryProps) {
    const activeLocks = locks.filter((l) => l.is_locked);
    const unlockedLocks = locks.filter((l) => !l.is_locked);

    if (locks.length === 0) return null;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-amber-600" />
                    Court-Order Locked Fields
                </h4>
                <Badge variant="outline" className="text-xs">
                    {activeLocks.length} active / {locks.length} total
                </Badge>
            </div>

            <div className="space-y-2">
                {activeLocks.map((lock) => (
                    <div
                        key={lock.id}
                        className="flex items-center justify-between px-3 py-2 bg-amber-50/60 border border-amber-100 rounded-lg"
                    >
                        <div className="flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-sm font-medium text-slate-700">
                                {lock.field_path.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            </span>
                            <span className="text-xs text-amber-600">Case-{lock.case_number}</span>
                        </div>
                        {canUnlock && onUnlock && (
                            <FieldLockIndicator
                                fieldPath={lock.field_path}
                                caseNumber={lock.case_number}
                                isLocked={true}
                                lockedAt={lock.locked_at || undefined}
                                canUnlock
                                onUnlock={(reason) => onUnlock(lock.id, reason)}
                            />
                        )}
                    </div>
                ))}

                {unlockedLocks.length > 0 && (
                    <details className="text-sm">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-slate-700">
                            {unlockedLocks.length} previously unlocked field{unlockedLocks.length !== 1 ? "s" : ""}
                        </summary>
                        <div className="mt-2 space-y-1 pl-2 border-l-2 border-slate-200">
                            {unlockedLocks.map((lock) => (
                                <div key={lock.id} className="text-xs text-slate-500 flex items-center gap-2">
                                    <Unlock className="h-3 w-3" />
                                    <span>{lock.field_path.replace(/_/g, " ")}</span>
                                    {lock.unlock_reason && <span className="text-muted-foreground">— {lock.unlock_reason}</span>}
                                </div>
                            ))}
                        </div>
                    </details>
                )}
            </div>
        </div>
    );
}
