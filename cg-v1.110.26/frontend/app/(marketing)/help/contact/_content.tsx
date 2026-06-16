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
import { trackContactForm } from '@/lib/analytics';

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
    color: 'var(--cg-sage)',
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
    color: 'var(--cg-sage)',
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
    color: 'var(--cg-sage)',
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

  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/v1/marketing/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formState.name,
          email: formState.email,
          inquiry_type: selectedType,
          subject: formState.subject,
          message: formState.message,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to send message');
      }

      trackContactForm(selectedType);
      setIsSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cg-sand via-white to-cg-mist flex items-center justify-center px-6">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-cg-sage/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-cg-sage" />
          </div>
          <h1
            className="text-3xl font-serif text-foreground mb-4"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Message Sent!
          </h1>
          <p className="text-gray-600 mb-8">
            Thank you for reaching out. We'll get back to you within 24 hours.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-cg-sage font-medium hover:gap-3 transition-all"
          >
            Back to Home
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cg-sand via-white to-cg-mist">
      {/* Hero */}
      <section className="pt-24 pb-12 sm:pt-32 sm:pb-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-serif text-foreground mb-4 leading-[1.1]"
            style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
          >
            Get in <span className="text-cg-amber">Touch</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Have questions? We're here to help. Choose your inquiry type below.
          </p>
        </div>
      </section>

      {/* Response Time */}
      <section className="pb-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 border-2 border-cg-sage/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cg-sage/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-cg-sage" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Support Hours</div>
                <div className="text-gray-600 text-sm">Mon-Fri, 9am-6pm PT</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cg-amber/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-cg-amber" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Response Time</div>
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
              <div className="bg-white rounded-3xl p-8 border-2 border-cg-sage/10">
                {/* Inquiry Type Selection */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-foreground mb-4">
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
                              ? 'border-cg-sage bg-cg-sage/5'
                              : 'border-gray-200 hover:border-cg-sage/30'
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 mb-2 ${
                              isSelected ? 'text-cg-sage' : 'text-gray-400'
                            }`}
                          />
                          <div className="font-medium text-foreground text-sm">{type.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        value={formState.name}
                        onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-foreground placeholder:text-gray-400 focus:outline-none focus:border-cg-sage transition-colors"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        required
                        value={formState.email}
                        onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-foreground placeholder:text-gray-400 focus:outline-none focus:border-cg-sage transition-colors"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      required
                      value={formState.subject}
                      onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-foreground placeholder:text-gray-400 focus:outline-none focus:border-cg-sage transition-colors"
                      placeholder="How can we help?"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={6}
                      value={formState.message}
                      onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-foreground placeholder:text-gray-400 focus:outline-none focus:border-cg-sage transition-colors resize-none"
                      placeholder="Tell us more about your inquiry..."
                    />
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-sm text-red-700 font-medium">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-4 bg-cg-sage text-white font-semibold rounded-full hover:bg-cg-slate transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Direct Email */}
              <div className="bg-white rounded-2xl p-6 border-2 border-cg-sage/10">
                <h3
                  className="font-semibold text-foreground mb-4"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  Email Us Directly
                </h3>
                <div className="space-y-3">
                  <a
                    href="mailto:support@find-commonground.com"
                    className="flex items-center gap-3 text-sm text-gray-600 hover:text-cg-sage transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    support@find-commonground.com
                  </a>
                  <a
                    href="mailto:hello@find-commonground.com"
                    className="flex items-center gap-3 text-sm text-gray-600 hover:text-cg-sage transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    hello@find-commonground.com
                  </a>
                  <a
                    href="mailto:partnerships@find-commonground.com"
                    className="flex items-center gap-3 text-sm text-gray-600 hover:text-cg-sage transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    partnerships@find-commonground.com
                  </a>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-white rounded-2xl p-6 border-2 border-cg-sage/10">
                <h3
                  className="font-semibold text-foreground mb-4"
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
                        className="text-sm text-cg-sage hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Enterprise CTA */}
              <div className="bg-gradient-to-br from-cg-sage to-cg-slate rounded-2xl p-6 text-white">
                <Building2 className="w-8 h-8 mb-4" />
                <h3
                  className="font-semibold text-lg mb-2"
                  style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
                >
                  Professional Solutions
                </h3>
                <p className="text-sm text-white/80 mb-4">
                  Tools for attorneys, mediators, and family law professionals.
                </p>
                <Link
                  href="/professionals"
                  className="inline-flex items-center gap-2 text-cg-amber font-medium text-sm hover:gap-3 transition-all"
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
          <div className="bg-gradient-to-br from-cg-amber/10 to-cg-amber/5 rounded-3xl p-8 border-2 border-cg-amber/20 text-center">
            <AlertCircle className="w-10 h-10 text-cg-amber mx-auto mb-4" />
            <h3
              className="text-xl font-serif text-foreground mb-2"
              style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
            >
              Need immediate help?
            </h3>
            <p className="text-gray-600 max-w-xl mx-auto">
              For urgent account access issues, email{' '}
              <a
                href="mailto:support@find-commonground.com"
                className="text-cg-amber font-medium hover:underline"
              >
                support@find-commonground.com
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
    <div className="min-h-screen bg-gradient-to-b from-cg-sand via-white to-cg-mist flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>
  );
}

export function ContactContent() {
  return (
    <Suspense fallback={<ContactFormFallback />}>
      <ContactForm />
    </Suspense>
  );
}
