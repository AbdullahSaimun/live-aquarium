import { useEffect, useRef, useState } from 'react';
import { world } from '../sim/world';
import { useStore, sendSubmarineHome, toggleSubLight, subHorn, showCreature, subPhoto } from '../state/store';
import { fireTorpedo, fireMissile, grab, sonarPing, TORPEDO_COOL, MISSILE_COOL, SONAR_COOL } from '../sim/subGear';

const DRIVE_KEYS = {
  ArrowLeft: ['x', -1],
  ArrowRight: ['x', 1],
  ArrowUp: ['y', 1],
  ArrowDown: ['y', -1],
  a: ['x', -1],
  d: ['x', 1],
  w: ['y', 1],
  s: ['y', -1],
};
const ACTION_KEYS = { ' ': fireTorpedo, m: fireMissile, g: grab, r: sonarPing, c: subPhoto, h: sendSubmarineHome };

const T = {
  en: { torpedo: 'Torpedo', missile: 'Missile', grab: 'Grabber', sonar: 'Sonar', photo: 'Camera', light: 'Headlight', horn: 'Horn', info: 'About submarines', home: 'Send home', cleaned: 'cleaned', found: 'found', captain: "You're the captain!" },
  bn: { torpedo: 'টর্পেডো', missile: 'মিসাইল', grab: 'হাতল', sonar: 'সোনার', photo: 'ক্যামেরা', light: 'বাতি', horn: 'হর্ন', info: 'সাবমেরিন সম্পর্কে', home: 'বাড়ি পাঠাও', cleaned: 'পরিষ্কার', found: 'পাওয়া', captain: 'ক্যাপ্টেন তুমি!' },
};

// The captain's console: joystick (or arrow keys / WASD), big Torpedo and Missile buttons with a
// cooldown fill, and a row of tools: grabber, sonar, camera, light, horn, info and home.
export default function SubControls() {
  const driving = useStore((s) => s.subDriving);
  const light = useStore((s) => s.subLight);
  const lang = useStore((s) => s.settings.factLang);
  const cleaned = useStore((s) => s.stats.trashCleaned || 0);
  const found = useStore((s) => s.stats.subTreasure || 0);
  const base = useRef(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [cool, setCool] = useState({ torpedo: 0, missile: 0, sonar: 0 });
  const active = useRef(null);

  // Keyboard driving and actions, and the cooldown fills.
  useEffect(() => {
    if (!driving) return undefined;
    const held = new Set();
    const apply = () => {
      if (active.current !== null) return; // the joystick wins while it is held
      let x = 0;
      let y = 0;
      held.forEach((k) => {
        const [axis, v] = DRIVE_KEYS[k];
        if (axis === 'x') x += v;
        else y += v;
      });
      world.sub.input.x = Math.max(-1, Math.min(1, x));
      world.sub.input.y = Math.max(-1, Math.min(1, y));
    };
    const keyOf = (e) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);
    const down = (e) => {
      if (e.target.closest?.('input, textarea')) return;
      const k = keyOf(e);
      if (DRIVE_KEYS[k]) {
        e.preventDefault();
        held.add(k);
        apply();
      } else if (ACTION_KEYS[k] && !e.repeat) {
        e.preventDefault();
        ACTION_KEYS[k]();
      }
    };
    const up = (e) => {
      held.delete(keyOf(e));
      apply();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    const timer = setInterval(() => setCool({ ...world.gear.cool }), 100);
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
  const t = T[lang] || T.en;
  const fill = (left, total) => ({ '--cool': `${Math.round((left / total) * 100)}%` });

  return (
    <div className={`sub-controls${lang === 'bn' ? ' bn' : ''}`} role="group" aria-label="Submarine controls">
      <div className="sub-buttons">
        <button className="sub-btn" onClick={grab} aria-label={t.grab} title={`${t.grab} (G)`}>
          🦾
        </button>
        <button className="sub-btn sub-cool" style={fill(cool.sonar, SONAR_COOL)} onClick={sonarPing} aria-label={t.sonar} title={`${t.sonar} (R)`}>
          📡
        </button>
        <button className="sub-btn" onClick={subPhoto} aria-label={t.photo} title={`${t.photo} (C)`}>
          📸
        </button>
        <button className={`sub-btn${light ? ' is-on' : ''}`} onClick={toggleSubLight} aria-label={t.light} title={t.light}>
          💡
        </button>
        <button className="sub-btn" onClick={subHorn} aria-label={t.horn} title={t.horn}>
          📯
        </button>
        <button className="sub-btn" onClick={() => showCreature('submarine')} aria-label={t.info} title={t.info}>
          ℹ️
        </button>
        <button className="sub-btn sub-home" onClick={sendSubmarineHome} aria-label={t.home} title={`${t.home} (H)`}>
          🏠
        </button>
      </div>
      <div className="sub-timer">
        🚢 {t.captain} <span className="sub-count">🗑️ {cleaned}</span> <span className="sub-count">💎 {found}</span>
      </div>
      <div className="sub-main">
        <div className="sub-fire">
          <button className="sub-big sub-cool" style={fill(cool.torpedo, TORPEDO_COOL)} onClick={fireTorpedo} aria-label={t.torpedo} title={`${t.torpedo} (Space)`}>
            <span>💥</span>
            <small>{t.torpedo}</small>
          </button>
          <button className="sub-big sub-cool" style={fill(cool.missile, MISSILE_COOL)} onClick={fireMissile} aria-label={t.missile} title={`${t.missile} (M)`}>
            <span>🚀</span>
            <small>{t.missile}</small>
          </button>
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
    </div>
  );
}
