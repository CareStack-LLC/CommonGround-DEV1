'use client';

import { useState } from 'react';
import {
  Check,
  Heart,
  Building2,
  Scale,
  Users,
  BookOpen,
  Send,
} from 'lucide-react';
import { trackPartnershipInquiry } from '@/lib/analytics';

const orgTypes = [
  { id: 'nonprofit', label: 'Nonprofit', icon: Heart },
  { id: 'family_services', label: 'Family Services', icon: Users },
  { id: 'legal_aid', label: 'Legal Aid', icon: Scale },
  { id: 'dv_shelter', label: 'DV / Shelter', icon: Building2 },
  { id: 'faith_community', label: 'Faith / Community', icon: BookOpen },
];

interface PartnershipInquiryFormProps {
  source?: string;
  className?: string;
}

export function PartnershipInquiryForm({
  source = 'grant_partnership_page',
  className = '',
}: PartnershipInquiryFormProps) {
  const [formState, setFormState] = useState({
    email: '',
    first_name: '',
    last_name: '',
    org_name: '',
    org_type: 'nonprofit',
    families_served: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.email || !formState.org_name) return;

    setIsSubmitting(true);
    setError('');

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(
        `${API_URL}/api/v1/marketing/partnership-inquiry`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formState,
            first_name: formState.first_name || undefined,
            last_name: formState.last_name || undefined,
            families_served: formState.families_served || undefined,
            message: formState.message || undefined,
            source,
          }),
        }
      );

      if (!res.ok) {
        // If the API endpoint doesn't exist yet, fall back to mailto
        if (res.status === 404) {
          window.location.href = `mailto:partnerships@find-commonground.com?subject=Partnership Inquiry from ${encodeURIComponent(formState.org_name)}&body=${encodeURIComponent(
            `Name: ${formState.first_name} ${formState.last_name}\nOrganization: ${formState.org_name}\nType: ${formState.org_type}\nFamilies served: ${formState.families_served || 'Not specified'}\nEmail: ${formState.email}\n\n${formState.message || ''}`
          )}`;
          setIsSubmitted(true);
          trackPartnershipInquiry(formState.org_type, source);
          return;
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to submit');
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to submit');
      }

      setIsSubmitted(true);
      trackPartnershipInquiry(formState.org_type, source);
    } catch (err: unknown) {
      // Fallback to mailto on any error
      window.location.href = `mailto:partnerships@find-commonground.com?subject=Partnership Inquiry from ${encodeURIComponent(formState.org_name)}&body=${encodeURIComponent(
        `Name: ${formState.first_name} ${formState.last_name}\nOrganization: ${formState.org_name}\nType: ${formState.org_type}\nFamilies served: ${formState.families_served || 'Not specified'}\nEmail: ${formState.email}\n\n${formState.message || ''}`
      )}`;
      setIsSubmitted(true);
      trackPartnershipInquiry(formState.org_type, source);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div
        className={`text-center py-12 px-6 rounded-2xl bg-gradient-to-b from-cg-sage/10 to-transparent border-2 border-cg-sage/20 ${className}`}
      >
        <div className="w-16 h-16 bg-cg-sage/15 rounded-full flex items-center justify-center mx-auto mb-5">
          <Check className="w-8 h-8 text-cg-sage" />
        </div>
        <h3
          className="text-2xl font-semibold text-foreground mb-3"
          style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}
        >
          We&rsquo;ll be in touch!
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Our partnerships team will reach out within 48 hours to schedule a
          discovery call and learn more about your organization.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Organization Type */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Organization Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {orgTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = formState.org_type === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() =>
                    setFormState({ ...formState, org_type: type.id })
                  }
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    isSelected
                      ? 'border-cg-sage bg-cg-sage/5 text-cg-sage'
                      : 'border-gray-200 text-gray-600 hover:border-cg-sage/30'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Org Name */}
        <input
          type="text"
          value={formState.org_name}
          onChange={(e) =>
            setFormState({ ...formState, org_name: e.target.value })
          }
          placeholder="Organization name *"
          required
          className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cg-sage/50 focus:border-transparent"
        />

        {/* Name Fields */}
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={formState.first_name}
            onChange={(e) =>
              setFormState({ ...formState, first_name: e.target.value })
            }
            placeholder="Your first name"
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cg-sage/50 focus:border-transparent"
          />
          <input
            type="text"
            value={formState.last_name}
            onChange={(e) =>
              setFormState({ ...formState, last_name: e.target.value })
            }
            placeholder="Your last name"
            className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cg-sage/50 focus:border-transparent"
          />
        </div>

        {/* Email */}
        <input
          type="email"
          value={formState.email}
          onChange={(e) =>
            setFormState({ ...formState, email: e.target.value })
          }
          placeholder="Work email *"
          required
          className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cg-sage/50 focus:border-transparent"
        />

        {/* Families served */}
        <input
          type="text"
          value={formState.families_served}
          onChange={(e) =>
            setFormState({ ...formState, families_served: e.target.value })
          }
          placeholder="Approx. families served per year"
          className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cg-sage/50 focus:border-transparent"
        />

        {/* Message */}
        <textarea
          value={formState.message}
          onChange={(e) =>
            setFormState({ ...formState, message: e.target.value })
          }
          placeholder="Tell us about the families you serve (optional)"
          rows={3}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cg-sage/50 focus:border-transparent resize-none"
        />

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-cg-sage text-white font-semibold px-6 py-4 rounded-lg transition-all duration-200 hover:bg-cg-sage-dark hover:shadow-lg disabled:opacity-50 text-lg flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            'Submitting...'
          ) : (
            <>
              Start the Conversation
              <Send className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      {error && <p className="text-sm text-[#C53030] mt-3 text-center">{error}</p>}

      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Check className="w-3.5 h-3.5" />
          Zero cost to your org
        </span>
        <span className="flex items-center gap-1">
          <Check className="w-3.5 h-3.5" />
          No commitment required
        </span>
      </div>
    </div>
  );
}
