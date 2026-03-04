/**
 * My Circle Management API for Parents
 *
 * Allows parents to:
 * - Manage rooms for circle contacts
 * - Invite and manage circle users
 * - Set granular permissions per child
 * - Set up child PIN access
 * - View communication logs
 * - Monitor ARIA flags
 */

import { fetchWithParentAuth } from '../../core';

// ============================================================
// Types
// ============================================================

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

export interface CirclePermission {
  id: string;
  circle_contact_id: string;
  child_id: string;
  family_file_id: string;
  can_video_call: boolean;
  can_voice_call: boolean;
  can_chat: boolean;
  can_theater: boolean;
  allowed_days?: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  allowed_start_time?: string; // "HH:MM"
  allowed_end_time?: string; // "HH:MM"
  is_within_allowed_time: boolean;
  max_call_duration_minutes: number;
  require_parent_present: boolean;
  set_by_parent_id?: string;
  created_at: string;
  updated_at: string;
  contact_name?: string;
  child_name?: string;
}

export interface CircleUserInvite {
  id: string;
  circle_contact_id: string;
  email: string;
  invite_token: string;
  invite_url: string;
  invite_expires_at?: string;
  contact_name: string;
  relationship_type: string;
  room_number?: number;
}

export interface ChildUser {
  id: string;
  child_id: string;
  family_file_id: string;
  username: string;
  avatar_id: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  child_name?: string;
  child_photo_url?: string;
}

export interface CommunicationLog {
  id: string;
  room_id?: string;
  session_id?: string;
  family_file_id: string;
  child_id: string;
  contact_type: 'parent_a' | 'parent_b' | 'circle';
  contact_id?: string;
  contact_name?: string;
  communication_type: 'video' | 'voice' | 'chat' | 'theater';
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  duration_display?: string;
  aria_flags?: Record<string, any>;
  total_messages: number;
  flagged_messages: number;
  has_flags: boolean;
}

export interface ChildAvatar {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

// ============================================================
// Room Management
// ============================================================

/**
 * Get all 10 rooms for a family
 */
export async function getRooms(familyFileId: string): Promise<{
  items: KidComsRoom[];
  total: number;
  assigned_count: number;
  available_count: number;
}> {
  return fetchWithParentAuth(`/my-circle/rooms/${familyFileId}`);
}

/**
 * Assign a contact to a room
 */
export async function assignRoom(
  roomId: string,
  circleContactId: string,
  roomName?: string
): Promise<KidComsRoom> {
  return fetchWithParentAuth(`/my-circle/rooms/${roomId}/assign`, {
    method: 'PUT',
    body: { circle_contact_id: circleContactId, room_name: roomName },
  });
}

/**
 * Unassign a contact from a room
 */
export async function unassignRoom(roomId: string): Promise<KidComsRoom> {
  return fetchWithParentAuth(`/my-circle/rooms/${roomId}/unassign`, {
    method: 'DELETE',
  });
}

/**
 * Update room name or status
 */
export async function updateRoom(
  roomId: string,
  data: { room_name?: string; is_active?: boolean }
): Promise<KidComsRoom> {
  return fetchWithParentAuth(`/my-circle/rooms/${roomId}`, {
    method: 'PUT',
    body: data,
  });
}

// ============================================================
// Circle User Invitations
// ============================================================

/**
 * Send invitation to an existing circle contact
 */
export async function inviteCircleUser(
  circleContactId: string
): Promise<CircleUserInvite> {
  return fetchWithParentAuth('/my-circle/circle-users/invite', {
    method: 'POST',
    body: { circle_contact_id: circleContactId },
  });
}

/**
 * Create a new contact and send invitation
 */
export async function createAndInviteCircleUser(data: {
  family_file_id: string;
  contact_name: string;
  email: string;
  relationship_type?: string;
  room_number?: number;
}): Promise<CircleUserInvite> {
  return fetchWithParentAuth('/my-circle/circle-users/create-and-invite', {
    method: 'POST',
    body: data,
  });
}

/**
 * Resend invitation email
 */
export async function resendCircleInvite(
  circleContactId: string
): Promise<CircleUserInvite> {
  return fetchWithParentAuth(
    `/my-circle/circle-users/${circleContactId}/resend-invite`,
    { method: 'POST' }
  );
}

// ============================================================
// Permission Management
// ============================================================

/**
 * Create or update permission for a contact-child pair
 */
export async function setPermission(data: {
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
  return fetchWithParentAuth('/my-circle/permissions', {
    method: 'POST',
    body: data,
  });
}

/**
 * Update an existing permission
 */
export async function updatePermission(
  permissionId: string,
  data: Partial<Omit<CirclePermission, 'id' | 'created_at' | 'updated_at'>>
): Promise<CirclePermission> {
  return fetchWithParentAuth(`/my-circle/permissions/${permissionId}`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * Get permission by ID
 */
export async function getPermission(permissionId: string): Promise<CirclePermission> {
  return fetchWithParentAuth(`/my-circle/permissions/${permissionId}`);
}

/**
 * List all permissions for a family
 */
export async function listPermissions(
  familyFileId: string,
  filters?: { child_id?: string; contact_id?: string }
): Promise<{ items: CirclePermission[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.child_id) params.set('child_id', filters.child_id);
  if (filters?.contact_id) params.set('contact_id', filters.contact_id);
  const query = params.toString() ? `?${params}` : '';
  return fetchWithParentAuth(`/my-circle/permissions/family/${familyFileId}${query}`);
}

/**
 * Delete a permission (blocks contact from communicating with child)
 */
export async function deletePermission(permissionId: string): Promise<void> {
  await fetchWithParentAuth(`/my-circle/permissions/${permissionId}`, {
    method: 'DELETE',
  });
}

// ============================================================
// Child User (PIN) Management
// ============================================================

/**
 * Set up a child's login account
 */
export async function setupChildUser(data: {
  child_id: string;
  username: string;
  pin: string;
  avatar_id: string;
}): Promise<ChildUser> {
  return fetchWithParentAuth('/my-circle/child-users/setup', {
    method: 'POST',
    body: data,
  });
}

/**
 * Update a child's login settings
 */
export async function updateChildUser(
  childUserId: string,
  data: {
    username?: string;
    pin?: string;
    avatar_id?: string;
    is_active?: boolean;
  }
): Promise<ChildUser> {
  return fetchWithParentAuth(`/my-circle/child-users/${childUserId}`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * List all child users for a family
 */
export async function listChildUsers(
  familyFileId: string
): Promise<{ items: ChildUser[]; total: number }> {
  return fetchWithParentAuth(`/my-circle/child-users/family/${familyFileId}`);
}

/**
 * Get available avatars for children
 */
export async function getChildAvatars(): Promise<ChildAvatar[]> {
  return fetchWithParentAuth('/my-circle/child-users/avatars');
}

// ============================================================
// Communication Logs & Monitoring
// ============================================================

/**
 * Get communication history for a family
 */
export async function getCommunicationLogs(
  familyFileId: string,
  filters?: {
    child_id?: string;
    contact_id?: string;
    limit?: number;
    offset?: number;
  }
): Promise<CommunicationLog[]> {
  const params = new URLSearchParams();
  if (filters?.child_id) params.set('child_id', filters.child_id);
  if (filters?.contact_id) params.set('contact_id', filters.contact_id);
  if (filters?.limit) params.set('limit', filters.limit.toString());
  if (filters?.offset) params.set('offset', filters.offset.toString());
  const query = params.toString() ? `?${params}` : '';
  return fetchWithParentAuth(`/my-circle/logs/${familyFileId}${query}`);
}

/**
 * Get ARIA-flagged communications that need review
 */
export async function getFlaggedCommunications(
  familyFileId: string
): Promise<CommunicationLog[]> {
  const logs = await getCommunicationLogs(familyFileId, { limit: 100 });
  return logs.filter((log) => log.has_flags);
}

// ============================================================
// Quick Actions
// ============================================================

/**
 * Block a contact from all communication immediately
 */
export async function blockContact(
  familyFileId: string,
  circleContactId: string
): Promise<void> {
  const { items: permissions } = await listPermissions(familyFileId, {
    contact_id: circleContactId,
  });

  // Delete all permissions for this contact
  await Promise.all(permissions.map((p) => deletePermission(p.id)));
}

/**
 * Temporarily pause a contact (disable all features)
 */
export async function pauseContact(
  familyFileId: string,
  circleContactId: string
): Promise<CirclePermission[]> {
  const { items: permissions } = await listPermissions(familyFileId, {
    contact_id: circleContactId,
  });

  return Promise.all(
    permissions.map((p) =>
      updatePermission(p.id, {
        can_video_call: false,
        can_voice_call: false,
        can_chat: false,
        can_theater: false,
      })
    )
  );
}

/**
 * Resume a paused contact (enable all features)
 */
export async function resumeContact(
  familyFileId: string,
  circleContactId: string
): Promise<CirclePermission[]> {
  const { items: permissions } = await listPermissions(familyFileId, {
    contact_id: circleContactId,
  });

  return Promise.all(
    permissions.map((p) =>
      updatePermission(p.id, {
        can_video_call: true,
        can_voice_call: true,
        can_chat: true,
        can_theater: true,
      })
    )
  );
}
