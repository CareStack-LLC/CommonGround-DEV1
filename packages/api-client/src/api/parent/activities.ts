/**
 * Activity Feed API functions
 */

import { fetchAPI } from '../../core/fetch';

// Activity categories
export type ActivityCategory =
  | 'communication'
  | 'custody'
  | 'schedule'
  | 'financial'
  | 'system';

// Activity item for dashboard feed
export interface ActivityFeedItem {
  id: string;
  activity_type: string;
  category: ActivityCategory;
  actor_name: string;
  title: string;
  icon: string;
  severity: string;
  created_at: string;
  is_read: boolean;
  subject_type?: string;
  subject_id?: string;
}

// Full activity response
export interface Activity extends ActivityFeedItem {
  family_file_id: string;
  actor_id?: string;
  subject_name?: string;
  description?: string;
  extra_data?: Record<string, unknown>;
}

// Paginated activity list
export interface ActivityList {
  items: Activity[];
  total: number;
  unread_count: number;
  limit: number;
  offset: number;
}

// Recent activities for dashboard
export interface RecentActivities {
  items: ActivityFeedItem[];
  total_count: number;
  unread_count: number;
}

// Mark read response
export interface MarkReadResponse {
  marked_count: number;
}

/**
 * Get paginated activities for a family file
 */
export async function getActivities(
  familyFileId: string,
  options?: {
    limit?: number;
    offset?: number;
    category?: ActivityCategory;
  }
): Promise<ActivityList> {
  const params = new URLSearchParams();
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());
  if (options?.category) params.append('category', options.category);

  const queryString = params.toString();
  const url = `/family-files/${familyFileId}/activities${queryString ? `?${queryString}` : ''}`;

  return fetchAPI<ActivityList>(url);
}

/**
 * Get recent activities for dashboard
 */
export async function getRecentActivities(
  familyFileId: string,
  limit?: number
): Promise<RecentActivities> {
  const params = limit ? `?limit=${limit}` : '';
  return fetchAPI<RecentActivities>(
    `/family-files/${familyFileId}/activities/recent${params}`
  );
}

/**
 * Get unread activity count
 */
export async function getUnreadCount(
  familyFileId: string
): Promise<{ unread_count: number }> {
  return fetchAPI<{ unread_count: number }>(
    `/family-files/${familyFileId}/activities/unread-count`
  );
}

/**
 * Mark a single activity as read
 */
export async function markAsRead(
  familyFileId: string,
  activityId: string
): Promise<void> {
  await fetchAPI(
    `/family-files/${familyFileId}/activities/${activityId}/read`,
    { method: 'POST' }
  );
}

/**
 * Mark all activities as read
 */
export async function markAllAsRead(
  familyFileId: string
): Promise<MarkReadResponse> {
  return fetchAPI<MarkReadResponse>(
    `/family-files/${familyFileId}/activities/read-all`,
    { method: 'POST' }
  );
}
