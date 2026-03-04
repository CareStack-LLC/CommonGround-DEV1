'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Scale,
  Calendar,
  AlertTriangle,
  Shield,
  Car,
  Plane,
  MessageSquare,
  FileText,
  Check,
  ChevronRight,
  ChevronLeft,
  Save,
  ArrowLeft,
} from 'lucide-react';

// Types matching official FL-311 form (CA Judicial Council, Rev. Jan 1, 2026)
interface FL311Child {
  name: string;
  birthdate: string;
  age?: number;
}

// Time reference options per official form
type TimeReference = 'specific_time' | 'start_of_school' | 'after_school';

// Schedule time with reference option
interface ScheduleTime {
  time_value: string;
  is_am: boolean;
  reference: TimeReference;
}

// Weekend schedule entry for 1st-5th weekends
interface WeekendScheduleEntry {
  weekend: '1st' | '2nd' | '3rd' | '4th' | '5th';
  enabled: boolean;
  from_day?: string;
  from_time?: ScheduleTime;
  to_day?: string;
  to_time?: ScheduleTime;
}

// Fifth weekend handling options
interface FifthWeekendHandling {
  type: 'alternating' | 'specific' | 'none';
  // For alternating
  alternating_initial_party?: 'petitioner' | 'respondent' | 'other_parent_party';
  alternating_start_date?: string;
  // For specific party
  specific_party?: 'petitioner' | 'respondent' | 'other_parent_party';
  in_odd_months?: boolean;
  in_even_months?: boolean;
}

interface FL311FormData {
  // Header
  petitioner_name: string;
  respondent_name: string;
  other_parent_party_name?: string;
  case_number: string;
  attachment_type: 'petition' | 'response' | 'request_for_order' | 'responsive_declaration' | 'other';
  attachment_type_other?: string;

  // Item 1: Children
  children: FL311Child[];

  // Item 2: Custody
  physical_custody_to: 'petitioner' | 'respondent' | 'joint' | 'other_parent_party';
  legal_custody_to: 'petitioner' | 'respondent' | 'joint' | 'other_parent_party';
  has_abuse_allegations: boolean;
  other_custody_details?: string;

  // Item 3: Visitation Type
  visitation_type: 'reasonable' | 'attached_document' | 'schedule_in_item_4' | 'supervised' | 'no_visitation';
  visitation_attached_pages?: number;
  visitation_attached_date?: string;

  // Item 4: Visitation Schedule (detailed per official form)
  schedule_for_party: 'petitioner' | 'respondent' | 'other_parent_party';

  // 4a(1): Specific weekends (1st-5th)
  specific_weekends_enabled: boolean;
  specific_weekends_start_date?: string;
  weekend_schedules: WeekendScheduleEntry[];
  fifth_weekend_handling: FifthWeekendHandling;

  // 4a(2): Alternate weekends
  alternate_weekends_enabled: boolean;
  alternate_weekends_start_date?: string;
  alternate_weekends_from_day?: string;
  alternate_weekends_from_time?: ScheduleTime;
  alternate_weekends_to_day?: string;
  alternate_weekends_to_time?: ScheduleTime;

  // 4a(3): Weekdays
  weekdays_enabled: boolean;
  weekdays_start_date?: string;
  weekday_days: string[];
  weekdays_from_time?: ScheduleTime;
  weekdays_to_time?: ScheduleTime;

  // 4a(4): Other in-person
  other_inperson_in_attachment: boolean;
  other_inperson_description?: string;

  // 4b: Virtual visitation
  virtual_visitation_enabled: boolean;
  virtual_visitation_in_attachment: boolean;
  virtual_visitation_description?: string;

  // 4c: Other ways
  other_ways_description?: string;

  // Legacy fields for backward compatibility
  weekends_enabled: boolean;
  weekend_schedule: string;
  alternate_weekends: boolean;
  alternate_weekends_start?: string;
  weekday_times: string;
  other_schedule_details?: string;

  // Item 5: Abuse/Substance Abuse
  abuse_alleged_against: string[];
  substance_abuse_alleged_against: string[];
  request_no_custody_due_to_allegations: boolean;
  custody_despite_allegations: boolean;
  custody_despite_allegations_reasons?: string;
  request_supervised_visitation: boolean;
  request_unsupervised_despite_allegations: boolean;
  unsupervised_reasons?: string;

  // Item 6: Supervised Visitation
  supervised_party?: 'petitioner' | 'respondent' | 'other_parent_party';
  supervised_reasons?: string;
  supervised_reasons_in_attachment?: boolean;
  supervisor_name?: string;
  supervisor_phone?: string;
  supervisor_type: 'professional' | 'nonprofessional';
  // Professional provider fee split (must total 100%)
  professional_fee_petitioner_percent?: number;
  professional_fee_respondent_percent?: number;
  professional_fee_other_percent?: number;
  supervised_location: 'in_person_safe' | 'virtual' | 'other';
  supervised_location_other?: string;
  supervised_frequency: 'once_week' | 'twice_week' | 'per_item_4' | 'other';
  supervised_hours_per_visit?: number;

  // Item 7: Transportation
  transport_to_visits_by?: string;
  transport_from_visits_by?: string;
  exchange_point_start?: string;
  exchange_point_end?: string;
  curbside_exchange: boolean;
  other_transport_details?: string;

  // Item 8: Travel Restrictions
  travel_restrictions_enabled: boolean;
  restrict_out_of_state: boolean;
  restrict_counties: boolean;
  allowed_counties?: string;
  other_travel_restrictions?: string;

  // Item 9: Child Abduction Prevention
  abduction_prevention_enabled: boolean;

  // Item 10: Mediation
  mediation_requested: boolean;
  mediation_date?: string;
  mediation_time?: string;
  mediation_location?: string;

  // Item 11: Holiday Schedule
  holiday_schedule_enabled: boolean;
  holiday_schedule_in_form: boolean;
  holiday_schedule_on_fl341c: boolean;
  holiday_details?: string;

  // Item 12: Additional Provisions
  additional_provisions_enabled: boolean;
  additional_provisions?: string[];

  // Item 13: Other
  other_requests?: string;
}

interface FL311WizardProps {
  initialData?: Partial<FL311FormData>;
  caseData: {
    petitioner_name?: string;
    respondent_name?: string;
    case_number?: string;
    children?: { first_name: string; last_name: string; date_of_birth: string }[];
  };
  onSave: (data: FL311FormData) => Promise<void>;
  onSubmit: (data: FL311FormData) => Promise<void>;
  isLoading?: boolean;
  startSection?: number; // Start at a specific section for editing
  onBack?: () => void; // Callback to return to summary view
}

const WIZARD_SECTIONS = [
  { id: 'header', title: 'Case Information', icon: FileText, items: ['TO', 'Header'] },
  { id: 'children', title: '1. Minor Children', icon: Users, items: ['1'] },
  { id: 'custody', title: '2. Custody Request', icon: Scale, items: ['2'] },
  { id: 'visitation_type', title: '3. Visitation Type', icon: Calendar, items: ['3'] },
  { id: 'schedule', title: '4. Visitation Schedule', icon: Calendar, items: ['4'] },
  { id: 'abuse', title: '5. Abuse Allegations', icon: AlertTriangle, items: ['5'] },
  { id: 'supervised', title: '6. Supervised Visitation', icon: Shield, items: ['6'] },
  { id: 'transportation', title: '7. Transportation', icon: Car, items: ['7'] },
  { id: 'travel', title: '8. Travel Restrictions', icon: Plane, items: ['8', '9'] },
  { id: 'mediation', title: '10. Mediation', icon: MessageSquare, items: ['10'] },
  { id: 'additional', title: '11-13. Additional', icon: FileText, items: ['11', '12', '13'] },
];

export default function FL311Wizard({
  initialData,
  caseData,
  onSave,
  onSubmit,
  isLoading = false,
  startSection = 0,
  onBack,
}: FL311WizardProps) {
  const [currentSection, setCurrentSection] = useState(startSection);
  const [formData, setFormData] = useState<FL311FormData>({
    petitioner_name: caseData.petitioner_name || '',
    respondent_name: caseData.respondent_name || '',
    case_number: caseData.case_number || '',
    attachment_type: 'request_for_order',
    children: caseData.children?.map((c) => ({
      name: `${c.first_name} ${c.last_name}`,
      birthdate: c.date_of_birth,
      age: calculateAge(c.date_of_birth),
    })) || [],
    physical_custody_to: 'joint',
    legal_custody_to: 'joint',
    has_abuse_allegations: false,
    visitation_type: 'schedule_in_item_4',
    schedule_for_party: 'respondent',

    // Item 4a(1): Specific weekends
    specific_weekends_enabled: false,
    specific_weekends_start_date: '',
    weekend_schedules: [
      { weekend: '1st', enabled: false },
      { weekend: '2nd', enabled: false },
      { weekend: '3rd', enabled: false },
      { weekend: '4th', enabled: false },
      { weekend: '5th', enabled: false },
    ],
    fifth_weekend_handling: { type: 'none' },

    // Item 4a(2): Alternate weekends
    alternate_weekends_enabled: false,
    alternate_weekends_start_date: '',

    // Item 4a(3): Weekdays
    weekdays_enabled: false,
    weekdays_start_date: '',
    weekday_days: [],

    // Item 4a(4): Other in-person
    other_inperson_in_attachment: false,
    other_inperson_description: '',

    // Item 4b: Virtual visitation
    virtual_visitation_enabled: false,
    virtual_visitation_in_attachment: false,
    virtual_visitation_description: '',

    // Item 4c: Other ways
    other_ways_description: '',

    // Legacy fields
    weekends_enabled: false,
    weekend_schedule: '',
    alternate_weekends: true,
    weekday_times: '',
    other_schedule_details: '',

    abuse_alleged_against: [],
    substance_abuse_alleged_against: [],
    request_no_custody_due_to_allegations: false,
    custody_despite_allegations: false,
    request_supervised_visitation: false,
    request_unsupervised_despite_allegations: false,
    supervisor_type: 'nonprofessional',
    supervised_location: 'in_person_safe',
    supervised_frequency: 'once_week',
    curbside_exchange: false,
    travel_restrictions_enabled: false,
    restrict_out_of_state: false,
    restrict_counties: false,
    abduction_prevention_enabled: false,
    mediation_requested: false,
    holiday_schedule_enabled: false,
    holiday_schedule_in_form: false,
    holiday_schedule_on_fl341c: false,
    additional_provisions_enabled: false,
    ...initialData,
  });
  const [isSaving, setIsSaving] = useState(false);

  function calculateAge(birthdate: string): number {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  const updateField = <K extends keyof FL311FormData>(field: K, value: FL311FormData[K]) => {
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

  // Render current section
  const renderSection = () => {
    switch (WIZARD_SECTIONS[currentSection].id) {
      case 'header':
        return <HeaderSection formData={formData} updateField={updateField} />;
      case 'children':
        return <ChildrenSection formData={formData} updateField={updateField} />;
      case 'custody':
        return <CustodySection formData={formData} updateField={updateField} />;
      case 'visitation_type':
        return <VisitationTypeSection formData={formData} updateField={updateField} />;
      case 'schedule':
        return <ScheduleSection formData={formData} updateField={updateField} />;
      case 'abuse':
        return <AbuseSection formData={formData} updateField={updateField} />;
      case 'supervised':
        return <SupervisedSection formData={formData} updateField={updateField} />;
      case 'transportation':
        return <TransportationSection formData={formData} updateField={updateField} />;
      case 'travel':
        return <TravelSection formData={formData} updateField={updateField} />;
      case 'mediation':
        return <MediationSection formData={formData} updateField={updateField} />;
      case 'additional':
        return <AdditionalSection formData={formData} updateField={updateField} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">FL-311 - Child Custody and Visitation Application</h2>
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
                  ? 'bg-blue-600'
                  : idx < currentSection
                  ? 'bg-green-500'
                  : 'bg-gray-200'
              }`}
              title={section.title}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Header</span>
          <span>{WIZARD_SECTIONS[currentSection].title}</span>
          <span>Review</span>
        </div>
      </div>

      {/* Section Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {(() => {
              const Icon = WIZARD_SECTIONS[currentSection].icon;
              return <Icon className="h-6 w-6 text-blue-600" />;
            })()}
            <div>
              <CardTitle>{WIZARD_SECTIONS[currentSection].title}</CardTitle>
              <CardDescription>
                Official FL-311 Items: {WIZARD_SECTIONS[currentSection].items.join(', ')}
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
}: {
  formData: FL311FormData;
  updateField: <K extends keyof FL311FormData>(field: K, value: FL311FormData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <FileText className="h-4 w-4" />
        <AlertDescription>
          This form is attached to your court filing. Select which document this FL-311 accompanies.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="petitioner_name">Petitioner Name</Label>
          <Input
            id="petitioner_name"
            value={formData.petitioner_name}
            onChange={(e) => updateField('petitioner_name', e.target.value)}
            placeholder="Enter petitioner name"
          />
        </div>
        <div>
          <Label htmlFor="respondent_name">Respondent Name</Label>
          <Input
            id="respondent_name"
            value={formData.respondent_name}
            onChange={(e) => updateField('respondent_name', e.target.value)}
            placeholder="Enter respondent name"
          />
        </div>
        <div>
          <Label htmlFor="case_number">Case Number</Label>
          <Input
            id="case_number"
            value={formData.case_number}
            onChange={(e) => updateField('case_number', e.target.value)}
            placeholder="Enter case number"
          />
        </div>
        <div>
          <Label htmlFor="other_parent">Other Parent/Party (if applicable)</Label>
          <Input
            id="other_parent"
            value={formData.other_parent_party_name || ''}
            onChange={(e) => updateField('other_parent_party_name', e.target.value)}
            placeholder="Enter name if applicable"
          />
        </div>
      </div>

      <div>
        <Label className="text-base font-medium">TO: This form is attached to (check one)</Label>
        <div className="mt-3 space-y-2">
          {[
            { value: 'petition', label: 'Petition' },
            { value: 'response', label: 'Response' },
            { value: 'request_for_order', label: 'Request for Order' },
            { value: 'responsive_declaration', label: 'Responsive Declaration to Request for Order' },
            { value: 'other', label: 'Other' },
          ].map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="radio"
                name="attachment_type"
                value={option.value}
                checked={formData.attachment_type === option.value}
                onChange={(e) => updateField('attachment_type', e.target.value as any)}
                className="h-4 w-4 text-blue-600"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {formData.attachment_type === 'other' && (
          <Input
            className="mt-2"
            value={formData.attachment_type_other || ''}
            onChange={(e) => updateField('attachment_type_other', e.target.value)}
            placeholder="Specify other..."
          />
        )}
      </div>
    </div>
  );
}

function ChildrenSection({
  formData,
  updateField,
}: {
  formData: FL311FormData;
  updateField: <K extends keyof FL311FormData>(field: K, value: FL311FormData[K]) => void;
}) {
  const addChild = () => {
    updateField('children', [...formData.children, { name: '', birthdate: '' }]);
  };

  const updateChild = (index: number, field: keyof FL311Child, value: string) => {
    const newChildren = [...formData.children];
    newChildren[index] = { ...newChildren[index], [field]: value };
    if (field === 'birthdate' && value) {
      const today = new Date();
      const birth = new Date(value);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      newChildren[index].age = age;
    }
    updateField('children', newChildren);
  };

  const removeChild = (index: number) => {
    updateField(
      'children',
      formData.children.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription>
          List all minor children for whom custody or visitation is being requested.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        {formData.children.map((child, index) => (
          <Card key={index} className="bg-gray-50">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-4">
                <span className="font-medium">Child {index + 1}</span>
                {formData.children.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeChild(index)}>
                    Remove
                  </Button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-1">
                  <Label>Child's Full Name</Label>
                  <Input
                    value={child.name}
                    onChange={(e) => updateChild(index, 'name', e.target.value)}
                    placeholder="Full legal name"
                  />
                </div>
                <div>
                  <Label>Birthdate</Label>
                  <Input
                    type="date"
                    value={child.birthdate}
                    onChange={(e) => updateChild(index, 'birthdate', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Age</Label>
                  <Input value={child.age?.toString() || ''} disabled placeholder="Auto-calculated" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" onClick={addChild}>
        + Add Another Child
      </Button>
    </div>
  );
}

function CustodySection({
  formData,
  updateField,
}: {
  formData: FL311FormData;
  updateField: <K extends keyof FL311FormData>(field: K, value: FL311FormData[K]) => void;
}) {
  const partyOptions = [
    { value: 'petitioner', label: 'Petitioner' },
    { value: 'respondent', label: 'Respondent' },
    { value: 'joint', label: 'Joint' },
    { value: 'other_parent_party', label: 'Other Parent/Party' },
  ];

  return (
    <div className="space-y-6">
      <Alert>
        <Scale className="h-4 w-4" />
        <AlertDescription>
          <strong>Physical Custody:</strong> Where the child will regularly live.
          <br />
          <strong>Legal Custody:</strong> Who decides about the child's health, education, and welfare.
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        <div>
          <Label className="text-base font-medium">2a. Physical custody of children to:</Label>
          <div className="mt-3 flex flex-wrap gap-4">
            {partyOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="physical_custody"
                  value={option.value}
                  checked={formData.physical_custody_to === option.value}
                  onChange={(e) => updateField('physical_custody_to', e.target.value as any)}
                  className="h-4 w-4 text-blue-600"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-base font-medium">2b. Legal custody of children to:</Label>
          <div className="mt-3 flex flex-wrap gap-4">
            {partyOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="legal_custody"
                  value={option.value}
                  checked={formData.legal_custody_to === option.value}
                  onChange={(e) => updateField('legal_custody_to', e.target.value as any)}
                  className="h-4 w-4 text-blue-600"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.has_abuse_allegations}
              onChange={(e) => updateField('has_abuse_allegations', e.target.checked)}
              className="h-4 w-4 mt-1 text-blue-600"
            />
            <div>
              <span className="font-medium">
                2c. There are allegations of a history of abuse or substance abuse in this case.
              </span>
              <p className="text-sm text-gray-500 mt-1">
                If checked, you must complete Item 5 (Abuse/Substance Abuse section).
              </p>
            </div>
          </label>
        </div>

        <div>
          <Label htmlFor="other_custody">2d. Other custody details (if any):</Label>
          <Textarea
            id="other_custody"
            value={formData.other_custody_details || ''}
            onChange={(e) => updateField('other_custody_details', e.target.value)}
            placeholder="Specify any other custody arrangements..."
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}

function VisitationTypeSection({
  formData,
  updateField,
}: {
  formData: FL311FormData;
  updateField: <K extends keyof FL311FormData>(field: K, value: FL311FormData[K]) => void;
}) {
  const visitationOptions = [
    {
      value: 'reasonable',
      label: '3a. Reasonable right of visitation',
      description: 'Including virtual visitation. Not appropriate in cases involving domestic violence.',
    },
    {
      value: 'attached_document',
      label: '3b. Visitation as described in attached document',
      description: 'You have a separate document describing the schedule.',
    },
    {
      value: 'schedule_in_item_4',
      label: '3c. The visitation schedule in Item 4',
      description: 'You will specify the schedule in the next section.',
    },
    {
      value: 'supervised',
      label: '3d. Supervised visitation',
      description: 'You must complete Item 6 with supervision details.',
    },
    {
      value: 'no_visitation',
      label: '3e. No visitation',
      description: 'Reasons must be described in Item 13.',
    },
  ];

  return (
    <div className="space-y-6">
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertDescription>
          Select the type of visitation (parenting time) you are requesting for the party without
          physical custody.
        </AlertDescription>
      </Alert>

      <div>
        <Label className="text-base font-medium">
          3. Visitation (Parenting Time) - I request that the court order:
        </Label>
        <div className="mt-4 space-y-4">
          {visitationOptions.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                formData.visitation_type === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="visitation_type"
                value={option.value}
                checked={formData.visitation_type === option.value}
                onChange={(e) => updateField('visitation_type', e.target.value as any)}
                className="h-4 w-4 mt-1 text-blue-600"
              />
              <div>
                <span className="font-medium">{option.label}</span>
                <p className="text-sm text-gray-500 mt-1">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {formData.visitation_type === 'attached_document' && (
        <div className="grid gap-4 md:grid-cols-2 pl-8">
          <div>
            <Label>Number of pages in attached document</Label>
            <Input
              type="number"
              min="1"
              value={formData.visitation_attached_pages || ''}
              onChange={(e) => updateField('visitation_attached_pages', parseInt(e.target.value) || undefined)}
            />
          </div>
          <div>
            <Label>Date of attached document</Label>
            <Input
              type="date"
              value={formData.visitation_attached_date || ''}
              onChange={(e) => updateField('visitation_attached_date', e.target.value)}
            />
          </div>
        </div>
      )}

      <Alert className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Note:</strong> Unless specifically ordered, a child's holiday schedule order has
          priority over the regular parenting time.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Helper component for time input with AM/PM and school reference options
function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: ScheduleTime;
  onChange: (time: ScheduleTime) => void;
}) {
  const currentValue = value || { time_value: '', is_am: false, reference: 'specific_time' as TimeReference };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-gray-500">{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="time"
          value={currentValue.time_value}
          onChange={(e) => onChange({ ...currentValue, time_value: e.target.value })}
          className="w-28 text-sm"
          disabled={currentValue.reference !== 'specific_time'}
        />
        <select
          value={currentValue.is_am ? 'am' : 'pm'}
          onChange={(e) => onChange({ ...currentValue, is_am: e.target.value === 'am' })}
          className="h-9 rounded-md border px-2 text-sm"
          disabled={currentValue.reference !== 'specific_time'}
        >
          <option value="am">AM</option>
          <option value="pm">PM</option>
        </select>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={currentValue.reference === 'start_of_school'}
              onChange={(e) => onChange({ ...currentValue, reference: e.target.checked ? 'start_of_school' : 'specific_time' })}
              className="h-3 w-3"
            />
            <span className="text-xs">start of school</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={currentValue.reference === 'after_school'}
              onChange={(e) => onChange({ ...currentValue, reference: e.target.checked ? 'after_school' : 'specific_time' })}
              className="h-3 w-3"
            />
            <span className="text-xs">after school</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// Weekend schedule row component
function WeekendScheduleRow({
  weekend,
  entry,
  onChange,
}: {
  weekend: string;
  entry: WeekendScheduleEntry;
  onChange: (entry: WeekendScheduleEntry) => void;
}) {
  const days = ['Friday', 'Saturday', 'Sunday', 'Monday'];

  return (
    <div className={`grid grid-cols-12 gap-2 p-3 rounded-lg border ${entry.enabled ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
      {/* Weekend checkbox */}
      <div className="col-span-2 flex items-center">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={entry.enabled}
            onChange={(e) => onChange({ ...entry, enabled: e.target.checked })}
            className="h-4 w-4 text-blue-600"
          />
          <span className="font-medium text-sm">{weekend}</span>
        </label>
      </div>

      {/* From day/time */}
      <div className="col-span-5 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-10">From</span>
          <select
            value={entry.from_day || ''}
            onChange={(e) => onChange({ ...entry, from_day: e.target.value })}
            className="h-8 rounded-md border px-2 text-sm flex-1"
            disabled={!entry.enabled}
          >
            <option value="">Select day</option>
            {days.map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>
        {entry.enabled && (
          <TimeInput
            label=""
            value={entry.from_time}
            onChange={(time) => onChange({ ...entry, from_time: time })}
          />
        )}
      </div>

      {/* To day/time */}
      <div className="col-span-5 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-10">To</span>
          <select
            value={entry.to_day || ''}
            onChange={(e) => onChange({ ...entry, to_day: e.target.value })}
            className="h-8 rounded-md border px-2 text-sm flex-1"
            disabled={!entry.enabled}
          >
            <option value="">Select day</option>
            {days.map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>
        {entry.enabled && (
          <TimeInput
            label=""
            value={entry.to_time}
            onChange={(time) => onChange({ ...entry, to_time: time })}
          />
        )}
      </div>
    </div>
  );
}

function ScheduleSection({
  formData,
  updateField,
}: {
  formData: FL311FormData;
  updateField: <K extends keyof FL311FormData>(field: K, value: FL311FormData[K]) => void;
}) {
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const partyOptions = [
    { value: 'petitioner', label: 'Petitioner' },
    { value: 'respondent', label: 'Respondent' },
    { value: 'other_parent_party', label: 'Other Parent/Party' },
  ];

  const toggleWeekday = (day: string) => {
    const current = formData.weekday_days || [];
    if (current.includes(day)) {
      updateField(
        'weekday_days',
        current.filter((d) => d !== day)
      );
    } else {
      updateField('weekday_days', [...current, day]);
    }
  };

  const updateWeekendSchedule = (index: number, entry: WeekendScheduleEntry) => {
    const newSchedules = [...formData.weekend_schedules];
    newSchedules[index] = entry;
    updateField('weekend_schedules', newSchedules);
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 4:</strong> Define the specific visitation schedule per the official FL-311 form.
          Check the boxes and fill in the days/times that apply.
        </AlertDescription>
      </Alert>

      {/* Whose schedule */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <Label className="text-base font-medium">4. The following schedule describes:</Label>
        <div className="mt-3 flex flex-wrap gap-4">
          {partyOptions.map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="radio"
                name="schedule_for"
                value={option.value}
                checked={formData.schedule_for_party === option.value}
                onChange={(e) => updateField('schedule_for_party', e.target.value as any)}
                className="h-4 w-4 text-blue-600"
              />
              <span>{option.label}'s visitation (parenting time) with the minor children</span>
            </label>
          ))}
        </div>
      </div>

      {/* 4a: In-Person Visitation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">4a. In-Person Visitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* 4a(1): Specific Weekends Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.specific_weekends_enabled}
                  onChange={(e) => updateField('specific_weekends_enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="font-medium">(1) The weekends of each month</span>
              </label>
              {formData.specific_weekends_enabled && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Starting date:</Label>
                  <Input
                    type="date"
                    value={formData.specific_weekends_start_date || ''}
                    onChange={(e) => updateField('specific_weekends_start_date', e.target.value)}
                    className="w-40"
                  />
                </div>
              )}
            </div>

            {formData.specific_weekends_enabled && (
              <div className="pl-6 space-y-3">
                {/* Weekend schedule grid header */}
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-3">
                  <div className="col-span-2">Weekend</div>
                  <div className="col-span-5">From (day & time)</div>
                  <div className="col-span-5">To (day & time)</div>
                </div>

                {/* Weekend rows */}
                {formData.weekend_schedules.map((entry, index) => (
                  <WeekendScheduleRow
                    key={entry.weekend}
                    weekend={entry.weekend}
                    entry={entry}
                    onChange={(updated) => updateWeekendSchedule(index, updated)}
                  />
                ))}

                {/* 5th Weekend Handling */}
                {formData.weekend_schedules.find(w => w.weekend === '5th')?.enabled && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <Label className="font-medium text-amber-800">5th Weekend Handling:</Label>
                    <div className="mt-3 space-y-3">
                      <label className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="fifth_weekend_type"
                          value="alternating"
                          checked={formData.fifth_weekend_handling.type === 'alternating'}
                          onChange={() => updateField('fifth_weekend_handling', { ...formData.fifth_weekend_handling, type: 'alternating' })}
                          className="h-4 w-4 mt-0.5 text-blue-600"
                        />
                        <div>
                          <span className="font-medium">(a) The parties will alternate the 5th weekend</span>
                          {formData.fifth_weekend_handling.type === 'alternating' && (
                            <div className="mt-2 flex flex-wrap gap-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">with</span>
                                <select
                                  value={formData.fifth_weekend_handling.alternating_initial_party || ''}
                                  onChange={(e) => updateField('fifth_weekend_handling', { ...formData.fifth_weekend_handling, alternating_initial_party: e.target.value as any })}
                                  className="h-8 rounded-md border px-2 text-sm"
                                >
                                  <option value="">Select party</option>
                                  {partyOptions.map((p) => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                  ))}
                                </select>
                                <span className="text-sm">having the initial 5th weekend on</span>
                              </div>
                              <Input
                                type="date"
                                value={formData.fifth_weekend_handling.alternating_start_date || ''}
                                onChange={(e) => updateField('fifth_weekend_handling', { ...formData.fifth_weekend_handling, alternating_start_date: e.target.value })}
                                className="w-40"
                              />
                            </div>
                          )}
                        </div>
                      </label>

                      <label className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="fifth_weekend_type"
                          value="specific"
                          checked={formData.fifth_weekend_handling.type === 'specific'}
                          onChange={() => updateField('fifth_weekend_handling', { ...formData.fifth_weekend_handling, type: 'specific' })}
                          className="h-4 w-4 mt-0.5 text-blue-600"
                        />
                        <div>
                          <span className="font-medium">(b) The 5th weekend will be with</span>
                          {formData.fifth_weekend_handling.type === 'specific' && (
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                              <select
                                value={formData.fifth_weekend_handling.specific_party || ''}
                                onChange={(e) => updateField('fifth_weekend_handling', { ...formData.fifth_weekend_handling, specific_party: e.target.value as any })}
                                className="h-8 rounded-md border px-2 text-sm"
                              >
                                <option value="">Select party</option>
                                {partyOptions.map((p) => (
                                  <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                              </select>
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={formData.fifth_weekend_handling.in_odd_months || false}
                                  onChange={(e) => updateField('fifth_weekend_handling', { ...formData.fifth_weekend_handling, in_odd_months: e.target.checked })}
                                  className="h-3 w-3"
                                />
                                <span className="text-sm">in odd-numbered months</span>
                              </label>
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={formData.fifth_weekend_handling.in_even_months || false}
                                  onChange={(e) => updateField('fifth_weekend_handling', { ...formData.fifth_weekend_handling, in_even_months: e.target.checked })}
                                  className="h-3 w-3"
                                />
                                <span className="text-sm">in even-numbered months</span>
                              </label>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4a(2): Alternate Weekends */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.alternate_weekends_enabled}
                  onChange={(e) => updateField('alternate_weekends_enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="font-medium">(2) Alternate weekends</span>
              </label>
              {formData.alternate_weekends_enabled && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Starting date:</Label>
                  <Input
                    type="date"
                    value={formData.alternate_weekends_start_date || ''}
                    onChange={(e) => updateField('alternate_weekends_start_date', e.target.value)}
                    className="w-40"
                  />
                </div>
              )}
            </div>

            {formData.alternate_weekends_enabled && (
              <div className="mt-4 pl-6 grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="font-medium">From:</Label>
                  <select
                    value={formData.alternate_weekends_from_day || ''}
                    onChange={(e) => updateField('alternate_weekends_from_day', e.target.value)}
                    className="h-9 w-full rounded-md border px-3"
                  >
                    <option value="">Select day</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                  <TimeInput
                    label="Time"
                    value={formData.alternate_weekends_from_time}
                    onChange={(time) => updateField('alternate_weekends_from_time', time)}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="font-medium">To:</Label>
                  <select
                    value={formData.alternate_weekends_to_day || ''}
                    onChange={(e) => updateField('alternate_weekends_to_day', e.target.value)}
                    className="h-9 w-full rounded-md border px-3"
                  >
                    <option value="">Select day</option>
                    <option value="Sunday">Sunday</option>
                    <option value="Monday">Monday</option>
                  </select>
                  <TimeInput
                    label="Time"
                    value={formData.alternate_weekends_to_time}
                    onChange={(time) => updateField('alternate_weekends_to_time', time)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4a(3): Weekdays */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.weekdays_enabled}
                  onChange={(e) => updateField('weekdays_enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="font-medium">(3) Weekdays</span>
              </label>
              {formData.weekdays_enabled && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Starting date:</Label>
                  <Input
                    type="date"
                    value={formData.weekdays_start_date || ''}
                    onChange={(e) => updateField('weekdays_start_date', e.target.value)}
                    className="w-40"
                  />
                </div>
              )}
            </div>

            {formData.weekdays_enabled && (
              <div className="mt-4 pl-6 space-y-4">
                <div>
                  <Label>Select days:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {weekdays.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWeekday(day)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          (formData.weekday_days || []).includes(day)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <TimeInput
                    label="From time"
                    value={formData.weekdays_from_time}
                    onChange={(time) => updateField('weekdays_from_time', time)}
                  />
                  <TimeInput
                    label="To time"
                    value={formData.weekdays_to_time}
                    onChange={(time) => updateField('weekdays_to_time', time)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4a(4): Other in-person */}
          <div className="border-t pt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.other_inperson_in_attachment}
                onChange={(e) => updateField('other_inperson_in_attachment', e.target.checked)}
                className="h-4 w-4 text-blue-600"
              />
              <span className="font-medium">(4) Other days (in Attachment 4a(4))</span>
            </label>
            <div className="mt-2 pl-6">
              <Textarea
                value={formData.other_inperson_description || ''}
                onChange={(e) => updateField('other_inperson_description', e.target.value)}
                placeholder="Describe other visitation days if not in attachment..."
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4b: Virtual Visitation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">4b. Virtual Visitation</CardTitle>
          <CardDescription>
            Using audiovisual technology (smartphone, tablet, computer) for parent and child to see
            and hear each other in real time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.virtual_visitation_enabled}
              onChange={(e) => updateField('virtual_visitation_enabled', e.target.checked)}
              className="h-4 w-4 text-blue-600"
            />
            <span className="font-medium">I request virtual visitation</span>
          </label>
          {formData.virtual_visitation_enabled && (
            <div className="mt-4 pl-6 space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.virtual_visitation_in_attachment}
                  onChange={(e) => updateField('virtual_visitation_in_attachment', e.target.checked)}
                  className="h-4 w-4 text-blue-600"
                />
                <span>Schedule is in Attachment 4b</span>
              </label>
              {!formData.virtual_visitation_in_attachment && (
                <div>
                  <Label>Virtual visitation schedule:</Label>
                  <Textarea
                    value={formData.virtual_visitation_description || ''}
                    onChange={(e) => updateField('virtual_visitation_description', e.target.value)}
                    placeholder="e.g., Daily video calls at 7:00 PM for 30 minutes when child is with other parent"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4c: Other Ways */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">4c. Other Ways</CardTitle>
        </CardHeader>
        <CardContent>
          <Label>Other visitation arrangements not covered above:</Label>
          <Textarea
            value={formData.other_ways_description || ''}
            onChange={(e) => updateField('other_ways_description', e.target.value)}
            placeholder="Describe any other visitation arrangements..."
            rows={3}
            className="mt-2"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function AbuseSection({
  formData,
  updateField,
}: {
  formData: FL311FormData;
  updateField: <K extends keyof FL311FormData>(field: K, value: FL311FormData[K]) => void;
}) {
  if (!formData.has_abuse_allegations) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You indicated in Item 2 that there are no allegations of abuse or substance abuse. This
          section does not apply. Click "Next" to continue.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Alert className="bg-red-50 border-red-200">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>Item 5:</strong> This section is required because you indicated abuse or substance
          abuse allegations in Item 2c.
        </AlertDescription>
      </Alert>

      {/* 5a: Allegations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">5a. Allegations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>
              (1) Who is alleged to have a history of abuse against a child, the other parent, their
              spouse, or person they live with/date?
            </Label>
            <div className="mt-2 flex flex-wrap gap-4">
              {['petitioner', 'respondent', 'other_parent_party'].map((party) => (
                <label key={party} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(formData.abuse_alleged_against || []).includes(party)}
                    onChange={(e) => {
                      const current = formData.abuse_alleged_against || [];
                      if (e.target.checked) {
                        updateField('abuse_alleged_against', [...current, party]);
                      } else {
                        updateField(
                          'abuse_alleged_against',
                          current.filter((p) => p !== party)
                        );
                      }
                    }}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="capitalize">{party.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>
              (2) Who is alleged to have habitual/continual illegal drug use, alcohol abuse, or
              prescription drug abuse?
            </Label>
            <div className="mt-2 flex flex-wrap gap-4">
              {['petitioner', 'respondent', 'other_parent_party'].map((party) => (
                <label key={party} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(formData.substance_abuse_alleged_against || []).includes(party)}
                    onChange={(e) => {
                      const current = formData.substance_abuse_alleged_against || [];
                      if (e.target.checked) {
                        updateField('substance_abuse_alleged_against', [...current, party]);
                      } else {
                        updateField(
                          'substance_abuse_alleged_against',
                          current.filter((p) => p !== party)
                        );
                      }
                    }}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="capitalize">{party.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5b & 5c: Custody and Visitation despite allegations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">5b & 5c. Custody and Visitation Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.request_no_custody_due_to_allegations}
              onChange={(e) => updateField('request_no_custody_due_to_allegations', e.target.checked)}
              className="h-4 w-4 mt-1 text-blue-600"
            />
            <span>
              <strong>5b(1):</strong> I ask that the court NOT order sole or joint custody to the
              party/parties named above.
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.custody_despite_allegations}
              onChange={(e) => updateField('custody_despite_allegations', e.target.checked)}
              className="h-4 w-4 mt-1 text-blue-600"
            />
            <span>
              <strong>5b(2):</strong> Even though there are allegations, I ask that the court make
              the child custody orders in Item 4.
            </span>
          </label>

          {formData.custody_despite_allegations && (
            <div className="pl-6">
              <Label>Explain why custody should be granted despite allegations:</Label>
              <Textarea
                value={formData.custody_despite_allegations_reasons || ''}
                onChange={(e) => updateField('custody_despite_allegations_reasons', e.target.value)}
                placeholder="Write the reasons why you think it would be in the best interests of the child..."
                rows={4}
              />
            </div>
          )}

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.request_supervised_visitation}
              onChange={(e) => updateField('request_supervised_visitation', e.target.checked)}
              className="h-4 w-4 mt-1 text-blue-600"
            />
            <span>
              <strong>5c(1):</strong> I ask that the court order supervised visitation as specified
              in Item 6.
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.request_unsupervised_despite_allegations}
              onChange={(e) => updateField('request_unsupervised_despite_allegations', e.target.checked)}
              className="h-4 w-4 mt-1 text-blue-600"
            />
            <span>
              <strong>5c(2):</strong> Even though there are allegations, I request unsupervised
              visitation.
            </span>
          </label>

          {formData.request_unsupervised_despite_allegations && (
            <div className="pl-6">
              <Label>Explain why unsupervised visitation should be granted:</Label>
              <Textarea
                value={formData.unsupervised_reasons || ''}
                onChange={(e) => updateField('unsupervised_reasons', e.target.value)}
                placeholder="Write the reasons why you think unsupervised visitation would be in the best interests of the child..."
                rows={4}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SupervisedSection({
  formData,
  updateField,
}: {
  formData: FL311FormData;
  updateField: <K extends keyof FL311FormData>(field: K, value: FL311FormData[K]) => void;
}) {
  if (formData.visitation_type !== 'supervised' && !formData.request_supervised_visitation) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          You have not requested supervised visitation. This section does not apply. Click "Next" to
          continue.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 6:</strong> Complete this section because you requested supervised visitation.
        </AlertDescription>
      </Alert>

      <div>
        <Label className="text-base font-medium">6a. Who should have supervised visitation?</Label>
        <div className="mt-3 flex flex-wrap gap-4">
          {[
            { value: 'petitioner', label: 'Petitioner' },
            { value: 'respondent', label: 'Respondent' },
            { value: 'other_parent_party', label: 'Other Parent/Party' },
          ].map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="radio"
                name="supervised_party"
                value={option.value}
                checked={formData.supervised_party === option.value}
                onChange={(e) => updateField('supervised_party', e.target.value as any)}
                className="h-4 w-4 text-blue-600"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="supervised_reasons">6b. Reasons why supervised visitation is needed:</Label>
        <Textarea
          id="supervised_reasons"
          value={formData.supervised_reasons || ''}
          onChange={(e) => updateField('supervised_reasons', e.target.value)}
          placeholder="Explain why unsupervised visitation would NOT be in the best interest of the child..."
          rows={4}
        />
      </div>

      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">6c. Supervision Provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Monitor name (if known)</Label>
              <Input
                value={formData.supervisor_name || ''}
                onChange={(e) => updateField('supervisor_name', e.target.value)}
                placeholder="Name of supervisor"
              />
            </div>
            <div>
              <Label>Phone number</Label>
              <Input
                value={formData.supervisor_phone || ''}
                onChange={(e) => updateField('supervisor_phone', e.target.value)}
                placeholder="(XXX) XXX-XXXX"
              />
            </div>
          </div>

          <div>
            <Label className="font-medium">Provider type:</Label>
            <div className="mt-2 space-y-3">
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="supervisor_type"
                  value="professional"
                  checked={formData.supervisor_type === 'professional'}
                  onChange={(e) => updateField('supervisor_type', e.target.value as any)}
                  className="h-4 w-4 mt-1 text-blue-600"
                />
                <div className="flex-1">
                  <span className="font-medium">Professional provider</span>
                  <span className="text-sm text-gray-500 block">Must meet requirements in form FL-324(P)</span>
                </div>
              </label>

              {formData.supervisor_type === 'professional' && (
                <div className="ml-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Label className="font-medium text-blue-800 mb-3 block">Fee Split (must total 100%):</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm">Petitioner pays</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.professional_fee_petitioner_percent || ''}
                          onChange={(e) => updateField('professional_fee_petitioner_percent', parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <span className="text-sm">%</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Respondent pays</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.professional_fee_respondent_percent || ''}
                          onChange={(e) => updateField('professional_fee_respondent_percent', parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <span className="text-sm">%</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Other party pays</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.professional_fee_other_percent || ''}
                          onChange={(e) => updateField('professional_fee_other_percent', parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <span className="text-sm">%</span>
                      </div>
                    </div>
                  </div>
                  {(formData.professional_fee_petitioner_percent || 0) +
                   (formData.professional_fee_respondent_percent || 0) +
                   (formData.professional_fee_other_percent || 0) !== 100 && (
                    <p className="mt-2 text-sm text-amber-700">
                      Total: {(formData.professional_fee_petitioner_percent || 0) +
                             (formData.professional_fee_respondent_percent || 0) +
                             (formData.professional_fee_other_percent || 0)}% (should be 100%)
                    </p>
                  )}
                </div>
              )}

              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="supervisor_type"
                  value="nonprofessional"
                  checked={formData.supervisor_type === 'nonprofessional'}
                  onChange={(e) => updateField('supervisor_type', e.target.value as any)}
                  className="h-4 w-4 mt-1 text-blue-600"
                />
                <div>
                  <span className="font-medium">Nonprofessional provider</span>
                  <span className="text-sm text-gray-500 block">Must meet requirements in form FL-324(NP)</span>
                </div>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <Label className="text-base font-medium">6d. Location of supervised visitation:</Label>
        <div className="mt-3 space-y-2">
          {[
            { value: 'in_person_safe', label: 'In person at a safe location' },
            { value: 'virtual', label: 'Virtual visitation (not in person)' },
            { value: 'other', label: 'Other' },
          ].map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="radio"
                name="supervised_location"
                value={option.value}
                checked={formData.supervised_location === option.value}
                onChange={(e) => updateField('supervised_location', e.target.value as any)}
                className="h-4 w-4 text-blue-600"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {formData.supervised_location === 'other' && (
          <Input
            className="mt-2"
            value={formData.supervised_location_other || ''}
            onChange={(e) => updateField('supervised_location_other', e.target.value)}
            placeholder="Describe location..."
          />
        )}
      </div>

      <div>
        <Label className="text-base font-medium">6e. Schedule for supervised visitation:</Label>
        <div className="mt-3 space-y-2">
          {[
            { value: 'once_week', label: 'Once a week' },
            { value: 'twice_week', label: 'Two times each week' },
            { value: 'per_item_4', label: 'As specified in Item 4' },
            { value: 'other', label: 'Other' },
          ].map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="radio"
                name="supervised_frequency"
                value={option.value}
                checked={formData.supervised_frequency === option.value}
                onChange={(e) => updateField('supervised_frequency', e.target.value as any)}
                className="h-4 w-4 text-blue-600"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {(formData.supervised_frequency === 'once_week' ||
          formData.supervised_frequency === 'twice_week') && (
          <div className="mt-2">
            <Label>Hours per visit</Label>
            <Input
              type="number"
              min="1"
              value={formData.supervised_hours_per_visit || ''}
              onChange={(e) => updateField('supervised_hours_per_visit', parseInt(e.target.value) || undefined)}
              className="max-w-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function TransportationSection({
  formData,
  updateField,
}: {
  formData: FL311FormData;
  updateField: <K extends keyof FL311FormData>(field: K, value: FL311FormData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <Alert>
        <Car className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 7:</strong> Transportation for visitation and place of exchange. In cases of
          domestic violence, orders must be specific as to time, day, place, and manner of transfer.
        </AlertDescription>
      </Alert>

      <Alert className="bg-gray-50 border-gray-200">
        <AlertDescription>
          <strong>7a.</strong> The children must be driven only by a licensed and insured driver.
          The vehicle must be legally registered with the DMV and have child restraint devices
          properly installed.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="transport_to">7b. Transportation TO begin visits provided by:</Label>
          <Input
            id="transport_to"
            value={formData.transport_to_visits_by || ''}
            onChange={(e) => updateField('transport_to_visits_by', e.target.value)}
            placeholder="Name of person"
          />
        </div>
        <div>
          <Label htmlFor="transport_from">7c. Transportation FROM visits provided by:</Label>
          <Input
            id="transport_from"
            value={formData.transport_from_visits_by || ''}
            onChange={(e) => updateField('transport_from_visits_by', e.target.value)}
            placeholder="Name of person"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="exchange_start">7d. Exchange point at the BEGINNING of the visit:</Label>
        <Input
          id="exchange_start"
          value={formData.exchange_point_start || ''}
          onChange={(e) => updateField('exchange_point_start', e.target.value)}
          placeholder="Full address"
        />
      </div>

      <div>
        <Label htmlFor="exchange_end">7e. Exchange point at the END of the visit:</Label>
        <Input
          id="exchange_end"
          value={formData.exchange_point_end || ''}
          onChange={(e) => updateField('exchange_point_end', e.target.value)}
          placeholder="Full address"
        />
      </div>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={formData.curbside_exchange}
          onChange={(e) => updateField('curbside_exchange', e.target.checked)}
          className="h-4 w-4 mt-1 text-blue-600"
        />
        <span>
          <strong>7f.</strong> During exchanges, the party driving the children will wait in the car
          and the other party will wait in the home (or exchange location) while the children go
          between the car and the home.
        </span>
      </label>

      <div>
        <Label htmlFor="other_transport">7g. Other transportation arrangements:</Label>
        <Textarea
          id="other_transport"
          value={formData.other_transport_details || ''}
          onChange={(e) => updateField('other_transport_details', e.target.value)}
          placeholder="Describe any other transportation arrangements..."
          rows={3}
        />
      </div>
    </div>
  );
}

function TravelSection({
  formData,
  updateField,
}: {
  formData: FL311FormData;
  updateField: <K extends keyof FL311FormData>(field: K, value: FL311FormData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <Alert>
        <Plane className="h-4 w-4" />
        <AlertDescription>
          <strong>Items 8 & 9:</strong> Travel restrictions and child abduction prevention.
        </AlertDescription>
      </Alert>

      {/* Item 8: Travel Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">8. Travel with Children</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.travel_restrictions_enabled}
              onChange={(e) => updateField('travel_restrictions_enabled', e.target.checked)}
              className="h-4 w-4 text-blue-600"
            />
            <span className="font-medium">
              I request travel restrictions on the petitioner/respondent/other parent
            </span>
          </label>

          {formData.travel_restrictions_enabled && (
            <div className="pl-6 space-y-3">
              <p className="text-sm text-gray-600">
                The party must have written permission from the other parent or a court order to take
                the children out of:
              </p>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.restrict_out_of_state}
                  onChange={(e) => updateField('restrict_out_of_state', e.target.checked)}
                  className="h-4 w-4 text-blue-600"
                />
                <span>8a. The state of California</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.restrict_counties}
                  onChange={(e) => updateField('restrict_counties', e.target.checked)}
                  className="h-4 w-4 text-blue-600"
                />
                <span>8b. The following counties:</span>
              </label>
              {formData.restrict_counties && (
                <Input
                  className="ml-6"
                  value={formData.allowed_counties || ''}
                  onChange={(e) => updateField('allowed_counties', e.target.value)}
                  placeholder="Enter county names"
                />
              )}

              <div>
                <Label>8c. Other places (specify):</Label>
                <Input
                  value={formData.other_travel_restrictions || ''}
                  onChange={(e) => updateField('other_travel_restrictions', e.target.value)}
                  placeholder="Other travel restrictions"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item 9: Child Abduction Prevention */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">9. Child Abduction Prevention</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={formData.abduction_prevention_enabled}
              onChange={(e) => updateField('abduction_prevention_enabled', e.target.checked)}
              className="h-4 w-4 mt-1 text-blue-600"
            />
            <div>
              <span className="font-medium">
                There is a risk that one of the parties will take the children out of California
                without the other party's permission.
              </span>
              <p className="text-sm text-gray-500 mt-1">
                If checked, you should complete and attach form FL-312 (Child Abduction Prevention
                Order Attachment).
              </p>
            </div>
          </label>
        </CardContent>
      </Card>
    </div>
  );
}

function MediationSection({
  formData,
  updateField,
}: {
  formData: FL311FormData;
  updateField: <K extends keyof FL311FormData>(field: K, value: FL311FormData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <Alert>
        <MessageSquare className="h-4 w-4" />
        <AlertDescription>
          <strong>Item 10:</strong> Parents who do not agree about child custody or visitation are
          required to attend mediation.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">10. Child Custody Mediation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.mediation_requested}
              onChange={(e) => updateField('mediation_requested', e.target.checked)}
              className="h-4 w-4 text-blue-600"
            />
            <span className="font-medium">
              I request an order for the parties to go to child custody mediation
            </span>
          </label>

          {formData.mediation_requested && (
            <div className="pl-6 grid gap-4 md:grid-cols-3">
              <div>
                <Label>Date (if known)</Label>
                <Input
                  type="date"
                  value={formData.mediation_date || ''}
                  onChange={(e) => updateField('mediation_date', e.target.value)}
                />
              </div>
              <div>
                <Label>Time (if known)</Label>
                <Input
                  type="time"
                  value={formData.mediation_time || ''}
                  onChange={(e) => updateField('mediation_time', e.target.value)}
                />
              </div>
              <div>
                <Label>Location (if known)</Label>
                <Input
                  value={formData.mediation_location || ''}
                  onChange={(e) => updateField('mediation_location', e.target.value)}
                  placeholder="Mediation location"
                />
              </div>
            </div>
          )}

          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              <strong>Note:</strong> A party who alleges domestic violence in a written declaration
              or who is protected by a protective order may ask the mediator to meet with the
              parties separately and at separate times.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

function AdditionalSection({
  formData,
  updateField,
}: {
  formData: FL311FormData;
  updateField: <K extends keyof FL311FormData>(field: K, value: FL311FormData[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <strong>Items 11-13:</strong> Holiday schedule, additional provisions, and other requests.
        </AlertDescription>
      </Alert>

      {/* Item 11: Holiday Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">11. Children's Holiday Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.holiday_schedule_enabled}
              onChange={(e) => updateField('holiday_schedule_enabled', e.target.checked)}
              className="h-4 w-4 text-blue-600"
            />
            <span className="font-medium">I request a holiday and vacation schedule</span>
          </label>

          {formData.holiday_schedule_enabled && (
            <div className="pl-6 space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="holiday_location"
                  checked={formData.holiday_schedule_in_form}
                  onChange={() => {
                    updateField('holiday_schedule_in_form', true);
                    updateField('holiday_schedule_on_fl341c', false);
                  }}
                  className="h-4 w-4 text-blue-600"
                />
                <span>Described below in this form</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="holiday_location"
                  checked={formData.holiday_schedule_on_fl341c}
                  onChange={() => {
                    updateField('holiday_schedule_in_form', false);
                    updateField('holiday_schedule_on_fl341c', true);
                  }}
                  className="h-4 w-4 text-blue-600"
                />
                <span>On attached form FL-341(C) (Children's Holiday Schedule Attachment)</span>
              </label>

              {formData.holiday_schedule_in_form && (
                <div>
                  <Label>Holiday Schedule Details</Label>
                  <Textarea
                    value={formData.holiday_details || ''}
                    onChange={(e) => updateField('holiday_details', e.target.value)}
                    placeholder="Describe the holiday schedule (e.g., Thanksgiving alternating years, Christmas Eve with Mother, Christmas Day with Father, etc.)"
                    rows={6}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item 12: Additional Provisions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">12. Additional Custody Provisions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.additional_provisions_enabled}
              onChange={(e) => updateField('additional_provisions_enabled', e.target.checked)}
              className="h-4 w-4 text-blue-600"
            />
            <span className="font-medium">I request additional orders for custody</span>
          </label>

          {formData.additional_provisions_enabled && (
            <div className="pl-6">
              <Label>Additional Provisions</Label>
              <Textarea
                value={(formData.additional_provisions || []).join('\n')}
                onChange={(e) => updateField('additional_provisions', e.target.value.split('\n').filter(Boolean))}
                placeholder="Enter each provision on a new line, for example:
- Neither parent shall make disparaging remarks about the other
- Both parents shall have access to school and medical records
- 24-hour notice required for schedule changes"
                rows={6}
              />
              <p className="text-sm text-gray-500 mt-1">
                Or attach form FL-341(D) (Additional Provisions Attachment)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item 13: Other */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">13. Other</CardTitle>
        </CardHeader>
        <CardContent>
          <Label>Any other requests or specifications:</Label>
          <Textarea
            value={formData.other_requests || ''}
            onChange={(e) => updateField('other_requests', e.target.value)}
            placeholder="Enter any other requests or information..."
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
}
