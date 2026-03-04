'use client';

import Link from 'next/link';
import {
    Shield,
    TrendingDown,
    MessageSquare,
    Share2,
    Users,
    Calendar,
    ArrowUpRight,
    Heart,
    Zap,
    Lock,
    Settings,
    Sparkles,
    HeartPulse,
    ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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

interface ImpactBoardProps {
    partner: {
        partner_slug: string;
        display_name: string;
        codes_remaining: number;
    };
    metrics: PartnerMetrics;
    isStaff?: boolean;
}

export default function LeftRight4UImpactBoard({ partner, metrics, isStaff = false }: ImpactBoardProps) {
    // Calculated impacts
    // "Mothers Supported" -> active_users (or codes_activated if active_users is 0/null)
    const mothersSupported = metrics.active_users > 0 ? metrics.active_users : metrics.codes_activated;

    // "Grant Codes Distributed" -> codes_distributed
    const codesDistributed = metrics.codes_distributed;

    // "Messages Kept Respectful" -> messages_sent (assuming these are the safe ones)
    const respectfulMessages = metrics.messages_sent;

    // "Conflict Reduction Signal" -> conflict_reduction_pct (or a calculated fallback)
    const conflictReduction = metrics.conflict_reduction_pct || 0;

    return (
        <div className="min-h-screen bg-[#FDF8F5] text-gray-900 font-sans selection:bg-[#FF6B6B]/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#4ECDC4]/10 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#FF6B6B]/10 rounded-full blur-[120px] -translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 rounded-full bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 text-[#FF6B6B] text-xs font-bold tracking-wider uppercase">
                                Impact Report
                            </span>
                            <span className="text-gray-500 text-sm flex items-center gap-2 font-medium">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ECDC4] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4ECDC4]"></span>
                                </span>
                                Updated Live
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-[#2D3436]">
                            Protecting peace while <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4]">
                                families heal.
                            </span>
                        </h1>
                        <p className="text-xl text-gray-600 max-w-3xl leading-relaxed font-light">
                            {partner.display_name} and CommonGround partnered to provide mothers facing breast cancer or domestic violence with grant-funded access to secure, boundaried co-parenting tools. Focus on healing, not conflict.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                        {isStaff && (
                            <>
                                <Button
                                    variant="outline"
                                    className="w-full sm:w-auto bg-white text-[#2D3436] font-bold hover:bg-gray-50 transition-colors border-gray-200"
                                    onClick={() => alert("CSV Export coming soon!")}
                                >
                                    Export to CSV
                                </Button>
                                <Link href={`/dashboard/partners/${partner.partner_slug}/codes`} className="w-full sm:w-auto">
                                    <Button className="w-full bg-[#FF6B6B] text-white font-bold hover:bg-[#ff5252] transition-colors shadow-lg shadow-[#FF6B6B]/20">
                                        <Settings className="mr-2 h-4 w-4" />
                                        Manage Codes
                                    </Button>
                                </Link>
                            </>
                        )}
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto bg-white/50 hover:bg-white text-gray-600 border border-gray-200 backdrop-blur-sm shadow-sm"
                            onClick={() => window.print()}
                        >
                            <Share2 className="mr-2 h-4 w-4" />
                            Share Report
                        </Button>
                    </div>
                </header>

                {/* Metrics Grid (5 Cards) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-24">
                    {/* Card 1: Mothers Supported */}
                    <Card className="bg-white border-transparent shadow-sm hover:shadow-xl hover:border-[#FF6B6B]/20 transition-all duration-300 group rounded-3xl">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-10 w-10 rounded-xl bg-[#FF6B6B]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <HeartPulse className="h-5 w-5 text-[#FF6B6B]" />
                                </div>
                                <span className="text-xs font-medium text-gray-400">Goal: 50/Q3</span>
                            </div>
                            <h3 className="text-4xl font-black text-[#2D3436] mb-1">{mothersSupported}</h3>
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Mothers Supported</p>
                            <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-100 pt-3">
                                Every activated account is a mother protecting her energy for recovery.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Card 2: Grant Codes Distributed */}
                    <Card className="bg-white border-transparent shadow-sm hover:shadow-xl hover:border-[#4ECDC4]/20 transition-all duration-300 group rounded-3xl">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-10 w-10 rounded-xl bg-[#4ECDC4]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Zap className="h-5 w-5 text-[#4ECDC4]" />
                                </div>
                                <span className="text-xs font-medium text-gray-400">Active</span>
                            </div>
                            <h3 className="text-4xl font-black text-[#2D3436] mb-1">{codesDistributed}</h3>
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Grants Deployed</p>
                            <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-100 pt-3">
                                Transforming financial backing into immediate, usable logistical support.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Card 3: Schedules Created */}
                    <Card className="bg-white border-transparent shadow-sm hover:shadow-xl hover:border-[#FFE66D]/40 transition-all duration-300 group rounded-3xl">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-10 w-10 rounded-xl bg-[#FFE66D]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Calendar className="h-5 w-5 text-[#e6cf62]" />
                                </div>
                                <span className="text-xs font-medium text-gray-400">Logistics</span>
                            </div>
                            <h3 className="text-4xl font-black text-[#2D3436] mb-1">{metrics.schedules_created}</h3>
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Schedules Managed</p>
                            <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-100 pt-3">
                                Clear expectations mean less texting about treatments and transitions.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Card 4: Messages Kept Respectful */}
                    <Card className="bg-white border-transparent shadow-sm hover:shadow-xl hover:border-cg-sage/40 transition-all duration-300 group rounded-3xl">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-10 w-10 rounded-xl bg-cg-sage/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <MessageSquare className="h-5 w-5 text-cg-sage" />
                                </div>
                                <span className="text-xs font-medium text-gray-400">Goal: 95%</span>
                            </div>
                            <h3 className="text-4xl font-black text-[#2D3436] mb-1">{respectfulMessages}</h3>
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Safe Exchanges</p>
                            <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-100 pt-3">
                                Our ARIA Toxicity Shield ensures communication remains strictly business.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Card 5: Conflict Reduction Signal */}
                    <Card className="bg-white border-transparent shadow-sm hover:shadow-xl hover:border-[#2D3436]/20 transition-all duration-300 group rounded-3xl">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-10 w-10 rounded-xl bg-[#2D3436]/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <TrendingDown className="h-5 w-5 text-[#2D3436]" />
                                </div>
                                <span className="text-xs font-medium text-gray-400">Target: 40%</span>
                            </div>
                            <h3 className="text-4xl font-black text-[#2D3436] mb-1">
                                {conflictReduction > 0 ? `-${conflictReduction}%` : 'Tracking'}
                            </h3>
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Hostility Dropped</p>
                            <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-100 pt-3">
                                Measurable decreases in toxic patterns, restoring peace to the home.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Narrative Sections Grid */}
                <div className="grid lg:grid-cols-2 gap-12 mb-24">
                    {/* Why These Numbers Matter */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-[#2D3436] mb-4">Why these metrics matter</h2>
                            <p className="text-gray-600 leading-relaxed mb-6 font-light">
                                We track what preserves a mother's mental and physical energy:
                            </p>
                            <ul className="space-y-4">
                                <li className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-50">
                                    <div className="h-8 w-8 rounded-full bg-[#FF6B6B]/10 flex items-center justify-center shrink-0">
                                        <HeartPulse className="h-4 w-4 text-[#FF6B6B]" />
                                    </div>
                                    <span className="text-gray-600 font-light"><strong className="text-[#2D3436]">Mothers Supported:</strong> Removing the financial burden of premium security tools during a crisis.</span>
                                </li>
                                <li className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-50">
                                    <div className="h-8 w-8 rounded-full bg-[#4ECDC4]/10 flex items-center justify-center shrink-0">
                                        <Zap className="h-4 w-4 text-[#4ECDC4]" />
                                    </div>
                                    <span className="text-gray-600 font-light"><strong className="text-[#2D3436]">Grants Deployed:</strong> Ensuring help reaches those who need it rapidly and securely.</span>
                                </li>
                                <li className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-50">
                                    <div className="h-8 w-8 rounded-full bg-cg-sage/10 flex items-center justify-center shrink-0">
                                        <ShieldCheck className="h-4 w-4 text-cg-sage" />
                                    </div>
                                    <span className="text-gray-600 font-light"><strong className="text-[#2D3436]">Safe Exchanges:</strong> Validating that the environment remains free from toxicity and manipulation.</span>
                                </li>
                            </ul>
                            <div className="mt-8 p-6 rounded-2xl bg-[#FFE66D]/10 border border-[#FFE66D]/20">
                                <p className="text-lg font-medium text-[#2D3436] italic">"Every notification should be an update, not an anxiety trigger."</p>
                            </div>
                        </div>
                    </div>

                    {/* Partnership & Trust */}
                    <div className="space-y-8">
                        {/* Hero Image Block */}
                        <div className="relative aspect-square md:aspect-video rounded-[2rem] overflow-hidden border border-gray-200/50 shadow-lg group bg-white">
                            <div className="absolute inset-0 bg-gradient-to-t from-[#2D3436] via-transparent to-transparent z-10 opacity-60" />
                            <img
                                src="/assets/marketing/lr4u_impact_nano_banana_1772567479936.png"
                                alt="Abstract healing and protection"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                            />
                            <div className="absolute bottom-8 left-8 z-20 max-w-md">
                                <h3 className="text-white font-bold text-2xl mb-2">The Shield & The Heart</h3>
                                <p className="text-gray-200 text-sm leading-relaxed font-light">
                                    Left Right 4 U Foundation provides holistic support and financial aid. CommonGround provides the digital armor required to focus entirely on that healing journey.
                                </p>
                            </div>
                        </div>

                        {/* Bridge Line */}
                        <div className="flex items-center gap-4 py-5 px-8 bg-white rounded-2xl border-l-4 border-[#FF6B6B] shadow-sm">
                            <p className="text-lg font-bold text-[#2D3436]">
                                Support heals the individual. <br /> Boundaries protect the environment.
                            </p>
                        </div>

                        {/* Trust Block */}
                        <div className="bg-[#2D3436] rounded-3xl p-8 border border-gray-800 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-[#4ECDC4]/10 rounded-full blur-[60px] translate-x-1/2 -translate-y-1/2" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <Shield className="h-6 w-6 text-[#4ECDC4]" />
                                    <h3 className="text-xl font-bold text-white">Aggregated for privacy.</h3>
                                </div>
                                <p className="text-gray-400 leading-relaxed mb-6 font-light">
                                    We report impact using aggregate signals and trends—never exposing private family details or communications. The goal is to prove what works while keeping mothers absolutely protected.
                                </p>
                                <div className="flex gap-3">
                                    <div className="px-4 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-[#4ECDC4] font-medium tracking-wide">ZERO DATA SELLING</div>
                                    <div className="px-4 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-[#FFE66D] font-medium tracking-wide">END-TO-END ENCRYPTED DRAFTS</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Closing CTA */}
                <div className="rounded-[2.5rem] bg-white border border-gray-100 p-12 text-center relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#FF6B6B]/5 via-transparent to-transparent pointer-events-none" />
                    <div className="relative z-10 max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-black text-[#2D3436] mb-4">Help us protect more families.</h2>
                        <p className="text-lg text-gray-600 mb-10 leading-relaxed font-light">
                            If your organization supports survivors of domestic violence or patients undergoing intense medical treatments, our secure communication infrastructure is designed for your clients.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
                            <Button className="bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-bold h-14 px-8 rounded-xl shadow-lg shadow-[#FF6B6B]/20 transition-transform hover:-translate-y-0.5" onClick={() => window.open('https://www.leftright4u.org/give', '_blank')}>
                                Donate to Left Right 4 U
                            </Button>
                            <Button variant="outline" className="border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 h-14 px-8 rounded-xl font-bold transition-colors">
                                Learn About Partnering
                            </Button>
                        </div>
                        <p className="text-sm font-bold text-[#4ECDC4] uppercase tracking-widest">
                            Healing Starts With Safe Boundaries.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
