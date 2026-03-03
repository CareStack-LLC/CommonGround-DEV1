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
    Loader2,
    HeartPulse,
    ShieldCheck
} from 'lucide-react';

interface LeftRight4ULandingProps {
    partnerSlug: string;
}

export default function LeftRight4ULanding({ partnerSlug }: LeftRight4ULandingProps) {
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

    const scrollToGrant = () => {
        document.getElementById('grant-code-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[#FDF8F5] text-gray-900 font-sans selection:bg-[#FF6B6B]/30">
            {/* Split Hero Section */}
            <div className="grid lg:grid-cols-2 min-h-[90vh]">
                {/* Left: Content */}
                <div className="relative flex flex-col justify-center p-8 lg:p-16 xl:p-24 order-2 lg:order-1 bg-white">
                    {/* Soft gradient background overlay */}
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#FF6B6B]/10 via-transparent to-transparent -z-10" />

                    {/* Logos */}
                    <div className="flex items-center gap-6 mb-12">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-[#FF6B6B] rounded-full flex items-center justify-center font-bold text-white shadow-md">LR</div>
                            <span className="font-bold tracking-tight text-[#2D3436]">LEFT RIGHT 4 U</span>
                        </div>
                        <div className="h-8 w-px bg-gray-200" />
                        <div className="flex items-center gap-2 text-gray-500">
                            <span className="text-sm font-medium">Powered by</span>
                            <span className="text-cg-sage font-semibold">CommonGround</span>
                        </div>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-black text-[#2D3436] mb-6 leading-[1.1] tracking-tight">
                        Recover. <br />
                        Refresh. <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4]">
                            Restore.
                        </span>
                    </h1>

                    <p className="text-xl text-gray-600 mb-8 max-w-lg leading-relaxed font-light">
                        Left Right 4 U Foundation partners with CommonGround to provide mothers facing breast cancer or domestic violence with <strong className="text-[#FF6B6B]">grant-funded access</strong> to secure, boundaried co-parenting tools. Focus on healing, not conflict.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                        <Button
                            onClick={scrollToGrant}
                            className="bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-bold h-14 px-8 text-lg shadow-lg shadow-[#FF6B6B]/20 transition-all hover:-translate-y-0.5"
                        >
                            Activate Grant Code
                        </Button>
                        <Button
                            variant="outline"
                            className="border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 h-14 px-8 text-lg"
                            onClick={() => window.open('https://www.leftright4u.org', '_blank')}
                        >
                            Learn About Our Mission
                        </Button>
                    </div>

                    <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
                        <HeartPulse className="h-4 w-4 text-[#FF6B6B]" />
                        Supporting BIPOC mothers in the Inland Empire since 2014.
                    </p>
                </div>

                {/* Right: Image */}
                <div className="relative h-[50vh] lg:h-auto order-1 lg:order-2 overflow-hidden group bg-[#FDF8F5]">
                    <img
                        src="/assets/marketing/lr4u_hero_nano_banana_1772567466304.png"
                        alt="Mother and child bonding in a warm uplifting environment"
                        className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-105"
                    />
                    {/* Stylized gradient overlay for text readability if needed, kept subtle for light theme */}
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-white opacity-80" />
                </div>
            </div>

            {/* Why This Partnership Exists */}
            <section className="py-24 px-6 bg-white border-y border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#4ECDC4]/10 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                <div className="max-w-4xl mx-auto text-center mb-16 relative z-10">
                    <h2 className="text-3xl md:text-4xl font-bold text-[#2D3436] mb-6">
                        Why Left Right 4 U × CommonGround works
                    </h2>
                    <p className="text-xl text-gray-600 leading-relaxed mb-8 font-light">
                        Left Right 4 U focuses on financial assistance, wellness, and holistic support so you can heal.
                        But recovering a sense of peace is difficult if digital communication remains a source of stress.
                    </p>
                    <p className="text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto font-light">
                        That is why we provide <strong className="text-[#4ECDC4]">CommonGround</strong>. It's calm technology that acts as a secure buffer. It blocks hostility, tracks medical appointments transparently, and manages expenses—allowing you to protect your peace and energy for the journey that matters most.
                    </p>
                    <div className="mt-12 p-8 bg-[#FDF8F5] rounded-3xl border border-[#FF6B6B]/10 inline-block shadow-sm">
                        <p className="text-lg font-semibold text-[#2D3436]">
                            "Every family deserves strength, resources, and hope." <br />
                            <span className="text-sm font-normal text-gray-500 mt-2 block">— Mishelle Leftridge, Founder</span>
                        </p>
                    </div>
                </div>
            </section>

            {/* What Mothers Get (Features) */}
            <section className="py-24 px-6 bg-[#FDF8F5] relative">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-[#2D3436] mb-4">
                            What you receive with CommonGround
                        </h2>
                        <p className="text-gray-600 max-w-2xl mx-auto text-lg font-light">
                            When your life is in recovery—your co-parenting system must be <strong className="text-[#FF6B6B]">secure, supportive, and completely boundaried.</strong>
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                icon: ShieldCheck,
                                title: "ARIA™ Toxicity Shield",
                                desc: "AI flags hostility before it escalates, giving you a calm communication buffer.",
                                color: "text-[#FF6B6B]",
                                bg: "bg-[#FF6B6B]/10"
                            },
                            {
                                icon: Clock,
                                title: "Medical Scheduling",
                                desc: "Share treatment times and child routines securely without endless texting.",
                                color: "text-[#4ECDC4]",
                                bg: "bg-[#4ECDC4]/10"
                            },
                            {
                                icon: Scale,
                                title: "Track Expenses",
                                desc: "Manage financial obligations transparently so money doesn't become a fight.",
                                color: "text-[#FFE66D]",
                                bg: "bg-[#FFE66D]/20"
                            },
                            {
                                icon: CheckCircle,
                                title: "Safe Documentation",
                                desc: "Maintain court-ready records to protect yourself from manipulation or gaslighting.",
                                color: "text-cg-sage",
                                bg: "bg-cg-sage/10"
                            }
                        ].map((item, idx) => (
                            <Card key={idx} className="bg-white border-transparent shadow-sm hover:shadow-xl hover:border-[#FF6B6B]/20 transition-all duration-300 group rounded-3xl">
                                <CardContent className="pt-8 p-8 h-full flex flex-col">
                                    <div className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                                        <item.icon className={`h-7 w-7 ${item.color}`} />
                                    </div>
                                    <h3 className="text-xl font-bold text-[#2D3436] mb-3">{item.title}</h3>
                                    <p className="text-gray-500 leading-relaxed text-sm font-light">
                                        {item.desc}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Grant Code Section */}
            <section id="grant-code-section" className="py-24 px-6 bg-white border-y border-gray-100">
                <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-[#2D3436] mb-6">Securing Your Access</h2>
                        <p className="text-gray-600 mb-8 leading-relaxed font-light">
                            Through the Left Right 4 U Foundation's programs, eligible mothers receive <strong>grant codes</strong> that fully cover the cost of CommonGround. What this means for you:
                        </p>
                        <ul className="space-y-4 mb-8">
                            {[
                                "Complete financial coverage—zero cost to you.",
                                "A safe space to communicate regarding your children.",
                                "A system designed to reduce conflict and protect mental health.",
                                "Empowerment to focus fully on treatment and recovery."
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-[#4ECDC4] shrink-0 mt-0.5" />
                                    <span className="text-gray-600 font-light">{item}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="bg-[#FDF8F5] rounded-2xl p-6 border border-[#FF6B6B]/10 shadow-sm">
                            <h4 className="text-[#2D3436] font-bold mb-4 flex items-center gap-2">
                                <ArrowRight className="h-4 w-4 text-[#FF6B6B]" />
                                The Process
                            </h4>
                            <div className="flex flex-wrap items-center gap-y-2 text-sm text-gray-500 font-medium">
                                <span>1. Connect with Left Right 4 U</span>
                                <span className="hidden sm:block h-px w-6 bg-gray-300 mx-3" />
                                <span className="sm:hidden w-full" />
                                <span>2. Receive Code</span>
                                <span className="hidden sm:block h-px w-6 bg-gray-300 mx-3" />
                                <span className="sm:hidden w-full" />
                                <span>3. Activate Here</span>
                            </div>
                        </div>
                    </div>

                    {/* Logic Box */}
                    <div className="bg-[#2D3436] border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFE66D]/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />

                        <h3 className="text-2xl font-bold text-white mb-6 relative z-10">Activate Access</h3>

                        <div className="space-y-5 relative z-10">
                            <label className="block text-sm font-medium text-[#4ECDC4] uppercase tracking-wider">
                                Enter 8-Digit Grant Code
                            </label>
                            <div className="flex gap-3">
                                <Input
                                    type="text"
                                    placeholder="LR4U0000"
                                    value={grantCode}
                                    onChange={(e) => {
                                        setGrantCode(e.target.value.toUpperCase());
                                        setCodeError(null);
                                        setCodeValid(false);
                                    }}
                                    className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 h-14 text-lg font-mono focus:border-[#4ECDC4] transition-colors rounded-xl"
                                    disabled={validating || codeValid}
                                />
                                <Button
                                    onClick={handleValidateCode}
                                    disabled={validating || codeValid}
                                    className="bg-[#4ECDC4] hover:bg-[#3dbdb4] text-gray-900 font-bold h-14 px-6 rounded-xl shadow-lg shadow-[#4ECDC4]/20 transition-transform hover:-translate-y-0.5"
                                >
                                    {validating ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                                </Button>
                            </div>

                            {codeError && (
                                <p className="text-[#FF6B6B] text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-1 bg-[#FF6B6B]/10 p-3 rounded-lg border border-[#FF6B6B]/20">
                                    <ShieldCheck className="h-4 w-4" />
                                    {codeError}
                                </p>
                            )}
                            {codeValid && (
                                <p className="text-[#4ECDC4] text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-1 bg-[#4ECDC4]/10 p-3 rounded-lg border border-[#4ECDC4]/20">
                                    <CheckCircle className="h-4 w-4" />
                                    Code verified! Setting up your secure account...
                                </p>
                            )}

                            <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                                This code provides uncompromising digital privacy and unlocks 6 months of CommonGround Complete.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Impact & Hero Image */}
            <section className="py-24 px-6 bg-[#FDF8F5] relative">
                <div className="max-w-5xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
                        <div className="relative rounded-[2rem] overflow-hidden aspect-square border border-gray-200/50 group shadow-lg bg-white">
                            <img
                                src="/assets/marketing/lr4u_impact_nano_banana_1772567479936.png"
                                alt="Abstract healing and protection"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                            />
                            {/* Inner glow for premium feel */}
                            <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(255,255,255,0.2)] pointer-events-none" />
                        </div>
                        <div className="space-y-6">
                            <h2 className="text-3xl font-bold text-[#2D3436] tracking-tight">Preserving peace during the hardest seasons</h2>
                            <p className="text-gray-600 leading-relaxed text-lg font-light">
                                A breast cancer diagnosis or the trauma of domestic violence drains emotional reserves. During these times, communication with a co-parent should not be another battleground.
                            </p>
                            <p className="text-gray-600 leading-relaxed text-lg font-light">
                                CommonGround provides the scaffolding for <strong>"parallel parenting"</strong>—a model where parents minimize contact while maintaining a high standard of child-focused organization. It is designed to <strong className="text-[#2D3436]">protect the mother's mental health</strong> while ensuring the children's schedules are met.
                            </p>
                            <div className="flex items-center gap-4 mt-8 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="h-12 w-12 bg-[#FF6B6B]/10 rounded-full flex items-center justify-center border border-[#FF6B6B]/20">
                                    <HeartPulse className="w-6 h-6 text-[#FF6B6B]" />
                                </div>
                                <p className="text-sm text-gray-700 font-medium leading-relaxed">Early Detection Saves Lives. <br /><span className="text-gray-500 font-light">Protecting peace saves families.</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="py-24 px-6 bg-[#2D3436] text-center relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#FF6B6B]/20 via-transparent to-transparent pointer-events-none" />

                <div className="max-w-2xl mx-auto relative z-10">
                    <h2 className="text-4xl font-black text-white mb-6 tracking-tight">Focus on healing. Let us handle the communication structure.</h2>
                    <p className="text-xl text-gray-300 mb-10 font-light leading-relaxed">
                        If you are a single mother facing breast cancer or domestic violence, Left Right 4 U Foundation is here to support your journey forward.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
                        <Button
                            className="bg-[#FFE66D] hover:bg-[#fcdb44] text-[#2D3436] font-bold h-14 px-8 text-lg rounded-xl shadow-lg shadow-[#FFE66D]/20 transition-transform hover:-translate-y-0.5"
                            onClick={() => window.open('https://www.leftright4u.org/services', '_blank')}
                        >
                            Request Assistance
                        </Button>
                        <Button
                            variant="outline"
                            className="border-gray-600 text-gray-200 hover:text-white hover:bg-gray-800 hover:border-gray-500 h-14 px-8 text-lg rounded-xl transition-all"
                            onClick={() => window.open('https://www.leftright4u.org', '_blank')}
                        >
                            Visit Left Right 4 U
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
