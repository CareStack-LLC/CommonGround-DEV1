import React, { useEffect, useState } from 'react';
import { format, formatDistance, parseISO } from 'date-fns';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { custodyTimeAPI, CustodySession, RealTimeComplianceStats } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface CustodyTimelineProps {
    childId: string;
    className?: string;
}

export function CustodyTimeline({ childId, className }: CustodyTimelineProps) {
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<CustodySession[]>([]);
    const [stats, setStats] = useState<RealTimeComplianceStats | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Auto-refresh the "current session" timer every minute
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        loadTimeline();
    }, [childId]);

    const loadTimeline = async () => {
        try {
            setLoading(true);
            const data = await custodyTimeAPI.getTimeline(childId, 30);
            setSessions(data.sessions);
            setStats(data.stats);
        } catch (err) {
            console.error('Failed to load custody timeline', err);
            setError('Could not load custody data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <CustodyTimelineSkeleton />;
    }

    if (error || !stats) {
        return (
            <Card className={className}>
                <CardContent className="p-6 text-center text-muted-foreground">
                    <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>Unable to load custody timeline.</p>
                </CardContent>
            </Card>
        );
    }

    const currentSession = sessions.find(s => s.is_current);
    const activeParentId = currentSession?.parent_id;

    // Determine if active parent is Parent A or B for display
    const isParentAActive = activeParentId === stats.parent_a.user_id;
    const activeParentName = isParentAActive ? 'Parent A' : 'Parent B'; // Ideally fetch names

    // Calculate current duration for live timer
    let currentDurationText = '';
    if (currentSession) {
        const start = parseISO(currentSession.start_time);
        const diffMinutes = (now.getTime() - start.getTime()) / (1000 * 60);
        const days = (diffMinutes / (60 * 24)).toFixed(1);
        currentDurationText = `${days} days`;
    }

    return (
        <Card className={className}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-serif">Real-Time Custody</CardTitle>
                    <Badge variant={currentSession ? "default" : "secondary"} className="animate-pulse">
                        {currentSession ? 'Tracking' : 'OFFLINE'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Live Timer Status */}
                {currentSession && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex items-center space-x-4">
                        <div className="bg-white p-2 rounded-full shadow-sm">
                            <Clock className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Current Custody Status</p>
                            <h3 className="text-xl font-bold text-slate-900">
                                {activeParentName}
                                <span className="ml-2 text-indigo-600 font-mono">{currentDurationText}</span>
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                                Started {format(parseISO(currentSession.start_time), 'MMM d')}
                            </p>
                        </div>
                    </div>
                )}

                {/* Compliance Meter */}
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Parent A</span>
                            <div className="flex items-baseline space-x-2">
                                <span className="text-2xl font-bold text-slate-900">{stats.parent_a.percentage}%</span>
                                <span className={`text-xs font-medium ${stats.parent_a.variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {stats.parent_a.variance > 0 ? '+' : ''}{stats.parent_a.variance}%
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1 text-right">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Parent B</span>
                            <div className="flex items-baseline space-x-2 justify-end">
                                <span className={`text-xs font-medium ${stats.parent_b.variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {stats.parent_b.variance > 0 ? '+' : ''}{stats.parent_b.variance}%
                                </span>
                                <span className="text-2xl font-bold text-slate-900">{stats.parent_b.percentage}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                            className="bg-indigo-500 h-full transition-all duration-1000 ease-out"
                            style={{ width: `${stats.parent_a.percentage}%` }}
                        />
                        <div
                            className="bg-sky-400 h-full transition-all duration-1000 ease-out"
                            style={{ width: `${stats.parent_b.percentage}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 px-1">
                        <span>Target: {stats.parent_a.agreed_percentage}%</span>
                        <span>Target: {stats.parent_b.agreed_percentage}%</span>
                    </div>
                </div>

                {/* Recent Sessions List */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h4 className="text-sm font-medium text-slate-900">Recent Sessions</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {[...sessions].reverse().slice(0, 5).map((session, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 rounded">
                                <div className="flex items-center space-x-2">
                                    <div className={`w-2 h-2 rounded-full ${session.parent_id === stats.parent_a.user_id ? 'bg-indigo-500' : 'bg-sky-400'}`} />
                                    <span className="font-medium text-slate-700">
                                        {session.parent_id === stats.parent_a.user_id ? 'Parent A' : 'Parent B'}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <div className="text-slate-900 font-medium">
                                        {(session.duration_minutes / (60 * 24)).toFixed(1)} days
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        {format(parseISO(session.end_time), 'MMM d')}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function CustodyTimelineSkeleton() {
    return (
        <Card>
            <CardHeader className="pb-2">
                <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-6">
                <Skeleton className="h-24 w-full rounded-lg" />
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full rounded-full" />
                </div>
            </CardContent>
        </Card>
    );
}
