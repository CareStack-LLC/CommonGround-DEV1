'use client';

import { createSection } from './_section-template';

export const DisputeResolutionSection = createSection(
  17,
  'Dispute Resolution',
  'When disagreements happen, how will they be resolved?',
  "Establish a process for resolving disagreements without going to court immediately.",
  [
    { name: 'first_step', label: 'First Step', type: 'textarea', placeholder: 'Try to work it out directly between yourselves?', required: true },
    { name: 'mediation_required', label: 'Is mediation required before court?', type: 'select', placeholder: 'Yes|No', required: true },
    { name: 'mediation_costs', label: 'How are mediation costs split?', placeholder: '50/50, based on income, other?' },
    { name: 'preferred_mediator', label: 'Preferred Mediator', placeholder: 'Name of mediator or mediation service (if any)' },
    { name: 'court_option', label: 'Court Intervention', placeholder: 'Can either parent go to court if mediation fails?' },
    { name: 'emergency_court', label: 'Emergency Court Access', placeholder: 'Can either parent go to court immediately for safety issues?' },
  ]
);
