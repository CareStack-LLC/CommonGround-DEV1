'use client';

import { createSection } from './_section-template';

export const ChildCommunicationSection = createSection(
  14,
  'Child Communication with Other Parent',
  'When the child is with one parent, how can they contact the other?',
  "Communication rights between child and non-custodial parent.",
  [
    { name: 'phone_calls_allowed', label: 'Can the child call the other parent?', type: 'select', placeholder: 'Yes|No|Limited', required: true },
    { name: 'video_calls_allowed', label: 'Video calls allowed?', type: 'select', placeholder: 'Yes|No', required: true },
    { name: 'call_frequency', label: 'How often?', placeholder: 'Daily, several times a week, as needed' },
    { name: 'preferred_times', label: 'Preferred Call Times', placeholder: 'Before bedtime, after school, weekends' },
    { name: 'call_privacy', label: 'Should calls be private?', type: 'select', placeholder: 'Yes, completely private|Parent can be present but not listening|No privacy requirement' },
    { name: 'child_phone', label: 'Does child have their own phone?', type: 'select', placeholder: 'Yes|No' },
    { name: 'phone_travel_rules', label: 'Phone Travel Rules', placeholder: 'If child has phone, does it travel between homes?' },
    { name: 'social_media', label: 'Social Media Agreements', type: 'textarea', placeholder: 'Any agreements about social media use? Privacy settings?' },
  ]
);
