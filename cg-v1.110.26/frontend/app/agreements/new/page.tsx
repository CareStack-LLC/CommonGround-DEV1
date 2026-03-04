'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';

/**
 * Legacy route handler for /agreements/new
 *
 * The new flow uses Family Files instead of Cases:
 * - If familyFileId is provided, redirect to /agreements which handles the Family File flow
 * - If no familyFileId, redirect to /family-files to select one first
 *
 * This page exists for backwards compatibility with old links.
 */
function CreateAgreementRedirect(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyFileId = searchParams.get('familyFileId');
  const caseId = searchParams.get('case'); // Legacy support

  useEffect(() => {
    // Redirect to the agreements page which handles the Family File-based flow
    // The agreements page will show the builder choice modal when user clicks "Create Agreement"
    if (familyFileId) {
      // New flow - redirect to agreements with the family file pre-selected
      router.replace(`/agreements?familyFileId=${familyFileId}`);
    } else if (caseId) {
      // Legacy flow - redirect to family files since cases are deprecated for parents
      router.replace('/family-files');
    } else {
      // No context - go to agreements page to select a family file
      router.replace('/agreements');
    }
  }, [router, familyFileId, caseId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent mx-auto" />
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}

export default function CreateAgreementPage() {
  return (
    <ProtectedRoute>
      <CreateAgreementRedirect />
    </ProtectedRoute>
  );
}
