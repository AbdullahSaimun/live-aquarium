import { useEffect, useRef, useState } from 'react';

// Keeps the last non-null value around for `ms` after it goes away, so a card can play its
// closing animation. Returns [valueToShow, isLeaving].
export default function usePresence(value, ms = 180) {
  const last = useRef(value);
  const [, rerender] = useState(0);
  if (value) last.current = value;

  useEffect(() => {
    if (value || !last.current) return undefined;
    const id = setTimeout(() => {
      last.current = null;
      rerender((n) => n + 1);
    }, ms);
    return () => clearTimeout(id);
  }, [value, ms]);

  const shown = value || last.current;
  return [shown, !value && !!shown];
}
