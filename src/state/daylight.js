// Tank time of day. 'auto' follows the real clock; the other settings pin the tank to one look.
export const TANK_TIMES = ['auto', 'day', 'sunset', 'night'];
export const PHASE_ICON = { day: '☀️', sunset: '🌅', night: '🌙' };

export function phaseFor(setting, now = new Date()) {
  if (setting && setting !== 'auto') return setting;
  const h = now.getHours();
  if (h >= 6 && h < 17) return 'day';
  if (h >= 17 && h < 19) return 'sunset';
  return 'night';
}

// Targets the scene eases towards: overall brightness and how much orange sunset tint to add.
export const PHASE_LIGHT = {
  day: { light: 1, dusk: 0 },
  sunset: { light: 0.62, dusk: 1 },
  night: { light: 0, dusk: 0 },
};

// Where the sun is: `elev` 0 (horizon) to 1 (overhead), `side` -1 (morning, left) to 1 (evening,
// right), `warm` 0 (white noon light) to 1 (golden). Pinned looks get fixed values.
export function sunFor(setting, now = new Date()) {
  if (setting === 'day') return { elev: 0.85, side: -0.3, warm: 0.1 };
  if (setting === 'sunset') return { elev: 0.18, side: 0.85, warm: 1 };
  if (setting === 'night') return { elev: 0.6, side: 0.25, warm: 0 };
  const h = now.getHours() + now.getMinutes() / 60;
  if (h < 6 || h >= 19.5) return { elev: 0.6, side: 0.25, warm: 0 }; // the moon
  const k = Math.min(1, Math.max(0, (h - 6) / 13)); // 6:00 → 0, 19:00 → 1
  const elev = Math.sin(Math.PI * k);
  return { elev, side: -Math.cos(Math.PI * k), warm: Math.pow(1 - elev, 1.6) };
}
