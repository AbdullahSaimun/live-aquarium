// Small "alive" motions shared by the tank's animals, so nothing loops like a machine.

const rand = (a, b) => a + Math.random() * (b - a);

/**
 * A glance: every few seconds the animal looks somewhere new (or back ahead), turning quickly at
 * first and settling softly, then holding still for a while. `range` is the widest look in radians.
 */
export function createGlance(range, every = [2, 6]) {
  return { v: 0, goal: 0, wait: rand(every[0], every[1]), range, every };
}

export function glance(g, dt, speed = 3) {
  g.wait -= dt;
  if (g.wait <= 0) {
    g.wait = rand(g.every[0], g.every[1]);
    g.goal = Math.random() < 0.35 ? 0 : rand(-1, 1) * g.range;
  }
  g.v += (g.goal - g.v) * (1 - Math.exp(-dt * speed));
  return g.v;
}

/** The slow water current: a gently turning direction with occasional soft gusts. */
export function tickCurrent(current, t) {
  const a = Math.sin(t * 0.031) * 0.9;
  const gust = Math.max(0, Math.sin(t * 0.23)) ** 4 * 0.12;
  const s = 0.1 + Math.sin(t * 0.11) * 0.04 + gust;
  current.set(Math.cos(a) * s, 0, Math.sin(a) * s * 0.4);
}
