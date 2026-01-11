'use client';

import { createSection } from './_section-template';

export const RelocationSection = createSection(
  16,
  'Relocation (Moving)',
  'What if one parent wants to move?',
  "Establish rules for if one parent wants to relocate to a different area.",
  [
    { name: 'notice_days', label: 'Notice Required (days)', placeholder: '60 days', required: true },
    { name: 'distance_trigger', label: 'Distance That Triggers Notice', placeholder: '50 miles or more', required: true },
    { name: 'process', label: 'Relocation Process', type: 'textarea', placeholder: 'What happens if one parent wants to move? Try to reach agreement first? Court decides if no agreement?', required: true },
    { name: 'custody_impact', label: 'Impact on Custody', type: 'textarea', placeholder: 'Would a move require custody modification? How would schedule be affected?' },
  ]
);
