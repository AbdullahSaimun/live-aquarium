// The ocean's own calendar: the moon, and seasonal events on real reefs.

const SYNODIC = 29.530588853; // days from one new moon to the next
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // a known new moon

/** Moon age in days (0 = new moon, ~14.8 = full moon). */
export function moonAge(date = new Date()) {
  const days = (date.getTime() - NEW_MOON) / 86400000;
  return ((days % SYNODIC) + SYNODIC) % SYNODIC;
}

export function moonIcon(date = new Date()) {
  const icons = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
  return icons[Math.round((moonAge(date) / SYNODIC) * 8) % 8];
}

/** Real reefs spawn in the nights around a full moon. */
export function isFullMoon(date = new Date()) {
  return Math.abs(moonAge(date) - SYNODIC / 2) <= 1.2;
}

const md = (date) => (date.getMonth() + 1) * 100 + date.getDate(); // 8 June → 608

// Seasonal events. `id` drives scene extras and visitor odds; en/bn are the "Today in the ocean" notes.
const EVENTS = [
  {
    id: 'oceansDay',
    on: (d) => md(d) === 608,
    icon: '🌍',
    en: 'World Oceans Day! Today people everywhere celebrate the sea and promise to keep it clean.',
    bn: 'আজ বিশ্ব মহাসাগর দিবস! সারা পৃথিবীর মানুষ আজ সাগরকে ভালোবাসে আর পরিষ্কার রাখার প্রতিজ্ঞা করে।',
  },
  {
    id: 'turtles',
    on: (d) => d.getMonth() === 2 || d.getMonth() === 3,
    icon: '🐢',
    en: 'Turtle hatching season: baby sea turtles dig out of the sand and paddle to the sea. Watch for a tiny one!',
    bn: 'কচ্ছপের ছানা ফোটার মৌসুম: ছোট্ট কচ্ছপেরা বালু থেকে বেরিয়ে সাগরে সাঁতরে যায়। একটা ছোট্টটাকে খুঁজে দেখো!',
  },
  {
    id: 'jellyBloom',
    on: (d) => d.getMonth() === 3 || d.getMonth() === 4,
    icon: '🪼',
    en: 'Moon jelly bloom: in spring, warm water makes thousands of moon jellies drift together.',
    bn: 'মুন জেলির মেলা: বসন্তে উষ্ণ পানিতে হাজার হাজার মুন জেলি একসাথে ভেসে বেড়ায়।',
  },
  {
    id: 'whales',
    on: (d) => d.getMonth() >= 6 && d.getMonth() <= 9,
    icon: '🐋',
    en: 'Whale migration season: humpback whales travel thousands of kilometres to warm seas to have their babies.',
    bn: 'তিমির ভ্রমণের মৌসুম: হাম্পব্যাক তিমি বাচ্চা জন্ম দিতে হাজার হাজার কিলোমিটার পাড়ি দিয়ে উষ্ণ সাগরে যায়।',
  },
];

const FULL_MOON = {
  id: 'fullMoon',
  icon: '🌕',
  en: 'Full moon! On nights like this, real corals release millions of tiny eggs that float up like pink snow.',
  bn: 'পূর্ণিমা! এমন রাতে আসল প্রবালেরা লাখ লাখ ছোট্ট ডিম ছাড়ে, যা গোলাপি তুষারের মতো ওপরে ভেসে যায়।',
};

const PLAIN = {
  id: 'plain',
  en: 'A calm day on the reef. The moon tonight looks like this:',
  bn: 'প্রবাল প্রাচীরে আজ শান্ত দিন। আজ রাতের চাঁদ দেখতে এমন:',
};

/** Today's events, most special first; there is always at least one note. */
export function todayInOcean(date = new Date()) {
  const list = EVENTS.filter((e) => e.on(date));
  if (isFullMoon(date)) list.unshift(FULL_MOON);
  if (!list.length) list.push({ ...PLAIN, icon: moonIcon(date) });
  return list;
}

export function hasEvent(id, date = new Date()) {
  return todayInOcean(date).some((e) => e.id === id);
}

/** Today, or in development a date from the address bar (?date=2027-04-10) to preview events. */
export function oceanDate() {
  if (import.meta.env.DEV && typeof location !== 'undefined') {
    const forced = new URLSearchParams(location.search).get('date');
    if (forced) {
      const d = new Date(`${forced}T20:00:00`);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return new Date();
}
