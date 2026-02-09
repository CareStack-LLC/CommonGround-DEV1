'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
import {
    Loader2,
    AlertCircle
} from 'lucide-react';

import ImpactBoard from './components/ImpactBoard';

interface PartnerMetrics {
    codes_distributed: number;
    codes_activated: number;
    activation_rate: number;
    active_users: number;
    messages_sent: number;
    aria_interventions: number;
    schedules_created: number;
    conflict_reduction_pct: number | null;
}

interface AnonymousUser {
    anonymous_user_id: string;
    activated_at: string;
    last_active: string | null;
    message_count: number;
    is_active: boolean;
}

interface GrantCodeStatus {
    code: string;
    is_activated: boolean;
    distributed_date: string | null;
    activated_date: string | null;
    anonymous_user_id: string | null;
}

interface DashboardData {
    partner: {
        partner_slug: string;
        display_name: string;
        codes_remaining: number;
    };
    metrics: PartnerMetrics;
    active_users: AnonymousUser[];
    grant_codes: GrantCodeStatus[];
    period_start: string;
    period_end: string;
}

export default function PartnerDashboardPage() {
    const params = useParams();
    const partnerSlug = params.slug as string;

    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    useEffect(() => {
        fetchDashboard();
    }, [partnerSlug]);

    async function fetchDashboard() {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/partners/${partnerSlug}/dashboard`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (res.status === 403) {
                setError('You do not have access to this dashboard');
                return;
            }

            if (!res.ok) {
                setError('Failed to load dashboard');
                return;
            }

            const dashboardData = await res.json();
            setData(dashboardData);
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    }

    const copyCode = async (code: string) => {
        await navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-cg-sage" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600">{error}</p>
            </div>
        );
    }

    if (!data) return null;

    const { partner, metrics, active_users, grant_codes } = data;

    // Use ImpactBoard for all partners (as per user request "overhaul this dashboard")
    // or specifically check for Forever Forward if we wanted to be cautious.
    // Given the prompt "overhaul this dashboard... into something like an ImpactBoard",
    // we will default to the new view.
    return <ImpactBoard partner={partner} metrics={metrics} />;

}
