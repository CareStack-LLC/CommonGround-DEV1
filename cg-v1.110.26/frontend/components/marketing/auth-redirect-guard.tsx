'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/**
 * Invisible client component that redirects authenticated users
 * to the dashboard. Renders nothing — lets the server-rendered
 * hero content show immediately for unauthenticated visitors.
 */
export default function AuthRedirectGuard() {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(profile?.is_professional ? '/professional/dashboard' : '/dashboard');
    }
  }, [isAuthenticated, isLoading, profile, router]);

  return null;
}
