import { useStore, feed, openPanel, selectFish } from '../state/store';
import { MOODS } from '../data/species';
import FishIcon from './FishIcon';

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

export default function HUD() {
  const panel = useStore((s) => s.panel);
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">🐠</span>
          <span className="brand-text">My Little Ocean</span>
        </div>
        <Roster />
      </header>

      <nav className="actionbar">
        <button className={`btn btn-round${panel === 'facts' ? ' is-on' : ''}`} onClick={() => openPanel('facts')}>
          <span className="btn-emoji">💡</span>
          <span className="btn-label">Facts</span>
        </button>
        <button className="btn btn-feed" onClick={feed}>
          <span className="btn-emoji">🍤</span>
          <span className="btn-label">Feed</span>
        </button>
        <button className={`btn btn-round${panel === 'memories' ? ' is-on' : ''}`} onClick={() => openPanel('memories')}>
          <span className="btn-emoji">🌈</span>
          <span className="btn-label">Memories</span>
        </button>
        <button className={`btn btn-round${panel === 'settings' ? ' is-on' : ''}`} onClick={() => openPanel('settings')}>
          <span className="btn-emoji">⚙️</span>
          <span className="btn-label">Settings</span>
        </button>
      </nav>
    </>
  );
}
