import { world } from './world';
import { seeded } from '../scene/reefLayout';

// Weather on the surface. About one day in five is a rainy day: a while after the tank opens, a
// rain shower patters on the surface for a few minutes, then the sun comes back with a rainbow glow.
const rand = (a, b) => a + Math.random() * (b - a);

const w = world.weather;
let plannedAt = null; // seconds of play time when today's shower starts (null = no shower today)
let plannedDay = '';

function planToday() {
  const d = new Date();
  const key = d.toDateString();
  if (key === plannedDay) return;
  plannedDay = key;
  const rnd = seeded(d.getFullYear() * 1000 + d.getMonth() * 40 + d.getDate() + 7);
  plannedAt = rnd() < 0.2 ? world.time + 60 + rnd() * 120 : null;
}

export function startRain(seconds = rand(150, 260)) {
  w.rainTarget = 1;
  w.until = world.time + seconds;
  plannedAt = null;
}

/** Once a second from the store. Returns 'start' or 'stop' when the weather changes. */
export function tickWeather() {
  planToday();
  if (plannedAt !== null && world.time >= plannedAt) {
    startRain();
    return 'start';
  }
  if (w.rainTarget > 0 && world.time >= w.until) {
    w.rainTarget = 0;
    w.sunnyUntil = world.time + 45; // the sun breaks through, with a rainbow in the beams
    return 'stop';
  }
  return null;
}

/** Every frame: ease the rain and rainbow in and out. */
export function easeWeather(dt) {
  w.rain += (w.rainTarget - w.rain) * (1 - Math.exp(-dt * 0.5));
  const sunny = world.time < w.sunnyUntil ? 1 : 0;
  w.rainbow += (sunny - w.rainbow) * (1 - Math.exp(-dt * 0.4));
}
