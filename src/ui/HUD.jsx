import { useStore, feed, openPanel, selectFish, cycleTankTime } from '../state/store';
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

export default function HUD() {
  const panel = useStore((s) => s.panel);
  const flash = useStore((s) => s.stickerFlash);
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

      <nav className="actionbar" aria-label="Actions">
        <button className={`btn btn-round btn-facts${panel === 'facts' ? ' is-on' : ''}`} onClick={() => openPanel('facts')}>
          <span className="btn-emoji">💡</span>
          <span className="btn-label">Facts</span>
        </button>
        <button className={`btn btn-round btn-memories${panel === 'memories' ? ' is-on' : ''}`} onClick={() => openPanel('memories')}>
          <span className="btn-emoji">🌈</span>
          <span className="btn-label">Memories</span>
        </button>
        <button
          key={flash || 0}
          className={`btn btn-round btn-stickers${panel === 'stickers' ? ' is-on' : ''}${flash ? ' is-new' : ''}`}
          onClick={() => openPanel('stickers')}
        >
          <span className="btn-emoji">📖</span>
          <span className="btn-label">Stickers</span>
        </button>
        <button className="btn btn-feed" onClick={feed}>
          <span className="btn-emoji">🍤</span>
          <span className="btn-label">Feed</span>
        </button>
        <AsmaButton />
        <button className={`btn btn-round btn-settings${panel === 'settings' ? ' is-on' : ''}`} onClick={() => openPanel('settings')}>
          <span className="btn-emoji">⚙️</span>
          <span className="btn-label">Settings</span>
        </button>
      </nav>
    </>
  );
}
