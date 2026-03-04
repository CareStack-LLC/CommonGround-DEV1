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
import LeftRight4UImpactBoard from './components/LeftRight4UImpactBoard';

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
    const [isStaff, setIsStaff] = useState(false);

    useEffect(() => {
        fetchDashboard();
    }, [partnerSlug]);

    async function fetchDashboard() {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('access_token');

            // 1. Try fetching protected dashboard data
            let res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/partners/${partnerSlug}/dashboard`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (res.ok) {
                const dashboardData = await res.json();
                setData(dashboardData);
                setIsStaff(true);
                setLoading(false);
                return;
            }

            // 2. Fallback to public impact metrics if unauthorized or not logged in
            res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/partners/${partnerSlug}/impact-metrics`,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!res.ok) {
                if (res.status === 404) {
                    setError('Partner not found');
                } else {
                    setError('Failed to load impact data');
                }
                return;
            }

            const publicData = await res.json();
            setData(publicData);
            setIsStaff(false);
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-cg-sage" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h1 className="text-xl font-semibold text-gray-900 mb-2">{error}</h1>
                <p className="text-gray-600 max-w-sm">
                    We couldn't retrieve the impact data for this partner. Please check the URL or try again later.
                </p>
            </div>
        );
    }

    if (!data) return null;

    const { partner, metrics } = data;

    // Route Left Right 4 U specifically to their highly tailored impact board
    if (partner.partner_slug.toLowerCase() === 'leftright4u') {
        return <LeftRight4UImpactBoard partner={partner} metrics={metrics} isStaff={isStaff} />;
    }

    // Default to generic ImpactBoard
    return <ImpactBoard partner={partner} metrics={metrics} isStaff={isStaff} />;
}
