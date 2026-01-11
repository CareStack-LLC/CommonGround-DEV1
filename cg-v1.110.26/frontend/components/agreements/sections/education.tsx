'use client';

import { createSection } from './_section-template';

export const EducationSection = createSection(
  12,
  'Education',
  'Let\'s cover education for your child.',
  "School access, decisions, and communications.",
  [
    { name: 'current_school', label: 'Current School Name', placeholder: 'Lincoln Elementary School' },
    { name: 'school_district', label: 'School District', placeholder: 'Unified School District 123' },
    { name: 'school_records_access', label: 'Should both parents have access to school records?', type: 'select', placeholder: 'Yes|No', required: true },
    { name: 'report_cards', label: 'Should both receive report cards?', type: 'select', placeholder: 'Yes|No', required: true },
    { name: 'conferences', label: 'Can both attend parent-teacher conferences?', type: 'select', placeholder: 'Yes|No', required: true },
    { name: 'school_events', label: 'Can both attend school events?', type: 'select', placeholder: 'Yes|No', required: true },
    { name: 'school_choice', label: 'Who decides which school child attends?', type: 'select', placeholder: 'Joint Decision|Mother Decides|Father Decides', required: true },
    { name: 'homework', label: 'Homework Responsibility', type: 'textarea', placeholder: 'How should homework be handled during each parent\'s time?' },
    { name: 'school_communications', label: 'School Information Sharing', type: 'textarea', placeholder: 'How will school info be shared between parents?' },
  ]
);
