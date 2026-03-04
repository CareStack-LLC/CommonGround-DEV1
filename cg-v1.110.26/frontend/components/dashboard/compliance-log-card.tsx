import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { smartAnalytics, ComplianceLogEntry } from '@/lib/api';
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

interface ComplianceLogCardProps {
    agreementId: string;
}

export function ComplianceLogCard({ agreementId }: ComplianceLogCardProps) {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<ComplianceLogEntry[]>([]);

    useEffect(() => {
        async function loadLogs() {
            try {
                const data = await smartAnalytics.getComplianceLogs(agreementId, 20); // Last 20 events
                setLogs(data);
            } catch (error) {
                console.error("Failed to load compliance logs", error);
            } finally {
                setLoading(false);
            }
        }

        if (agreementId) {
            loadLogs();
        }
    }, [agreementId]);

    if (loading) {
        return <Skeleton className="h-[300px] w-full rounded-xl" />;
    }

    if (logs.length === 0) {
        return (
            <Card className="h-[350px]">
                <CardHeader>
                    <CardTitle>Compliance Log</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
                    No events recorded yet.
                </CardContent>
            </Card>
        );
    }

    function getIcon(type: string, severity: string) {
        if (severity === 'violation') return <XCircle className="h-4 w-4 text-red-500" />;
        if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-orange-500" />;
        if (type === 'check_in') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        return <Info className="h-4 w-4 text-blue-500" />;
    }

    return (
        <Card className="h-[350px] flex flex-col">
            <CardHeader>
                <CardTitle>Compliance Log</CardTitle>
                <CardDescription>Verified Audit Trail</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full px-6 pb-4">
                    <div className="space-y-4">
                        {logs.map((log) => (
                            <div key={log.id} className="flex items-start space-x-3 pb-3 border-b last:border-0 last:pb-0">
                                <div className="mt-1">
                                    {getIcon(log.type, log.severity)}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                        {log.description}
                                        {log.is_verified && (
                                            <Badge variant="outline" className="ml-2 text-[10px] h-4 px-1 text-green-600 border-green-200">
                                                Verified
                                            </Badge>
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {format(new Date(log.timestamp), 'MMM d, h:mm a')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
