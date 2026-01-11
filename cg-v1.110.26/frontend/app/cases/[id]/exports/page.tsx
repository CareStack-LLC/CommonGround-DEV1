'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExportList } from '@/components/case-export';
import { casesAPI, Case } from '@/lib/api';

function ExportsPageContent() {
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
      <div className="min-h-screen bg-gray-50 p-8">
        <Card className="max-w-lg mx-auto bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-700">{error || 'Case not found'}</p>
            <Button variant="outline" onClick={() => router.push('/cases')} className="mt-4">
              Back to Cases
            </Button>
          </CardContent>
        </Card>
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
            <span className="text-gray-900">CaseExport</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CaseExport</h1>
              <p className="text-gray-500">Court-ready documentation for {caseData.case_name}</p>
            </div>
            <Button onClick={() => router.push(`/cases/${caseId}/exports/new`)}>
              Create New Export
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Info Card */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-medium text-blue-900 mb-2">About CaseExport</h3>
            <p className="text-sm text-blue-800 mb-3">
              CaseExport generates court-ready PDF packages that compile your case data into professional,
              verifiable documents. Each export includes:
            </p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>&#x2022; <strong>Comprehensive Data:</strong> Agreement terms, compliance metrics, communications</li>
              <li>&#x2022; <strong>SHA-256 Verification:</strong> Cryptographic proof of document integrity</li>
              <li>&#x2022; <strong>PII Redaction:</strong> Configurable privacy protection</li>
              <li>&#x2022; <strong>Neutral Presentation:</strong> Facts without interpretation or blame</li>
            </ul>
          </CardContent>
        </Card>

        {/* Export List */}
        <ExportList
          caseId={caseId}
          onCreateNew={() => router.push(`/cases/${caseId}/exports/new`)}
        />
      </div>
    </div>
  );
}

export default function ExportsPage() {
  return (
    <ProtectedRoute>
      <ExportsPageContent />
    </ProtectedRoute>
  );
}
