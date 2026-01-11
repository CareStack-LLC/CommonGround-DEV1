'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Send,
  CheckCircle,
  FileText,
  Users,
  Scale,
  Calendar,
  Car,
  Plane,
  Shield,
  Clock,
  Plus,
  Trash2,
  LucideIcon,
} from 'lucide-react';

// Wizard section definition
interface WizardSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: string[];
}

const WIZARD_SECTIONS: WizardSection[] = [
  { id: 'header', title: 'Case Information', icon: FileText, items: ['Header'] },
  { id: 'jurisdiction', title: 'Jurisdiction', icon: Scale, items: ['1-4'] },
  { id: 'abduction', title: 'Child Abduction', icon: Shield, items: ['5-6'] },
  { id: 'custody', title: 'Child Custody', icon: Users, items: ['7'] },
  { id: 'abuse', title: 'Abuse Allegations', icon: Shield, items: ['8'] },
  { id: 'visitation', title: 'Visitation Schedule', icon: Calendar, items: ['9'] },
  { id: 'supervised', title: 'Supervised Visitation', icon: Users, items: ['10'] },
  { id: 'transportation', title: 'Transportation', icon: Car, items: ['11'] },
  { id: 'travel', title: 'Travel Restrictions', icon: Plane, items: ['12'] },
  { id: 'holiday', title: 'Holiday Schedule', icon: Calendar, items: ['13-14'] },
  { id: 'other', title: 'Other Orders', icon: FileText, items: ['15-16'] },
];

interface FL341Child {
  child_name: string;
  birth_date?: string;
  legal_custody_to?: string;
  physical_custody_to?: string;
}

interface FL341FormData {
  petitioner_name?: string;
  respondent_name?: string;
  other_parent_party_name?: string;
  case_number?: string;

  attached_to_fl340?: boolean;
  attached_to_fl180?: boolean;
  attached_to_fl250?: boolean;
  attached_to_fl355?: boolean;
  attached_to_other?: boolean;
  attached_to_other_specify?: string;

  jurisdiction_confirmed?: boolean;
  notice_opportunity_confirmed?: boolean;
  habitual_residence_us?: boolean;
  habitual_residence_other?: string;
  penalties_acknowledged?: boolean;

  child_abduction_risk?: boolean;
  fl341b_attached?: boolean;
  mediation_referral_enabled?: boolean;
  mediation_referral_details?: string;

  children?: FL341Child[];
  joint_legal_custody_enabled?: boolean;
  joint_legal_custody_fl341e_attached?: boolean;
  joint_legal_custody_attachment_7b?: boolean;

  abuse_allegations_enabled?: boolean;
  abuse_alleged_against_petitioner?: boolean;
  abuse_alleged_against_respondent?: boolean;
  abuse_alleged_against_other?: boolean;
  substance_abuse_alleged_against_petitioner?: boolean;
  substance_abuse_alleged_against_respondent?: boolean;
  substance_abuse_alleged_against_other?: boolean;
  custody_denied_to_petitioner?: boolean;
  custody_denied_to_respondent?: boolean;
  custody_denied_to_other?: boolean;
  custody_granted_despite_allegations?: boolean;
  custody_best_interest_finding?: boolean;

  visitation_reasonable?: boolean;
  visitation_see_attached?: boolean;
  visitation_attached_pages?: number;
  visitation_none?: boolean;
  visitation_supervised?: boolean;
  visitation_for_party?: string;
  visitation_for_other_name?: string;

  alternate_weekends_enabled?: boolean;
  alternate_weekends_starting?: string;
  alternate_weekends_from_day?: string;
  alternate_weekends_from_time?: string;
  alternate_weekends_to_day?: string;
  alternate_weekends_to_time?: string;

  weekdays_enabled?: boolean;
  weekdays_starting?: string;
  weekdays_from_day?: string;
  weekdays_from_time?: string;
  weekdays_to_day?: string;
  weekdays_to_time?: string;

  virtual_visitation_enabled?: boolean;
  virtual_visitation_details?: string;
  other_visitation_ways?: string;

  supervised_visitation_enabled?: boolean;
  supervised_until_further_order?: boolean;
  supervised_until_other?: string;
  supervised_party?: string;
  supervised_party_name?: string;

  transportation_enabled?: boolean;
  transportation_licensed_insured?: boolean;
  transportation_to_by?: string;
  transportation_to_other?: string;
  transportation_from_by?: string;
  transportation_from_other?: string;
  exchange_start_address?: string;
  exchange_end_address?: string;
  curbside_exchange?: boolean;
  transportation_other?: string;

  travel_restrictions_enabled?: boolean;
  travel_restricted_party?: string;
  travel_restricted_party_name?: string;
  travel_restrict_california?: boolean;
  travel_restrict_counties?: boolean;
  travel_allowed_counties?: string;
  travel_restrict_other_places?: boolean;
  travel_other_places?: string;

  holiday_schedule_enabled?: boolean;
  holiday_schedule_below?: boolean;
  holiday_schedule_attached?: boolean;
  additional_provisions_enabled?: boolean;
  additional_provisions_below?: boolean;
  additional_provisions_attached?: boolean;
  additional_provisions_details?: string;

  access_to_records_confirmed?: boolean;
  other_orders_enabled?: boolean;
  other_orders_details?: string;
}

interface FL341WizardProps {
  initialData?: Partial<FL341FormData>;
  caseData?: {
    petitioner_name?: string;
    respondent_name?: string;
    case_number?: string;
    children?: { first_name: string; last_name: string; date_of_birth?: string }[];
  };
  onSave?: (data: FL341FormData) => Promise<void>;
  onSubmit?: (data: FL341FormData) => Promise<void>;
  isLoading?: boolean;
  startSection?: number;
  onBack?: () => void;
}

export default function FL341Wizard({
  initialData = {},
  caseData,
  onSave,
  onSubmit,
  isLoading = false,
  startSection = 0,
  onBack,
}: FL341WizardProps) {
  const [currentSection, setCurrentSection] = useState(startSection);

  // Initialize children from case data
  const defaultChildren: FL341Child[] =
    caseData?.children?.map((c) => ({
      child_name: `${c.first_name} ${c.last_name}`,
      birth_date: c.date_of_birth,
      legal_custody_to: '',
      physical_custody_to: '',
    })) || [];

  const [formData, setFormData] = useState<FL341FormData>({
    petitioner_name: caseData?.petitioner_name || '',
    respondent_name: caseData?.respondent_name || '',
    case_number: caseData?.case_number || '',
    attached_to_fl340: true,
    jurisdiction_confirmed: true,
    notice_opportunity_confirmed: true,
    habitual_residence_us: true,
    penalties_acknowledged: true,
    transportation_licensed_insured: true,
    access_to_records_confirmed: true,
    children: defaultChildren,
    ...initialData,
  });

  const updateField = (field: keyof FL341FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateChild = (index: number, field: keyof FL341Child, value: string) => {
    const newChildren = [...(formData.children || [])];
    newChildren[index] = { ...newChildren[index], [field]: value };
    updateField('children', newChildren);
  };

  const addChild = () => {
    const newChildren = [
      ...(formData.children || []),
      { child_name: '', birth_date: '', legal_custody_to: '', physical_custody_to: '' },
    ];
    updateField('children', newChildren);
  };

  const removeChild = (index: number) => {
    const newChildren = (formData.children || []).filter((_, i) => i !== index);
    updateField('children', newChildren);
  };

  const handleNext = async () => {
    if (onSave) {
      await onSave(formData);
    }
    if (currentSection < WIZARD_SECTIONS.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const handleSubmit = async () => {
    if (onSubmit) {
      await onSubmit(formData);
    }
  };

  const section = WIZARD_SECTIONS[currentSection];
  const SectionIcon = section.icon;
  const progress = ((currentSection + 1) / WIZARD_SECTIONS.length) * 100;

  const renderSectionContent = () => {
    switch (section.id) {
      case 'header':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Petitioner</Label>
                <Input
                  value={formData.petitioner_name || ''}
                  onChange={(e) => updateField('petitioner_name', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Respondent</Label>
                <Input
                  value={formData.respondent_name || ''}
                  onChange={(e) => updateField('respondent_name', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Other Parent/Party</Label>
                <Input
                  value={formData.other_parent_party_name || ''}
                  onChange={(e) => updateField('other_parent_party_name', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Case Number</Label>
                <Input
                  value={formData.case_number || ''}
                  onChange={(e) => updateField('case_number', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Attachment To:</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.attached_to_fl340 || false}
                    onChange={(e) => updateField('attached_to_fl340', e.target.checked)}
                  />
                  <span>Findings and Order After Hearing (form FL-340)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.attached_to_fl180 || false}
                    onChange={(e) => updateField('attached_to_fl180', e.target.checked)}
                  />
                  <span>Judgment (form FL-180)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.attached_to_fl250 || false}
                    onChange={(e) => updateField('attached_to_fl250', e.target.checked)}
                  />
                  <span>Judgment (form FL-250)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.attached_to_fl355 || false}
                    onChange={(e) => updateField('attached_to_fl355', e.target.checked)}
                  />
                  <span>Stipulation and Order (form FL-355)</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 'jurisdiction':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Items 1-4:</strong> These are standard jurisdictional findings. They are typically checked by default.
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.jurisdiction_confirmed || false}
                  onChange={(e) => updateField('jurisdiction_confirmed', e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium">1. Jurisdiction</span>
                  <p className="text-sm text-gray-600">
                    This court has jurisdiction to make child custody orders under UCCJEA.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.notice_opportunity_confirmed || false}
                  onChange={(e) => updateField('notice_opportunity_confirmed', e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium">2. Notice and opportunity to be heard</span>
                  <p className="text-sm text-gray-600">
                    The responding party was given notice and opportunity to be heard.
                  </p>
                </div>
              </label>

              <div className="p-3 border rounded-lg space-y-2">
                <span className="font-medium">3. Country of habitual residence</span>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="habitual_residence"
                      checked={formData.habitual_residence_us || false}
                      onChange={() => {
                        updateField('habitual_residence_us', true);
                        updateField('habitual_residence_other', '');
                      }}
                    />
                    <span>United States</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="habitual_residence"
                      checked={!formData.habitual_residence_us}
                      onChange={() => updateField('habitual_residence_us', false)}
                    />
                    <span>Other:</span>
                    {!formData.habitual_residence_us && (
                      <Input
                        value={formData.habitual_residence_other || ''}
                        onChange={(e) => updateField('habitual_residence_other', e.target.value)}
                        className="w-48"
                        placeholder="Specify country"
                      />
                    )}
                  </label>
                </div>
              </div>

              <label className="flex items-start gap-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.penalties_acknowledged || false}
                  onChange={(e) => updateField('penalties_acknowledged', e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium">4. Penalties for violating this order</span>
                  <p className="text-sm text-gray-600">
                    Violating this order may result in civil or criminal penalties.
                  </p>
                </div>
              </label>
            </div>
          </div>
        );

      case 'abduction':
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                <strong>Items 5-6:</strong> Child abduction prevention and mediation referral.
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.child_abduction_risk || false}
                  onChange={(e) => updateField('child_abduction_risk', e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium">5. Child abduction prevention</span>
                  <p className="text-sm text-gray-600">
                    There is a risk that one party will take the children out of California without permission.
                  </p>
                </div>
              </label>

              {formData.child_abduction_risk && (
                <label className="flex items-center gap-2 ml-6">
                  <input
                    type="checkbox"
                    checked={formData.fl341b_attached || false}
                    onChange={(e) => updateField('fl341b_attached', e.target.checked)}
                  />
                  <span>Child Abduction Prevention Order Attachment (form FL-341(B)) is attached</span>
                </label>
              )}

              <label className="flex items-start gap-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.mediation_referral_enabled || false}
                  onChange={(e) => updateField('mediation_referral_enabled', e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className="font-medium">6. Mediation/Counseling Referral</span>
                  <p className="text-sm text-gray-600">
                    The court refers the parties to child custody mediation or counseling.
                  </p>
                </div>
              </label>

              {formData.mediation_referral_enabled && (
                <div className="ml-6">
                  <Label>Details</Label>
                  <Textarea
                    value={formData.mediation_referral_details || ''}
                    onChange={(e) => updateField('mediation_referral_details', e.target.value)}
                    placeholder="Specify mediation or counseling details..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'custody':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Item 7:</strong> Custody of the minor children is awarded as follows.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Children</h4>
                <Button variant="outline" size="sm" onClick={addChild}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Child
                </Button>
              </div>

              {(formData.children || []).map((child, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <h5 className="font-medium text-gray-700">Child {index + 1}</h5>
                    {(formData.children || []).length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChild(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Child&apos;s Name</Label>
                      <Input
                        value={child.child_name || ''}
                        onChange={(e) => updateChild(index, 'child_name', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Birth Date</Label>
                      <Input
                        type="date"
                        value={child.birth_date || ''}
                        onChange={(e) => updateChild(index, 'birth_date', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Legal Custody To</Label>
                      <select
                        value={child.legal_custody_to || ''}
                        onChange={(e) => updateChild(index, 'legal_custody_to', e.target.value)}
                        className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select...</option>
                        <option value="petitioner">Petitioner</option>
                        <option value="respondent">Respondent</option>
                        <option value="joint">Joint</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm">Physical Custody To</Label>
                      <select
                        value={child.physical_custody_to || ''}
                        onChange={(e) => updateChild(index, 'physical_custody_to', e.target.value)}
                        className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select...</option>
                        <option value="petitioner">Petitioner</option>
                        <option value="respondent">Respondent</option>
                        <option value="joint">Joint</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              <div className="border-t pt-4 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.joint_legal_custody_enabled || false}
                    onChange={(e) => updateField('joint_legal_custody_enabled', e.target.checked)}
                  />
                  <span>7b. Joint legal custody will be exercised as specified</span>
                </label>
                {formData.joint_legal_custody_enabled && (
                  <div className="ml-6 space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.joint_legal_custody_fl341e_attached || false}
                        onChange={(e) => updateField('joint_legal_custody_fl341e_attached', e.target.checked)}
                      />
                      <span>Joint Legal Custody Attachment (form FL-341(E)) attached</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.joint_legal_custody_attachment_7b || false}
                        onChange={(e) => updateField('joint_legal_custody_attachment_7b', e.target.checked)}
                      />
                      <span>Attachment 7b</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'abuse':
        return (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">
                <strong>Item 8:</strong> Custody involving allegations of abuse or substance abuse.
              </p>
            </div>

            <label className="flex items-start gap-3 p-3 border rounded-lg">
              <input
                type="checkbox"
                checked={formData.abuse_allegations_enabled || false}
                onChange={(e) => updateField('abuse_allegations_enabled', e.target.checked)}
                className="mt-1"
              />
              <div>
                <span className="font-medium">8. Allegations have been raised</span>
                <p className="text-sm text-gray-600">
                  Abuse or substance abuse allegations have been raised in FL-311 or other documents.
                </p>
              </div>
            </label>

            {formData.abuse_allegations_enabled && (
              <div className="space-y-4 ml-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium mb-2">8a(1). History of abuse alleged against:</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.abuse_alleged_against_petitioner || false}
                        onChange={(e) => updateField('abuse_alleged_against_petitioner', e.target.checked)}
                      />
                      <span>Petitioner</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.abuse_alleged_against_respondent || false}
                        onChange={(e) => updateField('abuse_alleged_against_respondent', e.target.checked)}
                      />
                      <span>Respondent</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.abuse_alleged_against_other || false}
                        onChange={(e) => updateField('abuse_alleged_against_other', e.target.checked)}
                      />
                      <span>Other parent/party</span>
                    </label>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium mb-2">8a(2). Substance abuse alleged against:</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.substance_abuse_alleged_against_petitioner || false}
                        onChange={(e) => updateField('substance_abuse_alleged_against_petitioner', e.target.checked)}
                      />
                      <span>Petitioner</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.substance_abuse_alleged_against_respondent || false}
                        onChange={(e) => updateField('substance_abuse_alleged_against_respondent', e.target.checked)}
                      />
                      <span>Respondent</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.substance_abuse_alleged_against_other || false}
                        onChange={(e) => updateField('substance_abuse_alleged_against_other', e.target.checked)}
                      />
                      <span>Other parent/party</span>
                    </label>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium mb-2">8b. Court does NOT grant custody to:</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.custody_denied_to_petitioner || false}
                        onChange={(e) => updateField('custody_denied_to_petitioner', e.target.checked)}
                      />
                      <span>Petitioner</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.custody_denied_to_respondent || false}
                        onChange={(e) => updateField('custody_denied_to_respondent', e.target.checked)}
                      />
                      <span>Respondent</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.custody_denied_to_other || false}
                        onChange={(e) => updateField('custody_denied_to_other', e.target.checked)}
                      />
                      <span>Other parent/party</span>
                    </label>
                  </div>
                </div>

                <label className="flex items-start gap-3 p-3 border rounded-lg">
                  <input
                    type="checkbox"
                    checked={formData.custody_granted_despite_allegations || false}
                    onChange={(e) => updateField('custody_granted_despite_allegations', e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium">8c. Despite allegations, court GRANTS custody as in Item 7</span>
                    <p className="text-sm text-gray-600">
                      The order is in the best interests of the child.
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>
        );

      case 'visitation':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Item 9:</strong> Visitation (parenting time) schedule.
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 p-3 border rounded-lg">
                <input
                  type="radio"
                  name="visitation_type"
                  checked={formData.visitation_reasonable || false}
                  onChange={() => {
                    updateField('visitation_reasonable', true);
                    updateField('visitation_see_attached', false);
                    updateField('visitation_none', false);
                    updateField('visitation_supervised', false);
                  }}
                />
                <div>
                  <span className="font-medium">9a. Reasonable right of visitation</span>
                  <p className="text-sm text-gray-600">(not appropriate in domestic violence cases)</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg">
                <input
                  type="radio"
                  name="visitation_type"
                  checked={formData.visitation_see_attached || false}
                  onChange={() => {
                    updateField('visitation_reasonable', false);
                    updateField('visitation_see_attached', true);
                    updateField('visitation_none', false);
                    updateField('visitation_supervised', false);
                  }}
                />
                <div className="flex-1">
                  <span className="font-medium">9b. See attached document</span>
                  {formData.visitation_see_attached && (
                    <div className="mt-2">
                      <Input
                        type="number"
                        value={formData.visitation_attached_pages || ''}
                        onChange={(e) => updateField('visitation_attached_pages', parseInt(e.target.value))}
                        placeholder="Number of pages"
                        className="w-32"
                      />
                    </div>
                  )}
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg">
                <input
                  type="radio"
                  name="visitation_type"
                  checked={formData.visitation_none || false}
                  onChange={() => {
                    updateField('visitation_reasonable', false);
                    updateField('visitation_see_attached', false);
                    updateField('visitation_none', true);
                    updateField('visitation_supervised', false);
                  }}
                />
                <span className="font-medium">9c. No visitation (parenting time)</span>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg">
                <input
                  type="radio"
                  name="visitation_type"
                  checked={formData.visitation_supervised || false}
                  onChange={() => {
                    updateField('visitation_reasonable', false);
                    updateField('visitation_see_attached', false);
                    updateField('visitation_none', false);
                    updateField('visitation_supervised', true);
                  }}
                />
                <div>
                  <span className="font-medium">9d. Supervised visitation</span>
                  <p className="text-sm text-gray-600">As specified in FL-341(A)</p>
                </div>
              </label>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">9e. Specific Visitation Schedule</h4>

              <div>
                <Label>Visitation for:</Label>
                <select
                  value={formData.visitation_for_party || ''}
                  onChange={(e) => updateField('visitation_for_party', e.target.value)}
                  className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  <option value="petitioner">Petitioner</option>
                  <option value="respondent">Respondent</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <label className="flex items-start gap-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.alternate_weekends_enabled || false}
                  onChange={(e) => updateField('alternate_weekends_enabled', e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className="font-medium">9e(1)(B). Alternate weekends</span>
                  {formData.alternate_weekends_enabled && (
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Starting date</Label>
                        <Input
                          type="date"
                          value={formData.alternate_weekends_starting || ''}
                          onChange={(e) => updateField('alternate_weekends_starting', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">From</Label>
                        <Input
                          value={formData.alternate_weekends_from_day || ''}
                          onChange={(e) => updateField('alternate_weekends_from_day', e.target.value)}
                          placeholder="e.g., Friday"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">From time</Label>
                        <Input
                          type="time"
                          value={formData.alternate_weekends_from_time || ''}
                          onChange={(e) => updateField('alternate_weekends_from_time', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">To</Label>
                        <Input
                          value={formData.alternate_weekends_to_day || ''}
                          onChange={(e) => updateField('alternate_weekends_to_day', e.target.value)}
                          placeholder="e.g., Sunday"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.weekdays_enabled || false}
                  onChange={(e) => updateField('weekdays_enabled', e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className="font-medium">9e(1)(C). Weekdays</span>
                  {formData.weekdays_enabled && (
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Starting date</Label>
                        <Input
                          type="date"
                          value={formData.weekdays_starting || ''}
                          onChange={(e) => updateField('weekdays_starting', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Day(s)</Label>
                        <Input
                          value={formData.weekdays_from_day || ''}
                          onChange={(e) => updateField('weekdays_from_day', e.target.value)}
                          placeholder="e.g., Wednesday"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.virtual_visitation_enabled || false}
                  onChange={(e) => updateField('virtual_visitation_enabled', e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className="font-medium">9e(2). Virtual visitation</span>
                  {formData.virtual_visitation_enabled && (
                    <div className="mt-2">
                      <Textarea
                        value={formData.virtual_visitation_details || ''}
                        onChange={(e) => updateField('virtual_visitation_details', e.target.value)}
                        placeholder="Specify virtual visitation schedule..."
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        );

      case 'supervised':
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                <strong>Item 10:</strong> Supervised visitation orders.
              </p>
            </div>

            <label className="flex items-start gap-3 p-3 border rounded-lg">
              <input
                type="checkbox"
                checked={formData.supervised_visitation_enabled || false}
                onChange={(e) => updateField('supervised_visitation_enabled', e.target.checked)}
                className="mt-1"
              />
              <div>
                <span className="font-medium">10. Supervised visitation required</span>
                <p className="text-sm text-gray-600">Per FL-341(A) attachment</p>
              </div>
            </label>

            {formData.supervised_visitation_enabled && (
              <div className="space-y-4 ml-4">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="supervised_until"
                      checked={formData.supervised_until_further_order || false}
                      onChange={() => {
                        updateField('supervised_until_further_order', true);
                        updateField('supervised_until_other', '');
                      }}
                    />
                    <span>Until further order of the court</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="supervised_until"
                      checked={!formData.supervised_until_further_order && Boolean(formData.supervised_until_other)}
                      onChange={() => updateField('supervised_until_further_order', false)}
                    />
                    <span>Other:</span>
                  </label>
                </div>
                {!formData.supervised_until_further_order && (
                  <Input
                    value={formData.supervised_until_other || ''}
                    onChange={(e) => updateField('supervised_until_other', e.target.value)}
                    placeholder="Specify condition..."
                  />
                )}

                <div>
                  <Label>Supervised party:</Label>
                  <select
                    value={formData.supervised_party || ''}
                    onChange={(e) => updateField('supervised_party', e.target.value)}
                    className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="petitioner">Petitioner</option>
                    <option value="respondent">Respondent</option>
                    <option value="other_parent_party">Other parent/party</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        );

      case 'transportation':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Item 11:</strong> Transportation and place of exchange.
              </p>
            </div>

            <label className="flex items-start gap-3 p-3 border rounded-lg">
              <input
                type="checkbox"
                checked={formData.transportation_enabled || false}
                onChange={(e) => updateField('transportation_enabled', e.target.checked)}
                className="mt-1"
              />
              <span className="font-medium">11. Transportation orders apply</span>
            </label>

            {formData.transportation_enabled && (
              <div className="space-y-4 ml-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.transportation_licensed_insured || false}
                    onChange={(e) => updateField('transportation_licensed_insured', e.target.checked)}
                  />
                  <span>11a. Children must be driven by licensed and insured driver</span>
                </label>

                <div>
                  <Label>11b. Transportation TO visits by:</Label>
                  <select
                    value={formData.transportation_to_by || ''}
                    onChange={(e) => updateField('transportation_to_by', e.target.value)}
                    className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="petitioner">Petitioner</option>
                    <option value="respondent">Respondent</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <Label>11c. Transportation FROM visits by:</Label>
                  <select
                    value={formData.transportation_from_by || ''}
                    onChange={(e) => updateField('transportation_from_by', e.target.value)}
                    className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="petitioner">Petitioner</option>
                    <option value="respondent">Respondent</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <Label>11d. Exchange point at start of visit:</Label>
                  <Input
                    value={formData.exchange_start_address || ''}
                    onChange={(e) => updateField('exchange_start_address', e.target.value)}
                    placeholder="Address"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>11e. Exchange point at end of visit:</Label>
                  <Input
                    value={formData.exchange_end_address || ''}
                    onChange={(e) => updateField('exchange_end_address', e.target.value)}
                    placeholder="Address"
                    className="mt-1"
                  />
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.curbside_exchange || false}
                    onChange={(e) => updateField('curbside_exchange', e.target.checked)}
                  />
                  <span>11f. Curbside exchange (driving party waits in car)</span>
                </label>

                <div>
                  <Label>11g. Other transportation orders:</Label>
                  <Textarea
                    value={formData.transportation_other || ''}
                    onChange={(e) => updateField('transportation_other', e.target.value)}
                    placeholder="Specify other arrangements..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'travel':
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                <strong>Item 12:</strong> Travel with children restrictions.
              </p>
            </div>

            <label className="flex items-start gap-3 p-3 border rounded-lg">
              <input
                type="checkbox"
                checked={formData.travel_restrictions_enabled || false}
                onChange={(e) => updateField('travel_restrictions_enabled', e.target.checked)}
                className="mt-1"
              />
              <span className="font-medium">12. Travel restrictions apply</span>
            </label>

            {formData.travel_restrictions_enabled && (
              <div className="space-y-4 ml-4">
                <div>
                  <Label>Restricted party:</Label>
                  <select
                    value={formData.travel_restricted_party || ''}
                    onChange={(e) => updateField('travel_restricted_party', e.target.value)}
                    className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="petitioner">Petitioner</option>
                    <option value="respondent">Respondent</option>
                    <option value="other_parent_party">Other parent/party</option>
                  </select>
                </div>

                <p className="text-sm text-gray-600">Must have written permission to take children out of:</p>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.travel_restrict_california || false}
                    onChange={(e) => updateField('travel_restrict_california', e.target.checked)}
                  />
                  <span>12a. The state of California</span>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={formData.travel_restrict_counties || false}
                    onChange={(e) => updateField('travel_restrict_counties', e.target.checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <span>12b. The following counties:</span>
                    {formData.travel_restrict_counties && (
                      <Input
                        value={formData.travel_allowed_counties || ''}
                        onChange={(e) => updateField('travel_allowed_counties', e.target.value)}
                        placeholder="Specify counties"
                        className="mt-1"
                      />
                    )}
                  </div>
                </label>

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={formData.travel_restrict_other_places || false}
                    onChange={(e) => updateField('travel_restrict_other_places', e.target.checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <span>12c. Other places:</span>
                    {formData.travel_restrict_other_places && (
                      <Input
                        value={formData.travel_other_places || ''}
                        onChange={(e) => updateField('travel_other_places', e.target.value)}
                        placeholder="Specify places"
                        className="mt-1"
                      />
                    )}
                  </div>
                </label>
              </div>
            )}
          </div>
        );

      case 'holiday':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Items 13-14:</strong> Holiday schedule and additional provisions.
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.holiday_schedule_enabled || false}
                  onChange={(e) => updateField('holiday_schedule_enabled', e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium">13. Holiday schedule</span>
                  <p className="text-sm text-gray-600">Children will spend holiday time as specified</p>
                </div>
              </label>

              {formData.holiday_schedule_enabled && (
                <div className="ml-4 space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="holiday_location"
                      checked={formData.holiday_schedule_below || false}
                      onChange={() => {
                        updateField('holiday_schedule_below', true);
                        updateField('holiday_schedule_attached', false);
                      }}
                    />
                    <span>Listed below</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="holiday_location"
                      checked={formData.holiday_schedule_attached || false}
                      onChange={() => {
                        updateField('holiday_schedule_below', false);
                        updateField('holiday_schedule_attached', true);
                      }}
                    />
                    <span>In attached schedule (FL-341(C))</span>
                  </label>
                </div>
              )}

              <label className="flex items-start gap-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.additional_provisions_enabled || false}
                  onChange={(e) => updateField('additional_provisions_enabled', e.target.checked)}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium">14. Additional custody provisions</span>
                  <p className="text-sm text-gray-600">Additional provisions apply</p>
                </div>
              </label>

              {formData.additional_provisions_enabled && (
                <div className="ml-4 space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="provisions_location"
                      checked={formData.additional_provisions_below || false}
                      onChange={() => {
                        updateField('additional_provisions_below', true);
                        updateField('additional_provisions_attached', false);
                      }}
                    />
                    <span>Listed below</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="provisions_location"
                      checked={formData.additional_provisions_attached || false}
                      onChange={() => {
                        updateField('additional_provisions_below', false);
                        updateField('additional_provisions_attached', true);
                      }}
                    />
                    <span>In attached schedule (FL-341(D))</span>
                  </label>
                  {formData.additional_provisions_below && (
                    <Textarea
                      value={formData.additional_provisions_details || ''}
                      onChange={(e) => updateField('additional_provisions_details', e.target.value)}
                      placeholder="Specify additional provisions..."
                      rows={4}
                      className="mt-2"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'other':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Items 15-16:</strong> Access to records and other orders.
              </p>
            </div>

            <label className="flex items-start gap-3 p-3 border rounded-lg">
              <input
                type="checkbox"
                checked={formData.access_to_records_confirmed || false}
                onChange={(e) => updateField('access_to_records_confirmed', e.target.checked)}
                className="mt-1"
              />
              <div>
                <span className="font-medium">15. Access to children&apos;s records</span>
                <p className="text-sm text-gray-600">
                  Both parents have the right to access records (medical, dental, school) and consult with professionals.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border rounded-lg">
              <input
                type="checkbox"
                checked={formData.other_orders_enabled || false}
                onChange={(e) => updateField('other_orders_enabled', e.target.checked)}
                className="mt-1"
              />
              <div className="flex-1">
                <span className="font-medium">16. Other orders</span>
                {formData.other_orders_enabled && (
                  <Textarea
                    value={formData.other_orders_details || ''}
                    onChange={(e) => updateField('other_orders_details', e.target.value)}
                    placeholder="Specify other orders..."
                    rows={4}
                    className="mt-2"
                  />
                )}
              </div>
            </label>
          </div>
        );

      default:
        return <p>Section not implemented</p>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">FL-341: Child Custody and Visitation Order</CardTitle>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-300">
              Attachment
            </Badge>
          </div>
          <CardDescription>California Judicial Council Form [Rev. January 1, 2026]</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>
                Section {currentSection + 1} of {WIZARD_SECTIONS.length}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mt-4">
            {WIZARD_SECTIONS.map((s, idx) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentSection(idx)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    idx === currentSection
                      ? 'bg-green-100 text-green-700 font-medium'
                      : idx < currentSection
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {idx < currentSection && <CheckCircle className="h-3 w-3" />}
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{s.title}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SectionIcon className="h-5 w-5 text-green-600" />
            <CardTitle>{section.title}</CardTitle>
          </div>
          <CardDescription>Form items: {section.items.join(', ')}</CardDescription>
        </CardHeader>
        <CardContent>{renderSectionContent()}</CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrevious} disabled={isLoading}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentSection === 0 && onBack ? 'Back to Summary' : 'Previous'}
        </Button>

        <div className="flex gap-2">
          {onSave && (
            <Button variant="outline" onClick={() => onSave(formData)} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          )}

          {currentSection < WIZARD_SECTIONS.length - 1 ? (
            <Button onClick={handleNext} disabled={isLoading}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enter Custody Order
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
