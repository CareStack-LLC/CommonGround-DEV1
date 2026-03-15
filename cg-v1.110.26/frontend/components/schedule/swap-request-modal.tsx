'use client';

import { useState, useEffect } from 'react';
import { X, ArrowLeftRight } from 'lucide-react';
import {
    eventsAPI,
    casesAPI,
    Child,
    SwapRequestCreate
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface SwapRequestModalProps {
    caseId: string;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function SwapRequestModal({
    caseId,
    onClose,
    onSuccess,
}: SwapRequestModalProps) {
    const [children, setChildren] = useState<Child[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState<SwapRequestCreate>({
        family_file_id: caseId, // caseId is usually family_file_id in this context
        target_date: '',
        child_ids: [],
        reason: '',
    });

    useEffect(() => {
        loadChildren();
    }, [caseId]);

    const loadChildren = async () => {
        try {
            const caseData = await casesAPI.get(caseId);
            setChildren(caseData.children || []);
        } catch (err: any) {
            console.error('Error loading children:', err);
            // We don't block the UI, just won't show children selection if failed
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // If there are children, require at least one to be selected
            if (children.length > 0 && formData.child_ids.length === 0) {
                throw new Error('Please select at least one child');
            }

            await eventsAPI.requestSwap(formData);
            onSuccess?.();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to submit swap request');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleChild = (childId: string) => {
        setFormData(prev => ({
            ...prev,
            child_ids: prev.child_ids.includes(childId)
                ? prev.child_ids.filter(id => id !== childId)
                : [...prev.child_ids, childId],
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border shadow-xl rounded-2xl">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <ArrowLeftRight className="h-5 w-5 text-[var(--portal-primary)]" />
                            Request Schedule Swap
                        </h2>
                        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="target_date">Target Date</Label>
                            <Input
                                id="target_date"
                                type="date"
                                value={formData.target_date}
                                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                                required
                                className="mt-1"
                                min={new Date().toISOString().split('T')[0]}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                The date you want to swap schedule for
                            </p>
                        </div>

                        {children.length > 0 && (
                            <div>
                                <Label>Children Involved</Label>
                                <div className="mt-2 space-y-2 border rounded-md p-3">
                                    {children.map((child) => (
                                        <div key={child.id} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id={`child_${child.id}`}
                                                checked={formData.child_ids.includes(child.id)}
                                                onChange={() => toggleChild(child.id)}
                                                className="rounded border-border text-[var(--portal-primary)] focus:ring-[var(--portal-primary)]"
                                            />
                                            <Label htmlFor={`child_${child.id}`} className="cursor-pointer font-normal">
                                                {child.first_name} {child.last_name}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <Label htmlFor="reason">Reason for Swap</Label>
                            <Input
                                id="reason"
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                required
                                placeholder="e.g., Work conflict, Special event"
                                className="mt-1"
                            />
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                            <Button type="button" onClick={onClose} variant="outline" className="sm:flex-shrink-0">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading} className="flex-1 bg-[var(--portal-primary)] hover:bg-[#2D6A8F]">
                                {isLoading ? 'Submitting...' : 'Submit Request'}
                            </Button>
                        </div>
                    </form>
                </div>
            </Card>
        </div>
    );
}
