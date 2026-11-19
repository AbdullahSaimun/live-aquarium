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
    bank: 0, // lean into turns
    turnRate: 0, // eased yaw speed: the head leads into a turn
    tempo: rand(0.85, 1.18), // every fish has its own rhythm
    breathRate: rand(1.4, 2.2),
    stroke: rand(0, 1), // seconds left in this burst or glide
    bursting: true,
    thrust: 0.6, // eased 0..1: strong tail beats in a burst, almost still in a glide
    hover: 0, // seconds left hanging in place, sculling the fins
    startle: 0, // seconds left darting away from a tap
    startleDir: new THREE.Vector3(),
    lastStartle: -Infinity,
    look: new THREE.Vector3(), // what the fish is glancing at
    lookTime: 0,
    nextLook: rand(3, 9),
    glance: 0,
    buddy: null, // another fish to swim beside for a while
    buddyTime: 0,
    nextBuddy: rand(15, 40),
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
    puff: 0, // pufferfish only: eased 0..1 from slim to spiky ball
    puffUp: 0, // seconds left puffed after a tap
    // Each fish circles Asma on its own little orbit.
    orbit: { angle: Math.random() * Math.PI * 2, radius: rand(1.3, 2.3), dir: Math.random() < 0.5 ? -1 : 1, seed: rand(0, 10) },
  };
}

function pickWanderTarget(rt, fish, mood) {
  const b = world.bounds;
  const t = rt.target;
  rt.anemone = false;
  if (mood === 'sleepy') {
    t.set(rand(b.minX, b.maxX) * 0.8, b.minY + rand(0.1, 0.6), rand(b.minZ, b.maxZ - 1));
  } else if (mood === 'hungry' || mood === 'weak') {
    // Come up to the "glass" and beg, near where the fish already is.
    const y = mood === 'weak' ? rand(-1.8, -0.8) : rand(-0.6, 1.2);
    t.set(THREE.MathUtils.clamp(rt.pos.x + rand(-1.5, 1.5), b.minX, b.maxX), y, b.maxZ);
  } else if (mood === 'curious' && world.observe) {
    // Just watching: go and inspect something on the reef instead of the glass.
    inspectSomething(rt, b);
  } else if (mood === 'curious') {
    t.set(rand(-2, 2) * Math.min(1, b.maxX / 4), rand(-0.3, 1), b.maxZ);
  } else if (fish.species === 'clownfish' && Math.random() < 0.35 && visitAnemone(rt, b)) {
    // Clownfish snuggle into their anemone home now and then.
  } else if (Math.random() < 0.28 && rt.hover <= 0) {
    // Real fish often just hang in the water for a moment, fins sculling.
    rt.hover = rand(2.5, 6) / rt.tempo;
    t.copy(rt.pos);
  } else {
    // Explore onwards from here, roughly the way it is facing, inside its favourite layer.
    const zone = ZONES[fish.species] || ZONES.default;
    const shy = fish.personality === 'shy';
    const heading = rt.yaw + rand(-1.1, 1.1) + (Math.random() < 0.2 ? Math.PI : 0);
    const reach = rand(1.6, 4.2);
    const lowY = THREE.MathUtils.lerp(b.minY, b.maxY, zone[0]);
    const highY = THREE.MathUtils.lerp(b.minY, b.maxY, zone[1]);
    t.set(
      THREE.MathUtils.clamp(rt.pos.x + Math.sin(heading) * reach, b.minX + 0.3, b.maxX - 0.3),
      THREE.MathUtils.clamp(rt.pos.y + rand(-0.9, 0.9), lowY, highY),
      THREE.MathUtils.clamp(rt.pos.z + Math.cos(heading) * reach * 0.6, b.minZ, shy ? (b.minZ + b.maxZ) / 2 : b.maxZ - 0.5),
    );
  }
  rt.retarget = rand(4, 9) / rt.tempo;
}

// Where in the water (0 = floor, 1 = top) each species likes to be, and how stately it swims.
const ZONES = {
  default: [0.15, 0.9],
  clownfish: [0.05, 0.55],
  blueTang: [0.3, 0.95],
  yellowTang: [0.25, 0.85],
  angelfish: [0.3, 0.85],
  batfish: [0.35, 0.95],
  betta: [0.55, 1.0],
  pufferfish: [0.0, 0.45],
};
const PACE = { angelfish: 0.8, batfish: 0.78, betta: 0.85, pufferfish: 0.8 };

// Something interesting on the reef: a neighbour animal or another fish.
function inspectSomething(rt, b) {
  const spots = [world.crabPos, world.octopusPos];
  for (const other of world.runtime.values()) if (other !== rt) spots.push(other.pos);
  const p = spots[Math.floor(Math.random() * spots.length)];
  if (!p || p.y < -20) {
    rt.target.set(rand(b.minX, b.maxX), rand(b.minY + 0.3, b.maxY), rand(b.minZ, b.maxZ - 0.5));
    return;
  }
  rt.target.set(p.x + rand(-0.6, 0.6), Math.max(p.y + 0.5, b.minY + 0.2), p.z + rand(0.3, 0.8));
  rt.look.copy(p);
  rt.lookTime = 3;
}

// The anemones in Coral.jsx; clownfish only visit one that is on screen.
const ANEMONES = [
  [-3.4, -0.8],
  [6.4, 1.2],
];
function visitAnemone(rt, b) {
  const homes = ANEMONES.filter(([x]) => x > b.minX + 0.3 && x < b.maxX - 0.3);
  if (!homes.length) return false;
  const [x, z] = homes[Math.floor(Math.random() * homes.length)];
  rt.target.set(x + rand(-0.15, 0.15), world.floorY + 0.95, z + rand(-0.1, 0.1));
  rt.anemone = true;
  return true;
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
    // Night makes everyone drowsy: naps come about 2.5 times as often in the dark.
    rt.nextSleep -= dt * persona.sleepiness * (1 + (1 - world.light) * 1.5);
    if (rt.nextSleep <= 0) {
      rt.nextSleep = rand(70, 140);
      if (fish.hunger < 0.6 && fish.health > 0.5 && !food) {
        rt.sleeping = rand(10, 16) * (1 + (1 - world.light) * 0.8);
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
  const missing = !world.observe && asma.missing && Math.sin(world.time * 0.35 + rt.orbit.seed) > 0.3;

  let mood = 'happy';
  if (rt.sleeping > 0) mood = 'sleepy';
  else if (fish.health < 0.5 && !seeking && !world.observe) mood = 'weak';
  else if (seeking) mood = 'hungry';
  else if (withAsma) mood = 'playing';
  else if (fish.hunger > 0.65 && !world.observe) mood = 'hungry';
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

  // A tap in the water close by: a quick C-shaped flinch away, then calm again.
  const st = world.startle;
  if (st.time > rt.lastStartle && world.time - st.time < 0.2) {
    rt.lastStartle = st.time;
    const d = rt.pos.distanceTo(st.pos);
    if (d < 3.2 && !panicking) {
      rt.startle = rand(0.45, 0.7);
      rt.startleDir.subVectors(rt.pos, st.pos).setY(0.2).normalize();
      rt.hover = 0;
      rt.sleeping = 0;
      rt.retarget = rt.startle + rand(0.3, 1);
    }
  }
  rt.startle = Math.max(0, rt.startle - dt);

  // Glances: now and then the head turns towards something nearby.
  rt.lookTime = Math.max(0, rt.lookTime - dt);
  rt.nextLook -= dt;
  if (rt.nextLook <= 0) {
    rt.nextLook = rand(4, 11);
    let best = null;
    let bestD = 4;
    for (const other of mates) {
      if (other === rt) continue;
      const d = other.pos.distanceTo(rt.pos);
      if (d < bestD) {
        best = other.pos;
        bestD = d;
      }
    }
    if (food && food.dist < 6) best = food.pellet.pos;
    if (best) {
      rt.look.copy(best);
      rt.lookTime = rand(1.2, 2.6);
    }
  }

  // Friends: two fish sometimes swim side by side for a while.
  rt.buddyTime = Math.max(0, rt.buddyTime - dt);
  if (rt.buddyTime <= 0) rt.buddy = null;
  rt.nextBuddy -= dt;
  if (rt.nextBuddy <= 0) {
    rt.nextBuddy = rand(25, 60);
    const others = [...world.runtime.values()].filter((o) => o !== rt && o.buddy !== rt);
    if (others.length) {
      rt.buddy = others[Math.floor(Math.random() * others.length)];
      rt.buddyTime = rand(8, 16);
    }
  }
  rt.hover = Math.max(0, rt.hover - dt);

  // --- choose where to go ---
  rt.retarget -= dt;
  // A clownfish that reached its anemone stays and snuggles for a while.
  if (rt.anemone && !seeking && rt.pos.distanceTo(rt.target) < 0.8) {
    rt.anemone = false;
    rt.linger = rand(5, 8);
    rt.retarget = rt.linger;
    world.partnerEvents.push('anemone');
  }
  if (rt.linger > 0) rt.linger -= dt;
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
  } else if (!seeking && world.cleaning?.fishId === fish.id && world.time < world.cleaning.until) {
    // Invited to the cleaning station: hover still above the shrimp with fins spread.
    rt.target.copy(world.cleaning.pos);
    rt.retarget = 1;
  } else if (!seeking && mood === 'happy' && rt.buddy && rt.hover <= 0 && !(rt.linger > 0)) {
    // Swim beside the friend, a little to one side.
    rt.target.set(rt.buddy.pos.x + rt.orbit.dir * 0.9, rt.buddy.pos.y + 0.25, rt.buddy.pos.z + 0.4);
    rt.retarget = 1;
  } else if (!seeking && (rt.retarget <= 0 || (mood === 'happy' && !(rt.linger > 0) && rt.pos.distanceTo(rt.target) < 0.8))) {
    pickWanderTarget(rt, fish, mood);
  }
  const goal = seeking ? seeking.pos : rt.target;

  // Burst and glide: a few strong tail strokes, then coasting, like real reef fish.
  rt.stroke -= dt * rt.tempo;
  if (rt.stroke <= 0) {
    rt.bursting = !rt.bursting;
    rt.stroke = rt.bursting ? rand(0.5, 1.1) : rand(0.6, 1.8);
  }
  const relaxed = mood === 'happy' || mood === 'curious';
  const thrustGoal = !relaxed || seeking ? 0.85 : rt.hover > 0 ? 0.05 : rt.bursting ? 1 : 0.12;
  rt.thrust += (thrustGoal - rt.thrust) * (1 - Math.exp(-dt * (thrustGoal > rt.thrust ? 6 : 2)));

  let speed = 1.0 * persona.speed * rt.tempo * (PACE[fish.species] || 1);
  if (relaxed && !seeking) speed *= 0.5 + 0.75 * rt.thrust;
  if (mood === 'sleepy') speed = 0.28;
  else if (seeking) speed = 2.1 * Math.min(1.2, persona.speed);
  else if (mood === 'hungry') speed = 1.25;
  else if (mood === 'weak') speed = 0.5;
  else if (mood === 'playing') speed = 1.5;
  if (rt.happyTimer > 0) speed *= 1.3;
  speed *= 0.55 + 0.45 * Math.min(1, fish.health * 2); // starving fish run out of energy

  desired.subVectors(goal, rt.pos);
  const distToGoal = desired.length();
  const atGlass = !seeking && !world.observe && (mood === 'hungry' || mood === 'curious' || mood === 'weak' || mood === 'missing') && distToGoal < 1;
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
  } else if (rt.startle > 0) {
    // Flinch: a fast dart away from the splash.
    desired.copy(rt.startleDir).multiplyScalar(3.4);
  } else if (rt.hover > 0 && !seeking && relaxed) {
    // Hang in the water: drift with the current, a tiny bob.
    desired.copy(world.current).multiplyScalar(0.6);
    desired.y += Math.sin(world.time * 0.6 + rt.tailPhase) * 0.04;
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

  const turn = rt.startle > 0 ? 7 : mood === 'scared' ? 4 : seeking ? 3 : mood === 'sleepy' || mood === 'fainted' ? 0.8 : 1.6;
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
    const step = dy * (1 - Math.exp(-dt * 5));
    rt.yaw += step;
    rt.turnRate += (step / Math.max(dt, 1e-3) - rt.turnRate) * (1 - Math.exp(-dt * 6));
    // Lean into the turn like a real fish, more when swimming fast.
    const lean = THREE.MathUtils.clamp(-dy * 0.55 * Math.min(1, flatSpeed), -0.5, 0.5);
    rt.bank += (lean - rt.bank) * (1 - Math.exp(-dt * 3));
  } else {
    rt.bank *= Math.exp(-dt * 3);
    rt.turnRate *= Math.exp(-dt * 4);
  }
  const targetPitch = THREE.MathUtils.clamp(-Math.atan2(rt.vel.y, flatSpeed + 0.2), -0.6, 0.6);
  rt.pitch += (targetPitch - rt.pitch) * (1 - Math.exp(-dt * 4));

  const swimSpeed = rt.vel.length();
  // The tail beats fast in a burst and nearly stops in a glide; a startled fish thrashes.
  const tailRate = mood === 'sleepy' ? 2 : (2.2 + rt.thrust * 6 + swimSpeed * 2.5 + (rt.startle > 0 ? 8 : 0)) * rt.tempo;
  rt.tailPhase += dt * tailRate;
  const wiggleTarget = (mood === 'hungry' && atGlass) || rt.happyTimer > 0 || mood === 'scared' ? 1 : 0;
  rt.wiggle += (wiggleTarget - rt.wiggle) * (1 - Math.exp(-dt * 4));
  rt.faint += ((mood === 'fainted' ? 1 : 0) - rt.faint) * (1 - Math.exp(-dt * 4));
  rt.puffUp = Math.max(0, rt.puffUp - dt);
  const puffed = mood === 'scared' || mood === 'fainted' || rt.puffUp > 0 ? 1 : 0;
  rt.puff += (puffed - rt.puff) * (1 - Math.exp(-dt * (puffed ? 7 : 1.5))); // fast to puff, slow to shrink
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
