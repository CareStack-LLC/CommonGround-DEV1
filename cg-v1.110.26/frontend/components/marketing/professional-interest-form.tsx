'use client';

import { useState } from 'react';
import { Check, Scale, Building2, Users, Brain, Briefcase } from 'lucide-react';
import { trackDemoRequest } from '@/lib/analytics';

const roles = [
  { id: 'attorney', label: 'Attorney', icon: Scale },
  { id: 'mediator', label: 'Mediator', icon: Building2 },
  { id: 'gal', label: 'GAL / Evaluator', icon: Users },
  { id: 'therapist', label: 'Therapist', icon: Brain },
  { id: 'paralegal', label: 'Paralegal', icon: Briefcase },
];

interface ProfessionalInterestFormProps {
  source?: string;
  className?: string;
}

export function ProfessionalInterestForm({
  source = 'professionals_page',
  className = '',
}: ProfessionalInterestFormProps) {
  const [formState, setFormState] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'attorney',
    firm_name: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.email) return;

    setIsSubmitting(true);
    setError('');

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/v1/marketing/professional-interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formState,
          first_name: formState.first_name || undefined,
          last_name: formState.last_name || undefined,
          firm_name: formState.firm_name || undefined,
          source,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to submit');
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to submit');
      }

      setIsSubmitted(true);
      trackDemoRequest(formState.role, source);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div
        className={`text-center py-10 px-6 rounded-2xl bg-gradient-to-b from-[#3DAA8A]/10 to-transparent border-2 border-[#3DAA8A]/20 ${className}`}
      >
        <div className="w-14 h-14 bg-[#3DAA8A]/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-7 h-7 text-[#3DAA8A]" />
        </div>
        <h3
          className="text-xl font-semibold text-[#1E3A4A] mb-2"
          style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
        >
          We&apos;ll be in touch!
        </h3>
        <p className="text-gray-600">
          Our partnerships team will reach out within 24 hours to schedule your demo.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border-2 border-[#2D6A8F]/20 bg-gradient-to-b from-[#1E3A4A]/5 to-transparent p-6 sm:p-8 ${className}`}
    >
      <div className="text-center mb-6">
        <h3
          className="text-xl sm:text-2xl font-semibold text-[#1E3A4A] mb-2"
          style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
        >
          Request a Demo
        </h3>
        <p className="text-gray-600 text-sm sm:text-base">
          Free for professionals. See how CommonGround gives you verified, court-ready data.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-[#1E3A4A] mb-2">
            Your Role
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {roles.map((role) => {
              const Icon = role.icon;
              const isSelected = formState.role === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setFormState({ ...formState, role: role.id })}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    isSelected
                      ? 'border-[#3DAA8A] bg-[#3DAA8A]/5 text-[#3DAA8A]'
                      : 'border-gray-200 text-gray-600 hover:border-[#3DAA8A]/30'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {role.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Name Fields */}
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={formState.first_name}
            onChange={(e) => setFormState({ ...formState, first_name: e.target.value })}
            placeholder="First name"
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-[#1E3A4A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3DAA8A]/50 focus:border-transparent"
          />
          <input
            type="text"
            value={formState.last_name}
            onChange={(e) => setFormState({ ...formState, last_name: e.target.value })}
            placeholder="Last name"
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-[#1E3A4A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3DAA8A]/50 focus:border-transparent"
          />
        </div>

        {/* Email */}
        <input
          type="email"
          value={formState.email}
          onChange={(e) => setFormState({ ...formState, email: e.target.value })}
          placeholder="Work email"
          required
          className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-[#1E3A4A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3DAA8A]/50 focus:border-transparent"
        />

        {/* Firm */}
        <input
          type="text"
          value={formState.firm_name}
          onChange={(e) => setFormState({ ...formState, firm_name: e.target.value })}
          placeholder="Firm / Organization (optional)"
          className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-[#1E3A4A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3DAA8A]/50 focus:border-transparent"
        />

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#F5A623] text-white font-semibold px-6 py-3.5 rounded-lg transition-all duration-200 hover:bg-[#E09520] hover:shadow-lg disabled:opacity-50 text-base"
        >
          {isSubmitting ? 'Submitting...' : 'Request a Demo'}
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mt-3 text-center">{error}</p>}

      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Check className="w-3.5 h-3.5" />
          Free for professionals
        </span>
        <span className="flex items-center gap-1">
          <Check className="w-3.5 h-3.5" />
          No commitment required
        </span>
      </div>
    </div>
  );
}
