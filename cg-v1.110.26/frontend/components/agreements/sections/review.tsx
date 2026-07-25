'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, CheckCircle, Check } from 'lucide-react';

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
      router.push(window.location.pathname.replace('/builder-v2', '').replace('/builder', ''));
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
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cg-sage-dark/10 text-cg-sage-dark text-sm font-bold">
            <Check className="w-4 h-4" />
          </span>
          Review & Finalize
        </CardTitle>
        <CardDescription>
          Excellent work! You've completed all sections.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-cg-sage-dark/10 border border-cg-sage-dark/20 rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-cg-sage-dark" />
            Agreement Draft Complete!
          </h3>
          <p className="text-muted-foreground mb-3">
            You've successfully completed all 18 sections of your custody agreement. Your responses have been saved and are ready for review.
          </p>
          <p className="text-muted-foreground">
            The next steps are:
          </p>
          <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
            <li>Review the agreement details</li>
            <li>Share with the other parent for review</li>
            <li>Both parents approve the agreement</li>
            <li>Generate the final PDF document</li>
          </ul>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
          <h4 className="font-semibold text-foreground mb-3">What Happens Next?</h4>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex-shrink-0">1</span>
              <p><strong className="text-foreground">Review Period:</strong> Both parents can review all sections and request changes if needed.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex-shrink-0">2</span>
              <p><strong className="text-foreground">Dual Approval:</strong> Both parents must approve the agreement before it becomes active.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex-shrink-0">3</span>
              <p><strong className="text-foreground">PDF Generation:</strong> Once approved, you can generate a formal PDF document.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex-shrink-0">4</span>
              <p><strong className="text-foreground">Court Filing:</strong> If needed, the PDF can be filed with the court.</p>
            </div>
          </div>
        </div>

        <div className="bg-cg-amber/10 border border-cg-amber/20 rounded-lg p-4">
          <h4 className="text-sm font-medium text-foreground mb-2">Important Reminder</h4>
          <p className="text-sm text-muted-foreground">
            This agreement draft is a starting point. You can always come back to edit sections before final approval. Consider having both parents review together or consulting with a family law attorney.
          </p>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-border">
          <Button variant="outline" onClick={onPrevious}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous Section
          </Button>
          <Button
            onClick={handleFinish}
            disabled={isSubmitting}
            size="lg"
          >
            {isSubmitting ? 'Finishing...' : 'Finish & View Agreement'}
            <Check className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
