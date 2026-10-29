import * as THREE from 'three';
import { world } from './world';

// A cartoon shark that now and then sneaks in to chase the fish. It never eats anyone: a fish it
// reaches faints from fright for a moment. Three taps (or Asma) chase it away.
export const SHARK_HITS = 3;
const STAY_TIME = 45; // seconds before it gets bored and leaves by itself
const MOUTH = 1.35; // distance from its centre to its mouth

const step = new THREE.Vector3();
const forward = new THREE.Vector3();
const mouth = new THREE.Vector3();
const rand = (a, b) => a + Math.random() * (b - a);

function pickPatrol(s) {
  const b = world.bounds;
  s.target.set(rand(b.minX + 0.5, b.maxX - 0.5), rand(b.minY + 0.4, b.maxY - 0.2), rand(b.minZ, b.maxZ - 1));
}

export function startShark() {
  const s = world.shark;
  const side = Math.random() < 0.5 ? -1 : 1;
  s.phase = 'prowling';
  s.timer = 0;
  s.hits = 0;
  s.hurt = 0;
  s.chomp = 0;
  s.targetId = null;
  s.fast = false;
  s.nextLunge = rand(3, 5);
  s.pos.set(side * (world.bounds.maxX + 4), rand(-1, 0.8), rand(-1.5, 0.5));
  s.vel.set(-side * 1.2, 0, 0);
  s.yaw = Math.atan2(s.vel.x, s.vel.z);
  pickPatrol(s);
}

// Swims off the nearest side; `fast` when it was chased away.
export function sendSharkAway(fast) {
  const s = world.shark;
  if (s.phase === 'idle') return;
  s.phase = 'leaving';
  s.fast = fast;
  s.targetId = null;
  const side = s.pos.x >= 0 ? 1 : -1;
  s.target.set(side * (world.bounds.maxX + 8), s.pos.y + 0.5, s.pos.z);
}

export function sharkActive() {
  const p = world.shark.phase;
  return p === 'prowling' || p === 'chasing';
}

// Picks a fish to chase, preferring ones close by.
function pickPrey(s) {
  let best = null;
  let bestScore = Infinity;
  for (const [id, rt] of world.runtime) {
    if (rt.fainted > 0) continue;
    const score = rt.pos.distanceTo(s.pos) + Math.random() * 4;
    if (score < bestScore) {
      best = id;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Advances the shark. Returns { type: 'chase' | 'caught' | 'bored' | 'left', id? } when something happens.
 */
export function updateShark(dt) {
  const s = world.shark;
  if (s.phase === 'idle') return null;
  s.timer += dt;
  s.hurt = Math.max(0, s.hurt - dt);
  s.chomp = Math.max(0, s.chomp - dt);
  forward.set(Math.sin(s.yaw), 0, Math.cos(s.yaw));
  mouth.copy(s.pos).addScaledVector(forward, MOUTH);
  let event = null;
  let speed = 1.3;
  let turn = 1.2;

  if (s.phase === 'prowling') {
    if (s.pos.distanceTo(s.target) < 1) pickPatrol(s);
    s.nextLunge -= dt;
    if (s.nextLunge <= 0) {
      const prey = pickPrey(s);
      if (prey) {
        s.phase = 'chasing';
        s.targetId = prey;
        s.chaseTime = rand(2.5, 4);
        event = { type: 'chase', id: prey };
      } else s.nextLunge = 2;
    }
    if (s.timer > STAY_TIME) {
      sendSharkAway(false);
      event = { type: 'bored' };
    }
  } else if (s.phase === 'chasing') {
    const rt = world.runtime.get(s.targetId);
    s.chaseTime -= dt;
    if (!rt || rt.fainted > 0 || s.chaseTime <= 0) {
      s.phase = 'prowling';
      s.nextLunge = rand(4, 7);
      pickPatrol(s);
    } else {
      s.target.copy(rt.pos);
      speed = 3.0;
      turn = 2.6;
      if (mouth.distanceTo(rt.pos) < 0.9) {
        s.chomp = 0.5;
        event = { type: 'caught', id: s.targetId };
        s.phase = 'prowling';
        s.nextLunge = rand(5, 8);
        pickPatrol(s);
      }
    }
  } else if (s.phase === 'leaving') {
    speed = s.fast ? 6 : 2.4;
    turn = 3;
    if (Math.abs(s.pos.x) > world.bounds.maxX + 6) {
      s.phase = 'idle';
      s.pos.set(0, -40, 0);
      return { type: 'left' };
    }
  }
  if (s.hurt > 0 && s.phase !== 'leaving') speed *= 0.25; // dazed for a moment after a bonk

  step.subVectors(s.target, s.pos);
  if (step.lengthSq() > 1e-6) step.normalize().multiplyScalar(speed);
  s.vel.lerp(step, 1 - Math.exp(-dt * turn));
  s.pos.addScaledVector(s.vel, dt);
  s.pos.y = THREE.MathUtils.clamp(s.pos.y, world.floorY + 0.7, world.bounds.maxY + 0.6);
  s.pos.z = THREE.MathUtils.clamp(s.pos.z, world.bounds.minZ - 0.5, world.bounds.maxZ);

  const flat = Math.hypot(s.vel.x, s.vel.z);
  if (flat > 0.05) {
    let dy = Math.atan2(s.vel.x, s.vel.z) - s.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    s.yaw += dy * (1 - Math.exp(-dt * 3));
  }
  s.pitch += (THREE.MathUtils.clamp(-Math.atan2(s.vel.y, flat + 0.3), -0.4, 0.4) - s.pitch) * (1 - Math.exp(-dt * 3));
  s.tailPhase += dt * (3 + s.vel.length() * 2.2);
  return event;
}
