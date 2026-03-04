'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { ExportWizard } from '@/components/case-export';
import { casesAPI, Case } from '@/lib/api';

function NewExportPageContent() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCase = async () => {
      try {
        setIsLoading(true);
        const data = await casesAPI.get(caseId);
        setCaseData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load case');
      } finally {
        setIsLoading(false);
      }
    };

    loadCase();
  }, [caseId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Case not found'}</p>
          <button
            onClick={() => router.push('/cases')}
            className="text-blue-600 hover:underline"
          >
            Back to Cases
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/cases" className="hover:text-blue-600">Cases</Link>
            <span>/</span>
            <Link href={`/cases/${caseId}`} className="hover:text-blue-600">{caseData.case_name}</Link>
            <span>/</span>
            <Link href={`/cases/${caseId}/exports`} className="hover:text-blue-600">Exports</Link>
            <span>/</span>
            <span className="text-gray-900">New</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Export Package</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ExportWizard
          caseId={caseId}
          caseName={caseData.case_name}
          onSuccess={() => router.push(`/cases/${caseId}/exports`)}
          onCancel={() => router.push(`/cases/${caseId}/exports`)}
        />
      </div>
    </div>
  );
}

export default function NewExportPage() {
  return (
    <ProtectedRoute>
      <NewExportPageContent />
    </ProtectedRoute>
  );
}
