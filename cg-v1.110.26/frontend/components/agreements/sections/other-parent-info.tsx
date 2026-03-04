'use client';

import { createSection } from './_section-template';

export const OtherParentInfoSection = createSection(
  2,
  "Other Parent's Information",
  "Tell us about the other parent.",
  "Please provide the other parent's contact information. Share what you know - we can mark anything uncertain as 'to be confirmed.'",
  [
    { name: 'full_name', label: 'Full Legal Name', required: true, placeholder: 'Jane Marie Smith' },
    { name: 'address', label: 'Current Address', placeholder: '456 Oak Avenue' },
    { name: 'city', label: 'City', placeholder: 'Los Angeles' },
    { name: 'state', label: 'State', placeholder: 'CA' },
    { name: 'zip', label: 'ZIP Code', placeholder: '90210' },
    { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: '(555) 234-5678' },
    { name: 'email', label: 'Email Address', type: 'email', placeholder: 'jane.smith@example.com' },
    { name: 'work_schedule', label: 'Typical Work Schedule (if known)', placeholder: 'Tuesday-Saturday, 10am-6pm' },
  ]
);
