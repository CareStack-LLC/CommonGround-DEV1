'use client';

import { createSection } from './_section-template';

export const MedicalHealthcareSection = createSection(
  11,
  'Medical & Healthcare',
  'Let\'s cover healthcare for your child.',
  "Medical decisions and healthcare access for your child.",
  [
    { name: 'insurance_provider', label: 'Who provides health insurance?', required: true, placeholder: 'Father through ABC Company' },
    { name: 'insurance_company', label: 'Insurance company name (if known)', placeholder: 'Blue Cross Blue Shield' },
    { name: 'medical_records_access', label: 'Should both parents have full access to medical records?', type: 'select', placeholder: 'Yes|No', required: true },
    { name: 'routine_appointments', label: 'Routine Appointments (checkups, vaccines)', type: 'textarea', placeholder: 'Who decides? Can either parent schedule?' },
    { name: 'major_medical', label: 'Major Medical Decisions', type: 'textarea', placeholder: 'Joint decision or one parent decides?', required: true },
    { name: 'emergency_treatment', label: 'Emergency Treatment', placeholder: 'Can either parent authorize emergency treatment?', required: true },
    { name: 'mental_health', label: 'Mental Health/Therapy', type: 'textarea', placeholder: 'If therapy is needed, do both parents need to consent?' },
    { name: 'current_conditions', label: 'Current Medical Conditions', type: 'textarea', placeholder: 'Any known medical conditions or ongoing treatments?' },
    { name: 'current_pediatrician', label: 'Current Pediatrician', placeholder: 'Dr. Smith at Children\'s Medical' },
    { name: 'current_dentist', label: 'Current Dentist', placeholder: 'Dr. Jones Dental' },
  ]
);
