import { useSyncExternalStore } from 'react';

// DOM label elements per fish id; positioned every frame by the fish (no React re-render).
export const labelEls = new Map();

// Bumped only when some fish's emote changes, so the overlay re-renders rarely.
let version = 0;
const listeners = new Set();

export function bumpLabels() {
  version++;
  listeners.forEach((l) => l());
}

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const get = () => version;

export function useLabelVersion() {
  return useSyncExternalStore(subscribe, get, get);
}
