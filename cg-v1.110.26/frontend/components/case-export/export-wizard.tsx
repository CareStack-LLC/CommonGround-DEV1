'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { exportsAPI, PackageType, ClaimType, RedactionLevel } from '@/lib/api';

interface ExportWizardProps {
  caseId: string;
  caseName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type WizardStep = 'type' | 'details' | 'sections' | 'review';

export function ExportWizard({ caseId, caseName, onSuccess, onCancel }: ExportWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>('type');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [packageType, setPackageType] = useState<PackageType>('court');
  const [claimType, setClaimType] = useState<ClaimType | undefined>();
  const [claimDescription, setClaimDescription] = useState('');
  const [dateStart, setDateStart] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 3);
    return date.toISOString().split('T')[0];
  });
  const [dateEnd, setDateEnd] = useState(() => new Date().toISOString().split('T')[0]);
  const [redactionLevel, setRedactionLevel] = useState<RedactionLevel>('standard');
  const [messageContentRedacted, setMessageContentRedacted] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  const sectionTypes = exportsAPI.getSectionTypes();
  const claimTypes = exportsAPI.getClaimTypes();

  const handleSectionToggle = (sectionValue: string) => {
    setSelectedSections(prev =>
      prev.includes(sectionValue)
        ? prev.filter(s => s !== sectionValue)
        : [...prev, sectionValue]
    );
  };

  const selectAllSections = () => {
    setSelectedSections(sectionTypes.map(s => s.value));
  };

  const clearAllSections = () => {
    setSelectedSections([]);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      await exportsAPI.create({
        case_id: caseId,
        package_type: packageType,
        date_start: dateStart,
        date_end: dateEnd,
        claim_type: packageType === 'investigation' ? claimType : undefined,
        claim_description: packageType === 'investigation' ? claimDescription : undefined,
        redaction_level: redactionLevel,
        sections: selectedSections.length > 0 ? selectedSections : undefined,
        message_content_redacted: messageContentRedacted,
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/cases/${caseId}/exports`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate export');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'type', label: 'Package Type' },
      { key: 'details', label: 'Details' },
      { key: 'sections', label: 'Sections' },
      { key: 'review', label: 'Review' },
    ];

    const currentIndex = steps.findIndex(s => s.key === currentStep);

    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index <= currentIndex
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {index + 1}
            </div>
            <span
              className={`ml-2 text-sm ${
                index <= currentIndex ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-4 ${
                  index < currentIndex ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderTypeStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">What type of export do you need?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            className={`cursor-pointer transition-all ${
              packageType === 'court'
                ? 'ring-2 ring-blue-600 bg-blue-50'
                : 'hover:bg-gray-50'
            }`}
            onClick={() => setPackageType('court')}
          >
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-2xl">&#x2696;</span>
                Court Filing Package
              </CardTitle>
              <CardDescription>
                Comprehensive summary of all case data for legal filings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>&#x2022; All 8 standard sections included</li>
                <li>&#x2022; Complete compliance overview</li>
                <li>&#x2022; Full date range coverage</li>
                <li>&#x2022; SHA-256 integrity verification</li>
              </ul>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              packageType === 'investigation'
                ? 'ring-2 ring-blue-600 bg-blue-50'
                : 'hover:bg-gray-50'
            }`}
            onClick={() => setPackageType('investigation')}
          >
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-2xl">&#x1F50D;</span>
                Investigation Package
              </CardTitle>
              <CardDescription>
                Focused report for a specific concern or claim
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>&#x2022; Targeted to specific claim type</li>
                <li>&#x2022; Relevant sections only</li>
                <li>&#x2022; Does NOT determine fault</li>
                <li>&#x2022; Includes neutral disclaimer</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => setCurrentStep('details')}>
          Continue
        </Button>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Export Details</h3>

      {packageType === 'investigation' && (
        <div className="space-y-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div>
            <Label htmlFor="claimType">Claim Type *</Label>
            <select
              id="claimType"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              value={claimType || ''}
              onChange={(e) => setClaimType(e.target.value as ClaimType)}
            >
              <option value="">Select a claim type...</option>
              {claimTypes.map(ct => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="claimDescription">Describe Your Concern</Label>
            <textarea
              id="claimDescription"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              rows={3}
              placeholder="Briefly describe what you're investigating..."
              value={claimDescription}
              onChange={(e) => setClaimDescription(e.target.value)}
              maxLength={1000}
            />
            <p className="mt-1 text-xs text-gray-500">{claimDescription.length}/1000 characters</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dateStart">Start Date *</Label>
          <Input
            id="dateStart"
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="dateEnd">End Date *</Label>
          <Input
            id="dateEnd"
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label>Redaction Level</Label>
        <div className="mt-2 space-y-2">
          {[
            { value: 'none', label: 'None', desc: 'No PII redaction (full disclosure)' },
            { value: 'standard', label: 'Standard (Recommended)', desc: 'SSN and addresses redacted' },
            { value: 'enhanced', label: 'Enhanced', desc: 'All PII including phone/email redacted' },
          ].map(option => (
            <label
              key={option.value}
              className={`flex items-start p-3 border rounded-lg cursor-pointer ${
                redactionLevel === option.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <input
                type="radio"
                name="redactionLevel"
                value={option.value}
                checked={redactionLevel === option.value}
                onChange={(e) => setRedactionLevel(e.target.value as RedactionLevel)}
                className="mt-1"
              />
              <div className="ml-3">
                <span className="font-medium">{option.label}</span>
                <p className="text-sm text-gray-500">{option.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={messageContentRedacted}
            onChange={(e) => setMessageContentRedacted(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Redact message content (show metadata only)</span>
        </label>
        <p className="mt-1 text-xs text-gray-500 ml-6">
          When enabled, message text will be replaced with "[Content redacted]"
        </p>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setCurrentStep('type')}>
          Back
        </Button>
        <Button
          onClick={() => setCurrentStep('sections')}
          disabled={packageType === 'investigation' && !claimType}
        >
          Continue
        </Button>
      </div>
    </div>
  );

  const renderSectionsStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Select Sections to Include</h3>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={selectAllSections}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={clearAllSections}>
            Clear All
          </Button>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        {packageType === 'court'
          ? 'Court packages include all sections by default. Customize if needed.'
          : 'Select the sections relevant to your investigation.'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sectionTypes.map(section => (
          <label
            key={section.value}
            className={`flex items-start p-3 border rounded-lg cursor-pointer ${
              selectedSections.includes(section.value)
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedSections.includes(section.value)}
              onChange={() => handleSectionToggle(section.value)}
              className="mt-1"
            />
            <div className="ml-3">
              <span className="font-medium text-sm">{section.label}</span>
              <p className="text-xs text-gray-500">{section.description}</p>
            </div>
          </label>
        ))}
      </div>

      {selectedSections.length === 0 && (
        <p className="text-sm text-gray-500 italic">
          No sections selected. All default sections for {packageType} packages will be included.
        </p>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setCurrentStep('details')}>
          Back
        </Button>
        <Button onClick={() => setCurrentStep('review')}>
          Continue
        </Button>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Review & Generate</h3>

      <Card>
        <CardContent className="pt-6">
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-gray-500">Case</dt>
              <dd className="font-medium">{caseName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Package Type</dt>
              <dd className="font-medium capitalize">{packageType}</dd>
            </div>
            {packageType === 'investigation' && claimType && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Claim Type</dt>
                <dd className="font-medium">{claimTypes.find(c => c.value === claimType)?.label}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Date Range</dt>
              <dd className="font-medium">{dateStart} to {dateEnd}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Redaction Level</dt>
              <dd className="font-medium capitalize">{redactionLevel}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Message Content</dt>
              <dd className="font-medium">{messageContentRedacted ? 'Redacted' : 'Included'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Sections</dt>
              <dd className="font-medium">
                {selectedSections.length > 0
                  ? `${selectedSections.length} selected`
                  : `All (${sectionTypes.length} sections)`}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>&#x2022; Your export will be generated (this may take a moment)</li>
            <li>&#x2022; A PDF will be created with all selected sections</li>
            <li>&#x2022; The document will include SHA-256 verification</li>
            <li>&#x2022; You can download and share with legal professionals</li>
          </ul>
        </CardContent>
      </Card>

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setCurrentStep('sections')}>
          Back
        </Button>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate Export'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create Case Export</CardTitle>
          <CardDescription>
            Generate a court-ready documentation package for your case
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepIndicator()}

          {currentStep === 'type' && renderTypeStep()}
          {currentStep === 'details' && renderDetailsStep()}
          {currentStep === 'sections' && renderSectionsStep()}
          {currentStep === 'review' && renderReviewStep()}
        </CardContent>
      </Card>
    </div>
  );
}
