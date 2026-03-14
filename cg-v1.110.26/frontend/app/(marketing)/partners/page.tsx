'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Users,
    Heart,
    ArrowRight,
    MapPin,
    Globe,
    Mail,
    Loader2,
    TrendingDown,
    ShieldAlert
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

function PartnerCard({ slug, name, description, website, contact, location, logoUrl }: {
    slug: string;
    name: string;
    description: string;
    website: string;
    contact: string;
    location: string;
    logoUrl: string;
}) {
    const [metrics, setMetrics] = useState<PartnerMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMetrics() {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/partners/${slug}/impact-metrics`);
                if (res.ok) {
                    const data = await res.json();
                    setMetrics(data.metrics);
                }
            } catch (error) {
                console.error('Failed to fetch metrics', error);
            } finally {
                setLoading(false);
            }
        }
        fetchMetrics();
    }, [slug]);

    return (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 group">
            <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Logo / Image Section */}
                <div className="w-full md:w-1/3 shrink-0">
                    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gray-100 mb-6">
                        {/* Using a placeholder or the passed logo URL. */}
                        <img
                            src={logoUrl}
                            alt={`${name} cover`}
                            className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-700"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                // Show fallback gradient if image fails
                                e.currentTarget.parentElement!.style.background = 'linear-gradient(to bottom right, #e2e8f0, #cbd5e1)';
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-4 left-4 text-white font-serif font-bold text-xl">
                            {name}
                        </div>
                    </div>

                    <div className="space-y-4 text-sm text-gray-600">
                        <div className="flex items-center gap-3">
                            <MapPin className="w-4 h-4 text-[var(--portal-primary)]" />
                            <span>{location}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Globe className="w-4 h-4 text-[var(--portal-primary)]" />
                            <a href={`https://${website}`} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--portal-primary)] hover:underline decoration-1 underline-offset-4 transition-colors">
                                {website}
                            </a>
                        </div>
                        <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-[var(--portal-primary)]" />
                            <a href={`mailto:${contact}`} className="hover:text-[var(--portal-primary)] hover:underline decoration-1 underline-offset-4 transition-colors">
                                {contact}
                            </a>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-1">
                    <div className="mb-8">
                        <h3 className="text-3xl font-serif font-bold text-[#1E3A4A] mb-3" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                            Mission & Impact
                        </h3>
                        <p className="text-lg text-gray-600 leading-relaxed font-light">
                            {description}
                        </p>
                    </div>

                    {/* Live Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Metric 1: Families Served */}
                        <div className="bg-[#F4F8F7] p-6 rounded-2xl border border-[var(--portal-primary)]/10">
                            <div className="flex items-center gap-2 mb-2 text-[#F5A623]">
                                <Users className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wider">Families Served</span>
                            </div>
                            <div className="text-3xl font-serif font-bold text-[#1E3A4A]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                                {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : (metrics?.active_users || metrics?.codes_activated || 0)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Parents currently active</div>
                        </div>

                        {/* Metric 2: Conflict Reduction */}
                        <div className="bg-[#F4F8F7] p-6 rounded-2xl border border-[var(--portal-primary)]/10">
                            <div className="flex items-center gap-2 mb-2 text-[#F5A623]">
                                <TrendingDown className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wider">Conflict Reduced</span>
                            </div>
                            <div className="text-3xl font-serif font-bold text-[#1E3A4A]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                                {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : (metrics?.conflict_reduction_pct ? `${metrics.conflict_reduction_pct}%` : 'N/A')}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Improvement in communication</div>
                        </div>

                        {/* Metric 3: Messages Improved (ARIA Interventions) */}
                        <div className="bg-[#F4F8F7] p-6 rounded-2xl border border-[var(--portal-primary)]/10">
                            <div className="flex items-center gap-2 mb-2 text-[#F5A623]">
                                <ShieldAlert className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-wider">Toxic Prevented</span>
                            </div>
                            <div className="text-3xl font-serif font-bold text-[#1E3A4A]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                                {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : (metrics?.aria_interventions || 0)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Harmful threads blocked</div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <Link href={`/${slug}`} className="inline-flex items-center font-medium text-[var(--portal-primary)] hover:text-[#F5A623] transition-colors group/link">
                            View Partnership Page <ArrowRight className="w-4 h-4 ml-1 transform group-hover/link:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PartnersDirectoryPage() {
    return (
        <div className="font-sans text-[#1E3A4A] bg-[#F4F8F7] min-h-screen">
            {/* Hero Section */}
            <section className="relative pt-24 pb-16 px-6 overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--portal-primary)] rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#F5A623] rounded-full blur-3xl"></div>
                </div>

                <div className="relative max-w-4xl mx-auto text-center z-10">
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif text-[#1E3A4A] mb-6 leading-[1.05]" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
                        Our Partners
                    </h1>
                    <p className="text-xl sm:text-2xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
                        Organizations dedicated to building peace for the families they serve.
                    </p>
                </div>
            </section>

            {/* Directory Grid */}
            <section className="px-6 pb-24">
                <div className="max-w-6xl mx-auto space-y-12">
                    {/* Forever Forward Card */}
                    <PartnerCard
                        slug="foreverforward"
                        name="Forever Forward"
                        description="Forever Forward is committed to empowering dads to be the best parents they can be. Through education, mentorship, and community support, we help fathers navigate the challenges of co-parenting and build lasting, positive relationships with their children."
                        website="foreverforward.org"
                        contact="info@foreverforward.org"
                        location="Los Angeles, CA"
                        logoUrl="/assets/marketing/forever-forward-hero.png"
                    />

                    {/* Jenesse Center Card */}
                    <PartnerCard
                        slug="jenesse-center"
                        name="Jenesse Center"
                        description="Jenesse Center Inc. is the oldest domestic violence intervention program in South Los Angeles. Jenesse takes a holistic, comprehensive, and culturally responsive approach to domestic violence intervention and prevention."
                        website="jenesse.org"
                        contact="info@jenesse.org"
                        location="Los Angeles, CA"
                        logoUrl="/assets/marketing/jenesse-hero.jpg"
                    />

                    {/* Left Right 4 U Foundation Card */}
                    <PartnerCard
                        slug="leftright4u"
                        name="Left Right 4 U Foundation"
                        description="LeftRight 4 U Foundation assist children of low-income single Mother's who are fighting Breast Cancer and/or Domestic Violence."
                        website="leftright4u.org"
                        contact="info@leftright4u.org"
                        location="San Bernardino, CA"
                        logoUrl="/assets/marketing/demo-partner-logo.png"
                    />

                    {/* Interval House Long Beach Card */}
                    <PartnerCard
                        slug="interval-house-lb"
                        name="Interval House"
                        description="Interval House provides comprehensive support services to battered women and children, including emergency shelter, transitional housing, legal advocacy, and counseling."
                        website="intervalhouse.org"
                        contact="admin@intervalhouse.org"
                        location="Long Beach, CA"
                        logoUrl="/assets/marketing/interval-house-hero.jpg"
                    />

                    {/* Call to Action for new partners */}
                    <div className="mt-16 text-center">
                        <p className="text-gray-500 mb-4">Are you a nonprofit supporting families?</p>
                        <Link
                            href="/grant-partnership"
                            className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--portal-primary)] px-8 text-sm font-medium text-white shadow transition-all hover:bg-[var(--portal-primary)]/90 hover:shadow-lg hover:-translate-y-0.5"
                        >
                            Become a Partner
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
