/**
 * @commonground/api-client
 *
 * Shared API client for CommonGround applications.
 * Supports web (Next.js), iOS (Expo), and Android (Expo) platforms.
 *
 * Usage:
 * 1. Initialize with platform-specific storage adapter
 * 2. Configure API URL
 * 3. Use typed API methods
 *
 * @example
 * // Web app initialization
 * import { configure, createWebStorage } from '@commonground/api-client';
 * import { createWebStorage } from '@commonground/api-client/adapters';
 *
 * configure({
 *   apiUrl: process.env.NEXT_PUBLIC_API_URL,
 *   storage: createWebStorage(),
 *   onUnauthorized: () => router.push('/login'),
 * });
 *
 * @example
 * // Mobile app initialization
 * import { configure } from '@commonground/api-client';
 * import { createNativeStorage } from '@commonground/api-client/adapters';
 *
 * configure({
 *   apiUrl: process.env.EXPO_PUBLIC_API_URL,
 *   storage: createNativeStorage(),
 *   onUnauthorized: () => router.replace('/login'),
 * });
 *
 * @example
 * // Using parent API
 * import { parent } from '@commonground/api-client';
 *
 * await parent.auth.login({ email, password });
 * const familyFiles = await parent.familyFile.getFamilyFiles();
 *
 * @example
 * // Using child API (Kidscom app)
 * import { child } from '@commonground/api-client';
 *
 * await child.auth.loginWithCode(accessCode);
 * const contacts = await child.kidcoms.getAvailableContacts();
 *
 * @example
 * // Using circle API (My Circle app)
 * import { circle } from '@commonground/api-client';
 *
 * await circle.auth.loginWithCode(accessCode);
 * const children = await circle.children.getAccessibleChildren();
 */

// Core exports
export {
  // Storage
  type TokenStorage,
  TOKEN_KEYS,
  MemoryStorage,
  setStorage,
  getStorage,
  // Configuration
  configure,
  getConfig,
  getApiUrl,
  type APIClientConfig,
  // Errors
  APIError,
  createErrorFromResponse,
  // Authentication
  getAccessToken,
  getRefreshToken,
  getChildToken,
  getCircleToken,
  setAuthTokens,
  setChildToken,
  setCircleToken,
  clearAuthTokens,
  clearChildToken,
  clearCircleToken,
  getUser,
  setUser,
  isAuthenticated,
  isChildAuthenticated,
  isCircleAuthenticated,
  // Fetch utilities
  type AuthType,
  type FetchOptions,
  fetchAPI,
  fetchWithParentAuth,
  fetchWithChildAuth,
  fetchWithCircleAuth,
  fetchPublic,
  uploadFile,
} from './core';

// API modules
export { parent, child, circle, video, professional } from './api';

// Re-export types for events (commonly used)
export type {
  ScheduleEvent,
  EventCategory,
  EventAttendance,
  RSVPStatus,
  CategoryData,
  ConflictCheckResult,
  MyTimeCollection,
  TimeBlock,
} from './api/parent/events';

// Re-export custody types
export type {
  CustodySummary,
  CustodyExchange,
} from './api/parent/custody';

// Re-export activity types
export type {
  ActivityCategory,
  ActivityFeedItem,
  Activity,
  ActivityList,
  RecentActivities,
} from './api/parent/activities';

// Re-export adapters for convenience
export { createWebStorage, WebStorage } from './adapters/web-storage';
export { createNativeStorage, NativeStorage, isNativePlatform } from './adapters/native-storage';

// Re-export Circle types
export type {
  Memory,
  MemoryComment,
  MemoryList,
} from './api/circle/memories';

export type {
  CircleMessage,
  CircleConversation,
  CircleStickerPack,
  CircleSticker,
} from './api/circle/messages';

export type {
  WatchTogetherContent,
  WatchTogetherSession,
  WatchTogetherInvitation,
} from './api/circle/watchTogether';

// Re-export Theater types
export type {
  TheaterContent,
  ContentCategory,
  ContentFilters,
  WatchTogetherSession as ChildWatchTogetherSession,
  WatchProgress,
} from './api/child/theater';

// Re-export KidComs types
export type {
  LibraryItem,
  LibraryCategory,
  ChatMessage,
  ChatConversation,
  Sticker,
  StickerPack,
} from './api/child/kidcoms';

// Re-export Professional types
export type {
  ProfessionalType,
  ProfessionalUser,
  AuthResponse as ProfessionalAuthResponse,
} from './api/professional/auth';

export type {
  ProfessionalProfile,
  ProfessionalProfileWithFirms,
  FirmMembership,
  FirmRole,
  MembershipStatus,
} from './api/professional/profile';

export type {
  Firm,
  FirmType,
  FirmWithMembers,
  FirmPublicInfo,
} from './api/professional/firms';

export type {
  CaseAssignment,
  CaseAssignmentWithDetails,
  CaseSummaryCard,
  UpcomingEvent as ProfessionalUpcomingEvent,
  AccessRequest,
  AssignmentRole,
  AssignmentStatus,
} from './api/professional/cases';

export type {
  ProfessionalDashboard,
  Alert,
  PendingAction,
  RecentActivity as ProfessionalRecentActivity,
} from './api/professional/dashboard';

export type {
  ProfessionalMessage,
  MessageThread,
  MessageAttachment,
} from './api/professional/messaging';

export type {
  TimelineEvent,
  CaseTimeline,
  ComplianceOverview,
} from './api/professional/timeline';

export type {
  ARIASettings,
  ARIAMetrics,
  ARIAIntervention,
  ParentARIAMetrics,
} from './api/professional/aria';
