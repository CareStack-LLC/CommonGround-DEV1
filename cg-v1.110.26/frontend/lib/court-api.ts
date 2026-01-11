// Court Portal API Client
// Handles all court professional authentication and case access operations

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Types matching backend schemas
export interface CourtProfessional {
  id: string;
  email: string;
  name: string;
  title?: string;
  organization: string;
  role: CourtRole;
  bar_number?: string;
  court_id?: string;
  is_verified: boolean;
  mfa_enabled: boolean;
  created_at: string;
}

export type CourtRole =
  | "court_clerk"
  | "gal"
  | "attorney_petitioner"
  | "attorney_respondent"
  | "mediator"
  | "judge";

export interface CourtAccessGrant {
  id: string;
  case_id: string;
  case_name?: string;
  professional_id: string;
  role: CourtRole;
  granted_by_id?: string;
  granted_by_name?: string;
  status: "pending" | "active" | "revoked" | "expired";
  access_level: "read" | "read_write" | "full";
  start_date: string;
  end_date: string;
  days_remaining: number;
  created_at: string;
}

export interface CourtCaseSettings {
  id: string;
  case_id: string;
  gps_checkins_required: boolean;
  supervised_exchanges: boolean;
  in_app_communication_only: boolean;
  aria_enforcement_locked: boolean;
  agreement_edits_locked: boolean;
  investigation_mode: boolean;
  disable_delete_messages: boolean;
  require_read_receipts: boolean;
  updated_at: string;
  updated_by_id?: string;
}

export interface CourtEvent {
  id: string;
  case_id: string;
  event_type: string;
  title: string;
  description?: string;
  scheduled_at: string;
  location?: string;
  required_attendees: string[];
  petitioner_rsvp?: string;
  respondent_rsvp?: string;
  notes?: string;
  created_by_id: string;
  created_at: string;
}

export interface CourtMessage {
  id: string;
  case_id: string;
  from_professional_id: string;
  from_name: string;
  subject: string;
  content: string;
  sent_at: string;
  read_by_petitioner_at?: string;
  read_by_respondent_at?: string;
  delivery_confirmed: boolean;
}

export interface InvestigationReport {
  id: string;
  case_id: string;
  report_number: string;
  report_type: string;
  title: string;
  date_range_start: string;
  date_range_end: string;
  generated_by_id: string;
  generated_at: string;
  file_url?: string;
  file_hash?: string;
  page_count?: number;
  download_count: number;
  status: string;
}

export interface ARIAQueryRequest {
  query: string;
  case_id: string;
}

export interface ARIAQueryResponse {
  query: string;
  response: string;
  data?: Record<string, unknown>;
  facts_only: boolean;
  timestamp: string;
}

// Auth token management for court professionals
let courtAuthToken: string | null = null;

export function setCourtAuthToken(token: string | null): void {
  courtAuthToken = token;
  if (token) {
    localStorage.setItem("court_auth_token", token);
  } else {
    localStorage.removeItem("court_auth_token");
  }
}

export function getCourtAuthToken(): string | null {
  if (courtAuthToken) return courtAuthToken;
  if (typeof window !== "undefined") {
    courtAuthToken = localStorage.getItem("court_auth_token");
  }
  return courtAuthToken;
}

// Helper for making authenticated requests
async function courtFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getCourtAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }

  return response.json();
}

// ============================================
// Professional Authentication
// ============================================

export const courtAuthAPI = {
  // Step 1: Request verification code
  async requestAccess(email: string): Promise<{ message: string }> {
    return courtFetch("/api/v1/court/professionals/request-access", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  // Step 2: Verify code and get token
  async verifyCode(
    email: string,
    code: string
  ): Promise<{ access_token: string; professional: CourtProfessional }> {
    const response = await courtFetch<{
      access_token: string;
      professional: CourtProfessional;
    }>("/api/v1/court/professionals/verify", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });

    setCourtAuthToken(response.access_token);
    return response;
  },

  // Step 3 (optional): Verify MFA
  async verifyMFA(
    mfa_token: string
  ): Promise<{ access_token: string; professional: CourtProfessional }> {
    const response = await courtFetch<{
      access_token: string;
      professional: CourtProfessional;
    }>("/api/v1/court/professionals/verify-mfa", {
      method: "POST",
      body: JSON.stringify({ mfa_token }),
    });

    setCourtAuthToken(response.access_token);
    return response;
  },

  // Get current professional profile
  async getProfile(): Promise<CourtProfessional> {
    return courtFetch("/api/v1/court/professionals/me");
  },

  // Register new professional
  async register(data: {
    email: string;
    name: string;
    title?: string;
    organization: string;
    role: CourtRole;
    bar_number?: string;
    court_id?: string;
  }): Promise<CourtProfessional> {
    return courtFetch("/api/v1/court/professionals/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Logout
  logout(): void {
    setCourtAuthToken(null);
  },
};

// ============================================
// Access Grants
// ============================================

export const courtAccessAPI = {
  // List all grants for current professional
  async listMyGrants(): Promise<CourtAccessGrant[]> {
    return courtFetch("/api/v1/court/access/my-grants");
  },

  // Get specific grant details
  async getGrant(grantId: string): Promise<CourtAccessGrant> {
    return courtFetch(`/api/v1/court/access/grants/${grantId}`);
  },

  // Request access to a case
  async requestAccess(data: {
    case_id: string;
    role: CourtRole;
    justification?: string;
  }): Promise<CourtAccessGrant> {
    return courtFetch("/api/v1/court/access/request", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Get access audit log
  async getAuditLog(
    caseId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ logs: unknown[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", options.limit.toString());
    if (options?.offset) params.set("offset", options.offset.toString());

    return courtFetch(`/api/v1/court/access/cases/${caseId}/audit?${params}`);
  },
};

// ============================================
// Court Case Settings
// ============================================

export const courtSettingsAPI = {
  // Get case settings
  async getSettings(caseId: string): Promise<CourtCaseSettings> {
    return courtFetch(`/api/v1/court/settings/${caseId}`);
  },

  // Update case settings
  async updateSettings(
    caseId: string,
    settings: Partial<CourtCaseSettings>
  ): Promise<CourtCaseSettings> {
    return courtFetch(`/api/v1/court/settings/${caseId}`, {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  },
};

// ============================================
// Court Events
// ============================================

export const courtEventsAPI = {
  // List events for a case
  async listEvents(
    caseId: string,
    options?: { upcoming_only?: boolean }
  ): Promise<CourtEvent[]> {
    const params = new URLSearchParams();
    if (options?.upcoming_only) params.set("upcoming_only", "true");

    return courtFetch(`/api/v1/court/events/${caseId}?${params}`);
  },

  // Create event
  async createEvent(data: {
    case_id: string;
    event_type: string;
    title: string;
    description?: string;
    scheduled_at: string;
    location?: string;
    required_attendees?: string[];
    notes?: string;
  }): Promise<CourtEvent> {
    return courtFetch("/api/v1/court/events", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Update event
  async updateEvent(
    eventId: string,
    data: Partial<CourtEvent>
  ): Promise<CourtEvent> {
    return courtFetch(`/api/v1/court/events/${eventId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Delete event
  async deleteEvent(eventId: string): Promise<void> {
    return courtFetch(`/api/v1/court/events/${eventId}`, {
      method: "DELETE",
    });
  },

  // Record attendance
  async recordAttendance(
    eventId: string,
    data: { attendee: string; status: string; notes?: string }
  ): Promise<void> {
    return courtFetch(`/api/v1/court/events/${eventId}/attendance`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// ============================================
// Court Messages
// ============================================

export const courtMessagesAPI = {
  // List messages for a case
  async listMessages(caseId: string): Promise<CourtMessage[]> {
    return courtFetch(`/api/v1/court/messages/${caseId}`);
  },

  // Send message to parents
  async sendMessage(data: {
    case_id: string;
    subject: string;
    content: string;
  }): Promise<CourtMessage> {
    return courtFetch("/api/v1/court/messages", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// ============================================
// Investigation Reports
// ============================================

export const courtReportsAPI = {
  // List reports for a case
  async listReports(caseId: string): Promise<InvestigationReport[]> {
    return courtFetch(`/api/v1/court/reports/${caseId}`);
  },

  // Generate new report
  async generateReport(data: {
    case_id: string;
    report_type: string;
    date_range_start: string;
    date_range_end: string;
    purpose?: string;
  }): Promise<InvestigationReport> {
    return courtFetch("/api/v1/court/reports/generate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Download report
  async downloadReport(reportId: string): Promise<Blob> {
    const token = getCourtAuthToken();
    const response = await fetch(
      `${API_BASE}/api/v1/court/reports/${reportId}/download`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );

    if (!response.ok) {
      throw new Error("Failed to download report");
    }

    return response.blob();
  },

  // Verify report integrity
  async verifyReport(
    reportId: string
  ): Promise<{ valid: boolean; hash: string; verified_at: string }> {
    return courtFetch(`/api/v1/court/reports/${reportId}/verify`);
  },
};

// ============================================
// ARIA Court Mode
// ============================================

export const courtARIAAPI = {
  // Query case facts
  async query(data: ARIAQueryRequest): Promise<ARIAQueryResponse> {
    return courtFetch("/api/v1/court/aria/query", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Get suggested queries
  async getSuggestedQueries(caseId: string): Promise<string[]> {
    return courtFetch(`/api/v1/court/aria/suggestions/${caseId}`);
  },
};

// ============================================
// Parent Messages (Read-only for court)
// ============================================

export const courtParentMessagesAPI = {
  // List parent-to-parent messages for a case
  async listParentMessages(
    caseId: string,
    options?: {
      start_date?: string;
      end_date?: string;
      flagged_only?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    messages: Array<{
      id: string;
      sender: string;
      sender_name: string;
      content: string;
      sent_at: string;
      was_flagged: boolean;
      original_content?: string;
      aria_score: number;
      aria_categories?: string[];
      suggestion_accepted?: boolean;
    }>;
    total: number;
  }> {
    const params = new URLSearchParams();
    if (options?.start_date) params.set("start_date", options.start_date);
    if (options?.end_date) params.set("end_date", options.end_date);
    if (options?.flagged_only) params.set("flagged_only", "true");
    if (options?.limit) params.set("limit", options.limit.toString());
    if (options?.offset) params.set("offset", options.offset.toString());

    return courtFetch(`/api/v1/court/parent-messages/${caseId}?${params}`);
  },

  // Get message analytics
  async getAnalytics(caseId: string): Promise<{
    total_messages: number;
    flagged_count: number;
    flag_rate: number;
    petitioner_stats: {
      messages_sent: number;
      flags: number;
      acceptance_rate: number;
    };
    respondent_stats: {
      messages_sent: number;
      flags: number;
      acceptance_rate: number;
    };
    trend: Array<{ date: string; messages: number; flags: number }>;
  }> {
    return courtFetch(`/api/v1/court/parent-messages/${caseId}/analytics`);
  },
};

// ============================================
// Court Form Workflow (For Court Professionals)
// ============================================

export interface CourtFormSubmission {
  id: string;
  case_id: string;
  parent_id: string;
  form_type: string;
  status: string;
  submission_source: string;
  form_data: Record<string, unknown>;
  pdf_url?: string;
  pdf_hash?: string;
  aria_assisted: boolean;
  court_notes?: string;
  resubmission_issues?: string[];
  responds_to_form_id?: string;
  parent_form_id?: string;
  hearing_id?: string;
  submitted_at?: string;
  approved_at?: string;
  approved_by_id?: string;
  rejected_at?: string;
  rejected_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface CaseFormProgress {
  case_id: string;
  activation_status: string;
  total_forms: number;
  pending_forms: number;
  approved_forms: number;
  has_fl300: boolean;
  has_fl300_approved: boolean;
  has_fl311: boolean;
  has_fl320: boolean;
  has_fl340: boolean;
  next_action?: string;
  fl300_id?: string;
}

export interface CourtHearing {
  id: string;
  case_id: string;
  hearing_type: string;
  scheduled_date: string;
  scheduled_time?: string;
  department?: string;
  judge_name?: string;
  outcome?: string;
  petitioner_attended?: boolean;
  respondent_attended?: boolean;
  notes?: string;
  related_fl300_id?: string;
  resulting_fl340_id?: string;
  created_at: string;
}

export const courtFormsAPI = {
  // List all forms for a case
  async listCaseForms(caseId: string): Promise<{ forms: CourtFormSubmission[] }> {
    return courtFetch(`/api/v1/court/forms/case/${caseId}`);
  },

  // Get case form workflow progress
  async getCaseProgress(caseId: string): Promise<CaseFormProgress> {
    return courtFetch(`/api/v1/court/forms/case/${caseId}/progress`);
  },

  // Get a specific form
  async getForm(submissionId: string): Promise<CourtFormSubmission> {
    return courtFetch(`/api/v1/court/forms/${submissionId}`);
  },

  // Approve a form
  async approveForm(
    submissionId: string,
    notes?: string
  ): Promise<CourtFormSubmission> {
    return courtFetch(`/api/v1/court/forms/${submissionId}/approve`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  },

  // Reject a form
  async rejectForm(
    submissionId: string,
    reason: string
  ): Promise<CourtFormSubmission> {
    return courtFetch(`/api/v1/court/forms/${submissionId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  // Request resubmission
  async requestResubmission(
    submissionId: string,
    issues: string[],
    notes?: string
  ): Promise<CourtFormSubmission> {
    return courtFetch(`/api/v1/court/forms/${submissionId}/request-resubmission`, {
      method: "POST",
      body: JSON.stringify({ issues, notes }),
    });
  },

  // Mark form as served
  async markServed(
    submissionId: string,
    serviceType: string,
    servedOnDate: string,
    notes?: string
  ): Promise<CourtFormSubmission> {
    return courtFetch(`/api/v1/court/forms/${submissionId}/mark-served`, {
      method: "POST",
      body: JSON.stringify({
        service_type: serviceType,
        served_on_date: servedOnDate,
        notes,
      }),
    });
  },

  // List hearings for a case
  async listHearings(caseId: string): Promise<CourtHearing[]> {
    return courtFetch(`/api/v1/court/forms/hearings/case/${caseId}`);
  },

  // Schedule a hearing
  async scheduleHearing(data: {
    case_id: string;
    hearing_type: string;
    scheduled_date: string;
    scheduled_time?: string;
    department?: string;
    judge_name?: string;
    related_fl300_id?: string;
    notes?: string;
  }): Promise<CourtHearing> {
    return courtFetch("/api/v1/court/forms/hearings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Record hearing outcome
  async recordHearingOutcome(
    hearingId: string,
    outcome: string,
    petitionerAttended: boolean,
    respondentAttended: boolean,
    notes?: string
  ): Promise<CourtHearing> {
    return courtFetch(`/api/v1/court/forms/hearings/${hearingId}/record-outcome`, {
      method: "POST",
      body: JSON.stringify({
        outcome,
        petitioner_attended: petitionerAttended,
        respondent_attended: respondentAttended,
        notes,
      }),
    });
  },

  // Enter FL-340 order
  async enterFL340(
    caseId: string,
    hearingId: string,
    formData: Record<string, unknown>
  ): Promise<CourtFormSubmission> {
    return courtFetch("/api/v1/court/forms/orders/fl340", {
      method: "POST",
      body: JSON.stringify({
        case_id: caseId,
        hearing_id: hearingId,
        form_data: formData,
      }),
    });
  },

  // Attach FL-341 to FL-340
  async attachFL341(
    fl340Id: string,
    formData: Record<string, unknown>
  ): Promise<CourtFormSubmission> {
    return courtFetch(`/api/v1/court/forms/orders/fl340/${fl340Id}/attach-fl341`, {
      method: "POST",
      body: JSON.stringify({ form_data: formData }),
    });
  },

  // Attach FL-342 to FL-340
  async attachFL342(
    fl340Id: string,
    formData: Record<string, unknown>
  ): Promise<CourtFormSubmission> {
    return courtFetch(`/api/v1/court/forms/orders/fl340/${fl340Id}/attach-fl342`, {
      method: "POST",
      body: JSON.stringify({ form_data: formData }),
    });
  },

  // Finalize FL-340 order and activate case
  async finalizeFL340(fl340Id: string): Promise<CourtFormSubmission> {
    return courtFetch(`/api/v1/court/forms/orders/fl340/${fl340Id}/finalize`, {
      method: "POST",
    });
  },

  // Activate case manually
  async activateCase(
    caseId: string,
    notes?: string
  ): Promise<{ case_id: string; status: string; activated_at: string }> {
    return courtFetch(`/api/v1/court/forms/case/${caseId}/activate`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  },
};

// Export all APIs together
export const courtAPI = {
  auth: courtAuthAPI,
  access: courtAccessAPI,
  settings: courtSettingsAPI,
  events: courtEventsAPI,
  messages: courtMessagesAPI,
  reports: courtReportsAPI,
  aria: courtARIAAPI,
  parentMessages: courtParentMessagesAPI,
  forms: courtFormsAPI,
};

export default courtAPI;
