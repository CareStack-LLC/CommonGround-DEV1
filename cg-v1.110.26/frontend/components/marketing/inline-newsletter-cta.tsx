'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';

interface InlineNewsletterCtaProps {
  source: string;
  headline?: string;
  subtext?: string;
  className?: string;
  variant?: 'default' | 'compact' | 'banner';
}

/**
 * Inline newsletter CTA for embedding in blog posts, pricing pages, etc.
 * Submits to the same /api/v1/marketing/newsletter endpoint with page-specific source.
 */
export function InlineNewsletterCta({
  source,
  headline = 'Get co-parenting tips in your inbox',
  subtext = 'Practical advice, product updates, and resources — delivered weekly.',
  className = '',
  variant = 'default',
}: InlineNewsletterCtaProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setError('');

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/v1/marketing/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to subscribe');
      }

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
      <div className={`text-center py-6 px-6 rounded-2xl bg-[#3DAA8A]/5 border border-[#3DAA8A]/20 ${className}`}>
        <p className="text-[#3DAA8A] font-semibold text-lg">You&apos;re subscribed!</p>
        <p className="text-gray-600 text-sm mt-1">Check your inbox for a welcome email.</p>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`rounded-xl bg-[#F4F8F7] border border-[#3DAA8A]/15 p-5 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-4 h-4 text-[#3DAA8A]" />
          <span className="font-semibold text-[#1E3A4A] text-sm">{headline}</span>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-[#1E3A4A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3DAA8A]/50 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#3DAA8A] text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-[#2D8A6E] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {isSubmitting ? '...' : 'Subscribe'}
          </button>
        </form>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`rounded-2xl bg-gradient-to-br from-[#1E3A4A] to-[#2D6A8F] p-6 sm:p-8 text-center ${className}`}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#3DAA8A] via-[#F5A623] to-[#3DAA8A] rounded-t-2xl" />
        <Mail className="w-8 h-8 text-[#F5A623] mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
          {headline}
        </h3>
        <p className="text-white/70 text-sm mb-5 max-w-md mx-auto">{subtext}</p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#3DAA8A] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#2D8A6E] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {isSubmitting ? 'Subscribing...' : 'Subscribe'}
          </button>
        </form>
        {error && <p className="text-xs text-red-300 mt-2">{error}</p>}
        <p className="text-white/40 text-xs mt-3">No spam. Unsubscribe anytime.</p>
      </div>
    );
  }

  // Default variant
  return (
    <div className={`rounded-2xl bg-gradient-to-br from-[#F4F8F7] to-white border-2 border-[#3DAA8A]/15 p-6 sm:p-8 text-center ${className}`}>
      <div className="w-12 h-12 bg-[#3DAA8A]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
        <Mail className="w-6 h-6 text-[#3DAA8A]" />
      </div>
      <h3
        className="text-xl font-semibold text-[#1E3A4A] mb-2"
        style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
      >
        {headline}
      </h3>
      <p className="text-gray-600 text-sm mb-5 max-w-md mx-auto">{subtext}</p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          className="flex-1 px-4 py-3 rounded-lg border border-gray-200 bg-white text-[#1E3A4A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3DAA8A]/50 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#3DAA8A] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#2D8A6E] transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {isSubmitting ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      <p className="text-gray-400 text-xs mt-3">No spam. Unsubscribe anytime.</p>
    </div>
  );
}
