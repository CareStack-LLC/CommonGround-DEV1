'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, FileText } from 'lucide-react';

interface IntroSectionProps {
  data: any;
  onSave: (data: any) => Promise<void>;
  onNext: () => void;
  onPrevious: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function IntroSection({ onNext }: IntroSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl mb-4">CommonGround Agreement Builder</CardTitle>
          <p className="text-lg text-muted-foreground mb-2">Comprehensive Custody Agreement Generator</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-3">Welcome!</h3>
          <p className="text-muted-foreground mb-3">
            I'm going to help you create a detailed, comprehensive custody agreement. This will cover everything from daily schedules to holidays, medical decisions, and more.
          </p>
          <p className="text-muted-foreground">
            This is a thorough process - we'll go through 18 different topics to make sure your agreement is complete and covers all the situations that might come up.
          </p>
        </div>

        <div className="bg-cg-amber/10 border border-cg-amber/20 rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-3">Take Your Time</h3>
          <p className="text-muted-foreground">
            The more detail you provide now, the fewer disagreements you'll have later. Each section is important and will help create a clear, fair agreement for your family.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">What We'll Cover:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {[
              'Parent & Children Information',
              'Legal & Physical Custody',
              'Parenting Schedule',
              'Holiday & Vacation Time',
              'Exchange Procedures',
              'Child Support & Expenses',
              'Medical & Healthcare',
              'Education Decisions',
              'Communication Protocols',
              'Travel & Relocation',
              'Dispute Resolution',
              'Additional Provisions',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Estimated time: 30-45 minutes
            </p>
            <Button onClick={onNext} size="lg">
              Let's Begin
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
