'use client';

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { ReactNode } from 'react';

// Load Stripe outside of component to avoid recreating on re-render
let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = () => {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.warn('Stripe publishable key not found');
      return null;
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

interface StripeProviderProps {
  children: ReactNode;
}

export function StripeProvider({ children }: StripeProviderProps) {
  const stripe = getStripe();

  if (!stripe) {
    // Render children without Stripe if key not configured
    return <>{children}</>;
  }

  return (
    <Elements
      stripe={stripe}
      options={{
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#4A7C59',
            colorBackground: '#ffffff',
            colorText: '#1f2937',
            colorDanger: '#dc2626',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            borderRadius: '12px',
            spacingUnit: '4px',
          },
        },
      }}
    >
      {children}
    </Elements>
  );
}

export { getStripe };
