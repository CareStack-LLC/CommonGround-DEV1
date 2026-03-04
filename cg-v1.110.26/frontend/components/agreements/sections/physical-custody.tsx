'use client';

import { createSection } from './_section-template';

export const PhysicalCustodySection = createSection(
  5,
  'Physical Custody (Where Child Lives)',
  'Physical custody determines where your child lives.',
  "Tell us about the living arrangement you want for your child. This determines where they spend their time.",
  [
    { 
      name: 'arrangement_type', 
      label: 'Type of Arrangement', 
      type: 'select',
      placeholder: '50/50 (Equal Time)|Primary with One Parent|70/30 Split|60/40 Split|Other',
      required: true 
    },
    { 
      name: 'percentage_split', 
      label: 'If not 50/50, what percentage split?', 
      placeholder: '70% Mother, 30% Father' 
    },
    { 
      name: 'primary_residential_parent', 
      label: 'Primary Residential Parent (for school enrollment)', 
      type: 'select',
      placeholder: 'Mother|Father|Joint',
      required: true 
    },
    { 
      name: 'summer_vs_school_year', 
      label: 'Different arrangement during summer vs school year?', 
      type: 'textarea',
      placeholder: 'Describe any differences in the schedule for summer vacation vs the school year.'
    },
  ]
);
