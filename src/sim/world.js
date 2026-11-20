import * as THREE from 'three';

// Mutable per-frame simulation data, kept outside React so animation never triggers re-renders.
export const MAX_PELLETS = 14;

export const world = {
  // Swimming volume; x is narrowed on portrait screens by CameraRig.
  bounds: { minX: -6.5, maxX: 6.5, minY: -2.4, maxY: 1.6, minZ: -3, maxZ: 2.6 },
  // Screen pixels covered by the left button rail. CameraRig frames the tank in the space beside it.
  viewInset: 0,
  detail: 'high', // 'low' on phones, in calm mode and on slow devices (set by Aquarium)
  weather: { rain: 0, rainTarget: 0, until: 0, rainbow: 0, sunnyUntil: 0 },
  spawning: { until: 0 }, // coral spawning: world.time until which the corals release eggs
  nest: null, // where the clownfish eggs are, while there are eggs to fan
  observe: false, // Observe mode: fish just live, nobody begs for food
  current: new THREE.Vector3(0.12, 0, 0), // the slow water current everything drifts in
  // The visiting submarine (sim/submarine.js). phase: idle | cruising | driving | leaving
  sub: {
    phase: 'idle',
    pos: new THREE.Vector3(0, -40, 0),
    vel: new THREE.Vector3(),
    input: { x: 0, y: 0 },
    dir: 1,
    face: 0,
    drive: 0,
    speed: 0,
    light: true,
    entering: false, // summoned: gliding in from the side before the captain takes over
  },
  // The submarine's gear (sim/subGear.js): shots, blasts, debris, items, claw, sonar.
  gear: {
    shots: [],
    blasts: [],
    debris: [],
    items: [],
    claw: { state: 'idle', len: 0, holding: null },
    sonar: { t: -100, origin: new THREE.Vector3() },
    cool: { torpedo: 0, missile: 0, sonar: 0 },
    events: [], // for the store: rewards and toasts
    aimAt: null, // where the water was last tapped while driving (missile aim)
    spawnTrash: 4,
    spawnTarget: 15,
    spawnTreasure: 0,
  },
  shake: 0, // camera shake from blasts, eases back to 0
  startle: { pos: new THREE.Vector3(), time: -Infinity }, // a tap in the water (Observe mode)
  clamPearl: false, // a pearl is shining inside the giant clam
  morayClean: 0, // world.time until which a cleaner shrimp is cleaning the moray
  cleaning: null, // { fishId, pos, until }: a pet fish visiting a cleaner shrimp
  crabPos: new THREE.Vector3(0, -40, 0), // the red crab, so the octopus can play with it
  octopusPos: new THREE.Vector3(0, -40, 0),
  partnerEvents: [], // 'cleaning' | 'anemone' | 'moray' | 'octopusCrab': first-time fact toasts
  decorPop: { id: null, t: -Infinity }, // the decoration that just arrived plays a pop-in
  floorY: -3.1,
  surfaceY: 3.6,
  dropY: 2.5, // where food appears: high in the water but below the top UI
  time: 0,
  runtime: new Map(), // fish id -> runtime motion state
  pellets: Array.from({ length: MAX_PELLETS }, (_, i) => ({
    index: i,
    active: false,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    age: 0,
    resting: 0,
    dragging: false,
    ping: 0,
    spin: Math.random() * Math.PI,
  })),
  // Asma, the girl who dives in to visit. `breath` runs from 1 down to 0 while she is underwater.
  asma: {
    phase: 'idle', // idle | diving | playing | surfacing
    pos: new THREE.Vector3(0, 20, 1),
    target: new THREE.Vector3(),
    breath: 1,
    timer: 0,
    nextSnack: 0,
    nextBubble: 0,
    twirl: 0,
    missing: false, // set after she leaves: fish ask for her to come back
  },
  // The shark that sometimes sneaks in (see sharkBrain.js).
  shark: {
    phase: 'idle', // idle | prowling | chasing | leaving
    pos: new THREE.Vector3(0, -40, 0),
    vel: new THREE.Vector3(),
    target: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    tailPhase: 0,
    timer: 0,
    nextLunge: 0,
    chaseTime: 0,
    targetId: null,
    hits: 0,
    hurt: 0,
    chomp: 0,
    fast: false,
  },
  // A big animal passing far behind the reef now and then (see visitors.js).
  visitor: { kind: null, t: 0, dur: 1, dir: 1, y: 0 },
  // Daylight, eased by DayNight: `light` runs 0 (night) .. 1 (day), `dusk` 0 .. 1 for the sunset tint.
  light: 1,
  dusk: 0,
  lightTarget: 1,
  duskTarget: 0,
  // Birthday party mode (hats, tiara, balloons) and when the balloons were last all popped.
  party: false,
  balloonBurst: -Infinity,
  // Queued particle bursts, drained each frame by the matching effect component.
  effects: { hearts: [], bubbles: [], sparkles: [] },
};

export function activePellets() {
  return world.pellets.filter((p) => p.active);
}

export function spawnPellet(x, z, y = world.dropY + Math.random() * 0.3) {
  const p = world.pellets.find((q) => !q.active);
  if (!p) return null;
  p.active = true;
  p.pos.set(x, y, z);
  p.vel.set((Math.random() - 0.5) * 0.3, -0.2, 0);
  p.age = 0;
  p.resting = 0;
  p.dragging = false;
  p.ping = 0;
  return p;
}

export function removePellet(p) {
  p.active = false;
  p.dragging = false;
}

// Leftover food lying on the sand that the bottom dwellers can tidy up. `near` limits the search
// to { x, z, radius } around a creature's home.
export function findCrumb(near) {
  let best = null;
  for (const p of world.pellets) {
    if (!p.active || p.dragging || p.resting <= 1.5) continue;
    if (near && Math.hypot(p.pos.x - near.x, p.pos.z - near.z) > near.radius) continue;
    if (!best || p.resting > best.resting) best = p;
  }
  return best;
}

export function clearPellets() {
  world.pellets.forEach(removePellet);
}

export function queueEffect(type, pos, count = 6) {
  const queue = world.effects[type];
  if (!queue || queue.length > 20) return;
  queue.push({ pos: pos.clone(), count });
}
