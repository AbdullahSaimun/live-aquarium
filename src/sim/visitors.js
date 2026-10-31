import { world } from './world';

// Big sea animals that pass far behind the reef, one at a time, so the tank never feels crowded.
// Each crossing is a fixed-length trip from one side to the other; the scene animates it from `t / dur`.
const KINDS = ['manta', 'dolphin', 'whale'];
const DURATION = { manta: 26, dolphin: 16, whale: 34 };
let turn = Math.floor(Math.random() * KINDS.length);

export function visitorActive() {
  return world.visitor.kind !== null;
}

export function startVisitor(kind = KINDS[turn++ % KINDS.length]) {
  const v = world.visitor;
  v.kind = kind;
  v.t = 0;
  v.dur = DURATION[kind];
  v.dir = Math.random() < 0.5 ? 1 : -1;
  v.y = kind === 'whale' ? 1.2 : kind === 'manta' ? 0.4 : 0.8;
  return kind;
}

// Advances the crossing; returns true on the frame the visitor has gone.
export function updateVisitor(dt) {
  const v = world.visitor;
  if (!v.kind) return false;
  v.t += dt;
  if (v.t < v.dur) return false;
  v.kind = null;
  return true;
}
