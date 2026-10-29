// Species definitions: body proportions, palettes (index 0 = starter, others unlock with growth) and facts.
export const SPECIES = {
  clownfish: {
    label: 'Clownfish',
    body: [0.42, 0.52, 0.95],
    tail: 'round',
    dorsal: 'round',
    stripes: true,
    size: 0.85,
    colors: [
      { body: '#ff8a3d', fin: '#ff6a1f', accent: '#ffffff' },
      { body: '#ffb347', fin: '#ff9a1f', accent: '#fff6e0' },
      { body: '#ff6b8b', fin: '#ff4f75', accent: '#ffffff' },
    ],
    facts: [
      'Clownfish live inside sea anemones. A slimy coat keeps them from getting stung!',
      'Every clownfish is born a boy. The biggest one in a group can become a girl.',
      'Clownfish talk to each other with little popping and clicking sounds.',
    ],
  },
  blueTang: {
    label: 'Blue Tang',
    body: [0.32, 0.78, 1.0],
    tail: 'fork',
    dorsal: 'long',
    stripes: false,
    size: 1.0,
    colors: [
      { body: '#3d7dff', fin: '#ffd23f', accent: '#1a2f7a' },
      { body: '#5cc8ff', fin: '#ffe66d', accent: '#1f4fa8' },
      { body: '#8a6bff', fin: '#ffd23f', accent: '#3a2a8a' },
    ],
    facts: [
      'Blue tangs have a tiny sharp spine near their tail to protect themselves.',
      'Blue tangs eat algae and help keep coral reefs clean.',
      'When blue tangs sleep, their bright blue color can turn paler.',
    ],
  },
  yellowTang: {
    label: 'Yellow Tang',
    body: [0.3, 0.85, 0.85],
    tail: 'fork',
    dorsal: 'tall',
    stripes: false,
    size: 0.95,
    colors: [
      { body: '#ffd93d', fin: '#ffc300', accent: '#fff3b0' },
      { body: '#c4f25c', fin: '#9be03a', accent: '#f2ffd0' },
      { body: '#ffa8d8', fin: '#ff7cc4', accent: '#ffe6f4' },
    ],
    facts: [
      'Yellow tangs live on reefs in the Pacific Ocean, near Hawaii.',
      'Yellow tangs nibble algae off rocks all day long, like tiny lawnmowers.',
      'A healthy yellow tang can live for more than 30 years!',
    ],
  },
  angelfish: {
    label: 'Angelfish',
    body: [0.26, 0.95, 0.72],
    tail: 'fan',
    dorsal: 'sail',
    stripes: true,
    size: 0.95,
    colors: [
      { body: '#f4f0ff', fin: '#c9b8ff', accent: '#5b4a9c' },
      { body: '#ffe0a8', fin: '#ffc46b', accent: '#7a4f1d' },
      { body: '#a8f0e0', fin: '#62dcc0', accent: '#1d6b5c' },
    ],
    facts: [
      'Freshwater angelfish come from the Amazon River in South America.',
      'Angelfish have tall, flat bodies that help them hide between plants.',
      'Angelfish parents take turns guarding their eggs.',
    ],
  },
  betta: {
    label: 'Betta',
    body: [0.32, 0.45, 0.85],
    tail: 'flowy',
    dorsal: 'flowy',
    stripes: false,
    size: 0.9,
    colors: [
      { body: '#e8364f', fin: '#ff5c7a', accent: '#ffb3c1' },
      { body: '#4f6bff', fin: '#9b5cff', accent: '#d6c8ff' },
      { body: '#ff8c42', fin: '#ffd23f', accent: '#fff0c2' },
    ],
    facts: [
      'Bettas can breathe air from the water surface with a special organ.',
      'Betta fish build bubble nests at the top of the water.',
      'Bettas need warm water and a filter, not a tiny bowl.',
    ],
  },
  batfish: {
    label: 'Batfish',
    body: [0.22, 0.95, 0.72],
    tail: 'fan',
    dorsal: 'bat',
    stripes: true,
    size: 1.0,
    colors: [
      { body: '#dfe6ee', fin: '#9fb2c6', accent: '#3b4658' },
      { body: '#ff9a3d', fin: '#2b2b3d', accent: '#2b2b3d' },
      { body: '#ffe08a', fin: '#ffb84d', accent: '#8a5a1d' },
    ],
    facts: [
      'Young batfish are orange and black, and they float on their side to look like a dead leaf!',
      'Batfish have super tall fins, so underwater they look like a flying bat.',
      'Batfish help coral reefs by eating extra seaweed that could cover the coral.',
    ],
  },
};

export const SPECIES_IDS = Object.keys(SPECIES);

export const PERSONALITIES = {
  playful: { label: 'Playful', speed: 1.25, curiosity: 1.4, sleepiness: 0.7, appetite: 1.0 },
  shy: { label: 'Shy', speed: 0.85, curiosity: 0.5, sleepiness: 1.0, appetite: 0.9 },
  sleepy: { label: 'Sleepy', speed: 0.8, curiosity: 0.8, sleepiness: 1.8, appetite: 0.9 },
  greedy: { label: 'Snacky', speed: 1.05, curiosity: 1.0, sleepiness: 0.9, appetite: 1.4 },
};

export const PERSONALITY_IDS = Object.keys(PERSONALITIES);

export const NAMES = [
  'Bubbles', 'Coral', 'Finn', 'Sunny', 'Pip', 'Splash', 'Marina', 'Nemo', 'Daisy', 'Ziggy',
  'Pearl', 'Wiggles', 'Mango', 'Luna', 'Skipper', 'Blue', 'Peanut', 'Sprinkle', 'Tiki', 'Wave',
];

export const MOODS = {
  happy: { label: 'Happy', emoji: '😊' },
  hungry: { label: 'Hungry', emoji: '🍤' },
  curious: { label: 'Curious', emoji: '👀' },
  sleepy: { label: 'Sleepy', emoji: '💤' },
  weak: { label: 'Weak', emoji: '🥺' },
  playing: { label: 'Playing with Asma', emoji: '🥰' },
  missing: { label: 'Misses Asma', emoji: '💭' },
  scared: { label: 'Scared of the shark!', emoji: '😱' },
  fainted: { label: 'Fainted from fright', emoji: '😵' },
};

export const GENERAL_FACTS = [
  'Fish breathe with gills that take oxygen out of the water.',
  'Coral reefs look like rocks, but corals are actually tiny animals!',
  'Coral reefs cover a tiny part of the ocean, yet a quarter of all sea life lives there.',
  'Feed fish only what they can eat in a couple of minutes. Extra food makes the water dirty.',
  'Fish like a steady routine: feed them at about the same times every day.',
  'Tap gently near a tank, never on the glass. Loud knocks scare fish.',
  'Aquarium fish need clean water, so part of the water is changed every week or two.',
  'Many fish sleep with their eyes open, because they do not have eyelids!',
  'Some fish change color when they are happy, scared, or sleepy.',
  'Never put tap water straight into a tank. It needs to be treated first.',
  'The ocean covers more than two thirds of our planet.',
  'Wild fish should stay in the wild. Good pet fish come from responsible breeders.',
  'Plants in a tank make oxygen and give shy fish places to hide.',
  'Fish can recognize the person who feeds them!',
  'Fish that go too long without food get weak and sick, so feed them on time every day.',
];
