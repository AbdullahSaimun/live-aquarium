import { useStore, openPanel, buyDecor, toggleDecor } from '../state/store';
import { DECOR, DECOR_IDS, decorText } from '../data/decor';
import { bnNumber } from '../data/birthday';

const TEXT = {
  en: {
    title: 'Decorate',
    intro: 'Earn pearls by playing: open the treasure chest, collect stickers, and look inside the giant clam. Then make the tank your own!',
    buy: 'Buy',
    need: (n) => `${n} more`,
    show: 'Show',
    hide: 'Hide',
    inTank: 'In your tank',
    stored: 'Put away',
  },
  bn: {
    title: 'সাজাও',
    intro: 'খেলে খেলে মুক্তা জমাও: গুপ্তধনের সিন্দুক খোলো, স্টিকার জমাও, দৈত্যাকার ঝিনুকের ভেতরে দেখো। তারপর ট্যাংকটা নিজের মতো সাজাও!',
    buy: 'কিনো',
    need: (n) => `আরও ${bnNumber(n)}টা`,
    show: 'দেখাও',
    hide: 'লুকাও',
    inTank: 'ট্যাংকে আছে',
    stored: 'তুলে রাখা',
  },
};

// The pearl shop: buy decorations, then show or hide the ones you own.
export default function DecorPanel() {
  const pearls = useStore((s) => s.stats.pearls || 0);
  const owned = useStore((s) => s.stats.decor || {});
  const lang = useStore((s) => s.settings.factLang);
  const t = TEXT[lang] || TEXT.en;
  const bn = lang === 'bn' ? ' bn' : '';
  return (
    <aside className="card panel decor-panel">
      <button className="card-close" onClick={() => openPanel(null)} aria-label="Close">
        ✕
      </button>
      <div className="panel-title">
        <span className="panel-emoji">🏰</span>
        <h2 className={bn.trim()}>{t.title}</h2>
        <span className="pearl-chip is-static" aria-label={`${pearls} pearls`}>
          <span className="pearl-dot" aria-hidden="true" />
          <span className="pearl-count">{pearls}</span>
        </span>
      </div>
      <p className={`decor-intro${bn}`}>{t.intro}</p>
      <ul className="decor-list">
        {DECOR_IDS.map((id) => {
          const item = DECOR[id];
          const text = decorText(id, lang);
          const mine = owned[id];
          const short = item.price - pearls;
          return (
            <li key={id} className={`decor-item${mine ? ' is-owned' : ''}`}>
              <span className="decor-emoji" aria-hidden="true">
                {item.emoji}
              </span>
              <div className="decor-info">
                <strong className={bn.trim()}>{text.label}</strong>
                <small className={bn.trim()}>{mine ? (mine.shown ? `✅ ${t.inTank}` : `📦 ${t.stored}`) : text.blurb}</small>
              </div>
              {mine ? (
                <button className={`btn-small decor-btn${mine.shown ? ' btn-soft' : ''}${bn}`} onClick={() => toggleDecor(id)}>
                  {mine.shown ? t.hide : t.show}
                </button>
              ) : (
                <button
                  className={`btn-small decor-btn${short > 0 ? ' is-short' : ''}${bn}`}
                  onClick={() => buyDecor(id)}
                  aria-label={`${t.buy} ${text.label}, ${item.price} pearls`}
                >
                  <span className="pearl-dot" aria-hidden="true" />
                  {short > 0 ? t.need(short) : `${lang === 'bn' ? bnNumber(item.price) : item.price} · ${t.buy}`}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
