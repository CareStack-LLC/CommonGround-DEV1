'use client';

import { createSection } from './_section-template';

export const ParentCommunicationSection = createSection(
  13,
  'Parent-to-Parent Communication',
  'How will you two communicate about the child?',
  "Establish communication protocols between parents.",
  [
    { 
      name: 'primary_method', 
      label: 'Primary Communication Method', 
      type: 'select',
      placeholder: 'Text|Email|Phone|Co-parenting App|Our Family Wizard|Talking Parents',
      required: true 
    },
    { name: 'response_time_non_urgent', label: 'Response Time for Non-Urgent Messages', placeholder: 'Within 24 hours' },
    { name: 'response_time_urgent', label: 'Response Time for Urgent Messages', placeholder: 'Within 2 hours' },
    { name: 'communication_tone', label: 'Communication Tone Agreement', type: 'textarea', placeholder: 'Agree to keep communication business-like and respectful? Not speak negatively about each other to the child?' },
    { name: 'schedule_change_notice', label: 'Notice for Schedule Changes', placeholder: 'How much advance notice for schedule change requests?' },
    { name: 'information_sharing', label: 'What information will be shared?', type: 'textarea', placeholder: 'School information? Medical? Activity schedules?' },
  ]
);
