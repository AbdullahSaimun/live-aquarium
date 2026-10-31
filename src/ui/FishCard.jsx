import { useStore, selectFish, cycleColor, feed } from '../state/store';
import { SPECIES, PERSONALITIES, MOODS } from '../data/species';
import FishIcon from './FishIcon';
import LearnStrip from './LearnStrip';
import usePresence from './usePresence';

const RING = 2 * Math.PI * 15;

// A small ring gauge: icon in the middle, label underneath.
function Gauge({ icon, label, value, color, alert }) {
  return (
    <div className={`gauge${alert ? ' is-alert' : ''}`} title={`${label}: ${Math.round(value * 100)}%`}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle className="gauge-track" cx="18" cy="18" r="15" />
        <circle className="gauge-fill" cx="18" cy="18" r="15" stroke={color} strokeDasharray={`${Math.max(0.02, value) * RING} ${RING}`} />
      </svg>
      <span className="gauge-icon">{icon}</span>
      <small>{label}</small>
    </div>
  );
}

const MOOD_LINES = {
  happy: 'is feeling great!',
  hungry: 'is hungry. Time for a snack?',
  curious: 'wants to see who is watching!',
  sleepy: 'is taking a little nap.',
  weak: 'is weak from hunger. Please feed it now!',
  playing: 'is swimming around Asma. They are best friends!',
  missing: 'misses Asma. Tap 👧 Asma to call her back!',
  scared: 'is scared of the shark! Tap the shark to chase it away.',
  fainted: 'fainted from fright. It will wake up soon.',
};

const MOOD_SHORT = {
  happy: 'Happy',
  hungry: 'Hungry',
  curious: 'Curious',
  sleepy: 'Sleepy',
  weak: 'Weak',
  playing: 'Playing',
  missing: 'Misses Asma',
  scared: 'Scared!',
  fainted: 'Fainted',
};

export default function FishCard() {
  const selected = useStore((s) => (s.settings.infoCards ? s.fish.find((f) => f.id === s.selectedId) : null));
  const lang = useStore((s) => s.settings.factLang);
  const [fish, leaving] = usePresence(selected);
  if (!fish) return null;

  const def = SPECIES[fish.species];
  const mood = MOODS[fish.mood] || MOODS.happy;
  const tummy = Math.max(fish.fullness, 1 - fish.hunger);
  const stage = fish.growth >= 1 ? 'Grown up' : fish.growth < 0.25 ? 'Baby' : 'Growing';
  const full = fish.fullness >= 0.95;

  return (
    <aside className={`card fish-card${leaving ? ' is-leaving' : ''}`} aria-label={`${fish.name} the ${def.label}`}>
      <button className="card-close" onClick={() => selectFish(null)} aria-label="Close">
        ✕
      </button>
      <div key={fish.id} className="card-swap">
        <div className="mini-head">
          <div className="mini-avatar">
            <FishIcon fish={fish} size={40} />
          </div>
          <div className="mini-title">
            <h2>{fish.name}</h2>
            <span className="mini-sub">
              {def.label} · {stage} · {PERSONALITIES[fish.personality]?.label}
            </span>
          </div>
        </div>
        <p className={`mood-pill mood-${fish.mood}`} title={`${fish.name} ${MOOD_LINES[fish.mood] || ''}`}>
          <span>{mood.emoji}</span> {MOOD_SHORT[fish.mood] || mood.label}
        </p>

        <div className="gauges">
          <Gauge icon="🍤" label="Tummy" value={tummy} color="#ff8a4c" alert={tummy < 0.35} />
          <Gauge icon="🌱" label="Growth" value={fish.growth} color="#2fbf8f" />
          <Gauge icon="💪" label="Health" value={fish.health} color={fish.health < 0.5 ? '#e2475d' : '#3d9bff'} alert={fish.health < 0.5} />
          <Gauge icon="❤️" label="Love" value={fish.affection} color="#ff5c9a" />
        </div>

        <LearnStrip key={`${fish.id}${lang}`} id={fish.species} lang={lang} />

        <div className="card-actions mini-actions">
          <button className="btn-small" onClick={feed} disabled={full}>
            {full ? '😋 Full' : '🍤 Feed'}
          </button>
          <button
            className="btn-small btn-color"
            onClick={() => cycleColor(fish)}
            disabled={fish.unlocked < 2}
            title={fish.unlocked < 2 ? 'Grow to 50% to unlock a new colour' : 'Change colour'}
          >
            🎨 {fish.unlocked < 2 ? '🔒' : `${fish.colorIdx + 1}/${fish.unlocked}`}
          </button>
        </div>
      </div>
    </aside>
  );
}
