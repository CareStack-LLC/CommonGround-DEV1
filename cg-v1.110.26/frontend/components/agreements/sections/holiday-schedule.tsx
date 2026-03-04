'use client';

import { createSection } from './_section-template';

export const HolidayScheduleSection = createSection(
  7,
  'Holiday Schedule',
  'Holidays are important! Let\'s plan how they will be shared.',
  "For each major holiday, tell us who gets the child in even years vs odd years, or if you want to split the day.",
  [
    { name: 'thanksgiving', label: 'Thanksgiving', type: 'textarea', placeholder: 'Even years: Mother, Odd years: Father', required: true },
    { name: 'christmas_eve', label: 'Christmas Eve', type: 'textarea', placeholder: 'Even years: Father, Odd years: Mother', required: true },
    { name: 'christmas_day', label: 'Christmas Day', type: 'textarea', placeholder: 'Even years: Mother, Odd years: Father', required: true },
    { name: 'new_years', label: 'New Year\'s Eve/Day', type: 'textarea', placeholder: 'Alternating years or split?' },
    { name: 'easter', label: 'Easter / Spring Holiday', type: 'textarea', placeholder: 'How will this be handled?' },
    { name: 'july_4', label: 'Fourth of July', type: 'textarea', placeholder: 'Alternating or other arrangement?' },
    { name: 'halloween', label: 'Halloween', type: 'textarea', placeholder: 'Split the evening or alternate years?' },
    { name: 'mothers_day', label: 'Mother\'s Day', placeholder: 'Usually with Mother' },
    { name: 'fathers_day', label: 'Father\'s Day', placeholder: 'Usually with Father' },
    { name: 'child_birthday', label: 'Child\'s Birthday', type: 'textarea', placeholder: 'Split? Alternate? Party together?', required: true },
    { name: 'spring_break', label: 'Spring Break', type: 'textarea', placeholder: 'How will spring break be divided?' },
    { name: 'winter_break', label: 'Winter Break', type: 'textarea', placeholder: 'How will winter break be divided?' },
    { name: 'summer_vacation', label: 'Summer Vacation', type: 'textarea', placeholder: 'How will summer vacation be divided?', required: true },
  ]
);
