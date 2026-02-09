'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Loader2,
    AlertCircle,
    ArrowLeft,
    Users,
    CheckCircle,
    Copy,
    RefreshCw,
    Shield,
    Calendar,
    Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

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
    active_users: AnonymousUser[];
    grant_codes: GrantCodeStatus[];
}

export default function GrantCodeManagementPage() {
    const params = useParams();
    const router = useRouter();
    const partnerSlug = params.slug as string;

    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, [partnerSlug]);

    async function fetchData() {
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
                setError('Authentication required');
                // Redirect to login if needed, or show error
                return;
            }

            if (!res.ok) {
                setError('Failed to load code data');
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
            <div className="min-h-screen flex items-center justify-center bg-gray-950">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h1 className="text-xl font-semibold text-white mb-2">Access Restricted</h1>
                <p className="text-gray-400 mb-6">{error || 'Partner admin authentication required.'}</p>
                <Link href={`/dashboard/partners/${partnerSlug}`}>
                    <Button variant="outline" className="border-gray-800 text-gray-400 hover:text-white">
                        Return to Impact Board
                    </Button>
                </Link>
            </div>
        );
    }

    const filteredCodes = data.grant_codes.filter(c =>
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.anonymous_user_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans">
            <div className="max-w-7xl mx-auto px-6 py-12">
                {/* Navigation Header */}
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-6">
                        <Link href={`/dashboard/partners/${partnerSlug}`}>
                            <button className="h-12 w-12 rounded-full border border-gray-800 flex items-center justify-center hover:bg-gray-900 transition-colors">
                                <ArrowLeft className="h-5 w-5 text-gray-400" />
                            </button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">{data.partner.display_name}</h1>
                            <p className="text-gray-500 font-medium tracking-wide uppercase text-xs mt-1">
                                Grant Code Management Portal
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        onClick={fetchData}
                        className="border-gray-800 text-gray-400 hover:text-white bg-transparent"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Data
                    </Button>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Grant Codes Inventory */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="bg-gray-900 border-gray-800">
                            <CardHeader className="border-b border-gray-800/50 pb-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl text-white">Active Grant Codes</CardTitle>
                                        <CardDescription className="text-gray-500">
                                            {data.partner.codes_remaining} codes remaining in allocation
                                        </CardDescription>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="Search code or user..."
                                            className="bg-gray-800 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-amber-500/50 outline-none w-64"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    {filteredCodes.map((code) => (
                                        <div
                                            key={code.code}
                                            className={`group flex items-center justify-between p-4 rounded-xl border transition-all ${code.is_activated
                                                    ? 'bg-amber-500/5 border-amber-500/10'
                                                    : 'bg-gray-800/30 border-gray-800 hover:border-gray-700'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${code.is_activated ? 'bg-amber-500/20 text-amber-500' : 'bg-gray-700/50 text-gray-500'
                                                    }`}>
                                                    <Shield className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-sm font-mono font-bold tracking-tight text-white uppercase">
                                                            {code.code}
                                                        </code>
                                                        {code.is_activated ? (
                                                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                                Activated
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                                Unused
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 mt-1">
                                                        {code.is_activated
                                                            ? `Used by ${code.anonymous_user_id} on ${new Date(code.activated_date!).toLocaleDateString()}`
                                                            : `Created ${new Date(code.distributed_date!).toLocaleDateString()}`
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!code.is_activated && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => copyCode(code.code)}
                                                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        {copiedCode === code.code ? (
                                                            <CheckCircle className="h-4 w-4 text-amber-500" />
                                                        ) : (
                                                            <Copy className="h-4 w-4 text-gray-500" />
                                                        )}
                                                    </Button>
                                                )}
                                                <div className="h-8 px-3 rounded bg-gray-800 border border-gray-700 flex items-center text-[10px] text-gray-400 font-mono">
                                                    Complete Tier
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Active User Feed */}
                    <div className="space-y-6">
                        <Card className="bg-gray-900 border-gray-800">
                            <CardHeader>
                                <CardTitle className="text-xl text-white">Anonymized Activity</CardTitle>
                                <CardDescription className="text-gray-500">
                                    Current health of your grant recipients
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {data.active_users.length === 0 ? (
                                        <div className="text-center py-12 border border-dashed border-gray-800 rounded-2xl">
                                            <Users className="h-10 w-10 mx-auto mb-4 text-gray-700" />
                                            <p className="text-gray-500 text-sm">No activations yet</p>
                                        </div>
                                    ) : (
                                        data.active_users.map((user) => (
                                            <div key={user.anonymous_user_id} className="p-4 rounded-2xl bg-gray-800/50 border border-gray-800">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                                            <span className="text-xs font-bold text-amber-500">
                                                                {user.anonymous_user_id.slice(-2)}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-mono text-white">{user.anonymous_user_id}</p>
                                                            <p className="text-[10px] text-gray-500">Joined {new Date(user.activated_at).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className={`h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-600'}`} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Messages</p>
                                                        <p className="text-sm font-bold text-white">{user.message_count}</p>
                                                    </div>
                                                    <div className="bg-black/20 rounded-lg p-2 border border-white/5">
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Health Status</p>
                                                        <p className="text-sm font-bold text-amber-500">Normal</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20">
                            <h4 className="flex items-center gap-2 text-amber-500 font-bold text-sm mb-2">
                                <Lock className="h-4 w-4" />
                                Privacy First
                            </h4>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                You are viewing anonymized IDs for family safety. Real names and contact info remain encrypted and inaccessible to partner organizations.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
