import * as THREE from 'three';

// Mutable per-frame simulation data, kept outside React so animation never triggers re-renders.
export const MAX_PELLETS = 14;

export const world = {
  // Swimming volume; x is narrowed on portrait screens by CameraRig.
  bounds: { minX: -6.5, maxX: 6.5, minY: -2.4, maxY: 1.6, minZ: -3, maxZ: 2.6 },
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
  // Queued particle bursts, drained each frame by the matching effect component.
  effects: { hearts: [], bubbles: [] },
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

export function clearPellets() {
  world.pellets.forEach(removePellet);
}

export function queueEffect(type, pos, count = 6) {
  const queue = world.effects[type];
  if (!queue || queue.length > 20) return;
  queue.push({ pos: pos.clone(), count });
}
