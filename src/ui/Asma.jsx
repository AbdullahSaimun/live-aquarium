import { useStore, inviteAsma } from '../state/store';
import { labelEls } from '../state/labels';
import { world } from '../sim/world';

// Asma's smiling face, used for her card and the call button.
export function AsmaFace({ size = 44, puffed = false }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <circle cx="32" cy="34" r="22" fill="#f8cfae" />
      <path d="M10 34 Q10 10 32 10 Q54 10 54 34 Q50 20 32 19 Q16 20 10 34 Z" fill="#3a2416" />
      <circle cx="52" cy="14" r="7" fill="#3a2416" />
      <circle cx="49" cy="17" r="3" fill="#ff7eb6" />
      <ellipse cx="25" cy="16" rx="6" ry="4" fill="none" stroke="#4fd1ff" strokeWidth="2.5" />
      <ellipse cx="39" cy="16" rx="6" ry="4" fill="none" stroke="#4fd1ff" strokeWidth="2.5" />
      <ellipse cx="24.5" cy="33" rx="2.6" ry="3.2" fill="#1d1b33" />
      <ellipse cx="39.5" cy="33" rx="2.6" ry="3.2" fill="#1d1b33" />
      <circle cx="25.5" cy="31.8" r="1" fill="#fff" />
      <circle cx="40.5" cy="31.8" r="1" fill="#fff" />
      {puffed ? (
        <>
          <circle cx="18" cy="41" r="6" fill="#ffb3c8" />
          <circle cx="46" cy="41" r="6" fill="#ffb3c8" />
          <circle cx="32" cy="45" r="2.6" fill="none" stroke="#e2476d" strokeWidth="2" />
        </>
      ) : (
        <>
          <circle cx="19" cy="40" r="4" fill="#ff8fb1" opacity="0.6" />
          <circle cx="45" cy="40" r="4" fill="#ff8fb1" opacity="0.6" />
          <path d="M26 43 Q32 49 38 43" stroke="#e2476d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

// Speech bubble that AsmaDiver pins above her head each frame.
export function AsmaBubble() {
  const asma = useStore((s) => s.asma);
  if (!asma.visible) return null;
  return (
    <div className="fish-label asma-label" ref={(el) => (el ? labelEls.set('asma', el) : labelEls.delete('asma'))}>
      {asma.line && (
        <div key={asma.line} className="asma-say">
          {asma.line}
        </div>
      )}
    </div>
  );
}

const STATUS = {
  diving: 'Diving in…',
  playing: 'Playing with the fish',
  surfacing: 'Swimming up for air!',
};

// Card with her breath meter while she is underwater.
export function AsmaCard() {
  const asma = useStore((s) => s.asma);
  if (!asma.visible) return null;
  const breath = world.asma.breath;
  const low = breath < 0.3;
  return (
    <div className={`asma-card${low ? ' is-low' : ''}`} role="status">
      <div className="asma-avatar">
        <AsmaFace size={46} puffed />
      </div>
      <div className="asma-info">
        <div className="asma-name">
          Asma <span>💕</span>
        </div>
        <div className="asma-status">{STATUS[asma.phase] || ''}</div>
        <div className="breath" aria-label={`Breath ${Math.round(breath * 100)}%`}>
          <span className="breath-icon">🫧</span>
          <div className="breath-track">
            <div className="breath-fill" style={{ width: `${Math.round(breath * 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Dock button: call Asma, see her resting, or notice the fish asking for her.
export function AsmaButton() {
  const asma = useStore((s) => s.asma);
  const resting = Math.ceil(asma.restUntil - performance.now() / 1000);
  const missed = asma.missUntil > 0;
  let label = 'Asma';
  if (asma.phase !== 'idle') label = 'Visiting';
  else if (resting > 0) label = `${resting}s`;
  return (
    <button
      className={`btn btn-round btn-asma${missed ? ' is-missed' : ''}${asma.phase !== 'idle' ? ' is-on' : ''}`}
      onClick={inviteAsma}
      aria-label="Call Asma to visit the fish"
    >
      {missed && <span className="btn-badge">🥺</span>}
      <AsmaFace size={34} />
      <span className="btn-label">{label}</span>
    </button>
  );
}
