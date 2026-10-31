import { useState } from 'react';
import { creatureInfo } from '../data/factsBn';
import { CARD_TEXT } from '../data/creatures';

// A mouse wheel scrolls the chip row sideways (touch screens just swipe it).
function scrollSideways(e) {
  const row = e.currentTarget;
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && row.scrollWidth > row.clientWidth) row.scrollLeft += e.deltaY;
}

// Quick-info chips plus a little fact carousel, shared by every learning card.
// Give it a `key` per creature so the carousel starts fresh for each one.
export default function LearnStrip({ id, lang }) {
  const info = creatureInfo(id, lang);
  const t = CARD_TEXT[lang] || CARD_TEXT.en;
  const bn = lang === 'bn' ? ' bn' : '';
  const count = info.facts.length;
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * count));
  const step = (d) => setIdx((i) => (i + d + count) % count);

  return (
    <>
      <ul className={`chips${bn}`} aria-label="Quick facts" onWheel={scrollSideways}>
        {info.chips.map((c) => (
          <li key={c.key} title={c.title}>
            <span aria-hidden="true">{c.icon}</span>
            {c.text}
          </li>
        ))}
      </ul>
      <div className="fact-bubble">
        <span className={`fact-title${bn}`}>💡 {t.didYouKnow}</span>
        <p key={`${lang}${idx}`} className={`fact-text${bn}`}>
          {info.facts[idx % count]}
        </p>
        <div className="fact-nav">
          <button onClick={() => step(-1)} aria-label="Previous fact">
            ◀
          </button>
          <span className="fact-dots" aria-hidden="true">
            {info.facts.map((_, i) => (
              <i key={i} className={i === idx % count ? 'is-on' : ''} />
            ))}
          </span>
          <button onClick={() => step(1)} aria-label="Next fact">
            ▶
          </button>
        </div>
      </div>
    </>
  );
}
