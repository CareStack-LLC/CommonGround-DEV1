'use client';

/**
 * FL-311 PDF Generator
 * Generates a PDF that matches the official California Judicial Council Form FL-311
 * Child Custody and Visitation (Parenting Time) Application Attachment
 * Rev. January 1, 2026
 */

// Time reference with school options
interface ScheduleTime {
  time_value?: string;
  is_am?: boolean;
  reference?: 'specific_time' | 'start_of_school' | 'after_school';
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
  alternating_initial_party?: string;
  alternating_start_date?: string;
  specific_party?: string;
  in_odd_months?: boolean;
  in_even_months?: boolean;
}

interface FL311FormData {
  petitioner_name?: string;
  respondent_name?: string;
  other_parent_party_name?: string;
  case_number?: string;
  attachment_type?: string;
  attachment_type_other?: string;
  children?: Array<{ name: string; birthdate: string; age?: number }>;
  physical_custody_to?: string;
  legal_custody_to?: string;
  has_abuse_allegations?: boolean;
  other_custody_details?: string;
  visitation_type?: string;
  visitation_attached_pages?: number;
  visitation_attached_date?: string;
  schedule_for_party?: string;

  // Item 4a(1): Specific weekends (1st-5th)
  specific_weekends_enabled?: boolean;
  specific_weekends_start_date?: string;
  weekend_schedules?: WeekendScheduleEntry[];
  fifth_weekend_handling?: FifthWeekendHandling;

  // Item 4a(2): Alternate weekends
  alternate_weekends_enabled?: boolean;
  alternate_weekends_start_date?: string;
  alternate_weekends_from_day?: string;
  alternate_weekends_from_time?: ScheduleTime;
  alternate_weekends_to_day?: string;
  alternate_weekends_to_time?: ScheduleTime;

  // Item 4a(3): Weekdays
  weekdays_enabled?: boolean;
  weekdays_start_date?: string;
  weekday_days?: string[];
  weekdays_from_time?: ScheduleTime;
  weekdays_to_time?: ScheduleTime;

  // Item 4a(4): Other in-person
  other_inperson_in_attachment?: boolean;
  other_inperson_description?: string;

  // Item 4b: Virtual visitation
  virtual_visitation_enabled?: boolean;
  virtual_visitation_in_attachment?: boolean;
  virtual_visitation_description?: string;

  // Item 4c: Other ways
  other_ways_description?: string;

  // Legacy fields
  weekends_enabled?: boolean;
  weekend_schedule?: string;
  alternate_weekends?: boolean;
  alternate_weekends_start?: string;
  weekday_times?: string;
  other_schedule_details?: string;

  abuse_alleged_against?: string[];
  substance_abuse_alleged_against?: string[];
  request_no_custody_due_to_allegations?: boolean;
  custody_despite_allegations?: boolean;
  custody_despite_allegations_reasons?: string;
  request_supervised_visitation?: boolean;
  request_unsupervised_despite_allegations?: boolean;
  unsupervised_reasons?: string;
  supervised_party?: string;
  supervised_reasons?: string;
  supervised_reasons_in_attachment?: boolean;
  supervisor_name?: string;
  supervisor_phone?: string;
  supervisor_type?: string;
  professional_fee_petitioner_percent?: number;
  professional_fee_respondent_percent?: number;
  professional_fee_other_percent?: number;
  supervised_location?: string;
  supervised_location_other?: string;
  supervised_frequency?: string;
  supervised_hours_per_visit?: number;
  transport_to_visits_by?: string;
  transport_from_visits_by?: string;
  exchange_point_start?: string;
  exchange_point_end?: string;
  curbside_exchange?: boolean;
  other_transport_details?: string;
  travel_restrictions_enabled?: boolean;
  restrict_out_of_state?: boolean;
  restrict_counties?: boolean;
  allowed_counties?: string;
  other_travel_restrictions?: string;
  abduction_prevention_enabled?: boolean;
  mediation_requested?: boolean;
  mediation_date?: string;
  mediation_time?: string;
  mediation_location?: string;
  holiday_schedule_enabled?: boolean;
  holiday_schedule_in_form?: boolean;
  holiday_schedule_on_fl341c?: boolean;
  holiday_details?: string;
  additional_provisions_enabled?: boolean;
  additional_provisions?: string[];
  other_requests?: string;
}

interface CaseData {
  case_name: string;
  case_number?: string;
}

// Checkbox helper
const checkbox = (checked: boolean | undefined) =>
  checked ? '&#9746;' : '&#9744;';

// Format date helper
const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

// Format party name
const formatParty = (party: string | undefined) => {
  if (!party) return '';
  return party.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

// Format schedule time
const formatScheduleTime = (time: ScheduleTime | undefined) => {
  if (!time) return '';
  if (time.reference === 'start_of_school') return 'start of school';
  if (time.reference === 'after_school') return 'after school';
  if (!time.time_value) return '';
  return `${time.time_value} ${time.is_am ? 'a.m.' : 'p.m.'}`;
};

export function generateFL311PDF(formData: FL311FormData, caseData: CaseData) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>FL-311 Child Custody and Visitation Application Attachment</title>
  <style>
    @page {
      size: letter;
      margin: 0.5in 0.5in 0.75in 0.5in;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 10pt;
      line-height: 1.3;
      color: #000;
    }
    .page {
      width: 7.5in;
      min-height: 10in;
      padding: 0;
      page-break-after: always;
    }
    .page:last-child {
      page-break-after: auto;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .header-left {
      font-size: 9pt;
    }
    .header-right {
      text-align: right;
    }
    .form-title {
      font-weight: bold;
      font-size: 11pt;
      text-align: center;
      margin: 8px 0;
    }
    .form-subtitle {
      text-align: center;
      font-size: 9pt;
      margin-bottom: 12px;
    }

    /* Party Info Box */
    .party-box {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      border: 1px solid #000;
      padding: 8px;
      margin-bottom: 12px;
      font-size: 9pt;
    }
    .party-box label {
      font-weight: bold;
      display: block;
      margin-bottom: 2px;
    }
    .party-box .value {
      border-bottom: 1px solid #000;
      min-height: 16px;
      padding: 2px 0;
    }

    /* Attachment Type */
    .attachment-box {
      border: 1px solid #000;
      padding: 8px;
      margin-bottom: 12px;
    }
    .attachment-box .title {
      font-weight: bold;
      margin-bottom: 6px;
    }
    .checkbox-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Items/Sections */
    .item {
      margin-bottom: 12px;
      padding-left: 8px;
    }
    .item-number {
      font-weight: bold;
      display: inline-block;
      width: 24px;
    }
    .item-title {
      font-weight: bold;
    }
    .item-content {
      margin-left: 24px;
      margin-top: 4px;
    }
    .sub-item {
      margin: 4px 0;
      margin-left: 16px;
    }
    .sub-item-letter {
      display: inline-block;
      width: 16px;
    }

    /* Table for children */
    .children-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }
    .children-table th,
    .children-table td {
      border: 1px solid #000;
      padding: 4px 8px;
      text-align: left;
    }
    .children-table th {
      background: #f0f0f0;
      font-weight: bold;
    }

    /* Input lines */
    .input-line {
      border-bottom: 1px solid #000;
      min-height: 16px;
      display: inline-block;
      min-width: 100px;
    }
    .input-line.wide {
      width: 100%;
      display: block;
    }
    .input-line.medium {
      width: 200px;
    }

    /* Footer */
    .footer {
      position: fixed;
      bottom: 0.5in;
      left: 0.5in;
      right: 0.5in;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      border-top: 1px solid #000;
      padding-top: 4px;
    }
    .page-number {
      text-align: right;
    }

    /* Note boxes */
    .note-box {
      border: 1px solid #000;
      background: #fffde7;
      padding: 6px 8px;
      font-size: 9pt;
      margin: 8px 0;
    }

    /* Custody grid */
    .custody-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 6px;
    }
    .custody-item {
      border: 1px solid #ccc;
      padding: 6px;
    }
    .custody-item label {
      font-weight: bold;
      display: block;
      margin-bottom: 4px;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { page-break-after: always; }
      .no-break { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <!-- PAGE 1 -->
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        FL-311<br/>
        <small>Rev. January 1, 2026</small>
      </div>
      <div class="header-right">
        <small>FOR COURT USE ONLY</small>
      </div>
    </div>

    <div class="form-title">
      CHILD CUSTODY AND VISITATION (PARENTING TIME)<br/>
      APPLICATION ATTACHMENT
    </div>

    <!-- Party Information -->
    <div class="party-box">
      <div>
        <label>PETITIONER:</label>
        <div class="value">${formData.petitioner_name || ''}</div>
      </div>
      <div>
        <label>RESPONDENT:</label>
        <div class="value">${formData.respondent_name || ''}</div>
      </div>
      <div>
        <label>CASE NUMBER:</label>
        <div class="value">${formData.case_number || caseData.case_number || ''}</div>
      </div>
    </div>

    ${formData.other_parent_party_name ? `
    <div style="margin-bottom: 12px; font-size: 9pt;">
      <strong>OTHER PARENT/PARTY:</strong> ${formData.other_parent_party_name}
    </div>
    ` : ''}

    <!-- TO: Attachment Type -->
    <div class="attachment-box">
      <div class="title">TO: This form is attached to (check one):</div>
      <div class="checkbox-row">
        <div class="checkbox-item">${checkbox(formData.attachment_type === 'petition')} Petition</div>
        <div class="checkbox-item">${checkbox(formData.attachment_type === 'response')} Response</div>
        <div class="checkbox-item">${checkbox(formData.attachment_type === 'request_for_order')} Request for Order</div>
        <div class="checkbox-item">${checkbox(formData.attachment_type === 'responsive_declaration')} Responsive Declaration to Request for Order</div>
        <div class="checkbox-item">${checkbox(formData.attachment_type === 'other')} Other: ${formData.attachment_type_other || '_____________'}</div>
      </div>
    </div>

    <!-- California Public Policy Info Box -->
    <div class="note-box" style="background: #e8f4fd; border: 2px solid #1976d2; margin-bottom: 12px;">
      <p style="font-size: 9pt; margin-bottom: 6px;">
        <strong>NOTICE (California Family Code § 3020):</strong>
      </p>
      <p style="font-size: 8pt; line-height: 1.4;">
        It is the public policy of this state to ensure that the health, safety, and welfare of children shall be the
        court's primary concern in determining the best interests of children when making any orders regarding the
        physical or legal custody or visitation of children. The Legislature finds and declares that it is the public
        policy of this state to ensure that children have frequent and continuing contact with both parents after the
        parents have separated or dissolved their marriage, and to encourage parents to share the rights and
        responsibilities of child rearing.
      </p>
    </div>

    ${formData.legal_custody_to === 'joint' ? `
    <!-- FL-341(E) Note for Joint Legal Custody -->
    <div class="note-box" style="background: #fff3e0; border: 2px solid #f57c00;">
      <p style="font-size: 9pt;">
        <strong>JOINT LEGAL CUSTODY NOTE:</strong> If joint legal custody is ordered, the parents must consult with each
        other on major decisions relating to the health, education, and welfare of the children. Consider completing and
        attaching form <strong>FL-341(E)</strong> (Joint Legal Custody Attachment) to specify decision-making procedures.
      </p>
    </div>
    ` : ''}

    <!-- Item 1: Minor Children -->
    <div class="item no-break">
      <span class="item-number">1.</span>
      <span class="item-title">MINOR CHILDREN</span>
      <div class="item-content">
        <table class="children-table">
          <thead>
            <tr>
              <th>Child's Name</th>
              <th>Birthdate</th>
              <th>Age</th>
            </tr>
          </thead>
          <tbody>
            ${(formData.children || []).map((child) => `
              <tr>
                <td>${child.name || ''}</td>
                <td>${formatDate(child.birthdate)}</td>
                <td>${child.age !== undefined ? child.age : ''}</td>
              </tr>
            `).join('')}
            ${(formData.children || []).length === 0 ? `
              <tr><td colspan="3" style="text-align: center; color: #999;">No children listed</td></tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Item 2: Custody -->
    <div class="item no-break">
      <span class="item-number">2.</span>
      <span class="item-title">CUSTODY of the minor children is requested as follows:</span>
      <div class="item-content">
        <div class="custody-grid">
          <div class="custody-item">
            <label>a. Physical custody to:</label>
            <div class="checkbox-row">
              <div class="checkbox-item">${checkbox(formData.physical_custody_to === 'petitioner')} Petitioner</div>
              <div class="checkbox-item">${checkbox(formData.physical_custody_to === 'respondent')} Respondent</div>
              <div class="checkbox-item">${checkbox(formData.physical_custody_to === 'joint')} Joint</div>
              <div class="checkbox-item">${checkbox(formData.physical_custody_to === 'other_parent_party')} Other Parent/Party</div>
            </div>
          </div>
          <div class="custody-item">
            <label>b. Legal custody to:</label>
            <div class="checkbox-row">
              <div class="checkbox-item">${checkbox(formData.legal_custody_to === 'petitioner')} Petitioner</div>
              <div class="checkbox-item">${checkbox(formData.legal_custody_to === 'respondent')} Respondent</div>
              <div class="checkbox-item">${checkbox(formData.legal_custody_to === 'joint')} Joint</div>
              <div class="checkbox-item">${checkbox(formData.legal_custody_to === 'other_parent_party')} Other Parent/Party</div>
            </div>
          </div>
        </div>
        <div class="sub-item">
          <span class="sub-item-letter">c.</span>
          ${checkbox(formData.has_abuse_allegations)} There are allegations of a history of abuse or substance abuse. (If checked, you must complete item 5.)
        </div>
        ${formData.other_custody_details ? `
        <div class="sub-item">
          <span class="sub-item-letter">d.</span>
          Other custody details: ${formData.other_custody_details}
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Item 3: Visitation Type -->
    <div class="item no-break">
      <span class="item-number">3.</span>
      <span class="item-title">VISITATION (Parenting Time)</span>
      <div class="item-content">
        <p style="margin-bottom: 6px;">I request that the court order the following visitation (parenting time):</p>
        <div class="sub-item">
          <span class="sub-item-letter">a.</span>
          ${checkbox(formData.visitation_type === 'reasonable')} Reasonable right of visitation to the party without physical custody (includes virtual visitation).
          <br/><small style="margin-left: 20px;">(Not appropriate in cases involving domestic violence.)</small>
        </div>
        <div class="sub-item">
          <span class="sub-item-letter">b.</span>
          ${checkbox(formData.visitation_type === 'attached_document')} Visitation as described in an attached document
          ${formData.visitation_attached_pages ? `(${formData.visitation_attached_pages} pages)` : ''}
          ${formData.visitation_attached_date ? `dated ${formatDate(formData.visitation_attached_date)}` : ''}
        </div>
        <div class="sub-item">
          <span class="sub-item-letter">c.</span>
          ${checkbox(formData.visitation_type === 'schedule_in_item_4')} The visitation (parenting time) schedule in item 4
        </div>
        <div class="sub-item">
          <span class="sub-item-letter">d.</span>
          ${checkbox(formData.visitation_type === 'supervised')} Supervised visitation as specified in item 6
        </div>
        <div class="sub-item">
          <span class="sub-item-letter">e.</span>
          ${checkbox(formData.visitation_type === 'no_visitation')} No visitation (If checked, describe reasons in item 13.)
        </div>
      </div>
    </div>

    <div class="note-box">
      <strong>Note:</strong> Unless specifically ordered, a child's holiday schedule order has priority over the child's regular parenting time order.
    </div>
  </div>

  <!-- PAGE 2 -->
  <div class="page">
    <div class="header">
      <div class="header-left">
        CASE NUMBER: ${formData.case_number || caseData.case_number || ''}
      </div>
      <div class="header-right">
        FL-311 Page 2 of 5
      </div>
    </div>

    <!-- Item 4: Schedule -->
    <div class="item">
      <span class="item-number">4.</span>
      <span class="item-title">VISITATION (Parenting Time) SCHEDULE</span>
      <div class="item-content">
        <p>The following schedule describes <strong>${formatParty(formData.schedule_for_party)}'s</strong> visitation (parenting time) with the minor children.</p>

        <div style="margin-top: 10px; font-weight: bold; font-size: 10pt; border-bottom: 1px solid #000; padding-bottom: 4px;">a. In-Person Visitation:</div>

        <!-- 4a(1): Specific Weekends Grid -->
        <div class="sub-item" style="margin-top: 8px;">
          <span class="sub-item-letter">(1)</span>
          ${checkbox(formData.specific_weekends_enabled)} <strong>The weekends of each month</strong>
          ${formData.specific_weekends_enabled && formData.specific_weekends_start_date ? ` starting: ${formatDate(formData.specific_weekends_start_date)}` : ''}
        </div>

        ${formData.specific_weekends_enabled && formData.weekend_schedules ? `
        <div style="margin-left: 24px; margin-top: 8px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 4px; width: 60px;">Weekend</th>
                <th style="border: 1px solid #000; padding: 4px;">From (day)</th>
                <th style="border: 1px solid #000; padding: 4px;">From (time)</th>
                <th style="border: 1px solid #000; padding: 4px;">To (day)</th>
                <th style="border: 1px solid #000; padding: 4px;">To (time)</th>
              </tr>
            </thead>
            <tbody>
              ${formData.weekend_schedules.filter(w => w.enabled).map(w => `
              <tr>
                <td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${w.weekend}</td>
                <td style="border: 1px solid #000; padding: 4px;">${w.from_day || ''}</td>
                <td style="border: 1px solid #000; padding: 4px;">${formatScheduleTime(w.from_time)}</td>
                <td style="border: 1px solid #000; padding: 4px;">${w.to_day || ''}</td>
                <td style="border: 1px solid #000; padding: 4px;">${formatScheduleTime(w.to_time)}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>

          ${formData.fifth_weekend_handling && formData.fifth_weekend_handling.type !== 'none' ? `
          <div style="margin-top: 8px; padding: 6px; border: 1px solid #000; background: #fffde7;">
            <strong>5th Weekend:</strong>
            ${formData.fifth_weekend_handling.type === 'alternating' ? `
              (a) The parties will alternate the 5th weekend, with ${formatParty(formData.fifth_weekend_handling.alternating_initial_party)}
              having the initial 5th weekend on ${formatDate(formData.fifth_weekend_handling.alternating_start_date)}.
            ` : ''}
            ${formData.fifth_weekend_handling.type === 'specific' ? `
              (b) The 5th weekend will be with ${formatParty(formData.fifth_weekend_handling.specific_party)}
              ${formData.fifth_weekend_handling.in_odd_months ? ' in odd-numbered months' : ''}
              ${formData.fifth_weekend_handling.in_even_months ? ' in even-numbered months' : ''}.
            ` : ''}
          </div>
          ` : ''}
        </div>
        ` : ''}

        <!-- 4a(2): Alternate Weekends -->
        <div class="sub-item" style="margin-top: 8px;">
          <span class="sub-item-letter">(2)</span>
          ${checkbox(formData.alternate_weekends_enabled || formData.alternate_weekends)} <strong>Alternate weekends</strong>
          ${(formData.alternate_weekends_enabled || formData.alternate_weekends) ? `
          <div style="margin-left: 20px; margin-top: 4px; font-size: 9pt;">
            Starting: ${formatDate(formData.alternate_weekends_start_date || formData.alternate_weekends_start)}<br/>
            From: ${formData.alternate_weekends_from_day || 'Friday'} at ${formatScheduleTime(formData.alternate_weekends_from_time) || '6:00 p.m.'}<br/>
            To: ${formData.alternate_weekends_to_day || 'Sunday'} at ${formatScheduleTime(formData.alternate_weekends_to_time) || '6:00 p.m.'}
          </div>
          ` : ''}
        </div>

        <!-- 4a(3): Weekdays -->
        <div class="sub-item" style="margin-top: 8px;">
          <span class="sub-item-letter">(3)</span>
          ${checkbox(formData.weekdays_enabled)} <strong>Weekdays</strong>
          ${formData.weekdays_enabled ? `
          <div style="margin-left: 20px; margin-top: 4px; font-size: 9pt;">
            ${formData.weekdays_start_date ? `Starting: ${formatDate(formData.weekdays_start_date)}<br/>` : ''}
            Days: ${(formData.weekday_days || []).join(', ') || 'Not specified'}<br/>
            From: ${formatScheduleTime(formData.weekdays_from_time) || formData.weekday_times || 'Not specified'}<br/>
            To: ${formatScheduleTime(formData.weekdays_to_time) || 'Not specified'}
          </div>
          ` : ''}
        </div>

        <!-- 4a(4): Other in-person -->
        <div class="sub-item" style="margin-top: 8px;">
          <span class="sub-item-letter">(4)</span>
          ${checkbox(formData.other_inperson_in_attachment)} <strong>Other</strong> (in Attachment 4a(4))
          ${formData.other_inperson_description || formData.other_schedule_details ? `
          <div style="margin-left: 20px; margin-top: 4px; font-size: 9pt;">
            ${formData.other_inperson_description || formData.other_schedule_details}
          </div>
          ` : ''}
        </div>

        <!-- 4b: Virtual Visitation -->
        <div style="margin-top: 10px; font-weight: bold; font-size: 10pt; border-bottom: 1px solid #000; padding-bottom: 4px;">b. Virtual Visitation:</div>
        <div class="sub-item" style="margin-top: 6px;">
          ${checkbox(formData.virtual_visitation_enabled)} I request virtual visitation using audiovisual technology (smartphone, tablet, computer) for parent and child to see and hear each other in real time.
          ${formData.virtual_visitation_enabled ? `
          <div style="margin-left: 20px; margin-top: 4px; font-size: 9pt;">
            ${checkbox(formData.virtual_visitation_in_attachment)} Schedule is in Attachment 4b
            ${!formData.virtual_visitation_in_attachment && formData.virtual_visitation_description ? `
            <br/>Schedule: ${formData.virtual_visitation_description}
            ` : ''}
          </div>
          ` : ''}
        </div>

        <!-- 4c: Other Ways -->
        ${formData.other_ways_description ? `
        <div style="margin-top: 10px; font-weight: bold; font-size: 10pt; border-bottom: 1px solid #000; padding-bottom: 4px;">c. Other ways:</div>
        <div class="sub-item" style="margin-top: 6px; font-size: 9pt;">
          ${formData.other_ways_description}
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Item 5: Abuse Allegations -->
    <div class="item">
      <span class="item-number">5.</span>
      <span class="item-title">ABUSE OR SUBSTANCE ABUSE ALLEGATIONS</span>
      <div class="item-content">
        ${!formData.has_abuse_allegations ? `
        <p style="color: #666; font-style: italic;">No allegations checked in Item 2c - this section does not apply.</p>
        ` : `
        <div style="font-weight: bold; margin-bottom: 6px;">a. Allegations:</div>
        <div class="sub-item">
          <span class="sub-item-letter">(1)</span>
          Abuse alleged against: ${(formData.abuse_alleged_against || []).map(formatParty).join(', ') || 'None'}
        </div>
        <div class="sub-item">
          <span class="sub-item-letter">(2)</span>
          Substance abuse alleged against: ${(formData.substance_abuse_alleged_against || []).map(formatParty).join(', ') || 'None'}
        </div>

        <div style="font-weight: bold; margin-top: 8px; margin-bottom: 6px;">b. Child Custody Despite Allegations:</div>
        <div class="sub-item">
          <span class="sub-item-letter">(1)</span>
          ${checkbox(formData.request_no_custody_due_to_allegations)} I ask that the court NOT order sole or joint custody to the party/parties named above.
        </div>
        <div class="sub-item">
          <span class="sub-item-letter">(2)</span>
          ${checkbox(formData.custody_despite_allegations)} Even though there are allegations, I ask that the court make the child custody orders in Item 2.
          ${formData.custody_despite_allegations && formData.custody_despite_allegations_reasons ? `
          <div style="margin-left: 20px; margin-top: 4px;">
            <strong>Reasons:</strong> ${formData.custody_despite_allegations_reasons}
          </div>
          ` : ''}
        </div>

        <div style="font-weight: bold; margin-top: 8px; margin-bottom: 6px;">c. Visitation Despite Allegations:</div>
        <div class="sub-item">
          <span class="sub-item-letter">(1)</span>
          ${checkbox(formData.request_supervised_visitation)} I ask that the court order supervised visitation as specified in Item 6.
        </div>
        <div class="sub-item">
          <span class="sub-item-letter">(2)</span>
          ${checkbox(formData.request_unsupervised_despite_allegations)} Even though there are allegations, I request unsupervised visitation.
          ${formData.request_unsupervised_despite_allegations && formData.unsupervised_reasons ? `
          <div style="margin-left: 20px; margin-top: 4px;">
            <strong>Reasons:</strong> ${formData.unsupervised_reasons}
          </div>
          ` : ''}
        </div>
        `}
      </div>
    </div>
  </div>

  <!-- PAGE 3 -->
  <div class="page">
    <div class="header">
      <div class="header-left">
        CASE NUMBER: ${formData.case_number || caseData.case_number || ''}
      </div>
      <div class="header-right">
        FL-311 Page 3 of 5
      </div>
    </div>

    <!-- Item 6: Supervised Visitation -->
    <div class="item">
      <span class="item-number">6.</span>
      <span class="item-title">SUPERVISED VISITATION</span>
      <div class="item-content">
        ${formData.visitation_type !== 'supervised' && !formData.request_supervised_visitation ? `
        <p style="color: #666; font-style: italic;">Supervised visitation was not requested - this section does not apply.</p>
        ` : `
        <div class="sub-item">
          <span class="sub-item-letter">a.</span>
          <strong>Who should have supervised visitation:</strong> ${formatParty(formData.supervised_party)}
        </div>

        <div class="sub-item">
          <span class="sub-item-letter">b.</span>
          <strong>Reasons why supervised visitation is needed:</strong>
          <div style="margin-left: 20px; margin-top: 4px;">
            ${formData.supervised_reasons || 'Not specified'}
          </div>
        </div>

        <div class="sub-item">
          <span class="sub-item-letter">c.</span>
          <strong>Supervision Provider:</strong>
          <div style="margin-left: 20px; margin-top: 4px;">
            Name: ${formData.supervisor_name || 'Not specified'}<br/>
            Phone: ${formData.supervisor_phone || 'Not specified'}<br/>
            <div style="margin-top: 4px;">
              ${checkbox(formData.supervisor_type === 'professional')} Professional provider (must meet requirements in form FL-324(P))
              ${formData.supervisor_type === 'professional' ? `
              <div style="margin-left: 20px; margin-top: 4px; padding: 4px; border: 1px solid #ccc;">
                <strong>Fee Split:</strong>
                Petitioner: ${formData.professional_fee_petitioner_percent || 0}% |
                Respondent: ${formData.professional_fee_respondent_percent || 0}% |
                Other: ${formData.professional_fee_other_percent || 0}%
              </div>
              ` : ''}
            </div>
            <div style="margin-top: 4px;">
              ${checkbox(formData.supervisor_type === 'nonprofessional')} Nonprofessional provider (must meet requirements in form FL-324(NP))
            </div>
          </div>
        </div>

        <div class="sub-item">
          <span class="sub-item-letter">d.</span>
          <strong>Location:</strong>
          ${checkbox(formData.supervised_location === 'in_person_safe')} In person at a safe location
          ${checkbox(formData.supervised_location === 'virtual')} Virtual (not in person)
          ${checkbox(formData.supervised_location === 'other')} Other: ${formData.supervised_location_other || ''}
        </div>

        <div class="sub-item">
          <span class="sub-item-letter">e.</span>
          <strong>Schedule:</strong>
          ${checkbox(formData.supervised_frequency === 'once_week')} Once a week
          ${checkbox(formData.supervised_frequency === 'twice_week')} Twice a week
          ${checkbox(formData.supervised_frequency === 'per_item_4')} As specified in Item 4
          ${checkbox(formData.supervised_frequency === 'other')} Other
          ${formData.supervised_hours_per_visit ? `<br/>Hours per visit: ${formData.supervised_hours_per_visit}` : ''}
        </div>
        `}
      </div>
    </div>

    <!-- Item 7: Transportation -->
    <div class="item">
      <span class="item-number">7.</span>
      <span class="item-title">TRANSPORTATION FOR VISITATION AND PLACE OF EXCHANGE</span>
      <div class="item-content">
        <div class="sub-item">
          <span class="sub-item-letter">a.</span>
          The children must be driven only by a licensed and insured driver. The vehicle must be legally registered with the DMV and have child restraint devices properly installed.
        </div>

        <div class="sub-item">
          <span class="sub-item-letter">b.</span>
          <strong>Transportation TO begin visits provided by:</strong> ${formData.transport_to_visits_by || 'Not specified'}
        </div>

        <div class="sub-item">
          <span class="sub-item-letter">c.</span>
          <strong>Transportation FROM visits provided by:</strong> ${formData.transport_from_visits_by || 'Not specified'}
        </div>

        <div class="sub-item">
          <span class="sub-item-letter">d.</span>
          <strong>Exchange point at BEGINNING of visit:</strong> ${formData.exchange_point_start || 'Not specified'}
        </div>

        <div class="sub-item">
          <span class="sub-item-letter">e.</span>
          <strong>Exchange point at END of visit:</strong> ${formData.exchange_point_end || 'Not specified'}
        </div>

        <div class="sub-item">
          <span class="sub-item-letter">f.</span>
          ${checkbox(formData.curbside_exchange)} During exchanges, the party driving the children will wait in the car and the other party will wait in the home while the children go between the car and the home.
        </div>

        ${formData.other_transport_details ? `
        <div class="sub-item">
          <span class="sub-item-letter">g.</span>
          <strong>Other transportation arrangements:</strong>
          <div style="margin-left: 20px; margin-top: 4px;">
            ${formData.other_transport_details}
          </div>
        </div>
        ` : ''}
      </div>
    </div>
  </div>

  <!-- PAGE 4 -->
  <div class="page">
    <div class="header">
      <div class="header-left">
        CASE NUMBER: ${formData.case_number || caseData.case_number || ''}
      </div>
      <div class="header-right">
        FL-311 Page 4 of 5
      </div>
    </div>

    <!-- Item 8: Travel Restrictions -->
    <div class="item">
      <span class="item-number">8.</span>
      <span class="item-title">TRAVEL WITH CHILDREN</span>
      <div class="item-content">
        ${!formData.travel_restrictions_enabled ? `
        <p style="color: #666; font-style: italic;">No travel restrictions requested.</p>
        ` : `
        <p>The party must have written permission from the other parent or a court order to take the children out of:</p>
        <div class="sub-item">
          <span class="sub-item-letter">a.</span>
          ${checkbox(formData.restrict_out_of_state)} The state of California
        </div>
        <div class="sub-item">
          <span class="sub-item-letter">b.</span>
          ${checkbox(formData.restrict_counties)} The following counties: ${formData.allowed_counties || 'Not specified'}
        </div>
        ${formData.other_travel_restrictions ? `
        <div class="sub-item">
          <span class="sub-item-letter">c.</span>
          Other: ${formData.other_travel_restrictions}
        </div>
        ` : ''}
        `}
      </div>
    </div>

    <!-- Item 9: Child Abduction Prevention -->
    <div class="item">
      <span class="item-number">9.</span>
      <span class="item-title">CHILD ABDUCTION PREVENTION</span>
      <div class="item-content">
        ${checkbox(formData.abduction_prevention_enabled)} There is a risk that one of the parties will take the children out of California without the other party's permission.
        <p style="margin-top: 4px; font-size: 9pt;">(If checked, complete and attach form FL-312, Child Abduction Prevention Order Attachment.)</p>
      </div>
    </div>

    <!-- Item 10: Mediation -->
    <div class="item">
      <span class="item-number">10.</span>
      <span class="item-title">CHILD CUSTODY MEDIATION</span>
      <div class="item-content">
        ${checkbox(formData.mediation_requested)} I request an order for the parties to go to child custody mediation.
        ${formData.mediation_requested ? `
        <div style="margin-left: 20px; margin-top: 6px;">
          Date: ${formData.mediation_date ? formatDate(formData.mediation_date) : 'To be determined'}<br/>
          Time: ${formData.mediation_time || 'To be determined'}<br/>
          Location: ${formData.mediation_location || 'To be determined'}
        </div>
        ` : ''}
        <div class="note-box" style="margin-top: 8px;">
          <strong>Note:</strong> A party who alleges domestic violence in a written declaration or who is protected by a protective order may ask the mediator to meet with the parties separately and at separate times.
        </div>
      </div>
    </div>

    <!-- Item 11: Holiday Schedule -->
    <div class="item">
      <span class="item-number">11.</span>
      <span class="item-title">CHILDREN'S HOLIDAY SCHEDULE</span>
      <div class="item-content">
        ${checkbox(formData.holiday_schedule_enabled)} I request a holiday and vacation schedule:
        ${formData.holiday_schedule_enabled ? `
        <div style="margin-left: 20px; margin-top: 6px;">
          ${checkbox(formData.holiday_schedule_in_form)} Described below<br/>
          ${checkbox(formData.holiday_schedule_on_fl341c)} On attached form FL-341(C) (Children's Holiday Schedule Attachment)
          ${formData.holiday_schedule_in_form && formData.holiday_details ? `
          <div style="margin-top: 6px; padding: 8px; border: 1px solid #ccc;">
            ${formData.holiday_details}
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
    </div>
  </div>

  <!-- PAGE 5 -->
  <div class="page">
    <div class="header">
      <div class="header-left">
        CASE NUMBER: ${formData.case_number || caseData.case_number || ''}
      </div>
      <div class="header-right">
        FL-311 Page 5 of 5
      </div>
    </div>

    <!-- Item 12: Additional Provisions -->
    <div class="item">
      <span class="item-number">12.</span>
      <span class="item-title">ADDITIONAL CUSTODY PROVISIONS</span>
      <div class="item-content">
        ${checkbox(formData.additional_provisions_enabled)} I request additional orders for custody:
        ${formData.additional_provisions_enabled && formData.additional_provisions && formData.additional_provisions.length > 0 ? `
        <ul style="margin-left: 30px; margin-top: 6px;">
          ${formData.additional_provisions.map((p: string) => `<li>${p}</li>`).join('')}
        </ul>
        ` : ''}
        <p style="margin-top: 4px; font-size: 9pt;">(May also be specified on form FL-341(D), Additional Provisions Attachment.)</p>
      </div>
    </div>

    <!-- Item 13: Other -->
    <div class="item">
      <span class="item-number">13.</span>
      <span class="item-title">OTHER</span>
      <div class="item-content">
        ${formData.other_requests ? `
        <div style="padding: 8px; border: 1px solid #ccc; min-height: 100px;">
          ${formData.other_requests}
        </div>
        ` : `
        <div style="padding: 8px; border: 1px solid #ccc; min-height: 100px; color: #999; font-style: italic;">
          No other requests specified.
        </div>
        `}
      </div>
    </div>

    <!-- Footer -->
    <div style="margin-top: 24px; padding-top: 12px; border-top: 2px solid #000;">
      <p style="font-size: 9pt; text-align: center;">
        <strong>FL-311</strong> [Rev. January 1, 2026]<br/>
        CHILD CUSTODY AND VISITATION (PARENTING TIME) APPLICATION ATTACHMENT
      </p>
      <p style="font-size: 8pt; text-align: center; margin-top: 8px; color: #666;">
        Generated by CommonGround on ${new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </div>
  </div>
</body>
</html>
  `;

  // Open print window
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

export default generateFL311PDF;
