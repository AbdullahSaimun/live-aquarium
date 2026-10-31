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
