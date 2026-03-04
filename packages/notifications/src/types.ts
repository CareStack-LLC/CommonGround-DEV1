/**
 * Push notification types for CommonGround apps
 */

export type NotificationType =
  | 'incoming_call'
  | 'missed_call'
  | 'new_message'
  | 'new_photo'
  | 'schedule_reminder'
  | 'circle_invite'
  | 'child_online';

export interface BaseNotificationData {
  type: NotificationType;
  timestamp: string;
}

export interface IncomingCallNotification extends BaseNotificationData {
  type: 'incoming_call';
  sessionId: string;
  callerId: string;
  callerName: string;
  callerType: 'parent' | 'child' | 'circle';
  callerAvatarUrl?: string;
  roomUrl: string;
}

export interface MissedCallNotification extends BaseNotificationData {
  type: 'missed_call';
  callerId: string;
  callerName: string;
  callerType: 'parent' | 'child' | 'circle';
}

export interface NewMessageNotification extends BaseNotificationData {
  type: 'new_message';
  senderId: string;
  senderName: string;
  senderType: 'parent' | 'child' | 'circle';
  messagePreview: string;
  conversationId: string;
}

export interface NewPhotoNotification extends BaseNotificationData {
  type: 'new_photo';
  senderId: string;
  senderName: string;
  photoCount: number;
}

export interface ScheduleReminderNotification extends BaseNotificationData {
  type: 'schedule_reminder';
  eventId: string;
  eventTitle: string;
  eventTime: string;
  minutesBefore: number;
}

export interface CircleInviteNotification extends BaseNotificationData {
  type: 'circle_invite';
  inviteCode: string;
  familyName: string;
  childName: string;
  invitedBy: string;
}

export interface ChildOnlineNotification extends BaseNotificationData {
  type: 'child_online';
  childId: string;
  childName: string;
}

export type NotificationData =
  | IncomingCallNotification
  | MissedCallNotification
  | NewMessageNotification
  | NewPhotoNotification
  | ScheduleReminderNotification
  | CircleInviteNotification
  | ChildOnlineNotification;

export interface PushToken {
  token: string;
  platform: 'ios' | 'android';
  deviceId: string;
}
