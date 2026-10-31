import { useState } from 'react';
import { useStore, openPanel } from '../state/store';
import { CREATURES, CREATURE_IDS } from '../data/creatures';
import { creatureInfo } from '../data/factsBn';
import { CreatureAvatar, CreatureDetails } from './CreatureCard';
import { LangSwitch } from './Panels';

const SECTIONS = [
  { kind: 'fish', en: 'Pet fish', bn: 'পোষা মাছ' },
  { kind: 'neighbour', en: 'Tank friends', bn: 'ট্যাংকের বন্ধুরা' },
  { kind: 'visitor', en: 'Ocean visitors', bn: 'সমুদ্রের অতিথিরা' },
];

// Every creature the child has met becomes a sticker; tap one to read about it again.
export default function StickerBook() {
  const stickers = useStore((s) => s.stats.stickers);
  const lang = useStore((s) => s.settings.factLang);
  const [open, setOpen] = useState(null);
  const got = CREATURE_IDS.filter((id) => stickers[id]).length;
  const bn = lang === 'bn' ? ' bn' : '';

  return (
    <aside className="card panel sticker-panel">
      <button className="card-close" onClick={() => openPanel(null)} aria-label="Close">
        ✕
      </button>
      {open ? (
        <div key={open} className="card-swap">
          <button className="link-btn sticker-back" onClick={() => setOpen(null)}>
            ← {lang === 'bn' ? 'স্টিকার বই' : 'Sticker book'}
          </button>
          <CreatureDetails id={open} lang={lang} />
        </div>
      ) : (
        <>
          <div className="panel-title">
            <span className="panel-emoji">📖</span>
            <h2 className={bn.trim()}>{lang === 'bn' ? 'সমুদ্রের স্টিকার বই' : 'Ocean sticker book'}</h2>
          </div>
          <div className="sticker-progress" aria-label={`${got} of ${CREATURE_IDS.length} stickers`}>
            <div className="sticker-bar">
              <div style={{ width: `${(got / CREATURE_IDS.length) * 100}%` }} />
            </div>
            <strong>
              {got} / {CREATURE_IDS.length}
            </strong>
          </div>
          <p className={`sticker-hint${bn}`}>
            {lang === 'bn'
              ? 'ট্যাংকের মাছ আর প্রাণীদের ছুঁয়ে দেখো, নতুন স্টিকার পাবে!'
              : 'Tap fish and sea creatures in the tank to collect their stickers!'}
          </p>
          <LangSwitch />
          {SECTIONS.map((sec) => (
            <section key={sec.kind}>
              <h3 className={`sticker-section${bn}`}>{sec[lang] || sec.en}</h3>
              <ul className="sticker-grid">
                {CREATURE_IDS.filter((id) => CREATURES[id].kind === sec.kind).map((id) => {
                  const have = !!stickers[id];
                  const info = creatureInfo(id, lang);
                  return (
                    <li key={id}>
                      <button
                        className={`sticker${have ? ' is-have' : ''}`}
                        onClick={() => have && setOpen(id)}
                        aria-label={have ? info.label : 'Not found yet'}
                        disabled={!have}
                      >
                        <span className="sticker-art">
                          <CreatureAvatar id={id} kind={info.kind} emoji={info.emoji} size={38} />
                        </span>
                        <span className={`sticker-name${bn}`}>{have ? info.label : '?'}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </>
      )}
    </aside>
  );
}
