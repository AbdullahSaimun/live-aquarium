import * as THREE from 'three';
import { SPECIES, PERSONALITIES } from '../data/species';
import { world } from './world';
import { sharkActive } from './sharkBrain';

const tmp = new THREE.Vector3();
const desired = new THREE.Vector3();
const forward = new THREE.Vector3();

const rand = (a, b) => a + Math.random() * (b - a);

export function fishScale(fish) {
  return SPECIES[fish.species].size * (0.5 + 0.6 * fish.growth);
}

export function createRuntime(fish) {
  const b = world.bounds;
  const pos = fish.spawnAt
    ? fish.spawnAt.clone()
    : new THREE.Vector3(rand(b.minX, b.maxX), rand(b.minY + 0.5, b.maxY - 0.5), rand(b.minZ, b.maxZ - 1));
  const angle = Math.random() * Math.PI * 2;
  return {
    pos,
    vel: new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(0.5),
    target: pos.clone(),
    retarget: 0,
    yaw: angle,
    pitch: 0,
    tailPhase: Math.random() * 10,
    wiggle: 0,
    squint: 0,
    happyTimer: 0,
    nextSleep: rand(45, 120),
    sleeping: 0,
    nextCurious: rand(6, 20),
    curious: 0,
    fullNotice: 0,
    emote: null,
    seeking: null,
    scared: 0, // seconds left fleeing from the shark
    fainted: 0, // seconds left floating dazed after the shark reached it
    faint: 0, // eased 0..1 used to turn the fish belly-up
    // Each fish circles Asma on its own little orbit.
    orbit: { angle: Math.random() * Math.PI * 2, radius: rand(1.3, 2.3), dir: Math.random() < 0.5 ? -1 : 1, seed: rand(0, 10) },
  };
}

function pickWanderTarget(rt, fish, mood) {
  const b = world.bounds;
  const t = rt.target;
  if (mood === 'sleepy') {
    t.set(rand(b.minX, b.maxX) * 0.8, b.minY + rand(0.1, 0.6), rand(b.minZ, b.maxZ - 1));
  } else if (mood === 'hungry' || mood === 'weak') {
    // Come up to the "glass" and beg, near where the fish already is.
    const y = mood === 'weak' ? rand(-1.8, -0.8) : rand(-0.6, 1.2);
    t.set(THREE.MathUtils.clamp(rt.pos.x + rand(-1.5, 1.5), b.minX, b.maxX), y, b.maxZ);
  } else if (mood === 'curious') {
    t.set(rand(-2, 2) * Math.min(1, b.maxX / 4), rand(-0.3, 1), b.maxZ);
  } else {
    const shy = fish.personality === 'shy';
    t.set(
      rand(b.minX, b.maxX),
      rand(b.minY + 0.3, b.maxY),
      shy ? rand(b.minZ, (b.minZ + b.maxZ) / 2) : rand(b.minZ, b.maxZ - 0.5),
    );
  }
  rt.retarget = rand(4, 9);
}

function nearestPellet(rt, mouth) {
  let best = null;
  let bestD = Infinity;
  for (const p of world.pellets) {
    if (!p.active || p.dragging) continue;
    const pinged = world.time - p.ping < 4;
    const sense = pinged ? 14 : 7;
    const d = p.pos.distanceTo(mouth);
    if (d < sense && d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best ? { pellet: best, dist: bestD } : null;
}

/**
 * Advances one fish by dt seconds. Returns the pellet it ate this frame, if any.
 */
export function updateFish(fish, rt, dt, mates) {
  const persona = PERSONALITIES[fish.personality] || PERSONALITIES.playful;
  const scale = fishScale(fish);
  const bodyLen = SPECIES[fish.species].body[2];

  forward.set(Math.sin(rt.yaw), 0, Math.cos(rt.yaw));
  const mouth = tmp.copy(rt.pos).addScaledVector(forward, bodyLen * scale * 0.95);

  // --- timers & moods ---
  rt.happyTimer = Math.max(0, rt.happyTimer - dt);
  rt.fullNotice = Math.max(0, rt.fullNotice - dt);
  const wantsFood = fish.fullness < 0.95;
  const food = nearestPellet(rt, mouth);

  if (rt.sleeping > 0) {
    rt.sleeping -= dt;
    if (fish.hunger > 0.8 || (food && wantsFood && food.dist < 5)) rt.sleeping = 0;
  } else {
    rt.nextSleep -= dt * persona.sleepiness;
    if (rt.nextSleep <= 0) {
      rt.nextSleep = rand(70, 140);
      if (fish.hunger < 0.6 && fish.health > 0.5 && !food) {
        rt.sleeping = rand(10, 16);
        rt.retarget = 0;
      }
    }
  }

  if (rt.curious > 0) rt.curious -= dt;
  else {
    rt.nextCurious -= dt * persona.curiosity;
    if (rt.nextCurious <= 0) {
      rt.nextCurious = rand(18, 40);
      if (rt.sleeping <= 0) {
        rt.curious = rand(5, 8);
        rt.retarget = 0;
      }
    }
  }

  // The shark: fish near it, or the one it is chasing, flee in a panic.
  const shark = world.shark;
  rt.fainted = Math.max(0, rt.fainted - dt);
  rt.scared = Math.max(0, rt.scared - dt);
  if (sharkActive() && rt.fainted <= 0) {
    const chased = shark.phase === 'chasing' && shark.targetId === fish.id;
    if (chased || rt.pos.distanceTo(shark.pos) < 3.8) rt.scared = chased ? 2 : Math.max(rt.scared, 1.6);
  }
  const panicking = rt.scared > 0 || rt.fainted > 0;
  if (panicking) rt.sleeping = 0;

  const asma = world.asma;
  const withAsma = asma.phase === 'playing' && fish.health >= 0.3;
  if (withAsma) rt.sleeping = 0; // nobody naps when Asma visits
  const seeking = wantsFood && food && rt.sleeping <= 0 && !panicking ? food.pellet : null;
  rt.seeking = seeking;
  // After she leaves, fish take turns asking for her at the glass.
  const missing = asma.missing && Math.sin(world.time * 0.35 + rt.orbit.seed) > 0.3;

  let mood = 'happy';
  if (rt.sleeping > 0) mood = 'sleepy';
  else if (fish.health < 0.5 && !seeking) mood = 'weak';
  else if (seeking) mood = 'hungry';
  else if (withAsma) mood = 'playing';
  else if (fish.hunger > 0.65) mood = 'hungry';
  else if (missing) mood = 'missing';
  else if (rt.curious > 0) mood = 'curious';
  if (rt.happyTimer > 0) mood = 'happy';
  if (rt.fainted > 0) mood = 'fainted';
  else if (rt.scared > 0) mood = 'scared';
  if (fish.mood !== mood) {
    if (mood !== 'happy') rt.retarget = 0;
    fish.mood = mood;
  }

  // --- eating ---
  let ate = null;
  if (seeking && food.dist < 0.3 + 0.25 * scale) {
    ate = seeking;
    rt.happyTimer = 2.2;
    rt.retarget = 0;
  } else if (!wantsFood && food && food.dist < 2.2 && rt.fullNotice <= 0) {
    rt.fullNotice = 7;
    rt.emoteOverride = { type: 'full', time: 2.5 };
  }

  // --- choose where to go ---
  rt.retarget -= dt;
  if (withAsma && !seeking) {
    // Circle around Asma at chest height.
    const o = rt.orbit;
    o.angle += dt * 0.55 * o.dir;
    rt.target.set(
      asma.pos.x + Math.cos(o.angle) * o.radius,
      asma.pos.y + 0.7 + Math.sin(o.angle * 0.8 + o.seed) * 0.5,
      asma.pos.z + Math.sin(o.angle) * o.radius * 0.7,
    );
    rt.retarget = 1;
  } else if (panicking) {
    rt.retarget = 0; // pick a fresh calm spot once the fright is over
  } else if (!seeking && (rt.retarget <= 0 || (mood === 'happy' && rt.pos.distanceTo(rt.target) < 0.8))) {
    pickWanderTarget(rt, fish, mood);
  }
  const goal = seeking ? seeking.pos : rt.target;

  let speed = 1.0 * persona.speed;
  if (mood === 'sleepy') speed = 0.28;
  else if (seeking) speed = 2.1 * Math.min(1.2, persona.speed);
  else if (mood === 'hungry') speed = 1.25;
  else if (mood === 'weak') speed = 0.5;
  else if (mood === 'playing') speed = 1.5;
  if (rt.happyTimer > 0) speed *= 1.3;
  speed *= 0.55 + 0.45 * Math.min(1, fish.health * 2); // starving fish run out of energy

  desired.subVectors(goal, rt.pos);
  const distToGoal = desired.length();
  const atGlass = !seeking && (mood === 'hungry' || mood === 'curious' || mood === 'weak' || mood === 'missing') && distToGoal < 1;
  if (mood === 'fainted') {
    // Dazed: drift slowly down, barely moving.
    desired.set(Math.sin(world.time * 0.8 + rt.tailPhase) * 0.05, -0.3, 0);
  } else if (mood === 'scared') {
    // Dart away from the shark, curving sideways so fish don't get pinned against the glass.
    desired.subVectors(rt.pos, shark.pos);
    desired.y *= 0.5;
    const side = rt.orbit.dir;
    desired.normalize();
    desired.x += -desired.z * 0.7 * side;
    desired.z += desired.x * 0.7 * side - 0.2;
    desired.normalize().multiplyScalar(2.9 * Math.min(1.15, persona.speed) * (0.6 + 0.4 * fish.health));
  } else if (atGlass) {
    // Hover facing the viewer.
    desired.set(Math.sin(world.time * 0.7 + rt.tailPhase) * 0.15, 0, 0.25);
  } else {
    // Steer towards the point aimed at by the mouth, not the body centre.
    if (seeking) desired.addScaledVector(forward, -bodyLen * scale * 0.6);
    desired.normalize().multiplyScalar(speed * Math.min(1, 0.35 + distToGoal / 1.5));
  }

  // Keep personal space proportional to both fishes' sizes.
  rt.radius = bodyLen * scale;
  for (const other of mates) {
    if (other === rt) continue;
    const dx = rt.pos.x - other.pos.x;
    const dy = rt.pos.y - other.pos.y;
    const dz = rt.pos.z - other.pos.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const minD = (rt.radius + (other.radius || 0.8)) * 1.15;
    if (d < minD && d > 1e-3) {
      const push = ((minD - d) / minD) * 2.2 / d;
      desired.x += dx * push;
      desired.y += dy * push * 0.6;
      desired.z += dz * push;
    }
  }

  // Gentle vertical bob makes paths feel organic.
  desired.y += Math.sin(world.time * 0.9 + rt.tailPhase * 0.3) * 0.12;

  const turn = mood === 'scared' ? 4 : seeking ? 3 : mood === 'sleepy' || mood === 'fainted' ? 0.8 : 1.6;
  rt.vel.lerp(desired, 1 - Math.exp(-dt * turn));
  rt.pos.addScaledVector(rt.vel, dt);

  // Soft walls.
  const b = world.bounds;
  const floor = seeking || mood === 'fainted' ? world.floorY + 0.25 : b.minY;
  rt.pos.x = THREE.MathUtils.clamp(rt.pos.x, b.minX - 0.3, b.maxX + 0.3);
  rt.pos.y = THREE.MathUtils.clamp(rt.pos.y, floor, b.maxY + 0.2);
  rt.pos.z = THREE.MathUtils.clamp(rt.pos.z, b.minZ - 0.3, b.maxZ + 0.4);

  // --- orientation & animation parameters ---
  const flatSpeed = Math.hypot(rt.vel.x, rt.vel.z);
  if (flatSpeed > 0.02) {
    const targetYaw = Math.atan2(rt.vel.x, rt.vel.z);
    let dy = targetYaw - rt.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    rt.yaw += dy * (1 - Math.exp(-dt * 5));
  }
  const targetPitch = THREE.MathUtils.clamp(-Math.atan2(rt.vel.y, flatSpeed + 0.2), -0.6, 0.6);
  rt.pitch += (targetPitch - rt.pitch) * (1 - Math.exp(-dt * 4));

  const swimSpeed = rt.vel.length();
  const tailRate = mood === 'sleepy' ? 2 : 4 + swimSpeed * 5;
  rt.tailPhase += dt * tailRate;
  const wiggleTarget = (mood === 'hungry' && atGlass) || rt.happyTimer > 0 || mood === 'scared' ? 1 : 0;
  rt.wiggle += (wiggleTarget - rt.wiggle) * (1 - Math.exp(-dt * 4));
  rt.faint += ((mood === 'fainted' ? 1 : 0) - rt.faint) * (1 - Math.exp(-dt * 4));
  rt.squint += ((mood === 'sleepy' || mood === 'fainted' ? 1 : 0) - rt.squint) * (1 - Math.exp(-dt * 3));

  // --- emote bubble ---
  if (rt.emoteOverride) {
    rt.emoteOverride.time -= dt;
    if (rt.emoteOverride.time <= 0) rt.emoteOverride = null;
  }
  if (rt.emoteOverride) rt.emote = rt.emoteOverride.type;
  else if (mood === 'fainted') rt.emote = 'fainted';
  else if (mood === 'scared') rt.emote = 'scared';
  else if (rt.happyTimer > 0) rt.emote = 'love';
  else if (mood === 'sleepy') rt.emote = 'sleepy';
  else if (mood === 'weak') rt.emote = 'weak';
  else if (mood === 'hungry' && !seeking) rt.emote = 'hungry';
  else if (mood === 'curious' && atGlass) rt.emote = 'curious';
  else if (mood === 'missing' && atGlass) rt.emote = 'miss';
  else if (mood === 'playing' && Math.sin(world.time * 0.7 + rt.orbit.seed) > 0.75) rt.emote = 'playing';
  else rt.emote = null;

  return ate;
}
