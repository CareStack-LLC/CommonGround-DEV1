'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DollarSign,
  Users,
  ArrowRight,
  ArrowLeft,
  Save,
  Send,
  CheckCircle,
  Heart,
  Briefcase,
  GraduationCap,
  Plane,
  FileText,
  Plus,
  Trash2,
  Calculator,
  CreditCard,
} from 'lucide-react';

interface FL342Child {
  child_name: string;
  birth_date?: string;
}

interface FL342IncomeInfo {
  gross_monthly_income?: number;
  hardship_deduction?: number;
  net_monthly_disposable_income?: number;
}

interface FL342FormData {
  petitioner_name?: string;
  respondent_name?: string;
  other_parent_party_name?: string;
  case_number?: string;
  attached_to_fl340?: boolean;
  attached_to_fl180?: boolean;
  attached_to_fl250?: boolean;
  attached_to_other?: boolean;
  attached_to_other_specify?: string;
  children?: FL342Child[];
  child_support_ordered?: boolean;
  support_payor?: string;
  support_payee?: string;
  monthly_child_support_amount?: number;
  support_payable_on_date?: number;
  support_effective_date?: string;
  support_terminates_per_statute?: boolean;
  support_terminates_on_date?: string;
  support_terminates_other?: string;
  guideline_amount_calculated?: boolean;
  guideline_monthly_amount?: number;
  order_below_guideline?: boolean;
  below_guideline_reason?: string;
  order_above_guideline?: boolean;
  above_guideline_reason?: string;
  non_guideline_agreed?: boolean;
  petitioner_income?: FL342IncomeInfo;
  respondent_income?: FL342IncomeInfo;
  timeshare_percentage_petitioner?: number;
  timeshare_percentage_respondent?: number;
  income_expense_declaration_filed?: boolean;
  health_insurance_ordered?: boolean;
  health_insurance_provider?: string;
  health_insurance_cost?: number;
  health_insurance_petitioner_pays?: number;
  health_insurance_respondent_pays?: number;
  uninsured_costs_petitioner_percentage?: number;
  uninsured_costs_respondent_percentage?: number;
  cash_medical_support?: number;
  cash_medical_payor?: string;
  childcare_costs_ordered?: boolean;
  childcare_monthly_cost?: number;
  childcare_petitioner_percentage?: number;
  childcare_respondent_percentage?: number;
  childcare_reason?: string;
  education_costs_ordered?: boolean;
  education_monthly_cost?: number;
  education_petitioner_percentage?: number;
  education_respondent_percentage?: number;
  education_description?: string;
  travel_costs_ordered?: boolean;
  travel_petitioner_percentage?: number;
  travel_respondent_percentage?: number;
  travel_notes?: string;
  payor_has_other_children?: boolean;
  payor_other_children_count?: number;
  payor_other_support_amount?: number;
  earnings_assignment_ordered?: boolean;
  earnings_assignment_stayed?: boolean;
  earnings_assignment_stayed_reason?: string;
  wage_assignment_service_required?: boolean;
  arrears_exist?: boolean;
  arrears_amount?: number;
  arrears_as_of_date?: string;
  arrears_monthly_payment?: number;
  arrears_interest_rate?: number;
  other_orders_enabled?: boolean;
  other_orders_details?: string;
  judicial_officer_signature_date?: string;
  judicial_officer_name?: string;
}

interface CaseData {
  petitioner_name?: string;
  respondent_name?: string;
  case_number?: string;
  children?: { first_name: string; last_name: string; date_of_birth?: string }[];
}

interface FL342WizardProps {
  initialData?: FL342FormData;
  caseData?: CaseData;
  onSave?: (data: FL342FormData) => Promise<void>;
  onSubmit?: (data: FL342FormData) => Promise<void>;
  isLoading?: boolean;
  startSection?: number;
  onBack?: () => void;
}

const WIZARD_SECTIONS = [
  { id: 'header', title: 'Case Information', icon: FileText },
  { id: 'children', title: 'Children Covered', icon: Users },
  { id: 'support', title: 'Child Support Order', icon: DollarSign },
  { id: 'guideline', title: 'Guideline Calculation', icon: Calculator },
  { id: 'income', title: 'Income Information', icon: Briefcase },
  { id: 'health', title: 'Health Insurance', icon: Heart },
  { id: 'childcare', title: 'Childcare Costs', icon: Users },
  { id: 'education', title: 'Educational Costs', icon: GraduationCap },
  { id: 'travel', title: 'Travel Expenses', icon: Plane },
  { id: 'earnings', title: 'Earnings Assignment', icon: CreditCard },
  { id: 'arrears', title: 'Arrears', icon: DollarSign },
  { id: 'other', title: 'Other Orders', icon: FileText },
];

export default function FL342Wizard({
  initialData = {},
  caseData,
  onSave,
  onSubmit,
  isLoading = false,
  startSection = 0,
  onBack,
}: FL342WizardProps) {
  const [currentSection, setCurrentSection] = useState(startSection);
  const [formData, setFormData] = useState<FL342FormData>(() => ({
    petitioner_name: caseData?.petitioner_name || '',
    respondent_name: caseData?.respondent_name || '',
    case_number: caseData?.case_number || '',
    attached_to_fl340: true,
    children: caseData?.children?.map(c => ({
      child_name: `${c.first_name} ${c.last_name}`,
      birth_date: c.date_of_birth,
    })) || [],
    child_support_ordered: true,
    earnings_assignment_ordered: true,
    ...initialData,
  }));

  const updateField = (field: keyof FL342FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (parent: 'petitioner_income' | 'respondent_income', field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] || {}),
        [field]: value,
      },
    }));
  };

  const addChild = () => {
    setFormData(prev => ({
      ...prev,
      children: [...(prev.children || []), { child_name: '', birth_date: '' }],
    }));
  };

  const removeChild = (index: number) => {
    setFormData(prev => ({
      ...prev,
      children: (prev.children || []).filter((_, i) => i !== index),
    }));
  };

  const updateChild = (index: number, field: keyof FL342Child, value: string) => {
    setFormData(prev => ({
      ...prev,
      children: (prev.children || []).map((child, i) =>
        i === index ? { ...child, [field]: value } : child
      ),
    }));
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

  const progress = ((currentSection + 1) / WIZARD_SECTIONS.length) * 100;
  const section = WIZARD_SECTIONS[currentSection];
  const SectionIcon = section.icon;

  const renderSection = () => {
    switch (section.id) {
      case 'header':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Petitioner Name</Label>
                <Input
                  value={formData.petitioner_name || ''}
                  onChange={e => updateField('petitioner_name', e.target.value)}
                  placeholder="Enter petitioner name"
                />
              </div>
              <div>
                <Label>Respondent Name</Label>
                <Input
                  value={formData.respondent_name || ''}
                  onChange={e => updateField('respondent_name', e.target.value)}
                  placeholder="Enter respondent name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Other Parent/Party Name (if applicable)</Label>
                <Input
                  value={formData.other_parent_party_name || ''}
                  onChange={e => updateField('other_parent_party_name', e.target.value)}
                  placeholder="Enter other parent/party name"
                />
              </div>
              <div>
                <Label>Case Number</Label>
                <Input
                  value={formData.case_number || ''}
                  onChange={e => updateField('case_number', e.target.value)}
                  placeholder="Enter case number"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">This form is an attachment to:</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.attached_to_fl340 || false}
                    onCheckedChange={checked => updateField('attached_to_fl340', checked)}
                  />
                  <span className="text-sm">FL-340 (Findings and Order After Hearing)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.attached_to_fl180 || false}
                    onCheckedChange={checked => updateField('attached_to_fl180', checked)}
                  />
                  <span className="text-sm">FL-180 (Judgment)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.attached_to_fl250 || false}
                    onCheckedChange={checked => updateField('attached_to_fl250', checked)}
                  />
                  <span className="text-sm">FL-250 (Judgment)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.attached_to_other || false}
                    onCheckedChange={checked => updateField('attached_to_other', checked)}
                  />
                  <span className="text-sm">Other:</span>
                  {formData.attached_to_other && (
                    <Input
                      value={formData.attached_to_other_specify || ''}
                      onChange={e => updateField('attached_to_other_specify', e.target.value)}
                      placeholder="Specify form"
                      className="w-48"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'children':
        return (
          <div className="space-y-6">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h4 className="font-medium text-teal-800 mb-2">1. Children Covered by This Order</h4>
              <p className="text-sm text-teal-700">
                List all children covered by this child support order.
              </p>
            </div>

            <div className="space-y-4">
              {(formData.children || []).map((child, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">Child {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChild(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Child&apos;s Name</Label>
                      <Input
                        value={child.child_name || ''}
                        onChange={e => updateChild(index, 'child_name', e.target.value)}
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        value={child.birth_date || ''}
                        onChange={e => updateChild(index, 'birth_date', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addChild} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Child
              </Button>
            </div>
          </div>
        );

      case 'support':
        return (
          <div className="space-y-6">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h4 className="font-medium text-teal-800 mb-2">2. Child Support Order</h4>
              <p className="text-sm text-teal-700">
                Enter the child support payment terms.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.child_support_ordered || false}
                onCheckedChange={checked => updateField('child_support_ordered', checked)}
              />
              <span className="text-sm font-medium">Child support is ordered</span>
            </div>

            {formData.child_support_ordered && (
              <div className="space-y-4 ml-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Support Payor (who pays)</Label>
                    <select
                      value={formData.support_payor || ''}
                      onChange={e => updateField('support_payor', e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                    >
                      <option value="">Select...</option>
                      <option value="petitioner">Petitioner</option>
                      <option value="respondent">Respondent</option>
                      <option value="other_parent_party">Other Parent/Party</option>
                    </select>
                  </div>
                  <div>
                    <Label>Support Payee (who receives)</Label>
                    <select
                      value={formData.support_payee || ''}
                      onChange={e => updateField('support_payee', e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                    >
                      <option value="">Select...</option>
                      <option value="petitioner">Petitioner</option>
                      <option value="respondent">Respondent</option>
                      <option value="other_parent_party">Other Parent/Party</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Monthly Child Support Amount ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.monthly_child_support_amount || ''}
                      onChange={e => updateField('monthly_child_support_amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Payable on Day of Month</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.support_payable_on_date || ''}
                      onChange={e => updateField('support_payable_on_date', parseInt(e.target.value) || 1)}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Effective Date</Label>
                  <Input
                    type="date"
                    value={formData.support_effective_date || ''}
                    onChange={e => updateField('support_effective_date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-medium">Support Terminates:</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.support_terminates_per_statute || false}
                      onCheckedChange={checked => updateField('support_terminates_per_statute', checked)}
                    />
                    <span className="text-sm">Per Family Code section 3901 (age 18 or 19 if in high school)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">On specific date:</span>
                    <Input
                      type="date"
                      value={formData.support_terminates_on_date || ''}
                      onChange={e => updateField('support_terminates_on_date', e.target.value)}
                      className="w-48"
                    />
                  </div>
                  <div>
                    <Label>Other termination terms:</Label>
                    <Textarea
                      value={formData.support_terminates_other || ''}
                      onChange={e => updateField('support_terminates_other', e.target.value)}
                      rows={2}
                      placeholder="Specify other termination conditions..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'guideline':
        return (
          <div className="space-y-6">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h4 className="font-medium text-teal-800 mb-2">3. Guideline Calculation</h4>
              <p className="text-sm text-teal-700">
                Indicate whether the support amount is at, above, or below the guideline amount.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.guideline_amount_calculated || false}
                  onCheckedChange={checked => updateField('guideline_amount_calculated', checked)}
                />
                <span className="text-sm font-medium">Guideline amount has been calculated</span>
              </div>

              {formData.guideline_amount_calculated && (
                <div className="ml-6 space-y-4">
                  <div>
                    <Label>Guideline Monthly Amount ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.guideline_monthly_amount || ''}
                      onChange={e => updateField('guideline_monthly_amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.order_below_guideline || false}
                        onCheckedChange={checked => {
                          updateField('order_below_guideline', checked);
                          if (checked) updateField('order_above_guideline', false);
                        }}
                      />
                      <span className="text-sm">Order is BELOW guideline</span>
                    </div>
                    {formData.order_below_guideline && (
                      <div className="ml-6">
                        <Label>Reason for below-guideline order:</Label>
                        <Textarea
                          value={formData.below_guideline_reason || ''}
                          onChange={e => updateField('below_guideline_reason', e.target.value)}
                          rows={3}
                          placeholder="State findings justifying the deviation..."
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.order_above_guideline || false}
                        onCheckedChange={checked => {
                          updateField('order_above_guideline', checked);
                          if (checked) updateField('order_below_guideline', false);
                        }}
                      />
                      <span className="text-sm">Order is ABOVE guideline</span>
                    </div>
                    {formData.order_above_guideline && (
                      <div className="ml-6">
                        <Label>Reason for above-guideline order:</Label>
                        <Textarea
                          value={formData.above_guideline_reason || ''}
                          onChange={e => updateField('above_guideline_reason', e.target.value)}
                          rows={3}
                          placeholder="State findings justifying the deviation..."
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.non_guideline_agreed || false}
                        onCheckedChange={checked => updateField('non_guideline_agreed', checked)}
                      />
                      <span className="text-sm">Parties have stipulated to a non-guideline amount</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'income':
        return (
          <div className="space-y-6">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h4 className="font-medium text-teal-800 mb-2">4. Income and Expense Information</h4>
              <p className="text-sm text-teal-700">
                Income information used to calculate child support.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-blue-800">Petitioner&apos;s Income</h5>
                <div>
                  <Label>Gross Monthly Income ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.petitioner_income?.gross_monthly_income || ''}
                    onChange={e => updateNestedField('petitioner_income', 'gross_monthly_income', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Hardship Deduction ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.petitioner_income?.hardship_deduction || ''}
                    onChange={e => updateNestedField('petitioner_income', 'hardship_deduction', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Net Monthly Disposable Income ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.petitioner_income?.net_monthly_disposable_income || ''}
                    onChange={e => updateNestedField('petitioner_income', 'net_monthly_disposable_income', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
                <h5 className="font-medium text-purple-800">Respondent&apos;s Income</h5>
                <div>
                  <Label>Gross Monthly Income ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.respondent_income?.gross_monthly_income || ''}
                    onChange={e => updateNestedField('respondent_income', 'gross_monthly_income', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Hardship Deduction ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.respondent_income?.hardship_deduction || ''}
                    onChange={e => updateNestedField('respondent_income', 'hardship_deduction', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Net Monthly Disposable Income ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.respondent_income?.net_monthly_disposable_income || ''}
                    onChange={e => updateNestedField('respondent_income', 'net_monthly_disposable_income', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Petitioner&apos;s Timeshare (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.timeshare_percentage_petitioner || ''}
                  onChange={e => updateField('timeshare_percentage_petitioner', parseFloat(e.target.value) || 0)}
                  placeholder="50"
                />
              </div>
              <div>
                <Label>Respondent&apos;s Timeshare (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.timeshare_percentage_respondent || ''}
                  onChange={e => updateField('timeshare_percentage_respondent', parseFloat(e.target.value) || 0)}
                  placeholder="50"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.income_expense_declaration_filed || false}
                onCheckedChange={checked => updateField('income_expense_declaration_filed', checked)}
              />
              <span className="text-sm">Income and Expense Declarations (FL-150) have been filed</span>
            </div>
          </div>
        );

      case 'health':
        return (
          <div className="space-y-6">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h4 className="font-medium text-teal-800 mb-2">5. Health Insurance</h4>
              <p className="text-sm text-teal-700">
                Health insurance coverage orders for the children.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.health_insurance_ordered || false}
                onCheckedChange={checked => updateField('health_insurance_ordered', checked)}
              />
              <span className="text-sm font-medium">Health insurance is ordered</span>
            </div>

            {formData.health_insurance_ordered && (
              <div className="space-y-4 ml-6">
                <div>
                  <Label>Health Insurance Provider</Label>
                  <select
                    value={formData.health_insurance_provider || ''}
                    onChange={e => updateField('health_insurance_provider', e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="">Select who provides insurance...</option>
                    <option value="petitioner">Petitioner shall maintain</option>
                    <option value="respondent">Respondent shall maintain</option>
                    <option value="both">Both parties shall maintain</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Monthly Premium Cost ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.health_insurance_cost || ''}
                      onChange={e => updateField('health_insurance_cost', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Petitioner Pays ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.health_insurance_petitioner_pays || ''}
                      onChange={e => updateField('health_insurance_petitioner_pays', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Respondent Pays ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.health_insurance_respondent_pays || ''}
                      onChange={e => updateField('health_insurance_respondent_pays', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-medium mb-3">Uninsured Medical Costs Split</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Petitioner Percentage (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.uninsured_costs_petitioner_percentage || ''}
                        onChange={e => updateField('uninsured_costs_petitioner_percentage', parseFloat(e.target.value) || 0)}
                        placeholder="50"
                      />
                    </div>
                    <div>
                      <Label>Respondent Percentage (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.uninsured_costs_respondent_percentage || ''}
                        onChange={e => updateField('uninsured_costs_respondent_percentage', parseFloat(e.target.value) || 0)}
                        placeholder="50"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cash Medical Support ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cash_medical_support || ''}
                      onChange={e => updateField('cash_medical_support', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Cash Medical Support Payor</Label>
                    <select
                      value={formData.cash_medical_payor || ''}
                      onChange={e => updateField('cash_medical_payor', e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                    >
                      <option value="">Select...</option>
                      <option value="petitioner">Petitioner</option>
                      <option value="respondent">Respondent</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'childcare':
        return (
          <div className="space-y-6">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h4 className="font-medium text-teal-800 mb-2">6. Childcare Costs</h4>
              <p className="text-sm text-teal-700">
                Work-related or education-related childcare costs.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.childcare_costs_ordered || false}
                onCheckedChange={checked => updateField('childcare_costs_ordered', checked)}
              />
              <span className="text-sm font-medium">Childcare costs are ordered</span>
            </div>

            {formData.childcare_costs_ordered && (
              <div className="space-y-4 ml-6">
                <div>
                  <Label>Monthly Childcare Cost ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.childcare_monthly_cost || ''}
                    onChange={e => updateField('childcare_monthly_cost', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Petitioner Pays (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.childcare_petitioner_percentage || ''}
                      onChange={e => updateField('childcare_petitioner_percentage', parseFloat(e.target.value) || 0)}
                      placeholder="50"
                    />
                  </div>
                  <div>
                    <Label>Respondent Pays (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.childcare_respondent_percentage || ''}
                      onChange={e => updateField('childcare_respondent_percentage', parseFloat(e.target.value) || 0)}
                      placeholder="50"
                    />
                  </div>
                </div>

                <div>
                  <Label>Reason for Childcare</Label>
                  <select
                    value={formData.childcare_reason || ''}
                    onChange={e => updateField('childcare_reason', e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="">Select reason...</option>
                    <option value="employment">Employment</option>
                    <option value="job_search">Reasonably necessary job search</option>
                    <option value="education">Education or training for employment</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        );

      case 'education':
        return (
          <div className="space-y-6">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h4 className="font-medium text-teal-800 mb-2">7. Educational and Special Needs Costs</h4>
              <p className="text-sm text-teal-700">
                Costs for educational or special needs of the children.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.education_costs_ordered || false}
                onCheckedChange={checked => updateField('education_costs_ordered', checked)}
              />
              <span className="text-sm font-medium">Educational/special needs costs are ordered</span>
            </div>

            {formData.education_costs_ordered && (
              <div className="space-y-4 ml-6">
                <div>
                  <Label>Description of Costs</Label>
                  <Textarea
                    value={formData.education_description || ''}
                    onChange={e => updateField('education_description', e.target.value)}
                    rows={2}
                    placeholder="e.g., Private school tuition, tutoring, special education services..."
                  />
                </div>

                <div>
                  <Label>Monthly Cost ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.education_monthly_cost || ''}
                    onChange={e => updateField('education_monthly_cost', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Petitioner Pays (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.education_petitioner_percentage || ''}
                      onChange={e => updateField('education_petitioner_percentage', parseFloat(e.target.value) || 0)}
                      placeholder="50"
                    />
                  </div>
                  <div>
                    <Label>Respondent Pays (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.education_respondent_percentage || ''}
                      onChange={e => updateField('education_respondent_percentage', parseFloat(e.target.value) || 0)}
                      placeholder="50"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'travel':
        return (
          <div className="space-y-6">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h4 className="font-medium text-teal-800 mb-2">8. Travel Expenses for Visitation</h4>
              <p className="text-sm text-teal-700">
                Transportation costs for child custody exchanges.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.travel_costs_ordered || false}
                onCheckedChange={checked => updateField('travel_costs_ordered', checked)}
              />
              <span className="text-sm font-medium">Travel/transportation costs are ordered</span>
            </div>

            {formData.travel_costs_ordered && (
              <div className="space-y-4 ml-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Petitioner Pays (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.travel_petitioner_percentage || ''}
                      onChange={e => updateField('travel_petitioner_percentage', parseFloat(e.target.value) || 0)}
                      placeholder="50"
                    />
                  </div>
                  <div>
                    <Label>Respondent Pays (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.travel_respondent_percentage || ''}
                      onChange={e => updateField('travel_respondent_percentage', parseFloat(e.target.value) || 0)}
                      placeholder="50"
                    />
                  </div>
                </div>

                <div>
                  <Label>Travel Arrangement Notes</Label>
                  <Textarea
                    value={formData.travel_notes || ''}
                    onChange={e => updateField('travel_notes', e.target.value)}
                    rows={3}
                    placeholder="Describe travel cost arrangements..."
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'earnings':
        return (
          <div className="space-y-6">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h4 className="font-medium text-teal-800 mb-2">10. Earnings Assignment</h4>
              <p className="text-sm text-teal-700">
                Mandatory wage assignment for child support payments.
              </p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Earnings assignment (wage garnishment) is mandatory under California law
                unless the court finds good cause to stay the assignment, or the parties agree to an alternative
                arrangement with court approval.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.earnings_assignment_ordered || false}
                  onCheckedChange={checked => updateField('earnings_assignment_ordered', checked)}
                />
                <span className="text-sm font-medium">Earnings assignment is ordered</span>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.earnings_assignment_stayed || false}
                  onCheckedChange={checked => updateField('earnings_assignment_stayed', checked)}
                />
                <span className="text-sm font-medium">Earnings assignment is STAYED (not immediately effective)</span>
              </div>

              {formData.earnings_assignment_stayed && (
                <div className="ml-6">
                  <Label>Reason for Stay</Label>
                  <Textarea
                    value={formData.earnings_assignment_stayed_reason || ''}
                    onChange={e => updateField('earnings_assignment_stayed_reason', e.target.value)}
                    rows={3}
                    placeholder="State the good cause reason for staying the earnings assignment..."
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.wage_assignment_service_required || false}
                  onCheckedChange={checked => updateField('wage_assignment_service_required', checked)}
                />
                <span className="text-sm">The local child support agency shall serve the earnings assignment</span>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h5 className="font-medium">9. Other Children from Other Relationships</h5>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.payor_has_other_children || false}
                  onCheckedChange={checked => updateField('payor_has_other_children', checked)}
                />
                <span className="text-sm font-medium">Support payor has other children from other relationships</span>
              </div>

              {formData.payor_has_other_children && (
                <div className="ml-6 grid grid-cols-2 gap-4">
                  <div>
                    <Label>Number of Other Children</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.payor_other_children_count || ''}
                      onChange={e => updateField('payor_other_children_count', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Support Paid for Other Children ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.payor_other_support_amount || ''}
                      onChange={e => updateField('payor_other_support_amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'arrears':
        return (
          <div className="space-y-6">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h4 className="font-medium text-teal-800 mb-2">11. Arrears (Past-Due Support)</h4>
              <p className="text-sm text-teal-700">
                Orders regarding past-due child support.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.arrears_exist || false}
                onCheckedChange={checked => updateField('arrears_exist', checked)}
              />
              <span className="text-sm font-medium">Arrears (past-due support) exist</span>
            </div>

            {formData.arrears_exist && (
              <div className="space-y-4 ml-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Total Arrears Amount ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.arrears_amount || ''}
                      onChange={e => updateField('arrears_amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>As of Date</Label>
                    <Input
                      type="date"
                      value={formData.arrears_as_of_date || ''}
                      onChange={e => updateField('arrears_as_of_date', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Monthly Payment on Arrears ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.arrears_monthly_payment || ''}
                      onChange={e => updateField('arrears_monthly_payment', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Interest Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.arrears_interest_rate || ''}
                      onChange={e => updateField('arrears_interest_rate', parseFloat(e.target.value) || 0)}
                      placeholder="10"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'other':
        return (
          <div className="space-y-6">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h4 className="font-medium text-teal-800 mb-2">12. Other Orders</h4>
              <p className="text-sm text-teal-700">
                Any additional orders regarding child support.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.other_orders_enabled || false}
                onCheckedChange={checked => updateField('other_orders_enabled', checked)}
              />
              <span className="text-sm font-medium">Additional orders are specified</span>
            </div>

            {formData.other_orders_enabled && (
              <div className="ml-6">
                <Label>Other Orders</Label>
                <Textarea
                  value={formData.other_orders_details || ''}
                  onChange={e => updateField('other_orders_details', e.target.value)}
                  rows={6}
                  placeholder="Enter any additional orders..."
                />
              </div>
            )}

            <div className="pt-4 border-t space-y-4">
              <h5 className="font-medium">Judicial Officer Signature</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.judicial_officer_signature_date || ''}
                    onChange={e => updateField('judicial_officer_signature_date', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Judicial Officer Name</Label>
                  <Input
                    value={formData.judicial_officer_name || ''}
                    onChange={e => updateField('judicial_officer_name', e.target.value)}
                    placeholder="Judge/Commissioner name"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Section not found</div>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Section {currentSection + 1} of {WIZARD_SECTIONS.length}
          </span>
          <span className="font-medium text-teal-600">{Math.round(progress)}% Complete</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex flex-wrap gap-2">
        {WIZARD_SECTIONS.map((s, idx) => {
          const Icon = s.icon;
          const isActive = idx === currentSection;
          const isComplete = idx < currentSection;
          return (
            <Button
              key={s.id}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentSection(idx)}
              className={`gap-1 ${isActive ? 'bg-teal-600 hover:bg-teal-700' : ''} ${isComplete ? 'border-teal-300 text-teal-700' : ''}`}
            >
              {isComplete ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              <span className="hidden md:inline">{s.title}</span>
            </Button>
          );
        })}
      </div>

      {/* Current Section */}
      <Card className="border-teal-200">
        <CardHeader className="bg-gradient-to-r from-teal-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-100">
              <SectionIcon className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-teal-800">{section.title}</CardTitle>
              <CardDescription>FL-342: Child Support Information and Order Attachment</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">{renderSection()}</CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handlePrevious} disabled={isLoading}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentSection === 0 ? 'Back to Summary' : 'Previous'}
        </Button>

        <div className="flex items-center gap-2">
          {onSave && (
            <Button variant="outline" onClick={() => onSave(formData)} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          )}

          {currentSection < WIZARD_SECTIONS.length - 1 ? (
            <Button onClick={handleNext} disabled={isLoading} className="bg-teal-600 hover:bg-teal-700">
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Entering...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enter Support Order
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
