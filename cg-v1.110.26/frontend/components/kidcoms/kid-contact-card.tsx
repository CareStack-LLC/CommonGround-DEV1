'use client';

import { Phone, Video } from 'lucide-react';
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
  className
}: KidContactCardProps) {
  const emoji = CONTACT_EMOJIS[contact.contact_type] || CONTACT_EMOJIS.other;

  return (
    <div
      className={cn(
        'bg-white rounded-3xl p-4 shadow-lg',
        'flex items-center gap-4',
        'transition-all duration-200',
        'hover:shadow-xl hover:-translate-y-0.5',
        className
      )}
    >
      {/* Contact Photo/Emoji */}
      <div className="flex-shrink-0">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center shadow-md">
          <span className="text-3xl" role="img" aria-label={contact.display_name}>
            {emoji}
          </span>
        </div>
      </div>

      {/* Name and Relationship */}
      <div className="flex-1 min-w-0">
        <h3 className="text-xl font-black text-gray-800 truncate">
          {contact.display_name}
        </h3>
        {contact.relationship && (
          <p className="text-sm text-gray-500 font-semibold capitalize truncate">
            {contact.relationship.replace('_', ' ')}
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
              : 'bg-gray-300 opacity-50 cursor-not-allowed'
          )}
          aria-label={`Call ${contact.display_name}`}
          title={contact.can_voice_call ? `Call ${contact.display_name}` : 'Voice calls not available'}
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
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300 focus-visible:ring-offset-2',
            contact.can_video_call
              ? [
                  'bg-cyan-500 hover:bg-cyan-600',
                  'shadow-lg hover:shadow-xl',
                  'hover:scale-110 active:scale-95',
                ]
              : 'bg-gray-300 opacity-50 cursor-not-allowed'
          )}
          aria-label={`Video call ${contact.display_name}`}
          title={contact.can_video_call ? `Video call ${contact.display_name}` : 'Video calls not available'}
        >
          <Video className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}
