import { useEffect, useMemo, useRef, useState } from 'react';
import { celebrateBirthday, sfx, toast } from '../state/store';
import { birthdayStatus, husbandBirthdayStatus, BIRTHDAY, ordinal, bnNumber, letterFor, wishesFor } from '../data/birthday';
import { loveStatus, formatDate } from '../data/love';
import { FloatingHearts, SecretPrompt, Counters } from './Anniversary';

const PARTY_ICONS = ['🎈', '🎉', '✨', '🎊', '💖', '🌟'];
const DAY = 24 * 60 * 60 * 1000;
const rand = (a, b) => a + Math.random() * (b - a);

// A one-off burst of paper confetti; give it a new `key` to fire again.
function Confetti({ count = 36 }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: rand(-160, 160),
        y: rand(-220, -60),
        r: rand(-540, 540),
        delay: rand(0, 0.15),
        color: ['#ff7eb6', '#ffd23f', '#7ee0b5', '#8fd3ff', '#c9a7ff', '#ff9f5a'][i % 6],
        round: i % 3 === 0,
      })),
    [count],
  );
  return (
    <div className="bday-confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i
          key={i}
          className={b.round ? 'is-round' : ''}
          style={{ '--x': `${b.x}px`, '--y': `${b.y}px`, '--r': `${b.r}deg`, background: b.color, animationDelay: `${b.delay}s` }}
        />
      ))}
    </div>
  );
}

// ---------- scene 1: the present ----------
function Gift({ onOpened }) {
  const [open, setOpen] = useState(false);
  const tap = () => {
    if (open) return;
    setOpen(true);
    sfx('treasure');
    setTimeout(onOpened, 1300);
  };
  return (
    <div className="bday-scene">
      <p className="bday-hint">A present for you… tap to open it 🎁</p>
      <button className={`bday-gift${open ? ' is-open' : ''}`} onClick={tap} aria-label="Open the present">
        <span className="gift-lid">
          <span className="gift-bow" />
        </span>
        <span className="gift-box">
          <span className="gift-ribbon" />
        </span>
        <span className="gift-glow" />
      </button>
      {open && <Confetti />}
    </div>
  );
}

// ---------- scene 2: the cake ----------
// Candles: x position on the top tier, and whether it is a big number candle.
function candleLayout(age) {
  const digits = String(age).split('');
  const small = [62, 78, 162, 178];
  const nums = digits.map((d, i) => ({ x: 120 + (i - (digits.length - 1) / 2) * 34, digit: d }));
  return [...small.slice(0, 2).map((x) => ({ x })), ...nums, ...small.slice(2).map((x) => ({ x }))];
}

function Flame({ x, y }) {
  return (
    <g className="bday-flame" style={{ transformOrigin: `${x}px ${y}px` }}>
      <ellipse cx={x} cy={y - 9} rx="9" ry="14" fill="url(#flameGlow)" opacity="0.65" />
      <path d={`M${x} ${y - 20} C ${x + 7} ${y - 10}, ${x + 5} ${y}, ${x} ${y} C ${x - 5} ${y}, ${x - 7} ${y - 10}, ${x} ${y - 20} Z`} fill="#ffb02e" />
      <path d={`M${x} ${y - 12} C ${x + 3} ${y - 6}, ${x + 2} ${y}, ${x} ${y} C ${x - 2} ${y}, ${x - 3} ${y - 6}, ${x} ${y - 12} Z`} fill="#fff6c9" />
    </g>
  );
}

function Smoke({ x, y }) {
  return (
    <g className="bday-smoke">
      <path d={`M${x} ${y} q 6 -8 0 -16 q -6 -8 0 -16`} />
    </g>
  );
}

function Cake({ age, onDone }) {
  const layout = useMemo(() => candleLayout(age), [age]);
  const [flames, setFlames] = useState(() => layout.map(() => 'unlit'));
  const [stage, setStage] = useState('light'); // light | wish | blow | cheer | cut
  const [puff, setPuff] = useState(0);
  const [sliced, setSliced] = useState(false);
  const lit = flames.filter((f) => f === 'lit').length;

  const light = (i) => {
    if (stage !== 'light' || flames[i] !== 'unlit') return;
    const next = flames.map((f, j) => (j === i ? 'lit' : f));
    setFlames(next);
    sfx('light');
    if (next.every((f) => f === 'lit')) {
      setStage('wish');
      setTimeout(() => setStage('blow'), 3200);
    }
  };
  const lightAll = () => {
    setFlames(layout.map(() => 'lit'));
    sfx('light');
    setStage('wish');
    setTimeout(() => setStage('blow'), 3200);
  };
  // Each puff blows out a few flames, so it takes two or three tries, like a real cake.
  const blow = () => {
    if (stage !== 'blow') return;
    setPuff((n) => n + 1);
    sfx('blow');
    const litIdx = flames.map((f, i) => (f === 'lit' ? i : -1)).filter((i) => i >= 0);
    const out = new Set(litIdx.sort(() => Math.random() - 0.5).slice(0, Math.max(2, Math.ceil(litIdx.length / 2.5))));
    const next = flames.map((f, i) => (out.has(i) ? 'out' : f));
    setFlames(next);
    if (next.every((f) => f !== 'lit')) {
      setStage('cheer');
      setTimeout(() => sfx('birthday'), 350);
    }
  };
  const cut = () => {
    if (stage !== 'cheer' || sliced) return;
    setSliced(true);
    sfx('pop');
    setStage('cut');
  };

  const hint = {
    light: `Tap each candle to light it 🕯️ (${lit}/${layout.length})`,
    wish: 'Close your eyes and make a wish… 🤫',
    blow: 'Now blow out the candles! 💨',
    cheer: 'Hooray! 🎉 Tap the cake to cut a slice',
    cut: 'A slice just for you 🍰',
  }[stage];
  const TOP = 92; // top of the upper tier

  return (
    <div className={`bday-scene bday-cake-scene${stage === 'wish' ? ' is-wishing' : ''}`}>
      <p key={stage} className="bday-hint">
        {hint}
      </p>
      <div className={`bday-cake${puff ? ' is-puffed' : ''}`} key={`puff${puff}`}>
        <svg viewBox="0 0 240 230" role="img" aria-label="Birthday cake" onClick={cut}>
          <defs>
            <radialGradient id="flameGlow">
              <stop offset="0" stopColor="#fff3b0" />
              <stop offset="1" stopColor="#ffb02e" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="tierA" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#ffd1e3" />
              <stop offset="1" stopColor="#ffa9c9" />
            </linearGradient>
            <linearGradient id="tierB" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fff6e8" />
              <stop offset="1" stopColor="#ffe2c2" />
            </linearGradient>
          </defs>
          {/* plate */}
          <ellipse cx="120" cy="212" rx="108" ry="12" fill="#ffffff" stroke="#f3d6e2" strokeWidth="2" />
          {/* bottom tier with drippy icing */}
          <rect x="30" y="142" width="180" height="68" rx="14" fill="url(#tierA)" />
          <path d="M30 156 q0 -14 14 -14 h152 q14 0 14 14 v6 q-8 0 -10 10 q-3 10 -9 0 q-4 -10 -12 -2 q-6 14 -12 2 q-5 -10 -13 0 q-6 12 -13 0 q-5 -9 -13 1 q-6 12 -12 0 q-5 -10 -13 -1 q-7 13 -13 0 q-4 -9 -12 0 q-6 12 -12 1 q-5 -10 -14 -2 z" fill="#ffffff" />
          {[50, 74, 100, 128, 152, 180, 196].map((x, i) => (
            <rect key={x} x={x} y={182 + (i % 3) * 7} width="7" height="3" rx="1.5" fill={['#ffd23f', '#7ee0b5', '#8fd3ff', '#c9a7ff'][i % 4]} transform={`rotate(${(i * 37) % 60 - 30} ${x} ${185})`} />
          ))}
          {/* top tier */}
          <rect x="58" y={TOP} width="124" height="54" rx="12" fill="url(#tierB)" />
          <path d={`M58 ${TOP + 12} q0 -12 12 -12 h100 q12 0 12 12 v4 q-7 0 -9 8 q-3 8 -8 0 q-4 -8 -10 -1 q-5 11 -10 1 q-4 -8 -11 0 q-5 10 -11 0 q-4 -7 -11 1 q-5 10 -10 0 q-4 -8 -11 -1 q-6 10 -11 0 q-3 -6 -10 -2 z`} fill="#ff9cc2" />
          {/* a tiny fondant fish swimming on the cake */}
          <g transform={`translate(104 ${TOP + 34})`}>
            <path d="M0 0 l-9 -6 v12 z" fill="#ff8a3d" />
            <ellipse cx="14" cy="0" rx="14" ry="8" fill="#ff8a3d" />
            <rect x="10" y="-8" width="4" height="16" fill="#fff" />
            <circle cx="22" cy="-2" r="2" fill="#1d1b33" />
          </g>
          {/* candles */}
          {layout.map((c, i) => {
            const state = flames[i];
            const big = !!c.digit;
            const top = big ? TOP - 44 : TOP - 30;
            return (
              <g key={i} className={`bday-candle${state === 'unlit' && stage === 'light' ? ' is-ready' : ''}`} onClick={(e) => (e.stopPropagation(), light(i))}>
                {big ? (
                  <text x={c.x} y={TOP + 2} textAnchor="middle" className="bday-number">
                    {c.digit}
                  </text>
                ) : (
                  <>
                    <rect x={c.x - 3.5} y={top} width="7" height={TOP - top + 2} rx="2" fill="#8fd3ff" />
                    {[0, 1, 2].map((k) => (
                      <rect key={k} x={c.x - 3.5} y={top + 5 + k * 9} width="7" height="3" fill="#fff" transform={`skewY(-20)`} style={{ transformOrigin: `${c.x}px ${top + 6 + k * 9}px` }} />
                    ))}
                  </>
                )}
                <line x1={c.x} y1={top} x2={c.x} y2={top - 6} stroke="#5a3a2a" strokeWidth="1.6" strokeLinecap="round" />
                {state === 'lit' && <Flame x={c.x} y={top - 5} />}
                {state === 'out' && <Smoke x={c.x} y={top - 8} />}
                {/* generous invisible tap area */}
                <rect x={c.x - 16} y={top - 34} width="32" height={TOP - top + 40} fill="transparent" />
              </g>
            );
          })}
          {/* the cut slice slides out to the side */}
          {sliced && (
            <g className="bday-slice">
              <path d="M180 196 l40 -16 v26 l-40 10 z" fill="#ffa9c9" />
              <path d="M180 196 l40 -16 l-6 -6 l-40 14 z" fill="#ffffff" />
              <path d="M180 216 l40 -10" stroke="#ff7eb6" strokeWidth="2" />
            </g>
          )}
        </svg>
      </div>
      {stage === 'light' && (
        <button className="link-btn bday-skip" onClick={lightAll}>
          Light them all ✨
        </button>
      )}
      {stage === 'blow' && (
        <button className="btn-love bday-blow" onClick={blow}>
          💨 Blow!
        </button>
      )}
      {(stage === 'cheer' || stage === 'cut') && (
        <>
          <Confetti key="cheer" count={44} />
          <button className="btn-love" onClick={onDone}>
            Open your wish jar ✨
          </button>
        </>
      )}
    </div>
  );
}

// ---------- scene 3: the wish jar ----------
function WishJar({ age, onDone }) {
  const wishes = useMemo(() => wishesFor(age), [age]);
  const [shown, setShown] = useState(0);
  const left = wishes.length - shown;
  const stars = useMemo(() => Array.from({ length: 14 }, () => ({ x: rand(14, 82), y: rand(30, 86), r: rand(-30, 30), s: rand(0.8, 1.2) })), []);
  const pop = () => {
    if (!left) return;
    setShown((n) => n + 1);
    sfx('chime');
  };
  return (
    <div className="bday-scene">
      <p className="bday-hint">
        {shown === 0 ? `${wishes.length} wishes for your ${ordinal(age)} — tap the jar ⭐` : left ? 'Tap the jar for another wish ⭐' : 'Every wish is yours 💖'}
      </p>
      <button className={`bday-jar${left ? '' : ' is-empty'}`} onClick={pop} aria-label="Take a wish from the jar">
        <span className="jar-lid" />
        <span className="jar-glass">
          {stars.slice(0, Math.min(stars.length, left)).map((st, i) => (
            <i key={i} style={{ left: `${st.x}%`, top: `${st.y}%`, transform: `rotate(${st.r}deg) scale(${st.s})` }}>
              ⭐
            </i>
          ))}
        </span>
      </button>
      {shown > 0 && (
        <div key={shown} className="bday-wish">
          <span className="bday-wish-num">
            {shown} / {wishes.length}
          </span>
          <p>{wishes[shown - 1]}</p>
        </div>
      )}
      <button className="btn-love" onClick={onDone}>
        {left ? 'Read my letter 💌' : 'Now, my letter 💌'}
      </button>
    </div>
  );
}

// ---------- scene 4: the letter ----------
function Letter({ status, onCelebrate }) {
  const { age, date } = status;
  const letter = letterFor(age);
  const born = new Date(BIRTHDAY.year, BIRTHDAY.month, BIRTHDAY.day);
  const daysOfYou = Math.round((date - born) / DAY);
  const married = loveStatus(date).days;
  return (
    <div className="bday-scene bday-letter-scene">
      <p className="love-kicker">For my Asma 💖</p>
      <h2 className="bday-title">Happy {ordinal(age)} Birthday!</h2>
      <p className="love-date">{formatDate(date)}</p>
      <Counters
        items={[
          [age, 'beautiful years'],
          [daysOfYou.toLocaleString(), 'days of you'],
          [married.toLocaleString(), married === 1 ? 'day as my wife' : 'days as my wife'],
        ]}
      />
      <div className="love-letter bday-letter">
        <p>My dearest Asma,</p>
        {letter.en.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <p className="love-bn">{letter.bn}</p>
        <p className="love-sign">
          Happy birthday, my love 🎂
          <br />
          Forever yours, Saimun 💍
        </p>
      </div>
      <button className="btn-love" onClick={onCelebrate}>
        Celebrate with the fish 🎉
      </button>
    </div>
  );
}

// ---------- before the day: a sealed envelope and a live countdown ----------
function Envelope({ status, onClose }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, status.date - now);
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  const s = Math.floor((ms % 6e4) / 1000);
  return (
    <div className="bday-scene">
      <div className="bday-envelope" aria-hidden="true">
        <span className="env-flap" />
        <span className="env-seal">💌</span>
      </div>
      <h2 className="bday-title">Something special is waiting…</h2>
      <p className="bday-hint">Come back on {formatDate(status.date)} for your birthday surprise, Asma 🎂</p>
      <Counters
        items={[
          [d, d === 1 ? 'day' : 'days'],
          [h, 'hours'],
          [`${m}:${String(s).padStart(2, '0')}`, 'min : sec'],
        ]}
      />
      <p className="love-bn">আর মাত্র {bnNumber(status.daysLeft)} দিন! 💖</p>
      <button className="btn-love" onClick={onClose}>
        I&apos;ll wait 💕
      </button>
    </div>
  );
}

function BirthdayCard({ status, onClose }) {
  const [step, setStep] = useState('gift'); // gift | cake | jar | letter
  const card = useRef(null);
  useEffect(() => {
    // Newer browsers return a Promise from scrollTo, so never hand it back to React.
    card.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
  }, [step]);
  const today = status.phase === 'today';
  const celebrate = () => {
    celebrateBirthday(status.age);
    onClose();
  };
  const steps = ['gift', 'cake', 'jar', 'letter'];
  return (
    <div className="love-overlay bday-overlay" role="dialog" aria-modal="true" aria-label="Birthday surprise" onClick={onClose}>
      <FloatingHearts icons={PARTY_ICONS} />
      <div ref={card} className="love-card bday-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="card-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        {today && (
          <div className="bday-steps" aria-hidden="true">
            {steps.map((s, i) => (
              <i key={s} className={steps.indexOf(step) >= i ? 'is-on' : ''} />
            ))}
          </div>
        )}
        <div key={today ? step : 'wait'} className="bday-step">
          {!today && <Envelope status={status} onClose={onClose} />}
          {today && step === 'gift' && <Gift onOpened={() => setStep('cake')} />}
          {today && step === 'cake' && <Cake age={status.age} onDone={() => setStep('jar')} />}
          {today && step === 'jar' && <WishJar age={status.age} onDone={() => setStep('letter')} />}
          {today && step === 'letter' && <Letter status={status} onCelebrate={celebrate} />}
        </div>
        {today && step !== 'gift' && (
          <button className="link-btn bday-back" onClick={() => setStep(steps[steps.indexOf(step) - 1])}>
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}

// Saimun's birthday (31 January): just a countdown chip through January, so Asma never forgets.
export function HusbandCountdown() {
  const status = husbandBirthdayStatus();
  if (status.phase === 'off') return null;
  const today = status.phase === 'today';
  const days = `${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'}`;
  const tap = () => {
    sfx('chime');
    if (today) toast(`Today is Saimun's ${ordinal(status.age)} birthday! Give him a big hug 🤗`, '🎉', 5000);
    else toast(`Saimun's birthday is in ${days} (31 January) 🎁`, '🎈', 4000);
  };
  return (
    <button className={`btn-birthday is-husband${today ? ' is-today' : ''}`} onClick={tap} aria-label={today ? "Today is Saimun's birthday" : `${days} until Saimun's birthday`}>
      <span className="btn-birthday-icon">{today ? '🎉' : '🎈'}</span>
      <span>{today ? "Saimun's Birthday!" : `Saimun · ${days}`}</span>
    </button>
  );
}

// 🎂 Countdown chip through December, a glowing party button on 23 December, hidden the rest of the year.
export default function BirthdayButton() {
  const [step, setStep] = useState(null); // null | 'lock' | 'card'
  const status = birthdayStatus();
  if (status.phase === 'off') return null;
  const today = status.phase === 'today';
  const close = () => setStep(null);
  return (
    <>
      <button
        className={`btn-birthday${today ? ' is-today' : ''}`}
        onClick={() => setStep('lock')}
        aria-label={today ? "Asma's birthday surprise" : `${status.daysLeft} days until Asma's birthday`}
      >
        <span className="btn-birthday-icon">🎂</span>
        <span>{today ? 'Happy Birthday!' : `${status.daysLeft} day${status.daysLeft === 1 ? '' : 's'}`}</span>
      </button>
      {step === 'lock' && (
        <SecretPrompt
          icon="🎁"
          title={today ? 'A birthday secret for Asma' : 'A secret is getting ready…'}
          className="bday-lock"
          onUnlock={() => setStep('card')}
          onClose={close}
        />
      )}
      {step === 'card' && <BirthdayCard status={status} onClose={close} />}
    </>
  );
}
