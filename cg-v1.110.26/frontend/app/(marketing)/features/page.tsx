'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';
import {
  MessageSquare,
  Calendar,
  DollarSign,
  Video,
  MapPin,
  Clock,
  FileCheck,
  Shield,
  Bell,
  CheckCircle
} from 'lucide-react';

export default function FeaturesPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const features = [
    {
      icon: MessageSquare,
      problem: "Every message turns into a fight",
      solution: "ARIA flags toxic language before you hit send",
      detail: "No rewrites. No suggestions. Just awareness. Our AI catches hostile, passive-aggressive, and inflammatory language so you can rethink before it escalates. Keep communication civil without censorship.",
      benefit: "87% reduction in hostile messages",
      color: "#D97757"
    },
    {
      icon: Calendar,
      problem: "Coordinating schedules is exhausting",
      solution: "Set your custody schedule once, never touch it again",
      detail: "TimeBridge automates recurring pickups, dropoffs, holidays, and special events. Both parents get reminders. No more \"did you forget it's your weekend?\" texts at 6 PM Friday.",
      benefit: "Zero coordination required",
      color: "var(--portal-primary)"
    },
    {
      icon: DollarSign,
      problem: "Money fights never end",
      solution: "Track every dollar, split costs automatically",
      detail: "ClearFund handles school fees, medical bills, extracurriculars. Upload receipts, set split percentages, track payments. No fees. No arguing. Just clear records for court if you need them.",
      benefit: "100% payment transparency",
      color: "#D97757"
    },
    {
      icon: Video,
      problem: "Calling the kids means coordinating with your ex",
      solution: "Video call your kids directly, no middleman",
      detail: "KidsCom gives you a direct line to your children. Schedule calls on your parenting time or with approval. High-quality video, recording for safety, and logs for your records.",
      benefit: "Stay connected on your terms",
      color: "var(--portal-primary)"
    },
    {
      icon: MapPin,
      problem: "Exchanges are tense and confrontational",
      solution: "Silent Handoff: contactless exchanges with GPS proof",
      detail: "Drop off at a public location. GPS confirms arrival. QR code confirms pickup. Zero interaction required. Complete records of every exchange with timestamps and locations.",
      benefit: "Verified exchanges, zero conflict",
      color: "#D97757"
    },
    {
      icon: Clock,
      problem: "Tracking parenting time for court is a nightmare",
      solution: "Automatic custody tracking down to the day",
      detail: "Every exchange, every overnight, every hour tracked automatically. Generate reports showing exactly who had the kids when. Court-ready analytics that hold up under scrutiny.",
      benefit: "Accurate time records for court",
      color: "var(--portal-primary)"
    },
    {
      icon: FileCheck,
      problem: "Gathering evidence for court takes forever",
      solution: "One-click court-ready evidence packages",
      detail: "Export messages, schedules, expenses, custody time, and exchange logs in court-accepted formats. SHA-256 verification proves authenticity. Everything organized and timestamped.",
      benefit: "Professional evidence bundles",
      color: "#D97757"
    }
  ];

  const trustPoints = [
    { icon: Shield, text: "Bank-level encryption" },
    { icon: Bell, text: "Automated reminders" },
    { icon: CheckCircle, text: "Court-admissible records" },
  ];

  return (
    <div className="min-h-screen bg-[#FFF8F3]">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--portal-primary)] rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#D97757] rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-serif text-[#2C3E50] mb-6 leading-[1.05]"
            style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
          >
            Built for parents who
            <br />
            <span className="text-[var(--portal-primary)]">aren't talking</span>
          </h1>

          <p className="text-xl sm:text-2xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
            Every feature solves one problem:{' '}
            <span className="font-medium text-[#D97757]">
              less coordination, fewer fights, more automation.
            </span>
          </p>

          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            {trustPoints.map((point, idx) => {
              const Icon = point.icon;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-full backdrop-blur-sm"
                  style={{
                    animationDelay: `${idx * 100}ms`,
                    animation: 'fadeIn 0.6s ease-out forwards',
                    opacity: 0
                  }}
                >
                  <Icon className="w-4 h-4 text-[var(--portal-primary)]" />
                  <span>{point.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="group relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300"
                  style={{
                    animationDelay: `${idx * 100}ms`,
                    animation: 'slideUp 0.6s ease-out forwards',
                    opacity: 0
                  }}
                >
                  {/* Icon Badge */}
                  <div
                    className="inline-flex p-3 rounded-xl mb-4 transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: `${feature.color}20` }}
                  >
                    <Icon
                      className="w-6 h-6"
                      style={{ color: feature.color }}
                    />
                  </div>

                  {/* Problem */}
                  <h3 className="text-lg font-medium text-gray-500 mb-2 line-through decoration-[#D97757]/30">
                    {feature.problem}
                  </h3>

                  {/* Solution */}
                  <h2
                    className="text-2xl sm:text-3xl font-serif text-[#2C3E50] mb-4 leading-tight"
                    style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
                  >
                    {feature.solution}
                  </h2>

                  {/* Detail */}
                  <p className="text-gray-600 leading-relaxed mb-4">
                    {feature.detail}
                  </p>

                  {/* Benefit Badge */}
                  <div
                    className="inline-block px-4 py-2 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: `${feature.color}15`,
                      color: feature.color
                    }}
                  >
                    ✓ {feature.benefit}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-[var(--portal-primary)] to-[#234846] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#D97757] rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <h2
            className="text-4xl sm:text-5xl font-serif mb-6 leading-tight"
            style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
          >
            The less you have to talk,
            <br />
            <span className="text-[#D97757]">the less you have to fight</span>
          </h2>

          <p className="text-xl text-white/80 mb-8 leading-relaxed max-w-2xl mx-auto">
            We don't try to fix your relationship. We just remove the reasons to interact.
            Schedules run themselves. Money tracks itself. The kids stay connected.
          </p>

          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto">
            Everything you need. Nothing you don't. No forced mediation. No relationship coaching.
            Just tools that work when you're not.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="text-4xl sm:text-5xl font-serif text-[#2C3E50] mb-6"
            style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
          >
            Ready to stop fighting?
          </h2>

          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Start with a free account. No credit card. No pressure.
            Just see if automation beats coordination.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/signup')}
              className="px-8 py-4 bg-[var(--portal-primary)] text-white rounded-xl font-medium text-lg hover:bg-[#234846] transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Start Free
            </button>
            <button
              onClick={() => router.push('/pricing')}
              className="px-8 py-4 bg-white text-[var(--portal-primary)] rounded-xl font-medium text-lg hover:bg-gray-50 transition-all duration-200 border-2 border-[var(--portal-primary)]"
            >
              View Pricing
            </button>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            Free tier includes ARIA messaging, basic scheduling, and ClearFund tracking.
            No fees.
          </p>
        </div>
      </section>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
