'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BrandIcon, type BrandIconName } from '@/components/brand/brand-icon';
import type { LucideIcon } from 'lucide-react';
import {
  UserPlus,
  Users,
  ArrowRight,
  Check,
  Zap,
  Shield,
  Clock,
} from 'lucide-react';

/**
 * How It Works Page
 *
 * Matches homepage design: DM Serif Display serif, warm colors, compelling copy
 */

const steps: {
  number: string;
  brandIcon?: BrandIconName;
  icon?: LucideIcon;
  title: string;
  description: string;
  color: string;
  iconColor: string;
}[] = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Sign up in 2 minutes',
    description: 'Create your account with just an email. No credit card. No commitments.',
    color: 'from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5',
    iconColor: 'text-[var(--portal-primary)]',
  },
  {
    number: '02',
    icon: Users,
    title: 'Invite your co-parent',
    description: 'They get a secure link. You both have equal access from day one.',
    color: 'from-[#F5A623]/10 to-[#F5A623]/5',
    iconColor: 'text-[#F5A623]',
  },
  {
    number: '03',
    brandIcon: 'agreement',
    title: 'Build your agreement',
    description: 'Our guided wizard covers everything—custody, holidays, expenses, communication.',
    color: 'from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5',
    iconColor: 'text-[var(--portal-primary)]',
  },
  {
    number: '04',
    brandIcon: 'aria',
    title: 'Communicate through ARIA',
    description: 'AI supports clarity and calm in every message. Communicate with confidence.',
    color: 'from-[#F5A623]/10 to-[#F5A623]/5',
    iconColor: 'text-[#F5A623]',
  },
  {
    number: '05',
    brandIcon: 'timebridge',
    title: 'Let automation do the rest',
    description: 'Schedules, reminders, expenses—all tracked. No more "who owes what" confusion.',
    color: 'from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5',
    iconColor: 'text-[var(--portal-primary)]',
  },
];

const benefits = [
  { icon: Zap, text: 'Setup takes 5 minutes' },
  { icon: Shield, text: 'Bank-level security' },
  { icon: Clock, text: 'Court-ready documentation' },
];

export function HowItWorksContent() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7] via-white to-[#F5F9F9]">
      {/* Hero */}
      <section className="pt-24 pb-16 sm:pt-32 sm:pb-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid items-center gap-10 lg:gap-14 lg:grid-cols-2">
            {/* Text */}
            <div className="text-center lg:text-left">
              <h1
                className="text-5xl sm:text-6xl lg:text-7xl font-serif text-[#1E3A4A] mb-6 leading-[1.05]"
                style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
              >
                From setup to
                <br />
                <span className="text-[#F5A623]">peace in 5 steps</span>
              </h1>
              <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0">
                Sign up, invite your co-parent, and let CommonGround
                <span className="font-medium text-[var(--portal-primary)]"> handle the coordination so you can focus on your children.</span>
              </p>

              <div className="mb-8 flex justify-center lg:justify-start">
                <Link
                  href="/early-access"
                  className="group inline-flex items-center justify-center px-8 py-4 bg-[var(--portal-primary)] text-white font-semibold rounded-full hover:bg-[#2D6A8F] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  Start free &mdash; no card needed
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-gray-500">
                {benefits.map((benefit) => {
                  const Icon = benefit.icon;
                  return (
                    <span key={benefit.text} className="flex items-center gap-1.5">
                      <Icon className="h-4 w-4 text-[var(--portal-primary)]" />
                      {benefit.text}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Image */}
            <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <Image
                src="/images/marketing/cg_howitworks_phone.jpg"
                alt="A parent using the CommonGround app on a phone at home"
                width={1200}
                height={800}
                priority
                className="w-full h-auto rounded-3xl shadow-xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="space-y-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="relative bg-white rounded-3xl p-8 border-2 border-gray-100 shadow-lg hover:shadow-xl hover:border-[var(--portal-primary)]/20 transition-all duration-300 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    {/* Number & Icon */}
                    <div className="flex items-center gap-4">
                      <span
                        className="text-6xl font-serif text-gray-100 group-hover:text-[var(--portal-primary)]/20 transition-colors"
                        style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                      >
                        {step.number}
                      </span>
                      <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                        {step.brandIcon ? (
                          <BrandIcon name={step.brandIcon} size={32} />
                        ) : Icon ? (
                          <Icon className={`h-8 w-8 ${step.iconColor}`} />
                        ) : null}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3
                        className="text-2xl font-semibold text-[#1E3A4A] mb-2"
                        style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                      >
                        {step.title}
                      </h3>
                      <p className="text-gray-600 text-lg">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Connector */}
                  {index < steps.length - 1 && (
                    <div className="hidden sm:block absolute -bottom-8 left-[4.5rem] w-0.5 h-8 bg-gradient-to-b from-gray-200 to-transparent" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-[var(--portal-primary)] to-[#2D6A8F] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2
            className="text-4xl sm:text-5xl font-serif mb-6"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Ready to find common ground?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Take the first step now. Create your account, invite your co-parent when you&apos;re ready, and let the coordination run itself.
          </p>
          <Link
            href="/early-access"
            className="inline-flex items-center justify-center px-10 py-5 bg-[#F5A623] text-white font-bold text-lg rounded-full hover:bg-[#E0951A] transition-all shadow-2xl hover:-translate-y-1 group"
          >
            Start free &mdash; no card needed
            <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-2 transition-transform" />
          </Link>
          <p className="text-sm text-white/60 mt-6">
            Free forever &middot; No credit card &middot; 2-minute setup &middot; Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}
