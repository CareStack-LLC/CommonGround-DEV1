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

    const scrollToGrant = () => {
        document.getElementById('grant-code-section')?.scrollIntoView({ behavior: 'smooth' });
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
                        Strong fathers. <br />
                        Safer families. <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                            Calmer co-parenting.
                        </span>
                    </h1>

                    <p className="text-xl text-gray-400 mb-8 max-w-lg leading-relaxed">
                        Forever Forward is partnering with CommonGround to give fathers in need <strong className="text-white">grant-funded access</strong> to tools that reduce conflict, protect kids from adult drama, and help families stay stable—on and off the court calendar.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                        <Button
                            onClick={scrollToGrant}
                            className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold h-14 px-8 text-lg"
                        >
                            Get a Grant Code
                        </Button>
                        <Button
                            variant="outline"
                            className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 h-14 px-8 text-lg"
                            onClick={() => window.open('https://foreverforwardsite.vercel.app', '_blank')}
                        >
                            Learn How It Works
                        </Button>
                    </div>

                    <p className="text-sm text-gray-500 font-medium">
                        Built for real life—when you’re trying to lead at home <em className="text-gray-400">and</em> rebuild your future.
                    </p>
                </div>

                {/* Right: Image */}
                <div className="relative h-[50vh] lg:h-auto order-1 lg:order-2 overflow-hidden group">
                    <img
                        src="/assets/marketing/forever-forward-hero.png"
                        alt="Father and son bonding"
                        className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-gray-900" />
                </div>
            </div>

            {/* Why This Partnership Exists */}
            <section className="py-24 px-6 bg-gray-900 border-t border-gray-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                <div className="max-w-4xl mx-auto text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        Why Forever Forward × CommonGround works
                    </h2>
                    <p className="text-xl text-gray-400 leading-relaxed mb-8">
                        Forever Forward helps fathers build <strong className="text-amber-400">strength, safety, and smart skills</strong>—because the digital era is moving fast, and families deserve leaders who aren't getting left behind.
                    </p>
                    <p className="text-lg text-gray-400 leading-relaxed max-w-3xl mx-auto">
                        But even the strongest dads can get pulled into chaos when co-parenting turns into constant arguments, misunderstandings, and stress. <br /><br />
                        That's where <strong className="text-cg-sage">CommonGround</strong> comes in. It's calm technology for complex family communication: helping parents communicate clearly, track schedules, and create reliable records—so the focus stays on the child, not the conflict.
                    </p>
                    <div className="mt-12 p-6 bg-gray-800/50 rounded-2xl border border-gray-700/50 inline-block">
                        <p className="text-lg font-bold text-white">
                            Forever Forward builds the man. CommonGround protects the moment-to-moment family system.
                        </p>
                    </div>
                </div>
            </section>

            {/* What Dads Get (Features) */}
            <section className="py-24 px-6 bg-gray-900 relative">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            What dads get inside CommonGround
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                            When your life is rebuilding—your co-parenting system needs to be <strong className="text-white">simple, organized, and calm.</strong>
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                icon: MessageSquare,
                                title: "Calm messaging support",
                                desc: "So conversations don't spiral.",
                                color: "text-amber-400",
                                bg: "bg-amber-500/10"
                            },
                            {
                                icon: Clock,
                                title: "Shared scheduling",
                                desc: "So pickups, school, and routines stay clear.",
                                color: "text-orange-400",
                                bg: "bg-orange-500/10"
                            },
                            {
                                icon: Scale,
                                title: "Expenses & responsibilities",
                                desc: "So money doesn't become another fight.",
                                color: "text-amber-400",
                                bg: "bg-amber-500/10"
                            },
                            {
                                icon: CheckCircle,
                                title: "Court-ready documentation",
                                desc: "When you need clean records and less he-said/she-said.",
                                color: "text-white",
                                bg: "bg-gray-700/50"
                            }
                        ].map((item, idx) => (
                            <Card key={idx} className="bg-gray-800 border-gray-700 hover:border-amber-500/50 transition-colors group">
                                <CardContent className="pt-8 p-8 h-full flex flex-col">
                                    <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                        <item.icon className={`h-6 w-6 ${item.color}`} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-3">{item.title}</h3>
                                    <p className="text-gray-400 leading-relaxed text-sm">
                                        {item.desc}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <p className="text-center text-gray-500 mt-12 italic">
                        It's not about "winning." It's about keeping your kids out of the blast radius.
                    </p>
                </div>
            </section>

            {/* Grant Code Section */}
            <section id="grant-code-section" className="py-24 px-6 bg-gray-800/30 border-y border-gray-800">
                <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-6">What the Grant Code covers</h2>
                        <p className="text-gray-300 mb-8 leading-relaxed">
                            Through this partnership, Forever Forward can provide <strong>grant codes</strong> that unlock CommonGround for fathers and families who need support. That means:
                        </p>
                        <ul className="space-y-4 mb-8">
                            {[
                                "No-cost access for qualified families",
                                "A healthier way to communicate with a co-parent",
                                "Less escalation, fewer blow-ups, more structure",
                                "Tools that support stability at home while dads level up in life"
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                    <span className="text-gray-300">{item}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
                            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                                <ArrowRight className="h-4 w-4 text-amber-500" />
                                How it works
                            </h4>
                            <div className="flex items-center justify-between text-sm text-gray-400">
                                <span>1. Apply via Forever Forward</span>
                                <span className="h-px w-8 bg-gray-700 mx-2" />
                                <span>2. Receive Code</span>
                                <span className="h-px w-8 bg-gray-700 mx-2" />
                                <span>3. Activate Here</span>
                            </div>
                        </div>
                    </div>

                    {/* Logic Box */}
                    <div className="bg-gray-900 border border-gray-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />

                        <h3 className="text-xl font-bold text-white mb-6 relative z-10">Have a code? Activate it now.</h3>

                        <div className="space-y-4 relative z-10">
                            <label className="block text-sm font-medium text-amber-400 uppercase tracking-wider">
                                Enter Member Grant Code
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    type="text"
                                    placeholder="FORWARD2024"
                                    value={grantCode}
                                    onChange={(e) => {
                                        setGrantCode(e.target.value.toUpperCase());
                                        setCodeError(null);
                                        setCodeValid(false);
                                    }}
                                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-600 h-12 text-lg font-mono focus:border-amber-500 transition-colors"
                                    disabled={validating || codeValid}
                                />
                                <Button
                                    onClick={handleValidateCode}
                                    disabled={validating || codeValid}
                                    className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold h-12 px-6"
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
                </div>
            </section>

            {/* Impact & Hero Image */}
            <section className="py-24 px-6 bg-gray-900 relative">
                <div className="max-w-5xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
                        <div className="order-2 md:order-1 relative rounded-3xl overflow-hidden aspect-square border border-gray-700/50 group">
                            <img
                                src="/assets/marketing/empowering_father_son.png"
                                alt="Father and son connection"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60" />
                            <div className="absolute bottom-8 left-8 right-8">
                                <h3 className="text-2xl font-bold text-white mb-2">Real outcomes we can track together</h3>
                                <p className="text-gray-300 text-sm">
                                    Reduced conflict trends, increased consistency, and verified engagement. This partnership isn't just "good intentions." It's measurable.
                                </p>
                            </div>
                        </div>
                        <div className="order-1 md:order-2 space-y-6">
                            <h2 className="text-3xl font-bold text-white">What this protects (and why it matters)</h2>
                            <p className="text-gray-400 leading-relaxed text-lg">
                                Kids don't need perfect parents. They need <strong className="text-white">consistent, emotionally safe environments</strong>. When co-parent communication stays respectful and structured, children deal with less tension—and families can actually breathe again.
                            </p>
                            <p className="text-gray-400 leading-relaxed text-lg">
                                Forever Forward exists to help families lead—not just survive—and CommonGround helps make that leadership visible in everyday moments: pickup coordination, school updates, medical notes, and the hard conversations that usually explode.
                            </p>
                            <div className="flex items-center gap-4 mt-6">
                                <div className="h-12 w-12 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700">
                                    <img src="/assets/marketing/premium_document_icon.png" className="w-8 h-8 object-contain" alt="Security" />
                                </div>
                                <p className="text-sm text-gray-500 font-medium">Better data → stronger funding stories → more families served.</p>
                            </div>
                        </div>
                    </div>

                    {/* Who is this for */}
                    <div className="bg-gray-800/30 border border-gray-800 rounded-3xl p-8 md:p-12 text-center max-w-3xl mx-auto">
                        <h2 className="text-2xl font-bold text-white mb-8">This is for fathers who are...</h2>
                        <div className="grid md:grid-cols-3 gap-6 text-left">
                            {[
                                "Focused on their kids, but stuck in constant conflict",
                                "Rebuilding stability (career, housing, routine)",
                                "Serious about growth—and willing to use tools to keep things respectful"
                            ].map((item, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                        <span className="text-amber-500 font-bold text-sm">{i + 1}</span>
                                    </div>
                                    <p className="text-gray-300 text-sm">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="py-24 px-6 bg-gradient-to-b from-gray-900 to-black border-t border-gray-800 text-center">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-4xl font-black text-white mb-6">Ready to get support?</h2>
                    <p className="text-xl text-gray-400 mb-10">
                        If you're a father who could benefit from grant-funded access, Forever Forward can help you take the next step.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
                        <Button
                            className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold h-14 px-8 text-lg rounded-xl"
                            onClick={() => window.open('https://foreverforwardsite.vercel.app', '_blank')}
                        >
                            Apply for a Grant Code
                        </Button>
                        <Button
                            variant="outline"
                            className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 h-14 px-8 text-lg rounded-xl"
                            onClick={() => window.open('https://foreverforwardsite.vercel.app', '_blank')}
                        >
                            Visit Forever Forward
                        </Button>
                    </div>
                    <p className="text-sm text-gray-600">
                        Already a Forever Forward member? Ask your program lead about CommonGround access.
                    </p>
                </div>
            </section>
        </div>
    );
}
