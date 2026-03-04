'use client';

import { createSection } from './_section-template';

export const ParentingScheduleSection = createSection(
  6,
  'Regular Parenting Schedule',
  "Let's map out the regular weekly schedule.",
  "Tell us about the typical week-to-week parenting schedule. This is the foundation of your custody arrangement.",
  [
    { 
      name: 'weekly_pattern', 
      label: 'Weekly Pattern', 
      type: 'select',
      placeholder: 'Alternating Weeks|2-2-3 Rotation|2-2-5-5 Rotation|Alternating Weekends with Midweek|Other',
      required: true 
    },
    { 
      name: 'mother_days', 
      label: 'Days with Mother', 
      type: 'textarea',
      placeholder: 'Which days would the child be with Mother? Be specific about which weeks if alternating.',
      required: true 
    },
    { 
      name: 'father_days', 
      label: 'Days with Father', 
      type: 'textarea',
      placeholder: 'Which days would the child be with Father? Be specific about which weeks if alternating.',
      required: true 
    },
    { 
      name: 'school_considerations', 
      label: 'School Year Considerations', 
      type: 'textarea',
      placeholder: 'Who handles school mornings? After school pickup? Any special arrangements during the school year?'
    },
    { 
      name: 'midweek_visits', 
      label: 'Midweek Visits (if applicable)', 
      type: 'textarea',
      placeholder: 'Does the non-custodial parent get a midweek visit? What day and time? Overnight?'
    },
  ]
);
