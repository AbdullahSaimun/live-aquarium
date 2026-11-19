import { useEffect, useRef, useState } from 'react';
import { world } from '../sim/world';
import { useStore, sendSubmarineHome, toggleSubLight, subHorn, showCreature } from '../state/store';

const KEYS = {
  ArrowLeft: ['x', -1],
  ArrowRight: ['x', 1],
  ArrowUp: ['y', 1],
  ArrowDown: ['y', -1],
  a: ['x', -1],
  d: ['x', 1],
  w: ['y', 1],
  s: ['y', -1],
};

// The captain's controls while driving the submarine: a joystick (and arrow keys or WASD on a
// computer), plus light, horn, info and "go home" buttons.
export default function SubControls() {
  const driving = useStore((s) => s.subDriving);
  const light = useStore((s) => s.subLight);
  const lang = useStore((s) => s.settings.factLang);
  const base = useRef(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [left, setLeft] = useState(0);
  const active = useRef(null);

  // Keyboard driving.
  useEffect(() => {
    if (!driving) return undefined;
    const held = new Set();
    const apply = () => {
      if (active.current !== null) return; // the joystick wins while it is held
      let x = 0;
      let y = 0;
      held.forEach((k) => {
        const [axis, v] = KEYS[k];
        if (axis === 'x') x += v;
        else y += v;
      });
      world.sub.input.x = Math.max(-1, Math.min(1, x));
      world.sub.input.y = Math.max(-1, Math.min(1, y));
    };
    const down = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!KEYS[k]) return;
      e.preventDefault();
      held.add(k);
      apply();
    };
    const up = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      held.delete(k);
      apply();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    const timer = setInterval(() => setLeft(Math.max(0, Math.ceil(world.sub.drive))), 500);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      clearInterval(timer);
      world.sub.input.x = 0;
      world.sub.input.y = 0;
    };
  }, [driving]);

  if (!driving) return null;

  const move = (e) => {
    if (active.current !== e.pointerId) return;
    const r = base.current.getBoundingClientRect();
    const radius = r.width / 2;
    let x = (e.clientX - (r.left + radius)) / radius;
    let y = (e.clientY - (r.top + radius)) / radius;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    setKnob({ x, y });
    world.sub.input.x = x;
    world.sub.input.y = -y;
  };
  const start = (e) => {
    active.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // capture is a nicety: dragging still works while the finger stays on the stick
    }
    move(e);
  };
  const end = (e) => {
    if (active.current !== e.pointerId) return;
    active.current = null;
    setKnob({ x: 0, y: 0 });
    world.sub.input.x = 0;
    world.sub.input.y = 0;
  };
  const bn = lang === 'bn';

  return (
    <div className="sub-controls" role="group" aria-label="Submarine controls">
      <div className="sub-buttons">
        <button className={`sub-btn${light ? ' is-on' : ''}`} onClick={toggleSubLight} aria-label="Headlight" title="Headlight">
          💡
        </button>
        <button className="sub-btn" onClick={subHorn} aria-label="Horn" title="Horn">
          📯
        </button>
        <button className="sub-btn" onClick={() => showCreature('submarine')} aria-label="About submarines" title="About submarines">
          ℹ️
        </button>
        <button className="sub-btn sub-home" onClick={sendSubmarineHome} aria-label="Send the submarine home" title="Send home">
          🏠
        </button>
      </div>
      <div className="sub-timer" aria-live="off">
        🚢 {bn ? 'ক্যাপ্টেন তুমি!' : "You're the captain!"} <b>{left}s</b>
      </div>
      <div
        ref={base}
        className="sub-stick"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        aria-label="Joystick: drag to drive"
      >
        <span className="sub-knob" style={{ transform: `translate(calc(-50% + ${knob.x * 34}px), calc(-50% + ${knob.y * 34}px))` }} />
      </div>
    </div>
  );
}
