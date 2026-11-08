import { world } from './world';

// Big sea animals that pass far behind the reef, one at a time, so the tank never feels crowded.
// Each crossing is a fixed-length trip from one side to the other; the scene animates it from `t / dur`.
const KINDS = ['manta', 'dolphin', 'whale'];
// Rare guests: chosen by the store now and then (see callVisitor), with a guaranteed one every couple of days.
export const RARE_KINDS = ['orca', 'sunfish', 'humpback'];
const DURATION = { manta: 26, dolphin: 16, whale: 34, orca: 18, sunfish: 40, humpback: 38 };
const HEIGHT = { manta: 0.4, dolphin: 0.8, whale: 1.2, orca: 0.6, sunfish: 0.3, humpback: 1.4 };
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
  v.y = HEIGHT[kind];
  v.rare = RARE_KINDS.includes(kind);
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
