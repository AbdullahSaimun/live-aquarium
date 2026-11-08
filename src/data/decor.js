// Tank decorations a child can buy with pearls. Each has its own fixed spot in scene/reefLayout.js
// (DECOR_SPOTS), so nothing ever lands on top of a creature. Prices start low (the first one on day
// one) and climb to about a week of play for the shipwreck.
export const DECOR = {
  fanCoral: {
    emoji: '🪸',
    price: 5,
    en: { label: 'Rainbow fan coral', blurb: 'A lacy sea fan that slowly changes colour.' },
    bn: { label: 'রংধনু পাখা প্রবাল', blurb: 'জালের মতো পাখা প্রবাল, যার রং ধীরে ধীরে বদলায়।' },
  },
  anchor: {
    emoji: '⚓',
    price: 8,
    en: { label: 'Old anchor', blurb: 'A rusty ship anchor and chain, half sunk in the sand.' },
    bn: { label: 'পুরোনো নোঙর', blurb: 'মরচে ধরা জাহাজের নোঙর আর শিকল, অর্ধেক বালুতে ডোবা।' },
  },
  diver: {
    emoji: '🤿',
    price: 12,
    en: { label: 'Diver helmet', blurb: 'A brass diving helmet that puffs bubbles from the top.' },
    bn: { label: 'ডুবুরির হেলমেট', blurb: 'পিতলের ডুবুরির হেলমেট, মাথা থেকে বুদবুদ ওঠে।' },
  },
  castle: {
    emoji: '🏰',
    price: 15,
    en: { label: 'Sand castle', blurb: 'A little castle with towers, flags and a secret door.' },
    bn: { label: 'বালুর দুর্গ', blurb: 'মিনার, পতাকা আর গোপন দরজাওয়ালা ছোট্ট দুর্গ।' },
  },
  lanterns: {
    emoji: '🏮',
    price: 18,
    en: { label: 'Lantern corals', blurb: 'Round coloured corals that glow like lanterns at night.' },
    bn: { label: 'লণ্ঠন প্রবাল', blurb: 'গোল রঙিন প্রবাল, রাতে লণ্ঠনের মতো জ্বলে।' },
  },
  volcano: {
    emoji: '🌋',
    price: 25,
    en: { label: 'Bubble volcano', blurb: 'A tiny undersea volcano with a warm glow that bursts bubbles.' },
    bn: { label: 'বুদবুদ আগ্নেয়গিরি', blurb: 'উষ্ণ আলোর ছোট্ট সাগরতলের আগ্নেয়গিরি, যা বুদবুদ ছোড়ে।' },
  },
  arch: {
    emoji: '🌉',
    price: 30,
    en: { label: 'Mermaid rock arch', blurb: 'A mossy stone arch that fish love to swim through.' },
    bn: { label: 'মৎস্যকন্যার পাথরের খিলান', blurb: 'শ্যাওলা-ঢাকা পাথরের খিলান, মাছেরা যার ভেতর দিয়ে সাঁতরাতে ভালোবাসে।' },
  },
  shipwreck: {
    emoji: '🚢',
    price: 40,
    en: { label: 'Sunken shipwreck', blurb: 'An old wooden ship resting on the sea floor. Who lives inside?' },
    bn: { label: 'ডুবে যাওয়া জাহাজ', blurb: 'সাগরতলে শুয়ে থাকা পুরোনো কাঠের জাহাজ। ভেতরে কে থাকে?' },
  },
};

export const DECOR_IDS = Object.keys(DECOR);

export const decorText = (id, lang) => DECOR[id][lang] || DECOR[id].en;
