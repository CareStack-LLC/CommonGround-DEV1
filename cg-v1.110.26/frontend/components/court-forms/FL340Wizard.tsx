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
  Gavel,
  Calendar,
  Scale,
  DollarSign,
  Home,
  Clock,
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
  { id: 'hearing', title: '1. Hearing Information', icon: Calendar, items: ['1'] },
  { id: 'attendance', title: 'Attendance', icon: Users, items: ['1a-c'] },
  { id: 'custody', title: '2. Custody & Visitation', icon: Users, items: ['2'] },
  { id: 'child_support', title: '3. Child Support', icon: DollarSign, items: ['3'] },
  { id: 'spousal_support', title: '4. Spousal Support', icon: DollarSign, items: ['4'] },
  { id: 'property', title: '5. Property Orders', icon: Home, items: ['5'] },
  { id: 'attorney_fees', title: '6. Attorney Fees', icon: Scale, items: ['6'] },
  { id: 'other_orders', title: '7-8. Other Orders', icon: Gavel, items: ['7-8'] },
  { id: 'reschedule', title: '9. Rescheduled Hearing', icon: Clock, items: ['9'] },
  { id: 'signatures', title: 'Signatures', icon: FileText, items: ['Signatures'] },
];

interface FL340FormData {
  // Header
  party_name?: string;
  firm_name?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  telephone?: string;
  fax?: string;
  email?: string;
  attorney_for?: string;
  state_bar_number?: string;
  court_county?: string;
  petitioner_name?: string;
  respondent_name?: string;
  other_parent_party_name?: string;
  case_number?: string;

  // Hearing info
  hearing_date?: string;
  hearing_time?: string;
  hearing_dept?: string;
  hearing_room?: string;
  judge_name?: string;
  is_temporary_judge?: boolean;
  motion_filed_date?: string;
  motion_filed_by?: string;

  // Attendance
  petitioner_present?: boolean;
  petitioner_attorney_present?: boolean;
  petitioner_attorney_name?: string;
  respondent_present?: boolean;
  respondent_attorney_present?: boolean;
  respondent_attorney_name?: string;
  other_parent_present?: boolean;
  other_parent_attorney_present?: boolean;
  other_parent_attorney_name?: string;

  // Court Orders
  custody_as_attached?: boolean;
  custody_attachment_form?: string;
  custody_other?: boolean;
  custody_other_details?: string;
  custody_not_applicable?: boolean;

  child_support_as_attached?: boolean;
  child_support_attachment_form?: string;
  child_support_other?: boolean;
  child_support_other_details?: string;
  child_support_not_applicable?: boolean;

  spousal_support_as_attached?: boolean;
  spousal_support_attachment_form?: string;
  spousal_support_other?: boolean;
  spousal_support_other_details?: string;
  spousal_support_not_applicable?: boolean;

  property_as_attached?: boolean;
  property_attachment_form?: string;
  property_other?: boolean;
  property_other_details?: string;
  property_not_applicable?: boolean;

  attorney_fees_as_attached?: boolean;
  attorney_fees_attachment_form?: string;
  attorney_fees_other?: boolean;
  attorney_fees_other_details?: string;
  attorney_fees_not_applicable?: boolean;

  other_orders_as_attached?: boolean;
  other_orders_not_applicable?: boolean;
  other_orders_details?: string;

  all_other_issues_reserved?: boolean;

  // Rescheduled hearing
  rescheduled_hearing_enabled?: boolean;
  rescheduled_date?: string;
  rescheduled_time?: string;
  rescheduled_dept?: string;
  rescheduled_issues?: string;

  // Signatures
  judicial_officer_date?: string;
  order_prepared_by?: string;
  order_approved_as_conforming?: boolean;
  attorney_signature_1_date?: string;
  attorney_signature_1_for?: string;
  attorney_signature_2_date?: string;
  attorney_signature_2_for?: string;
}

interface FL340WizardProps {
  initialData?: Partial<FL340FormData>;
  caseData?: {
    petitioner_name?: string;
    respondent_name?: string;
    case_number?: string;
    court_county?: string;
  };
  onSave?: (data: FL340FormData) => Promise<void>;
  onSubmit?: (data: FL340FormData) => Promise<void>;
  isLoading?: boolean;
  startSection?: number;
  onBack?: () => void;
}

export default function FL340Wizard({
  initialData = {},
  caseData,
  onSave,
  onSubmit,
  isLoading = false,
  startSection = 0,
  onBack,
}: FL340WizardProps) {
  const [currentSection, setCurrentSection] = useState(startSection);
  const [formData, setFormData] = useState<FL340FormData>({
    // Pre-fill from case data
    petitioner_name: caseData?.petitioner_name || '',
    respondent_name: caseData?.respondent_name || '',
    case_number: caseData?.case_number || '',
    court_county: caseData?.court_county || '',
    state: 'CA',
    ...initialData,
  });

  const updateField = (field: keyof FL340FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

  // Render order item section (custody, support, etc.)
  const renderOrderItem = (
    prefix: string,
    title: string,
    defaultAttachment: string
  ) => {
    const asAttachedKey = `${prefix}_as_attached` as keyof FL340FormData;
    const attachmentFormKey = `${prefix}_attachment_form` as keyof FL340FormData;
    const otherKey = `${prefix}_other` as keyof FL340FormData;
    const otherDetailsKey = `${prefix}_other_details` as keyof FL340FormData;
    const notApplicableKey = `${prefix}_not_applicable` as keyof FL340FormData;

    return (
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">{title}</h4>

        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={Boolean(formData[asAttachedKey])}
              onChange={(e) => {
                updateField(asAttachedKey, e.target.checked);
                if (e.target.checked) {
                  updateField(attachmentFormKey, defaultAttachment);
                  updateField(otherKey, false);
                  updateField(notApplicableKey, false);
                }
              }}
              className="mt-1"
            />
            <div>
              <span className="font-medium">As attached</span>
              {formData[asAttachedKey] && (
                <div className="mt-2">
                  <Label className="text-sm">on form</Label>
                  <Input
                    value={(formData[attachmentFormKey] as string) || ''}
                    onChange={(e) => updateField(attachmentFormKey, e.target.value)}
                    placeholder={defaultAttachment}
                    className="mt-1 w-32"
                  />
                </div>
              )}
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={Boolean(formData[otherKey])}
              onChange={(e) => {
                updateField(otherKey, e.target.checked);
                if (e.target.checked) {
                  updateField(asAttachedKey, false);
                  updateField(notApplicableKey, false);
                }
              }}
              className="mt-1"
            />
            <div className="flex-1">
              <span className="font-medium">Other</span>
              {formData[otherKey] && (
                <div className="mt-2">
                  <Textarea
                    value={(formData[otherDetailsKey] as string) || ''}
                    onChange={(e) => updateField(otherDetailsKey, e.target.value)}
                    placeholder="Specify order details..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={Boolean(formData[notApplicableKey])}
              onChange={(e) => {
                updateField(notApplicableKey, e.target.checked);
                if (e.target.checked) {
                  updateField(asAttachedKey, false);
                  updateField(otherKey, false);
                }
              }}
            />
            <span className="font-medium">Not applicable</span>
          </label>
        </div>
      </div>
    );
  };

  // Render section content
  const renderSectionContent = () => {
    switch (section.id) {
      case 'header':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Petitioner/Plaintiff</Label>
                <Input
                  value={formData.petitioner_name || ''}
                  onChange={(e) => updateField('petitioner_name', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Respondent/Defendant</Label>
                <Input
                  value={formData.respondent_name || ''}
                  onChange={(e) => updateField('respondent_name', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Other Parent/Party (if applicable)</Label>
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

            <div>
              <Label>County</Label>
              <Input
                value={formData.court_county || ''}
                onChange={(e) => updateField('court_county', e.target.value)}
                placeholder="e.g., Los Angeles"
                className="mt-1"
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3">Order Prepared By (optional)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={formData.party_name || ''}
                    onChange={(e) => updateField('party_name', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>State Bar Number</Label>
                  <Input
                    value={formData.state_bar_number || ''}
                    onChange={(e) => updateField('state_bar_number', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'hearing':
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                <strong>Item 1:</strong> This proceeding was heard on the date, time, and location specified below.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hearing Date *</Label>
                <Input
                  type="date"
                  value={formData.hearing_date || ''}
                  onChange={(e) => updateField('hearing_date', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Hearing Time</Label>
                <Input
                  type="time"
                  value={formData.hearing_time || ''}
                  onChange={(e) => updateField('hearing_time', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Department</Label>
                <Input
                  value={formData.hearing_dept || ''}
                  onChange={(e) => updateField('hearing_dept', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Room</Label>
                <Input
                  value={formData.hearing_room || ''}
                  onChange={(e) => updateField('hearing_room', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Judge Name</Label>
                <Input
                  value={formData.judge_name || ''}
                  onChange={(e) => updateField('judge_name', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.is_temporary_judge || false}
                    onChange={(e) => updateField('is_temporary_judge', e.target.checked)}
                  />
                  <span>Temporary Judge</span>
                </label>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">On the order to show cause, notice of motion or request for order</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Filed (date)</Label>
                  <Input
                    type="date"
                    value={formData.motion_filed_date || ''}
                    onChange={(e) => updateField('motion_filed_date', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>By (name)</Label>
                  <Input
                    value={formData.motion_filed_by || ''}
                    onChange={(e) => updateField('motion_filed_by', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'attendance':
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                <strong>Items 1a-c:</strong> Record attendance at the hearing.
              </p>
            </div>

            {/* Petitioner */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium">1a. Petitioner/Plaintiff</h4>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.petitioner_present || false}
                    onChange={(e) => updateField('petitioner_present', e.target.checked)}
                  />
                  <span>Present</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.petitioner_attorney_present || false}
                    onChange={(e) => updateField('petitioner_attorney_present', e.target.checked)}
                  />
                  <span>Attorney present</span>
                </label>
              </div>
              {formData.petitioner_attorney_present && (
                <div>
                  <Label className="text-sm">Attorney name</Label>
                  <Input
                    value={formData.petitioner_attorney_name || ''}
                    onChange={(e) => updateField('petitioner_attorney_name', e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            {/* Respondent */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium">1b. Respondent/Defendant</h4>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.respondent_present || false}
                    onChange={(e) => updateField('respondent_present', e.target.checked)}
                  />
                  <span>Present</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.respondent_attorney_present || false}
                    onChange={(e) => updateField('respondent_attorney_present', e.target.checked)}
                  />
                  <span>Attorney present</span>
                </label>
              </div>
              {formData.respondent_attorney_present && (
                <div>
                  <Label className="text-sm">Attorney name</Label>
                  <Input
                    value={formData.respondent_attorney_name || ''}
                    onChange={(e) => updateField('respondent_attorney_name', e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            {/* Other Parent */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium">1c. Other parent/party</h4>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.other_parent_present || false}
                    onChange={(e) => updateField('other_parent_present', e.target.checked)}
                  />
                  <span>Present</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.other_parent_attorney_present || false}
                    onChange={(e) => updateField('other_parent_attorney_present', e.target.checked)}
                  />
                  <span>Attorney present</span>
                </label>
              </div>
              {formData.other_parent_attorney_present && (
                <div>
                  <Label className="text-sm">Attorney name</Label>
                  <Input
                    value={formData.other_parent_attorney_name || ''}
                    onChange={(e) => updateField('other_parent_attorney_name', e.target.value)}
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
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                <strong>Item 2:</strong> Custody and visitation/parenting time orders.
              </p>
            </div>
            {renderOrderItem('custody', 'Custody and visitation/parenting time', 'FL-341')}
          </div>
        );

      case 'child_support':
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                <strong>Item 3:</strong> Child support orders.
              </p>
            </div>
            {renderOrderItem('child_support', 'Child support', 'FL-342')}
          </div>
        );

      case 'spousal_support':
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                <strong>Item 4:</strong> Spousal or family support orders.
              </p>
            </div>
            {renderOrderItem('spousal_support', 'Spousal or family support', 'FL-343')}
          </div>
        );

      case 'property':
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                <strong>Item 5:</strong> Property orders.
              </p>
            </div>
            {renderOrderItem('property', 'Property orders', 'FL-344')}
          </div>
        );

      case 'attorney_fees':
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                <strong>Item 6:</strong> Attorney&apos;s fees orders.
              </p>
            </div>
            {renderOrderItem('attorney_fees', "Attorney's fees", 'FL-346')}
          </div>
        );

      case 'other_orders':
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                <strong>Items 7-8:</strong> Other orders and reserved issues.
              </p>
            </div>

            {/* Item 7 */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">7. Other orders</h4>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.other_orders_as_attached || false}
                    onChange={(e) => {
                      updateField('other_orders_as_attached', e.target.checked);
                      if (e.target.checked) {
                        updateField('other_orders_not_applicable', false);
                      }
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <span className="font-medium">As attached</span>
                    {formData.other_orders_as_attached && (
                      <div className="mt-2">
                        <Textarea
                          value={formData.other_orders_details || ''}
                          onChange={(e) => updateField('other_orders_details', e.target.value)}
                          placeholder="Describe the attached orders..."
                          rows={3}
                        />
                      </div>
                    )}
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.other_orders_not_applicable || false}
                    onChange={(e) => {
                      updateField('other_orders_not_applicable', e.target.checked);
                      if (e.target.checked) {
                        updateField('other_orders_as_attached', false);
                      }
                    }}
                  />
                  <span className="font-medium">Not applicable</span>
                </label>
              </div>
            </div>

            {/* Item 8 */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">8. All other issues</h4>
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.all_other_issues_reserved || false}
                  onChange={(e) => updateField('all_other_issues_reserved', e.target.checked)}
                />
                <span className="font-medium">All other issues are reserved until further order of court</span>
              </label>
            </div>
          </div>
        );

      case 'reschedule':
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                <strong>Item 9:</strong> If the matter is rescheduled for further hearing.
              </p>
            </div>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={formData.rescheduled_hearing_enabled || false}
                onChange={(e) => updateField('rescheduled_hearing_enabled', e.target.checked)}
              />
              <span className="font-medium">This matter is rescheduled for further hearing</span>
            </label>

            {formData.rescheduled_hearing_enabled && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={formData.rescheduled_date || ''}
                      onChange={(e) => updateField('rescheduled_date', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={formData.rescheduled_time || ''}
                      onChange={(e) => updateField('rescheduled_time', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input
                      value={formData.rescheduled_dept || ''}
                      onChange={(e) => updateField('rescheduled_dept', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>On the following issues</Label>
                  <Textarea
                    value={formData.rescheduled_issues || ''}
                    onChange={(e) => updateField('rescheduled_issues', e.target.value)}
                    placeholder="Specify the issues to be addressed at the rescheduled hearing..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'signatures':
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 text-sm">
                <strong>Signatures:</strong> Judicial officer and attorney signatures.
              </p>
            </div>

            {/* Judicial Officer */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium">Judicial Officer</h4>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.judicial_officer_date || ''}
                  onChange={(e) => updateField('judicial_officer_date', e.target.value)}
                  className="mt-1 w-48"
                />
              </div>
            </div>

            {/* Order Prepared By */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium">Order prepared by</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prepared by (name)</Label>
                  <Input
                    value={formData.order_prepared_by || ''}
                    onChange={(e) => updateField('order_prepared_by', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.order_approved_as_conforming || false}
                      onChange={(e) => updateField('order_approved_as_conforming', e.target.checked)}
                    />
                    <span>Approved as conforming to the court order</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Attorney Signatures */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium">Attorney Signatures</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Attorney 1 - Date</Label>
                  <Input
                    type="date"
                    value={formData.attorney_signature_1_date || ''}
                    onChange={(e) => updateField('attorney_signature_1_date', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Attorney for</Label>
                  <select
                    value={formData.attorney_signature_1_for || ''}
                    onChange={(e) => updateField('attorney_signature_1_for', e.target.value)}
                    className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="petitioner">Petitioner/Plaintiff</option>
                    <option value="respondent">Respondent/Defendant</option>
                    <option value="other_parent_party">Other Parent/Party</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Attorney 2 - Date</Label>
                  <Input
                    type="date"
                    value={formData.attorney_signature_2_date || ''}
                    onChange={(e) => updateField('attorney_signature_2_date', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Attorney for</Label>
                  <select
                    value={formData.attorney_signature_2_for || ''}
                    onChange={(e) => updateField('attorney_signature_2_for', e.target.value)}
                    className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="petitioner">Petitioner/Plaintiff</option>
                    <option value="respondent">Respondent/Defendant</option>
                    <option value="other_parent_party">Other Parent/Party</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <p>Section not implemented</p>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-lg">FL-340: Findings and Order After Hearing</CardTitle>
            </div>
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Court Form
            </Badge>
          </div>
          <CardDescription>California Judicial Council Form [Rev. July 1, 2025]</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>
                Section {currentSection + 1} of {WIZARD_SECTIONS.length}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Section Breadcrumbs */}
          <div className="flex flex-wrap gap-1 mt-4">
            {WIZARD_SECTIONS.map((s, idx) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentSection(idx)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    idx === currentSection
                      ? 'bg-amber-100 text-amber-700 font-medium'
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
            <SectionIcon className="h-5 w-5 text-amber-600" />
            <CardTitle>{section.title}</CardTitle>
          </div>
          <CardDescription>
            Form items: {section.items.join(', ')}
          </CardDescription>
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
            <Button onClick={handleSubmit} disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enter Court Order
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
