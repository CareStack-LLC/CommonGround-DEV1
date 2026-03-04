'use client';

import { createSection } from './_section-template';

export const OtherProvisionsSection = createSection(
  18,
  'Other Provisions',
  'Let\'s cover some additional important topics.',
  "Additional provisions that help make the agreement more complete.",
  [
    { name: 'right_of_first_refusal', label: 'Right of First Refusal', type: 'textarea', placeholder: 'If parent can\'t watch child for X hours, offer time to other parent first? How many hours triggers this?', required: true },
    { name: 'new_partners', label: 'New Partners/Overnight Guests', type: 'textarea', placeholder: 'Any rules about introducing new partners to child? Overnight guests?' },
    { name: 'discipline', label: 'Discipline Agreement', type: 'textarea', placeholder: 'Agreement on consistent discipline? No corporal punishment (spanking)?' },
    { name: 'religious_upbringing', label: 'Religious Upbringing', type: 'textarea', placeholder: 'Any agreements about religion?' },
    { name: 'pets', label: 'Pets', placeholder: 'Any pets that travel with the child?' },
    { name: 'items_traveling', label: 'Items Traveling with Child', type: 'textarea', placeholder: 'What items should always travel? (medications, glasses, school materials, etc.)' },
    { name: 'clothing', label: 'Clothing', type: 'select', placeholder: 'Each home provides clothing|Clothes travel with child' },
    { name: 'other_special', label: 'Other Special Provisions', type: 'textarea', placeholder: 'Any other special provisions or situations to address?' },
  ]
);
