import { useEffect, useState } from 'react';
import { useStore, openPanel, setSetting, resetAquarium, dismissHint, adoptFish } from '../state/store';
import { SPECIES } from '../data/species';
import { allFacts, UI_TEXT } from '../data/factsBn';
import FishIcon from './FishIcon';

export function LangSwitch() {
  const lang = useStore((s) => s.settings.factLang);
  return (
    <div className="lang-switch" role="group" aria-label="Fact language">
      <button className={lang === 'bn' ? 'is-on' : ''} onClick={() => setSetting('factLang', 'bn')}>
        বাংলা
      </button>
      <button className={lang === 'en' ? 'is-on' : ''} onClick={() => setSetting('factLang', 'en')}>
        English
      </button>
    </div>
  );
}

export function FactPanel() {
  const lang = useStore((s) => s.settings.factLang);
  const facts = allFacts(lang);
  const t = UI_TEXT[lang] || UI_TEXT.en;
  // Same index in both languages, so switching language translates the current fact.
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * facts.length));
  const fact = facts[idx % facts.length];
  const next = () => {
    let n = idx;
    while (n === idx) n = Math.floor(Math.random() * facts.length);
    setIdx(n);
  };
  return (
    <aside className="card panel fact-panel">
      <button className="card-close" onClick={() => openPanel(null)} aria-label="Close">
        ✕
      </button>
      <div className="panel-title">
        <span className="panel-emoji">💡</span>
        <h2 className={lang === 'bn' ? 'bn' : ''}>{t.didYouKnow}</h2>
      </div>
      <LangSwitch />
      <span className={`tag${lang === 'bn' ? ' bn' : ''}`}>{fact.topic}</span>
      <p key={`${lang}${idx}`} className={`big-fact${lang === 'bn' ? ' bn' : ''}`}>
        {fact.text}
      </p>
      <button className={`btn-small${lang === 'bn' ? ' bn' : ''}`} onClick={next}>
        {t.nextFact}
      </button>
    </aside>
  );
}

function Toggle({ label, desc, checked, onChange }) {
  return (
    <label className="toggle">
      <span>
        <strong>{label}</strong>
        <small>{desc}</small>
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-ui" aria-hidden="true" />
    </label>
  );
}

// Full screen hides the browser bars on phones and tablets so the whole screen is ocean.
function FullscreenButton() {
  const supported = typeof document !== 'undefined' && document.fullscreenEnabled;
  const [on, setOn] = useState(() => !!document.fullscreenElement);
  useEffect(() => {
    const sync = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  if (!supported) return null;
  const toggle = () => {
    const req = on ? document.exitFullscreen() : document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    req?.catch?.(() => {});
  };
  return (
    <button className="btn-small btn-soft" onClick={toggle}>
      {on ? '↙️ Exit full screen' : '⛶ Full screen'}
    </button>
  );
}

export function SettingsPanel() {
  const settings = useStore((s) => s.settings);
  const stats = useStore((s) => s.stats);
  const count = useStore((s) => s.fish.length);
  const [confirm, setConfirm] = useState(false);
  return (
    <aside className="card panel settings-panel">
      <button className="card-close" onClick={() => openPanel(null)} aria-label="Close">
        ✕
      </button>
      <div className="panel-title">
        <span className="panel-emoji">⚙️</span>
        <h2>Settings</h2>
      </div>
      <Toggle
        label="Show names"
        desc="Name tags above every fish"
        checked={settings.showNames}
        onChange={(v) => setSetting('showNames', v)}
      />
      <Toggle
        label="Sounds"
        desc="Bubbly plops and chimes, plus a tiny buzz on phones"
        checked={settings.sound}
        onChange={(v) => setSetting('sound', v)}
      />
      <Toggle
        label="Asma visits"
        desc="Asma dives in by herself now and then to play"
        checked={settings.asmaVisits}
        onChange={(v) => setSetting('asmaVisits', v)}
      />
      <Toggle
        label="Calm mode"
        desc="Fewer bubbles and less movement"
        checked={settings.calmMode}
        onChange={(v) => setSetting('calmMode', v)}
      />
      <div className="settings-row">
        <FullscreenButton />
      </div>
      <div className="stats">
        <div>
          <strong>{count}</strong>
          <small>fish</small>
        </div>
        <div>
          <strong>{stats.pellets}</strong>
          <small>snacks eaten</small>
        </div>
        <div>
          <strong>{stats.births}</strong>
          <small>babies born</small>
        </div>
        <div>
          <strong>{stats.treasures || 0}</strong>
          <small>treasures</small>
        </div>
        <div>
          <strong>{stats.asmaVisits || 0}</strong>
          <small>Asma visits</small>
        </div>
      </div>
      {confirm ? (
        <div className="confirm">
          <p>Start over with a brand new aquarium?</p>
          <div className="card-actions">
            <button
              className="btn-small btn-danger"
              onClick={() => {
                setConfirm(false);
                resetAquarium();
              }}
            >
              Yes, start over
            </button>
            <button className="btn-small" onClick={() => setConfirm(false)}>
              Keep my fish
            </button>
          </div>
        </div>
      ) : (
        <button className="link-btn danger" onClick={() => setConfirm(true)}>
          Reset aquarium…
        </button>
      )}
    </aside>
  );
}

export function WelcomeHint() {
  const dismissed = useStore((s) => s.hintDismissed);
  if (dismissed) return null;
  return (
    <div className="welcome-backdrop">
      <div className="card welcome">
        <div className="welcome-fish">🐠🐟🐡</div>
        <h1>Welcome to My Little Ocean!</h1>
        <ul>
          <li>
            <span>👆</span> Tap a fish to say hi and learn about it.
          </li>
          <li>
            <span>🍤</span> Press <b>Feed</b> to drop yummy snacks.
          </li>
          <li>
            <span>🎯</span> Tap the water to drop a snack right there.
          </li>
          <li>
            <span>✋</span> Drag a snack to bring it to a shy fish.
          </li>
          <li>
            <span>🪙</span> Tap the treasure chest for a surprise fact.
          </li>
          <li>
            <span>👧</span> Call <b>Asma</b>: she dives in, plays with the fish and shares snacks!
          </li>
          <li>
            <span>⏰</span> Feed them on time: very hungry fish get weak and can die.
          </li>
          <li>
            <span>💖</span> Happy, well-fed fish grow up and may have babies!
          </li>
        </ul>
        <button className="btn-small btn-big" onClick={dismissHint}>
          Let&apos;s dive in!
        </button>
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.className || ''}`}>
          <span>{t.emoji}</span>
          {t.text}
        </div>
      ))}
    </div>
  );
}

function livedFor(ms) {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'}`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} hour${h === 1 ? '' : 's'}`;
  const d = Math.round(h / 24);
  return `${d} days`;
}

export function MemoriesPanel() {
  const memorial = useStore((s) => s.memorial);
  return (
    <aside className="card panel memories-panel">
      <button className="card-close" onClick={() => openPanel(null)} aria-label="Close">
        ✕
      </button>
      <div className="panel-title">
        <span className="panel-emoji">🌈</span>
        <h2>Memories</h2>
      </div>
      {memorial.length === 0 ? (
        <p className="memory-empty">
          Every fish is safe and happy. Keep feeding them on time so they never get too hungry! 💙
        </p>
      ) : (
        <>
          <p className="memory-intro">These friends got too hungry. We will always remember them.</p>
          <ul className="memory-list">
            {[...memorial].reverse().map((m) => (
              <li key={m.id} className="memory">
                <div className="memory-icon">
                  <FishIcon fish={m} size={40} />
                </div>
                <div>
                  <strong>{m.name}</strong>
                  <span className="memory-species">{SPECIES[m.species]?.label}</span>
                  <small>
                    Lived {livedFor(m.died - m.born)} · ate {m.snacks || 0} snack{m.snacks === 1 ? '' : 's'} · {Math.round((m.affection || 0) * 100)}% love
                  </small>
                  <small>Remembered since {new Date(m.died).toLocaleDateString()}</small>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}

export function EmptyTank() {
  const empty = useStore((s) => s.fish.length === 0);
  if (!empty) return null;
  return (
    <div className="card empty-tank">
      <div className="welcome-fish">🫧</div>
      <h2>The tank is very quiet…</h2>
      <p>Your fish are remembered in 🌈 Memories. Would you like to welcome new friends and take good care of them?</p>
      <button className="btn-small btn-big" onClick={adoptFish}>
        Adopt new fish 🐠
      </button>
    </div>
  );
}
