import { useStore, closeCreature } from '../state/store';
import { creatureInfo } from '../data/factsBn';
import FishIcon from './FishIcon';
import LearnStrip from './LearnStrip';
import usePresence from './usePresence';

const KIND_LABEL = {
  en: { fish: 'Pet fish', neighbour: 'Tank friend', night: 'Night friend', visitor: 'Ocean visitor', rare: 'Rare visitor', hidden: 'Hidden friend' },
  bn: { fish: 'পোষা মাছ', neighbour: 'ট্যাংকের বন্ধু', night: 'রাতের বন্ধু', visitor: 'সমুদ্রের অতিথি', rare: 'বিরল অতিথি', hidden: 'লুকানো বন্ধু' },
};

// Picture for a creature: pet fish use their drawn icon, everyone else an emoji.
export function CreatureAvatar({ id, kind, emoji, size = 40 }) {
  if (kind === 'fish') return <FishIcon fish={{ species: id, colorIdx: 0 }} size={size} />;
  return (
    <span className="creature-emoji" style={{ fontSize: size * 0.8 }} aria-hidden="true">
      {emoji}
    </span>
  );
}

// Header plus learning strip; used by the floating card and inside the sticker book.
export function CreatureDetails({ id, lang }) {
  const info = creatureInfo(id, lang);
  const bn = lang === 'bn' ? ' bn' : '';
  return (
    <>
      <div className="mini-head">
        <div className="mini-avatar">
          <CreatureAvatar id={id} kind={info.kind} emoji={info.emoji} />
        </div>
        <div className="mini-title">
          <h2 className={bn.trim()}>{info.label}</h2>
          <span className={`mini-sub${bn}`}>{(KIND_LABEL[lang] || KIND_LABEL.en)[info.kind]}</span>
        </div>
      </div>
      <LearnStrip key={`${id}${lang}`} id={id} lang={lang} />
    </>
  );
}

// Opens when a tank neighbour or a passing visitor is tapped.
export default function CreatureCard() {
  const current = useStore((s) => s.creatureId);
  const lang = useStore((s) => s.settings.factLang);
  const [id, leaving] = usePresence(current);
  if (!id) return null;
  return (
    <aside className={`card fish-card creature-card${leaving ? ' is-leaving' : ''}`} aria-label="Sea creature">
      <button className="card-close" onClick={closeCreature} aria-label="Close">
        ✕
      </button>
      <div key={id} className="card-swap">
        <CreatureDetails id={id} lang={lang} />
      </div>
    </aside>
  );
}
