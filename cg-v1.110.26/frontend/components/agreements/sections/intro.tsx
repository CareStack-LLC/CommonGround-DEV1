'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <CardTitle className="text-3xl mb-4">CommonGround Agreement Builder</CardTitle>
          <p className="text-lg text-gray-600 mb-2">Comprehensive Custody Agreement Generator</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Welcome! 👋</h3>
          <p className="text-blue-800 mb-3">
            I'm going to help you create a detailed, comprehensive custody agreement. This will cover everything from daily schedules to holidays, medical decisions, and more.
          </p>
          <p className="text-blue-800">
            This is a thorough process - we'll go through 18 different topics to make sure your agreement is complete and covers all the situations that might come up.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="font-semibold text-amber-900 mb-3">Take Your Time</h3>
          <p className="text-amber-800">
            The more detail you provide now, the fewer disagreements you'll have later. Each section is important and will help create a clear, fair agreement for your family.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">What We'll Cover:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span className="text-gray-700">Parent & Children Information</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span className="text-gray-700">Legal & Physical Custody</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span className="text-gray-700">Parenting Schedule</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span className="text-gray-700">Holiday & Vacation Time</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span className="text-gray-700">Exchange Procedures</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span className="text-gray-700">Child Support & Expenses</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span className="text-gray-700">Medical & Healthcare</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span className="text-gray-700">Education Decisions</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span className="text-gray-700">Communication Protocols</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span className="text-gray-700">Travel & Relocation</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span className="text-gray-700">Dispute Resolution</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span className="text-gray-700">Additional Provisions</span>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Estimated time: 30-45 minutes
            </p>
            <Button onClick={onNext} size="lg" className="bg-blue-600 hover:bg-blue-700">
              Let's Begin
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
