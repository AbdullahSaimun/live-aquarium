import { useStore } from '../state/store';
import { labelEls, useLabelVersion } from '../state/labels';
import { world } from '../sim/world';
import { AsmaBubble } from './Asma';

const EMOTES = {
  love: { icon: '💖', text: null },
  hungry: { icon: '🍤', text: 'Food please!' },
  sleepy: { icon: '💤', text: 'Zzz' },
  curious: { icon: '👀', text: 'Hi there!' },
  full: { icon: '😋', text: "I'm full!" },
  weak: { icon: '🥺', text: 'So hungry...' },
  playing: { icon: '🥰', text: 'Asma!' },
  miss: { icon: '💭', text: 'Bring Asma back!' },
};

// Name tags and emote speech bubbles, drawn as plain DOM above the canvas.
export default function FishLabels() {
  useLabelVersion();
  const fish = useStore((s) => s.fish);
  const selectedId = useStore((s) => s.selectedId);
  const showNames = useStore((s) => s.settings.showNames);

  return (
    <div className="fish-labels" aria-hidden="true">
      <AsmaBubble />
      {fish.map((f) => {
        const emote = world.runtime.get(f.id)?.emote;
        const e = emote && EMOTES[emote];
        const selected = f.id === selectedId;
        return (
          <div
            key={f.id}
            className="fish-label"
            ref={(el) => {
              if (el) labelEls.set(f.id, el);
              else labelEls.delete(f.id);
            }}
          >
            <div className={`fish-tag${selected ? ' is-selected' : ''}`}>
              {e && (
                <div key={emote} className={`emote emote-${emote}`}>
                  <span className="emote-icon">{e.icon}</span>
                  {e.text && <span className="emote-text">{e.text}</span>}
                </div>
              )}
              {(showNames || selected) && <div className="fish-name">{f.name}</div>}
              {selected && <div className="fish-pointer">▼</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
