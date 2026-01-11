'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Users,
  DollarSign,
  Home,
  Gavel,
  AlertTriangle,
  Clock,
  ChevronRight,
  ChevronLeft,
  Save,
  Check,
  ArrowLeft,
  Shield,
  LucideIcon,
  MessageSquare,
} from 'lucide-react';

// FL-320 Form Data Interface matching backend schema
interface FL320FormData {
  filing_party: string;
  party_name?: string;
  firm_name?: string;
  street_address?: string;
  city?: string;
  state: string;
  zip_code?: string;
  telephone?: string;
  fax?: string;
  email?: string;
  attorney_for?: string;
  state_bar_number?: string;

  court_county?: string;
  court_street_address?: string;
  court_mailing_address?: string;
  court_city_zip?: string;
  court_branch_name?: string;

  petitioner_name?: string;
  respondent_name?: string;
  other_parent_party_name?: string;
  case_number?: string;

  hearing_date?: string;
  hearing_time?: string;
  hearing_dept_room?: string;

  responds_to_fl300_id?: string;

  // Item 1: Restraining Orders
  restraining_no_orders_in_effect: boolean;
  restraining_orders_in_effect: boolean;

  // Item 2: Custody/Visitation
  custody_enabled: boolean;
  custody_consent_legal_physical: boolean;
  custody_consent_visitation: boolean;
  custody_do_not_consent: boolean;
  custody_do_not_consent_custody: boolean;
  custody_do_not_consent_visitation: boolean;
  custody_counter_proposal?: string;

  // Item 3: Child Support
  child_support_enabled: boolean;
  child_support_income_declaration_filed: boolean;
  child_support_consent: boolean;
  child_support_consent_guideline: boolean;
  child_support_do_not_consent: boolean;
  child_support_counter_proposal?: string;

  // Item 4: Spousal Support
  spousal_support_enabled: boolean;
  spousal_support_income_declaration_filed: boolean;
  spousal_support_consent: boolean;
  spousal_support_do_not_consent: boolean;
  spousal_support_counter_proposal?: string;

  // Item 5: Property Control
  property_control_enabled: boolean;
  property_control_consent: boolean;
  property_control_do_not_consent: boolean;
  property_control_counter_proposal?: string;

  // Item 6: Attorney's Fees
  attorney_fees_enabled: boolean;
  attorney_fees_income_declaration_filed: boolean;
  attorney_fees_fl158_attached: boolean;
  attorney_fees_consent: boolean;
  attorney_fees_do_not_consent: boolean;
  attorney_fees_counter_proposal?: string;

  // Item 7: Other Orders
  other_orders_enabled: boolean;
  other_orders_consent: boolean;
  other_orders_do_not_consent: boolean;
  other_orders_counter_proposal?: string;

  // Item 8: Time for Service
  time_service_enabled: boolean;
  time_service_consent: boolean;
  time_service_do_not_consent: boolean;
  time_service_counter_proposal?: string;

  // Item 9: Facts
  facts_to_support?: string;
  facts_attachment_9: boolean;

  signature_date?: string;
  signatory_name?: string;
}

interface FL320WizardProps {
  initialData?: Partial<FL320FormData>;
  caseData: {
    petitioner_name?: string;
    respondent_name?: string;
    case_number?: string;
  };
  fl300Data?: Record<string, any>; // The FL-300 being responded to
  onSave: (data: FL320FormData) => Promise<void>;
  onSubmit: (data: FL320FormData) => Promise<void>;
  isLoading?: boolean;
  startSection?: number;
  onBack?: () => void;
}

interface WizardSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: string[];
}

const WIZARD_SECTIONS: WizardSection[] = [
  { id: 'header', title: 'Case Information', icon: FileText, items: ['Header'] },
  { id: 'restraining', title: '1. Restraining Orders', icon: Shield, items: ['1'] },
  { id: 'custody', title: '2. Child Custody/Visitation', icon: Users, items: ['2'] },
  { id: 'child_support', title: '3. Child Support', icon: DollarSign, items: ['3'] },
  { id: 'spousal_support', title: '4. Spousal Support', icon: DollarSign, items: ['4'] },
  { id: 'property', title: '5. Property Control', icon: Home, items: ['5'] },
  { id: 'attorney_fees', title: '6. Attorney Fees', icon: Gavel, items: ['6'] },
  { id: 'other_orders', title: '7. Other Orders', icon: FileText, items: ['7'] },
  { id: 'time_service', title: '8. Time for Service', icon: Clock, items: ['8'] },
  { id: 'facts', title: '9. Facts to Support', icon: MessageSquare, items: ['9'] },
];

export default function FL320Wizard({
  initialData,
  caseData,
  fl300Data,
  onSave,
  onSubmit,
  isLoading = false,
  startSection = 0,
  onBack,
}: FL320WizardProps) {
  const [currentSection, setCurrentSection] = useState(startSection);
  const [formData, setFormData] = useState<FL320FormData>({
    filing_party: 'respondent',
    state: 'CA',
    petitioner_name: caseData.petitioner_name || '',
    respondent_name: caseData.respondent_name || '',
    case_number: caseData.case_number || '',

    restraining_no_orders_in_effect: false,
    restraining_orders_in_effect: false,

    custody_enabled: false,
    custody_consent_legal_physical: false,
    custody_consent_visitation: false,
    custody_do_not_consent: false,
    custody_do_not_consent_custody: false,
    custody_do_not_consent_visitation: false,

    child_support_enabled: false,
    child_support_income_declaration_filed: false,
    child_support_consent: false,
    child_support_consent_guideline: false,
    child_support_do_not_consent: false,

    spousal_support_enabled: false,
    spousal_support_income_declaration_filed: false,
    spousal_support_consent: false,
    spousal_support_do_not_consent: false,

    property_control_enabled: false,
    property_control_consent: false,
    property_control_do_not_consent: false,

    attorney_fees_enabled: false,
    attorney_fees_income_declaration_filed: false,
    attorney_fees_fl158_attached: false,
    attorney_fees_consent: false,
    attorney_fees_do_not_consent: false,

    other_orders_enabled: false,
    other_orders_consent: false,
    other_orders_do_not_consent: false,

    time_service_enabled: false,
    time_service_consent: false,
    time_service_do_not_consent: false,

    facts_attachment_9: false,

    ...initialData,
  });
  const [isSaving, setIsSaving] = useState(false);

  const updateField = <K extends keyof FL320FormData>(field: K, value: FL320FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    await handleSave();
    if (currentSection < WIZARD_SECTIONS.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleSubmit = async () => {
    await onSubmit(formData);
  };

  const renderSection = () => {
    switch (WIZARD_SECTIONS[currentSection].id) {
      case 'header':
        return <HeaderSection formData={formData} updateField={updateField} fl300Data={fl300Data} />;
      case 'restraining':
        return <RestrainingSection formData={formData} updateField={updateField} />;
      case 'custody':
        return <CustodySection formData={formData} updateField={updateField} fl300Data={fl300Data} />;
      case 'child_support':
        return <ChildSupportSection formData={formData} updateField={updateField} fl300Data={fl300Data} />;
      case 'spousal_support':
        return <SpousalSupportSection formData={formData} updateField={updateField} fl300Data={fl300Data} />;
      case 'property':
        return <PropertySection formData={formData} updateField={updateField} fl300Data={fl300Data} />;
      case 'attorney_fees':
        return <AttorneyFeesSection formData={formData} updateField={updateField} fl300Data={fl300Data} />;
      case 'other_orders':
        return <OtherOrdersSection formData={formData} updateField={updateField} fl300Data={fl300Data} />;
      case 'time_service':
        return <TimeServiceSection formData={formData} updateField={updateField} fl300Data={fl300Data} />;
      case 'facts':
        return <FactsSection formData={formData} updateField={updateField} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">FL-320 - Responsive Declaration to Request for Order</h2>
          <Badge variant="secondary">
            Section {currentSection + 1} of {WIZARD_SECTIONS.length}
          </Badge>
        </div>
        <div className="flex gap-1">
          {WIZARD_SECTIONS.map((section, idx) => (
            <button
              key={section.id}
              onClick={() => setCurrentSection(idx)}
              className={`flex-1 h-2 rounded-full transition-colors ${
                idx === currentSection
                  ? 'bg-purple-600'
                  : idx < currentSection
                  ? 'bg-green-500'
                  : 'bg-gray-200'
              }`}
              title={section.title}
            />
          ))}
        </div>
      </div>

      {/* Section Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {(() => {
              const Icon = WIZARD_SECTIONS[currentSection].icon;
              return <Icon className="h-6 w-6 text-purple-600" />;
            })()}
            <div>
              <CardTitle>{WIZARD_SECTIONS[currentSection].title}</CardTitle>
              <CardDescription>
                FL-320 Items: {WIZARD_SECTIONS[currentSection].items.join(', ')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>{renderSection()}</CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="outline"
              onClick={async () => {
                await handleSave();
                onBack();
              }}
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Summary
            </Button>
          )}
          {!onBack && (
            <Button variant="outline" onClick={handlePrevious} disabled={currentSection === 0 || isLoading}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
        </div>

        <Button variant="outline" onClick={handleSave} disabled={isSaving || isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Progress'}
        </Button>

        <div className="flex items-center gap-2">
          {onBack ? (
            <Button
              onClick={async () => {
                await handleSave();
                onBack();
              }}
              disabled={isLoading}
            >
              <Check className="h-4 w-4 mr-2" />
              Save & Return
            </Button>
          ) : currentSection === WIZARD_SECTIONS.length - 1 ? (
            <Button onClick={handleSubmit} disabled={isLoading}>
              <Check className="h-4 w-4 mr-2" />
              Review & Submit
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={isLoading}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Section Components

function HeaderSection({
  formData,
  updateField,
  fl300Data,
}: {
  formData: FL320FormData;
  updateField: <K extends keyof FL320FormData>(field: K, value: FL320FormData[K]) => void;
  fl300Data?: Record<string, any>;
}) {
  return (
    <div className="space-y-6">
      <Alert className="bg-purple-50 border-purple-200">
        <FileText className="h-4 w-4" />
        <AlertDescription>
          FL-320 is your response to the FL-300 Request for Order filed by the other party.
          You can consent to, or counter-propose, each item in their request.
        </AlertDescription>
      </Alert>

      {fl300Data && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">Responding to FL-300</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p><strong>Filed by:</strong> {fl300Data.filing_party || 'Petitioner'}</p>
            <p><strong>Requesting:</strong> {[
              fl300Data.request_child_custody && 'Child Custody',
              fl300Data.request_child_visitation && 'Visitation',
              fl300Data.request_child_support && 'Child Support',
              fl300Data.request_spousal_support && 'Spousal Support',
              fl300Data.request_property_control && 'Property Control',
              fl300Data.request_attorney_fees && 'Attorney Fees',
            ].filter(Boolean).join(', ') || 'Various orders'}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="petitioner_name">Petitioner Name</Label>
          <Input
            id="petitioner_name"
            value={formData.petitioner_name || ''}
            onChange={(e) => updateField('petitioner_name', e.target.value)}
            placeholder="Enter petitioner name"
          />
        </div>
        <div>
          <Label htmlFor="respondent_name">Respondent Name</Label>
          <Input
            id="respondent_name"
            value={formData.respondent_name || ''}
            onChange={(e) => updateField('respondent_name', e.target.value)}
            placeholder="Enter respondent name"
          />
        </div>
        <div>
          <Label htmlFor="case_number">Case Number</Label>
          <Input
            id="case_number"
            value={formData.case_number || ''}
            onChange={(e) => updateField('case_number', e.target.value)}
            placeholder="Enter case number"
          />
        </div>
        <div>
          <Label htmlFor="court_county">County</Label>
          <Input
            id="court_county"
            value={formData.court_county || ''}
            onChange={(e) => updateField('court_county', e.target.value)}
            placeholder="e.g., Los Angeles"
          />
        </div>
      </div>

      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">Hearing Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Hearing Date</Label>
            <Input
              type="date"
              value={formData.hearing_date || ''}
              onChange={(e) => updateField('hearing_date', e.target.value)}
            />
          </div>
          <div>
            <Label>Hearing Time</Label>
            <Input
              value={formData.hearing_time || ''}
              onChange={(e) => updateField('hearing_time', e.target.value)}
              placeholder="e.g., 8:30 AM"
            />
          </div>
          <div>
            <Label>Department / Room</Label>
            <Input
              value={formData.hearing_dept_room || ''}
              onChange={(e) => updateField('hearing_dept_room', e.target.value)}
              placeholder="e.g., Dept. 92"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RestrainingSection({
  formData,
  updateField,
}: {
  formData: FL320FormData;
  updateField: <K extends keyof FL320FormData>(field: K, value: FL320FormData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 1:</strong> Restraining Order Information. Confirm whether any domestic violence restraining/protective orders are in effect.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
          <input
            type="radio"
            name="restraining_status"
            checked={formData.restraining_no_orders_in_effect}
            onChange={() => {
              updateField('restraining_no_orders_in_effect', true);
              updateField('restraining_orders_in_effect', false);
            }}
            className="h-4 w-4 text-purple-600"
          />
          <div>
            <span className="font-medium">1a. No domestic violence restraining/protective orders are now in effect</span>
            <p className="text-sm text-gray-500">Check this if there are no restraining orders between the parties</p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
          <input
            type="radio"
            name="restraining_status"
            checked={formData.restraining_orders_in_effect}
            onChange={() => {
              updateField('restraining_no_orders_in_effect', false);
              updateField('restraining_orders_in_effect', true);
            }}
            className="h-4 w-4 text-purple-600"
          />
          <div>
            <span className="font-medium">1b. I agree that one or more domestic violence restraining/protective orders are in effect</span>
            <p className="text-sm text-gray-500">Check this if you agree restraining orders exist as stated in the FL-300</p>
          </div>
        </label>
      </div>
    </div>
  );
}

function CustodySection({
  formData,
  updateField,
  fl300Data,
}: {
  formData: FL320FormData;
  updateField: <K extends keyof FL320FormData>(field: K, value: FL320FormData[K]) => void;
  fl300Data?: Record<string, any>;
}) {
  const custodyRequested = fl300Data?.request_child_custody || fl300Data?.request_child_visitation;

  if (!custodyRequested) {
    return (
      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription>
          The FL-300 did not request child custody or visitation orders. This section does not apply.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 2:</strong> Respond to the child custody and visitation (parenting time) request.
        </AlertDescription>
      </Alert>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.custody_enabled}
          onChange={(e) => updateField('custody_enabled', e.target.checked)}
          className="h-4 w-4 text-purple-600"
        />
        <span className="font-medium">This section applies to me</span>
      </label>

      {formData.custody_enabled && (
        <div className="space-y-4 pl-4 border-l-4 border-purple-200">
          <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.custody_consent_legal_physical}
              onChange={(e) => updateField('custody_consent_legal_physical', e.target.checked)}
              className="h-4 w-4 text-purple-600"
            />
            <div>
              <span className="font-medium">2a. I consent to the order requested for child custody (legal and physical)</span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.custody_consent_visitation}
              onChange={(e) => updateField('custody_consent_visitation', e.target.checked)}
              className="h-4 w-4 text-purple-600"
            />
            <div>
              <span className="font-medium">2b. I consent to the order requested for visitation (parenting time)</span>
            </div>
          </label>

          <div className="p-4 border rounded-lg">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.custody_do_not_consent}
                onChange={(e) => updateField('custody_do_not_consent', e.target.checked)}
                className="h-4 w-4 mt-1 text-purple-600"
              />
              <div className="flex-1">
                <span className="font-medium">2c. I do not consent to the order requested for:</span>
                {formData.custody_do_not_consent && (
                  <div className="mt-3 space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.custody_do_not_consent_custody}
                        onChange={(e) => updateField('custody_do_not_consent_custody', e.target.checked)}
                        className="h-4 w-4 text-purple-600"
                      />
                      <span>Child custody</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.custody_do_not_consent_visitation}
                        onChange={(e) => updateField('custody_do_not_consent_visitation', e.target.checked)}
                        className="h-4 w-4 text-purple-600"
                      />
                      <span>Visitation (parenting time)</span>
                    </label>
                    <div className="mt-4">
                      <Label>But I consent to the following order:</Label>
                      <Textarea
                        value={formData.custody_counter_proposal || ''}
                        onChange={(e) => updateField('custody_counter_proposal', e.target.value)}
                        placeholder="Describe what custody/visitation arrangement you would agree to..."
                        rows={4}
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function ChildSupportSection({
  formData,
  updateField,
  fl300Data,
}: {
  formData: FL320FormData;
  updateField: <K extends keyof FL320FormData>(field: K, value: FL320FormData[K]) => void;
  fl300Data?: Record<string, any>;
}) {
  if (!fl300Data?.request_child_support) {
    return (
      <Alert>
        <DollarSign className="h-4 w-4" />
        <AlertDescription>
          The FL-300 did not request child support orders. This section does not apply.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <DollarSign className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 3:</strong> Respond to the child support request.
        </AlertDescription>
      </Alert>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.child_support_enabled}
          onChange={(e) => updateField('child_support_enabled', e.target.checked)}
          className="h-4 w-4 text-purple-600"
        />
        <span className="font-medium">This section applies to me</span>
      </label>

      {formData.child_support_enabled && (
        <div className="space-y-4 pl-4 border-l-4 border-purple-200">
          <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.child_support_income_declaration_filed}
              onChange={(e) => updateField('child_support_income_declaration_filed', e.target.checked)}
              className="h-4 w-4 text-purple-600"
            />
            <div>
              <span className="font-medium">3a. I have completed and filed a current Income and Expense Declaration (FL-150)</span>
              <p className="text-sm text-gray-500">or Financial Statement (Simplified) (FL-155)</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.child_support_consent}
              onChange={(e) => updateField('child_support_consent', e.target.checked)}
              className="h-4 w-4 text-purple-600"
            />
            <span className="font-medium">3b. I consent to the order requested</span>
          </label>

          <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.child_support_consent_guideline}
              onChange={(e) => updateField('child_support_consent_guideline', e.target.checked)}
              className="h-4 w-4 text-purple-600"
            />
            <span className="font-medium">3c. I consent to guideline support</span>
          </label>

          <div className="p-4 border rounded-lg">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.child_support_do_not_consent}
                onChange={(e) => updateField('child_support_do_not_consent', e.target.checked)}
                className="h-4 w-4 mt-1 text-purple-600"
              />
              <div className="flex-1">
                <span className="font-medium">3d. I do not consent to the order requested</span>
                {formData.child_support_do_not_consent && (
                  <div className="mt-4">
                    <Label>But I consent to the following order:</Label>
                    <Textarea
                      value={formData.child_support_counter_proposal || ''}
                      onChange={(e) => updateField('child_support_counter_proposal', e.target.value)}
                      placeholder="Describe what child support arrangement you would agree to..."
                      rows={4}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function SpousalSupportSection({
  formData,
  updateField,
  fl300Data,
}: {
  formData: FL320FormData;
  updateField: <K extends keyof FL320FormData>(field: K, value: FL320FormData[K]) => void;
  fl300Data?: Record<string, any>;
}) {
  if (!fl300Data?.request_spousal_support) {
    return (
      <Alert>
        <DollarSign className="h-4 w-4" />
        <AlertDescription>
          The FL-300 did not request spousal/partner support orders. This section does not apply.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <DollarSign className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 4:</strong> Respond to the spousal or domestic partner support request.
        </AlertDescription>
      </Alert>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.spousal_support_enabled}
          onChange={(e) => updateField('spousal_support_enabled', e.target.checked)}
          className="h-4 w-4 text-purple-600"
        />
        <span className="font-medium">This section applies to me</span>
      </label>

      {formData.spousal_support_enabled && (
        <div className="space-y-4 pl-4 border-l-4 border-purple-200">
          <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.spousal_support_income_declaration_filed}
              onChange={(e) => updateField('spousal_support_income_declaration_filed', e.target.checked)}
              className="h-4 w-4 text-purple-600"
            />
            <span className="font-medium">4a. I have completed and filed a current Income and Expense Declaration (FL-150)</span>
          </label>

          <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.spousal_support_consent}
              onChange={(e) => updateField('spousal_support_consent', e.target.checked)}
              className="h-4 w-4 text-purple-600"
            />
            <span className="font-medium">4b. I consent to the order requested</span>
          </label>

          <div className="p-4 border rounded-lg">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.spousal_support_do_not_consent}
                onChange={(e) => updateField('spousal_support_do_not_consent', e.target.checked)}
                className="h-4 w-4 mt-1 text-purple-600"
              />
              <div className="flex-1">
                <span className="font-medium">4c. I do not consent to the order requested</span>
                {formData.spousal_support_do_not_consent && (
                  <div className="mt-4">
                    <Label>But I consent to the following order:</Label>
                    <Textarea
                      value={formData.spousal_support_counter_proposal || ''}
                      onChange={(e) => updateField('spousal_support_counter_proposal', e.target.value)}
                      placeholder="Describe what spousal support arrangement you would agree to..."
                      rows={4}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function PropertySection({
  formData,
  updateField,
  fl300Data,
}: {
  formData: FL320FormData;
  updateField: <K extends keyof FL320FormData>(field: K, value: FL320FormData[K]) => void;
  fl300Data?: Record<string, any>;
}) {
  if (!fl300Data?.request_property_control) {
    return (
      <Alert>
        <Home className="h-4 w-4" />
        <AlertDescription>
          The FL-300 did not request property control orders. This section does not apply.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Home className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 5:</strong> Respond to the property control request.
        </AlertDescription>
      </Alert>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.property_control_enabled}
          onChange={(e) => updateField('property_control_enabled', e.target.checked)}
          className="h-4 w-4 text-purple-600"
        />
        <span className="font-medium">This section applies to me</span>
      </label>

      {formData.property_control_enabled && (
        <div className="space-y-4 pl-4 border-l-4 border-purple-200">
          <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.property_control_consent}
              onChange={(e) => updateField('property_control_consent', e.target.checked)}
              className="h-4 w-4 text-purple-600"
            />
            <span className="font-medium">5a. I consent to the order requested</span>
          </label>

          <div className="p-4 border rounded-lg">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.property_control_do_not_consent}
                onChange={(e) => updateField('property_control_do_not_consent', e.target.checked)}
                className="h-4 w-4 mt-1 text-purple-600"
              />
              <div className="flex-1">
                <span className="font-medium">5b. I do not consent to the order requested</span>
                {formData.property_control_do_not_consent && (
                  <div className="mt-4">
                    <Label>But I consent to the following order:</Label>
                    <Textarea
                      value={formData.property_control_counter_proposal || ''}
                      onChange={(e) => updateField('property_control_counter_proposal', e.target.value)}
                      placeholder="Describe what property control arrangement you would agree to..."
                      rows={4}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function AttorneyFeesSection({
  formData,
  updateField,
  fl300Data,
}: {
  formData: FL320FormData;
  updateField: <K extends keyof FL320FormData>(field: K, value: FL320FormData[K]) => void;
  fl300Data?: Record<string, any>;
}) {
  if (!fl300Data?.request_attorney_fees) {
    return (
      <Alert>
        <Gavel className="h-4 w-4" />
        <AlertDescription>
          The FL-300 did not request attorney's fees. This section does not apply.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Gavel className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 6:</strong> Respond to the attorney's fees and costs request.
        </AlertDescription>
      </Alert>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.attorney_fees_enabled}
          onChange={(e) => updateField('attorney_fees_enabled', e.target.checked)}
          className="h-4 w-4 text-purple-600"
        />
        <span className="font-medium">This section applies to me</span>
      </label>

      {formData.attorney_fees_enabled && (
        <div className="space-y-4 pl-4 border-l-4 border-purple-200">
          <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.attorney_fees_income_declaration_filed}
              onChange={(e) => updateField('attorney_fees_income_declaration_filed', e.target.checked)}
              className="h-4 w-4 text-purple-600"
            />
            <span className="font-medium">6a. I have completed and filed a current Income and Expense Declaration (FL-150)</span>
          </label>

          <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.attorney_fees_fl158_attached}
              onChange={(e) => updateField('attorney_fees_fl158_attached', e.target.checked)}
              className="h-4 w-4 text-purple-600"
            />
            <span className="font-medium">6b. I have completed and filed FL-158 (Supporting Declaration)</span>
          </label>

          <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.attorney_fees_consent}
              onChange={(e) => updateField('attorney_fees_consent', e.target.checked)}
              className="h-4 w-4 text-purple-600"
            />
            <span className="font-medium">6c. I consent to the order requested</span>
          </label>

          <div className="p-4 border rounded-lg">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.attorney_fees_do_not_consent}
                onChange={(e) => updateField('attorney_fees_do_not_consent', e.target.checked)}
                className="h-4 w-4 mt-1 text-purple-600"
              />
              <div className="flex-1">
                <span className="font-medium">6d. I do not consent to the order requested</span>
                {formData.attorney_fees_do_not_consent && (
                  <div className="mt-4">
                    <Label>But I consent to the following order:</Label>
                    <Textarea
                      value={formData.attorney_fees_counter_proposal || ''}
                      onChange={(e) => updateField('attorney_fees_counter_proposal', e.target.value)}
                      placeholder="Describe what attorney fees arrangement you would agree to..."
                      rows={4}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function OtherOrdersSection({
  formData,
  updateField,
  fl300Data,
}: {
  formData: FL320FormData;
  updateField: <K extends keyof FL320FormData>(field: K, value: FL320FormData[K]) => void;
  fl300Data?: Record<string, any>;
}) {
  if (!fl300Data?.request_other && !fl300Data?.other_orders_enabled) {
    return (
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          The FL-300 did not request other orders. This section does not apply.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 7:</strong> Respond to other orders requested.
        </AlertDescription>
      </Alert>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.other_orders_enabled}
          onChange={(e) => updateField('other_orders_enabled', e.target.checked)}
          className="h-4 w-4 text-purple-600"
        />
        <span className="font-medium">This section applies to me</span>
      </label>

      {formData.other_orders_enabled && (
        <div className="space-y-4 pl-4 border-l-4 border-purple-200">
          <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.other_orders_consent}
              onChange={(e) => updateField('other_orders_consent', e.target.checked)}
              className="h-4 w-4 text-purple-600"
            />
            <span className="font-medium">7a. I consent to the order requested</span>
          </label>

          <div className="p-4 border rounded-lg">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.other_orders_do_not_consent}
                onChange={(e) => updateField('other_orders_do_not_consent', e.target.checked)}
                className="h-4 w-4 mt-1 text-purple-600"
              />
              <div className="flex-1">
                <span className="font-medium">7b. I do not consent to the order requested</span>
                {formData.other_orders_do_not_consent && (
                  <div className="mt-4">
                    <Label>But I consent to the following order:</Label>
                    <Textarea
                      value={formData.other_orders_counter_proposal || ''}
                      onChange={(e) => updateField('other_orders_counter_proposal', e.target.value)}
                      placeholder="Describe what you would agree to..."
                      rows={4}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function TimeServiceSection({
  formData,
  updateField,
  fl300Data,
}: {
  formData: FL320FormData;
  updateField: <K extends keyof FL320FormData>(field: K, value: FL320FormData[K]) => void;
  fl300Data?: Record<string, any>;
}) {
  if (!fl300Data?.urgency_enabled) {
    return (
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          The FL-300 did not request shortened time for service. This section does not apply.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 8:</strong> Respond to the time for service / time until hearing request.
        </AlertDescription>
      </Alert>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.time_service_enabled}
          onChange={(e) => updateField('time_service_enabled', e.target.checked)}
          className="h-4 w-4 text-purple-600"
        />
        <span className="font-medium">This section applies to me</span>
      </label>

      {formData.time_service_enabled && (
        <div className="space-y-4 pl-4 border-l-4 border-purple-200">
          <label className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.time_service_consent}
              onChange={(e) => updateField('time_service_consent', e.target.checked)}
              className="h-4 w-4 text-purple-600"
            />
            <span className="font-medium">8a. I consent to the order requested</span>
          </label>

          <div className="p-4 border rounded-lg">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.time_service_do_not_consent}
                onChange={(e) => updateField('time_service_do_not_consent', e.target.checked)}
                className="h-4 w-4 mt-1 text-purple-600"
              />
              <div className="flex-1">
                <span className="font-medium">8b. I do not consent to the order requested</span>
                {formData.time_service_do_not_consent && (
                  <div className="mt-4">
                    <Label>But I consent to the following order:</Label>
                    <Textarea
                      value={formData.time_service_counter_proposal || ''}
                      onChange={(e) => updateField('time_service_counter_proposal', e.target.value)}
                      placeholder="Describe your proposed timeline..."
                      rows={4}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function FactsSection({
  formData,
  updateField,
}: {
  formData: FL320FormData;
  updateField: <K extends keyof FL320FormData>(field: K, value: FL320FormData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 9:</strong> Facts to support your responsive declaration. State the facts that support your position.
        </AlertDescription>
      </Alert>

      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Important:</strong> This is your declaration under penalty of perjury. State only facts you know to be true.
          The facts cannot be longer than 10 pages unless the court gives permission.
        </AlertDescription>
      </Alert>

      <div>
        <Label className="text-base font-medium">Facts to support my responsive declaration:</Label>
        <Textarea
          value={formData.facts_to_support || ''}
          onChange={(e) => updateField('facts_to_support', e.target.value)}
          placeholder="State the facts that support your position:

- Why do you consent to or disagree with the requested orders?
- What is your current situation?
- What facts does the court need to know?

Be specific and include dates, names, and details that support your response."
          rows={12}
          className="mt-2"
        />
        <label className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            checked={formData.facts_attachment_9}
            onChange={(e) => updateField('facts_attachment_9', e.target.checked)}
            className="h-4 w-4 text-purple-600"
          />
          <span className="text-sm">Continued on Attachment 9</span>
        </label>
      </div>

      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">Signature</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={formData.signature_date || ''}
              onChange={(e) => updateField('signature_date', e.target.value)}
            />
          </div>
          <div>
            <Label>Print Name</Label>
            <Input
              value={formData.signatory_name || ''}
              onChange={(e) => updateField('signatory_name', e.target.value)}
              placeholder="Your printed name"
            />
          </div>
        </CardContent>
      </Card>

      <Alert className="bg-green-50 border-green-200">
        <Check className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          You have completed all sections of the FL-320. Click "Review & Submit" to review your entries before submission.
        </AlertDescription>
      </Alert>
    </div>
  );
}
