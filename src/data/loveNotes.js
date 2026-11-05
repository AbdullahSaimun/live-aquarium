// Saimun's letters to Asma. She opens the 💍 letter almost every day, so each one is put together
// from several rotating pieces (greeting, note, surprise, P.S., Bangla line, sign-off) whose pool sizes
// don't share factors: the same full letter doesn't come back for years. Anniversaries get their own
// hand-written letters plus love coupons, and yearly anniversaries add promises.
const pick = (list, i) => list[((i % list.length) + list.length) % list.length];
const plural = (n, word) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

// ---------- greetings (by time of day) ----------
const GREETINGS = {
  morning: [
    'Good morning, my sunshine ☀️',
    'Rise and shine, my beautiful wife 🌅',
    'Good morning, jaan. Did you sleep well? 🌼',
    'Shuprobhat, my love ☕',
    'Morning, sleepyhead. The fish and I are waiting for your smile 🐠',
    'Good morning to the reason I wake up smiling 🌞',
    'A fresh new morning, and you are still my favourite thing in it 🌷',
  ],
  afternoon: [
    'Hello, my love. How is your afternoon going? 🌤️',
    'Good afternoon, beautiful 🌸',
    'A little love note for your afternoon, Asma 💌',
    'Hi jaan! Taking a little break? Read this first 🍵',
    'Middle of the day, and I am thinking about you (again) 🤭',
  ],
  evening: [
    'Good evening, my moonlight 🌆',
    'Hello, my sweetheart. The day is almost done 🌇',
    'Evening, beautiful. Tea time with me? ☕',
    'The sun is going down, but you are still glowing ✨',
    'Shubho shondhya, my love 🌙',
  ],
  night: [
    'Still awake, my moon? 🌙',
    'Good night, my love. One last note before you sleep 💤',
    'Hello, night owl 🦉 Go to sleep soon, okay?',
    'Under all these stars, I still only see you ⭐',
    'Sweet dreams are waiting for you, jaan 🌌',
  ],
};

export function partOfDay(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// ---------- the main daily note (61 notes, never the same two days in a row) ----------
const NOTES = [
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
  'I keep a secret list of everything I love about you. It is getting very, very long.',
  'When you are near, my heart does a little barrel roll, just like the fish when you tap them.',
  'You don\'t have to do anything special today. Just being you is already more than enough.',
  'I hope today is gentle with you. And if it isn\'t, come to me, and I\'ll be gentle for it.',
  'Your hand in mine is my favourite place in the whole world.',
  'Whenever I pray, your name comes before mine.',
  'I love how your eyes light up when you talk about the things you love.',
  'You turned "me" into "us", and "us" is the best thing I have ever been part of.',
  'Even on my worst days, one message from you fixes everything.',
  'I married my favourite person, and I still can\'t believe my luck.',
  'You are prettier than every coral reef in every ocean. (I checked.)',
  'Thank you for laughing at my silly jokes, even the really bad ones.',
  'I love our little home, because you are in it.',
  'You are the first good news of every day.',
  'If love were an ocean, mine for you would have no shore.',
  'You make me want to be a better man, every single day.',
  'I love the way you say my name. Say it again today, please?',
  'No matter how busy the day gets, a corner of my mind is always just for you.',
  'Some days I just watch you and think: Alhamdulillah, she is mine.',
  'You are brave, kind and beautiful, and you don\'t even know how much.',
  'The best part of coming home is the moment I see you.',
  'You are my peace in a noisy world.',
  'I love you in the big moments, and I love you even more in the tiny ones.',
  'Our story is my favourite story, and we are only on the first pages.',
  'I hope you know that you are loved, deeply and completely, every second.',
  'You are the sweetest chapter of my life, and I want to read it forever.',
  'Every time you smile at me, I fall in love all over again.',
  'You make tea taste sweeter, rain sound softer and nights feel warmer.',
  'If you ever feel tired today, remember someone is very, very proud of you.',
  'I love how you make plans, and I love being part of every one of them.',
  'Thank you for choosing me, every day, in a hundred little ways.',
  'Your kindness is the most beautiful thing about you, and that says a lot.',
  'You are not just my wife. You are my favourite person to do nothing with.',
  'The moon is pretty tonight, but have you seen my wife?',
  'I promise to always be your safe place.',
  'I love you more than all the fish in the sea, and our tank has a lot of fish.',
  'Life with you is my answered prayer.',
  'Even after a whole day apart, you are the first thing I want to tell everything to.',
  'You have the softest heart I know. I will always protect it.',
  'I hope you smile at least once today because of me. This note is my first try.',
  'There is no "too much" when it comes to loving you.',
  'Thank you for being patient with me, and for loving me anyway.',
  'You and me against the world, and the world doesn\'t stand a chance.',
  'You are beautiful when you laugh, when you think, and even when you are sleepy.',
  'I could write you a letter every day for a hundred years and still have more to say.',
  'Wherever you are reading this, I wish I were right there next to you.',
  'You light up my life brighter than the jellyfish at night.',
  'Home is not a place. Home is wherever you are smiling.',
  'I am so lucky that my forever has your name on it.',
];

// ---------- today's little surprise (tap to open) ----------
const SURPRISES = [
  {
    kind: 'reason',
    icon: '💖',
    label: 'A reason I love you',
    items: [
      'Your smile, which could light up the whole ocean.',
      'The way you look after everyone, even when you are tired.',
      'Your laugh when something is really, truly funny.',
      'How you remember the tiny things I say.',
      'Your beautiful, honest heart.',
      'The way you say "Saimun" when you want something 😄',
      'Your prayers for me that I don\'t even know about.',
      'How you make our home feel warm.',
      'Your patience with me, even when I am being silly.',
      'Your eyes. Just your eyes.',
      'How brave you are when things get hard.',
      'Your cooking, and the love you put in it.',
      'How you get excited about little things.',
      'The way you hold my hand without thinking.',
      'Your sleepy face in the morning.',
      'Your gentle voice when I am upset.',
      'How you dream big and work hard.',
      'The way you make everyone feel welcome.',
      'How beautiful you look without even trying.',
      'Your sense of humour, even the slightly evil parts 😈',
      'How you care about animals, even our little fish.',
      'Because you are you, and there is no one else like you.',
      'The way you listen, really listen.',
      'Your strength, which you never show off.',
    ],
  },
  {
    kind: 'promise',
    icon: '🤝',
    label: 'A little promise',
    items: [
      'I will always make your tea when you are tired.',
      'I will hold your hand every time we cross the road.',
      'I will listen first and talk after (I\'m trying!).',
      'I will never go to sleep angry with you.',
      'I will always say sorry when I am wrong.',
      'I will tell you you\'re beautiful, often, because it\'s true.',
      'I will always keep the last bite for you.',
      'I will cheer the loudest for every dream you chase.',
      'I will pray for you in every prayer.',
      'I will keep making you laugh, even with my bad jokes.',
      'I will be your umbrella on every rainy day.',
      'I will choose you, again and again.',
      'I will never stop writing you letters.',
      'I will keep you warm on every cold winter night.',
      'I will protect your heart like treasure.',
      'I will always come home to you.',
      'I will learn your favourite things, and remember them all.',
    ],
  },
  {
    kind: 'date',
    icon: '🗓️',
    label: 'Let\'s do this soon',
    items: [
      'A long rickshaw ride with no destination.',
      'Fuchka from the best stall in town. My treat.',
      'A walk in the rain, then hot tea at home.',
      'Watching the sunset together, phones away.',
      'Cooking dinner together. You\'re the chef, I\'m the helper.',
      'A trip to the sea, to say hello to real fish.',
      'A picnic on the roof with a blanket and snacks.',
      'Looking at the stars and naming them after us.',
      'A movie night with your favourite film and too much popcorn.',
      'Visiting the place where we first met.',
      'A slow morning breakfast with nowhere to go.',
      'Buying flowers together, and you choose them all.',
      'A long late-night talk about our dreams.',
      'An evening walk to get ice cream.',
      'Taking silly photos together all day.',
      'Planning our dream trip, one country at a time.',
      'Reading the same book, then talking about it.',
      'A whole day of no plans, just us.',
      'A boat ride on the river at golden hour.',
    ],
  },
  {
    kind: 'dare',
    icon: '😜',
    label: 'Your tiny mission today',
    items: [
      'Send me a selfie right now. Yes, right now 📸',
      'Tell me one thing that made you smile today.',
      'Give me a big hug the next time you see me. No excuses.',
      'Drink a big glass of water. I care about you 💧',
      'Say "I love you" to me in the silliest voice you can.',
      'Feed the fish in our tank and tell them I said hi 🐠',
      'Take a 5-minute break and just breathe. You deserve it.',
      'Send me the emoji that describes your day.',
      'Smile at yourself in the mirror. That\'s my favourite face.',
      'Tell me what you want for dinner, and I\'ll make it happen.',
      'Do one thing today just for you.',
      'Call me, just to say hello.',
      'Write down one dream, and tell me about it tonight.',
      'Eat something sweet. Doctor Saimun\'s orders 🍫',
    ],
  },
  {
    kind: 'question',
    icon: '💭',
    label: 'A question for you',
    items: [
      'What was your favourite moment of our wedding day?',
      'If we could go anywhere tomorrow, where would we go?',
      'What is one thing I do that always makes you smile?',
      'What do you want our home to look like in five years?',
      'Which fish in our tank is the most like you? And me?',
      'What is one dream you have never told anyone?',
      'What is your favourite memory of us so far?',
      'If you could eat one meal forever, what would it be?',
      'What should we name our next fish?',
      'What song reminds you of us?',
      'What made you say yes to me? (I ask because I still can\'t believe it.)',
      'What would make tomorrow a perfect day for you?',
      'What is something new you want us to try together?',
    ],
  },
];

// ---------- P.S. lines, by season in Bangladesh ----------
const SEASON_PS = {
  winter: [
    'It\'s chilly these days. Wear something warm, okay? 🧣',
    'Winter mornings are better with pitha and you.',
    'If you are cold, my hugs are free and unlimited 🤗',
    'Let\'s share a blanket and a cup of hot tea tonight ☕',
  ],
  spring: [
    'The flowers are blooming, but none of them are as pretty as you 🌸',
    'Spring is here, and so is my love for you, as always.',
    'Hot day? Drink lots of water, my love 💧',
    'Mango season is coming. I already saved the best ones for you 🥭',
  ],
  monsoon: [
    'If it rains today, think of me 🌧️',
    'Rainy days are made for tea, khichuri and you.',
    'Don\'t forget your umbrella. Or call me, and I\'ll be your umbrella ☔',
    'Listen to the rain tonight. Every drop is saying I love you.',
  ],
  autumn: [
    'The sky is so blue these days. It reminds me of our ocean 🌤️',
    'The kash flowers are swaying, and I\'m swaying thinking of you.',
    'The evenings are getting softer. So is my heart when I think of you.',
    'Autumn moon tonight. Look up, and know I\'m looking too 🌕',
  ],
};

export function seasonOf(month) {
  if (month === 11 || month <= 1) return 'winter';
  if (month <= 4) return 'spring';
  if (month <= 8) return 'monsoon';
  return 'autumn';
}

// ---------- rotating Bangla lines and sign-offs ----------
const BN_LINES = [
  'ভালোবাসি তোমাকে, আসমা ❤️',
  'তুমি আমার সবচেয়ে প্রিয় মানুষ 💕',
  'তোমাকে ছাড়া আমি অসম্পূর্ণ 🌸',
  'তুমি আমার শান্তি, আমার ঘর 🏡',
  'আমার প্রতিটি দোয়ায় তুমি থাকো 🤲',
  'তোমার হাসিটাই আমার সবচেয়ে প্রিয় 😊',
  'সারাজীবন তোমার পাশে থাকব, ইনশাআল্লাহ 💍',
  'তুমি আমার জীবনের সবচেয়ে সুন্দর উপহার 🎁',
  'প্রতিদিন তোমাকে আরও বেশি ভালোবাসি 💖',
  'আমার চাঁদ, আমার আসমা 🌙',
  'তুমি পাশে থাকলে সব সহজ লাগে 🤍',
];

const SIGNS = [
  'Forever yours,',
  'Always yours,',
  'Your silly husband,',
  'All my love, today and every day,',
  'Yours, completely,',
  'With all my heart,',
  'Your biggest fan,',
];

const BONUS = [
  'You are cuter than a baby pufferfish. That is scientifically proven.',
  'Just a reminder: you are amazing.',
  'Hug incoming in 3… 2… 1… 🤗',
  'I just smiled thinking about you. Again.',
  'You have the prettiest smile in the whole ocean.',
  'Saimun loves Asma. Repeat that 100 times 💕',
  'You are my favourite notification.',
  'Okay, one more: I love you.',
  'If kisses were bubbles, this tank would be full 🫧',
  'You make my heart go "blub blub" 🐠',
  'You are doing great. I\'m proud of you.',
  'Even the shark is scared of how much I love you 🦈',
  'Fun fact: my favourite person is reading this right now.',
  'You deserve all the good things today.',
  'Wishing I could hold your hand right now 🤍',
  'Plot twist: I love you even more than yesterday.',
];

export function bonusNote(seen) {
  const left = BONUS.filter((b) => !seen.includes(b));
  return left[Math.floor(Math.random() * left.length)] ?? BONUS[0];
}
export const BONUS_LIMIT = 3;

// ---------- special days through the year ----------
let hijriFormat;
function hijri(date) {
  try {
    hijriFormat ??= new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric' });
    const parts = hijriFormat.formatToParts(date);
    const get = (type) => Number(parts.find((p) => p.type === type)?.value);
    return { month: get('month'), day: get('day') };
  } catch {
    return null; // no Islamic calendar in this browser: just skip Eid and Ramadan
  }
}

/** A festival or family date, or null. Returns { icon, text }. */
export function occasionFor(date) {
  const m = date.getMonth();
  const d = date.getDate();
  const h = hijri(date);
  // Bangladesh usually sees the moon a day after the Umm al-Qura calendar, so allow a few days.
  if (h?.month === 10 && h.day <= 4) return { icon: '🌙', text: 'Eid Mubarak, my love! May Allah fill our home with happiness. Now, where is my Eid salami? 😄' };
  if (h?.month === 12 && h.day >= 10 && h.day <= 14) return { icon: '🕌', text: 'Eid Mubarak, jaan! May Allah accept our sacrifices and keep us together always.' };
  if (m === 0 && d === 1) return { icon: '🎆', text: 'Happy New Year, my love! Another whole year to love you. I can\'t wait.' };
  if (m === 0 && d === 31) return { icon: '🎈', text: 'It\'s my birthday today, and my best gift is already here: you.' };
  if (m === 1 && d === 14) return { icon: '🌼', text: 'Happy Valentine\'s Day and Pohela Falgun! Wear something yellow and let me bring you flowers.' };
  if (m === 3 && d === 14) return { icon: '🎊', text: 'Shubho Noboborsho! Happy Pohela Boishakh, my love. A new Bangla year to make memories with you.' };
  if (m === 11 && d === 23) return { icon: '🎂', text: 'Happy birthday, my love! Your birthday surprise is waiting behind the 🎂 button.' };
  if (h?.month === 9) return { icon: '🌙', text: `Ramadan Mubarak. Day ${h.day} of Ramadan, and I am so grateful to share every sehri and iftar with you.` };
  if (date.getDay() === 5) return { icon: '🤲', text: 'Jumma Mubarak. Today, in every prayer, I am thanking Allah for you.' };
  return null;
}

// ---------- day-count milestones ----------
const ROUND_DAYS = { 7: 'one whole week', 10: '10 days', 50: '50 days', 100: '100 days', 365: '365 days', 500: '500 days', 1000: '1,000 days' };

export function milestoneFor(days) {
  if (ROUND_DAYS[days]) return { days, label: ROUND_DAYS[days] };
  if (days > 0 && days % 100 === 0) return { days, label: `${days.toLocaleString()} days` };
  if (days >= 1000 && /^(\d)\1+$/.test(String(days))) return { days, label: `${days.toLocaleString()} days` }; // 1111, 2222…
  return null;
}

// ---------- the everyday letter ----------
/**
 * Everything for an ordinary day's letter. `days` is days since the wedding, `now` the current time,
 * `visit` what recordVisit() returned.
 */
export function dailyLetter(days, now, visit) {
  const surprise = SURPRISES[days % SURPRISES.length];
  const season = SEASON_PS[seasonOf(now.getMonth())];
  return {
    greeting: pick(GREETINGS[partOfDay(now.getHours())], days),
    note: pick(NOTES, days),
    occasion: occasionFor(now),
    milestone: milestoneFor(days),
    welcome: welcomeLine(visit),
    surprise: { ...surprise, items: undefined, text: pick(surprise.items, Math.floor(days / SURPRISES.length)) },
    ps: days % 2 ? pick(season, Math.floor(days / 2)) : null,
    bn: pick(BN_LINES, days),
    sign: pick(SIGNS, days),
  };
}

// A line about how often she comes back to read the letters.
function welcomeLine(visit) {
  if (!visit) return null;
  const { count, streak, gap, opensToday } = visit;
  if (count === 1 && opensToday === 1) {
    return 'This is the very first letter you\'ve opened in our little ocean. I\'ll write you a new one every single day, so come back tomorrow 💌';
  }
  if (opensToday === 2) return 'Back again today? I was hoping you would. Here\'s an extra kiss 😘';
  if (opensToday > 2) return `Opened ${opensToday} times today! Someone misses me 🥰 (I miss you more.)`;
  if (gap >= 3) return `You were away for ${gap} days, and the fish and I missed you so much 🥺`;
  if ([7, 14, 30, 50, 100, 200, 365].includes(streak)) return `You've opened my letter ${streak} days in a row! 🔥 You make me so happy.`;
  if (count % 25 === 0) return `This is letter number ${count} you've read. Every one of them was written with love 💕`;
  return null;
}

// ---------- anniversary letters ----------
// Months 1–11 of the first year each have their own letter (the wedding was on 29 September 2026).
const MONTH_LETTERS = {
  1: [
    'One month ago you became my wife, and I still smile like a fool every time I say "my wife".',
    'This month I learned what home really means: it\'s your slippers next to mine, your voice in the kitchen, and your hand finding mine in the dark.',
    'Thank you for the most beautiful first month of my life. Only a lifetime more to go.',
  ],
  2: [
    'Two months of being your husband, and I have already collected a hundred favourite memories. Our little ocean, your sleepy "good morning", the way you laugh at my jokes before I finish them.',
    'Like the fish in our tank, I have found my favourite spot, and it\'s right next to you.',
    'Next month is your birthday, then another anniversary. How did I get this lucky? Alhamdulillah.',
  ],
  3: [
    'Three months ago we said "forever", and just a few days ago we celebrated your very first birthday as husband and wife.',
    'Watching you blow out those candles, I made a wish too. I wished for this: more days exactly like the ones we are having now.',
    'Thank you for three months of laughter, patience and love. You make winter feel warm.',
  ],
  4: [
    'Four months together! The nights are cold, but with you everything feels warm, like a blanket fresh from the sun.',
    'I love our winter evenings: hot tea, your head on my shoulder, and the whole world going quiet around us.',
    'In two days it\'s my birthday, but honestly, I already have everything I could ever wish for.',
  ],
  5: [
    'Five months, my love, and Falgun is here. The whole city is wearing yellow and red, and none of it is as pretty as you.',
    'Every month with you feels like a new season blooming. You make my life greener, brighter and softer.',
    'Thank you for every little thing you do for us. I see all of it, and I love you for all of it.',
  ],
  6: [
    'Half a year! Six months ago I was nervous, excited and so, so happy. Today I am just happy, and a little bit more in love.',
    'In six months you have taught me patience, kindness and how to fold a shirt properly. Most importantly, you taught me how good it feels to be truly loved.',
    'Here\'s to the next six months, and the six hundred after that, insha\'Allah.',
  ],
  7: [
    'Seven months together, and a brand new Bangla year has just begun. Shubho Noboborsho, my love.',
    'If every year starts fresh, I want every one of them to start with you: your laugh, your plans and your hand in mine.',
    'Seven is a lucky number, and so am I, because I married you.',
  ],
  8: [
    'Eight months, my mango-season queen 🥭 The days are hot, but your smile is still the brightest thing around.',
    'I love how we have built our little routines: who makes the tea, who steals the blanket (you), and who says sorry first (usually me, and that\'s okay).',
    'Thank you for making our house the happiest place I know.',
  ],
  9: [
    'Nine months of us, and the rain has come back. Every rainy evening with you feels like a scene from a beautiful film.',
    'I love listening to the rain with you, watching you smile at the window, and knowing there is nowhere else I would rather be.',
    'You are my shelter in every storm, and I promise to always be yours.',
  ],
  10: [
    'Ten months together! Ten months of good mornings, good nights and a thousand "I love you"s in between.',
    'Sometimes I look back at our first month and smile. We have grown so much, and we are still growing, side by side, like the coral in our tank.',
    'Two more months until our first year. My heart is already celebrating.',
  ],
  11: [
    'Eleven months, my love. One more month and it will be a whole year.',
    'It has been a year of firsts: first home, first birthdays together, first fights and first make-ups, first trips and first rainy days. Every first was better because it was with you.',
    'Thank you for walking this beautiful year with me. Get ready, because next month I\'m celebrating you properly.',
  ],
};

// After the first year: month letters built from a pool, rotated so each one reads differently.
const LATER_MONTH = [
  [
    'Another month of us! Time flies so fast with you, but every day still feels like a gift.',
    'I hope you know you are still my favourite person to wake up to and my favourite face to come home to.',
  ],
  [
    'Every month I think I can\'t love you more, and every month you prove me wrong.',
    'Thank you for being my partner in everything: the boring chores, the big dreams and all the silly moments in between.',
  ],
  [
    'Happy monthsary, my love! I still remember how my heart was racing on our wedding day. It still races for you.',
    'You make every ordinary week feel like a celebration.',
  ],
  [
    'One more month to add to our story, and it\'s my favourite story ever written.',
    'Thank you for your prayers, your patience and your endless kindness. Our home is full of love because of you.',
  ],
  [
    'Happy anniversary, jaan! Here\'s another month of being the luckiest husband alive.',
    'I hope this month brings you good health, peace and a hundred little reasons to smile.',
  ],
];

// Yearly anniversaries: the first five each have their own letter.
const YEAR_LETTERS = {
  1: [
    'One year ago today, on 29 September 2026, you became my wife, and I became the happiest man in the world.',
    'What a year it has been: our first home, our first birthdays together, our first Eid, our first winter, our first rainy season, our first fights and every sweet "sorry" after. I loved every single one of them, because they were ours.',
    'You have made me braver, kinder and so much happier than I ever thought I could be. I have watched you turn a house into a home and an ordinary life into something beautiful.',
    'If someone told me I could go back and choose again, I would run to you even faster. Happy first anniversary, my love. This is only the beginning.',
  ],
  2: [
    'Two years, my love! Two years of you and me, and I still get butterflies when you smile at me across the room.',
    'This year we grew up a little together. We learned when to talk and when to just hold hands, when to laugh and when to listen.',
    'Thank you for being my best friend through all of it. Every day with you is my favourite day, even the hard ones, because we get through them together.',
    'Here\'s to year three, and to every adventure still waiting for us.',
  ],
  3: [
    'Three years of marriage, Asma. Three years of the most beautiful life I could have asked for.',
    'I love the life we have built: our routines, our inside jokes, our little traditions. Most of all, I love that I get to share all of it with you.',
    'You are the heart of our home. Whatever I achieve, half of it is yours, because you are always behind me, praying for me and believing in me.',
    'I love you more today than three years ago, and somehow I know I\'ll love you even more next year.',
  ],
  4: [
    'Four years together! Four years of waking up next to my favourite person.',
    'We have seen happy days and hard days, and through all of them, you have held my hand. I will never forget that.',
    'You still make my heart race like it did on our wedding day. Maybe even more.',
    'Thank you for four years of love, laughter and the warmest home in the world. Forever is not long enough with you.',
  ],
  5: [
    'Five whole years, my love! Half a decade of being your husband.',
    'When I look back, I don\'t remember the big days the most. I remember the small ones: tea on the balcony, laughing at nothing, falling asleep mid-conversation.',
    'Those small days, with you, are my whole happy life.',
    'Thank you for five beautiful years. I would marry you again tomorrow, and the day after, and every day after that.',
  ],
};

const YEAR_LATER = [
  'Every year with you is better than the one before, and this one was no different.',
  'We have grown, changed and learned so much together, but one thing has stayed the same: I am still completely in love with you.',
  'Thank you for every prayer, every hug, every cup of tea and every time you believed in me.',
  'Forever with you still doesn\'t feel long enough.',
];

/** The special letter for a month or year anniversary. */
export function anniversaryLetter(status) {
  const { months, years, isYearDay, days } = status;
  if (isYearDay) {
    const paragraphs = YEAR_LETTERS[years] ?? [
      `${years} years ago today, we promised each other forever, and every day since has proved that promise right.`,
      ...YEAR_LATER,
      `That's ${plural(days, 'day')} of you and me. Here's to every day still to come.`,
    ];
    return { paragraphs, coupons: couponsFor(months, 3), promises: promisesFor(years) };
  }
  let paragraphs = MONTH_LETTERS[months];
  if (!paragraphs) {
    const rest = months % 12;
    const span = `${plural(years, 'year')} and ${plural(rest, 'month')}`;
    paragraphs = [`Today it has been ${span} since you became my wife.`, ...pick(LATER_MONTH, months)];
  }
  return { paragraphs, coupons: couponsFor(months, 1), promises: null };
}

// ---------- love coupons (one each month, three on a yearly anniversary) ----------
// 25 coupons: 25 shares no factor with 3, so every coupon gets its turn before any repeats.
const COUPONS = [
  { icon: '🛺', text: 'One long rickshaw ride, just the two of us' },
  { icon: '🥞', text: 'Breakfast in bed, made by me' },
  { icon: '👑', text: 'One whole day where you decide everything' },
  { icon: '💆‍♀️', text: 'A relaxing massage after a long day' },
  { icon: '🎬', text: 'Movie night: your pick, no complaints from me' },
  { icon: '🍽️', text: 'A surprise dinner date' },
  { icon: '🧽', text: 'I wash the dishes for a whole week' },
  { icon: '💐', text: 'A bouquet of your favourite flowers' },
  { icon: '🌊', text: 'A trip to the sea to see real fish' },
  { icon: '🛍️', text: 'A shopping day where I carry every bag' },
  { icon: '🥟', text: 'Unlimited fuchka, as many as you want' },
  { icon: '☕', text: 'Your tea made just right, every morning for a week' },
  { icon: '📸', text: 'A photo day: I\'m your personal photographer' },
  { icon: '🌃', text: 'A late-night drive with your favourite songs' },
  { icon: '🍦', text: 'Ice cream on demand, no questions asked' },
  { icon: '📵', text: 'One whole day with no phones, just us' },
  { icon: '✉️', text: 'A handwritten letter on real paper' },
  { icon: '🤗', text: 'Unlimited hugs, valid forever' },
  { icon: '🙇‍♂️', text: 'One "You were right, I was wrong", no arguing' },
  { icon: '🧺', text: 'A rooftop picnic under the stars' },
  { icon: '🍳', text: 'I cook your favourite meal (and clean up after)' },
  { icon: '😴', text: 'A lazy Friday: you rest, I do everything' },
  { icon: '🎁', text: 'One surprise gift, chosen just for you' },
  { icon: '🚤', text: 'A boat ride on the river at sunset' },
  { icon: '🌅', text: 'Watching the sunrise together, with tea' },
];

function couponsFor(months, count) {
  return Array.from({ length: count }, (_, i) => {
    const index = (months - 1) * 3 + i; // each anniversary starts somewhere new
    return { ...pick(COUPONS, index), id: `m${months}-${i}` };
  });
}

// ---------- yearly promises (flip cards) ----------
const PROMISES = [
  'I promise to make you laugh every single day.',
  'I promise to hold your hand through every storm.',
  'I promise to keep falling in love with you.',
  'I promise to always listen, even when I\'m tired.',
  'I promise to keep our home full of love and peace.',
  'I promise to support every dream you chase.',
  'I promise to pray for you, always.',
  'I promise to never stop dating you.',
  'I promise to say sorry first.',
  'I promise to be your safe place, forever.',
  'I promise to keep writing you letters.',
  'I promise to grow old and silly with you.',
];

function promisesFor(years) {
  return Array.from({ length: 3 }, (_, i) => pick(PROMISES, (years - 1) * 3 + i));
}

// Lines Asma says in the tank after reading an everyday letter.
export const DAILY_TANK_LINES = [
  ['I love you, Saimun! 💕', 'Every day with you is a gift! 💖', 'Love you more today! 💕'],
  ['Thank you for my letter! 💌', 'You make me so happy! 🥰', 'Best husband ever! 💖'],
  ['Saimun is the sweetest! 🍬', 'My heart is so full! 💗', 'Read it twice already! 💌'],
  ['Love you to the ocean floor! 🌊', 'You are my favourite! 💕', 'Forever yours! 💍'],
];


// ---------- remembering her visits and claimed coupons (this browser only) ----------
const VISITS_KEY = 'my-little-ocean:love-visits';
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const DAY = 24 * 60 * 60 * 1000;

function readVisits() {
  try {
    return JSON.parse(window.localStorage.getItem(VISITS_KEY)) || {};
  } catch {
    return {};
  }
}

function writeVisits(v) {
  try {
    window.localStorage.setItem(VISITS_KEY, JSON.stringify(v));
  } catch {
    // private mode: the letter still works, it just can't count visits
  }
}

/** Call once each time the letter is opened. Returns { count, streak, gap, opensToday }. */
export function recordVisit(now = new Date()) {
  const v = readVisits();
  const key = dayKey(now);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (v.last === key) {
    v.opensToday = (v.opensToday || 1) + 1;
    writeVisits(v);
    return { count: v.count, streak: v.streak, gap: 0, opensToday: v.opensToday };
  }
  const [y, m, d] = (v.last || '').split('-').map(Number);
  const gap = v.last ? Math.round((today - new Date(y, m - 1, d)) / DAY) : Infinity;
  v.count = (v.count || 0) + 1;
  v.streak = gap === 1 ? (v.streak || 1) + 1 : 1;
  v.last = key;
  v.opensToday = 1;
  writeVisits(v);
  return { count: v.count, streak: v.streak, gap, opensToday: 1 };
}

export const isClaimed = (id) => Boolean(readVisits().claimed?.[id]);

export function claimCoupon(id) {
  const v = readVisits();
  v.claimed = { ...v.claimed, [id]: Date.now() };
  writeVisits(v);
}
