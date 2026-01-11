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
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Clock,
} from 'lucide-react';

/**
 * Contact Page
 *
 * Contact form with different inquiry types.
 */

const inquiryTypes = [
  {
    id: 'general',
    icon: HelpCircle,
    label: 'General Inquiry',
    description: 'Questions about CommonGround',
  },
  {
    id: 'support',
    icon: MessageSquare,
    label: 'Technical Support',
    description: 'Help with your account or features',
  },
  {
    id: 'professional',
    icon: Users,
    label: 'Professional Inquiry',
    description: 'For attorneys, GALs, mediators',
  },
  {
    id: 'court',
    icon: Gavel,
    label: 'Court/Enterprise',
    description: 'For courts and large organizations',
  },
  {
    id: 'security',
    icon: AlertCircle,
    label: 'Security Issue',
    description: 'Report a vulnerability',
  },
];

const contactMethods = [
  {
    icon: Mail,
    title: 'Email',
    value: 'hello@commonground.app',
    description: 'We\'ll respond within 24 hours',
  },
  {
    icon: Clock,
    title: 'Hours',
    value: 'Mon-Fri, 9am-6pm PT',
    description: 'Support available during business hours',
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

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="bg-background min-h-[80vh] flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-cg-sage-subtle rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-cg-sage" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-4">
            Message Sent!
          </h1>
          <p className="text-muted-foreground mb-8">
            Thank you for reaching out. We&apos;ll get back to you within 24 hours.
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
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-cg-sage/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-semibold text-foreground mb-6">
              Get in Touch
            </h1>
            <p className="text-xl text-muted-foreground">
              Have questions? We&apos;re here to help. Choose your inquiry type below.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Form */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-2xl p-8 border border-border/50">
                {/* Inquiry Type Selection */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-foreground mb-4">
                    What can we help you with?
                  </label>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {inquiryTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setSelectedType(type.id)}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            selectedType === type.id
                              ? 'border-cg-sage bg-cg-sage-subtle'
                              : 'border-border/50 hover:border-cg-sage/30'
                          }`}
                        >
                          <Icon className={`w-5 h-5 mb-2 ${
                            selectedType === type.id ? 'text-cg-sage' : 'text-muted-foreground'
                          }`} />
                          <div className="font-medium text-foreground text-sm">
                            {type.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {type.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Contact Form */}
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
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent"
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
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent"
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
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent"
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
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cg-sage focus:border-transparent resize-none"
                      placeholder="Tell us more about your inquiry..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto bg-cg-sage text-white font-medium px-8 py-3 rounded-full transition-all duration-200 hover:bg-cg-sage-light hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              </div>
            </div>

            {/* Contact Info Sidebar */}
            <div className="space-y-6">
              {contactMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <div
                    key={method.title}
                    className="bg-card rounded-xl p-6 border border-border/50"
                  >
                    <Icon className="w-6 h-6 text-cg-sage mb-3" />
                    <h3 className="font-semibold text-foreground mb-1">{method.title}</h3>
                    <div className="text-foreground mb-1">{method.value}</div>
                    <div className="text-sm text-muted-foreground">{method.description}</div>
                  </div>
                );
              })}

              {/* Quick Links */}
              <div className="bg-card rounded-xl p-6 border border-border/50">
                <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/help" className="text-cg-sage hover:underline">
                      Help Center
                    </Link>
                  </li>
                  <li>
                    <Link href="/how-it-works" className="text-cg-sage hover:underline">
                      How It Works
                    </Link>
                  </li>
                  <li>
                    <Link href="/pricing" className="text-cg-sage hover:underline">
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link href="/security" className="text-cg-sage hover:underline">
                      Security
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Enterprise CTA */}
              <div className="bg-cg-sage-subtle rounded-xl p-6 border border-cg-sage/20">
                <Building2 className="w-6 h-6 text-cg-sage mb-3" />
                <h3 className="font-semibold text-foreground mb-2">Enterprise Solutions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Looking for custom solutions for your organization or court system?
                </p>
                <Link
                  href="/pricing/courts"
                  className="inline-flex items-center gap-2 text-cg-sage font-medium text-sm hover:gap-3 transition-all"
                >
                  Learn more
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactFormFallback() {
  return (
    <div className="bg-background min-h-[60vh] flex items-center justify-center">
      <div className="text-muted-foreground">Loading...</div>
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
