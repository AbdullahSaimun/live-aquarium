// Asma and Saimun were married on 29 September 2026. Everything here is worked out from today's date,
// so the button always "remembers" how long they have been together.
export const WEDDING = new Date(2026, 8, 29);
export const SECRET = 'asmun'; // compared without caring about capital letters
const DAY = 24 * 60 * 60 * 1000;

const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
// Months without a 29th (February in most years) celebrate on their last day instead.
const monthDay = (y, m) => Math.min(WEDDING.getDate(), daysIn(y, m));
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function loveStatus(now = new Date()) {
  const today = midnight(now);
  const days = Math.max(0, Math.round((today - WEDDING) / DAY));
  let months = (today.getFullYear() - WEDDING.getFullYear()) * 12 + today.getMonth() - WEDDING.getMonth();
  if (today.getDate() < monthDay(today.getFullYear(), today.getMonth())) months--;
  months = Math.max(0, months);
  const isMonthDay = months > 0 && today.getDate() === monthDay(today.getFullYear(), today.getMonth());
  const isYearDay = isMonthDay && months % 12 === 0;

  // Next month-anniversary after today.
  let y = today.getFullYear();
  let m = today.getMonth();
  if (today.getDate() >= monthDay(y, m)) m++;
  if (m > 11) {
    m = 0;
    y++;
  }
  const next = new Date(y, m, monthDay(y, m));
  const toNext = Math.round((next - today) / DAY);
  const nextMonths = (y - WEDDING.getFullYear()) * 12 + m - WEDDING.getMonth();

  return { days, months, years: Math.floor(months / 12), isMonthDay, isYearDay, today, next, toNext, nextMonths };
}

export function spanLabel(months) {
  if (months >= 12 && months % 12 === 0) return months === 12 ? '1 Year' : `${months / 12} Years`;
  return months === 1 ? '1 Month' : `${months} Months`;
}

export const formatDate = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

// A different sweet note for ordinary days, picked by the day number.
export const DAILY_NOTES = [
  'Every morning I wake up grateful that the first thing I get to see is your smile.',
  'You make the most ordinary day feel like a little adventure under the sea.',
  'Some people search their whole life for home. I found mine in you.',
  'Your laugh is my favourite song, and I never want it to stop playing.',
  'Thank you for every cup of tea, every kind word and every warm hug.',
  'If I had to choose again, I would choose you, in every life, every time.',
  'You are the calm water I swim back to after every long day.',
  'With you, even quiet moments feel full of love.',
  'I love the way you care for everyone around you. You make the world softer.',
  'Being your husband is the best thing that has ever happened to me.',
  'Every day with you is my new favourite day.',
  'You are my best friend, my sweetest partner and my forever.',
];

export function dailyNote(days) {
  return DAILY_NOTES[days % DAILY_NOTES.length];
}
