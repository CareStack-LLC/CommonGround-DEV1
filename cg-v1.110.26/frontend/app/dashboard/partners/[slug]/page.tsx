'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Users,
    CheckCircle,
    MessageSquare,
    Shield,
    TrendingUp,
    Calendar,
    RefreshCw,
    Copy,
    Loader2,
    AlertCircle
} from 'lucide-react';

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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{partner.display_name}</h1>
                        <p className="text-sm text-gray-500">Partner Dashboard</p>
                    </div>
                    <Button variant="outline" onClick={fetchDashboard}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Codes Distributed</p>
                                    <p className="text-3xl font-bold text-gray-900">{metrics.codes_distributed}</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Users className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Activated</p>
                                    <p className="text-3xl font-bold text-green-600">{metrics.codes_activated}</p>
                                    <p className="text-xs text-gray-400">{metrics.activation_rate}% rate</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Messages Sent</p>
                                    <p className="text-3xl font-bold text-gray-900">{metrics.messages_sent}</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                                    <MessageSquare className="h-6 w-6 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">ARIA Interventions</p>
                                    <p className="text-3xl font-bold text-amber-600">{metrics.aria_interventions}</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                                    <Shield className="h-6 w-6 text-amber-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Grant Codes Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Grant Codes</CardTitle>
                            <CardDescription>
                                {partner.codes_remaining} codes remaining
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {grant_codes.map((code) => (
                                    <div
                                        key={code.code}
                                        className={`flex items-center justify-between p-3 rounded-lg ${code.is_activated
                                                ? 'bg-green-50 border border-green-200'
                                                : 'bg-gray-50 border border-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <code className="font-mono text-sm bg-white px-2 py-1 rounded border">
                                                {code.code}
                                            </code>
                                            {code.is_activated ? (
                                                <span className="text-xs text-green-600 flex items-center gap-1">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Activated
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-500">Available</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {code.anonymous_user_id && (
                                                <span className="text-xs text-gray-500 font-mono">
                                                    {code.anonymous_user_id}
                                                </span>
                                            )}
                                            {!code.is_activated && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => copyCode(code.code)}
                                                >
                                                    {copiedCode === code.code ? (
                                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <Copy className="h-4 w-4 text-gray-400" />
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active Users (Anonymized) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Users</CardTitle>
                            <CardDescription>
                                {active_users.length} users with activated codes
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {active_users.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                    <p>No activated users yet</p>
                                    <p className="text-sm">Users will appear here when they redeem codes</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {active_users.map((user) => (
                                        <div
                                            key={user.anonymous_user_id}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-cg-sage/20 flex items-center justify-center">
                                                    <span className="text-sm font-medium text-cg-sage">
                                                        {user.anonymous_user_id.slice(-2)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-mono text-sm">{user.anonymous_user_id}</p>
                                                    <p className="text-xs text-gray-500">
                                                        Activated {new Date(user.activated_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium">{user.message_count} messages</p>
                                                <p className="text-xs text-gray-500">
                                                    {user.is_active ? (
                                                        <span className="text-green-600">Active</span>
                                                    ) : (
                                                        <span className="text-gray-400">Inactive</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Impact Summary */}
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>Impact Summary</CardTitle>
                        <CardDescription>Your program's measurable impact</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="text-center p-6 bg-green-50 rounded-xl">
                                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                                <p className="text-3xl font-bold text-green-600">{metrics.activation_rate}%</p>
                                <p className="text-sm text-gray-600">Code Activation Rate</p>
                            </div>
                            <div className="text-center p-6 bg-purple-50 rounded-xl">
                                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                                <p className="text-3xl font-bold text-purple-600">{metrics.messages_sent}</p>
                                <p className="text-sm text-gray-600">Co-Parent Messages</p>
                            </div>
                            <div className="text-center p-6 bg-amber-50 rounded-xl">
                                <Shield className="h-8 w-8 mx-auto mb-2 text-amber-600" />
                                <p className="text-3xl font-bold text-amber-600">{metrics.aria_interventions}</p>
                                <p className="text-sm text-gray-600">Conflicts Prevented by ARIA</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
