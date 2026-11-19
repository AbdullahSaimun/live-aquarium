import * as THREE from 'three';
import { world } from './world';

// A little yellow submarine that visits now and then. Tapped, it is the child's to drive with the
// joystick for a while; then it sails away. It moves in the open water just in front of the reef.
export const SUB_Z = 0.9;
export const DRIVE_TIME = 90; // seconds of driving before the submarine has to go home
const CRUISE_SPEED = 0.55;
const DRIVE_SPEED = 1.7;

const sub = world.sub;
const rand = (a, b) => a + Math.random() * (b - a);
const want = new THREE.Vector3();

export function subActive() {
  return sub.phase !== 'idle';
}

export function startSub(edge) {
  sub.dir = Math.random() < 0.5 ? 1 : -1;
  sub.pos.set(-sub.dir * (edge + 1.5), rand(-0.6, 1.0), SUB_Z);
  sub.vel.set(sub.dir * CRUISE_SPEED, 0, 0);
  sub.face = sub.dir > 0 ? 0 : Math.PI;
  sub.phase = 'cruising';
  sub.drive = 0;
  sub.light = true;
  sub.input.x = 0;
  sub.input.y = 0;
}

export function driveSub() {
  if (sub.phase !== 'cruising') return false;
  sub.phase = 'driving';
  sub.drive = DRIVE_TIME;
  return true;
}

export function sendSubHome() {
  if (sub.phase === 'idle') return;
  sub.phase = 'leaving';
  sub.dir = sub.pos.x >= 0 ? 1 : -1;
}

/** One frame. `edge` is how far the picture reaches sideways at the submarine's depth. */
export function updateSub(dt, edge) {
  if (sub.phase === 'idle') return;
  const t = world.time;
  const top = world.bounds.maxY + 0.3;
  const low = world.floorY + 0.75;
  let rate = 1.2; // a submarine is heavy: it speeds up and slows down gently

  if (sub.phase === 'cruising') {
    want.set(sub.dir * CRUISE_SPEED, Math.sin(t * 0.4) * 0.12, 0);
    if (Math.abs(sub.pos.x) > edge + 2 && Math.sign(sub.pos.x) === sub.dir) sub.phase = 'idle'; // passed by
  } else if (sub.phase === 'driving') {
    sub.drive -= dt;
    if (sub.drive <= 0) sendSubHome();
    want.set(sub.input.x * DRIVE_SPEED, sub.input.y * DRIVE_SPEED * 0.75, 0);
    rate = 1.8;
  } else {
    // leaving: off to the nearest side, rising a little
    want.set(sub.dir * 1.2, 0.15, 0);
    if (Math.abs(sub.pos.x) > edge + 2) sub.phase = 'idle';
  }

  sub.vel.lerp(want, 1 - Math.exp(-dt * rate));
  sub.pos.addScaledVector(sub.vel, dt);
  sub.pos.z += (SUB_Z - sub.pos.z) * (1 - Math.exp(-dt));
  sub.pos.y = THREE.MathUtils.clamp(sub.pos.y, low, top);
  if (sub.phase === 'driving') {
    const lim = edge - 0.9;
    if (Math.abs(sub.pos.x) > lim) {
      sub.pos.x = Math.sign(sub.pos.x) * lim;
      sub.vel.x *= 0.3;
    }
  }

  // Turn round when it changes direction, slowly, like a real boat.
  if (Math.abs(sub.vel.x) > 0.08) sub.dir = Math.sign(sub.vel.x);
  const faceGoal = sub.dir > 0 ? 0 : Math.PI;
  sub.face += (faceGoal - sub.face) * (1 - Math.exp(-dt * 2));
  sub.speed = sub.vel.length();
}
