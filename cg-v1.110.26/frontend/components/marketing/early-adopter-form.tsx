'use client';

import { useState } from 'react';
import { trackEarlyAdopterSignup } from '@/lib/analytics';

interface EarlyAdopterFormProps {
  source: string;
  className?: string;
}

export function EarlyAdopterForm({ source, className = '' }: EarlyAdopterFormProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
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
      const res = await fetch(`${API_URL}/api/v1/marketing/early-adopter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          first_name: firstName || undefined,
          source: `early_adopter_${source}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to sign up');
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to sign up');
      }

      trackEarlyAdopterSignup(source);
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
      <div className={`text-center py-8 px-6 rounded-2xl bg-gradient-to-b from-cg-amber/10 to-transparent border border-cg-amber/30 ${className}`}>
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-xl font-semibold text-foreground font-serif mb-2">
          You&apos;re on the list!
        </h3>
        <p className="text-muted-foreground">
          We&apos;ll reach out soon with your exclusive early adopter offer.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border-2 border-cg-amber/40 bg-gradient-to-b from-cg-amber/5 to-transparent p-6 sm:p-8 ${className}`}>
      <div className="text-center mb-6">
        <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider uppercase bg-cg-amber/15 text-[#E09520] rounded-full mb-3">
          Limited Spots
        </span>
        <h3 className="text-xl sm:text-2xl font-semibold text-foreground font-serif mb-2">
          Be One of the First 50
        </h3>
        <p className="text-muted-foreground text-sm sm:text-base">
          Early adopters get <span className="font-semibold text-[#E09520]">30% off for life</span> — locked in for 36 months on any paid plan.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 max-w-md mx-auto">
        <input aria-label="First name"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name (optional)"
          className="w-full px-4 py-3 rounded-lg border border-cg-sage/20 bg-white text-foreground placeholder:text-[#6B8A9A] focus:outline-none focus:ring-2 focus:ring-cg-sage/40 focus:border-transparent"
        />
        <input aria-label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          required
          className="w-full px-4 py-3 rounded-lg border border-cg-sage/20 bg-white text-foreground placeholder:text-[#6B8A9A] focus:outline-none focus:ring-2 focus:ring-cg-sage/40 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-cg-sage text-white font-semibold px-6 py-3.5 rounded-lg transition-all duration-200 hover:bg-cg-sage-light hover:shadow-lg disabled:opacity-50 text-base"
        >
          {isSubmitting ? 'Securing your spot...' : 'Claim My Early Adopter Spot'}
        </button>
      </form>

      {error && (
        <p className="text-sm text-[#C53030] mt-3 text-center">{error}</p>
      )}

      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          No credit card required
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          Cancel anytime
        </span>
      </div>
    </div>
  );
}
