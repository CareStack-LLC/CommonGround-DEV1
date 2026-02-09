'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Shield,
    MessageSquare,
    Calendar,
    FileText,
    Users,
    CheckCircle,
    ArrowRight,
    Sparkles,
    Heart,
    Scale,
    Clock,
    Loader2
} from 'lucide-react';

interface PartnerBranding {
    logo_url: string;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    font_family: string;
    hero_image_url: string;
    tagline: string;
}

interface PartnerLandingConfig {
    show_mission: boolean;
    show_stats: boolean;
    show_testimonials: boolean;
    custom_welcome_message: string;
    faq_items: Array<{ question: string; answer: string }>;
    contact_method: string;
}

interface PartnerInfo {
    partner_slug: string;
    display_name: string;
    mission_statement: string | null;
    branding_config: PartnerBranding;
    landing_config: PartnerLandingConfig;
    codes_remaining: number;
    is_active: boolean;
}

// Forever Forward specific content
const FOREVER_FORWARD_CONTENT = {
    headline: "Building Stronger Fathers, Building Stronger Families",
    subheadline: "Forever Forward + CommonGround partnership provides you with FREE Complete tier access (6 months, $209.94 value)",
    hero_message: "You're learning to lead your career. Now lead your family with the same confidence.",
    why_matters: [
        {
            icon: Clock,
            title: "Consistency",
            description: "Show up reliably. Build trust. Prove your commitment."
        },
        {
            icon: MessageSquare,
            title: "Communication",
            description: "Stay professional under pressure. AI helps you respond, not react."
        },
        {
            icon: FileText,
            title: "Documentation",
            description: "Court-ready records of your involvement. Your receipts."
        },
        {
            icon: Scale,
            title: "Leadership",
            description: "Organized, in control, making it work for your kids."
        }
    ],
    cta_text: "Activate Your Free Access",
    closing: "Your family is worth 10 minutes of setup. Let's move forward together."
};

export default function PartnerLandingPage() {
    const params = useParams();
    const router = useRouter();
    const partnerSlug = params.partner as string;

    const [partner, setPartner] = useState<PartnerInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [grantCode, setGrantCode] = useState('');
    const [validating, setValidating] = useState(false);
    const [codeError, setCodeError] = useState<string | null>(null);
    const [codeValid, setCodeValid] = useState(false);

    useEffect(() => {
        async function fetchPartner() {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/partners/${partnerSlug}`);
                if (!res.ok) {
                    if (res.status === 404) {
                        setError('Partner not found');
                    } else {
                        setError('Failed to load partner information');
                    }
                    return;
                }
                const data = await res.json();
                setPartner(data);
            } catch (err) {
                setError('Failed to connect to server');
            } finally {
                setLoading(false);
            }
        }

        if (partnerSlug) {
            fetchPartner();
        }
    }, [partnerSlug]);

    const handleValidateCode = async () => {
        if (!grantCode.trim()) {
            setCodeError('Please enter your grant code');
            return;
        }

        setValidating(true);
        setCodeError(null);

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/partners/${partnerSlug}/validate-code`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: grantCode.toUpperCase() })
                }
            );

            const data = await res.json();

            if (data.is_valid) {
                setCodeValid(true);
                // Redirect to register with grant code
                setTimeout(() => {
                    router.push(`/register?grant_code=${encodeURIComponent(grantCode.toUpperCase())}&partner=${partnerSlug}`);
                }, 1000);
            } else {
                setCodeError(data.message || 'Invalid code');
            }
        } catch (err) {
            setCodeError('Failed to validate code. Please try again.');
        } finally {
            setValidating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
                <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            </div>
        );
    }

    if (error || !partner) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6">
                <h1 className="text-2xl font-bold mb-4">Partner Not Found</h1>
                <p className="text-gray-400 mb-6">This partnership page doesn't exist or is no longer active.</p>
                <Link href="/">
                    <Button>Go to CommonGround</Button>
                </Link>
            </div>
        );
    }

    // Check if this is Forever Forward for custom content
    const isForeverForward = partnerSlug.toLowerCase() === 'foreverforward';
    const content = isForeverForward ? FOREVER_FORWARD_CONTENT : null;

    // Apply partner branding as CSS variables
    const brandingStyle = {
        '--partner-primary': partner.branding_config.primary_color,
        '--partner-secondary': partner.branding_config.secondary_color,
        '--partner-accent': partner.branding_config.accent_color,
    } as React.CSSProperties;

    return (
        <div
            className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900"
            style={brandingStyle}
        >
            {/* Header */}
            <header className="py-4 px-6 flex items-center justify-between border-b border-gray-800">
                <div className="flex items-center gap-4">
                    {partner.branding_config.logo_url && (
                        <img
                            src={partner.branding_config.logo_url}
                            alt={partner.display_name}
                            className="h-10 w-auto"
                        />
                    )}
                    <span className="text-white font-semibold">{partner.display_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>Powered by</span>
                    <span className="text-cg-sage font-semibold">CommonGround</span>
                </div>
            </header>

            {/* Hero Section */}
            <section className="py-16 px-6 text-center">
                <div className="max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 text-amber-400 text-sm font-medium mb-6">
                        <Sparkles className="h-4 w-4" />
                        FREE Complete Tier Access • 6 Months • $209.94 Value
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                        {content?.headline || `${partner.display_name} + CommonGround`}
                    </h1>

                    <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                        {content?.subheadline || partner.branding_config.tagline ||
                            `Through our partnership with ${partner.display_name}, you receive free access to CommonGround's Complete co-parenting platform.`}
                    </p>

                    {content?.hero_message && (
                        <p className="text-lg text-amber-400 font-medium mb-10">
                            {content.hero_message}
                        </p>
                    )}

                    {/* Grant Code Entry */}
                    <Card className="max-w-md mx-auto bg-gray-800/50 border-gray-700">
                        <CardHeader>
                            <CardTitle className="text-white text-lg">
                                Enter Your Grant Code
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    placeholder="FOREVERFORWARD0001"
                                    value={grantCode}
                                    onChange={(e) => {
                                        setGrantCode(e.target.value.toUpperCase());
                                        setCodeError(null);
                                        setCodeValid(false);
                                    }}
                                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
                                    disabled={validating || codeValid}
                                />
                                <Button
                                    onClick={handleValidateCode}
                                    disabled={validating || codeValid}
                                    className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold"
                                >
                                    {validating ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : codeValid ? (
                                        <CheckCircle className="h-4 w-4" />
                                    ) : (
                                        <ArrowRight className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            {codeError && (
                                <p className="text-red-400 text-sm mt-2">{codeError}</p>
                            )}
                            {codeValid && (
                                <p className="text-green-400 text-sm mt-2 flex items-center gap-1">
                                    <CheckCircle className="h-4 w-4" />
                                    Code verified! Redirecting to create your account...
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Why This Matters (for fathers) */}
            {content?.why_matters && (
                <section className="py-16 px-6 bg-gray-800/30">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-2xl font-bold text-white text-center mb-10">
                            Why This Matters For Fathers
                        </h2>
                        <div className="grid md:grid-cols-4 gap-6">
                            {content.why_matters.map((item, idx) => (
                                <Card key={idx} className="bg-gray-800/50 border-gray-700 text-center">
                                    <CardContent className="pt-6">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 mb-4">
                                            <item.icon className="h-6 w-6 text-amber-400" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                                        <p className="text-sm text-gray-400">{item.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Features Grid */}
            <section className="py-16 px-6">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-2xl font-bold text-white text-center mb-10">
                        What You Get With CommonGround Complete
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { icon: Shield, title: "ARIA™ AI Shield", desc: "AI flags hostility before it escalates. Suggests professional responses." },
                            { icon: Calendar, title: "Smart Scheduling", desc: "Custody calendar, exchange tracking, GPS-verified handoffs." },
                            { icon: MessageSquare, title: "Secure Messaging", desc: "All communication logged. Court-admissible records." },
                            { icon: FileText, title: "Court Documents", desc: "Generate custody agreements, expense reports, custody logs." },
                            { icon: Users, title: "Kid Communication", desc: "Safe video calls with children. Family Circle contacts." },
                            { icon: Heart, title: "Conflict-Free", desc: "Reduce arguments by 70%. Focus on your kids, not drama." }
                        ].map((feature, idx) => (
                            <Card key={idx} className="bg-gray-800/50 border-gray-700">
                                <CardContent className="pt-6">
                                    <feature.icon className="h-8 w-8 text-cg-sage mb-3" />
                                    <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                                    <p className="text-sm text-gray-400">{feature.desc}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-16 px-6 bg-gray-800/30">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-2xl font-bold text-white mb-10">How It Works</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { step: "1", title: "Get Your Code", desc: `Receive your unique grant code from ${partner.display_name}` },
                            { step: "2", title: "Activate (10 min)", desc: "Enter your code above and create your free account" },
                            { step: "3", title: "Start Co-Parenting", desc: "Invite your co-parent. Build your schedule. Communicate safely." }
                        ].map((item, idx) => (
                            <div key={idx} className="flex flex-col items-center">
                                <div className="w-12 h-12 rounded-full bg-amber-500 text-gray-900 font-bold text-xl flex items-center justify-center mb-4">
                                    {item.step}
                                </div>
                                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                                <p className="text-sm text-gray-400">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Mission Statement */}
            {partner.landing_config.show_mission && partner.mission_statement && (
                <section className="py-16 px-6">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-xl font-semibold text-white mb-4">About {partner.display_name}</h2>
                        <p className="text-gray-400 leading-relaxed">{partner.mission_statement}</p>
                    </div>
                </section>
            )}

            {/* Final CTA */}
            <section className="py-16 px-6 bg-gradient-to-r from-amber-600/20 to-amber-500/20">
                <div className="max-w-2xl mx-auto text-center">
                    {content?.closing && (
                        <p className="text-xl text-white font-medium mb-6">{content.closing}</p>
                    )}
                    <Button
                        size="lg"
                        onClick={() => document.querySelector('input')?.focus()}
                        className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold text-lg px-8"
                    >
                        {content?.cta_text || "Activate Your Free Access"}
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <p className="text-gray-400 text-sm mt-4">
                        Questions? Contact {partner.display_name} or email support@mycommonground.app
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-gray-800">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <span className="text-cg-sage font-semibold">CommonGround</span>
                        {partner.branding_config.logo_url && (
                            <>
                                <span className="text-gray-600">×</span>
                                <span className="text-white">{partner.display_name}</span>
                            </>
                        )}
                    </div>
                    <div className="flex gap-6 text-sm text-gray-500">
                        <Link href="/privacy" className="hover:text-white">Privacy</Link>
                        <Link href="/terms" className="hover:text-white">Terms</Link>
                        <a href="mailto:support@mycommonground.app" className="hover:text-white">Support</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
