'use client';

import { createSection } from './_section-template';

export const TravelSection = createSection(
  15,
  'Travel with Child',
  'What about trips and vacations?',
  "Rules for traveling with the child, both domestic and international.",
  [
    { name: 'domestic_notice', label: 'Domestic Travel Advance Notice', placeholder: 'How many days notice to the other parent?', required: true },
    { name: 'travel_itinerary', label: 'Is travel itinerary required?', type: 'select', placeholder: 'Yes|No', required: true },
    { name: 'contact_while_traveling', label: 'Contact Info While Traveling', placeholder: 'Hotel phone, address, etc.' },
    { name: 'international_consent', label: 'International Travel - Does other parent need to consent?', type: 'select', placeholder: 'Yes|No', required: true },
    { name: 'passport_holder', label: 'Who holds the passport?', placeholder: 'Mother, Father, or both keep copies?' },
    { name: 'international_notice', label: 'International Travel Advance Notice', placeholder: 'How many days notice required?' },
    { name: 'vacation_time_amount', label: 'Vacation Time Per Year', placeholder: 'How many weeks does each parent get?', required: true },
    { name: 'vacation_advance_request', label: 'Vacation Request Advance Notice', placeholder: 'How far in advance must vacation be requested?' },
    { name: 'blackout_dates', label: 'Vacation Blackout Dates', type: 'textarea', placeholder: 'Any dates when vacation requests are not allowed?' },
  ]
);
