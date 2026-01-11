'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ReviewSectionProps {
  data: any;
  onSave: (data: any) => Promise<void>;
  onNext: () => void;
  onPrevious: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function ReviewSection({ onPrevious }: ReviewSectionProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = async () => {
    try {
      setIsSubmitting(true);
      // Navigate back to agreement details
      router.push(window.location.pathname.replace('/builder', ''));
    } catch (err) {
      console.error('Failed to finish:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 text-sm font-bold">
            ✓
          </span>
          Review & Finalize
        </CardTitle>
        <CardDescription>
          Excellent work! You've completed all sections.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Agreement Draft Complete!
          </h3>
          <p className="text-green-800 mb-3">
            You've successfully completed all 18 sections of your custody agreement. Your responses have been saved and are ready for review.
          </p>
          <p className="text-green-800">
            The next steps are:
          </p>
          <ul className="list-disc list-inside text-green-800 mt-2 space-y-1">
            <li>Review the agreement details</li>
            <li>Share with the other parent for review</li>
            <li>Both parents approve the agreement</li>
            <li>Generate the final PDF document</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-3">What Happens Next?</h4>
          <div className="space-y-3 text-sm text-blue-800">
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-200 text-blue-900 font-bold text-xs flex-shrink-0">1</span>
              <p><strong>Review Period:</strong> Both parents can review all sections and request changes if needed.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-200 text-blue-900 font-bold text-xs flex-shrink-0">2</span>
              <p><strong>Dual Approval:</strong> Both parents must approve the agreement before it becomes active.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-200 text-blue-900 font-bold text-xs flex-shrink-0">3</span>
              <p><strong>PDF Generation:</strong> Once approved, you can generate a formal PDF document.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-200 text-blue-900 font-bold text-xs flex-shrink-0">4</span>
              <p><strong>Court Filing:</strong> If needed, the PDF can be filed with the court.</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-amber-900 mb-2">Important Reminder</h4>
          <p className="text-sm text-amber-800">
            This agreement draft is a starting point. You can always come back to edit sections before final approval. Consider having both parents review together or consulting with a family law attorney.
          </p>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={onPrevious}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous Section
          </Button>
          <Button
            onClick={handleFinish}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {isSubmitting ? 'Finishing...' : 'Finish & View Agreement'}
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
