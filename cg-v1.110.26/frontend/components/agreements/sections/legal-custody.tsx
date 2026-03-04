'use client';

import { createSection } from './_section-template';

export const LegalCustodySection = createSection(
  4,
  'Legal Custody (Decision-Making)',
  'Legal custody determines who makes major decisions for your child.',
  "Let's go through each type of major decision. For each, indicate whether it will be joint (both parents agree), one parent decides, or one parent has tie-breaking authority.",
  [
    { 
      name: 'education_decisions', 
      label: 'Education Decisions (school choice, tutoring, special ed)', 
      type: 'select',
      placeholder: 'Joint Decision|Mother Decides|Father Decides|Joint with Mother Tiebreaker|Joint with Father Tiebreaker',
      required: true 
    },
    { 
      name: 'medical_decisions', 
      label: 'Medical Decisions (doctors, treatments, therapy)', 
      type: 'select',
      placeholder: 'Joint Decision|Mother Decides|Father Decides|Joint with Mother Tiebreaker|Joint with Father Tiebreaker',
      required: true 
    },
    { 
      name: 'religious_decisions', 
      label: 'Religious Decisions (church, religious education)', 
      type: 'select',
      placeholder: 'Joint Decision|Mother Decides|Father Decides|Joint with Mother Tiebreaker|Joint with Father Tiebreaker',
      required: true 
    },
    { 
      name: 'extracurricular_decisions', 
      label: 'Extracurricular Activities (sports, music, camps)', 
      type: 'select',
      placeholder: 'Joint Decision|Mother Decides|Father Decides|Joint with Mother Tiebreaker|Joint with Father Tiebreaker',
      required: true 
    },
    { 
      name: 'emergency_decisions', 
      label: 'Emergency Decisions', 
      type: 'textarea',
      placeholder: 'Can either parent make emergency decisions when child is with them? Describe the policy.',
      required: true 
    },
  ]
);
