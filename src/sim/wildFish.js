import * as THREE from 'three';
import { world } from './world';
import { sharkActive } from './sharkBrain';
import { ROCKS } from '../scene/reefLayout';

// Wild reef fish: no names, no hunger, they just live on the reef. Each species has its own way of
// moving (`style`), a favourite layer of water (`y`, 0 = sand, 1 = top) and depth (`z`).
// `base` is how many live in a standard-width tank; wider screens get more, phones fewer.
export const WILD = {
  chromis: { base: 14, style: 'shoal', speed: 0.95, y: [0.4, 0.78], z: [-3.4, -1.2], len: 0.15 },
  anthias: { base: 10, style: 'hover', speed: 1.05, y: [0.14, 0.45], z: [-4.2, -2.4], len: 0.15 },
  butterflyfish: { base: 4, style: 'pair', speed: 0.75, y: [0.06, 0.4], z: [-2.6, 0.3], len: 0.13 },
  moorishIdol: { base: 2, style: 'cruise', speed: 0.7, y: [0.3, 0.8], z: [-3.2, 0], len: 0.14 },
  royalGramma: { base: 3, style: 'ledge', speed: 0.6, y: [0.05, 0.3], z: [-4.6, -2.8], len: 0.13 },
  cardinalfish: { base: 5, style: 'still', speed: 0.4, y: [0.06, 0.24], z: [-1.7, -0.5], len: 0.11 },
};

// Banggai cardinalfish shelter beside the sea urchins (Critters.jsx).
const URCHINS = [
  [1.5, -1.3],
  [-6.3, -0.9],
];

const rand = (a, b) => a + Math.random() * (b - a);
const FLOOR = world.floorY;
const desired = new THREE.Vector3();
const push = new THREE.Vector3();

export const waterY = (f) => FLOOR + f * (world.bounds.maxY + 0.4 - FLOOR);

export function createGroup() {
  return { anchor: new THREE.Vector3(0, 0, -2), goal: new THREE.Vector3(0, 0, -2), wait: 0 };
}

// A new fish: either placed somewhere in its zone, or swimming in from the side of the screen.
export function createWild(def, xMax, fromSide = 0) {
  const z = rand(def.z[0], def.z[1]);
  const x = fromSide ? fromSide * (xMax(z) + 1.2) : rand(-xMax(z), xMax(z));
  const pos = new THREE.Vector3(x, waterY(rand(def.y[0], def.y[1])), z);
  const f = {
    pos,
    vel: new THREE.Vector3(fromSide ? -fromSide * 0.5 : rand(-0.3, 0.3), 0, rand(-0.1, 0.1)),
    target: pos.clone(),
    home: pos.clone(),
    offset: new THREE.Vector3(rand(-1.3, 1.3), rand(-0.45, 0.45), rand(-0.5, 0.5)),
    yaw: fromSide ? (fromSide > 0 ? -Math.PI / 2 : Math.PI / 2) : rand(0, Math.PI * 2),
    pitch: 0,
    bank: 0,
    tilt: 0,
    thrust: 0.5,
    phase: rand(0, 10),
    tempo: rand(0.85, 1.2),
    size: rand(0.85, 1.15),
    stroke: rand(0, 1),
    bursting: true,
    hover: 0,
    peck: 0,
    retarget: 0,
    dart: 0,
    dartDir: new THREE.Vector3(),
    lastStartle: world.startle.time,
    leaving: false,
    gone: false,
    entering: !!fromSide,
  };
  if (def.style === 'ledge') {
    // A home on the front face of a rock the viewer can see.
    const seen = ROCKS.filter(([rx, rz]) => Math.abs(rx) < xMax(rz) - 0.5 && rz > -6.5);
    const [rx, rz, rs] = (seen.length ? seen : ROCKS)[Math.floor(Math.random() * (seen.length || ROCKS.length))];
    f.home.set(rx + rand(-0.5, 0.5) * rs, FLOOR + rand(0.35, 0.8) * rs, rz + rs * 0.9);
    f.tilt = (Math.random() < 0.5 ? -1 : 1) * rand(0.35, 0.7); // royal grammas hang tilted, even upside down
  } else if (def.style === 'still') {
    const [ux, uz] = URCHINS[Math.floor(Math.random() * URCHINS.length)];
    f.home.set(ux + rand(-0.45, 0.45), FLOOR + rand(0.45, 0.85), uz + rand(-0.2, 0.35));
  } else if (def.style === 'hover') {
    f.home.set(pos.x, pos.y, pos.z);
  }
  if (!fromSide && (def.style === 'ledge' || def.style === 'still')) f.pos.copy(f.home);
  return f;
}

// Shoals follow one slowly wandering point; it drifts across the tank in its layer.
export function updateGroup(group, def, xMax, dt) {
  group.wait -= dt;
  if (group.wait <= 0 || group.anchor.distanceTo(group.goal) < 0.4) {
    const z = rand(def.z[0], def.z[1]);
    group.goal.set(rand(-0.75, 0.75) * xMax(z), waterY(rand(def.y[0], def.y[1]) * (0.6 + 0.4 * world.light)), z);
    group.wait = rand(8, 16);
  }
  desired.subVectors(group.goal, group.anchor);
  const d = desired.length();
  if (d > 0.01) group.anchor.addScaledVector(desired, (Math.min(0.45, d) / d) * dt);
}

function pickTarget(f, i, list, def, group, xMax) {
  const t = f.target;
  const zFrac = rand(def.y[0], def.y[1]) * (0.55 + 0.45 * world.light); // lower and closer to cover at night
  switch (def.style) {
    case 'hover':
      t.set(f.home.x + rand(-0.7, 0.7), f.home.y + rand(-0.3, 0.3), f.home.z + rand(-0.3, 0.3));
      if (Math.random() < 0.45) f.hover = rand(1.2, 3.5);
      f.retarget = rand(1.5, 3.5);
      break;
    case 'pair':
      if (i % 2 === 1 && list[i - 1]) {
        f.retarget = 0.5; // the partner keeps close
        return;
      }
      if (Math.random() < 0.35) {
        // Peck at the reef: nose down to the sand or coral for a moment.
        t.set(f.pos.x + rand(-0.6, 0.6), FLOOR + rand(0.3, 0.5), f.pos.z + rand(-0.3, 0.3));
        f.peck = rand(2, 3.5);
      } else {
        const z = rand(def.z[0], def.z[1]);
        t.set(THREE.MathUtils.clamp(f.pos.x + rand(-3, 3), -xMax(z), xMax(z)), waterY(zFrac), z);
      }
      f.retarget = rand(4, 8);
      break;
    case 'cruise': {
      const z = rand(def.z[0], def.z[1]);
      const side = f.pos.x > 0 ? -1 : 1;
      t.set(side * rand(0.4, 0.85) * xMax(z), waterY(zFrac), z);
      f.retarget = rand(12, 20);
      break;
    }
    case 'ledge':
      t.set(f.home.x + rand(-0.3, 0.3), f.home.y + rand(-0.15, 0.2), f.home.z + rand(0, 0.25));
      if (Math.random() < 0.7) f.hover = rand(2, 5);
      f.retarget = rand(3, 6);
      break;
    case 'still':
      t.set(f.home.x + rand(-0.15, 0.15), f.home.y + rand(-0.08, 0.08), f.home.z + rand(-0.1, 0.1));
      if (Math.random() < 0.85) f.hover = rand(3, 8);
      f.retarget = rand(4, 9);
      break;
    default: // shoal: follows the group's point every frame
      f.retarget = 0.4;
  }
}

function nearPellet(pos) {
  let best = null;
  let bestD = 2.6;
  for (const p of world.pellets) {
    if (!p.active || p.dragging) continue;
    const d = p.pos.distanceTo(pos);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

/** One wild fish, one frame. `list` is its own species, for spacing and pairs. */
export function updateWild(f, i, list, def, group, xMax, dt) {
  const activity = 0.5 + 0.5 * world.light; // sleepier at night
  f.hover = Math.max(0, f.hover - dt);
  f.peck = Math.max(0, f.peck - dt);
  f.dart = Math.max(0, f.dart - dt);
  f.retarget -= dt;

  // Danger: the shark, or a tap in the water. Shoals and small fish dive for the reef.
  const shark = world.shark;
  if (sharkActive() && f.pos.distanceTo(shark.pos) < 4.2) {
    f.dart = 0.5;
    f.dartDir.subVectors(f.pos, shark.pos).setY(def.style === 'cruise' ? 0 : -0.6).normalize();
  }
  const st = world.startle;
  if (st.time > f.lastStartle && world.time - st.time < 0.2) {
    f.lastStartle = st.time;
    if (f.pos.distanceTo(st.pos) < 3) startleWild(f, st.pos);
  }

  if (f.leaving) {
    const z = f.pos.z;
    f.target.set(Math.sign(f.pos.x || 1) * (xMax(z) + 2), f.pos.y, z);
    if (Math.abs(f.pos.x) > xMax(z) + 1.2) f.gone = true;
  } else if (f.entering) {
    if (Math.abs(f.pos.x) < xMax(f.pos.z) - 0.3) f.entering = false;
    else f.target.set(Math.sign(f.pos.x) * (xMax(f.pos.z) - 1), f.pos.y, f.pos.z);
  } else if (def.style === 'shoal') {
    f.target.copy(group.anchor).add(f.offset);
  } else if (def.style === 'pair' && i % 2 === 1 && list[i - 1]) {
    const lead = list[i - 1];
    f.target.set(lead.pos.x - Math.sin(lead.yaw) * 0.3 + Math.cos(lead.yaw) * 0.25, lead.pos.y + 0.06, lead.pos.z - Math.cos(lead.yaw) * 0.3);
    f.peck = lead.peck;
  } else if (f.retarget <= 0) {
    pickTarget(f, i, list, def, group, xMax);
  }

  // Curious about food, but they leave it for the pets.
  const pellet = !world.observe && !f.leaving && def.style !== 'ledge' ? nearPellet(f.pos) : null;
  if (pellet) {
    push.subVectors(f.pos, pellet.pos).normalize();
    f.target.copy(pellet.pos).addScaledVector(push, 0.9);
    f.hover = 0;
  }

  // Burst and glide.
  f.stroke -= dt * f.tempo;
  if (f.stroke <= 0) {
    f.bursting = !f.bursting;
    f.stroke = f.bursting ? rand(0.4, 0.9) : rand(0.5, 1.6);
  }
  const thrustGoal = f.dart > 0 ? 1 : f.hover > 0 ? 0.05 : f.bursting ? 1 : 0.15;
  f.thrust += (thrustGoal - f.thrust) * (1 - Math.exp(-dt * (thrustGoal > f.thrust ? 6 : 2)));

  if (f.dart > 0) {
    desired.copy(f.dartDir).multiplyScalar(2.6);
  } else if (f.hover > 0 && !f.leaving && !f.entering) {
    desired.copy(world.current).multiplyScalar(0.5);
    desired.y += Math.sin(world.time * 0.7 + f.phase) * 0.03;
  } else {
    desired.subVectors(f.target, f.pos);
    const d = desired.length();
    const speed = def.speed * f.tempo * (0.5 + 0.7 * f.thrust) * (f.leaving || f.entering ? 1.4 : activity);
    if (d > 1e-3) desired.multiplyScalar((speed * Math.min(1, 0.25 + d / 1.2)) / d);
  }

  // Personal space: from its own kind, and from the pet fish.
  for (let j = 0; j < list.length; j++) {
    const o = list[j];
    if (o === f) continue;
    push.subVectors(f.pos, o.pos);
    const d = push.length();
    if (d < 0.32 && d > 1e-4) desired.addScaledVector(push, ((0.32 - d) / 0.32) * 3 / d);
  }
  for (const rt of world.runtime.values()) {
    push.subVectors(f.pos, rt.pos);
    const d = push.length();
    const r = (rt.radius || 0.6) + 0.35;
    if (d < r && d > 1e-4) desired.addScaledVector(push, ((r - d) / r) * 3 / d);
  }

  const turn = f.dart > 0 ? 6 : def.style === 'shoal' ? 2.4 : 1.8;
  f.vel.lerp(desired, 1 - Math.exp(-dt * turn));
  f.pos.addScaledVector(f.vel, dt);

  // Stay in the water and in its own depth band (it may swim off the sides when leaving).
  f.pos.y = THREE.MathUtils.clamp(f.pos.y, FLOOR + 0.18, world.bounds.maxY + 0.5);
  f.pos.z = THREE.MathUtils.clamp(f.pos.z, def.z[0] - 0.4, def.z[1] + 0.4);
  if (!f.leaving && !f.entering) {
    const lim = xMax(f.pos.z) + 0.3;
    f.pos.x = THREE.MathUtils.clamp(f.pos.x, -lim, lim);
  }

  // Heading, banking into turns, nose down when pecking.
  const flat = Math.hypot(f.vel.x, f.vel.z);
  let dy = 0;
  if (flat > 0.03) {
    dy = Math.atan2(f.vel.x, f.vel.z) - f.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    f.yaw += dy * (1 - Math.exp(-dt * (f.dart > 0 ? 9 : 4)));
  }
  const lean = THREE.MathUtils.clamp(-dy * 0.6 * Math.min(1, flat), -0.5, 0.5);
  f.bank += (lean + f.tilt - f.bank) * (1 - Math.exp(-dt * 3));
  const pitchGoal = f.peck > 0 && f.hover <= 0 ? 0.55 : THREE.MathUtils.clamp(-Math.atan2(f.vel.y, flat + 0.15), -0.5, 0.5);
  f.pitch += (pitchGoal - f.pitch) * (1 - Math.exp(-dt * 3));
  if (f.peck > 0 && f.pos.distanceTo(f.target) < 0.25) f.hover = Math.max(f.hover, 0.3);

  f.phase += dt * (2 + f.thrust * 9 + f.vel.length() * 3 + (f.dart > 0 ? 8 : 0)) * f.tempo;
  f.amp = 0.06 + f.thrust * 0.3 + (f.dart > 0 ? 0.3 : 0);
}

// A tap on the fish itself, or a splash near it: a quick dart away.
export function startleWild(f, from) {
  f.dart = rand(0.4, 0.65);
  f.hover = 0;
  if (from) f.dartDir.subVectors(f.pos, from).setY(0.15);
  else f.dartDir.set(rand(-1, 1), 0.2, -0.6);
  f.dartDir.normalize();
  f.retarget = f.dart + rand(0.5, 1.5);
}
