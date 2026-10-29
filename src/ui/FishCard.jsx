import { useEffect, useState } from 'react';
import { useStore, selectFish, cycleColor, feed } from '../state/store';
import { SPECIES, PERSONALITIES, MOODS } from '../data/species';
import { speciesFacts, UI_TEXT } from '../data/factsBn';
import FishIcon from './FishIcon';

function Meter({ label, value, color, note }) {
  return (
    <div className="meter">
      <div className="meter-head">
        <span>{label}</span>
        <span className="meter-note">{note}</span>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
      </div>
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
};

export default function FishCard() {
  const fish = useStore((s) => s.fish.find((f) => f.id === s.selectedId));
  const lang = useStore((s) => s.settings.factLang);
  const [factIdx, setFactIdx] = useState(0);
  useEffect(() => setFactIdx(Math.floor(Math.random() * 3)), [fish?.id]);
  if (!fish) return null;

  const def = SPECIES[fish.species];
  const mood = MOODS[fish.mood] || MOODS.happy;
  const tummy = Math.max(fish.fullness, 1 - fish.hunger);
  const stage = fish.growth >= 1 ? 'Grown up' : fish.growth < 0.25 ? 'Baby' : 'Growing';
  const full = fish.fullness >= 0.95;
  const facts = speciesFacts(fish.species, lang);
  const t = UI_TEXT[lang] || UI_TEXT.en;
  const bn = lang === 'bn' ? ' bn' : '';

  return (
    <aside className="card fish-card" aria-label={`${fish.name} the ${def.label}`}>
      <button className="card-close" onClick={() => selectFish(null)} aria-label="Close">
        ✕
      </button>
      <div className="fish-card-head">
        <div className="fish-avatar">
          <FishIcon fish={fish} size={52} />
        </div>
        <div>
          <h2>{fish.name}</h2>
          <div className="tags">
            <span className="tag">{def.label}</span>
            <span className="tag tag-soft">{PERSONALITIES[fish.personality]?.label}</span>
            <span className="tag tag-soft">{stage}</span>
          </div>
        </div>
      </div>

      <p className={`mood-line mood-${fish.mood}`}>
        <span className="mood-emoji">{mood.emoji}</span> {fish.name} {MOOD_LINES[fish.mood]}
      </p>

      <Meter label="Tummy" value={tummy} color="linear-gradient(90deg,#ffb347,#ff7a59)" note={full ? 'Full!' : tummy < 0.35 ? 'Empty' : ''} />
      <Meter label="Growth" value={fish.growth} color="linear-gradient(90deg,#7ee0b5,#2fbf8f)" note={`${Math.round(fish.growth * 100)}%`} />
      <Meter
        label="Health"
        value={fish.health}
        color={fish.health < 0.5 ? 'linear-gradient(90deg,#ff8a8a,#e2475d)' : 'linear-gradient(90deg,#8fd3ff,#3d9bff)'}
        note={fish.health < 0.5 ? 'Weak!' : fish.health >= 0.99 ? 'Strong' : ''}
      />
      <Meter label="Love" value={fish.affection} color="linear-gradient(90deg,#ffa8d8,#ff5c9a)" note={fish.affection >= 0.8 ? '💖' : ''} />

      <div className="fact-box">
        <span className={`fact-title${bn}`}>{t.fishFact}</span>
        <p className={bn.trim()}>{facts[factIdx % facts.length]}</p>
        <button className={`link-btn${bn}`} onClick={() => setFactIdx((i) => i + 1)}>
          {t.anotherFact}
        </button>
      </div>

      <div className="card-actions">
        <button className="btn-small" onClick={feed} disabled={full}>
          {full ? '😋 Full tummy' : '🍤 Feed'}
        </button>
        {fish.unlocked > 1 ? (
          <button className="btn-small btn-color" onClick={() => cycleColor(fish)}>
            🎨 Color {fish.colorIdx + 1}/{fish.unlocked}
          </button>
        ) : (
          <span className="hint-small">Grow to 50% to unlock a new color</span>
        )}
      </div>
    </aside>
  );
}
