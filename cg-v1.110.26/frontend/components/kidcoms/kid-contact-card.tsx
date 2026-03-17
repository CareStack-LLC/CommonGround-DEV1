'use client';

import { Phone, Video, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KidContactCardProps {
  contact: {
    contact_id: string;
    display_name: string;
    contact_type: string;
    relationship?: string;
    can_video_call: boolean;
    can_voice_call: boolean;
  };
  onCall: () => void;
  onVideo: () => void;
  /** Custom nickname override (child's local customization) */
  overrideNickname?: string;
  /** Custom photo data URL override (child's local customization) */
  overridePhotoUrl?: string;
  /** Callback when the avatar is clicked to edit the contact */
  onEdit?: () => void;
  className?: string;
}

// Emoji mapping for contact types
const CONTACT_EMOJIS: Record<string, string> = {
  parent_a: '👩',
  parent_b: '👨',
  grandparent: '👴',
  grandma: '👵',
  aunt: '👩‍🦰',
  uncle: '👨‍🦱',
  cousin: '🧒',
  family_friend: '🤗',
  godparent: '💝',
  step_parent: '💕',
  sibling: '👦',
  therapist: '🧠',
  tutor: '📚',
  coach: '⚽',
  other: '💜',
};

export function KidContactCard({
  contact,
  onCall,
  onVideo,
  overrideNickname,
  overridePhotoUrl,
  onEdit,
  className,
}: KidContactCardProps) {
  const emoji = CONTACT_EMOJIS[contact.contact_type] || CONTACT_EMOJIS.other;
  const displayName = overrideNickname || contact.display_name;
  const hasCustomName = overrideNickname && overrideNickname !== contact.display_name;

  const avatarContent = overridePhotoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={overridePhotoUrl} alt={displayName} className="w-full h-full object-cover" />
  ) : (
    <span className="text-3xl" role="img" aria-label={displayName}>
      {emoji}
    </span>
  );

  return (
    <div
      className={cn(
        'bg-card rounded-3xl p-4 shadow-lg border border-border',
        'flex items-center gap-4',
        'transition-all duration-200',
        'hover:shadow-xl hover:-translate-y-0.5',
        className
      )}
    >
      {/* Contact Photo/Emoji — optionally editable */}
      <div className="flex-shrink-0">
        {onEdit ? (
          <button
            onClick={onEdit}
            className="relative group"
            aria-label={`Edit ${displayName}`}
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4BA8C8] to-[#3DAA8A] flex items-center justify-center shadow-md overflow-hidden">
              {avatarContent}
            </div>
            {/* Edit overlay on hover */}
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Pencil className="w-5 h-5 text-white" />
            </div>
          </button>
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4BA8C8] to-[#3DAA8A] flex items-center justify-center shadow-md overflow-hidden">
            {avatarContent}
          </div>
        )}
      </div>

      {/* Name and Relationship */}
      <div className="flex-1 min-w-0">
        <h3
          className="text-xl font-black text-foreground truncate"
          style={{ fontFamily: 'var(--portal-font-heading)' }}
        >
          {displayName}
        </h3>
        {contact.relationship && (
          <p
            className="text-sm text-muted-foreground font-semibold capitalize truncate"
            style={{ fontFamily: 'var(--portal-font-body)' }}
          >
            {contact.relationship.replace('_', ' ')}
          </p>
        )}
        {hasCustomName && (
          <p className="text-[10px] mt-0.5" style={{ fontFamily: 'var(--portal-font-body)', color: 'var(--portal-primary, #3DAA8A)' }}>
            ✏️ Custom name
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-shrink-0">
        {/* Call Button */}
        <button
          onClick={onCall}
          disabled={!contact.can_voice_call}
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            'transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300 focus-visible:ring-offset-2',
            contact.can_voice_call
              ? [
                  'bg-green-500 hover:bg-green-600',
                  'shadow-lg hover:shadow-xl',
                  'hover:scale-110 active:scale-95',
                ]
              : 'bg-gray-300 dark:bg-gray-700 opacity-50 cursor-not-allowed'
          )}
          aria-label={`Call ${displayName}`}
          title={contact.can_voice_call ? `Call ${displayName}` : 'Voice calls not available'}
        >
          <Phone className="w-6 h-6 text-white" />
        </button>

        {/* Video Button */}
        <button
          onClick={onVideo}
          disabled={!contact.can_video_call}
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            'transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4BA8C8] focus-visible:ring-offset-2',
            contact.can_video_call
              ? [
                  'bg-[#4BA8C8] hover:bg-[#349878]',
                  'shadow-lg hover:shadow-xl',
                  'hover:scale-110 active:scale-95',
                ]
              : 'bg-gray-300 dark:bg-gray-700 opacity-50 cursor-not-allowed'
          )}
          aria-label={`Video call ${displayName}`}
          title={contact.can_video_call ? `Video call ${displayName}` : 'Video calls not available'}
        >
          <Video className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}
