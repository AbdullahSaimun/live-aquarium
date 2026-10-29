import * as THREE from 'three';
import { world, queueEffect } from './world';

// How long Asma can hold her breath underwater, in seconds.
export const BREATH_TIME = 32;
const SURFACE_AT = 0.12; // breath left when she heads up for air
const SWIM_SPEED = 1.1;

const step = new THREE.Vector3();
const mouth = new THREE.Vector3();
const rand = (a, b) => a + Math.random() * (b - a);

function pickSpot(a) {
  const b = world.bounds;
  const w = Math.min(3, b.maxX - 0.8);
  a.target.set(rand(-w, w), rand(-1.2, 0.8), rand(0.6, 1.8));
}

export function startVisit() {
  const a = world.asma;
  a.phase = 'diving';
  a.timer = 0;
  a.breath = 1;
  a.nextSnack = rand(3, 5);
  a.nextBubble = 1;
  a.missing = false;
  const w = Math.min(2.5, world.bounds.maxX - 1);
  a.pos.set(rand(-w, w), world.surfaceY + 2.5, 1.2);
  a.target.set(a.pos.x, 0.2, 1.2);
  queueEffect('bubbles', new THREE.Vector3(a.pos.x, world.surfaceY - 0.2, 1.2), 16);
}

function moveTowards(a, speed, dt) {
  step.subVectors(a.target, a.pos);
  const d = step.length();
  if (d > 1e-3) a.pos.addScaledVector(step.normalize(), Math.min(d, speed * dt));
  return d;
}

/**
 * Advances Asma. Returns 'arrived' | 'snack' | 'surfacing' | 'left' on the frame that happens, else null.
 */
export function updateAsma(dt) {
  const a = world.asma;
  if (a.phase === 'idle') return null;
  a.timer += dt;
  a.twirl = Math.max(0, a.twirl - dt);
  let event = null;

  if (a.phase === 'diving') {
    if (moveTowards(a, 2.6, dt) < 0.05) {
      a.phase = 'playing';
      pickSpot(a);
      event = 'arrived';
    }
  } else if (a.phase === 'playing') {
    a.breath = Math.max(0, a.breath - dt / BREATH_TIME);
    if (moveTowards(a, SWIM_SPEED * 0.5, dt) < 0.1 || Math.random() < dt * 0.08) pickSpot(a);
    a.nextSnack -= dt;
    if (a.nextSnack <= 0) {
      a.nextSnack = rand(4, 7);
      event = 'snack';
    }
    if (a.breath <= SURFACE_AT) {
      a.phase = 'surfacing';
      a.target.set(a.pos.x, world.surfaceY + 3, a.pos.z);
      event = 'surfacing';
    }
  } else if (a.phase === 'surfacing') {
    a.breath = Math.max(0, a.breath - dt / BREATH_TIME);
    if (moveTowards(a, 2.8, dt) < 0.05) {
      a.phase = 'idle';
      a.pos.set(0, 20, 1);
      event = 'left';
    }
  }

  // A few bubbles escape while she holds her breath, more as she runs low.
  if (a.phase !== 'idle') {
    a.nextBubble -= dt;
    if (a.nextBubble <= 0) {
      a.nextBubble = 0.6 + a.breath * 1.8;
      mouth.copy(a.pos);
      mouth.y += 0.75;
      mouth.z += 0.35;
      queueEffect('bubbles', mouth, a.breath < 0.3 ? 4 : 2);
    }
  }
  return event;
}

// Where her snacks appear: just in front of her hands.
export function snackSpot(out) {
  const a = world.asma;
  return out.set(a.pos.x + rand(-0.6, 0.6), a.pos.y + 0.3, a.pos.z + 0.4);
}
