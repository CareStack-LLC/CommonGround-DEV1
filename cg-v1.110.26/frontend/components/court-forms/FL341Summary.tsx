'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Scale,
  Shield,
  Calendar,
  Car,
  Plane,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit2,
  Clock,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface FL341SummaryProps {
  formData: FL341FormData;
  canEdit?: boolean;
  onEditSection?: (sectionIndex: number) => void;
}

export default function FL341Summary({ formData, canEdit = false, onEditSection }: FL341SummaryProps) {
  const formatParty = (party?: string): string => {
    if (!party) return 'Not specified';
    if (party === 'petitioner') return formData.petitioner_name || 'Petitioner';
    if (party === 'respondent') return formData.respondent_name || 'Respondent';
    if (party === 'joint') return 'Joint';
    if (party === 'other' || party === 'other_parent_party') return formData.other_parent_party_name || 'Other Parent/Party';
    return party;
  };

  const getAttachmentInfo = (): string[] => {
    const attachments: string[] = [];
    if (formData.attached_to_fl340) attachments.push('FL-340 (Findings and Order After Hearing)');
    if (formData.attached_to_fl180) attachments.push('FL-180 (Judgment)');
    if (formData.attached_to_fl250) attachments.push('FL-250 (Judgment)');
    if (formData.attached_to_fl355) attachments.push('FL-355 (Stipulation and Order)');
    if (formData.attached_to_other && formData.attached_to_other_specify) {
      attachments.push(formData.attached_to_other_specify);
    }
    return attachments;
  };

  const getVisitationType = (): string => {
    if (formData.visitation_reasonable) return 'Reasonable right of visitation';
    if (formData.visitation_see_attached) return `See attached (${formData.visitation_attached_pages || 0} pages)`;
    if (formData.visitation_none) return 'No visitation';
    if (formData.visitation_supervised) return 'Supervised visitation (FL-341(A))';
    return 'Not specified';
  };

  // Section ID to index mapping (matches FL341Wizard WIZARD_SECTIONS)
  const SECTION_INDEX: Record<string, number> = {
    header: 0,
    jurisdiction: 1,
    abduction: 2,
    custody: 3,
    abuse: 4,
    visitation: 5,
    supervised: 6,
    transportation: 7,
    travel: 8,
    holiday: 9,
    other: 10,
  };

  const renderEditButton = (sectionId: string) => {
    if (!canEdit || !onEditSection) return null;
    const sectionIndex = SECTION_INDEX[sectionId] ?? 0;
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEditSection(sectionIndex)}
        className="text-green-600 hover:text-green-700 hover:bg-green-50"
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
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">FL-341: Child Custody and Visitation Order Attachment</CardTitle>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-300">
              Custody Order
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
                  <Badge key={idx} variant="secondary" className="bg-green-100 text-green-700">
                    {att}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jurisdiction Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">Jurisdiction (Items 1-4)</CardTitle>
            </div>
            {renderEditButton('jurisdiction')}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {formData.jurisdiction_confirmed ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm">1. Jurisdiction confirmed under UCCJEA</span>
            </div>
            <div className="flex items-center gap-2">
              {formData.notice_opportunity_confirmed ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm">2. Notice and opportunity to be heard confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">
                3. Habitual residence: {formData.habitual_residence_us ? 'United States' : formData.habitual_residence_other || 'Other'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {formData.penalties_acknowledged ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm">4. Penalties for violation acknowledged</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Child Abduction Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Child Abduction Prevention (Items 5-6)</CardTitle>
            </div>
            {renderEditButton('abduction')}
          </div>
        </CardHeader>
        <CardContent>
          {formData.child_abduction_risk ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">5. Child abduction risk identified</span>
              </div>
              {formData.fl341b_attached && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                  FL-341(B) Attached
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No child abduction risk identified</p>
          )}
          {formData.mediation_referral_enabled && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm font-medium">6. Mediation/Counseling Referral</p>
              {formData.mediation_referral_details && (
                <p className="text-sm text-muted-foreground mt-1">{formData.mediation_referral_details}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Child Custody Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Child Custody Awards (Item 7)</CardTitle>
            </div>
            {renderEditButton('custody')}
          </div>
        </CardHeader>
        <CardContent>
          {formData.children && formData.children.length > 0 ? (
            <div className="space-y-4">
              {formData.children.map((child, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{child.child_name}</span>
                    {child.birth_date && (
                      <span className="text-sm text-muted-foreground">DOB: {child.birth_date}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Legal Custody:</span>
                      <p className="font-medium">{formatParty(child.legal_custody_to)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Physical Custody:</span>
                      <p className="font-medium">{formatParty(child.physical_custody_to)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {formData.joint_legal_custody_enabled && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="outline" className="border-green-300 text-green-700">
                    Joint Legal Custody Specified
                  </Badge>
                  {formData.joint_legal_custody_fl341e_attached && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      FL-341(E) Attached
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No children specified</p>
          )}
        </CardContent>
      </Card>

      {/* Abuse Allegations Section */}
      {formData.abuse_allegations_enabled && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <CardTitle className="text-base text-red-700">Abuse Allegations (Item 8)</CardTitle>
              </div>
              {renderEditButton('abuse')}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">8a(1). History of abuse alleged against:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.abuse_alleged_against_petitioner && (
                    <Badge variant="error">Petitioner</Badge>
                  )}
                  {formData.abuse_alleged_against_respondent && (
                    <Badge variant="error">Respondent</Badge>
                  )}
                  {formData.abuse_alleged_against_other && (
                    <Badge variant="error">Other Parent/Party</Badge>
                  )}
                </div>
              </div>
              {(formData.substance_abuse_alleged_against_petitioner ||
                formData.substance_abuse_alleged_against_respondent ||
                formData.substance_abuse_alleged_against_other) && (
                <div>
                  <p className="text-sm font-medium mb-2">8a(2). Substance abuse alleged against:</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.substance_abuse_alleged_against_petitioner && (
                      <Badge variant="outline" className="border-red-300 text-red-700">Petitioner</Badge>
                    )}
                    {formData.substance_abuse_alleged_against_respondent && (
                      <Badge variant="outline" className="border-red-300 text-red-700">Respondent</Badge>
                    )}
                    {formData.substance_abuse_alleged_against_other && (
                      <Badge variant="outline" className="border-red-300 text-red-700">Other Parent/Party</Badge>
                    )}
                  </div>
                </div>
              )}
              {(formData.custody_denied_to_petitioner ||
                formData.custody_denied_to_respondent ||
                formData.custody_denied_to_other) && (
                <div>
                  <p className="text-sm font-medium mb-2">8b. Custody NOT granted to:</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.custody_denied_to_petitioner && (
                      <Badge variant="secondary">Petitioner</Badge>
                    )}
                    {formData.custody_denied_to_respondent && (
                      <Badge variant="secondary">Respondent</Badge>
                    )}
                    {formData.custody_denied_to_other && (
                      <Badge variant="secondary">Other Parent/Party</Badge>
                    )}
                  </div>
                </div>
              )}
              {formData.custody_granted_despite_allegations && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>8c.</strong> Despite allegations, custody granted as in Item 7 (best interests finding)
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visitation Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">Visitation Schedule (Item 9)</CardTitle>
            </div>
            {renderEditButton('visitation')}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-blue-300 text-blue-700">
                {getVisitationType()}
              </Badge>
              {formData.visitation_for_party && (
                <span className="text-sm text-muted-foreground">
                  for {formatParty(formData.visitation_for_party)}
                </span>
              )}
            </div>

            {formData.alternate_weekends_enabled && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-sm">Alternate Weekends</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">From:</span>
                    <p>{formData.alternate_weekends_from_day} at {formData.alternate_weekends_from_time}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">To:</span>
                    <p>{formData.alternate_weekends_to_day} at {formData.alternate_weekends_to_time}</p>
                  </div>
                </div>
                {formData.alternate_weekends_starting && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Starting: {formData.alternate_weekends_starting}
                  </p>
                )}
              </div>
            )}

            {formData.weekdays_enabled && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-sm">Weekday Visitation</span>
                </div>
                <p className="text-sm">
                  {formData.weekdays_from_day}
                  {formData.weekdays_starting && ` (starting ${formData.weekdays_starting})`}
                </p>
              </div>
            )}

            {formData.virtual_visitation_enabled && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-medium text-sm text-blue-700 mb-1">Virtual Visitation</p>
                <p className="text-sm text-blue-600">{formData.virtual_visitation_details || 'Enabled'}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Supervised Visitation Section */}
      {formData.supervised_visitation_enabled && (
        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-base">Supervised Visitation (Item 10)</CardTitle>
              </div>
              {renderEditButton('supervised')}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Supervised party:</strong> {formatParty(formData.supervised_party)}
              </p>
              <p className="text-sm">
                <strong>Duration:</strong>{' '}
                {formData.supervised_until_further_order
                  ? 'Until further order of the court'
                  : formData.supervised_until_other || 'Not specified'}
              </p>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                FL-341(A) Attached
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transportation Section */}
      {formData.transportation_enabled && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base">Transportation & Exchange (Item 11)</CardTitle>
              </div>
              {renderEditButton('transportation')}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {formData.transportation_licensed_insured && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Licensed and insured driver required</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Transportation TO visits:</span>
                  <p className="font-medium">{formatParty(formData.transportation_to_by)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Transportation FROM visits:</span>
                  <p className="font-medium">{formatParty(formData.transportation_from_by)}</p>
                </div>
              </div>
              {(formData.exchange_start_address || formData.exchange_end_address) && (
                <div className="pt-3 border-t space-y-2">
                  {formData.exchange_start_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <span className="text-sm text-muted-foreground">Start of visit:</span>
                        <p className="text-sm">{formData.exchange_start_address}</p>
                      </div>
                    </div>
                  )}
                  {formData.exchange_end_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <span className="text-sm text-muted-foreground">End of visit:</span>
                        <p className="text-sm">{formData.exchange_end_address}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {formData.curbside_exchange && (
                <Badge variant="outline" className="border-blue-300 text-blue-700">
                  Curbside Exchange Required
                </Badge>
              )}
              {formData.transportation_other && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground">Other arrangements:</p>
                  <p className="text-sm">{formData.transportation_other}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Travel Restrictions Section */}
      {formData.travel_restrictions_enabled && (
        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-base">Travel Restrictions (Item 12)</CardTitle>
              </div>
              {renderEditButton('travel')}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm">
                <strong>Restricted party:</strong> {formatParty(formData.travel_restricted_party)}
              </p>
              <p className="text-sm text-muted-foreground">Must have written permission to take children out of:</p>
              <div className="flex flex-wrap gap-2">
                {formData.travel_restrict_california && (
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    State of California
                  </Badge>
                )}
                {formData.travel_restrict_counties && formData.travel_allowed_counties && (
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    Counties: {formData.travel_allowed_counties}
                  </Badge>
                )}
                {formData.travel_restrict_other_places && formData.travel_other_places && (
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    {formData.travel_other_places}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Holiday Schedule Section */}
      {formData.holiday_schedule_enabled && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-base">Holiday Schedule (Item 13)</CardTitle>
              </div>
              {renderEditButton('holiday')}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {formData.holiday_schedule_below && (
                <Badge variant="outline" className="border-purple-300 text-purple-700">
                  Specified Below
                </Badge>
              )}
              {formData.holiday_schedule_attached && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  FL-341(C) Attached
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Provisions Section */}
      {formData.additional_provisions_enabled && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-base">Additional Provisions (Item 14)</CardTitle>
              </div>
              {renderEditButton('holiday')}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {formData.additional_provisions_attached && (
                <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                  FL-341(D) Attached
                </Badge>
              )}
              {formData.additional_provisions_below && formData.additional_provisions_details && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm">{formData.additional_provisions_details}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Orders Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-base">Access to Records & Other Orders (Items 15-16)</CardTitle>
            </div>
            {renderEditButton('other')}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {formData.access_to_records_confirmed ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm">15. Both parents have access to children&apos;s records</span>
            </div>
            {formData.other_orders_enabled && formData.other_orders_details && (
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">16. Other Orders:</p>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm">{formData.other_orders_details}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
