'use client';

import { createSection } from './_section-template';

export const ChildSupportSection = createSection(
  10,
  'Child Support',
  'Let\'s talk about financial support for the child.',
  "Detail the child support arrangement and how additional expenses will be handled.",
  [
    { 
      name: 'has_support', 
      label: 'Will there be child support payments?', 
      type: 'select',
      placeholder: 'Yes|No',
      required: true 
    },
    { name: 'payer', label: 'If yes, who pays whom?', placeholder: 'Father pays Mother' },
    { name: 'amount', label: 'Amount per month', placeholder: '$500' },
    { name: 'due_date', label: 'Due date (day of month)', placeholder: '1st of each month' },
    { name: 'payment_method', label: 'Payment method', placeholder: 'Direct deposit, check, wage garnishment' },
    { name: 'medical_expenses', label: 'Uncovered Medical/Dental Expenses', type: 'textarea', placeholder: 'How will these be split?' },
    { name: 'childcare_costs', label: 'Childcare/Daycare Costs', type: 'textarea', placeholder: 'How will these be split?' },
    { name: 'school_expenses', label: 'School Supplies and Fees', type: 'textarea', placeholder: 'How will these be split?' },
    { name: 'extracurricular_costs', label: 'Extracurricular Activities', type: 'textarea', placeholder: 'How will sports, music, etc. be paid for?' },
    { name: 'tax_benefits', label: 'Who claims child on taxes?', placeholder: 'Mother claims in even years, Father in odd years' },
    { name: 'health_insurance', label: 'Who provides health insurance?', required: true, placeholder: 'Father provides through employer' },
  ]
);
