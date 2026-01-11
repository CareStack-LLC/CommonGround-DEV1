'use client';

import { createSection } from './_section-template';

export const ExchangeLogisticsSection = createSection(
  8,
  'Exchange Logistics',
  'Let\'s figure out the handoff logistics.',
  "Details about where and how the child will be exchanged between parents.",
  [
    { name: 'exchange_location', label: 'Exchange Location', type: 'textarea', placeholder: 'Address and type of place (police station, school, church, mall, etc.)', required: true },
    { name: 'exchange_day', label: 'Exchange Day', placeholder: 'What day of the week?', required: true },
    { name: 'exchange_time', label: 'Exchange Time', type: 'time', placeholder: '6:00 PM', required: true },
    { name: 'who_transports', label: 'Who Transports', type: 'textarea', placeholder: 'Who brings the child? Who picks up?', required: true },
    { name: 'grace_period', label: 'Grace Period for Lateness', placeholder: '15 minutes' },
    { name: 'emergency_contact', label: 'Emergency Contact', placeholder: 'Who should be called if someone is very late?' },
    { name: 'behavior_rules', label: 'Behavior During Exchanges', type: 'textarea', placeholder: 'Any rules about how parents should interact at exchanges?' },
  ]
);
