import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { useStore, feed, openPanel, selectFish, cycleTankTime, sfx } from '../state/store';
import { world } from '../sim/world';
import { PHASE_ICON } from '../state/daylight';
import { MOODS } from '../data/species';
import FishIcon from './FishIcon';
import { AsmaButton } from './Asma';

function Roster() {
  const fish = useStore((s) => s.fish);
  const selectedId = useStore((s) => s.selectedId);
  return (
    <div className="roster" role="list" aria-label="Your fish">
      {fish.map((f) => (
        <button
          key={f.id}
          role="listitem"
          className={`roster-chip${f.id === selectedId ? ' is-active' : ''}`}
          onClick={() => selectFish(f.id === selectedId ? null : f.id)}
          title={`${f.name} is ${MOODS[f.mood]?.label.toLowerCase()}`}
        >
          <FishIcon fish={f} size={28} />
          <span className="roster-name">{f.name}</span>
          <span className="roster-mood">{MOODS[f.mood]?.emoji}</span>
        </button>
      ))}
    </div>
  );
}

// Sun, sunset or moon: shows the tank's time of day; tapping it steps to the next look.
function TimeBadge() {
  const phase = useStore((s) => s.daylight);
  const auto = useStore((s) => s.settings.tankTime === 'auto');
  return (
    <button
      className={`time-badge time-${phase}`}
      onClick={cycleTankTime}
      aria-label={`Tank time: ${phase}${auto ? ', following the clock' : ''}. Tap to change`}
      title={auto ? 'Following the clock. Tap to change' : 'Tap to change. Settings can follow the clock again'}
    >
      <span key={phase}>{PHASE_ICON[phase]}</span>
      {auto && <small>auto</small>}
    </button>
  );
}

const TUCK_KEY = 'my-little-ocean:rail-tucked';

function readTucked() {
  try {
    return window.localStorage.getItem(TUCK_KEY) === '1';
  } catch {
    return false;
  }
}

// The button rail: a slim glass column on the left edge. It can be tucked away so the whole tank shows;
// either way it tells the camera how much of the screen it covers (world.viewInset).
function Rail() {
  const panel = useStore((s) => s.panel);
  const flash = useStore((s) => s.stickerFlash);
  const [tucked, setTucked] = useState(readTucked);
  const nav = useRef(null);

  useLayoutEffect(() => {
    const el = nav.current;
    // offsetLeft/offsetWidth ignore the tuck transform, so this is the rail's resting place.
    const measure = () => {
      world.viewInset = tucked || !el ? 0 : el.offsetLeft + el.offsetWidth + 6;
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (el) ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [tucked]);

  const tuck = (value) => {
    setTucked(value);
    sfx(value ? 'plop' : 'bubbles');
    try {
      window.localStorage.setItem(TUCK_KEY, value ? '1' : '0');
    } catch {
      // private mode: it just won't be remembered
    }
  };

  const round = (name, emoji, label, extra = '') => (
    <button
      className={`btn btn-round btn-${name}${panel === name ? ' is-on' : ''}${extra}`}
      onClick={() => openPanel(name)}
      aria-pressed={panel === name}
      aria-label={label}
      title={label}
    >
      <span className="btn-emoji">{emoji}</span>
      <span className="btn-label">{label}</span>
    </button>
  );

  return (
    <>
      <nav ref={nav} className={`actionbar${tucked ? ' is-tucked' : ''}`} aria-label="Actions" inert={tucked}>
        <button className="btn btn-feed" onClick={feed} aria-label="Feed the fish" title="Feed">
          <span className="btn-emoji">🍤</span>
          <span className="btn-label">Feed</span>
        </button>
        <AsmaButton />
        {round('facts', '💡', 'Facts')}
        <Fragment key={flash || 0}>{round('stickers', '📖', 'Stickers', flash ? ' is-new' : '')}</Fragment>
        {round('memories', '🌈', 'Memories')}
        {round('settings', '⚙️', 'Settings')}
        <button className="rail-tuck" onClick={() => tuck(true)} aria-label="Hide the buttons to see the whole tank">
          <span aria-hidden="true">‹</span>
        </button>
      </nav>
      {tucked && (
        <button className="rail-tab" onClick={() => tuck(false)} aria-label="Show the buttons">
          <span className="rail-tab-icon">🍤</span>
          <span aria-hidden="true">›</span>
        </button>
      )}
    </>
  );
}

export default function HUD() {
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">🐠</span>
          <span className="brand-text">My Little Ocean</span>
        </div>
        <TimeBadge />
        <Roster />
      </header>
      <Rail />
    </>
  );
}
