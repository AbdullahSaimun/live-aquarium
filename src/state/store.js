import { useSyncExternalStore } from 'react';
import { SPECIES, PERSONALITIES, PERSONALITY_IDS, NAMES } from '../data/species';
import { loadSave, writeSave, clearSave } from './persistence';
import { world, spawnPellet, activePellets, clearPellets, queueEffect } from '../sim/world';
import { playSound } from '../audio/sounds';
import { allFacts } from '../data/factsBn';
import { startVisit, snackSpot } from '../sim/asmaBrain';

export const MAX_FISH = 10;
export const HUNGER_RATE = 1 / 200; // per second, before personality appetite
const FULL_DECAY = 1 / 75; // fullness drains per second
const PELLET_FULLNESS = 0.34; // ~3 pellets fill a fish up
const GROWTH_PER_PELLET = 0.05;
const AFFECTION_PER_PELLET = 0.05;
export const FLIP_TIME = 0.7;
const COLOR_UNLOCKS = [0.5, 1]; // growth milestones that unlock palette 1 and 2
// Starvation: once hunger is maxed out, health drains; at zero health the fish dies.
const HEALTH_DRAIN = 1 / 600; // ~10 minutes of play while starving
const HEALTH_REGEN = 1 / 90; // recovers while not starving
const HEALTH_PER_PELLET = 0.25;
const OFFLINE_HUNGER_RATE = 1 / 1800; // away from the app: fully hungry after ~30 minutes
const OFFLINE_HEALTH_DRAIN = 1 / (12 * 3600); // then ~12 more hours without food is fatal

let uid = 0;
const newId = () => `f${Date.now().toString(36)}${(uid++).toString(36)}`;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function usedNames(fish) {
  return new Set(fish.map((f) => f.name));
}

function freshName(fish) {
  const used = usedNames(fish);
  const free = NAMES.filter((n) => !used.has(n));
  return free.length ? pick(free) : `${pick(NAMES)} ${fish.length + 1}`;
}

export function createFish(fish, species, overrides = {}) {
  return {
    id: newId(),
    name: freshName(fish),
    species,
    personality: pick(PERSONALITY_IDS),
    colorIdx: 0,
    unlocked: 1,
    growth: 0.3 + Math.random() * 0.12,
    affection: 0.1,
    hunger: 0.55 + Math.random() * 0.25,
    fullness: 0,
    babies: 0,
    health: 1,
    snacks: 0,
    born: Date.now(),
    mood: 'happy',
    ...overrides,
  };
}

// `remembered` holds lost fish, so new fish don't reuse their names.
function starterFish(remembered = []) {
  const fish = [];
  const starters = ['clownfish', 'blueTang', 'yellowTang', 'angelfish', 'betta'];
  for (const s of starters) fish.push(createFish([...fish, ...remembered], s));
  return fish;
}

function sanitizeFish(f) {
  if (!SPECIES[f.species]) return null;
  const clamp = (v, d) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);
  const growth = clamp(f.growth, 0.4);
  const earned = 1 + COLOR_UNLOCKS.filter((m) => growth >= m).length;
  return {
    ...createFish([], f.species),
    ...f,
    growth,
    affection: clamp(f.affection, 0.1),
    hunger: clamp(f.hunger, 0.5),
    fullness: clamp(f.fullness, 0),
    health: clamp(f.health, 1),
    snacks: Number.isFinite(f.snacks) ? f.snacks : 0,
    unlocked: Math.max(earned, Math.min(3, f.unlocked | 0)),
    colorIdx: Number.isInteger(f.colorIdx) && f.colorIdx < 3 ? f.colorIdx : 0,
    mood: 'happy',
  };
}

function memoryOf(f, died = Date.now()) {
  return {
    id: f.id,
    name: f.name,
    species: f.species,
    colorIdx: f.colorIdx,
    growth: f.growth,
    affection: f.affection,
    snacks: f.snacks,
    born: f.born,
    died: Math.max(f.born || died, died),
  };
}

function initialState() {
  const save = loadSave();
  const base = {
    fish: [],
    memorial: [],
    lostWhileAway: [],
    selectedId: null,
    panel: null,
    toasts: [],
    settings: { showNames: true, calmMode: false, factLang: 'bn', sound: true, asmaVisits: true },
    asma: { visible: false, phase: 'idle', line: '', restUntil: 0, missUntil: 0 },
    stats: { pellets: 0, births: 0 },
    hintDismissed: false,
    version: 0,
  };
  if (!save) return { ...base, fish: starterFish() };

  // Catch up on the time spent away: tummies empty, hunger grows, and long neglect costs health.
  const now = Date.now();
  const awaySec = Math.max(0, (now - (save.savedAt || now)) / 1000);
  const memorial = Array.isArray(save.memorial) ? save.memorial : [];
  const alive = [];
  const lost = [];
  for (const f of save.fish.map(sanitizeFish).filter(Boolean).slice(0, MAX_FISH)) {
    f.fullness = Math.max(0, f.fullness - awaySec * FULL_DECAY);
    const hunger = f.hunger + awaySec * OFFLINE_HUNGER_RATE;
    if (hunger > 1) f.health -= ((hunger - 1) / OFFLINE_HUNGER_RATE) * OFFLINE_HEALTH_DRAIN;
    f.hunger = Math.min(1, hunger);
    if (f.health <= 0) {
      // Health hit zero |health| / drain seconds ago.
      const agoSec = Math.min(awaySec, -f.health / OFFLINE_HEALTH_DRAIN);
      memorial.push(memoryOf(f, now - agoSec * 1000));
      lost.push(f.name);
    } else {
      alive.push(f);
    }
  }
  const neverPlayed = !alive.length && !memorial.length;
  return {
    ...base,
    fish: neverPlayed ? starterFish() : alive,
    memorial,
    lostWhileAway: lost,
    settings: { ...base.settings, ...(save.settings || {}) },
    stats: { ...base.stats, ...(save.stats || {}) },
    hintDismissed: !!save.hintDismissed,
  };
}

const state = initialState();
const listeners = new Set();

export function getState() {
  return state;
}

export function emit() {
  state.version++;
  listeners.forEach((l) => l());
}

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const getVersion = () => state.version;

// Re-renders on every emit; selectors read the mutable state directly.
export function useStore(selector) {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  return selector(state);
}

export function save() {
  writeSave(state);
}

// ---------- toasts ----------
let toastId = 0;
const CAN_BUZZ = typeof navigator !== 'undefined' && 'vibrate' in navigator && matchMedia('(pointer: coarse)').matches;
const BUZZ = { plop: 8, squeak: 12, pop: 6, treasure: [15, 40, 15], chime: 10, splash: 20 };

export function sfx(name) {
  if (!state.settings.sound) return;
  playSound(name);
  // Buzz only on touch screens, and only once the child has tapped (browsers block it before).
  if (BUZZ[name] && CAN_BUZZ && navigator.userActivation?.hasBeenActive) {
    try {
      navigator.vibrate(BUZZ[name]);
    } catch {
      // vibration is a bonus
    }
  }
}

export function toast(text, emoji = '🐠', ms = 3200, className = '') {
  if (state.toasts.some((t) => t.text === text)) return;
  const id = ++toastId;
  state.toasts = [...state.toasts.slice(-2), { id, text, emoji, className }];
  emit();
  setTimeout(() => {
    state.toasts = state.toasts.filter((t) => t.id !== id);
    emit();
  }, ms);
}

// ---------- actions ----------
export function findFish(id) {
  return state.fish.find((f) => f.id === id);
}

export function selectFish(id) {
  state.selectedId = id;
  if (id) state.panel = null;
  emit();
}

export function openPanel(panel) {
  state.panel = state.panel === panel ? null : panel;
  if (state.panel) state.selectedId = null;
  emit();
}

export function dismissHint() {
  state.hintDismissed = true;
  emit();
  save();
}

export function setSetting(key, value) {
  state.settings = { ...state.settings, [key]: value };
  emit();
  save();
}

function foodCheck() {
  if (!state.fish.length) return false;
  if (!state.fish.some((f) => f.fullness < 0.95)) {
    toast('Everyone has eaten enough! Let their tummies rest.', '😌');
    return false;
  }
  if (activePellets().length >= 8) {
    toast('Let them finish the food first. Extra food makes the water dirty!', '🧽');
    return false;
  }
  return true;
}

// Drops one pellet exactly where the child tapped in the water.
export function dropFoodAt(point) {
  if (!foodCheck()) return;
  const b = world.bounds;
  const x = Math.max(b.minX - 0.3, Math.min(b.maxX + 0.3, point.x));
  const y = Math.max(world.floorY + 0.3, Math.min(world.dropY + 0.3, point.y));
  const p = spawnPellet(x, point.z, y);
  if (p) {
    p.ping = world.time; // nearby fish notice food placed for them
    queueEffect('bubbles', p.pos, 4);
    sfx('plop');
  }
}

// Tapping empty water first closes an open card or panel; otherwise it drops food there.
export function tapWater(point) {
  if (state.selectedId || state.panel) {
    state.selectedId = null;
    state.panel = null;
    emit();
    return;
  }
  dropFoodAt(point);
}

export function feed() {
  if (!foodCheck()) return;
  const hungryFish = state.fish.filter((f) => f.fullness < 0.95);
  const count = Math.min(5, hungryFish.length + 2);
  const { minX, maxX } = world.bounds;
  const center = minX + Math.random() * (maxX - minX);
  for (let i = 0; i < count; i++) {
    const x = Math.max(minX, Math.min(maxX, center + (Math.random() - 0.5) * 3));
    spawnPellet(x, -1.5 + Math.random() * 3);
  }
  sfx('plop');
}

export function eatPellet(fish, pellet) {
  fish.hunger = Math.max(0, fish.hunger - 0.38);
  fish.fullness = Math.min(1, fish.fullness + PELLET_FULLNESS);
  fish.affection = Math.min(1, fish.affection + AFFECTION_PER_PELLET);
  fish.health = Math.min(1, fish.health + HEALTH_PER_PELLET);
  fish.snacks++;
  fish.warned = false;
  const before = fish.growth;
  fish.growth = Math.min(1, fish.growth + GROWTH_PER_PELLET);
  state.stats.pellets++;
  queueEffect('hearts', pellet.pos, 4);
  queueEffect('bubbles', pellet.pos, 6);
  sfx('pop');

  COLOR_UNLOCKS.forEach((m, i) => {
    if (before < m && fish.growth >= m && fish.unlocked < i + 2) {
      fish.unlocked = i + 2;
      toast(`${fish.name} grew bigger and unlocked a new color!`, '✨');
      sfx('chime');
    }
  });
  if (before < 1 && fish.growth >= 1) toast(`${fish.name} is all grown up!`, '🌟');
  if (fish.fullness >= 0.99) {
    const rt = world.runtime.get(fish.id);
    if (rt) rt.emoteOverride = { type: 'full', time: 2.5 };
    if (fish.id === state.selectedId) toast(`${fish.name} has eaten enough. Yum!`, '😋');
    else if (state.fish.every((f) => f.fullness >= 0.95)) toast('Everyone has eaten enough. Great job!', '😋');
  }

  maybeHaveBaby(fish);
  emit();
  save();
}

function maybeHaveBaby(parent) {
  if (parent.growth < 1 || parent.affection < 0.8 || parent.babies >= 1) return;
  if (state.fish.length >= MAX_FISH) return;
  const baby = createFish([...state.fish, ...state.memorial], parent.species, {
    growth: 0,
    affection: 0.3,
    hunger: 0.6,
    personality: pick(PERSONALITY_IDS),
    colorIdx: Math.floor(Math.random() * parent.unlocked),
    unlocked: parent.unlocked,
  });
  parent.babies++;
  state.stats.births++;
  const rt = world.runtime.get(parent.id);
  if (rt) baby.spawnAt = rt.pos.clone();
  state.fish = [...state.fish, baby];
  toast(`A baby ${SPECIES[parent.species].label} named ${baby.name} was born!`, '🎉', 4500);
  sfx('chime');
}

export function petFish(fish) {
  const now = performance.now();
  const rtNow = world.runtime.get(fish.id);
  if (rtNow) rtNow.flip = FLIP_TIME; // every tap earns a happy barrel roll
  sfx('squeak');
  if (!fish.lastPet || now - fish.lastPet > 8000) {
    fish.lastPet = now;
    fish.affection = Math.min(1, fish.affection + 0.02);
    const rt = world.runtime.get(fish.id);
    if (rt) {
      rt.happyTimer = 1.6;
      queueEffect('hearts', rt.pos, 3);
    }
  }
  selectFish(fish.id);
}

// Treasure chest: a surprise fact plus sparkles, with a short cooldown while the lid is open.
export const CHEST_OPEN_TIME = 5;
let chestOpenedAt = -Infinity;

export function openChest(pos) {
  const now = performance.now() / 1000;
  if (now - chestOpenedAt < CHEST_OPEN_TIME) return false;
  chestOpenedAt = now;
  const lang = state.settings.factLang;
  const fact = pick(allFacts(lang));
  queueEffect('bubbles', pos, 16);
  queueEffect('hearts', pos, 3);
  sfx('treasure');
  state.stats.treasures = (state.stats.treasures || 0) + 1;
  toast(fact.text, '🪙', 7000, lang === 'bn' ? 'bn' : '');
  save();
  return true;
}

export function cycleColor(fish) {
  fish.colorIdx = (fish.colorIdx + 1) % fish.unlocked;
  emit();
  save();
}

// Tells the child, once, about fish lost while the app was closed.
export function announceLosses() {
  const lost = state.lostWhileAway;
  if (!lost.length) return;
  state.lostWhileAway = [];
  const names = lost.join(', ');
  toast(`${names} got too hungry while you were away. Visit 🌈 Memories to remember them.`, '💔', 7000);
}

export function adoptFish() {
  if (state.fish.length) return;
  state.fish = starterFish(state.memorial);
  state.panel = null;
  emit();
  save();
  toast('New fish friends moved in! Remember to feed them.', '🐠', 4000);
}

function killFish(fish) {
  const rt = world.runtime.get(fish.id);
  if (rt) queueEffect('bubbles', rt.pos, 14);
  state.memorial = [...state.memorial, memoryOf(fish)];
  state.fish = state.fish.filter((f) => f !== fish);
  if (state.selectedId === fish.id) state.selectedId = null;
  toast(`${fish.name} got too hungry and passed away. We will always remember ${fish.name} in Memories.`, '💔', 6000);
  sfx('sad');
  save();
}

// Memories survive a reset on purpose: a new tank does not forget lost friends.
export function resetAquarium() {
  clearSave();
  clearPellets();
  world.runtime.clear();
  state.fish = starterFish(state.memorial);
  state.selectedId = null;
  state.panel = null;
  state.stats = { pellets: 0, births: 0 };
  emit();
  save();
  toast('A fresh new aquarium!', '🌊');
}

// ---------- Asma, the kind girl who dives in to visit ----------
const ASMA_REST = 20; // seconds she needs to catch her breath before diving again
const ASMA_MISSED = 90; // how long the fish keep asking for her after she leaves
const HELLO_LINES = ['Here I come! 🏊‍♀️', 'Hello, little fishies! 💕', 'Splash! Can I play with you? 🌊'];
const ARRIVE_LINES = ['Hi friends! I missed you! 💖', 'Look at you, so colorful! 🌈', 'Come here, my little fishies! 🥰'];
const SNACK_LINES = ['Here is a yummy snack! 🍤', 'Snack time, sweeties! 😋', 'One for you, and one for you! 🍤'];
const ADORE_LINES = ['You are so cute! 🥰', 'I love your shiny fins! ✨', 'You swim so beautifully! 💖', 'Best fish friends forever! 🐠'];
const TAP_LINES = ['Hehe, that tickles! 😊', 'Wheee! 💫', 'Hi there! 👋'];
const nowSec = () => performance.now() / 1000;
let nextAsmaIn = 45; // her first surprise visit comes soon; later ones every few minutes

function asmaSays(lines) {
  state.asma = { ...state.asma, line: pick(lines) };
}

export function inviteAsma() {
  if (!state.fish.length) {
    toast('Adopt some fish first, then Asma can visit!', '👧');
    return;
  }
  if (state.asma.phase !== 'idle') {
    toast('Asma is already swimming with the fish! 🏊‍♀️', '💕');
    return;
  }
  const wait = Math.ceil(state.asma.restUntil - nowSec());
  if (wait > 0) {
    toast(`Asma is catching her breath. Ready in ${wait}s! 😮‍💨`, '👧');
    return;
  }
  startVisit();
  state.asma = { ...state.asma, visible: true, phase: 'diving', missUntil: 0 };
  asmaSays(HELLO_LINES);
  state.stats.asmaVisits = (state.stats.asmaVisits || 0) + 1;
  nextAsmaIn = 180 + Math.random() * 120;
  sfx('splash');
  emit();
}

function asmaGiveSnack() {
  const someoneHungry = state.fish.some((f) => f.fullness < 0.95);
  if (someoneHungry && activePellets().length < 6) {
    const p = spawnPellet(0, 0, 0);
    if (p) {
      snackSpot(p.pos);
      p.ping = world.time;
      sfx('plop');
    }
    asmaSays(SNACK_LINES);
  } else {
    asmaSays(ADORE_LINES);
  }
  // Her love rubs off on the fish.
  for (const f of state.fish) f.affection = Math.min(1, f.affection + 0.01);
  queueEffect('hearts', world.asma.pos.clone().setY(world.asma.pos.y + 1.4), 2);
}

// Events from Asma's swim (see sim/asmaBrain.js).
export function asmaEvent(event) {
  if (event === 'arrived') {
    state.asma = { ...state.asma, phase: 'playing' };
    asmaSays(ARRIVE_LINES);
    sfx('giggle');
  } else if (event === 'snack') {
    asmaGiveSnack();
  } else if (event === 'surfacing') {
    state.asma = { ...state.asma, phase: 'surfacing', line: "I need air! I'll come back soon! 💨" };
    sfx('gasp');
  } else if (event === 'left') {
    const now = nowSec();
    state.asma = { visible: false, phase: 'idle', line: '', restUntil: now + ASMA_REST, missUntil: now + ASMA_MISSED };
    world.asma.missing = true;
    toast('The fish miss Asma already! Tap 👧 Asma to call her back.', '🥺', 5000);
    save();
  }
  emit();
}

export function petAsma() {
  world.asma.twirl = 0.9;
  queueEffect('hearts', world.asma.pos.clone().setY(world.asma.pos.y + 1.6), 4);
  asmaSays(TAP_LINES);
  sfx('giggle');
  emit();
}

function tickAsma(dt) {
  const a = state.asma;
  if (a.missUntil && nowSec() > a.missUntil) {
    state.asma = { ...a, missUntil: 0 };
    world.asma.missing = false;
  }
  if (state.settings.asmaVisits && state.hintDismissed && state.fish.length && a.phase === 'idle') {
    nextAsmaIn -= dt;
    if (nextAsmaIn <= 0 && nowSec() > a.restUntil) inviteAsma();
  }
}

// Slow stat changes, run once per second (cheap, and keeps UI meters fresh).
export function tickStats(dt) {
  const weakened = [];
  for (const f of [...state.fish]) {
    const appetite = PERSONALITIES[f.personality]?.appetite ?? 1;
    f.hunger = Math.min(1, f.hunger + dt * HUNGER_RATE * appetite);
    f.fullness = Math.max(0, f.fullness - dt * FULL_DECAY);
    if (f.hunger >= 1) f.health = Math.max(0, f.health - dt * HEALTH_DRAIN);
    else f.health = Math.min(1, f.health + dt * HEALTH_REGEN);

    if (f.health <= 0) {
      killFish(f);
      continue;
    }
    if (f.health < 0.5 && !f.warned) {
      f.warned = true;
      weakened.push(f.name);
    }
  }
  tickAsma(dt);
  if (weakened.length === 1) toast(`${weakened[0]} is very weak from hunger! Please feed soon.`, '🥺', 4500);
  else if (weakened.length > 1) toast(`${weakened.length} fish are very weak from hunger! Please feed them soon.`, '🥺', 4500);
  emit();
}
