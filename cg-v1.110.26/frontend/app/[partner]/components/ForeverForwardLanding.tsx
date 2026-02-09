'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
    Clock,
    MessageSquare,
    FileText,
    Scale,
    CheckCircle,
    ArrowRight,
    Loader2
} from 'lucide-react';

interface ForeverForwardLandingProps {
    partnerSlug: string;
}

export default function ForeverForwardLanding({ partnerSlug }: ForeverForwardLandingProps) {
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

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-amber-500/30">
            {/* Split Hero Section */}
            <div className="grid lg:grid-cols-2 min-h-[90vh]">
                {/* Left: Content */}
                <div className="relative flex flex-col justify-center p-8 lg:p-16 xl:p-24 order-2 lg:order-1">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-500/10 via-gray-900 to-gray-900 -z-10" />

                    {/* Logos */}
                    <div className="flex items-center gap-6 mb-12">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-amber-500 rounded-lg flex items-center justify-center font-bold text-gray-900">FF</div>
                            <span className="font-bold tracking-tight">FOREVER FORWARD</span>
                        </div>
                        <div className="h-8 w-px bg-gray-700" />
                        <div className="flex items-center gap-2 text-gray-400">
                            <span className="text-sm font-medium">Powered by</span>
                            <span className="text-cg-sage font-semibold">CommonGround</span>
                        </div>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-[1.1] tracking-tight">
                        Lead the Future. <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                            Protect Your Legacy.
                        </span>
                    </h1>

                    <p className="text-xl text-gray-400 mb-8 max-w-lg leading-relaxed">
                        The digital era is tough. We make sure you're documenting
                        correctly through custody exchanges while AI-powered tools
                        give you confidence & support.
                    </p>

                    {/* Grant Code Box */}
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 max-w-md shadow-2xl shadow-black/50">
                        <label className="block text-sm font-medium text-amber-400 mb-2 uppercase tracking-wider">
                            Enter Member Grant Code
                        </label>
                        <div className="flex gap-2 mb-2">
                            <Input
                                type="text"
                                placeholder="FORWARD2024"
                                value={grantCode}
                                onChange={(e) => {
                                    setGrantCode(e.target.value.toUpperCase());
                                    setCodeError(null);
                                    setCodeValid(false);
                                }}
                                className="bg-gray-900/80 border-gray-600 text-white placeholder:text-gray-600 h-12 text-lg font-mono focus:border-amber-500 transition-colors"
                                disabled={validating || codeValid}
                            />
                            <Button
                                onClick={handleValidateCode}
                                disabled={validating || codeValid}
                                className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold h-12 px-6 transition-all hover:scale-105"
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

                        <p className="text-xs text-gray-500 mt-4">
                            Includes 6 months of CommonGround Complete ($209.94 value).
                        </p>
                    </div>
                </div>

                {/* Right: Image */}
                <div className="relative h-[50vh] lg:h-auto order-1 lg:order-2 overflow-hidden">
                    <img
                        src="/assets/marketing/forever-forward-hero.png"
                        alt="Father and son bonding"
                        className="absolute inset-0 w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-gray-900" />
                </div>
            </div>

            {/* Features Section */}
            <section className="py-24 px-6 bg-gray-900 relative border-t border-gray-800">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Built for Fathers, By the Community.
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Forever Forward isn't just a grant program. It's a commitment to
                            ensuring fathers have the tools they need to stay present and protected.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Scale,
                                title: "Strength",
                                desc: "Go into mediation with verified data, organized reports and clear history.",
                                color: "text-amber-400",
                                bg: "bg-amber-500/10"
                            },
                            {
                                icon: Clock,
                                title: "Consistency",
                                desc: "Consistency creates stability. Our tools track every exchange and schedule change.",
                                color: "text-orange-400",
                                bg: "bg-orange-500/10"
                            },
                            {
                                icon: MessageSquare,
                                title: "Communication",
                                desc: "Master the art of responding, not reacting. AI helps you keep it professional.",
                                color: "text-yellow-400",
                                bg: "bg-yellow-500/10"
                            }
                        ].map((item, idx) => (
                            <Card key={idx} className="bg-gray-800 border-gray-700 hover:border-amber-500/50 transition-colors group">
                                <CardContent className="pt-8 p-8">
                                    <div className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                        <item.icon className={`h-7 w-7 ${item.color}`} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                                    <p className="text-gray-400 leading-relaxed">
                                        {item.desc}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Co-Branding Context */}
            <section className="py-24 px-6 bg-gray-800/50">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1">
                        <h2 className="text-3xl font-bold text-white mb-6">
                            Empowering Fathers in the Digital Era.
                        </h2>
                        <div className="space-y-4 text-gray-300 text-lg leading-relaxed">
                            <p>
                                <strong className="text-amber-400">Forever Forward</strong> works directly with policy makers and community leaders to advocate for father's rights and family stability.
                            </p>
                            <p>
                                Through our partnership with <strong className="text-cg-sage">CommonGround</strong>, we provide the tactical digital infrastructure you need to execute on that vision.
                            </p>
                            <p className="text-sm text-gray-500 italic mt-8 border-l-2 border-amber-500 pl-4">
                                "Confidence isn't about being loud. It's about having the receipts." — Forever Forward
                            </p>
                        </div>
                    </div>
                    <div className="w-full md:w-1/3 aspect-square bg-gray-700 rounded-3xl flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 to-transparent group-hover:opacity-75 transition-opacity" />
                        <FileText className="w-24 h-24 text-gray-500 group-hover:text-amber-400 transition-colors duration-500" />
                    </div>
                </div>
            </section>
        </div>
    );
}
