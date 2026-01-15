/**
 * API Client for CommonGround Backend
 *
 * Handles all communication with the FastAPI backend including:
 * - Authentication (login, register, token management)
 * - Cases, Messages, Agreements, etc.
 */

// Robustly handle API URL configuration
let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
// Ensure URL doesn't end with slash before appending
if (apiUrl.endsWith('/')) {
  apiUrl = apiUrl.slice(0, -1);
}
// Append /api/v1 if not present
if (!apiUrl.endsWith('/api/v1')) {
  apiUrl += '/api/v1';
}
const API_URL = apiUrl;
const BASE_URL = API_URL.replace('/api/v1', '');

/**
 * Get full URL for uploaded images
 * Handles relative paths like /uploads/children/photo.jpg
 */
export function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  // If already absolute URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Prepend base URL for relative paths
  return `${BASE_URL}${path}`;
}

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Base fetch wrapper with error handling
 */
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add auth token if available
  const token = getAuthToken();
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    const isJSON = contentType?.includes('application/json');

    if (!response.ok) {
      let errorData;
      try {
        errorData = isJSON ? await response.json() : await response.text();
      } catch {
        errorData = 'Unknown error';
      }

      // Log detailed error for debugging
      console.error('API Error:', {
        url,
        status: response.status,
        statusText: response.statusText,
        errorData
      });

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && !endpoint.includes('/auth/')) {
        try {
          // Try to refresh the token
          await authAPI.refresh();

          // Retry the original request with new token
          const newToken = getAuthToken();
          if (newToken) {
            const retryConfig = {
              ...config,
              headers: {
                ...config.headers,
                'Authorization': `Bearer ${newToken}`,
              },
            };

            const retryResponse = await fetch(url, retryConfig);
            if (retryResponse.ok) {
              const retryContentType = retryResponse.headers.get('content-type');
              const retryIsJSON = retryContentType?.includes('application/json');

              if (retryResponse.status === 204) {
                return {} as T;
              }

              return (retryIsJSON ? await retryResponse.json() : await retryResponse.text()) as T;
            }
          }
        } catch (refreshError) {
          // Refresh failed - user needs to log in again
          console.error('Token refresh failed:', refreshError);
          // Clear tokens and redirect to login
          clearAuthTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      }

      throw new APIError(
        errorData?.detail || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    // Return empty object for 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return (isJSON ? await response.json() : await response.text()) as T;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    // Network or other errors
    console.error('Network Error:', error);
    throw new APIError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

/**
 * Get child auth token from localStorage (for child-initiated API calls)
 */
function getChildAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('child_token');
}

/**
 * Get circle user auth token from localStorage (for circle contact-initiated API calls)
 */
function getCircleAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('circle_token');
}

/**
 * Fetch API with child authentication token
 */
async function fetchAPIWithChildAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add child auth token
  const token = getChildAuthToken();
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  } else {
    throw new Error('Child not authenticated');
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type');
    const isJSON = contentType?.includes('application/json');

    if (!response.ok) {
      const errorData = isJSON ? await response.json() : { detail: response.statusText };
      throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`);
    }

    if (isJSON) {
      return await response.json();
    }
    return {} as T;
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch API with circle user authentication token
 */
async function fetchAPIWithCircleAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add circle auth token
  const token = getCircleAuthToken();
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  } else {
    throw new Error('Circle user not authenticated');
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type');
    const isJSON = contentType?.includes('application/json');

    if (!response.ok) {
      const errorData = isJSON ? await response.json() : { detail: response.statusText };
      throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`);
    }

    if (isJSON) {
      return await response.json();
    }
    return {} as T;
  } catch (error) {
    throw error;
  }
}

/**
 * Set auth tokens in localStorage
 */
function setAuthTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('access_token', accessToken);
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }
}

/**
 * Clear auth tokens from localStorage
 */
function clearAuthTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

// ============================================================================
// Authentication API
// ============================================================================

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  timezone: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  subscription_tier: string;
  subscription_status: string;
  created_at: string;
}

export interface UserProfileUpdate {
  timezone?: string;
  preferred_name?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

export const authAPI = {
  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await fetchAPI<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    setAuthTokens(response.access_token, response.refresh_token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  },

  /**
   * Login existing user
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await fetchAPI<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    setAuthTokens(response.access_token, response.refresh_token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await fetchAPI('/auth/logout', {
        method: 'POST',
      });
    } finally {
      clearAuthTokens();
    }
  },

  /**
   * Get current user
   */
  async me(): Promise<User> {
    return fetchAPI<User>('/auth/me');
  },

  /**
   * Refresh access token
   */
  async refresh(): Promise<{ access_token: string; token_type: string }> {
    const refreshToken = typeof window !== 'undefined'
      ? localStorage.getItem('refresh_token')
      : null;

    if (!refreshToken) {
      throw new APIError('No refresh token available', 401);
    }

    const response = await fetchAPI<{ access_token: string; token_type: string }>(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );

    setAuthTokens(response.access_token);
    return response;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!getAuthToken();
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Request a password reset email
   */
  async requestPasswordReset(email: string): Promise<void> {
    await fetchAPI('/auth/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await fetchAPI('/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  },
};

// ============================================================================
// Users API (Profile Management)
// ============================================================================

export const usersAPI = {
  /**
   * Get current user's profile
   */
  async getProfile(): Promise<UserProfile> {
    return fetchAPI<UserProfile>('/users/me/profile');
  },

  /**
   * Update current user's profile
   */
  async updateProfile(data: UserProfileUpdate): Promise<UserProfile> {
    return fetchAPI<UserProfile>('/users/me/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// ============================================================================
// Cases API
// ============================================================================

export interface Child {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
}

export interface CreateChildRequest {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
}

export interface CreateCaseRequest {
  case_name: string;
  other_parent_email: string;
  state: string;
  children?: CreateChildRequest[];
}

export interface CaseParticipant {
  id: string;
  role: string;
  parent_type: string;
  user_id: string;
  is_active?: boolean;
}

export interface Case {
  id: string;
  case_number?: string;
  case_name: string;
  state: string;
  status: string;
  invitation_token?: string;
  created_at: string;
  updated_at: string;
  participants?: CaseParticipant[];
  children?: Child[];
}

export const casesAPI = {
  /**
   * Create a new case
   */
  async create(data: CreateCaseRequest): Promise<Case> {
    return fetchAPI<Case>('/cases/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get all user's cases
   */
  async list(): Promise<Case[]> {
    return fetchAPI<Case[]>('/cases/');
  },

  /**
   * Get a specific case
   */
  async get(caseId: string): Promise<Case> {
    return fetchAPI<Case>(`/cases/${caseId}`);
  },

  /**
   * Accept case invitation
   */
  async acceptInvitation(caseId: string, invitationToken: string): Promise<Case> {
    return fetchAPI<Case>(`/cases/${caseId}/accept`, {
      method: 'POST',
      body: JSON.stringify({ invitation_token: invitationToken }),
    });
  },
};

// ============================================================================
// Messages API
// ============================================================================

export interface SendMessageRequest {
  case_id?: string;  // Court case context (legacy)
  family_file_id?: string;  // Family file context (preferred)
  agreement_id?: string;  // SharedCare Agreement context
  recipient_id: string;
  content: string;
  thread_id?: string;
  message_type?: string;
}

export interface Message {
  id: string;
  case_id?: string | null;
  agreement_id?: string | null;  // SharedCare Agreement context
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: string;
  sent_at: string;
  was_flagged: boolean;
  original_content?: string;
  thread_id?: string;
}

export interface ARIAAnalysisResponse {
  toxicity_level: 'green' | 'yellow' | 'orange' | 'red';
  toxicity_score: number;
  categories: string[];
  triggers: string[];
  explanation: string;
  suggestion: string | null;
  is_flagged: boolean;
  block_send?: boolean; // New field for blocking severe threats
}

export const messagesAPI = {
  /**
   * Send a message
   */
  async send(data: SendMessageRequest): Promise<Message> {
    return fetchAPI<Message>('/messages/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get messages for a case
   */
  async list(caseId: string, limit = 50, offset = 0): Promise<Message[]> {
    return fetchAPI<Message[]>(
      `/messages/case/${caseId}?limit=${limit}&offset=${offset}`
    );
  },

  /**
   * Get messages for a specific SharedCare Agreement
   * This is the primary way to get messages in the agreement-centric architecture
   */
  async listByAgreement(agreementId: string, limit = 50, offset = 0): Promise<Message[]> {
    return fetchAPI<Message[]>(
      `/messages/agreement/${agreementId}?limit=${limit}&offset=${offset}`
    );
  },

  /**
   * Analyze message before sending
   * Uses case-level or family file-level ARIA settings
   */
  async analyze(
    content: string,
    options: { caseId?: string; familyFileId?: string }
  ): Promise<ARIAAnalysisResponse> {
    const params = new URLSearchParams();
    params.append('content', content);
    if (options.caseId) {
      params.append('case_id', options.caseId);
    }
    if (options.familyFileId) {
      params.append('family_file_id', options.familyFileId);
    }
    return fetchAPI<ARIAAnalysisResponse>(
      `/messages/analyze?${params.toString()}`,
      {
        method: 'POST',
      }
    );
  },

  /**
   * Mark all messages as read for the current user in a family file
   */
  async markAsRead(familyFileId: string): Promise<{ marked_read: number }> {
    return fetchAPI<{ marked_read: number }>(
      `/messages/family-file/${familyFileId}/mark-read`,
      {
        method: 'POST',
      }
    );
  },
};

// ============================================================================
// Agreements API
// ============================================================================

export interface Agreement {
  id: string;
  case_id: string | null;  // Optional for Family File-based agreements
  family_file_id: string | null;  // Primary container for SharedCare Agreements
  title: string;
  version: number;
  agreement_version: 'v1' | 'v2_standard' | 'v2_lite';  // v1 = 18 sections, v2_standard = 7 sections
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'expired' | 'active';
  petitioner_approved: boolean;
  respondent_approved: boolean;
  approved_by_a?: string | null;
  approved_by_b?: string | null;
  approved_at_a?: string | null;
  approved_at_b?: string | null;
  effective_date?: string | null;
  pdf_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgreementSection {
  id: string;
  agreement_id: string;
  section_number: string;
  section_title: string;
  section_type: string;
  content: string;
  structured_data?: any;
  display_order: number;
  is_required: boolean;
  is_completed: boolean;
}

export interface CreateAgreementRequest {
  case_id: string;
  title: string;
  agreement_type?: string;
}

export interface UpdateSectionRequest {
  content?: any;
  section_number?: number | string;
  section_title?: string;
  structured_data?: Record<string, any>;
}

export const agreementsAPI = {
  /**
   * Create a new agreement for a case (legacy support)
   */
  async create(data: CreateAgreementRequest): Promise<Agreement> {
    const { case_id, ...agreementData } = data;
    return fetchAPI<Agreement>(`/cases/${case_id}/agreement`, {
      method: 'POST',
      body: JSON.stringify(agreementData),
    });
  },

  /**
   * Create a new SharedCare Agreement for a Family File
   */
  async createForFamilyFile(familyFileId: string, data: {
    title: string;
    agreement_type?: string;
    agreement_version?: 'v1' | 'v2_standard' | 'v2_lite';
  }): Promise<Agreement> {
    return fetchAPI<Agreement>(`/family-files/${familyFileId}/agreements`, {
      method: 'POST',
      body: JSON.stringify({
        title: data.title,
        agreement_type: data.agreement_type || 'shared_care',
        agreement_version: data.agreement_version || 'v2_standard',
      }),
    });
  },

  /**
   * Get all agreements for a Family File
   */
  async listForFamilyFile(familyFileId: string): Promise<{ items: Agreement[]; total: number }> {
    return fetchAPI<{ items: Agreement[]; total: number }>(`/family-files/${familyFileId}/agreements`);
  },

  /**
   * Get all agreements for a case
   */
  async list(caseId: string): Promise<Agreement[]> {
    try {
      // New endpoint returns all agreements as an array
      return await fetchAPI<Agreement[]>(`/cases/${caseId}/agreements`);
    } catch (error: any) {
      // If 404 (no agreements yet), return empty array
      if (error.status === 404) {
        return [];
      }
      throw error;
    }
  },

  /**
   * Get a specific agreement with sections
   */
  async get(agreementId: string): Promise<{ agreement: Agreement; sections: AgreementSection[]; completion_percentage: number }> {
    return fetchAPI<{ agreement: Agreement; sections: AgreementSection[]; completion_percentage: number }>(`/agreements/${agreementId}`);
  },

  /**
   * Get sections for an agreement (returns from agreement endpoint)
   */
  async getSections(agreementId: string): Promise<AgreementSection[]> {
    const data = await this.get(agreementId);
    return data.sections;
  },

  /**
   * Update a section
   */
  async updateSection(
    agreementId: string,
    sectionId: string,
    data: UpdateSectionRequest
  ): Promise<AgreementSection> {
    return fetchAPI<AgreementSection>(
      `/agreements/sections/${sectionId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Create a new section
   */
  async createSection(
    agreementId: string,
    sectionType: string,
    content: any
  ): Promise<AgreementSection> {
    return fetchAPI<AgreementSection>(
      `/agreements/sections`,
      {
        method: 'POST',
        body: JSON.stringify({
          agreement_id: agreementId,
          section_type: sectionType,
          content: content,
        }),
      }
    );
  },

  /**
   * Submit agreement for approval
   */
  async submit(agreementId: string): Promise<{ agreement: Agreement; sections: AgreementSection[]; completion_percentage: number }> {
    const result = await fetchAPI<Agreement>(`/agreements/${agreementId}/submit`, {
      method: 'POST',
    });
    // Get full data after submit
    return this.get(agreementId);
  },

  /**
   * Approve agreement
   */
  async approve(agreementId: string, notes?: string): Promise<{ agreement: Agreement; sections: AgreementSection[]; completion_percentage: number }> {
    const result = await fetchAPI<Agreement>(`/agreements/${agreementId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes: notes || null }),
    });
    // Approve returns just the agreement, so fetch full data
    return this.get(agreementId);
  },

  /**
   * Activate approved agreement
   */
  async activate(agreementId: string): Promise<{ agreement: Agreement; sections: AgreementSection[]; completion_percentage: number }> {
    const result = await fetchAPI<Agreement>(`/agreements/${agreementId}/activate`, {
      method: 'POST',
    });
    // Fetch full data after activation
    return this.get(agreementId);
  },

  /**
   * Deactivate active agreement
   */
  async deactivate(agreementId: string): Promise<{ agreement: Agreement; sections: AgreementSection[]; completion_percentage: number }> {
    const result = await fetchAPI<Agreement>(`/agreements/${agreementId}/deactivate`, {
      method: 'POST',
    });
    // Fetch full data after deactivation
    return this.get(agreementId);
  },

  /**
   * Delete agreement (only if draft)
   */
  async delete(agreementId: string): Promise<void> {
    await fetchAPI<void>(`/agreements/${agreementId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Generate PDF
   */
  async generatePDF(agreementId: string): Promise<Blob> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/agreements/${agreementId}/pdf`,
      {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new APIError('Failed to generate PDF', response.status);
    }

    return response.blob();
  },

  // ============================================================================
  // ARIA Conversational Agreement Building
  // ============================================================================

  /**
   * Send message to ARIA
   */
  async sendAriaMessage(agreementId: string, message: string): Promise<{
    response: string;
    conversation_id: string;
    message_count: number;
    is_finalized: boolean;
  }> {
    return fetchAPI(`/agreements/${agreementId}/aria/message`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  /**
   * Get ARIA conversation history
   */
  async getAriaConversation(agreementId: string): Promise<{
    conversation_id: string;
    messages: Array<{ role: string; content: string; timestamp: string }>;
    summary: string | null;
    extracted_data: any;
    is_finalized: boolean;
    message_count: number;
  }> {
    return fetchAPI(`/agreements/${agreementId}/aria/conversation`);
  },

  /**
   * Generate summary from ARIA conversation
   */
  async generateAriaSummary(agreementId: string): Promise<{
    summary: string;
    conversation_id: string;
  }> {
    return fetchAPI(`/agreements/${agreementId}/aria/summary`, {
      method: 'POST',
    });
  },

  /**
   * Extract structured data from ARIA conversation
   */
  async extractAriaData(agreementId: string): Promise<{
    extracted_data: any;
    conversation_id: string;
  }> {
    return fetchAPI(`/agreements/${agreementId}/aria/extract`, {
      method: 'POST',
    });
  },

  /**
   * Finalize ARIA conversation and create agreement sections
   */
  async finalizeAriaAgreement(agreementId: string): Promise<{ agreement: Agreement; sections: AgreementSection[]; completion_percentage: number }> {
    return fetchAPI(`/agreements/${agreementId}/aria/finalize`, {
      method: 'POST',
    });
  },

  /**
   * Get a quick AI-generated summary of an agreement for dashboard display
   */
  async getQuickSummary(agreementId: string): Promise<AgreementQuickSummary> {
    return fetchAPI<AgreementQuickSummary>(`/agreements/${agreementId}/quick-summary`);
  },
};

export interface AgreementQuickSummary {
  summary: string;
  key_points: string[];
  completion_percentage: number;
  status: string;
}

// ============================================================================
// Schedule API
// ============================================================================

export interface ScheduleEvent {
  id: string;
  case_id: string;
  event_type: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  custodial_parent_id: string;
  transition_from_id?: string;
  transition_to_id?: string;
  child_ids: string[];
  title: string;
  description?: string;
  location?: string;
  is_exchange: boolean;
  exchange_location?: string;
  grace_period_minutes: number;
  status: string;
  is_agreement_derived: boolean;
  is_modification: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  all_day: boolean;
  event_type: string;
  custodial_parent: string;
  is_exchange: boolean;
  location?: string;
  status: string;
  child_names: string[];
}

export interface CalendarResponse {
  case_id: string;
  events: CalendarEvent[];
  start_date: string;
  end_date: string;
}

export interface ExchangeCheckIn {
  id: string;
  event_id: string;
  user_id: string;
  parent_role: string;
  checked_in_at: string;
  scheduled_time: string;
  check_in_method: string;
  location_lat?: number;
  location_lng?: number;
  minutes_early_late: number;
  is_on_time: boolean;
  is_within_grace: boolean;
  notes?: string;
  children_present: string[];
  verified_by_other_parent: boolean;
  created_at: string;
}

export interface ComplianceMetrics {
  case_id: string;
  user_id?: string;
  period_days: number;
  total_exchanges: number;
  on_time_count: number;
  within_grace_count: number;
  late_count: number;
  no_show_count: number;
  on_time_percentage: number;
  compliance_score: number;
  average_minutes_late: number;
  trend: string;
}

export interface CreateCheckInRequest {
  event_id: string;
  parent_role: 'dropping_off' | 'picking_up';
  check_in_method: 'gps' | 'manual';
  location_lat?: number;
  location_lng?: number;
  notes?: string;
  children_present: string[];
}

// ============================================================================
// Schedule V2.0 - My Time Collections, Time Blocks, Events with Attendance
// ============================================================================

// My Time Collection Types
export interface MyTimeCollection {
  id: string;
  case_id: string;
  owner_id: string;
  name: string; // Privacy filtered for non-owners
  color: string; // Privacy filtered for non-owners
  is_default: boolean;
  is_active: boolean;
  display_order: number;
  is_owner: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCollectionRequest {
  case_id: string;
  name: string;
  color?: string;
  is_default?: boolean;
}

export interface UpdateCollectionRequest {
  name?: string;
  color?: string;
  is_default?: boolean;
}

// Time Block Types (PRIVATE - never shown to other parent)
export interface TimeBlock {
  id: string;
  collection_id: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  is_recurring: boolean;
  recurrence_pattern?: 'daily' | 'weekly';
  recurrence_days?: number[]; // 0=Mon, 6=Sun
  recurrence_end_date?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTimeBlockRequest {
  collection_id: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  is_recurring?: boolean;
  recurrence_pattern?: 'daily' | 'weekly';
  recurrence_days?: number[];
  recurrence_end_date?: string;
  notes?: string;
}

export interface UpdateTimeBlockRequest {
  title?: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
}

// Event Attendance Types
export interface EventAttendance {
  id: string;
  event_id: string;
  parent_id: string;
  invited_role: 'required' | 'optional' | 'not_invited';
  invited_at: string;
  rsvp_status: 'going' | 'not_going' | 'maybe' | 'no_response';
  rsvp_at?: string;
  rsvp_note?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateRSVPRequest {
  rsvp_status: 'going' | 'not_going' | 'maybe' | 'no_response';
  rsvp_note?: string;
}

// Event category type for specialized forms
export type EventCategory = 'general' | 'medical' | 'school' | 'sports' | 'exchange';

// Category-specific data types
export interface MedicalCategoryData {
  provider_name?: string;
  provider_specialty?: string;
  appointment_reason?: string;
  address?: string;
  phone?: string;
  follow_up_needed?: boolean;
  notes?: string;
}

export interface SchoolCategoryData {
  school_name?: string;
  activity_type?: string;
  teacher_name?: string;
  teacher_contact?: string;
  is_required?: boolean;
  notes?: string;
}

export interface SportsCategoryData {
  activity_name?: string;
  organization?: string;
  coach_name?: string;
  coach_contact?: string;
  venue?: string;
  equipment_needed?: string;
  cost?: number;
  notes?: string;
}

export interface ExchangeCategoryData {
  exchange_type?: string;
  exchange_location?: string;
  transition_from?: string;
  transition_to?: string;
  special_instructions?: string;
  items_to_bring?: string;
}

export type CategoryData = MedicalCategoryData | SchoolCategoryData | SportsCategoryData | ExchangeCategoryData | Record<string, unknown>;

// Updated Event Types (V2.0)
export interface EventV2 {
  id: string;
  case_id: string;  // Effective identifier (Case ID or Family File ID)
  family_file_id?: string;  // Family file context when applicable
  collection_id?: string;
  created_by?: string;
  title: string; // Privacy filtered
  description?: string; // Privacy filtered
  start_time: string;
  end_time: string;
  all_day: boolean;
  child_ids: string[];
  location?: string; // Privacy filtered based on location_shared
  visibility: 'private' | 'co_parent';
  status: string;
  is_owner: boolean;
  event_category: EventCategory; // V2: category-specific forms
  category_data?: CategoryData; // V2: category-specific fields
  my_attendance?: {
    invited_role: string;
    rsvp_status: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateEventRequest {
  collection_id: string;
  title: string;
  start_time: string;
  end_time: string;
  child_ids: string[];
  description?: string;
  location?: string;
  location_shared?: boolean;
  visibility?: 'private' | 'co_parent';
  all_day?: boolean;
  attendance_invites?: Array<{
    parent_id: string;
    invited_role: 'required' | 'optional';
  }>;
  event_category?: EventCategory; // V2: category-specific forms
  category_data?: CategoryData; // V2: category-specific fields
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  location_shared?: boolean;
  event_category?: EventCategory; // V2: category-specific forms
  category_data?: CategoryData; // V2: category-specific fields
}

// Conflict Detection Types
export interface ConflictWarning {
  type: string;
  severity: string;
  message: string;
  suggestion: string;
  can_proceed: boolean;
}

export interface ConflictCheckResponse {
  has_conflicts: boolean;
  conflicts: ConflictWarning[];
  can_proceed: boolean;
}

// Busy Period Type
export interface BusyPeriod {
  start_time: string;
  end_time: string;
  label: string;
  color: string;
  type: string;
  details_hidden: boolean;
}

// Exchange instance for calendar display
export interface ExchangeInstanceForCalendar {
  id: string;
  exchange_id: string;
  exchange_type: 'pickup' | 'dropoff' | 'both';
  title: string;
  scheduled_time: string;
  duration_minutes: number;
  location?: string;
  status: string;
  is_owner: boolean;
}

// Court Event for Calendar
export interface CourtEventForCalendar {
  id: string;
  event_type: string;
  title: string;
  description?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  virtual_link?: string;
  is_mandatory: boolean;
  shared_notes?: string;
  is_court_event: boolean;
  // RSVP fields
  my_rsvp_status?: string;
  my_rsvp_required?: boolean;
  other_parent_rsvp_status?: string;
}

// Court Event with full RSVP details (from /schedule/cases/{case_id}/court-events)
export interface CourtEventWithRSVP {
  id: string;
  case_id: string;
  event_type: string;
  title: string;
  description?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  virtual_link?: string;
  is_mandatory: boolean;
  status: string;
  shared_notes?: string;
  my_rsvp_status?: string;
  my_rsvp_required: boolean;
  my_rsvp_notes?: string;
  other_parent_rsvp_status?: string;
}

export interface CourtEventsListResponse {
  events: CourtEventWithRSVP[];
  total: number;
}

export interface CourtEventRSVPRequest {
  status: 'attending' | 'not_attending' | 'maybe';
  notes?: string;
}

export interface CourtEventRSVPResponse {
  success: boolean;
  message: string;
  event_id: string;
  rsvp_status: string;
  rsvp_at: string;
}

// Calendar Data Response (V2.0)
export interface CalendarDataV2 {
  case_id: string;
  events: EventV2[];
  exchanges: ExchangeInstanceForCalendar[];
  court_events: CourtEventForCalendar[];
  busy_periods: BusyPeriod[];
  my_collections: MyTimeCollection[];
  start_date: string;
  end_date: string;
}

// ============================================================================
// Schedule V2.0 API Functions
// ============================================================================

export const collectionsAPI = {
  /**
   * Create a My Time collection
   */
  async create(data: CreateCollectionRequest): Promise<MyTimeCollection> {
    return fetchAPI<MyTimeCollection>('/collections/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get a collection by ID (privacy filtered)
   */
  async get(collectionId: string): Promise<MyTimeCollection> {
    return fetchAPI<MyTimeCollection>(`/collections/${collectionId}`);
  },

  /**
   * List all collections for a case
   */
  async listForCase(caseId: string, includeOtherParent = true): Promise<MyTimeCollection[]> {
    return fetchAPI<MyTimeCollection[]>(
      `/collections/cases/${caseId}?include_other_parent=${includeOtherParent}`
    );
  },

  /**
   * Update a collection (owner only)
   */
  async update(collectionId: string, data: UpdateCollectionRequest): Promise<MyTimeCollection> {
    return fetchAPI<MyTimeCollection>(`/collections/${collectionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a collection (owner only)
   */
  async delete(collectionId: string): Promise<void> {
    return fetchAPI<void>(`/collections/${collectionId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get default collection for a case
   */
  async getDefault(caseId: string): Promise<MyTimeCollection> {
    return fetchAPI<MyTimeCollection>(`/collections/cases/${caseId}/default`);
  },
};

export const timeBlocksAPI = {
  /**
   * Create a time block
   */
  async create(data: CreateTimeBlockRequest): Promise<TimeBlock> {
    return fetchAPI<TimeBlock>('/time-blocks/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get a time block by ID
   */
  async get(blockId: string): Promise<TimeBlock> {
    return fetchAPI<TimeBlock>(`/time-blocks/${blockId}`);
  },

  /**
   * List time blocks in a collection
   */
  async listForCollection(collectionId: string): Promise<TimeBlock[]> {
    return fetchAPI<TimeBlock[]>(`/time-blocks/collections/${collectionId}`);
  },

  /**
   * Update a time block
   */
  async update(blockId: string, data: UpdateTimeBlockRequest): Promise<TimeBlock> {
    return fetchAPI<TimeBlock>(`/time-blocks/${blockId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a time block
   */
  async delete(blockId: string): Promise<void> {
    return fetchAPI<void>(`/time-blocks/${blockId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Check for scheduling conflicts (ARIA)
   */
  async checkConflicts(
    caseId: string,
    startTime: string,
    endTime: string
  ): Promise<ConflictCheckResponse> {
    return fetchAPI<ConflictCheckResponse>('/time-blocks/check-conflicts', {
      method: 'POST',
      body: JSON.stringify({ case_id: caseId, start_time: startTime, end_time: endTime }),
    });
  },

  /**
   * Get busy periods for calendar display
   */
  async getBusyPeriods(
    caseId: string,
    otherParentId: string,
    startDate: string,
    endDate: string
  ): Promise<BusyPeriod[]> {
    const params = new URLSearchParams({
      other_parent_id: otherParentId,
      start_date: startDate,
      end_date: endDate,
    });
    return fetchAPI<BusyPeriod[]>(`/time-blocks/cases/${caseId}/busy-periods?${params.toString()}`);
  },
};

export const eventsAPI = {
  /**
   * Create an event
   */
  async create(data: CreateEventRequest): Promise<EventV2> {
    return fetchAPI<EventV2>('/events/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get an event by ID (privacy filtered)
   */
  async get(eventId: string): Promise<EventV2> {
    return fetchAPI<EventV2>(`/events/${eventId}`);
  },

  /**
   * List events for a case
   */
  async listForCase(caseId: string, startDate?: string, endDate?: string): Promise<EventV2[]> {
    let url = `/events/cases/${caseId}`;
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    return fetchAPI<EventV2[]>(url);
  },

  /**
   * Update an event (creator only)
   */
  async update(eventId: string, data: UpdateEventRequest): Promise<EventV2> {
    return fetchAPI<EventV2>(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete (cancel) an event
   */
  async delete(eventId: string): Promise<void> {
    return fetchAPI<void>(`/events/${eventId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Update RSVP for an event
   */
  async updateRSVP(eventId: string, data: UpdateRSVPRequest): Promise<EventAttendance> {
    return fetchAPI<EventAttendance>(`/events/${eventId}/rsvp`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get attendance for an event
   */
  async getAttendance(eventId: string): Promise<EventAttendance[]> {
    return fetchAPI<EventAttendance[]>(`/events/${eventId}/attendance`);
  },

  /**
   * Check for event conflicts
   */
  async checkConflicts(
    caseId: string,
    startTime: string,
    endTime: string
  ): Promise<ConflictCheckResponse> {
    const params = new URLSearchParams({
      case_id: caseId,
      start_time: startTime,
      end_time: endTime,
    });
    return fetchAPI<ConflictCheckResponse>(`/events/check-conflicts?${params.toString()}`, {
      method: 'POST',
    });
  },
};

export const calendarAPI = {
  /**
   * Get calendar data for a case (V2.0 - includes events, busy periods, collections)
   */
  async getData(
    caseId: string,
    startDate: string,
    endDate: string,
    includeBusyPeriods = true
  ): Promise<CalendarDataV2> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      include_busy_periods: includeBusyPeriods.toString(),
    });
    return fetchAPI<CalendarDataV2>(`/calendar/cases/${caseId}?${params.toString()}`);
  },
};

// ==================== COURT SETTINGS TYPES ====================

export interface CourtSettingsPublic {
  gps_checkins_required: boolean;
  supervised_exchange_required: boolean;
  aria_enforcement_locked: boolean;
  in_app_communication_only: boolean;
  agreement_edits_locked: boolean;
  active_controls: string[];
}

export const courtSettingsAPI = {
  /**
   * Get court settings for a case (parent-facing, public view)
   */
  async getSettings(caseId: string): Promise<CourtSettingsPublic> {
    return fetchAPI<CourtSettingsPublic>(`/court/settings/case/${caseId}/public`);
  },
};

// ============================================================================
// Case Exports API - Court-ready documentation packages
// ============================================================================

export type PackageType = 'investigation' | 'court';
export type ClaimType = 'schedule_violation' | 'financial_non_compliance' | 'communication_concern' | 'safety_concern' | 'other';
export type RedactionLevel = 'none' | 'standard' | 'enhanced';
export type ExportStatus = 'generating' | 'completed' | 'failed' | 'downloaded';

export interface CaseExport {
  id: string;
  case_id: string;
  export_number: string;
  package_type: PackageType;
  claim_type?: ClaimType;
  claim_description?: string;
  date_range_start: string;
  date_range_end: string;
  sections_included: string[];
  redaction_level: RedactionLevel;
  message_content_redacted: boolean;
  file_url?: string;
  file_size_bytes?: number;
  page_count?: number;
  content_hash?: string;
  chain_hash?: string;
  watermark_text?: string;
  verification_url?: string;
  evidence_counts?: Record<string, number>;
  status: ExportStatus;
  error_message?: string;
  download_count: number;
  last_downloaded_at?: string;
  generated_at?: string;
  generation_time_seconds?: number;
  expires_at?: string;
  is_permanent: boolean;
  created_at: string;
  sections?: ExportSection[];
}

export interface ExportSection {
  id: string;
  section_type: string;
  section_order: number;
  section_title: string;
  evidence_count: number;
  page_start?: number;
  page_end?: number;
  generation_time_ms?: number;
}

export interface CreateExportRequest {
  case_id: string;
  package_type: PackageType;
  date_start: string;
  date_end: string;
  claim_type?: ClaimType;
  claim_description?: string;
  redaction_level?: RedactionLevel;
  sections?: string[];
  message_content_redacted?: boolean;
}

export interface ExportListResponse {
  exports: CaseExport[];
  total: number;
}

export interface ExportVerification {
  export_number: string;
  is_valid: boolean;
  is_expired: boolean;
  content_hash?: string;
  chain_hash?: string;
  package_type: string;
  date_range_start: string;
  date_range_end: string;
  page_count?: number;
  generated_at?: string;
  generator_type: string;
  verification_timestamp: string;
  message: string;
}

export const exportsAPI = {
  /**
   * Create a new case export package
   */
  async create(data: CreateExportRequest): Promise<CaseExport> {
    return fetchAPI<CaseExport>('/exports/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * List exports for a case
   */
  async listForCase(
    caseId: string,
    options?: { limit?: number; offset?: number; status?: ExportStatus }
  ): Promise<ExportListResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));
    if (options?.status) params.append('status_filter', options.status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<ExportListResponse>(`/exports/case/${caseId}${query}`);
  },

  /**
   * Get export details
   */
  async get(exportId: string, includeSections = false): Promise<CaseExport> {
    const query = includeSections ? '?include_sections=true' : '';
    return fetchAPI<CaseExport>(`/exports/${exportId}${query}`);
  },

  /**
   * Download export PDF
   */
  async download(exportId: string): Promise<Blob> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/exports/${exportId}/download`,
      {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Download failed' }));
      throw new APIError(error.detail || 'Failed to download export', response.status);
    }

    return response.blob();
  },

  /**
   * Verify export authenticity (public - no auth required)
   */
  async verify(exportNumber: string): Promise<ExportVerification> {
    return fetchAPI<ExportVerification>(`/exports/verify/${exportNumber}`);
  },

  /**
   * Delete an export
   */
  async delete(exportId: string): Promise<void> {
    return fetchAPI<void>(`/exports/${exportId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get available section types
   */
  getSectionTypes(): Array<{ value: string; label: string; description: string }> {
    return [
      { value: 'agreement_overview', label: 'Agreement Overview', description: 'Case parties, children, and agreement terms' },
      { value: 'compliance_summary', label: 'Compliance Summary', description: 'Side-by-side parent comparison' },
      { value: 'parenting_time', label: 'Parenting Time Report', description: 'Exchange records and timeliness' },
      { value: 'financial_compliance', label: 'Financial Compliance', description: 'Payment and expense tracking' },
      { value: 'communication_compliance', label: 'Communication Compliance', description: 'Message statistics and patterns' },
      { value: 'intervention_log', label: 'Intervention Log', description: 'ARIA interventions (redacted)' },
      { value: 'parent_impact', label: 'Parent Impact Summary', description: '90-day behavior analysis' },
      { value: 'chain_of_custody', label: 'Chain of Custody', description: 'Data integrity verification' },
    ];
  },

  /**
   * Get claim types for investigation packages
   */
  getClaimTypes(): Array<{ value: ClaimType; label: string }> {
    return [
      { value: 'schedule_violation', label: 'Schedule Violation' },
      { value: 'financial_non_compliance', label: 'Financial Non-Compliance' },
      { value: 'communication_concern', label: 'Communication Concern' },
      { value: 'safety_concern', label: 'Safety Concern' },
      { value: 'other', label: 'Other' },
    ];
  },
};

export const scheduleAPI = {
  /**
   * Get calendar data for a case
   */
  async getCalendar(
    caseId: string,
    startDate: string,
    endDate: string
  ): Promise<CalendarResponse> {
    return fetchAPI<CalendarResponse>(
      `/schedule/cases/${caseId}/calendar?start_date=${startDate}&end_date=${endDate}`
    );
  },

  /**
   * Get events for a case
   */
  async getEvents(caseId: string, startDate?: string, endDate?: string): Promise<ScheduleEvent[]> {
    let url = `/schedule/cases/${caseId}/events`;
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    return fetchAPI<ScheduleEvent[]>(url);
  },

  /**
   * Create exchange check-in
   */
  async checkIn(data: CreateCheckInRequest): Promise<ExchangeCheckIn> {
    return fetchAPI<ExchangeCheckIn>('/schedule/check-ins', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get check-ins for an event
   */
  async getCheckIns(eventId: string): Promise<ExchangeCheckIn[]> {
    return fetchAPI<ExchangeCheckIn[]>(`/schedule/events/${eventId}/check-ins`);
  },

  /**
   * Get compliance metrics
   */
  async getCompliance(caseId: string, userId?: string, days = 30): Promise<ComplianceMetrics> {
    let url = `/schedule/cases/${caseId}/compliance?days=${days}`;
    if (userId) url += `&user_id=${userId}`;
    return fetchAPI<ComplianceMetrics>(url);
  },
};

// ==================== CUSTODY EXCHANGE TYPES ====================

export type ExchangeType = 'pickup' | 'dropoff' | 'both';
export type RecurrencePattern = 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type ExchangeStatus = 'active' | 'paused' | 'cancelled';
export type InstanceStatus = 'scheduled' | 'completed' | 'missed' | 'cancelled' | 'rescheduled';

export interface CustodyExchange {
  id: string;
  case_id: string;
  created_by: string;
  exchange_type: ExchangeType;
  title?: string;
  from_parent_id?: string;
  to_parent_id?: string;
  child_ids: string[];
  pickup_child_ids: string[];
  dropoff_child_ids: string[];
  location?: string;
  location_notes?: string;
  scheduled_time: string;
  duration_minutes: number;
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_days?: number[];  // 0=Sun, 1=Mon, ..., 6=Sat
  recurrence_end_date?: string;
  items_to_bring?: string;
  special_instructions?: string;
  notes_visible_to_coparent: boolean;
  status: ExchangeStatus;
  is_owner: boolean;
  next_occurrence?: string;
  family_file_id?: string;
  // Viewer-perspective fields (adjusted based on who is viewing)
  viewer_role?: 'pickup' | 'dropoff' | 'both';
  viewer_pickup_child_ids: string[];
  viewer_dropoff_child_ids: string[];
  other_parent_name?: string;
  other_parent_id?: string;
  // Silent Handoff settings
  location_lat?: number;
  location_lng?: number;
  geofence_radius_meters: number;
  check_in_window_before_minutes: number;
  check_in_window_after_minutes: number;
  silent_handoff_enabled: boolean;
  qr_confirmation_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustodyExchangeInstance {
  id: string;
  exchange_id: string;
  scheduled_time: string;
  status: InstanceStatus;
  from_parent_checked_in: boolean;
  from_parent_check_in_time?: string;
  to_parent_checked_in: boolean;
  to_parent_check_in_time?: string;
  completed_at?: string;
  notes?: string;
  override_location?: string;
  override_time?: string;
  // Silent Handoff - GPS verification data
  from_parent_check_in_lat?: number;
  from_parent_check_in_lng?: number;
  from_parent_device_accuracy?: number;
  from_parent_distance_meters?: number;
  from_parent_in_geofence?: boolean;
  to_parent_check_in_lat?: number;
  to_parent_check_in_lng?: number;
  to_parent_device_accuracy?: number;
  to_parent_distance_meters?: number;
  to_parent_in_geofence?: boolean;
  // QR confirmation
  qr_confirmed_at?: string;
  // Handoff outcome
  handoff_outcome?: 'completed' | 'missed' | 'one_party_present' | 'disputed' | 'pending_qr' | 'pending';
  // Exchange window
  window_start?: string;
  window_end?: string;
  auto_closed: boolean;
  exchange?: CustodyExchange;
  created_at: string;
  updated_at: string;
}

export interface CreateCustodyExchangeRequest {
  case_id: string;
  exchange_type: ExchangeType;
  title?: string;
  from_parent_id?: string;
  to_parent_id?: string;
  child_ids?: string[];
  pickup_child_ids?: string[];
  dropoff_child_ids?: string[];
  location?: string;
  location_notes?: string;
  scheduled_time: string;
  duration_minutes?: number;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_days?: number[];
  recurrence_end_date?: string;
  items_to_bring?: string;
  special_instructions?: string;
  notes_visible_to_coparent?: boolean;
  // Silent Handoff settings
  location_lat?: number;
  location_lng?: number;
  geofence_radius_meters?: number;
  check_in_window_before_minutes?: number;
  check_in_window_after_minutes?: number;
  silent_handoff_enabled?: boolean;
  qr_confirmation_required?: boolean;
}

export interface UpdateCustodyExchangeRequest {
  exchange_type?: ExchangeType;
  title?: string;
  from_parent_id?: string;
  to_parent_id?: string;
  child_ids?: string[];
  pickup_child_ids?: string[];
  dropoff_child_ids?: string[];
  location?: string;
  location_notes?: string;
  scheduled_time?: string;
  duration_minutes?: number;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_days?: number[];
  recurrence_end_date?: string;
  items_to_bring?: string;
  special_instructions?: string;
  notes_visible_to_coparent?: boolean;
  status?: ExchangeStatus;
}

// ==================== CUSTODY EXCHANGE API ====================

export const exchangesAPI = {
  /**
   * Create a new custody exchange (pickup/dropoff)
   */
  async create(data: CreateCustodyExchangeRequest): Promise<CustodyExchange> {
    return fetchAPI<CustodyExchange>('/exchanges/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get a custody exchange by ID
   */
  async get(exchangeId: string): Promise<CustodyExchange> {
    return fetchAPI<CustodyExchange>(`/exchanges/${exchangeId}`);
  },

  /**
   * List all custody exchanges for a case
   */
  async listForCase(caseId: string, status?: ExchangeStatus): Promise<CustodyExchange[]> {
    let url = `/exchanges/case/${caseId}`;
    if (status) url += `?status=${status}`;
    return fetchAPI<CustodyExchange[]>(url);
  },

  /**
   * Get upcoming exchange instances for a case
   */
  async getUpcoming(
    caseId: string,
    startDate?: string,
    endDate?: string,
    limit = 20
  ): Promise<CustodyExchangeInstance[]> {
    let url = `/exchanges/case/${caseId}/upcoming?limit=${limit}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    return fetchAPI<CustodyExchangeInstance[]>(url);
  },

  /**
   * Update a custody exchange
   */
  async update(exchangeId: string, data: UpdateCustodyExchangeRequest): Promise<CustodyExchange> {
    return fetchAPI<CustodyExchange>(`/exchanges/${exchangeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a custody exchange
   */
  async delete(exchangeId: string): Promise<void> {
    return fetchAPI<void>(`/exchanges/${exchangeId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Check in for an exchange instance
   */
  async checkIn(instanceId: string, notes?: string): Promise<CustodyExchangeInstance> {
    return fetchAPI<CustodyExchangeInstance>(`/exchanges/instances/${instanceId}/check-in`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  /**
   * Cancel an exchange instance
   */
  async cancelInstance(instanceId: string, notes?: string): Promise<CustodyExchangeInstance> {
    let url = `/exchanges/instances/${instanceId}/cancel`;
    if (notes) url += `?notes=${encodeURIComponent(notes)}`;
    return fetchAPI<CustodyExchangeInstance>(url, {
      method: 'POST',
    });
  },

  // ==================== SILENT HANDOFF METHODS ====================

  /**
   * GPS-verified check-in for Silent Handoff
   * Privacy: GPS is captured only at this moment, not continuously tracked
   */
  async checkInWithGPS(
    instanceId: string,
    data: SilentHandoffCheckInRequest
  ): Promise<CustodyExchangeInstance> {
    return fetchAPI<CustodyExchangeInstance>(`/exchanges/instances/${instanceId}/check-in/gps`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get exchange window status
   */
  async getWindowStatus(instanceId: string): Promise<WindowStatusResponse> {
    return fetchAPI<WindowStatusResponse>(`/exchanges/instances/${instanceId}/window-status`);
  },

  /**
   * Get QR token for mutual confirmation
   */
  async getQRToken(instanceId: string): Promise<QRTokenResponse> {
    return fetchAPI<QRTokenResponse>(`/exchanges/instances/${instanceId}/qr-token`);
  },

  /**
   * Confirm exchange via QR code scan
   */
  async confirmQR(instanceId: string, token: string): Promise<CustodyExchangeInstance> {
    return fetchAPI<CustodyExchangeInstance>(`/exchanges/instances/${instanceId}/confirm-qr`, {
      method: 'POST',
      body: JSON.stringify({ confirmation_token: token }),
    });
  },

  /**
   * Geocode an address to GPS coordinates
   */
  async geocodeAddress(address: string): Promise<GeocodeAddressResponse> {
    return fetchAPI<GeocodeAddressResponse>('/exchanges/geocode', {
      method: 'POST',
      body: JSON.stringify({ address }),
    });
  },
};

// ==================== SILENT HANDOFF TYPES ====================

export interface SilentHandoffCheckInRequest {
  latitude: number;
  longitude: number;
  device_accuracy_meters: number;
  notes?: string;
}

export interface WindowStatusResponse {
  instance_id: string;
  scheduled_time: string;
  window_start: string;
  window_end: string;
  is_within_window: boolean;
  is_before_window: boolean;
  is_after_window: boolean;
  minutes_until_window: number;
  minutes_remaining: number;
}

export interface QRTokenResponse {
  token: string;
  instance_id: string;
}

export interface GeocodeAddressResponse {
  latitude: number;
  longitude: number;
  formatted_address: string;
  accuracy: 'exact' | 'approximate' | 'fallback';
}

// ============================================================================
// ClearFund API - Purpose-Locked Financial Obligations
// ============================================================================

// Obligation Types
export type ObligationStatus = 'open' | 'partially_funded' | 'funded' | 'pending_verification' | 'verified' | 'completed' | 'expired' | 'cancelled';
export type ObligationCategory = 'medical' | 'education' | 'sports' | 'device' | 'camp' | 'clothing' | 'transportation' | 'child_support' | 'extracurricular' | 'childcare' | 'other';

export interface Obligation {
  id: string;
  case_id: string;
  source_type: 'court_order' | 'agreement' | 'request';
  source_id?: string;
  purpose_category: ObligationCategory;
  title: string;
  description?: string;
  child_ids: string[];
  total_amount: string;
  petitioner_share: string;
  respondent_share: string;
  petitioner_percentage: number;
  due_date?: string;
  status: ObligationStatus;
  amount_funded: string;
  amount_spent: string;
  amount_verified: string;
  verification_required: boolean;
  receipt_required: boolean;
  receipt_deadline_hours: number;
  is_recurring: boolean;
  created_by: string;
  funded_at?: string;
  verified_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  is_fully_funded: boolean;
  funding_percentage: number;
  is_overdue: boolean;
}

export interface ObligationListResponse {
  items: Obligation[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface CreateObligationRequest {
  case_id: string;
  source_type?: 'court_order' | 'agreement' | 'request';
  source_id?: string;
  purpose_category: ObligationCategory;
  title: string;
  description?: string;
  child_ids?: string[];
  total_amount: number | string;  // Can be number or string for Decimal compatibility
  petitioner_percentage?: number;
  due_date?: string;
  verification_required?: boolean;
  receipt_required?: boolean;
  notes?: string;
}

export interface FundingRecord {
  parent_id: string;
  amount_required: string;
  amount_funded: string;
  is_fully_funded: boolean;
  funded_at?: string;
}

export interface FundingStatus {
  obligation_id: string;
  total_amount: string;
  amount_funded: string;
  funding_percentage: number;
  is_fully_funded: boolean;
  petitioner_funding?: FundingRecord;
  respondent_funding?: FundingRecord;
}

export interface RecordFundingRequest {
  amount: number;
  stripe_payment_intent_id?: string;
  payment_method?: string;
  notes?: string;
}

export interface AttestationRequest {
  attestation_text: string;
  purpose_declaration: string;
  receipt_commitment?: boolean;
  purpose_commitment?: boolean;
  legal_acknowledgment: boolean;
}

export interface Attestation {
  id: string;
  obligation_id: string;
  attesting_parent_id: string;
  attestation_text: string;
  purpose_declaration: string;
  receipt_commitment: boolean;
  purpose_commitment: boolean;
  legal_acknowledgment: boolean;
  attested_at: string;
  created_at: string;
}

export interface VerificationArtifact {
  id: string;
  obligation_id: string;
  artifact_type: 'transaction' | 'receipt' | 'vendor_confirmation' | 'manual';
  stripe_transaction_id?: string;
  vendor_name?: string;
  vendor_mcc?: string;
  transaction_date?: string;
  amount_verified: string;
  receipt_url?: string;
  receipt_file_name?: string;
  verified_by?: string;
  verification_method?: string;
  verification_notes?: string;
  verified_at: string;
  created_at: string;
}

export interface RecordVerificationRequest {
  artifact_type: 'transaction' | 'receipt' | 'vendor_confirmation' | 'manual';
  vendor_name?: string;
  vendor_mcc?: string;
  transaction_date?: string;
  amount_verified: number;
  stripe_transaction_id?: string;
  verification_notes?: string;
}

export interface LedgerEntry {
  id: string;
  case_id: string;
  entry_type: string;
  obligor_id: string;
  obligee_id: string;
  amount: string;
  running_balance: string;
  obligation_id?: string;
  description: string;
  effective_date: string;
  credit_source?: string;
  fifo_applied_to?: string;
  is_reconciled: boolean;
  created_at: string;
}

export interface LedgerListResponse {
  items: LedgerEntry[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface BalanceSummary {
  case_id: string;
  petitioner_id: string;
  respondent_id: string;
  petitioner_balance: string;
  respondent_balance: string;
  petitioner_owes_respondent: string;
  respondent_owes_petitioner: string;
  net_balance: string;
  total_obligations_open: number;
  total_obligations_funded: number;
  total_obligations_completed: number;
  total_this_month: string;
  total_overdue: string;
}

export interface ObligationMetrics {
  total_open: number;
  total_pending_funding: number;
  total_funded: number;
  total_verified: number;
  total_completed: number;
  total_overdue: number;
  total_cancelled: number;
}

export interface ClearFundAnalytics {
  case_id: string;
  balance_summary: BalanceSummary;
  obligation_metrics: ObligationMetrics;
  monthly_totals: Array<{ month: string; total_amount: string; by_category: Record<string, string> }>;
  recent_activity: Obligation[];
}

// ============================================================================
// Wallet Types (Stripe Connect Integration)
// ============================================================================

export interface Wallet {
  id: string;
  owner_type: 'parent' | 'child';
  owner_id: string;
  family_file_id: string | null;
  wallet_type: 'parent_connect' | 'child_ledger';
  display_name: string | null;
  stripe_account_id: string | null;
  stripe_account_status: string | null;
  bank_last_four: string | null;
  bank_name: string | null;
  onboarding_completed: boolean;
  onboarding_started_at: string | null;
  onboarding_completed_at: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  is_active: boolean;
  suspended_at: string | null;
  suspension_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface WalletBalance {
  available: string;
  pending: string;
  total: string;
  currency: string;
}

// Backend response includes balance fields directly on wallet object
export interface WalletWithBalance extends Wallet {
  current_balance: string;
  available_balance: string;
  is_ready_for_payments: boolean;
  is_ready_for_payouts: boolean;
  // Legacy nested balance for backwards compatibility
  balance?: WalletBalance;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  transaction_type: 'deposit' | 'withdrawal' | 'payment' | 'payout' | 'contribution' | 'refund';
  amount: string;
  currency: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_transfer_id: string | null;
  stripe_payout_id: string | null;
  source_type: string | null;
  source_id: string | null;
  destination_type: string | null;
  destination_id: string | null;
  obligation_id: string | null;
  payout_id: string | null;
  fee_amount: string;
  net_amount: string;
  balance_after: string | null;
  completed_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface WalletTransactionListResponse {
  items: WalletTransaction[];
  total: number;
  page: number;
  page_size: number;
}

export interface DepositRequest {
  amount: number;
  payment_method_id: string;
  payment_method: 'card' | 'ach';
}

export interface DepositResponse {
  transaction_id: string;
  amount: string;
  status: string;
  payment_intent_id: string;
  client_secret: string | null;
  requires_action: boolean;
  message: string;
}

export interface ObligationPaymentRequest {
  obligation_id: string;
  amount: number;
  payment_source: 'wallet' | 'card';
  payment_method_id?: string;
}

export interface ObligationPaymentResponse {
  id: string;
  obligation_id: string;
  payer_id: string;
  amount: string;
  payment_source: string;
  status: string;
  wallet_transaction_id?: string | null;
  stripe_payment_intent_id?: string | null;
  client_secret?: string | null;
  requires_action: boolean;
  created_at: string;
  completed_at?: string | null;
  // Legacy fields for backwards compatibility
  funding_id?: string;
  obligation_status?: string;
  is_fully_funded?: boolean;
  payout_initiated?: boolean;
  message?: string;
}

export interface ChildContributionRequest {
  amount: number;
  payment_method_id: string;
  contributor_name: string;
  contributor_email: string;
  purpose?: string;
  message?: string;
}

export interface ChildContributionResponse {
  contribution_id: string;
  amount: string;
  child_name: string;
  status: string;
  payment_intent_id: string;
  client_secret: string | null;
  requires_action: boolean;
  message: string;
}

export interface OnboardingResponse {
  onboarding_url: string;
  expires_at: string;
  wallet_id: string;
}

export interface WalletAnalytics {
  wallet_id: string;
  total_deposits: string;
  total_payments: string;
  total_payouts: string;
  transaction_count: number;
  avg_transaction_amount: string;
  last_activity_at: string | null;
}

export interface Payout {
  id: string;
  obligation_id: string;
  recipient_wallet_id: string;
  recipient_user_id: string;
  gross_amount: string;
  fee_amount: string;
  net_amount: string;
  stripe_transfer_id: string | null;
  stripe_payout_id: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requires_approval: boolean;
  approved_at: string | null;
  approved_by: string | null;
  initiated_at: string;
  processing_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  estimated_arrival: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayoutListResponse {
  items: Payout[];
  total: number;
  page: number;
  page_size: number;
}

export interface ChildWallet {
  wallet_id: string;
  child_id: string;
  child_name: string;
  balance: string;  // Decimal as string
  total_received: string;  // Decimal as string
  contribution_count: number;
  recent_contributions?: ChildContribution[];
}

export interface ChildContribution {
  id: string;
  amount: string;
  contributor_name: string;
  purpose: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

export const clearfundAPI = {
  // Obligations

  /**
   * Create a new obligation
   */
  async createObligation(data: CreateObligationRequest): Promise<Obligation> {
    return fetchAPI<Obligation>('/clearfund/obligations/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * List obligations for a case
   */
  async listObligations(
    caseId: string,
    agreementIdOrOptions?: string | {
      status?: string;
      category?: string;
      is_overdue?: boolean;
      page?: number;
      page_size?: number;
      agreement_id?: string;
    }
  ): Promise<ObligationListResponse> {
    const params = new URLSearchParams({ case_id: caseId });

    // Handle both old signature (caseId, options) and new signature (caseId, agreementId)
    if (typeof agreementIdOrOptions === 'string') {
      // New usage: listObligations(familyFileId, agreementId)
      params.append('agreement_id', agreementIdOrOptions);
    } else if (agreementIdOrOptions) {
      // Old usage: listObligations(caseId, options)
      const options = agreementIdOrOptions;
      if (options.status) params.append('status', options.status);
      if (options.category) params.append('category', options.category);
      if (options.is_overdue !== undefined) params.append('is_overdue', String(options.is_overdue));
      if (options.page) params.append('page', String(options.page));
      if (options.page_size) params.append('page_size', String(options.page_size));
      if (options.agreement_id) params.append('agreement_id', options.agreement_id);
    }
    return fetchAPI<ObligationListResponse>(`/clearfund/obligations/?${params.toString()}`);
  },

  /**
   * Get obligation details
   */
  async getObligation(obligationId: string): Promise<Obligation> {
    return fetchAPI<Obligation>(`/clearfund/obligations/${obligationId}`);
  },

  /**
   * Cancel an obligation
   */
  async cancelObligation(obligationId: string, reason: string): Promise<Obligation> {
    return fetchAPI<Obligation>(`/clearfund/obligations/${obligationId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Complete an obligation
   */
  async completeObligation(obligationId: string): Promise<Obligation> {
    return fetchAPI<Obligation>(`/clearfund/obligations/${obligationId}/complete`, {
      method: 'POST',
    });
  },

  // Funding

  /**
   * Record funding for an obligation
   */
  async recordFunding(obligationId: string, data: RecordFundingRequest): Promise<{
    funding_id: string;
    amount_funded: string;
    amount_required: string;
    is_fully_funded: boolean;
    message: string;
  }> {
    return fetchAPI(`/clearfund/obligations/${obligationId}/fund`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get funding status for an obligation
   */
  async getFundingStatus(obligationId: string): Promise<FundingStatus> {
    return fetchAPI<FundingStatus>(`/clearfund/obligations/${obligationId}/funding`);
  },

  // Attestation

  /**
   * Create attestation for an obligation
   */
  async createAttestation(obligationId: string, data: AttestationRequest): Promise<Attestation> {
    return fetchAPI<Attestation>(`/clearfund/obligations/${obligationId}/attest`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get attestation for an obligation
   */
  async getAttestation(obligationId: string): Promise<Attestation | null> {
    return fetchAPI<Attestation | null>(`/clearfund/obligations/${obligationId}/attestation`);
  },

  // Verification

  /**
   * Record verification artifact
   */
  async recordVerification(obligationId: string, data: RecordVerificationRequest): Promise<VerificationArtifact> {
    return fetchAPI<VerificationArtifact>(`/clearfund/obligations/${obligationId}/verify`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Upload receipt for verification
   */
  async uploadReceipt(
    obligationId: string,
    receiptUrl: string,
    fileName: string,
    amount: number,
    vendorName?: string
  ): Promise<VerificationArtifact> {
    const params = new URLSearchParams({
      receipt_url: receiptUrl,
      receipt_file_name: fileName,
      receipt_file_type: 'image/jpeg',
      amount: String(amount),
    });
    if (vendorName) params.append('vendor_name', vendorName);
    return fetchAPI<VerificationArtifact>(`/clearfund/obligations/${obligationId}/receipt?${params.toString()}`, {
      method: 'POST',
    });
  },

  /**
   * Upload receipt file for verification
   */
  async uploadReceiptFile(
    obligationId: string,
    file: File,
    amount: number,
    vendorName?: string
  ): Promise<VerificationArtifact> {
    const formData = new FormData();
    formData.append('file', file);

    const params = new URLSearchParams({
      amount: String(amount),
    });
    if (vendorName) params.append('vendor_name', vendorName);

    const token = localStorage.getItem('access_token');
    const response = await fetch(
      `${API_URL}/clearfund/obligations/${obligationId}/receipt/upload?${params.toString()}`,
      {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Failed to upload receipt');
    }

    return response.json();
  },

  /**
   * List verification artifacts for an obligation
   */
  async listArtifacts(obligationId: string): Promise<VerificationArtifact[]> {
    return fetchAPI<VerificationArtifact[]>(`/clearfund/obligations/${obligationId}/artifacts`);
  },

  // Ledger

  /**
   * Get ledger entries for a case
   */
  async getLedger(
    caseId: string,
    page = 1,
    pageSize = 50
  ): Promise<LedgerListResponse> {
    return fetchAPI<LedgerListResponse>(
      `/clearfund/ledger/?case_id=${caseId}&page=${page}&page_size=${pageSize}`
    );
  },

  /**
   * Get balance summary for a case
   */
  async getBalance(caseId: string): Promise<BalanceSummary> {
    return fetchAPI<BalanceSummary>(`/clearfund/ledger/balance?case_id=${caseId}`);
  },

  /**
   * Record a prepayment
   */
  async recordPrepayment(
    caseId: string,
    amount: number,
    description: string,
    stripePaymentIntentId?: string
  ): Promise<{
    ledger_id: string;
    amount: string;
    message: string;
  }> {
    return fetchAPI(`/clearfund/ledger/prepayment?case_id=${caseId}`, {
      method: 'POST',
      body: JSON.stringify({
        amount,
        description,
        stripe_payment_intent_id: stripePaymentIntentId,
      }),
    });
  },

  // Analytics

  /**
   * Get ClearFund analytics for a case
   */
  async getAnalytics(caseId: string): Promise<ClearFundAnalytics> {
    return fetchAPI<ClearFundAnalytics>(`/clearfund/analytics/?case_id=${caseId}`);
  },

  /**
   * Get obligation metrics
   */
  async getMetrics(caseId: string): Promise<ObligationMetrics> {
    return fetchAPI<ObligationMetrics>(`/clearfund/analytics/metrics?case_id=${caseId}`);
  },
};

// =============================================================================
// Court Access API - For managing court professional access to cases
// =============================================================================

export type CourtRole =
  | 'court_clerk'
  | 'gal'
  | 'attorney_petitioner'
  | 'attorney_respondent'
  | 'mediator'
  | 'judge';

export type AccessScope =
  | 'agreement'
  | 'schedule'
  | 'checkins'
  | 'messages'
  | 'financials'
  | 'compliance'
  | 'interventions';

export type GrantStatus =
  | 'pending_verification'
  | 'pending_consent'
  | 'active'
  | 'expired'
  | 'revoked';

export interface CourtProfessional {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: CourtRole;
  organization?: string;
  title?: string;
  credentials?: Record<string, string>;
  is_verified: boolean;
  verified_at?: string;
  mfa_enabled: boolean;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface CourtAccessGrant {
  id: string;
  case_id: string;
  professional_id: string;
  role: string;
  access_scope: string[];
  data_start_date?: string;
  data_end_date?: string;
  authorization_type: string;
  authorization_reference?: string;
  status: GrantStatus;
  granted_at: string;
  activated_at?: string;
  expires_at: string;
  days_remaining: number;
  is_active: boolean;
  petitioner_approved: boolean;
  respondent_approved: boolean;
  access_count: number;
  last_accessed_at?: string;
  created_at: string;
}

export interface CreateAccessGrantRequest {
  case_id: string;
  professional_email: string;
  professional_name: string;
  role: CourtRole;
  access_scope?: AccessScope[];
  data_start_date?: string;
  data_end_date?: string;
  authorization_type: 'court_order' | 'parental_consent' | 'appointment' | 'representation';
  authorization_reference?: string;
  duration_days?: number;
  notes?: string;
}

export interface CreateProfessionalRequest {
  email: string;
  full_name: string;
  phone?: string;
  role: CourtRole;
  organization?: string;
  title?: string;
  credentials?: Record<string, string>;
}

export interface CourtAccessSummary {
  case_id: string;
  has_court_settings: boolean;
  active_controls: string[];
  active_grants_count: number;
  upcoming_court_events: number;
  unread_court_messages: number;
  investigation_mode: boolean;
}

export const courtAccessAPI = {
  /**
   * Create or get a court professional by email
   */
  async createProfessional(data: CreateProfessionalRequest): Promise<CourtProfessional> {
    return fetchAPI<CourtProfessional>('/court/professionals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get a court professional by ID
   */
  async getProfessional(professionalId: string): Promise<CourtProfessional> {
    return fetchAPI<CourtProfessional>(`/court/professionals/${professionalId}`);
  },

  /**
   * Invite a court professional to access a case (creates grant)
   * Note: This first creates the professional if they don't exist, then creates the grant
   */
  async inviteProfessional(data: CreateAccessGrantRequest): Promise<CourtAccessGrant> {
    // First, try to create the professional (will return existing if email exists)
    let professional: CourtProfessional;
    try {
      professional = await fetchAPI<CourtProfessional>('/court/professionals', {
        method: 'POST',
        body: JSON.stringify({
          email: data.professional_email,
          full_name: data.professional_name,
          role: data.role,
        }),
      });
    } catch {
      // Professional may already exist, try to fetch by creating again (idempotent)
      // For MVP, we'll just proceed
      throw new Error('Could not create or find court professional');
    }

    // Then create the access grant
    return fetchAPI<CourtAccessGrant>('/court/access/request', {
      method: 'POST',
      body: JSON.stringify({
        case_id: data.case_id,
        role: data.role,
        access_scope: data.access_scope || ['agreement', 'schedule', 'compliance'],
        data_start_date: data.data_start_date,
        data_end_date: data.data_end_date,
        authorization_type: data.authorization_type,
        authorization_reference: data.authorization_reference,
        duration_days: data.duration_days,
        notes: data.notes,
      }),
    });
  },

  /**
   * List access grants for a case
   */
  async listGrants(caseId: string, activeOnly = true): Promise<CourtAccessGrant[]> {
    return fetchAPI<CourtAccessGrant[]>(
      `/court/access/grants?case_id=${caseId}&active_only=${activeOnly}`
    );
  },

  /**
   * Get a specific access grant
   */
  async getGrant(grantId: string): Promise<CourtAccessGrant> {
    return fetchAPI<CourtAccessGrant>(`/court/access/grants/${grantId}`);
  },

  /**
   * Approve or reject an access grant (as parent)
   */
  async approveGrant(grantId: string, approved: boolean, notes?: string): Promise<CourtAccessGrant> {
    return fetchAPI<CourtAccessGrant>(`/court/access/grants/${grantId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved, notes }),
    });
  },

  /**
   * Revoke an access grant
   */
  async revokeGrant(grantId: string, reason: string): Promise<CourtAccessGrant> {
    return fetchAPI<CourtAccessGrant>(`/court/access/grants/${grantId}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Get court access summary for a case
   */
  async getSummary(caseId: string): Promise<CourtAccessSummary> {
    return fetchAPI<CourtAccessSummary>(`/court/summary/case/${caseId}`);
  },
};

// ============================================================================
// KidsCubbie API - High-Value Item Tracking
// ============================================================================

export type ItemCategory = 'electronics' | 'school' | 'sports' | 'medical' | 'musical' | 'other';
export type ItemLocation = 'parent_a' | 'parent_b' | 'child_traveling';
export type ItemCondition = 'excellent' | 'good' | 'minor_wear' | 'needs_repair';

export interface CubbieItem {
  id: string;
  child_id: string;
  case_id: string;
  name: string;
  description?: string;
  category: ItemCategory;
  estimated_value?: string;
  purchase_date?: string;
  serial_number?: string;
  notes?: string;
  photo_url?: string;
  added_by: string;
  is_active: boolean;
  current_location: ItemLocation;
  last_location_update?: string;
  created_at: string;
  updated_at: string;
}

export interface CubbieItemListResponse {
  child_id: string;
  child_name: string;
  items: CubbieItem[];
  total_value: string;
  active_count: number;
}

export interface CreateCubbieItemRequest {
  child_id: string;
  name: string;
  description?: string;
  category?: ItemCategory;
  estimated_value?: number;
  purchase_date?: string;
  serial_number?: string;
  notes?: string;
  current_location?: ItemLocation;
}

export interface UpdateCubbieItemRequest {
  name?: string;
  description?: string;
  category?: ItemCategory;
  estimated_value?: number;
  purchase_date?: string;
  serial_number?: string;
  notes?: string;
  current_location?: ItemLocation;
  is_active?: boolean;
}

export interface CubbieExchangeItem {
  id: string;
  exchange_id: string;
  cubbie_item_id: string;
  item_name: string;
  item_photo_url?: string;
  sent_by: string;
  sent_at: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  condition_sent?: ItemCondition;
  condition_received?: ItemCondition;
  condition_notes?: string;
  photo_sent_url?: string;
  photo_received_url?: string;
  is_disputed: boolean;
  dispute_notes?: string;
  dispute_resolved: boolean;
  dispute_resolved_at?: string;
  created_at: string;
}

export interface ExchangeItemsResponse {
  exchange_id: string;
  items: CubbieExchangeItem[];
  pending_acknowledgment: number;
  disputed_count: number;
}

export interface AddItemsToExchangeRequest {
  cubbie_item_ids: string[];
  condition_sent?: ItemCondition;
}

export interface AcknowledgeItemRequest {
  condition_received?: ItemCondition;
  condition_notes?: string;
}

export interface DisputeItemRequest {
  dispute_notes: string;
}

export interface ChildPhoto {
  id: string;
  child_id: string;
  uploaded_by: string;
  photo_url: string;
  thumbnail_url?: string;
  caption?: string;
  is_profile_photo: boolean;
  taken_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateChildPhotoRequest {
  photo_url: string;
  thumbnail_url?: string;
  caption?: string;
  is_profile_photo?: boolean;
  taken_at?: string;
}

export const cubbieAPI = {
  // === CUBBIE ITEMS ===

  /**
   * Create a new cubbie item
   */
  async createItem(data: CreateCubbieItemRequest): Promise<CubbieItem> {
    return fetchAPI<CubbieItem>('/cubbie/items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get a cubbie item by ID
   */
  async getItem(itemId: string): Promise<CubbieItem> {
    return fetchAPI<CubbieItem>(`/cubbie/items/${itemId}`);
  },

  /**
   * List all cubbie items for a child
   */
  async listForChild(childId: string, includeInactive = false): Promise<CubbieItemListResponse> {
    return fetchAPI<CubbieItemListResponse>(
      `/cubbie/items/child/${childId}?include_inactive=${includeInactive}`
    );
  },

  /**
   * List all cubbie items for a case (all children)
   */
  async listForCase(caseId: string, includeInactive = false): Promise<{
    children: CubbieItemListResponse[];
  }> {
    return fetchAPI(`/cubbie/items/case/${caseId}?include_inactive=${includeInactive}`);
  },

  /**
   * Update a cubbie item
   */
  async updateItem(itemId: string, data: UpdateCubbieItemRequest): Promise<CubbieItem> {
    return fetchAPI<CubbieItem>(`/cubbie/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete (deactivate) a cubbie item
   */
  async deleteItem(itemId: string): Promise<void> {
    return fetchAPI<void>(`/cubbie/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Update item photo URL
   */
  async updateItemPhoto(itemId: string, photoUrl: string): Promise<CubbieItem> {
    return fetchAPI<CubbieItem>(`/cubbie/items/${itemId}/photo?photo_url=${encodeURIComponent(photoUrl)}`, {
      method: 'POST',
    });
  },

  /**
   * Upload item photo file
   */
  async uploadItemPhoto(itemId: string, file: File): Promise<CubbieItem> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('access_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${apiUrl}/cubbie/items/${itemId}/photo/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Failed to upload photo');
    }

    return response.json();
  },

  // === EXCHANGE ITEMS ===

  /**
   * Add items to an exchange
   */
  async addItemsToExchange(exchangeId: string, data: AddItemsToExchangeRequest): Promise<CubbieExchangeItem[]> {
    return fetchAPI<CubbieExchangeItem[]>(`/cubbie/exchange/${exchangeId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get items for an exchange
   */
  async getExchangeItems(exchangeId: string): Promise<ExchangeItemsResponse> {
    return fetchAPI<ExchangeItemsResponse>(`/cubbie/exchange/${exchangeId}/items`);
  },

  /**
   * Acknowledge receipt of an item
   */
  async acknowledgeItem(
    exchangeId: string,
    itemId: string,
    data: AcknowledgeItemRequest
  ): Promise<CubbieExchangeItem> {
    return fetchAPI<CubbieExchangeItem>(`/cubbie/exchange/${exchangeId}/items/${itemId}/acknowledge`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Report condition of an item
   */
  async reportCondition(
    exchangeId: string,
    itemId: string,
    data: AcknowledgeItemRequest
  ): Promise<CubbieExchangeItem> {
    return fetchAPI<CubbieExchangeItem>(`/cubbie/exchange/${exchangeId}/items/${itemId}/condition`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Dispute an item
   */
  async disputeItem(
    exchangeId: string,
    itemId: string,
    data: DisputeItemRequest
  ): Promise<CubbieExchangeItem> {
    return fetchAPI<CubbieExchangeItem>(`/cubbie/exchange/${exchangeId}/items/${itemId}/dispute`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // === CHILD PHOTOS ===

  /**
   * Get photos for a child
   */
  async getChildPhotos(childId: string): Promise<ChildPhoto[]> {
    return fetchAPI<ChildPhoto[]>(`/cubbie/children/${childId}/photos`);
  },

  /**
   * Add a photo to a child's gallery
   */
  async addChildPhoto(childId: string, data: CreateChildPhotoRequest): Promise<ChildPhoto> {
    return fetchAPI<ChildPhoto>(`/cubbie/children/${childId}/photos`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Set a photo as profile photo
   */
  async setProfilePhoto(childId: string, photoId: string): Promise<ChildPhoto> {
    return fetchAPI<ChildPhoto>(`/cubbie/children/${childId}/photos/${photoId}/profile`, {
      method: 'PUT',
    });
  },
};

// ============================================================================
// Child Profiles API - Dual-Parent Approval Workflow
// ============================================================================

export type ChildProfileStatus = 'pending_approval' | 'active' | 'archived';

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface ChildProfileBasic {
  id: string;
  case_id: string;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  date_of_birth: string;
  age: number;
  gender?: string;
  photo_url?: string;
  status: ChildProfileStatus;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  // Included for list display
  school_name?: string;
  grade_level?: string;
}

export interface ChildProfile extends ChildProfileBasic {
  // Approval workflow
  approved_by_a?: string;
  approved_by_b?: string;
  approved_at_a?: string;
  approved_at_b?: string;

  // Basic info
  middle_name?: string;
  birth_city?: string;
  birth_state?: string;
  gender?: string;
  pronouns?: string;

  // Special needs
  has_special_needs: boolean;
  special_needs_notes?: string;

  // Medical
  allergies?: string;
  medications?: string;
  medical_conditions?: string;
  blood_type?: string;
  pediatrician_name?: string;
  pediatrician_phone?: string;
  dentist_name?: string;
  dentist_phone?: string;
  therapist_name?: string;
  therapist_phone?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;

  // Education
  school_name?: string;
  school_phone?: string;
  school_address?: string;
  grade_level?: string;
  teacher_name?: string;
  teacher_email?: string;
  has_iep: boolean;
  has_504: boolean;
  has_504_plan: boolean;
  education_notes?: string;

  // Preferences
  favorite_foods?: string;
  food_dislikes?: string;
  favorite_activities?: string;
  comfort_items?: string;
  bedtime_routine?: string;

  // Sizes
  clothing_size?: string;
  shoe_size?: string;
  sizes_updated_at?: string;

  // Personality
  temperament_notes?: string;
  fears_anxieties?: string;
  calming_strategies?: string;

  // Emergency contacts
  emergency_contacts?: EmergencyContact[];

  // Attribution
  field_contributors?: Record<string, string>;

  // Court restrictions
  court_restricted_fields?: string[];

  // Computed
  full_name: string;
  display_name: string;
  updated_at: string;
}

export interface ChildListResponse {
  case_id: string;
  children: ChildProfileBasic[];
  pending_approval_count: number;
  active_count: number;
}

export interface ChildApprovalResponse {
  id: string;
  status: ChildProfileStatus;
  approved_by_a?: string;
  approved_by_b?: string;
  approved_at_a?: string;
  approved_at_b?: string;
  message: string;
}

export interface CreateChildProfileRequest {
  case_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  gender?: string;
  preferred_name?: string;
}

export interface UpdateChildBasicRequest {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  preferred_name?: string;
  date_of_birth?: string;
  gender?: string;
  pronouns?: string;
}

export interface UpdateChildMedicalRequest {
  allergies?: string;
  medications?: string;
  medical_conditions?: string;
  blood_type?: string;
  has_special_needs?: boolean;
  special_needs_notes?: string;
  pediatrician_name?: string;
  pediatrician_phone?: string;
  dentist_name?: string;
  dentist_phone?: string;
  therapist_name?: string;
  therapist_phone?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
}

export interface UpdateChildEducationRequest {
  school_name?: string;
  school_phone?: string;
  school_address?: string;
  grade_level?: string;
  teacher_name?: string;
  teacher_email?: string;
  has_iep?: boolean;
  has_504?: boolean;
  has_504_plan?: boolean;
  education_notes?: string;
}

export interface UpdateChildPreferencesRequest {
  favorite_foods?: string;
  food_dislikes?: string;
  favorite_activities?: string;
  comfort_items?: string;
  bedtime_routine?: string;
  clothing_size?: string;
  shoe_size?: string;
  temperament_notes?: string;
  fears_anxieties?: string;
  calming_strategies?: string;
}

export interface UpdateChildEmergencyContactsRequest {
  emergency_contacts: EmergencyContact[];
}

export const childrenAPI = {
  /**
   * Create a new child profile (starts pending approval)
   */
  async create(data: CreateChildProfileRequest): Promise<ChildProfile> {
    return fetchAPI<ChildProfile>('/children/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get a child profile by ID
   */
  async get(childId: string): Promise<ChildProfile> {
    return fetchAPI<ChildProfile>(`/children/${childId}`);
  },

  /**
   * List all children for a case
   */
  async listForCase(
    caseId: string,
    includePending = true,
    includeArchived = false
  ): Promise<ChildListResponse> {
    const params = new URLSearchParams({
      include_pending: String(includePending),
      include_archived: String(includeArchived),
    });
    return fetchAPI<ChildListResponse>(`/children/case/${caseId}?${params.toString()}`);
  },

  /**
   * Approve a pending child profile
   */
  async approve(childId: string): Promise<ChildApprovalResponse> {
    return fetchAPI<ChildApprovalResponse>(`/children/${childId}/approve`, {
      method: 'POST',
    });
  },

  /**
   * Update basic information
   */
  async updateBasic(childId: string, data: UpdateChildBasicRequest): Promise<ChildProfile> {
    return fetchAPI<ChildProfile>(`/children/${childId}/basic`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update medical information
   */
  async updateMedical(childId: string, data: UpdateChildMedicalRequest): Promise<ChildProfile> {
    return fetchAPI<ChildProfile>(`/children/${childId}/medical`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update education information
   */
  async updateEducation(childId: string, data: UpdateChildEducationRequest): Promise<ChildProfile> {
    return fetchAPI<ChildProfile>(`/children/${childId}/education`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update preferences
   */
  async updatePreferences(childId: string, data: UpdateChildPreferencesRequest): Promise<ChildProfile> {
    return fetchAPI<ChildProfile>(`/children/${childId}/preferences`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update emergency contacts
   */
  async updateEmergencyContacts(
    childId: string,
    data: UpdateChildEmergencyContactsRequest
  ): Promise<ChildProfile> {
    return fetchAPI<ChildProfile>(`/children/${childId}/emergency-contacts`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update profile photo
   */
  async updatePhoto(childId: string, photoUrl: string): Promise<ChildProfile> {
    return fetchAPI<ChildProfile>(`/children/${childId}/photo?photo_url=${encodeURIComponent(photoUrl)}`, {
      method: 'PUT',
    });
  },

  /**
   * Upload profile photo file
   */
  async uploadPhoto(childId: string, file: File): Promise<ChildProfile> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/children/${childId}/photo/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Failed to upload photo');
    }

    return response.json();
  },

  /**
   * Archive a child profile
   */
  async archive(childId: string): Promise<ChildProfile> {
    return fetchAPI<ChildProfile>(`/children/${childId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get child counts for a case
   */
  async getCounts(caseId: string): Promise<{
    pending_approval: number;
    active: number;
    archived: number;
    total: number;
  }> {
    return fetchAPI(`/children/case/${caseId}/counts`);
  },
};

// ============================================================================
// Court Form Workflow API
// ============================================================================

export type CourtFormType = 'FL-300' | 'FL-311' | 'FL-320' | 'FL-340' | 'FL-341' | 'FL-342';
export type CourtFormStatus = 'draft' | 'pending_submission' | 'submitted' | 'under_court_review' | 'approved' | 'rejected' | 'resubmit_required' | 'served' | 'entered' | 'withdrawn';
export type HearingType = 'rfo' | 'status_conference' | 'trial' | 'mediation' | 'settlement_conference' | 'motion' | 'other';
export type HearingOutcome = 'pending' | 'continued' | 'settled' | 'order_issued' | 'dismissed' | 'default';
export type ServiceType = 'personal' | 'substituted' | 'mail' | 'electronic' | 'notice_acknowledge';

export interface CourtFormSubmission {
  id: string;
  case_id: string;
  parent_id: string | null;
  form_type: CourtFormType;
  form_state: string;
  status: CourtFormStatus;
  status_history: Array<{
    from_status: string;
    to_status: string;
    changed_at: string;
    changed_by: string | null;
    notes: string | null;
  }> | null;
  submission_source: string;
  submitted_at: string | null;
  approved_at: string | null;
  form_data: Record<string, any> | null;
  pdf_url: string | null;
  aria_assisted: boolean;
  aria_conversation_id: string | null;
  responds_to_form_id: string | null;
  parent_form_id: string | null;
  hearing_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  court_notes: string | null;
  rejection_reason: string | null;
  resubmission_issues: string[] | null;
  extraction_confidence: number | null;
  requires_review: boolean;
  custody_order_id: string | null;
  created_at: string;
  updated_at: string;
  // Edit permission fields
  edits_allowed: boolean;
  edits_allowed_by: string | null;
  edits_allowed_at: string | null;
  edits_allowed_notes: string | null;
  edits_allowed_sections: string[] | null;
}

export interface CourtHearing {
  id: string;
  case_id: string;
  hearing_type: HearingType;
  title: string;
  description: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  court_name: string | null;
  department: string | null;
  courtroom: string | null;
  judge_name: string | null;
  outcome: HearingOutcome;
  outcome_notes: string | null;
  petitioner_attended: boolean | null;
  respondent_attended: boolean | null;
  related_fl300_id: string | null;
  resulting_fl340_id: string | null;
  notifications_sent: boolean;
  notification_sent_at: string | null;
  reminder_sent: boolean;
  is_continuation: boolean;
  continued_from_id: string | null;
  continued_to_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseFormProgress {
  case_id: string;
  activation_status: string;
  forms_workflow_started_at: string | null;
  forms_workflow_completed_at: string | null;
  fl300_status: string | null;
  fl300_submission_id: string | null;
  fl311_status: string | null;
  fl311_submission_id: string | null;
  fl320_status: string | null;
  fl320_submission_id: string | null;
  fl340_status: string | null;
  fl340_submission_id: string | null;
  respondent_notified: boolean;
  respondent_on_platform: boolean;
  proof_of_service_filed: boolean;
  hearing_scheduled: boolean;
  hearing_id: string | null;
  hearing_date: string | null;
  progress_percent: number;
  next_action: string | null;
  next_action_by: string | null;
  // Computed helper properties
  total_forms: number;
  pending_forms: number;
  approved_forms: number;
  has_fl300: boolean;
  has_fl300_approved: boolean;
  has_fl311: boolean;
  has_fl320: boolean;
  has_fl340: boolean;
  fl300_id: string | null;
}

export interface ProofOfService {
  id: string;
  case_id: string;
  served_form_id: string;
  service_type: ServiceType;
  served_to_name: string;
  served_at_address: string | null;
  served_on_date: string;
  served_by_name: string;
  served_by_relationship: string | null;
  proof_pdf_url: string | null;
  filed_with_court: boolean;
  filed_at: string | null;
  accepted_by_court: boolean;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
}

// Request types
export interface FL300FormData {
  court_name?: string;
  court_county?: string;
  case_number?: string;
  petitioner_name: string;
  petitioner_address?: string;
  petitioner_phone?: string;
  petitioner_email?: string;
  respondent_name: string;
  respondent_address?: string;
  respondent_phone?: string;
  respondent_email?: string;
  request_child_custody: boolean;
  request_child_visitation: boolean;
  request_child_support: boolean;
  request_spousal_support: boolean;
  request_property_orders: boolean;
  request_attorney_fees: boolean;
  request_other?: string;
  request_temporary_orders: boolean;
  reason_for_temporary?: string;
  facts_supporting_request?: string;
  declaration_text?: string;
  signature_date?: string;
}

export interface FL311FormData {
  children: Array<{ name: string; birth_date?: string; age?: number }>;
  physical_custody: string;
  legal_custody: string;
  visitation_type: string;
  visitation_schedule?: Record<string, any>;
  holiday_schedule?: Array<Record<string, any>>;
  transportation_arrangements?: Record<string, any>;
  supervised_visitation?: Record<string, any>;
  abuse_allegations: boolean;
  substance_abuse_allegations: boolean;
  travel_restrictions?: Record<string, any>;
  other_provisions?: string;
}

export interface FL320FormData {
  responds_to_fl300_id: string;
  custody_response: 'agree' | 'disagree' | 'counter_propose';
  custody_counter_proposal?: string;
  visitation_response: 'agree' | 'disagree' | 'counter_propose';
  visitation_counter_proposal?: string;
  support_response?: string;
  support_counter_proposal?: string;
  additional_facts?: string;
  declaration_text?: string;
  signature_date?: string;
}

export interface CreateFormRequest {
  form_data?: Record<string, any>;
  aria_assisted?: boolean;
}

export interface CreateFL320Request {
  responds_to_form_id: string;
  form_data?: FL320FormData;
  aria_assisted?: boolean;
}

export interface CreateHearingRequest {
  case_id: string;
  hearing_type: HearingType;
  title: string;
  scheduled_date: string;
  scheduled_time?: string;
  court_name?: string;
  department?: string;
  courtroom?: string;
  judge_name?: string;
  related_fl300_id?: string;
  description?: string;
  notes?: string;
}

export interface CreateProofOfServiceRequest {
  case_id: string;
  served_form_id: string;
  service_type: ServiceType;
  served_to_name: string;
  served_at_address?: string;
  served_on_date: string;
  served_by_name: string;
  served_by_relationship?: string;
  notes?: string;
}

export const courtFormsAPI = {
  // ==================== Parent Form Submission ====================

  /**
   * Start FL-300 (Request for Order) submission
   */
  async startFL300(caseId: string, data?: CreateFormRequest): Promise<CourtFormSubmission> {
    return fetchAPI<CourtFormSubmission>(`/court/forms/fl300/start/${caseId}`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  /**
   * Start FL-311 (Child Custody Application) submission
   */
  async startFL311(caseId: string, data?: CreateFormRequest): Promise<CourtFormSubmission> {
    return fetchAPI<CourtFormSubmission>(`/court/forms/fl311/start/${caseId}`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  /**
   * Start FL-320 (Responsive Declaration) submission
   */
  async startFL320(caseId: string, data: CreateFL320Request): Promise<CourtFormSubmission> {
    return fetchAPI<CourtFormSubmission>(`/court/forms/fl320/start/${caseId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update form data (only in draft status)
   */
  async updateForm(submissionId: string, formData: Record<string, any>): Promise<CourtFormSubmission> {
    return fetchAPI<CourtFormSubmission>(`/court/forms/${submissionId}`, {
      method: 'PUT',
      body: JSON.stringify({ form_data: formData }),
    });
  },

  /**
   * Submit form for court review
   */
  async submitForm(submissionId: string): Promise<CourtFormSubmission> {
    return fetchAPI<CourtFormSubmission>(`/court/forms/${submissionId}/submit`, {
      method: 'POST',
    });
  },

  /**
   * Resubmit form after making corrections (when edits were allowed by court)
   */
  async resubmitForm(submissionId: string): Promise<CourtFormSubmission> {
    return fetchAPI<CourtFormSubmission>(`/court/forms/${submissionId}/resubmit`, {
      method: 'POST',
    });
  },

  /**
   * Get a specific form submission
   */
  async getForm(submissionId: string): Promise<CourtFormSubmission> {
    return fetchAPI<CourtFormSubmission>(`/court/forms/${submissionId}`);
  },

  /**
   * List all forms for a case
   */
  async listCaseForms(caseId: string, formType?: CourtFormType): Promise<{
    case_id: string;
    forms: CourtFormSubmission[];
    total: number;
  }> {
    const query = formType ? `?form_type=${formType}` : '';
    return fetchAPI(`/court/forms/case/${caseId}${query}`);
  },

  /**
   * Get workflow progress for a case
   */
  async getCaseProgress(caseId: string): Promise<CaseFormProgress> {
    return fetchAPI<CaseFormProgress>(`/court/forms/case/${caseId}/progress`);
  },

  // ==================== Respondent Verification ====================

  /**
   * Verify respondent access code
   */
  async verifyRespondentAccess(caseId: string, accessCode: string): Promise<{
    verified: boolean;
    case_id: string | null;
    message: string;
  }> {
    return fetchAPI(`/court/forms/respondent/verify`, {
      method: 'POST',
      body: JSON.stringify({ case_id: caseId, access_code: accessCode }),
    });
  },

  // ==================== Proof of Service ====================

  /**
   * File proof of service
   */
  async fileProofOfService(data: CreateProofOfServiceRequest): Promise<ProofOfService> {
    return fetchAPI<ProofOfService>(`/court/forms/proof-of-service`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // ==================== Court Staff Actions ====================

  /**
   * Approve a submitted form (court staff)
   */
  async approveForm(submissionId: string, notes?: string): Promise<CourtFormSubmission> {
    return fetchAPI<CourtFormSubmission>(`/court/forms/${submissionId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  /**
   * Reject a submitted form (court staff)
   */
  async rejectForm(submissionId: string, reason: string): Promise<CourtFormSubmission> {
    return fetchAPI<CourtFormSubmission>(`/court/forms/${submissionId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Request form resubmission (court staff)
   */
  async requestResubmission(submissionId: string, issues: string[], notes?: string): Promise<CourtFormSubmission> {
    return fetchAPI<CourtFormSubmission>(`/court/forms/${submissionId}/request-resubmission`, {
      method: 'POST',
      body: JSON.stringify({ issues, notes }),
    });
  },

  /**
   * Mark FL-300 as served (court staff)
   */
  async markServed(submissionId: string, serviceType: ServiceType, servedOnDate: string, notes?: string): Promise<CourtFormSubmission> {
    return fetchAPI<CourtFormSubmission>(`/court/forms/${submissionId}/mark-served`, {
      method: 'POST',
      body: JSON.stringify({ service_type: serviceType, served_on_date: servedOnDate, notes }),
    });
  },

  // ==================== Hearing Management ====================

  /**
   * Schedule a court hearing
   */
  async scheduleHearing(data: CreateHearingRequest): Promise<CourtHearing> {
    return fetchAPI<CourtHearing>(`/court/forms/hearings`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get a hearing
   */
  async getHearing(hearingId: string): Promise<CourtHearing> {
    return fetchAPI<CourtHearing>(`/court/forms/hearings/${hearingId}`);
  },

  /**
   * Update a hearing
   */
  async updateHearing(hearingId: string, data: Partial<CreateHearingRequest>): Promise<CourtHearing> {
    return fetchAPI<CourtHearing>(`/court/forms/hearings/${hearingId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Record hearing outcome
   */
  async recordHearingOutcome(
    hearingId: string,
    outcome: HearingOutcome,
    petitionerAttended: boolean,
    respondentAttended: boolean,
    outcomeNotes?: string
  ): Promise<CourtHearing> {
    return fetchAPI<CourtHearing>(`/court/forms/hearings/${hearingId}/record-outcome`, {
      method: 'POST',
      body: JSON.stringify({
        outcome,
        petitioner_attended: petitionerAttended,
        respondent_attended: respondentAttended,
        outcome_notes: outcomeNotes,
      }),
    });
  },

  /**
   * Continue hearing to new date
   */
  async continueHearing(hearingId: string, newDate: string, newTime?: string, reason?: string): Promise<CourtHearing> {
    return fetchAPI<CourtHearing>(`/court/forms/hearings/${hearingId}/continue`, {
      method: 'POST',
      body: JSON.stringify({ new_date: newDate, new_time: newTime, reason }),
    });
  },

  // ==================== Court Order Entry ====================

  /**
   * Enter FL-340 order (court staff)
   */
  async enterFL340(caseId: string, hearingId: string, formData: Record<string, any>): Promise<CourtFormSubmission> {
    return fetchAPI<CourtFormSubmission>(`/court/forms/orders/fl340`, {
      method: 'POST',
      body: JSON.stringify({ case_id: caseId, hearing_id: hearingId, form_data: formData }),
    });
  },

  /**
   * Attach FL-341 to FL-340 order
   */
  async attachFL341(fl340Id: string, formData: Record<string, any>): Promise<CourtFormSubmission> {
    return fetchAPI<CourtFormSubmission>(`/court/forms/orders/fl340/${fl340Id}/attach-fl341`, {
      method: 'POST',
      body: JSON.stringify({ form_data: formData }),
    });
  },

  /**
   * Attach FL-342 to FL-340 order
   */
  async attachFL342(fl340Id: string, formData: Record<string, any>): Promise<CourtFormSubmission> {
    return fetchAPI<CourtFormSubmission>(`/court/forms/orders/fl340/${fl340Id}/attach-fl342`, {
      method: 'POST',
      body: JSON.stringify({ form_data: formData }),
    });
  },

  /**
   * Finalize FL-340 and activate case
   */
  async finalizeFL340(fl340Id: string): Promise<CourtFormSubmission> {
    return fetchAPI<CourtFormSubmission>(`/court/forms/orders/fl340/${fl340Id}/finalize`, {
      method: 'POST',
    });
  },

  /**
   * Manually activate a case
   */
  async activateCase(caseId: string, notes?: string): Promise<{ case_id: string; status: string; message: string }> {
    return fetchAPI(`/court/forms/case/${caseId}/activate`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },
};

// ============================================================================
// Exchange Compliance API (Silent Handoff GPS Verification for Court Portal)
// ============================================================================

export interface ParentExchangeMetrics {
  check_ins: number;
  avg_distance_meters: number | null;
  geofence_hit_rate: number;
  on_time_rate: number;
}

export interface ExchangeComplianceMetrics {
  total_exchanges: number;
  completed: number;
  missed: number;
  one_party_only: number;
  disputed: number;
  gps_verified_rate: number;
  geofence_compliance_rate: number;
  on_time_rate: number;
  petitioner_metrics: ParentExchangeMetrics;
  respondent_metrics: ParentExchangeMetrics;
  date_range: {
    start: string | null;
    end: string | null;
  };
}

export interface RecentExchange {
  id: string;
  title: string;
  scheduled_time: string;
  status: string;
  outcome: string | null;
  from_parent_checked_in: boolean;
  from_parent_in_geofence: boolean | null;
  to_parent_checked_in: boolean;
  to_parent_in_geofence: boolean | null;
}

export interface ExchangeComplianceResponse {
  case_id: string;
  metrics: ExchangeComplianceMetrics;
  recent_exchanges: RecentExchange[];
  overall_status: 'no_data' | 'excellent' | 'good' | 'needs_improvement' | 'concerning';
  generated_at: string;
}

export interface ExchangeGPSData {
  lat: number | null;
  lng: number | null;
  accuracy_meters: number | null;
  distance_meters: number | null;
  in_geofence: boolean | null;
}

export interface ExchangeDetailParent {
  role: string;
  checked_in: boolean;
  check_in_time: string | null;
  gps: ExchangeGPSData | null;
}

export interface ExchangeDetail {
  id: string;
  exchange_id: string;
  title: string;
  scheduled_time: string;
  status: string;
  outcome: string | null;
  location: {
    address: string | null;
    lat: number | null;
    lng: number | null;
    geofence_radius_meters: number | null;
  };
  from_parent: ExchangeDetailParent;
  to_parent: ExchangeDetailParent;
  qr_confirmation: {
    required: boolean;
    confirmed_at: string | null;
  };
  window: {
    start: string | null;
    end: string | null;
    auto_closed: boolean;
  };
  silent_handoff_enabled: boolean;
  notes: string | null;
  static_map_url?: string;
}

export const exchangeComplianceAPI = {
  /**
   * Get exchange compliance metrics for a case (Silent Handoff GPS verification data)
   */
  async getCompliance(
    caseId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ExchangeComplianceResponse> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<ExchangeComplianceResponse>(`/court/cases/${caseId}/exchange-compliance${queryString}`);
  },

  /**
   * Get detailed exchange data with GPS verification for court exports
   */
  async getDetails(
    caseId: string,
    startDate?: string,
    endDate?: string,
    includeMaps: boolean = true
  ): Promise<ExchangeDetail[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('include_maps', includeMaps.toString());
    return fetchAPI<ExchangeDetail[]>(`/court/cases/${caseId}/exchange-details?${params.toString()}`);
  },
};

// ============================================================================
// Court Events API (for Parents)
// ============================================================================

export const courtEventsAPI = {
  /**
   * Get court events for a case (parent view)
   */
  async listForCase(caseId: string): Promise<CourtEventsListResponse> {
    return fetchAPI<CourtEventsListResponse>(`/schedule/cases/${caseId}/court-events`);
  },

  /**
   * RSVP to a court event
   */
  async rsvp(eventId: string, data: CourtEventRSVPRequest): Promise<CourtEventRSVPResponse> {
    return fetchAPI<CourtEventRSVPResponse>(`/schedule/court-events/${eventId}/rsvp`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ============================================================================
// Family Files API
// ============================================================================

export interface FamilyFile {
  id: string;
  family_file_number: string;
  title: string;
  status: 'active' | 'archived' | 'court_linked';
  conflict_level: 'low' | 'moderate' | 'high';
  state: string | null;
  county: string | null;
  aria_enabled: boolean;
  aria_provider: string;
  require_joint_approval: boolean;
  created_at: string;
  updated_at: string;
  parent_a_id: string;
  parent_a_role: string;
  parent_b_id: string | null;
  parent_b_role: string | null;
  parent_b_email: string | null;
  parent_b_invited_at: string | null;
  parent_b_joined_at: string | null;
  is_complete: boolean;
  has_court_case: boolean;
  can_create_shared_care_agreement: boolean;
}

export interface ParentInfo {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
}

export interface FamilyFileDetail extends FamilyFile {
  children: FamilyFileChild[];
  active_agreement_count: number;
  quick_accord_count: number;
  parent_a_info?: ParentInfo | null;
  parent_b_info?: ParentInfo | null;
}

export interface FamilyFileCreate {
  title: string;
  parent_a_role?: string;
  parent_b_email?: string;
  parent_b_role?: string;
  state?: string;
  county?: string;
  children?: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    middle_name?: string;
    gender?: string;
  }[];
}

export interface FamilyFileUpdate {
  title?: string;
  state?: string;
  county?: string;
  aria_enabled?: boolean;
  aria_provider?: string;
}

export interface FamilyFileChild {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  middle_name?: string;
  preferred_name?: string;
  gender?: string;
  photo_url?: string;
  status: string;
}

export interface FamilyFileInvitation {
  id: string;
  family_file_number: string;
  title: string;
  parent_a_role: string;
  your_role: string;
  invited_at: string;
}

// Custody Status Types
export interface ChildCustodyStatus {
  child_id: string;
  child_first_name: string;
  child_last_name?: string;
  with_current_user: boolean;
  current_parent_id?: string;
  current_parent_name?: string;
  next_action?: 'pickup' | 'dropoff';  // What happens at next exchange
  next_exchange_id?: string;
  next_exchange_time?: string;
  next_exchange_location?: string;
  hours_remaining?: number;
  time_with_current_parent_hours?: number;
  progress_percentage: number;
}

export interface CustodyStatusResponse {
  family_file_id: string;
  case_id?: string;
  current_user_id: string;
  coparent_id?: string;
  coparent_name?: string;
  all_with_current_user: boolean;
  any_with_current_user: boolean;
  children: ChildCustodyStatus[];
  next_exchange_time?: string;
  next_exchange_day?: string;
  next_exchange_formatted?: string;
  hours_until_next_exchange?: number;
  custody_period_hours: number;
  elapsed_hours: number;
  progress_percentage: number;
  last_manual_override?: string;
  manual_override_by?: string;
  pending_override_request: boolean;
}

export const familyFilesAPI = {
  /**
   * List all Family Files for the current user
   */
  async list(): Promise<{ items: FamilyFile[]; total: number }> {
    return fetchAPI<{ items: FamilyFile[]; total: number }>('/family-files/');
  },

  /**
   * Get a specific Family File with full details
   */
  async get(id: string): Promise<FamilyFileDetail> {
    return fetchAPI<FamilyFileDetail>(`/family-files/${id}`);
  },

  /**
   * Create a new Family File
   */
  async create(data: FamilyFileCreate): Promise<FamilyFile & { message: string }> {
    return fetchAPI<FamilyFile & { message: string }>('/family-files/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a Family File
   */
  async update(id: string, data: FamilyFileUpdate): Promise<FamilyFile> {
    return fetchAPI<FamilyFile>(`/family-files/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get pending invitations
   */
  async getInvitations(): Promise<{ items: FamilyFileInvitation[]; total: number }> {
    return fetchAPI<{ items: FamilyFileInvitation[]; total: number }>('/family-files/invitations');
  },

  /**
   * Invite Parent B to a Family File
   */
  async inviteParentB(id: string, email: string, role: string = 'parent_b'): Promise<FamilyFile & { message: string }> {
    return fetchAPI<FamilyFile & { message: string }>(`/family-files/${id}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  },

  /**
   * Accept a Family File invitation
   */
  async acceptInvitation(id: string): Promise<FamilyFile & { message: string }> {
    return fetchAPI<FamilyFile & { message: string }>(`/family-files/${id}/accept`, {
      method: 'POST',
    });
  },

  /**
   * Add a child to a Family File
   */
  async addChild(familyFileId: string, child: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    middle_name?: string;
    gender?: string;
  }): Promise<FamilyFileChild & { message: string }> {
    return fetchAPI<FamilyFileChild & { message: string }>(`/family-files/${familyFileId}/children`, {
      method: 'POST',
      body: JSON.stringify(child),
    });
  },

  /**
   * Get children in a Family File
   */
  async getChildren(familyFileId: string): Promise<{ items: FamilyFileChild[]; total: number }> {
    return fetchAPI<{ items: FamilyFileChild[]; total: number }>(`/family-files/${familyFileId}/children`);
  },

  /**
   * Get current custody status for the dashboard
   * Answers: "Where are my kids right now?"
   */
  async getCustodyStatus(familyFileId: string): Promise<CustodyStatusResponse> {
    return fetchAPI<CustodyStatusResponse>(`/exchanges/family-file/${familyFileId}/custody-status`);
  },

  /**
   * Override custody status - "With Me" button
   * Immediately sets custody status for the specified children
   */
  async overrideCustody(
    familyFileId: string,
    childIds: string[],
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    return fetchAPI<{ success: boolean; message: string }>('/exchanges/override-custody', {
      method: 'POST',
      body: JSON.stringify({
        family_file_id: familyFileId,
        child_ids: childIds,
        notes,
      }),
    });
  },

  /**
   * Delete a Family File
   * Only the creator (Parent A) can delete
   */
  async delete(id: string): Promise<void> {
    await fetchAPI<void>(`/family-files/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Remove Parent B from a Family File
   * Only the creator (Parent A) can remove co-parent
   */
  async removeParentB(id: string): Promise<FamilyFile & { message: string }> {
    return fetchAPI<FamilyFile & { message: string }>(`/family-files/${id}/remove-parent-b`, {
      method: 'POST',
    });
  },
};

// ============================================================================
// QuickAccord API
// ============================================================================

export interface QuickAccord {
  id: string;
  family_file_id: string;
  accord_number: string;
  title: string;
  purpose_category: 'travel' | 'schedule_swap' | 'special_event' | 'overnight' | 'expense' | 'other';
  purpose_description: string | null;
  is_single_event: boolean;
  status: 'draft' | 'pending_approval' | 'active' | 'completed' | 'revoked' | 'expired';
  event_date: string | null;
  start_date: string | null;
  end_date: string | null;
  child_ids: string[];
  location: string | null;
  pickup_responsibility: string | null;
  dropoff_responsibility: string | null;
  transportation_notes: string | null;
  has_shared_expense: boolean;
  estimated_amount: number | null;
  expense_category: string | null;
  receipt_required: boolean;
  parent_a_approved: boolean;
  parent_a_approved_at: string | null;
  parent_b_approved: boolean;
  parent_b_approved_at: string | null;
  ai_summary: string | null;
  initiated_by: string;
  created_at: string;
  updated_at: string;
  is_approved: boolean;
  is_active: boolean;
  is_expired: boolean;
}

export interface QuickAccordCreate {
  title: string;
  purpose_category: 'travel' | 'schedule_swap' | 'special_event' | 'overnight' | 'expense' | 'other';
  purpose_description?: string;
  is_single_event?: boolean;
  event_date?: string;
  start_date?: string;
  end_date?: string;
  child_ids?: string[];
  location?: string;
  pickup_responsibility?: string;
  dropoff_responsibility?: string;
  transportation_notes?: string;
  has_shared_expense?: boolean;
  estimated_amount?: number;
  expense_category?: string;
  receipt_required?: boolean;
}

export interface ARIAConversationResponse {
  conversation_id: string;
  response: string;
  extracted_data: Record<string, any> | null;
  is_ready_to_create: boolean;
}

export const quickAccordsAPI = {
  /**
   * List QuickAccords for a Family File
   */
  async list(familyFileId: string, status?: string): Promise<{ items: QuickAccord[]; total: number }> {
    const params = status ? `?status=${status}` : '';
    return fetchAPI<{ items: QuickAccord[]; total: number }>(`/quick-accords/family-file/${familyFileId}${params}`);
  },

  /**
   * Get a specific QuickAccord
   */
  async get(id: string): Promise<QuickAccord> {
    return fetchAPI<QuickAccord>(`/quick-accords/${id}`);
  },

  /**
   * Create a new QuickAccord
   */
  async create(familyFileId: string, data: QuickAccordCreate): Promise<QuickAccord & { message: string }> {
    return fetchAPI<QuickAccord & { message: string }>(`/quick-accords/family-file/${familyFileId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a QuickAccord (draft only)
   */
  async update(id: string, data: Partial<QuickAccordCreate>): Promise<QuickAccord> {
    return fetchAPI<QuickAccord>(`/quick-accords/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Submit for approval
   */
  async submit(id: string): Promise<QuickAccord & { message: string }> {
    return fetchAPI<QuickAccord & { message: string }>(`/quick-accords/${id}/submit`, {
      method: 'POST',
    });
  },

  /**
   * Approve or reject a QuickAccord
   */
  async approve(id: string, approved: boolean = true, notes?: string): Promise<QuickAccord & { message: string }> {
    return fetchAPI<QuickAccord & { message: string }>(`/quick-accords/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved, notes }),
    });
  },

  /**
   * Mark as completed
   */
  async complete(id: string): Promise<QuickAccord & { message: string }> {
    return fetchAPI<QuickAccord & { message: string }>(`/quick-accords/${id}/complete`, {
      method: 'POST',
    });
  },

  /**
   * Revoke a QuickAccord
   */
  async revoke(id: string): Promise<QuickAccord & { message: string }> {
    return fetchAPI<QuickAccord & { message: string }>(`/quick-accords/${id}/revoke`, {
      method: 'POST',
    });
  },

  /**
   * Delete a QuickAccord (draft only)
   */
  async delete(id: string): Promise<void> {
    return fetchAPI<void>(`/quick-accords/${id}`, {
      method: 'DELETE',
    });
  },

  // ARIA Conversational Creation
  aria: {
    /**
     * Start an ARIA conversation to create a QuickAccord
     */
    async start(familyFileId: string): Promise<ARIAConversationResponse> {
      return fetchAPI<ARIAConversationResponse>(`/quick-accords/aria/start/${familyFileId}`, {
        method: 'POST',
      });
    },

    /**
     * Send a message in an ARIA conversation
     */
    async sendMessage(conversationId: string, message: string): Promise<ARIAConversationResponse> {
      return fetchAPI<ARIAConversationResponse>(`/quick-accords/aria/message/${conversationId}`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
    },

    /**
     * Create QuickAccord from conversation
     */
    async create(conversationId: string): Promise<QuickAccord & { message: string }> {
      return fetchAPI<QuickAccord & { message: string }>(`/quick-accords/aria/create/${conversationId}`, {
        method: 'POST',
      });
    },
  },
};

// ============================================================================
// ARIA Paralegal - Intake API
// ============================================================================

export type IntakeStatus = 'pending' | 'in_progress' | 'completed' | 'expired' | 'cancelled';

export interface IntakeSession {
  id: string;
  session_number: string;
  case_id: string;
  family_file_id?: string;
  professional_id: string;
  parent_id: string;

  // Access info
  access_token: string;
  intake_link: string;
  access_link_expires_at: string;
  access_link_used_at?: string;

  // Form targets
  target_forms: string[];
  custom_questions?: string[];

  // Status
  status: IntakeStatus;
  started_at?: string;
  completed_at?: string;
  message_count: number;

  // Confirmation
  parent_confirmed: boolean;
  parent_confirmed_at?: string;

  // Professional review
  professional_reviewed: boolean;
  professional_reviewed_at?: string;

  // Clarification
  clarification_requested: boolean;
  clarification_request?: string;
  clarification_response?: string;

  created_at: string;
  updated_at: string;
}

export interface IntakeSessionListItem {
  id: string;
  session_number: string;
  case_id: string;
  parent_id: string;
  target_forms: string[];
  status: IntakeStatus;
  message_count: number;
  parent_confirmed: boolean;
  professional_reviewed: boolean;
  clarification_requested: boolean;
  access_link_expires_at: string;
  created_at: string;
}

export interface IntakeAccessResponse {
  session_id: string;
  session_number: string;
  professional_name: string;
  professional_role: string;
  target_forms: string[];
  status: IntakeStatus;
  is_accessible: boolean;
  case_name?: string;
  children_names?: string[];
}

export interface IntakeMessageResponse {
  response: string;
  message_count: number;
  extracted_so_far?: Record<string, unknown>;
  progress_sections?: string[];
  is_complete: boolean;
}

export interface IntakeSummaryResponse {
  session_number: string;
  aria_summary: string;
  extracted_data?: Record<string, unknown>;
  target_forms: string[];
  message_count: number;
  parent_confirmed: boolean;
}

export interface IntakeTranscriptResponse {
  session_number: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  message_count: number;
  started_at?: string;
  completed_at?: string;
}

export interface IntakeOutputs {
  session_number: string;
  status: IntakeStatus;
  parent_confirmed: boolean;
  parent_confirmed_at?: string;
  aria_summary?: string;
  extracted_data?: Record<string, unknown>;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  message_count: number;
  draft_form_url?: string;
  draft_form_generated_at?: string;
  started_at?: string;
  completed_at?: string;
  target_forms: string[];
}

export interface CreateIntakeSessionRequest {
  case_id: string;
  parent_id: string;
  target_forms: string[];
  custom_questions?: string[];
  family_file_id?: string;
  expires_in_days?: number;
}

export const intakeAPI = {
  // =========================================================================
  // Professional Endpoints (Court Portal)
  // =========================================================================

  /**
   * Create a new intake session
   */
  async createSession(data: CreateIntakeSessionRequest): Promise<IntakeSession> {
    return fetchAPI<IntakeSession>('/intake/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * List intake sessions (for professional's cases)
   */
  async listSessions(params?: { case_id?: string; status?: IntakeStatus }): Promise<{ items: IntakeSessionListItem[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.case_id) searchParams.set('case_id', params.case_id);
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return fetchAPI<{ items: IntakeSessionListItem[]; total: number }>(`/intake/sessions${query ? `?${query}` : ''}`);
  },

  /**
   * Get a specific intake session
   */
  async getSession(sessionId: string): Promise<IntakeSession> {
    return fetchAPI<IntakeSession>(`/intake/sessions/${sessionId}`);
  },

  /**
   * Get intake session transcript
   */
  async getTranscript(sessionId: string): Promise<IntakeTranscriptResponse> {
    return fetchAPI<IntakeTranscriptResponse>(`/intake/sessions/${sessionId}/transcript`);
  },

  /**
   * Get ARIA summary for session
   */
  async getSummary(sessionId: string): Promise<IntakeSummaryResponse> {
    return fetchAPI<IntakeSummaryResponse>(`/intake/sessions/${sessionId}/summary`);
  },

  /**
   * Get all outputs for session
   */
  async getOutputs(sessionId: string): Promise<IntakeOutputs> {
    return fetchAPI<IntakeOutputs>(`/intake/sessions/${sessionId}/outputs`);
  },

  /**
   * Request clarification from parent
   */
  async requestClarification(sessionId: string, clarificationRequest: string): Promise<IntakeSession> {
    return fetchAPI<IntakeSession>(`/intake/sessions/${sessionId}/request-clarification`, {
      method: 'POST',
      body: JSON.stringify({ clarification_request: clarificationRequest }),
    });
  },

  /**
   * Mark session as reviewed
   */
  async markReviewed(sessionId: string): Promise<IntakeSession> {
    return fetchAPI<IntakeSession>(`/intake/sessions/${sessionId}/mark-reviewed`, {
      method: 'POST',
    });
  },

  // =========================================================================
  // Parent Endpoints (Public Access via Token)
  // =========================================================================

  /**
   * Validate intake access token and get session info
   */
  async validateAccess(token: string): Promise<IntakeAccessResponse> {
    return fetchAPI<IntakeAccessResponse>(`/intake/access/${token}`);
  },

  /**
   * Start the intake conversation
   */
  async startIntake(token: string): Promise<IntakeMessageResponse> {
    return fetchAPI<IntakeMessageResponse>(`/intake/access/${token}/start`, {
      method: 'POST',
    });
  },

  /**
   * Send a message in the intake conversation
   */
  async sendMessage(token: string, message: string): Promise<IntakeMessageResponse> {
    return fetchAPI<IntakeMessageResponse>(`/intake/access/${token}/message`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  /**
   * Get parent's view of summary (before confirmation)
   */
  async getParentSummary(token: string): Promise<IntakeSummaryResponse> {
    return fetchAPI<IntakeSummaryResponse>(`/intake/access/${token}/summary`);
  },

  /**
   * Parent confirms intake completion
   */
  async confirmIntake(token: string, edits?: Array<{ field: string; value: string }>): Promise<{ message: string; session_number: string }> {
    return fetchAPI<{ message: string; session_number: string }>(`/intake/access/${token}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ edits }),
    });
  },
};

// =========================================================================
// Dashboard API - Aggregated Activity Data
// =========================================================================

export interface PendingExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  requested_by_name?: string;
  requested_at: string;
  days_pending: number;
}

export interface UnreadMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  content_preview: string;
  sent_at: string;
}

export interface PendingAgreement {
  id: string;
  title: string;
  agreement_type: string;  // "shared_care" or "quick_accord"
  status: string;
  submitted_at?: string;
  submitted_by_name?: string;
}

export interface ActiveQuickAccord {
  id: string;
  title: string;
  purpose_category: string;
  event_date?: string;
  start_date?: string;
  end_date?: string;
  activated_at?: string;
}

export interface CourtNotification {
  id: string;
  message_type: string;  // "notice", "reminder", "order", "general"
  subject?: string;
  is_urgent: boolean;
  sent_at: string;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  event_category: string;  // "medical", "school", "sports", "exchange", "general"
  start_time: string;
  end_time: string;
  location?: string;
  all_day: boolean;
  is_exchange: boolean;
  child_names: string[];
  // Exchange-specific viewer-perspective fields
  viewer_role?: 'pickup' | 'dropoff' | 'both';  // Viewer's role in the exchange
  other_parent_name?: string;  // Name of the other parent for "with X" display
}

export interface RecentActivity {
  id: string;
  activity_type: string;
  category: string;  // "communication", "custody", "schedule", "financial", "system"
  actor_name: string;
  title: string;
  description?: string;
  icon: string;
  severity: string;  // "info", "warning", "urgent"
  created_at: string;
  is_read: boolean;
  subject_type?: string;
  subject_id?: string;
}

export interface ActivityList {
  items: RecentActivity[];
  total: number;
  unread_count: number;
  limit: number;
  offset: number;
}

export interface DashboardSummary {
  pending_expenses_count: number;
  pending_expenses: PendingExpense[];
  unread_messages_count: number;
  unread_messages: UnreadMessage[];
  sender_name?: string;
  pending_agreements_count: number;
  pending_agreements: PendingAgreement[];
  // Active QuickAccords awaiting completion tracking
  active_quick_accords_count: number;
  active_quick_accords: ActiveQuickAccord[];
  unread_court_count: number;
  court_notifications: CourtNotification[];
  upcoming_events: UpcomingEvent[];
  next_event?: UpcomingEvent;
  // Recent activity feed
  recent_activities: RecentActivity[];
  unread_activity_count: number;
}

export const dashboardAPI = {
  /**
   * Get aggregated dashboard summary for a family file
   */
  async getSummary(familyFileId: string): Promise<DashboardSummary> {
    return fetchAPI<DashboardSummary>(`/dashboard/summary/${familyFileId}`);
  },
};

// =========================================================================
// Activities API - Activity Feed
// =========================================================================

export const activitiesAPI = {
  /**
   * Get activities for a family file
   */
  async getActivities(
    familyFileId: string,
    options?: { limit?: number; offset?: number; category?: string }
  ): Promise<ActivityList> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.category) params.append('category', options.category);
    const queryString = params.toString();
    const url = `/family-files/${familyFileId}/activities${queryString ? `?${queryString}` : ''}`;
    return fetchAPI<ActivityList>(url);
  },

  /**
   * Get recent activities for dashboard
   */
  async getRecentActivities(
    familyFileId: string,
    limit: number = 10
  ): Promise<{ items: RecentActivity[]; total_count: number; unread_count: number }> {
    return fetchAPI(`/family-files/${familyFileId}/activities/recent?limit=${limit}`);
  },

  /**
   * Get unread activity count
   */
  async getUnreadCount(familyFileId: string): Promise<{ unread_count: number }> {
    return fetchAPI(`/family-files/${familyFileId}/activities/unread-count`);
  },

  /**
   * Mark a single activity as read
   */
  async markAsRead(familyFileId: string, activityId: string): Promise<void> {
    await fetchAPI(`/family-files/${familyFileId}/activities/${activityId}/read`, {
      method: 'POST',
    });
  },

  /**
   * Mark all activities as read
   */
  async markAllAsRead(familyFileId: string): Promise<{ marked_count: number }> {
    return fetchAPI(`/family-files/${familyFileId}/activities/read-all`, {
      method: 'POST',
    });
  },
};

// =========================================================================
// Circle API - Approved Contacts for KidComs
// =========================================================================

export interface CircleContact {
  id: string;
  family_file_id: string;
  child_id?: string;
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  relationship_type: string;
  photo_url?: string;
  notes?: string;
  room_number?: number;
  added_by: string;
  approved_by_parent_a_at?: string;
  approved_by_parent_b_at?: string;
  is_fully_approved: boolean;
  is_partially_approved: boolean;
  can_communicate: boolean;
  is_active: boolean;
  is_verified: boolean;
  verified_at?: string;
  availability_override?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CircleContactCreate {
  family_file_id: string;
  child_id?: string;
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  relationship_type: string;
  photo_url?: string;
  notes?: string;
  availability_override?: Record<string, unknown>;
}

export interface CircleContactUpdate {
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  relationship_type?: string;
  photo_url?: string;
  notes?: string;
  is_active?: boolean;
  availability_override?: Record<string, unknown>;
}

export interface CircleContactList {
  items: CircleContact[];
  total: number;
  fully_approved_count: number;
  pending_approval_count: number;
}

export interface RelationshipChoice {
  value: string;
  label: string;
}

export const circleAPI = {
  /**
   * Create a new circle contact
   */
  async create(data: CircleContactCreate): Promise<CircleContact> {
    return fetchAPI<CircleContact>('/circle/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * List circle contacts for a family file
   */
  async list(
    familyFileId: string,
    options?: { childId?: string; includeInactive?: boolean }
  ): Promise<CircleContactList> {
    const params = new URLSearchParams();
    if (options?.childId) params.append('child_id', options.childId);
    if (options?.includeInactive) params.append('include_inactive', 'true');
    const queryString = params.toString();
    return fetchAPI<CircleContactList>(
      `/circle/family/${familyFileId}${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get a circle contact by ID
   */
  async get(contactId: string): Promise<CircleContact> {
    return fetchAPI<CircleContact>(`/circle/${contactId}`);
  },

  /**
   * Update a circle contact
   */
  async update(contactId: string, data: CircleContactUpdate): Promise<CircleContact> {
    return fetchAPI<CircleContact>(`/circle/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete (deactivate) a circle contact
   */
  async delete(contactId: string): Promise<void> {
    await fetchAPI(`/circle/${contactId}`, { method: 'DELETE' });
  },

  /**
   * Approve or revoke approval for a circle contact
   */
  async approve(contactId: string, approved: boolean): Promise<CircleContact> {
    return fetchAPI<CircleContact>(`/circle/${contactId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved }),
    });
  },

  /**
   * Send verification invite to a circle contact
   */
  async sendInvite(
    contactId: string,
    options: { sendEmail?: boolean; sendSms?: boolean }
  ): Promise<{ success: boolean; message: string; email_sent: boolean; sms_sent: boolean }> {
    return fetchAPI(`/circle/${contactId}/invite`, {
      method: 'POST',
      body: JSON.stringify({
        send_email: options.sendEmail ?? true,
        send_sms: options.sendSms ?? false,
      }),
    });
  },

  /**
   * Get relationship type choices
   */
  async getRelationshipChoices(): Promise<RelationshipChoice[]> {
    return fetchAPI<RelationshipChoice[]>('/circle/relationships/choices');
  },
};

// =========================================================================
// KidComs API - Video Calls, Sessions, Chat
// =========================================================================

export interface KidComsSettings {
  id: string;
  family_file_id: string;
  circle_approval_mode: 'both_parents' | 'either_parent';
  availability_schedule?: Record<string, unknown>;
  enforce_availability: boolean;
  require_parent_notification: boolean;
  notify_on_session_start: boolean;
  notify_on_session_end: boolean;
  notify_on_aria_flag: boolean;
  allowed_features: {
    video: boolean;
    chat: boolean;
    theater: boolean;
    arcade: boolean;
    whiteboard: boolean;
  };
  max_session_duration_minutes: number;
  max_daily_sessions: number;
  max_participants_per_session: number;
  require_parent_in_call: boolean;
  allow_child_to_initiate: boolean;
  record_sessions: boolean;
  created_at: string;
  updated_at: string;
}

export interface KidComsSettingsUpdate {
  circle_approval_mode?: 'both_parents' | 'either_parent';
  availability_schedule?: Record<string, unknown>;
  enforce_availability?: boolean;
  require_parent_notification?: boolean;
  notify_on_session_start?: boolean;
  notify_on_session_end?: boolean;
  notify_on_aria_flag?: boolean;
  allowed_features?: {
    video?: boolean;
    chat?: boolean;
    theater?: boolean;
    arcade?: boolean;
    whiteboard?: boolean;
  };
  max_session_duration_minutes?: number;
  max_daily_sessions?: number;
  max_participants_per_session?: number;
  require_parent_in_call?: boolean;
  allow_child_to_initiate?: boolean;
  record_sessions?: boolean;
}

export type SessionType = 'video_call' | 'voice_call' | 'theater' | 'arcade' | 'whiteboard' | 'mixed';
export type SessionStatus = 'waiting' | 'active' | 'completed' | 'cancelled';

export interface SessionParticipant {
  id: string;
  participant_type: 'child' | 'parent' | 'circle_contact';
  name: string;
  photo_url?: string;
  joined_at?: string;
  left_at?: string;
}

export interface KidComsSession {
  id: string;
  family_file_id: string;
  child_id: string;
  child_name?: string;
  session_type: SessionType;
  title?: string;
  status: SessionStatus;
  daily_room_name: string;
  daily_room_url: string;
  daily_room_token?: string;
  initiated_by_id: string;
  initiated_by_type: string;
  participants: SessionParticipant[];
  scheduled_for?: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  features_used: string[];
  total_messages: number;
  flagged_messages: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface KidComsSessionCreate {
  family_file_id: string;
  child_id: string;
  session_type?: SessionType;
  title?: string;
  scheduled_for?: string;
  invited_contact_ids?: string[];
}

export interface KidComsMessage {
  id: string;
  session_id: string;
  sender_id: string;
  sender_type: string;
  sender_name: string;
  content: string;
  original_content?: string;
  aria_analyzed: boolean;
  aria_flagged: boolean;
  aria_category?: string;
  aria_reason?: string;
  aria_score?: number;
  is_delivered: boolean;
  is_hidden: boolean;
  sent_at: string;
}

export interface KidComsSessionList {
  items: KidComsSession[];
  total: number;
  has_more: boolean;
}

export interface KidComsMessageList {
  items: KidComsMessage[];
  total: number;
  has_more: boolean;
}

export interface JoinSessionResponse {
  session_id: string;
  room_url: string;
  token: string;
  participant_name: string;
  participant_type: string;
}

export interface ChildSessionCreate {
  contact_type: 'parent_a' | 'parent_b' | 'circle';
  contact_id: string;
  session_type?: 'video_call' | 'voice_call';
}

export interface CircleContactSessionCreate {
  child_id: string;
  session_type?: 'video_call' | 'voice_call';
}

export const kidcomsAPI = {
  // Settings
  /**
   * Get KidComs settings for a family file
   */
  async getSettings(familyFileId: string): Promise<KidComsSettings> {
    return fetchAPI<KidComsSettings>(`/kidcoms/settings/${familyFileId}`);
  },

  /**
   * Update KidComs settings
   */
  async updateSettings(familyFileId: string, data: KidComsSettingsUpdate): Promise<KidComsSettings> {
    return fetchAPI<KidComsSettings>(`/kidcoms/settings/${familyFileId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Sessions
  /**
   * Create a new KidComs session
   */
  async createSession(data: KidComsSessionCreate): Promise<KidComsSession> {
    return fetchAPI<KidComsSession>('/kidcoms/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * List sessions for a family file
   */
  async listSessions(
    familyFileId: string,
    options?: { childId?: string; status?: SessionStatus; limit?: number; offset?: number }
  ): Promise<KidComsSessionList> {
    const params = new URLSearchParams();
    params.append('family_file_id', familyFileId);
    if (options?.childId) params.append('child_id', options.childId);
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    return fetchAPI<KidComsSessionList>(`/kidcoms/sessions?${params.toString()}`);
  },

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<KidComsSession> {
    return fetchAPI<KidComsSession>(`/kidcoms/sessions/${sessionId}`);
  },

  /**
   * Get active/incoming sessions for a family file
   * Returns sessions that the current user can join (not initiated by them)
   */
  async getActiveSessions(familyFileId: string): Promise<KidComsSessionList> {
    return fetchAPI<KidComsSessionList>(`/kidcoms/sessions/active/${familyFileId}`);
  },

  /**
   * Join an existing session
   */
  async joinSession(sessionId: string): Promise<JoinSessionResponse> {
    return fetchAPI<JoinSessionResponse>(`/kidcoms/sessions/${sessionId}/join`, {
      method: 'POST',
    });
  },

  /**
   * End a session
   */
  async endSession(sessionId: string, notes?: string): Promise<KidComsSession> {
    return fetchAPI<KidComsSession>(`/kidcoms/sessions/${sessionId}/end`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  /**
   * Cancel a scheduled session
   */
  async cancelSession(sessionId: string, reason?: string): Promise<KidComsSession> {
    return fetchAPI<KidComsSession>(`/kidcoms/sessions/${sessionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Child-initiated sessions
  /**
   * Create a session initiated by a child
   * Uses child_token from localStorage for authentication
   */
  async createChildSession(data: ChildSessionCreate): Promise<JoinSessionResponse> {
    return fetchAPIWithChildAuth<JoinSessionResponse>('/kidcoms/sessions/child/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get active sessions for a child (incoming calls)
   * Uses child_token from localStorage for authentication
   */
  async getChildActiveSessions(): Promise<KidComsSessionList> {
    return fetchAPIWithChildAuth<KidComsSessionList>('/kidcoms/sessions/child/active', {
      method: 'GET',
    });
  },

  /**
   * Child joins an existing session
   * Uses child_token from localStorage for authentication
   */
  async childJoinSession(sessionId: string): Promise<JoinSessionResponse> {
    return fetchAPIWithChildAuth<JoinSessionResponse>(`/kidcoms/sessions/child/${sessionId}/join`, {
      method: 'POST',
    });
  },

  // Circle contact-initiated sessions
  /**
   * Create a session initiated by a circle contact (grandparent, aunt, etc.)
   * Uses circle_token from localStorage for authentication
   */
  async createCircleContactSession(data: CircleContactSessionCreate): Promise<JoinSessionResponse> {
    return fetchAPIWithCircleAuth<JoinSessionResponse>('/kidcoms/sessions/circle/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Messages
  /**
   * Get messages for a session
   */
  async getMessages(
    sessionId: string,
    options?: { limit?: number; before?: string }
  ): Promise<KidComsMessageList> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.before) params.append('before', options.before);
    const queryString = params.toString();
    return fetchAPI<KidComsMessageList>(
      `/kidcoms/sessions/${sessionId}/messages${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Send a message in a session
   */
  async sendMessage(sessionId: string, content: string): Promise<KidComsMessage> {
    return fetchAPI<KidComsMessage>(`/kidcoms/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  // Invites
  /**
   * Invite a circle contact to a session
   */
  async inviteContact(
    sessionId: string,
    circleContactId: string
  ): Promise<{ success: boolean; invite_url: string }> {
    return fetchAPI(`/kidcoms/sessions/${sessionId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ circle_contact_id: circleContactId }),
    });
  },

  // Daily.co tokens
  /**
   * Get a meeting token for a participant
   */
  async getMeetingToken(sessionId: string): Promise<{ token: string; room_url: string }> {
    return fetchAPI(`/kidcoms/sessions/${sessionId}/token`, {
      method: 'POST',
    });
  },
};

// =============================================================================
// My Circle API - Child/Contact Communication Portal
// =============================================================================

// My Circle Types
export interface KidComsRoom {
  id: string;
  family_file_id: string;
  room_number: number;
  room_type: 'parent_a' | 'parent_b' | 'circle';
  room_name?: string;
  assigned_to_id?: string;
  assigned_contact_name?: string;
  assigned_contact_relationship?: string;
  daily_room_name?: string;
  daily_room_url?: string;
  is_active: boolean;
  is_reserved: boolean;
  is_assigned: boolean;
  created_at: string;
  updated_at: string;
}

export interface KidComsRoomList {
  items: KidComsRoom[];
  total: number;
  assigned_count: number;
  available_count: number;
}

export interface CirclePermission {
  id: string;
  circle_contact_id: string;
  child_id: string;
  family_file_id: string;
  can_video_call: boolean;
  can_voice_call: boolean;
  can_chat: boolean;
  can_theater: boolean;
  allowed_days?: number[];
  allowed_start_time?: string;
  allowed_end_time?: string;
  is_within_allowed_time: boolean;
  max_call_duration_minutes: number;
  require_parent_present: boolean;
  set_by_parent_id?: string;
  created_at: string;
  updated_at: string;
  contact_name?: string;
  child_name?: string;
}

export interface CirclePermissionList {
  items: CirclePermission[];
  total: number;
}

export interface ChildUser {
  id: string;
  child_id: string;
  family_file_id: string;
  username: string;
  avatar_id?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  child_name?: string;
  child_photo_url?: string;
}

export interface ChildUserList {
  items: ChildUser[];
  total: number;
}

export interface CircleUserInvite {
  id: string;
  circle_contact_id: string;
  email: string;
  invite_token: string;
  invite_url: string;
  invite_expires_at: string;
  contact_name: string;
  relationship_type: string;
  room_number?: number;
}

export interface ChildAvatar {
  id: string;
  emoji: string;
  name: string;
}

export interface ChildContact {
  contact_id: string;
  contact_type: 'parent_a' | 'parent_b' | 'circle';
  display_name: string;
  relationship?: string;
  room_number: number;
  can_video_call: boolean;
  can_voice_call: boolean;
  can_chat: boolean;
  can_theater: boolean;
}

export interface ChildLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  child_id: string;
  child_name: string;
  avatar_id?: string;
  family_file_id: string;
  contacts: ChildContact[];
}

export interface CircleLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  circle_contact_id: string;
  contact_name: string;
  family_file_id: string;
  child_ids: string[];
}

export interface CommunicationLog {
  id: string;
  room_id?: string;
  session_id?: string;
  family_file_id: string;
  child_id: string;
  contact_type: string;
  contact_id?: string;
  contact_name?: string;
  communication_type: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  duration_display?: string;
  aria_flags?: Record<string, unknown>;
  total_messages: number;
  flagged_messages: number;
  has_flags: boolean;
}

export interface IncomingCall {
  session_id: string;
  caller_name: string;
  caller_type: 'circle_contact' | 'child';
  session_type: 'video_call' | 'voice_call';
  room_url: string;
  started_ringing_at?: string;
  child_id?: string;
  child_name?: string;
  circle_contact_id?: string;
  contact_name?: string;
}

export interface IncomingCallList {
  items: IncomingCall[];
  total: number;
}

export interface CallJoinResponse {
  session_id: string;
  room_url: string;
  token: string;
  participant_name: string;
  participant_type: string;
}

export const myCircleAPI = {
  // ==========================================================================
  // Room Management (Parent-facing)
  // ==========================================================================

  /**
   * Get all rooms for a family
   */
  async getRooms(familyFileId: string): Promise<KidComsRoomList> {
    return fetchAPI<KidComsRoomList>(`/my-circle/rooms/${familyFileId}`);
  },

  /**
   * Assign a contact to a room
   */
  async assignRoom(
    roomId: string,
    circleContactId: string,
    roomName?: string
  ): Promise<KidComsRoom> {
    return fetchAPI<KidComsRoom>(`/my-circle/rooms/${roomId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({
        circle_contact_id: circleContactId,
        room_name: roomName,
      }),
    });
  },

  /**
   * Unassign a contact from a room
   */
  async unassignRoom(roomId: string): Promise<KidComsRoom> {
    return fetchAPI<KidComsRoom>(`/my-circle/rooms/${roomId}/unassign`, {
      method: 'DELETE',
    });
  },

  /**
   * Update room name/status
   */
  async updateRoom(
    roomId: string,
    data: { room_name?: string; is_active?: boolean }
  ): Promise<KidComsRoom> {
    return fetchAPI<KidComsRoom>(`/my-circle/rooms/${roomId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // ==========================================================================
  // Circle User Authentication
  // ==========================================================================

  /**
   * Invite an existing circle contact to create an account
   */
  async inviteExistingCircleUser(circleContactId: string): Promise<CircleUserInvite> {
    return fetchAPI<CircleUserInvite>('/my-circle/circle-users/invite', {
      method: 'POST',
      body: JSON.stringify({ circle_contact_id: circleContactId }),
    });
  },

  /**
   * Create a new circle contact and send them an invitation
   */
  async inviteCircleUser(
    familyFileId: string,
    data: {
      email: string;
      contact_name: string;
      relationship_type?: string;
      room_number?: number;
    }
  ): Promise<CircleUserInvite> {
    return fetchAPI<CircleUserInvite>('/my-circle/circle-users/create-and-invite', {
      method: 'POST',
      body: JSON.stringify({
        family_file_id: familyFileId,
        email: data.email,
        contact_name: data.contact_name,
        relationship_type: data.relationship_type,
        room_number: data.room_number,
      }),
    });
  },

  /**
   * Get invite info (before accepting)
   */
  async getInviteInfo(inviteToken: string): Promise<{
    email: string;
    contact_name?: string;
    relationship_type?: string;
    invite_expires_at: string;
  }> {
    return fetchAPI(`/my-circle/circle-users/${inviteToken}/info`);
  },

  /**
   * Accept circle invite and set password
   */
  async acceptCircleInvite(
    inviteToken: string,
    password: string,
    confirmPassword: string
  ): Promise<CircleLoginResponse> {
    return fetchAPI<CircleLoginResponse>('/my-circle/circle-users/accept-invite', {
      method: 'POST',
      body: JSON.stringify({
        invite_token: inviteToken,
        password,
        confirm_password: confirmPassword,
      }),
    });
  },

  /**
   * Circle user login
   */
  async circleUserLogin(email: string, password: string): Promise<CircleLoginResponse> {
    return fetchAPI<CircleLoginResponse>('/my-circle/circle-users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // ==========================================================================
  // Child User Authentication
  // ==========================================================================

  /**
   * Set up a child's login
   */
  async setupChildUser(data: {
    child_id: string;
    username: string;
    pin: string;
    avatar_id?: string;
  }): Promise<ChildUser> {
    return fetchAPI<ChildUser>('/my-circle/child-users/setup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a child's login
   */
  async updateChildUser(
    childUserId: string,
    data: {
      username?: string;
      pin?: string;
      avatar_id?: string;
      is_active?: boolean;
    }
  ): Promise<ChildUser> {
    return fetchAPI<ChildUser>(`/my-circle/child-users/${childUserId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * List child users for a family
   */
  async listChildUsers(familyFileId: string): Promise<ChildUserList> {
    return fetchAPI<ChildUserList>(`/my-circle/child-users/family/${familyFileId}`);
  },

  /**
   * Child user login (PIN-based)
   */
  async childUserLogin(
    familyFileId: string,
    username: string,
    pin: string
  ): Promise<ChildLoginResponse> {
    return fetchAPI<ChildLoginResponse>('/my-circle/child-users/login', {
      method: 'POST',
      body: JSON.stringify({
        family_file_id: familyFileId,
        username,
        pin,
      }),
    });
  },

  /**
   * Get available avatars
   */
  async getAvatars(): Promise<ChildAvatar[]> {
    return fetchAPI<ChildAvatar[]>('/my-circle/child-users/avatars');
  },

  // ==========================================================================
  // Permission Management
  // ==========================================================================

  /**
   * Create or update permissions
   */
  async createPermission(data: {
    circle_contact_id: string;
    child_id: string;
    can_video_call?: boolean;
    can_voice_call?: boolean;
    can_chat?: boolean;
    can_theater?: boolean;
    allowed_days?: number[];
    allowed_start_time?: string;
    allowed_end_time?: string;
    max_call_duration_minutes?: number;
    require_parent_present?: boolean;
  }): Promise<CirclePermission> {
    return fetchAPI<CirclePermission>('/my-circle/permissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update existing permission
   */
  async updatePermission(
    permissionId: string,
    data: {
      can_video_call?: boolean;
      can_voice_call?: boolean;
      can_chat?: boolean;
      can_theater?: boolean;
      allowed_days?: number[];
      allowed_start_time?: string;
      allowed_end_time?: string;
      max_call_duration_minutes?: number;
      require_parent_present?: boolean;
    }
  ): Promise<CirclePermission> {
    return fetchAPI<CirclePermission>(`/my-circle/permissions/${permissionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get a permission by ID
   */
  async getPermission(permissionId: string): Promise<CirclePermission> {
    return fetchAPI<CirclePermission>(`/my-circle/permissions/${permissionId}`);
  },

  /**
   * List permissions for a family (parent auth)
   */
  async listPermissions(
    familyFileId: string,
    options?: { childId?: string; contactId?: string }
  ): Promise<CirclePermissionList> {
    const params = new URLSearchParams();
    if (options?.childId) params.append('child_id', options.childId);
    if (options?.contactId) params.append('contact_id', options.contactId);
    const queryString = params.toString();
    return fetchAPI<CirclePermissionList>(
      `/my-circle/permissions/family/${familyFileId}${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get my permissions as a circle user (circle auth)
   * This endpoint is for circle contacts to see their own permissions.
   */
  async getMyPermissions(): Promise<CirclePermissionList> {
    return fetchAPIWithCircleAuth<CirclePermissionList>(
      '/my-circle/circle-users/me/permissions'
    );
  },

  /**
   * Delete a permission
   */
  async deletePermission(permissionId: string): Promise<void> {
    await fetchAPI(`/my-circle/permissions/${permissionId}`, {
      method: 'DELETE',
    });
  },

  // ==========================================================================
  // Communication Logs
  // ==========================================================================

  /**
   * Get communication logs for audit/monitoring
   */
  async getCommunicationLogs(
    familyFileId: string,
    options?: {
      childId?: string;
      contactId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<CommunicationLog[]> {
    const params = new URLSearchParams();
    if (options?.childId) params.append('child_id', options.childId);
    if (options?.contactId) params.append('contact_id', options.contactId);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    const queryString = params.toString();
    return fetchAPI<CommunicationLog[]>(
      `/my-circle/logs/${familyFileId}${queryString ? `?${queryString}` : ''}`
    );
  },

  // ==========================================================================
  // Incoming Call Notifications
  // ==========================================================================

  /**
   * Get incoming calls for a child (child auth required)
   * Poll this endpoint to check for incoming calls from circle contacts
   */
  async getIncomingCallsForChild(): Promise<IncomingCallList> {
    return fetchAPIWithChildAuth<IncomingCallList>('/kidcoms/sessions/incoming/child');
  },

  /**
   * Get incoming calls for a circle contact (circle auth required)
   * Poll this endpoint to check for incoming calls from children
   */
  async getIncomingCallsForCircle(): Promise<IncomingCallList> {
    return fetchAPIWithCircleAuth<IncomingCallList>('/kidcoms/sessions/incoming/circle');
  },

  /**
   * Accept an incoming call as a child (child auth required)
   * Returns the join token to connect to the Daily.co room
   */
  async acceptIncomingCallAsChild(sessionId: string): Promise<CallJoinResponse> {
    return fetchAPIWithChildAuth<CallJoinResponse>(`/kidcoms/sessions/${sessionId}/accept`, {
      method: 'POST',
    });
  },

  /**
   * Reject an incoming call as a child (child auth required)
   */
  async rejectIncomingCallAsChild(sessionId: string): Promise<void> {
    await fetchAPIWithChildAuth<void>(`/kidcoms/sessions/${sessionId}/reject`, {
      method: 'POST',
    });
  },

  /**
   * Accept an incoming call as a circle contact (circle auth required)
   * Returns the join token to connect to the Daily.co room
   */
  async acceptIncomingCallAsCircle(sessionId: string): Promise<CallJoinResponse> {
    return fetchAPIWithCircleAuth<CallJoinResponse>(`/kidcoms/sessions/${sessionId}/circle/accept`, {
      method: 'POST',
    });
  },

  /**
   * Create a session and call a child (circle auth required)
   * Returns the join token to connect to the Daily.co room
   */
  async createCircleContactSession(childId: string, sessionType: 'video_call' | 'voice_call' = 'video_call'): Promise<CallJoinResponse> {
    return fetchAPIWithCircleAuth<CallJoinResponse>('/kidcoms/sessions/circle/create', {
      method: 'POST',
      body: JSON.stringify({
        child_id: childId,
        session_type: sessionType,
      }),
    });
  },
};

// ============================================================================
// Wallet API (Stripe Connect Integration)
// ============================================================================

export const walletAPI = {
  // Parent Wallet Operations

  /**
   * Create a new parent wallet (initiates Stripe Connect onboarding)
   */
  async createWallet(familyFileId?: string): Promise<Wallet> {
    return fetchAPI<Wallet>('/wallets/', {
      method: 'POST',
      body: JSON.stringify({ family_file_id: familyFileId }),
    });
  },

  /**
   * Get the current user's wallet
   */
  async getMyWallet(): Promise<WalletWithBalance> {
    return fetchAPI<WalletWithBalance>('/wallets/me');
  },

  /**
   * Get wallet by ID
   */
  async getWallet(walletId: string): Promise<WalletWithBalance> {
    return fetchAPI<WalletWithBalance>(`/wallets/${walletId}`);
  },

  /**
   * Start or resume Stripe Connect onboarding
   */
  async startOnboarding(walletId: string): Promise<OnboardingResponse> {
    return fetchAPI<OnboardingResponse>(`/wallets/${walletId}/onboarding`, {
      method: 'POST',
    });
  },

  /**
   * Check onboarding status
   */
  async checkOnboardingStatus(walletId: string): Promise<{
    onboarding_completed: boolean;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    requirements_pending: string[];
  }> {
    return fetchAPI(`/wallets/${walletId}/onboarding/status`);
  },

  /**
   * Sync wallet with Stripe account status
   */
  async syncWallet(walletId: string): Promise<WalletWithBalance> {
    return fetchAPI<WalletWithBalance>(`/wallets/${walletId}/sync`, {
      method: 'POST',
    });
  },

  /**
   * Get wallet balance
   */
  async getBalance(walletId: string): Promise<WalletBalance> {
    return fetchAPI<WalletBalance>(`/wallets/${walletId}/balance`);
  },

  /**
   * Deposit funds into wallet
   */
  async deposit(walletId: string, data: DepositRequest): Promise<DepositResponse> {
    return fetchAPI<DepositResponse>(`/wallets/${walletId}/deposit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Confirm deposit after 3D Secure authentication
   */
  async confirmDeposit(walletId: string, transactionId: string): Promise<DepositResponse> {
    return fetchAPI<DepositResponse>(`/wallets/${walletId}/deposit/${transactionId}/confirm`, {
      method: 'POST',
    });
  },

  /**
   * Get wallet transactions
   */
  async getTransactions(
    walletId: string,
    options?: {
      transaction_type?: string;
      status?: string;
      page?: number;
      page_size?: number;
    }
  ): Promise<WalletTransactionListResponse> {
    const params = new URLSearchParams();
    if (options?.transaction_type) params.append('transaction_type', options.transaction_type);
    if (options?.status) params.append('status', options.status);
    if (options?.page) params.append('page', String(options.page));
    if (options?.page_size) params.append('page_size', String(options.page_size));
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<WalletTransactionListResponse>(`/wallets/${walletId}/transactions${query}`);
  },

  /**
   * Get wallet analytics
   */
  async getAnalytics(walletId: string): Promise<WalletAnalytics> {
    return fetchAPI<WalletAnalytics>(`/wallets/${walletId}/analytics`);
  },

  // Obligation Payments

  /**
   * Pay an obligation from wallet or card
   */
  async payObligation(data: ObligationPaymentRequest): Promise<ObligationPaymentResponse> {
    return fetchAPI<ObligationPaymentResponse>('/wallets/pay-obligation', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Payouts

  /**
   * Get payouts for user
   */
  async getPayouts(options?: {
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<PayoutListResponse> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.page) params.append('page', String(options.page));
    if (options?.page_size) params.append('page_size', String(options.page_size));
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<PayoutListResponse>(`/wallets/payouts${query}`);
  },

  /**
   * Get payout details
   */
  async getPayout(payoutId: string): Promise<Payout> {
    return fetchAPI<Payout>(`/wallets/payouts/${payoutId}`);
  },

  // Child Wallet Operations

  /**
   * Get child wallets for a family file
   * Fetches children from family file, then gets each child's wallet
   */
  async getChildWallets(familyFileId: string): Promise<ChildWallet[]> {
    // Get children in this family file
    const childrenResponse = await fetchAPI<{ items: { id: string }[]; total: number }>(
      `/family-files/${familyFileId}/children`
    );

    // Get wallet for each child
    const childWallets: ChildWallet[] = [];
    for (const child of childrenResponse.items) {
      try {
        const wallet = await fetchAPI<ChildWallet>(`/wallets/child/${child.id}`);
        childWallets.push(wallet);
      } catch (err) {
        // Child may not have a wallet yet - skip
        console.debug(`No wallet for child ${child.id}`);
      }
    }
    return childWallets;
  },

  /**
   * Get child wallet by child ID
   */
  async getChildWallet(childId: string): Promise<ChildWallet> {
    return fetchAPI<ChildWallet>(`/wallets/child/${childId}`);
  },

  /**
   * Contribute to a child's wallet (guest checkout supported)
   */
  async contributeToChild(
    childId: string,
    data: ChildContributionRequest
  ): Promise<ChildContributionResponse> {
    return fetchAPI<ChildContributionResponse>(`/wallets/child/${childId}/contribute`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get child wallet contributions
   */
  async getChildContributions(
    childId: string,
    options?: { page?: number; page_size?: number }
  ): Promise<{
    items: Array<{
      id: string;
      amount: string;
      contributor_name: string;
      purpose: string | null;
      message: string | null;
      status: string;
      created_at: string;
    }>;
    total: number;
  }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', String(options.page));
    if (options?.page_size) params.append('page_size', String(options.page_size));
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI(`/wallets/child/${childId}/contributions${query}`);
  },

  // Stripe Setup Intent (for saving payment methods)

  /**
   * Create a setup intent for saving a payment method
   */
  async createSetupIntent(): Promise<{
    client_secret: string;
    setup_intent_id: string;
  }> {
    return fetchAPI('/wallets/setup-intent', {
      method: 'POST',
    });
  },

  /**
   * Get saved payment methods
   */
  async getPaymentMethods(): Promise<Array<{
    id: string;
    type: 'card' | 'us_bank_account';
    card?: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    };
    us_bank_account?: {
      bank_name: string;
      last4: string;
      account_type: string;
    };
    is_default: boolean;
  }>> {
    return fetchAPI('/wallets/payment-methods');
  },

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    await fetchAPI(`/wallets/payment-methods/${paymentMethodId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(paymentMethodId: string): Promise<void> {
    await fetchAPI(`/wallets/payment-methods/${paymentMethodId}/default`, {
      method: 'POST',
    });
  },
};

// ============================================================================
// SUBSCRIPTION API
// ============================================================================

export interface SubscriptionPlan {
  id: string;
  plan_code: string;
  display_name: string;
  description: string | null;
  price_monthly: string;
  price_annually: string | null;
  features: Record<string, boolean | number | string>;
  is_active: boolean;
  stripe_product_id: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_annually: string | null;
}

export interface SubscriptionStatus {
  // Current plan
  tier: string;  // "starter", "plus", "family_plus"
  tier_display_name: string;  // "Starter", "Plus", "Family+"
  status: string;  // "trial", "active", "past_due", "cancelled", "grant"

  // Stripe subscription info
  stripe_subscription_id: string | null;
  period_start: string | null;
  period_end: string | null;

  // Grant info
  has_active_grant: boolean;
  grant_nonprofit_name: string | null;
  grant_expires_at: string | null;

  // Features
  features: Record<string, { has_access: boolean; limit: number | null }>;

  // Trial info
  is_trial: boolean;
  trial_ends_at: string | null;
}

export interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
}

export interface PortalSessionResponse {
  portal_url: string;
}

export interface GrantCodeInfo {
  code: string;
  nonprofit_name: string;
  granted_tier: string;
  is_valid: boolean;
  reason?: string;
}

export interface GrantRedemptionResponse {
  success: boolean;
  message: string;
  nonprofit_name: string;
  granted_tier: string;
  expires_at: string | null;
}

export interface GrantStatusResponse {
  has_active_grant: boolean;
  grant_code?: string;
  nonprofit_name?: string;
  granted_tier?: string;
  granted_at?: string;
  expires_at?: string;
}

export const subscriptionAPI = {
  /**
   * Get all available subscription plans
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    return fetchAPI<SubscriptionPlan[]>('/subscriptions/plans');
  },

  /**
   * Get current user's subscription status
   */
  async getCurrentSubscription(): Promise<SubscriptionStatus> {
    return fetchAPI<SubscriptionStatus>('/subscriptions/current');
  },

  /**
   * Create a Stripe Checkout session for subscription
   */
  async createCheckout(
    planCode: string,
    successUrl: string,
    cancelUrl: string,
    billingCycle: 'monthly' | 'annually' = 'monthly'
  ): Promise<CheckoutSessionResponse> {
    return fetchAPI<CheckoutSessionResponse>('/subscriptions/checkout', {
      method: 'POST',
      body: JSON.stringify({
        plan_code: planCode,
        success_url: successUrl,
        cancel_url: cancelUrl,
        billing_cycle: billingCycle,
      }),
    });
  },

  /**
   * Create a Stripe Customer Portal session
   */
  async createPortalSession(returnUrl: string): Promise<PortalSessionResponse> {
    return fetchAPI<PortalSessionResponse>('/subscriptions/portal', {
      method: 'POST',
      body: JSON.stringify({ return_url: returnUrl }),
    });
  },

  /**
   * Cancel subscription (at end of billing period)
   */
  async cancelSubscription(): Promise<{ success: boolean; message: string; ends_at: string }> {
    return fetchAPI('/subscriptions/cancel', {
      method: 'POST',
    });
  },

  /**
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(): Promise<{ success: boolean; message: string }> {
    return fetchAPI('/subscriptions/reactivate', {
      method: 'POST',
    });
  },

  /**
   * Check if user has access to a specific feature
   */
  async hasFeature(feature: string): Promise<{ has_access: boolean; limit?: number }> {
    return fetchAPI(`/subscriptions/features/${feature}`);
  },

  /**
   * Get all feature access for current user
   */
  async getFeatures(): Promise<Record<string, boolean | number | string>> {
    return fetchAPI('/subscriptions/features');
  },
};

export const grantsAPI = {
  /**
   * Validate a grant code without redeeming
   */
  async validateCode(code: string): Promise<GrantCodeInfo> {
    return fetchAPI<GrantCodeInfo>(`/grants/validate/${encodeURIComponent(code)}`);
  },

  /**
   * Redeem a grant code
   */
  async redeemCode(code: string): Promise<GrantRedemptionResponse> {
    return fetchAPI<GrantRedemptionResponse>('/grants/redeem', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  /**
   * Get current user's grant status
   */
  async getStatus(): Promise<GrantStatusResponse> {
    return fetchAPI<GrantStatusResponse>('/grants/status');
  },
};

// Export commonly used functions
export { getAuthToken, clearAuthTokens };
