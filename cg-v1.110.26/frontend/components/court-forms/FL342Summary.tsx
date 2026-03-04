'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Users,
  Heart,
  Briefcase,
  GraduationCap,
  Plane,
  FileText,
  CheckCircle,
  XCircle,
  CreditCard,
  Edit2,
  Calendar,
  Calculator,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface FL342SummaryProps {
  formData: FL342FormData;
  canEdit?: boolean;
  onEditSection?: (sectionIndex: number) => void;
}

export default function FL342Summary({ formData, canEdit = false, onEditSection }: FL342SummaryProps) {
  const formatCurrency = (amount?: number): string => {
    if (amount === undefined || amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatParty = (party?: string): string => {
    if (!party) return 'Not specified';
    if (party === 'petitioner') return formData.petitioner_name || 'Petitioner';
    if (party === 'respondent') return formData.respondent_name || 'Respondent';
    if (party === 'other_parent_party') return formData.other_parent_party_name || 'Other Parent/Party';
    if (party === 'both') return 'Both parties';
    return party;
  };

  const getAttachmentInfo = (): string[] => {
    const attachments: string[] = [];
    if (formData.attached_to_fl340) attachments.push('FL-340 (Findings and Order After Hearing)');
    if (formData.attached_to_fl180) attachments.push('FL-180 (Judgment)');
    if (formData.attached_to_fl250) attachments.push('FL-250 (Judgment)');
    if (formData.attached_to_other && formData.attached_to_other_specify) {
      attachments.push(formData.attached_to_other_specify);
    }
    return attachments;
  };

  // Section ID to index mapping (matches FL342Wizard WIZARD_SECTIONS)
  const SECTION_INDEX: Record<string, number> = {
    header: 0,
    children: 1,
    support: 2,
    guideline: 3,
    income: 4,
    health: 5,
    childcare: 6,
    education: 7,
    travel: 8,
    earnings: 9,
    arrears: 10,
    other: 11,
  };

  const renderEditButton = (sectionId: string) => {
    if (!canEdit || !onEditSection) return null;
    const sectionIndex = SECTION_INDEX[sectionId] ?? 0;
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEditSection(sectionIndex)}
        className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
      >
        <Edit2 className="h-4 w-4 mr-1" />
        Edit
      </Button>
    );
  };

  const attachments = getAttachmentInfo();

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-teal-600" />
              <CardTitle className="text-lg">FL-342: Child Support Information and Order Attachment</CardTitle>
            </div>
            <Badge variant="outline" className="text-teal-600 border-teal-300">
              Support Order
            </Badge>
          </div>
          <CardDescription>California Judicial Council Form [Rev. January 1, 2026]</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Petitioner:</span>
              <p className="font-medium">{formData.petitioner_name || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Respondent:</span>
              <p className="font-medium">{formData.respondent_name || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Case Number:</span>
              <p className="font-medium">{formData.case_number || 'Not assigned'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Children:</span>
              <p className="font-medium">{formData.children?.length || 0}</p>
            </div>
          </div>
          {attachments.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Attachment to:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {attachments.map((att, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-teal-100 text-teal-700">
                    {att}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Child Support Order Section */}
      {formData.child_support_ordered && (
        <Card className="border-green-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <CardTitle className="text-base">Child Support Order (Item 2)</CardTitle>
              </div>
              {renderEditButton('support')}
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-green-50 rounded-lg mb-4">
              <div className="text-center">
                <p className="text-sm text-green-700 mb-1">Monthly Child Support Amount</p>
                <p className="text-3xl font-bold text-green-800">
                  {formatCurrency(formData.monthly_child_support_amount)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Payor:</span>
                <p className="font-medium">{formatParty(formData.support_payor)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Payee:</span>
                <p className="font-medium">{formatParty(formData.support_payee)}</p>
              </div>
              {formData.support_payable_on_date && (
                <div>
                  <span className="text-muted-foreground">Due on Day:</span>
                  <p className="font-medium">{formData.support_payable_on_date} of each month</p>
                </div>
              )}
              {formData.support_effective_date && (
                <div>
                  <span className="text-muted-foreground">Effective Date:</span>
                  <p className="font-medium">{formData.support_effective_date}</p>
                </div>
              )}
            </div>
            {formData.support_terminates_per_statute && (
              <div className="mt-3 pt-3 border-t">
                <Badge variant="outline" className="border-green-300 text-green-700">
                  Terminates per Family Code Section 3901
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Guideline Calculation Section */}
      {formData.guideline_amount_calculated && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base">Guideline Calculation (Item 3)</CardTitle>
              </div>
              {renderEditButton('guideline')}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-700">Guideline Amount:</span>
                <span className="font-bold text-blue-800">{formatCurrency(formData.guideline_monthly_amount)}</span>
              </div>
              {formData.order_below_guideline && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-amber-800">Order Below Guideline</span>
                  </div>
                  {formData.below_guideline_reason && (
                    <p className="text-sm text-amber-700">{formData.below_guideline_reason}</p>
                  )}
                </div>
              )}
              {formData.order_above_guideline && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="font-medium text-blue-800">Order Above Guideline</span>
                  {formData.above_guideline_reason && (
                    <p className="text-sm text-blue-700 mt-1">{formData.above_guideline_reason}</p>
                  )}
                </div>
              )}
              {formData.non_guideline_agreed && (
                <Badge variant="secondary">Parties Stipulated to Non-Guideline Amount</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Income Information Section */}
      {(formData.petitioner_income || formData.respondent_income) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-base">Income Information (Item 4)</CardTitle>
              </div>
              {renderEditButton('income')}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {formData.petitioner_income && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h5 className="font-medium text-blue-800 mb-2">Petitioner</h5>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-600">Gross Monthly:</span>
                      <span className="font-medium">{formatCurrency(formData.petitioner_income.gross_monthly_income)}</span>
                    </div>
                    {formData.petitioner_income.net_monthly_disposable_income && (
                      <div className="flex justify-between">
                        <span className="text-blue-600">Net Disposable:</span>
                        <span className="font-medium">{formatCurrency(formData.petitioner_income.net_monthly_disposable_income)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {formData.respondent_income && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <h5 className="font-medium text-purple-800 mb-2">Respondent</h5>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-purple-600">Gross Monthly:</span>
                      <span className="font-medium">{formatCurrency(formData.respondent_income.gross_monthly_income)}</span>
                    </div>
                    {formData.respondent_income.net_monthly_disposable_income && (
                      <div className="flex justify-between">
                        <span className="text-purple-600">Net Disposable:</span>
                        <span className="font-medium">{formatCurrency(formData.respondent_income.net_monthly_disposable_income)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {(formData.timeshare_percentage_petitioner || formData.timeshare_percentage_respondent) && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Timeshare Percentages:</p>
                <div className="flex gap-4">
                  <Badge variant="outline" className="border-blue-300 text-blue-700">
                    Petitioner: {formData.timeshare_percentage_petitioner || 0}%
                  </Badge>
                  <Badge variant="outline" className="border-purple-300 text-purple-700">
                    Respondent: {formData.timeshare_percentage_respondent || 0}%
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Health Insurance Section */}
      {formData.health_insurance_ordered && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-600" />
                <CardTitle className="text-base">Health Insurance (Item 5)</CardTitle>
              </div>
              {renderEditButton('health')}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  Health insurance to be maintained by: <strong>{formatParty(formData.health_insurance_provider)}</strong>
                </span>
              </div>
              {formData.health_insurance_cost && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Monthly Premium:</span>
                      <p className="font-medium">{formatCurrency(formData.health_insurance_cost)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Petitioner Pays:</span>
                      <p className="font-medium">{formatCurrency(formData.health_insurance_petitioner_pays)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Respondent Pays:</span>
                      <p className="font-medium">{formatCurrency(formData.health_insurance_respondent_pays)}</p>
                    </div>
                  </div>
                </div>
              )}
              {(formData.uninsured_costs_petitioner_percentage || formData.uninsured_costs_respondent_percentage) && (
                <div className="pt-3 border-t">
                  <p className="text-sm font-medium mb-2">Uninsured Medical Costs:</p>
                  <div className="flex gap-4">
                    <Badge variant="outline">
                      Petitioner: {formData.uninsured_costs_petitioner_percentage || 0}%
                    </Badge>
                    <Badge variant="outline">
                      Respondent: {formData.uninsured_costs_respondent_percentage || 0}%
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Childcare Costs Section */}
      {formData.childcare_costs_ordered && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-base">Childcare Costs (Item 6)</CardTitle>
              </div>
              {renderEditButton('childcare')}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-orange-700">Monthly Childcare Cost:</span>
                  <span className="font-bold text-orange-800">{formatCurrency(formData.childcare_monthly_cost)}</span>
                </div>
              </div>
              <div className="flex gap-4">
                <Badge variant="outline" className="border-orange-300 text-orange-700">
                  Petitioner: {formData.childcare_petitioner_percentage || 0}%
                </Badge>
                <Badge variant="outline" className="border-orange-300 text-orange-700">
                  Respondent: {formData.childcare_respondent_percentage || 0}%
                </Badge>
              </div>
              {formData.childcare_reason && (
                <p className="text-sm text-muted-foreground">
                  Reason: {formData.childcare_reason.replace(/_/g, ' ')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Educational Costs Section */}
      {formData.education_costs_ordered && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-base">Educational/Special Needs Costs (Item 7)</CardTitle>
              </div>
              {renderEditButton('education')}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {formData.education_description && (
                <p className="text-sm p-3 bg-gray-50 rounded-lg">{formData.education_description}</p>
              )}
              <div className="p-3 bg-indigo-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-indigo-700">Monthly Cost:</span>
                  <span className="font-bold text-indigo-800">{formatCurrency(formData.education_monthly_cost)}</span>
                </div>
              </div>
              <div className="flex gap-4">
                <Badge variant="outline" className="border-indigo-300 text-indigo-700">
                  Petitioner: {formData.education_petitioner_percentage || 0}%
                </Badge>
                <Badge variant="outline" className="border-indigo-300 text-indigo-700">
                  Respondent: {formData.education_respondent_percentage || 0}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Travel Expenses Section */}
      {formData.travel_costs_ordered && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-sky-600" />
                <CardTitle className="text-base">Travel Expenses (Item 8)</CardTitle>
              </div>
              {renderEditButton('travel')}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-4">
                <Badge variant="outline" className="border-sky-300 text-sky-700">
                  Petitioner: {formData.travel_petitioner_percentage || 0}%
                </Badge>
                <Badge variant="outline" className="border-sky-300 text-sky-700">
                  Respondent: {formData.travel_respondent_percentage || 0}%
                </Badge>
              </div>
              {formData.travel_notes && (
                <p className="text-sm p-3 bg-gray-50 rounded-lg">{formData.travel_notes}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings Assignment Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Earnings Assignment (Item 10)</CardTitle>
            </div>
            {renderEditButton('earnings')}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {formData.earnings_assignment_ordered ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm">Earnings assignment ordered</span>
            </div>
            {formData.earnings_assignment_stayed && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-sm text-amber-800">
                  <strong>STAYED:</strong> {formData.earnings_assignment_stayed_reason || 'Reason not specified'}
                </span>
              </div>
            )}
            {formData.wage_assignment_service_required && (
              <Badge variant="secondary">Local child support agency shall serve assignment</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Arrears Section */}
      {formData.arrears_exist && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <CardTitle className="text-base text-red-700">Arrears (Item 11)</CardTitle>
              </div>
              {renderEditButton('arrears')}
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-red-50 rounded-lg mb-4">
              <div className="text-center">
                <p className="text-sm text-red-700 mb-1">Total Arrears Amount</p>
                <p className="text-2xl font-bold text-red-800">
                  {formatCurrency(formData.arrears_amount)}
                </p>
                {formData.arrears_as_of_date && (
                  <p className="text-sm text-red-600">As of {formData.arrears_as_of_date}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {formData.arrears_monthly_payment && (
                <div>
                  <span className="text-muted-foreground">Monthly Payment on Arrears:</span>
                  <p className="font-medium">{formatCurrency(formData.arrears_monthly_payment)}</p>
                </div>
              )}
              {formData.arrears_interest_rate && (
                <div>
                  <span className="text-muted-foreground">Interest Rate:</span>
                  <p className="font-medium">{formData.arrears_interest_rate}%</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Orders Section */}
      {formData.other_orders_enabled && formData.other_orders_details && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-base">Other Orders (Item 12)</CardTitle>
              </div>
              {renderEditButton('other')}
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{formData.other_orders_details}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Judicial Officer Signature */}
      {(formData.judicial_officer_name || formData.judicial_officer_signature_date) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-muted-foreground">Judicial Officer:</span>
                <p className="font-medium">{formData.judicial_officer_name || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Date Signed:</span>
                <p className="font-medium">{formData.judicial_officer_signature_date || 'Not specified'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
