// Asma was born on 23 December 2005. Everything is worked out from today's date, so the surprise
// comes back every December with her new age, new candles, a new letter and a new jar of wishes.
export { SECRET } from './love';

export const BIRTHDAY = { year: 2005, month: 11, day: 23 }; // month is 0-based (11 = December)
const COUNTDOWN_FROM = 1; // countdown chips appear on the 1st of the birthday month
const DAY = 24 * 60 * 60 * 1000;
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Saimun (Asma's husband) was born on 31 January 1998: he only gets a countdown chip.
export const HUSBAND_BIRTHDAY = { year: 1998, month: 0, day: 31 };

/**
 * phase: 'off' (most of the year) | 'countdown' (from the 1st of the birthday month) | 'today'.
 * `age` is the age turned this year, `daysLeft` the days until the birthday.
 */
function yearlyStatus(born, now) {
  const today = midnight(now);
  const year = today.getFullYear();
  const bday = new Date(year, born.month, born.day);
  const age = year - born.year;
  const daysLeft = Math.round((bday - today) / DAY);
  let phase = 'off';
  if (daysLeft === 0) phase = 'today';
  else if (today.getMonth() === born.month && today.getDate() >= COUNTDOWN_FROM && daysLeft > 0) phase = 'countdown';
  return { phase, age, daysLeft, year, date: bday };
}

export const birthdayStatus = (now = new Date()) => yearlyStatus(BIRTHDAY, now);
export const husbandBirthdayStatus = (now = new Date()) => yearlyStatus(HUSBAND_BIRTHDAY, now);

export function ordinal(n) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
  return `${n}${s}`;
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const bnNumber = (n) => String(n).replace(/\d/g, (d) => BN_DIGITS[d]);

// A different letter from Saimun for each birthday. Each has English paragraphs and one Bangla line.
const LETTERS = {
  21: {
    en: [
      'Happy 21st birthday, my love! This is your very first birthday as my wife, and I still can\'t believe how lucky I am to say that.',
      'Three months ago you held my hand and said yes to forever. Since then every ordinary day has turned into something soft and bright, just because you are in it.',
      'Today is all about you: your laugh that fills the room, your kind heart that looks after everyone, and those eyes that still make me forget what I was saying.',
      'Make a big wish, my Asma. I will spend this whole year trying to make it come true.',
    ],
    bn: 'শুভ জন্মদিন, আমার আসমা। তুমি আমার জীবনের সবচেয়ে সুন্দর উপহার।',
  },
  22: {
    en: [
      'Happy 22nd birthday, my sweetheart! A whole year of being married to you, and I love you more than on our wedding day.',
      'This year I learned the little things: how you like your tea, the song you hum when you are happy, the way you quietly fix everything for everyone.',
      'Thank you for growing with me, for forgiving my silly mistakes, and for making our home the warmest place in the world.',
      'Here\'s to 22, and to all the adventures still waiting for us.',
    ],
    bn: 'জন্মদিনে তোমার জন্য আমার সব ভালোবাসা আর দোয়া, আমার জান।',
  },
  23: {
    en: [
      'Happy 23rd birthday, my beautiful wife!',
      'Every year I think I can\'t love you more, and every year you prove me wrong. You make me braver, kinder and happier than I ever was alone.',
      'I hope this year brings you peace in your heart, good health, and lots of reasons to laugh until your cheeks hurt.',
      'Wherever life takes us, my favourite place will always be right next to you.',
    ],
    bn: 'তোমার হাসিটাই আমার সবচেয়ে প্রিয়। শুভ জন্মদিন, প্রিয়তমা।',
  },
  24: {
    en: [
      'Happy 24th birthday, Asma!',
      'You are my best friend, my safe place and my favourite person to come home to. On the hard days you hold me up, and on the good days you make them even better.',
      'This year I wish you dreams that come true one by one, and the confidence to chase every one of them. I will be right behind you, cheering the loudest.',
      'I love you today, tomorrow and every birthday after.',
    ],
    bn: 'আল্লাহ তোমাকে সবসময় হাসিখুশি আর সুস্থ রাখুন। ভালোবাসি তোমাকে।',
  },
  25: {
    en: [
      'Happy 25th birthday, my queen! A quarter of a century of you, and the world is so much better for it.',
      'I look back at our years together and smile at all of it: the laughs, the long talks, the little fights that ended in hugs, and the dreams we built together.',
      'You deserve every good thing, and I promise to keep trying to give you as much happiness as you give me.',
      'Here\'s to the next 25, and many more, hand in hand.',
    ],
    bn: 'পঁচিশ বছরের রাজকন্যাকে জন্মদিনের অনেক অনেক শুভেচ্ছা আর ভালোবাসা।',
  },
  26: {
    en: [
      'Happy 26th birthday, my love!',
      'You have a magic way of turning a house into a home, a plain day into a memory, and my worries into nothing at all.',
      'I am so proud of the woman you are: strong, gentle, wise and full of love. Never forget how special you are.',
      'Make a wish, and know that half of mine are always about you.',
    ],
    bn: 'আমার জীবনের প্রতিটি দিন তোমার জন্যই এত সুন্দর। শুভ জন্মদিন।',
  },
  27: {
    en: [
      'Happy 27th birthday, my Asma!',
      'Life keeps changing, but one thing stays the same: my heart still jumps a little when you smile at me.',
      'Thank you for your patience, your prayers for me and your endless care. I notice all of it, even when I forget to say so.',
      'This year, I wish you rest, joy and everything your heart is quietly hoping for.',
    ],
    bn: 'তোমার সব স্বপ্ন পূরণ হোক, প্রিয়। জন্মদিনে অনেক ভালোবাসা।',
  },
  28: {
    en: [
      'Happy 28th birthday to the love of my life!',
      'I still remember our wedding day like it was yesterday, and yet it feels like I have known you forever.',
      'You are the calm in my storms and the sunshine in my mornings. Every year with you is my favourite year so far.',
      'Let\'s keep growing older and sillier together.',
    ],
    bn: 'আমার সব দোয়ায় তুমি থাকো। শুভ জন্মদিন, আমার আসমা।',
  },
  29: {
    en: [
      'Happy 29th birthday, my darling!',
      'You make everyone around you feel loved, and you make me feel like the luckiest man alive.',
      'I wish you a year full of gentle mornings, good news, and moments that make you say "Alhamdulillah" with a big smile.',
      'I love you more than all the fish in the sea.',
    ],
    bn: 'সমুদ্রের সব মাছের চেয়েও বেশি ভালোবাসি তোমাকে। শুভ জন্মদিন।',
  },
  30: {
    en: [
      'Happy 30th birthday, my beautiful Asma! A brand new chapter starts today.',
      'Your twenties were full of beginnings: our wedding, our home and so many firsts together. I can\'t wait to see what we write in the next chapter.',
      'You are more beautiful, more wise and more loved than ever. Thirty looks wonderful on you.',
      'Here\'s to you, to us, and to forever.',
    ],
    bn: 'তিরিশে পা দেওয়া আমার রাজকন্যাকে জন্মদিনের অফুরন্ত ভালোবাসা।',
  },
};

// After 30 the letter is put together from these, rotated by age so each year still reads differently.
const OPENERS = [
  'Another year of you, and my heart is still just as full.',
  'Every birthday of yours is my favourite holiday of the year.',
  'The world got lucky the day you were born, and I got luckiest of all.',
  'One more year of your laugh, your kindness and your beautiful heart.',
];
const MIDDLES = [
  'Thank you for every cup of tea, every prayer and every hug that makes my days better.',
  'You turn ordinary days into memories and our home into the warmest place on earth.',
  'Through every season you have stood by me, and I will always stand by you.',
  'You grow more beautiful every year, inside and out.',
  'I am so proud of you and everything you are.',
];
const CLOSERS = [
  'Make a wish, my love. I will help it come true.',
  'Here\'s to many, many more birthdays side by side.',
  'I love you today, tomorrow and always.',
];
const BN_LINES = [
  'শুভ জন্মদিন, আমার আসমা। তোমাকে অনেক ভালোবাসি।',
  'আল্লাহ তোমাকে সবসময় ভালো রাখুন। শুভ জন্মদিন।',
  'তুমি আমার জীবনের সবচেয়ে সুন্দর উপহার।',
];

export function letterFor(age) {
  if (LETTERS[age]) return LETTERS[age];
  return {
    en: [
      `Happy ${ordinal(age)} birthday, my love!`,
      OPENERS[age % OPENERS.length],
      MIDDLES[age % MIDDLES.length],
      CLOSERS[age % CLOSERS.length],
    ],
    bn: BN_LINES[age % BN_LINES.length],
  };
}

// Short wishes for the jar; she gets one star for every year of her life.
export const WISHES = [
  'I wish you a year of lazy mornings and big laughs.',
  'May every cup of tea you drink this year be perfect.',
  'I wish you good health, always.',
  'May all your prayers be answered.',
  'I wish you a hundred reasons to smile every day.',
  'May you never forget how beautiful you are.',
  'I wish you sweet dreams every single night.',
  'May your heart always feel light and happy.',
  'I wish you adventures with me, near and far.',
  'May you find joy in all the little things.',
  'I wish you peace when the days get busy.',
  'May your kindness come back to you a thousand times.',
  'I wish you the courage to chase every dream.',
  'May our home always be full of love and laughter.',
  'I wish you cozy rainy days and warm blankets.',
  'May every year be better than the last.',
  'I wish you a garden of flowers that never stop blooming.',
  'May you always feel loved, because you are.',
  'I wish you surprises that make you squeal with joy.',
  'May your smile never fade.',
  'I wish you a lifetime of my hugs.',
  'May you shine brighter than all the stars.',
  'I wish you delicious food and no dishes to wash.',
  'May every wish you make come true.',
  'I wish you friends who love you like family.',
  'May Allah bless you with barakah in everything.',
  'I wish you the sweetest birthday cake ever.',
  'May you laugh until your tummy hurts.',
  'I wish you beautiful sunsets by the sea with me.',
  'May you always be as happy as the fish in our tank.',
  'I wish you long walks and longer talks.',
  'May you feel proud of yourself every day.',
  'I wish you all the chocolate your heart wants.',
  'May every morning greet you with good news.',
  'I wish you calm waters and gentle waves.',
  'May your dreams be big and your worries small.',
  'I wish you a year full of firsts and favourites.',
  'May you always know you are my whole world.',
  'I wish you songs that make you dance in the kitchen.',
  'May our love keep growing every single day.',
  'I wish you everything you wish for yourself.',
  'May you be loved like this forever. (You will be.)',
];

// This year's jar: `age` wishes, starting at a different spot each year.
export function wishesFor(age) {
  const n = Math.min(age, WISHES.length);
  const start = (age * 7) % WISHES.length;
  return Array.from({ length: n }, (_, i) => WISHES[(start + i) % WISHES.length]);
}

// What Asma says in the tank when the celebration starts.
export const BIRTHDAY_LINES = [
  'It\'s my birthday! 🎂',
  'Thank you, Saimun! 💖',
  'Best birthday ever! 🎉',
  'Party with me, fishies! 🥳',
];
