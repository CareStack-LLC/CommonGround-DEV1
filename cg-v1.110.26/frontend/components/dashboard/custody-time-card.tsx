import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from 'date-fns';
import { smartAnalytics, CustodyTimeStats } from '@/lib/api';
import { Skeleton } from "@/components/ui/skeleton";

interface CustodyTimeCardProps {
    agreementId: string;
}

export function CustodyTimeCard({ agreementId }: CustodyTimeCardProps) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<CustodyTimeStats | null>(null);

    useEffect(() => {
        async function loadStats() {
            try {
                const today = new Date();
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

                const stats = await smartAnalytics.getCustodyTime(
                    agreementId,
                    format(startOfMonth, 'yyyy-MM-dd'),
                    format(endOfMonth, 'yyyy-MM-dd')
                );
                setData(stats);
            } catch (error) {
                console.error("Failed to load custody stats", error);
            } finally {
                setLoading(false);
            }
        }

        if (agreementId) {
            loadStats();
        }
    }, [agreementId]);

    if (loading) {
        return <Skeleton className="h-[200px] w-full rounded-xl" />;
    }

    if (!data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Custody Time</CardTitle>
                </CardHeader>
                <CardContent>No data available.</CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Custody Time (This Month)</CardTitle>
                <CardDescription>Scheduled vs. Actual Overnights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Scheduled Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                        <span>Scheduled</span>
                        <span className="text-muted-foreground">{data.scheduled.parent_a_percent}% / {data.scheduled.parent_b_percent}%</span>
                    </div>
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                            className="h-full bg-blue-500"
                            style={{ width: `${data.scheduled.parent_a_percent}%` }}
                        />
                        <div
                            className="h-full bg-purple-500"
                            style={{ width: `${data.scheduled.parent_b_percent}%` }}
                        />
                    </div>
                </div>

                {/* Actual Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                        <span>Actual (Verified)</span>
                        {/* Visual placeholder for actuals until we have real data */}
                        <span className="text-muted-foreground">-- / --</span>
                    </div>
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex opacity-50">
                        {/* Placeholder gray bar since ACTUAL logic isn't fully piped yet */}
                        <div className="h-full bg-slate-300 w-full" />
                    </div>
                    <p className="text-xs text-muted-foreground">Actuals pending verified exchanges.</p>
                </div>
            </CardContent>
        </Card>
    );
}
