// What was happening: events shown as orange dots under S2 "Benchmark price over time".
// k = the month the dot sits on. t = the name people remember. d = one or two plain sentences, with the exact date.
// Keep each fact checkable (official sources), and never say an event caused a price change: the card shows the
// price before and a year after, worked out from GVR's numbers, and lets clients draw their own conclusion.
// ic: world · rule · rate · health (the small picture on the card).
export const EVENTS = [
  { k: '2008-09', ic: 'world', t: 'Start of the global financial crisis', w: 'September 2008', d: 'Lehman Brothers, a large US bank, collapsed on September 15, 2008. A worldwide recession followed.' },
  { k: '2012-07', ic: 'rule', t: 'Mortgages limited to 25 years', w: 'July 2012', d: 'From July 9, 2012, buyers with less than 20% down could take at most 25 years to pay off their mortgage, down from 30. Monthly payments went up.' },
  { k: '2016-08', ic: 'rule', t: 'Introduction of the foreign buyers tax', w: 'August 2016', d: 'B.C. added a 15% tax for foreign buyers in Metro Vancouver on August 2, 2016.' },
  { k: '2016-10', ic: 'rule', t: 'Introduction of the mortgage stress test', w: 'October 2016', d: 'From October 17, 2016, buyers with less than 20% down had to qualify at a higher test rate.' },
  { k: '2017-01', ic: 'rule', t: "Introduction of Vancouver's empty homes tax", w: 'January 2017', d: 'From January 1, 2017, the City of Vancouver taxed homes left empty for more than six months of the year.' },
  { k: '2018-01', ic: 'rule', t: 'Stress test extended to all buyers', w: 'January 2018', d: 'From January 1, 2018, buyers with 20% or more down also had to qualify at a higher test rate.' },
  { k: '2018-02', ic: 'rule', t: 'Introduction of the speculation and vacancy tax', w: 'February 2018', d: 'On February 20, 2018, B.C. announced a tax on empty and speculative homes. The next day the foreign buyers tax went up from 15% to 20%.' },
  { k: '2020-03', ic: 'health', t: 'COVID-19 pandemic', w: 'March 2020', d: 'The pandemic was declared on March 11, 2020. By March 27 the Bank of Canada had cut its rate to 0.25%.' },
  { k: '2022-03', ic: 'world', t: 'War in Ukraine and rising rates', w: 'February and March 2022', d: 'Russia invaded Ukraine on February 24, 2022. On March 2 the Bank of Canada began raising its rate to fight inflation.' },
  { k: '2023-01', ic: 'rule', t: 'Introduction of the foreign buyer ban', w: 'January 2023', d: 'From January 1, 2023, most people who are not Canadian citizens or permanent residents could not buy homes in Canada.' },
  { k: '2023-07', ic: 'rate', t: 'Bank of Canada rate reaches 5%', w: 'July 2023', d: 'On July 12, 2023 the rate reached 5%, the highest since 2001.' },
  { k: '2023-11', ic: 'rule', t: 'Introduction of the multiplex law', w: 'November 2023', d: 'In November 2023, B.C. passed a law allowing 3 to 6 homes on most single-family lots in cities.' },
  { k: '2024-06', ic: 'rate', t: 'Rates start coming down', w: 'June 2024', d: 'On June 5, 2024 the Bank of Canada made its first cut in four years.' },
  { k: '2024-12', ic: 'rule', t: 'Return of 30-year mortgages', w: 'December 2024', d: 'From December 15, 2024, first-time buyers and buyers of new homes could take 30 years to pay off their mortgage, even with less than 20% down. The price limit for these mortgages went up to $1.5 million.' },
  { k: '2025-01', ic: 'rule', t: 'Introduction of the home flipping tax', w: 'January 2025', d: 'From January 1, 2025, B.C. taxes profits on homes sold within two years of buying them.' },
  { k: '2025-03', ic: 'world', t: 'US tariffs on Canada', w: 'March 2025', d: 'The United States put tariffs on many Canadian goods on March 4, 2025.' },
];
export const EVENT_ICON = {
  world: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
  rate: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/></svg>',
  rule: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7"/></svg>',
  health: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 7v10M7 12h10"/><circle cx="12" cy="12" r="10"/></svg>',
};
