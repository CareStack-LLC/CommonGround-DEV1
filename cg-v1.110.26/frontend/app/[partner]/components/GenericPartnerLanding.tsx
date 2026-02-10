'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
    Clock,
    MessageSquare,
    Scale,
    CheckCircle,
    ArrowRight,
    Loader2
} from 'lucide-react';

interface PartnerInfo {
    partner_slug: string;
    display_name: string;
    mission_statement: string | null;
    branding_config: {
        primary_color: string;
        secondary_color: string;
        accent_color: string;
        hero_image_url: string;
        logo_url: string;
        [key: string]: any;
    };
    landing_config: {
        hero_title?: string;
        hero_subtitle?: string;
        benefits_title?: string;
        benefits_description?: string;
        call_to_action_url?: string;
        custom_welcome_message?: string;
        [key: string]: any;
    };
    [key: string]: any;
}

interface GenericPartnerLandingProps {
    partner: PartnerInfo;
}

export default function GenericPartnerLanding({ partner }: GenericPartnerLandingProps) {
    const router = useRouter();
    const [grantCode, setGrantCode] = useState('');
    const [validating, setValidating] = useState(false);
    const [codeError, setCodeError] = useState<string | null>(null);
    const [codeValid, setCodeValid] = useState(false);

    const handleValidateCode = async () => {
        if (!grantCode.trim()) {
            setCodeError('Please enter your grant code');
            return;
        }

        setValidating(true);
        setCodeError(null);

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/partners/${partner.partner_slug}/validate-code`,
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
                    router.push(`/register?grant_code=${encodeURIComponent(grantCode.toUpperCase())}&partner=${partner.partner_slug}`);
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

    const scrollToGrant = () => {
        document.getElementById('grant-code-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    // Styling derived from partner config
    const primaryColor = partner.branding_config.primary_color || '#2C5F5D';
    const secondaryColor = partner.branding_config.secondary_color || '#D4A853';

    // Dynamic text with fallbacks
    const heroTitle = partner.landing_config?.hero_title || `${partner.display_name} + CommonGround`;
    const heroSubtitle = partner.landing_config?.hero_subtitle || "Partnering to provide safe co-parenting tools for families.";
    const benefitsTitle = partner.landing_config?.benefits_title || `Why ${partner.display_name} × CommonGround?`;
    const benefitsDesc = partner.landing_config?.benefits_description || "We provide the tools you need to document everything and keep your family safe.";
    const ctaUrl = partner.landing_config?.call_to_action_url || "#";

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-amber-500/30"
            style={{ '--partner-primary': primaryColor, '--partner-secondary': secondaryColor } as React.CSSProperties}>

            {/* Split Hero Section */}
            <div className="grid lg:grid-cols-2 min-h-[90vh]">
                {/* Left: Content */}
                <div className="relative flex flex-col justify-center p-8 lg:p-16 xl:p-24 order-2 lg:order-1">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[var(--partner-primary)]/20 via-gray-900 to-gray-900 -z-10" />

                    {/* Logos */}
                    <div className="flex items-center gap-6 mb-12">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg flex items-center justify-center font-bold text-white" style={{ backgroundColor: primaryColor }}>
                                {partner.display_name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-bold tracking-tight uppercase">{partner.display_name}</span>
                        </div>
                        <div className="h-8 w-px bg-gray-700" />
                        <div className="flex items-center gap-2 text-gray-400">
                            <span className="text-sm font-medium">Powered by</span>
                            <span className="text-cg-sage font-semibold">CommonGround</span>
                        </div>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-[1.1] tracking-tight" dangerouslySetInnerHTML={{ __html: heroTitle }} />

                    <p className="text-xl text-gray-400 mb-8 max-w-lg leading-relaxed">
                        {heroSubtitle}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                        <Button
                            onClick={scrollToGrant}
                            className="text-white font-bold h-14 px-8 text-lg border border-transparent hover:brightness-110 transition-all"
                            style={{ backgroundColor: primaryColor }}
                        >
                            Get a Grant Code
                        </Button>
                        <Button
                            variant="outline"
                            className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 h-14 px-8 text-lg"
                            onClick={() => window.open(ctaUrl, '_blank')}
                        >
                            Visit {partner.display_name}
                        </Button>
                    </div>

                    <p className="text-sm text-gray-500 font-medium">
                        Safe communication. Verified records. Zero cost to you.
                    </p>
                </div>

                {/* Right: Image */}
                <div className="relative h-[50vh] lg:h-auto order-1 lg:order-2 overflow-hidden group">
                    {/* Placeholder gradient if no image, or the actual image */}
                    {partner.branding_config.hero_image_url ? (
                        <img
                            src={partner.branding_config.hero_image_url}
                            alt={`${partner.display_name} Hero`}
                            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-105"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                    ) : null}

                    {/* Fallback Gradient */}
                    <div className={`absolute inset-0 w-full h-full bg-gradient-to-br from-[var(--partner-primary)] to-gray-900 ${partner.branding_config.hero_image_url ? 'hidden' : ''}`} style={{ backgroundColor: primaryColor }}></div>

                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-gray-900" />
                </div>
            </div>

            {/* Why This Partnership Exists */}
            <section className="py-24 px-6 bg-gray-900 border-t border-gray-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20" style={{ backgroundColor: secondaryColor }} />

                <div className="max-w-4xl mx-auto text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        {benefitsTitle}
                    </h2>
                    <p className="text-xl text-gray-400 leading-relaxed mb-8">
                        {benefitsDesc}
                    </p>
                    <p className="text-lg text-gray-400 leading-relaxed max-w-3xl mx-auto">
                        <strong className="text-cg-sage">CommonGround</strong> provides the technology you need to protect your peace. It handles the communication, the scheduling, and the documentation—so you can focus on healing and rebuilding.
                    </p>
                </div>
            </section>

            {/* Features */}
            <section className="py-24 px-6 bg-gray-900 relative">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            What you get inside CommonGround
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                            Your safety is our priority. Every tool is designed to reduce conflict and create a verifiable record of truth.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                icon: MessageSquare,
                                title: "Secure Messaging",
                                desc: "No more deleted texts. Everything is recorded and unalterable.",
                                color: "text-white",
                                bg: "bg-white/10"
                            },
                            {
                                icon: Clock,
                                title: "Shared Calendar",
                                desc: "Clear schedules for custody and exchanges.",
                                color: "text-white",
                                bg: "bg-white/10"
                            },
                            {
                                icon: Scale,
                                title: "Expense Tracking",
                                desc: "Request and track payments without improved arguments.",
                                color: "text-white",
                                bg: "bg-white/10"
                            },
                            {
                                icon: CheckCircle,
                                title: "Court-Ready Records",
                                desc: "Download reports that stand up in court.",
                                color: "text-white",
                                bg: "bg-white/10"
                            }
                        ].map((item, idx) => (
                            <Card key={idx} className="bg-gray-800 border-gray-700 hover:border-[var(--partner-primary)] transition-colors group">
                                <CardContent className="pt-8 p-8 h-full flex flex-col">
                                    <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`} style={{ color: secondaryColor }}>
                                        <item.icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-3">{item.title}</h3>
                                    <p className="text-gray-400 leading-relaxed text-sm">
                                        {item.desc}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Grant Code Section */}
            <section id="grant-code-section" className="py-24 px-6 bg-gray-800/30 border-y border-gray-800">
                <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-6">Your Grant Code Benefits</h2>
                        <p className="text-gray-300 mb-8 leading-relaxed">
                            Through this partnership, you receive full access to CommonGround's comprehensive tier at no cost.
                        </p>
                        <ul className="space-y-4 mb-8">
                            {[
                                "100% Free for 6 months (renewable)",
                                "Includes all premium safety features",
                                "Privately funded by our partners",
                                "Immediate activation"
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: secondaryColor }} />
                                    <span className="text-gray-300">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Logic Box */}
                    <div className="bg-gray-900 border border-gray-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 opacity-20" style={{ backgroundColor: secondaryColor }} />

                        <h3 className="text-xl font-bold text-white mb-6 relative z-10">Activate your Grant Code</h3>

                        <div className="space-y-4 relative z-10">
                            <label className="block text-sm font-medium uppercase tracking-wider" style={{ color: secondaryColor }}>
                                Enter Grant Code
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    placeholder="CODE2024"
                                    value={grantCode}
                                    onChange={(e) => {
                                        setGrantCode(e.target.value.toUpperCase());
                                        setCodeError(null);
                                        setCodeValid(false);
                                    }}
                                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-600 h-12 text-lg font-mono focus:border-[var(--partner-primary)] transition-colors"
                                    disabled={validating || codeValid}
                                />
                                <Button
                                    onClick={handleValidateCode}
                                    disabled={validating || codeValid}
                                    className="text-white font-bold h-12 px-6"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {validating ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                                </Button>
                            </div>

                            {codeError && (
                                <p className="text-red-400 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                                    {codeError}
                                </p>
                            )}
                            {codeValid && (
                                <p className="text-green-400 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                    <CheckCircle className="h-4 w-4" />
                                    Code verified! Redirecting...
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
