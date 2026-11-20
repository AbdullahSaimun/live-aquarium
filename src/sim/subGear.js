import * as THREE from 'three';
import { world, queueEffect } from './world';
import { sharkActive } from './sharkBrain';
import { sfx } from '../state/store';
import { seeded, sandY, isClear } from '../scene/reefLayout';

// Everything the submarine can do besides driving: torpedoes, missiles and their explosions, the
// floating rubbish and practice buoys to clean up, treasure on the sand and the grabber arm, and sonar.
// Animals are never targets: blasts only make them flinch away (world.startle).

export const TORPEDO_COOL = 1;
export const MISSILE_COOL = 3;
export const SONAR_COOL = 4;
const MAX_TORPEDOES = 3;
const BLAST_RADIUS = 1.3;
const MAX_TRASH = 5;
const DEBRIS = 12; // chunks per blast
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const v = new THREE.Vector3();

export const TRASH_TYPES = ['bottle', 'bag', 'can', 'net'];
export const TREASURE_TYPES = ['conch', 'pearl', 'coin', 'message'];

const g = world.gear;
const sub = world.sub;

// ---------- pools ----------
for (let i = 0; i < 6; i++) g.shots.push({ active: false, kind: 'torpedo', pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, rise: 0, trail: 0, target: null, aim: new THREE.Vector3() });
for (let i = 0; i < 6; i++) g.blasts.push({ active: false, pos: new THREE.Vector3(), t: 0 });
for (let i = 0; i < 6 * DEBRIS; i++) g.debris.push({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, spin: new THREE.Vector3() });
for (let i = 0; i < 10; i++)
  g.items.push({ active: false, kind: 'trash', type: 'bottle', pos: new THREE.Vector3(), vel: new THREE.Vector3(), resting: false, held: false, spin: rand(0, 6), phase: rand(0, 6), fade: 0 });

// Treasure spots on the sand at the front, where the claw can reach (seeded: always the same places).
const TREASURE_SPOTS = (() => {
  const rnd = seeded(9137);
  const out = [];
  for (let tries = 0; out.length < 10 && tries < 500; tries++) {
    const x = (rnd() * 2 - 1) * 6;
    const z = 0.4 + rnd() * 1.1;
    if (!isClear(x, z, 0.3) || out.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < 1.2)) continue;
    out.push([x, z]);
  }
  return out;
})();

function freeItem() {
  return g.items.find((it) => !it.active);
}

function spawnTrash(edge) {
  const it = freeItem();
  if (!it) return;
  const side = Math.random() < 0.5 ? -1 : 1;
  Object.assign(it, { active: true, kind: 'trash', type: pick(TRASH_TYPES), resting: false, held: false, fade: 0 });
  it.pos.set(side * (edge + 0.6), rand(-0.6, 2.2), rand(0.2, 1.6));
  it.vel.set(-side * rand(0.18, 0.35), -rand(0.04, 0.09), 0);
}

function spawnTarget(edge) {
  const it = freeItem();
  if (!it) return;
  Object.assign(it, { active: true, kind: 'target', type: 'buoy', resting: false, held: false, fade: 0 });
  it.pos.set(rand(-0.6, 0.6) * edge, rand(-0.5, 1.8), 0.9);
  it.vel.set(rand(-0.25, 0.25), 0, 0);
}

function spawnTreasure() {
  const it = freeItem();
  if (!it) return;
  const used = g.items.filter((o) => o.active && o.kind === 'treasure').map((o) => o.spot);
  const free = TREASURE_SPOTS.map((_, i) => i).filter((i) => !used.includes(i));
  if (!free.length) return;
  const spot = pick(free);
  const [x, z] = TREASURE_SPOTS[spot];
  Object.assign(it, { active: true, kind: 'treasure', type: pick(TREASURE_TYPES), resting: true, held: false, fade: 0, spot });
  it.pos.set(x, sandY(x, z) + 0.06, z);
  it.vel.set(0, 0, 0);
}

// ---------- actions (from the controls) ----------
export function fireTorpedo() {
  if (sub.phase !== 'driving' || g.cool.torpedo > 0) return false;
  if (g.shots.filter((s) => s.active && s.kind === 'torpedo').length >= MAX_TORPEDOES) return false;
  const s = g.shots.find((x) => !x.active);
  if (!s) return false;
  const dir = sub.dir;
  Object.assign(s, { active: true, kind: 'torpedo', life: 2.6, rise: 0, trail: 0, target: null });
  s.pos.set(sub.pos.x + dir * 0.7, sub.pos.y - 0.12, sub.pos.z);
  s.vel.set(dir * 4.2 + sub.vel.x, sub.vel.y * 0.5, 0);
  g.cool.torpedo = TORPEDO_COOL;
  queueEffect('bubbles', s.pos, 4);
  sfx('launch');
  return true;
}

export function fireMissile() {
  if (sub.phase !== 'driving' || g.cool.missile > 0) return false;
  const s = g.shots.find((x) => !x.active);
  if (!s) return false;
  Object.assign(s, { active: true, kind: 'missile', life: 4.2, rise: 0.55, trail: 0, target: null });
  s.pos.set(sub.pos.x + 0.06 * sub.dir, sub.pos.y + 0.55, sub.pos.z);
  s.vel.set(sub.vel.x * 0.5, 2.6, 0);
  // Aim: the nearest rubbish or target anywhere, else where the water was last tapped, else ahead.
  s.target = nearestHittable(s.pos, 0);
  if (g.aimAt) s.aim.copy(g.aimAt);
  else s.aim.set(sub.pos.x + sub.dir * 5, sub.pos.y + 1, sub.pos.z);
  g.aimAt = null;
  g.cool.missile = MISSILE_COOL;
  queueEffect('bubbles', s.pos, 6);
  sfx('launch');
  return true;
}

export function grab() {
  if (sub.phase !== 'driving' || g.claw.state !== 'idle') return false;
  g.claw.state = 'down';
  g.claw.holding = null;
  sfx('claw');
  return true;
}

export function sonarPing() {
  if (sub.phase === 'idle' || g.cool.sonar > 0) return false;
  g.sonar.t = world.time;
  g.sonar.origin.copy(sub.pos);
  g.cool.sonar = SONAR_COOL;
  sfx('ping');
  return true;
}

// ---------- helpers ----------
function nearestHittable(from, dir) {
  let best = null;
  let bestD = Infinity;
  for (const it of g.items) {
    if (!it.active || it.held || it.kind === 'treasure') continue;
    if (dir && (it.pos.x - from.x) * dir < 0.2) continue; // torpedoes only home on what is ahead
    const d = it.pos.distanceTo(from);
    if (d < bestD && (!dir || d < 7)) {
      best = it;
      bestD = d;
    }
  }
  return best;
}

function explode(pos) {
  const b = g.blasts.find((x) => !x.active) || g.blasts[0];
  b.active = true;
  b.pos.copy(pos);
  b.t = 0;
  // Debris: little dark and glowing chunks flung out, slowed quickly by the water.
  let n = 0;
  for (const d of g.debris) {
    if (d.life > 0) continue;
    d.pos.copy(pos);
    d.vel.set(rand(-1, 1), rand(-0.6, 1), rand(-1, 1)).normalize().multiplyScalar(rand(1.5, 3.2));
    d.spin.set(rand(-8, 8), rand(-8, 8), rand(-8, 8));
    d.life = rand(0.9, 1.6);
    if (++n >= (world.detail === 'low' ? 6 : DEBRIS)) break;
  }
  queueEffect('bubbles', pos, world.detail === 'low' ? 8 : 16);
  world.shake = Math.min(0.35, world.shake + 0.22);
  // Every fish nearby flinches away; nobody is hurt.
  world.startle.pos.copy(pos);
  world.startle.time = world.time;
  if (sharkActive() && world.shark.pos.distanceTo(pos) < 3) g.events.push({ type: 'sharkFright' });
  // Rubbish and targets inside the blast are destroyed.
  for (const it of g.items) {
    if (!it.active || it.held || it.kind === 'treasure') continue;
    if (it.pos.distanceTo(pos) < BLAST_RADIUS) {
      it.active = false;
      g.events.push(it.kind === 'target' ? { type: 'bullseye' } : { type: 'trash', item: it.type });
    }
  }
  sfx('boom');
}

// ---------- every frame ----------
export function updateGear(dt, edge) {
  const out = sub.phase !== 'idle';
  const t = world.time;
  g.cool.torpedo = Math.max(0, g.cool.torpedo - dt);
  g.cool.missile = Math.max(0, g.cool.missile - dt);
  g.cool.sonar = Math.max(0, g.cool.sonar - dt);
  world.shake *= Math.exp(-dt * 7);

  // Rubbish, targets and treasure only appear while the submarine is out; they clear when it leaves.
  if (out) {
    g.spawnTrash -= dt;
    if (g.spawnTrash <= 0) {
      g.spawnTrash = rand(8, 15);
      if (g.items.filter((it) => it.active && it.kind === 'trash').length < MAX_TRASH) spawnTrash(edge);
    }
    g.spawnTarget -= dt;
    if (g.spawnTarget <= 0) {
      g.spawnTarget = rand(25, 40);
      if (!g.items.some((it) => it.active && it.kind === 'target')) spawnTarget(edge);
    }
    g.spawnTreasure -= dt;
    if (g.spawnTreasure <= 0) {
      g.spawnTreasure = rand(12, 25);
      if (g.items.filter((it) => it.active && it.kind === 'treasure').length < 4) spawnTreasure();
    }
  } else {
    for (const it of g.items) if (it.active && !it.held) it.fade += dt;
    g.spawnTrash = 4;
    g.spawnTarget = 15;
    g.spawnTreasure = 0;
  }

  // Items drift, sink and rest on the sand.
  for (const it of g.items) {
    if (!it.active) continue;
    if (it.fade > 1.5) {
      it.active = false;
      continue;
    }
    if (it.held) continue;
    if (it.kind === 'target') {
      it.pos.x += it.vel.x * dt;
      it.pos.y += Math.sin(t * 1.2 + it.phase) * 0.15 * dt;
      if (Math.abs(it.pos.x) > edge * 0.8) it.vel.x = -Math.sign(it.pos.x) * Math.abs(it.vel.x);
    } else if (!it.resting) {
      it.pos.x += (it.vel.x + world.current.x * 0.5 + Math.sin(t * 0.7 + it.phase) * 0.05) * dt;
      it.pos.y += it.vel.y * dt;
      it.vel.x *= Math.exp(-dt * 0.08);
      const floor = sandY(it.pos.x, it.pos.z) + 0.08;
      if (it.pos.y <= floor) {
        it.pos.y = floor;
        it.resting = true;
      }
      if (Math.abs(it.pos.x) > edge + 2) it.active = false; // drifted out of the tank
    }
  }

  // Torpedoes and missiles.
  for (const s of g.shots) {
    if (!s.active) continue;
    s.life -= dt;
    if (s.kind === 'torpedo') {
      if (!s.target || !s.target.active) s.target = nearestHittable(s.pos, Math.sign(s.vel.x) || 1);
      if (s.target) {
        v.subVectors(s.target.pos, s.pos).normalize().multiplyScalar(5);
        s.vel.lerp(v, 1 - Math.exp(-dt * 2.5));
      }
    } else if (s.rise > 0) {
      s.rise -= dt; // straight up out of the tower first
      s.vel.y += dt * 1.5;
    } else {
      if (s.target && !s.target.active) s.target = null;
      const goal = s.target ? s.target.pos : s.aim;
      v.subVectors(goal, s.pos);
      if (!s.target && v.length() < 0.4) s.life = 0;
      v.normalize().multiplyScalar(4.2);
      s.vel.lerp(v, 1 - Math.exp(-dt * 3));
    }
    s.pos.addScaledVector(s.vel, dt);
    s.trail -= dt;
    if (s.trail <= 0) {
      s.trail = s.kind === 'missile' ? 0.05 : 0.09;
      queueEffect('bubbles', s.pos, 1);
    }
    // Hit something, the sand, the surface, or ran out of fuel: boom.
    let hit = s.life <= 0 || s.pos.y < sandY(s.pos.x, s.pos.z) + 0.1 || s.pos.y > world.surfaceY - 0.2;
    for (const it of g.items) if (it.active && !it.held && it.kind !== 'treasure' && it.pos.distanceTo(s.pos) < 0.45) hit = true;
    if (hit) {
      s.active = false;
      explode(s.pos);
    }
  }

  // Blasts and debris.
  for (const b of g.blasts) if (b.active && (b.t += dt) > 1.6) b.active = false;
  for (const d of g.debris) {
    if (d.life <= 0) continue;
    d.life -= dt;
    d.vel.multiplyScalar(Math.exp(-dt * 3));
    d.vel.y -= dt * 0.8;
    d.pos.addScaledVector(d.vel, dt);
  }

  // The grabber: down to the sand, close, up with whatever it caught.
  const c = g.claw;
  if (c.state === 'down') {
    c.len += dt * 2.6;
    const tipY = sub.pos.y - 0.35 - c.len;
    const floor = sandY(sub.pos.x, sub.pos.z) + 0.08;
    if (tipY <= floor || c.len > 4.5) {
      c.state = 'up';
      v.set(sub.pos.x, Math.max(tipY, floor), sub.pos.z);
      let best = null;
      let bestD = 0.6;
      for (const it of g.items) {
        if (!it.active || it.held || it.kind === 'target' || (it.kind === 'trash' && !it.resting)) continue;
        const d = Math.hypot(it.pos.x - v.x, it.pos.z - v.z) + Math.abs(it.pos.y - v.y) * 0.5;
        if (d < bestD) {
          best = it;
          bestD = d;
        }
      }
      if (best) {
        best.held = true;
        c.holding = best;
        queueEffect('bubbles', best.pos, 4);
      }
      sfx('claw');
    }
  } else if (c.state === 'up') {
    c.len = Math.max(0, c.len - dt * 2.2);
    if (c.len <= 0) {
      c.state = 'idle';
      if (c.holding) {
        const it = c.holding;
        it.active = false;
        it.held = false;
        g.events.push(it.kind === 'treasure' ? { type: 'treasure', item: it.type } : { type: 'trash', item: it.type, grabbed: true });
        c.holding = null;
      }
    }
  }
  if (c.holding) c.holding.pos.set(sub.pos.x, sub.pos.y - 0.45 - c.len, sub.pos.z);
  if (!out && c.state !== 'idle') {
    c.state = 'idle';
    c.len = 0;
    if (c.holding) c.holding.held = false;
    c.holding = null;
  }
}
