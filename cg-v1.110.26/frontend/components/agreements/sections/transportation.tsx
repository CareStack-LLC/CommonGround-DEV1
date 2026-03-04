'use client';

import { createSection } from './_section-template';

export const TransportationSection = createSection(
  9,
  'Transportation Costs',
  'How will transportation costs be handled?',
  "Determine who pays for travel related to parenting time exchanges.",
  [
    { 
      name: 'cost_arrangement', 
      label: 'Transportation Cost Arrangement', 
      type: 'select',
      placeholder: 'Each Pays Own|Split 50/50|One Parent Pays All|Meet Halfway|Based on Income Percentages',
      required: true 
    },
    { name: 'who_pays', label: 'If one parent pays, which one?', placeholder: 'Mother pays all transportation costs' },
    { name: 'mileage_reimbursement', label: 'Mileage Reimbursement', placeholder: 'Will there be reimbursement? What rate per mile?' },
    { name: 'long_distance', label: 'Long Distance Travel', type: 'textarea', placeholder: 'If parents live far apart, how are flights/long trips handled?' },
  ]
);
