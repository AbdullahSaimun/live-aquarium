const KEY = 'my-little-ocean:v1';

const FISH_FIELDS = [
  'id', 'name', 'species', 'personality', 'colorIdx', 'unlocked', 'growth', 'affection',
  'hunger', 'fullness', 'babies', 'born', 'health', 'snacks',
];

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.fish)) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    const fish = state.fish.map((f) => {
      const out = {};
      for (const k of FISH_FIELDS) out[k] = f[k];
      return out;
    });
    const data = {
      fish,
      memorial: state.memorial,
      settings: state.settings,
      stats: state.stats,
      hintDismissed: state.hintDismissed,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage may be full or blocked (private mode); the game keeps working in memory.
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
