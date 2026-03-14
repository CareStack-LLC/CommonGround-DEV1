'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Mail,
  MessageSquare,
  Building2,
  Users,
  Gavel,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Clock,
  HelpCircle,
  Shield,
} from 'lucide-react';

/**
 * Contact Page
 *
 * Contact form with design system styling.
 */

const inquiryTypes = [
  {
    id: 'general',
    icon: HelpCircle,
    label: 'General Inquiry',
    description: 'Questions about CommonGround',
    color: 'var(--portal-primary)',
  },
  {
    id: 'support',
    icon: MessageSquare,
    label: 'Technical Support',
    description: 'Help with your account',
    color: '#F5A623',
  },
  {
    id: 'professional',
    icon: Users,
    label: 'Professional',
    description: 'Attorneys, GALs, mediators',
    color: 'var(--portal-primary)',
  },
  {
    id: 'court',
    icon: Gavel,
    label: 'Court/Enterprise',
    description: 'Organizational access',
    color: '#F5A623',
  },
  {
    id: 'security',
    icon: Shield,
    label: 'Security Issue',
    description: 'Report a vulnerability',
    color: 'var(--portal-primary)',
  },
];

function ContactForm() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type') || 'general';

  const [selectedType, setSelectedType] = useState(typeParam);
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7] via-white to-[#F5F9F9] flex items-center justify-center px-6">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-[var(--portal-primary)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-[var(--portal-primary)]" />
          </div>
          <h1
            className="text-3xl font-serif text-[#1E3A4A] mb-4"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Message Sent!
          </h1>
          <p className="text-gray-600 mb-8">
            Thank you for reaching out. We'll get back to you within 24 hours.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[var(--portal-primary)] font-medium hover:gap-3 transition-all"
          >
            Back to Home
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7] via-white to-[#F5F9F9]">
      {/* Hero */}
      <section className="pt-24 pb-12 sm:pt-32 sm:pb-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-serif text-[#1E3A4A] mb-4 leading-[1.1]"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Get in <span className="text-[#F5A623]">Touch</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Have questions? We're here to help. Choose your inquiry type below.
          </p>
        </div>
      </section>

      {/* Response Time */}
      <section className="pb-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 border-2 border-[var(--portal-primary)]/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--portal-primary)]/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-[var(--portal-primary)]" />
              </div>
              <div>
                <div className="font-semibold text-[#1E3A4A]">Support Hours</div>
                <div className="text-gray-600 text-sm">Mon-Fri, 9am-6pm PT</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#F5A623]/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-[#F5A623]" />
              </div>
              <div>
                <div className="font-semibold text-[#1E3A4A]">Response Time</div>
                <div className="text-gray-600 text-sm">Usually within 24 hours</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl p-8 border-2 border-[var(--portal-primary)]/10">
                {/* Inquiry Type Selection */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-[#1E3A4A] mb-4">
                    What can we help you with?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {inquiryTypes.map((type) => {
                      const Icon = type.icon;
                      const isSelected = selectedType === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setSelectedType(type.id)}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? 'border-[var(--portal-primary)] bg-[var(--portal-primary)]/5'
                              : 'border-gray-200 hover:border-[var(--portal-primary)]/30'
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 mb-2 ${
                              isSelected ? 'text-[var(--portal-primary)]' : 'text-gray-400'
                            }`}
                          />
                          <div className="font-medium text-[#1E3A4A] text-sm">{type.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-[#1E3A4A] mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        value={formState.name}
                        onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-[#1E3A4A] placeholder:text-gray-400 focus:outline-none focus:border-[var(--portal-primary)] transition-colors"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-[#1E3A4A] mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        required
                        value={formState.email}
                        onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-[#1E3A4A] placeholder:text-gray-400 focus:outline-none focus:border-[var(--portal-primary)] transition-colors"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-[#1E3A4A] mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      required
                      value={formState.subject}
                      onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-[#1E3A4A] placeholder:text-gray-400 focus:outline-none focus:border-[var(--portal-primary)] transition-colors"
                      placeholder="How can we help?"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-[#1E3A4A] mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={6}
                      value={formState.message}
                      onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-[#1E3A4A] placeholder:text-gray-400 focus:outline-none focus:border-[var(--portal-primary)] transition-colors resize-none"
                      placeholder="Tell us more about your inquiry..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-4 bg-[var(--portal-primary)] text-white font-semibold rounded-full hover:bg-[#2D6A8F] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Direct Email */}
              <div className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
                <h3
                  className="font-semibold text-[#1E3A4A] mb-4"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  Email Us Directly
                </h3>
                <div className="space-y-3">
                  <a
                    href="mailto:support@commonground.app"
                    className="flex items-center gap-3 text-sm text-gray-600 hover:text-[var(--portal-primary)] transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    support@commonground.app
                  </a>
                  <a
                    href="mailto:hello@commonground.app"
                    className="flex items-center gap-3 text-sm text-gray-600 hover:text-[var(--portal-primary)] transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    hello@commonground.app
                  </a>
                  <a
                    href="mailto:partnerships@commonground.app"
                    className="flex items-center gap-3 text-sm text-gray-600 hover:text-[var(--portal-primary)] transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    partnerships@commonground.app
                  </a>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-white rounded-2xl p-6 border-2 border-[var(--portal-primary)]/10">
                <h3
                  className="font-semibold text-[#1E3A4A] mb-4"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  Quick Links
                </h3>
                <ul className="space-y-3">
                  {[
                    { label: 'Help Center', href: '/help' },
                    { label: 'FAQ', href: '/help/faq' },
                    { label: 'Security', href: '/security' },
                    { label: 'Pricing', href: '/pricing' },
                  ].map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-[var(--portal-primary)] hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Enterprise CTA */}
              <div className="bg-gradient-to-br from-[var(--portal-primary)] to-[#2D6A8F] rounded-2xl p-6 text-white">
                <Building2 className="w-8 h-8 mb-4" />
                <h3
                  className="font-semibold text-lg mb-2"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  Enterprise Solutions
                </h3>
                <p className="text-sm text-white/80 mb-4">
                  Custom solutions for courts and organizations.
                </p>
                <Link
                  href="/pricing/courts"
                  className="inline-flex items-center gap-2 text-[#F5A623] font-medium text-sm hover:gap-3 transition-all"
                >
                  Learn more
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Urgent Support */}
      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-gradient-to-br from-[#F5A623]/10 to-[#F5A623]/5 rounded-3xl p-8 border-2 border-[#F5A623]/20 text-center">
            <AlertCircle className="w-10 h-10 text-[#F5A623] mx-auto mb-4" />
            <h3
              className="text-xl font-serif text-[#1E3A4A] mb-2"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              Need immediate help?
            </h3>
            <p className="text-gray-600 max-w-xl mx-auto">
              For urgent account access issues, email{' '}
              <a
                href="mailto:support@commonground.app"
                className="text-[#F5A623] font-medium hover:underline"
              >
                support@commonground.app
              </a>{' '}
              with "URGENT" in the subject line.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactFormFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7] via-white to-[#F5F9F9] flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense fallback={<ContactFormFallback />}>
      <ContactForm />
    </Suspense>
  );
}
