import { useMemo, useState } from 'react';
import { celebrateAnniversary, sfx } from '../state/store';
import { WEDDING, SECRET, loveStatus, spanLabel, formatDate } from '../data/love';
import {
  dailyLetter,
  anniversaryLetter,
  bonusNote,
  BONUS_LIMIT,
  DAILY_TANK_LINES,
  recordVisit,
  isClaimed,
  claimCoupon,
} from '../data/loveNotes';

const plural = (n, word) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

const HEART_ICONS = ['💖', '💕', '🌸', '💗', '✨', '🌹'];

// Hearts and petals (or any icons) drifting up behind the letter.
export function FloatingHearts({ icons = HEART_ICONS }) {
  const hearts = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        icon: icons[i % icons.length],
        left: Math.random() * 100,
        size: 16 + Math.random() * 22,
        delay: Math.random() * 6,
        dur: 6 + Math.random() * 5,
      })),
    [icons],
  );
  return (
    <div className="love-hearts" aria-hidden="true">
      {hearts.map((h, i) => (
        <span
          key={i}
          style={{ left: `${h.left}%`, fontSize: h.size, animationDelay: `${h.delay}s`, animationDuration: `${h.dur}s` }}
        >
          {h.icon}
        </span>
      ))}
    </div>
  );
}

// Asks for the secret word before the letter opens.
export function SecretPrompt({
  onUnlock,
  onClose,
  icon = '💌',
  title = 'A secret message for Asma',
  className = '',
}) {
  const [word, setWord] = useState('');
  const [wrong, setWrong] = useState(0);
  const submit = (e) => {
    e.preventDefault();
    if (word.trim().toLowerCase() === SECRET) onUnlock();
    else {
      setWrong((n) => n + 1);
      setWord('');
      sfx('bonk');
    }
  };
  return (
    <div className="love-overlay" role="dialog" aria-modal="true" aria-label="Secret word" onClick={onClose}>
      <form key={wrong} className={`love-card love-lock ${className}${wrong ? ' is-wrong' : ''}`} onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="card-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="love-ring">{icon}</div>
        <h2 className="love-title">{title}</h2>
        <p className="love-date">Enter our secret word to open it 🔐</p>
        <input
          className="love-input"
          type="password"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Secret word"
          aria-label="Secret word"
          autoFocus
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
        {wrong > 0 && <p className="love-wrong">Oops, that's not it 💔 Try again!</p>}
        <button type="submit" className="btn-love" disabled={!word.trim()}>
          Open 💕
        </button>
      </form>
    </div>
  );
}

export function Counters({ items }) {
  return (
    <div className="love-count">
      {items.map(([value, label]) => (
        <div key={label}>
          <strong>{value}</strong>
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}

function Signature({ bn = 'ভালোবাসি তোমাকে, আসমা ❤️', sign = 'Forever yours,' }) {
  return (
    <>
      <p className="love-bn">{bn}</p>
      <p className="love-sign">
        {sign}
        <br />
        Saimun 💍
      </p>
    </>
  );
}

const compact = (n) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

// The middle counter changes every day, just for fun.
function funStat(days) {
  return [
    [(days * 24).toLocaleString(), 'hours together'],
    [(days * 1440).toLocaleString(), 'minutes of loving you'],
    [compact(days * 2), 'cups of tea together ☕'],
    [compact(days * 24 * 60 * 72), 'heartbeats for you'],
  ][days % 4];
}

// "Today's little surprise": a sealed tile she taps to open.
function Surprise({ surprise }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      className={`love-surprise${open ? ' is-open' : ''}`}
      onClick={() => {
        if (!open) sfx('chime');
        setOpen(true);
      }}
      aria-label={open ? surprise.label : "Today's little surprise: tap to open"}
    >
      <span className="love-surprise-icon">{open ? surprise.icon : '🎁'}</span>
      <span className="love-surprise-body">
        <small>{open ? surprise.label : "Today's little surprise"}</small>
        <span>{open ? surprise.text : 'Tap to open ✨'}</span>
      </span>
    </button>
  );
}

// A love coupon she can claim (remembered in this browser).
function Coupon({ coupon }) {
  const [claimed, setClaimed] = useState(() => isClaimed(coupon.id));
  const claim = () => {
    if (claimed) return;
    claimCoupon(coupon.id);
    setClaimed(true);
    sfx('treasure');
  };
  return (
    <button type="button" className={`love-coupon${claimed ? ' is-claimed' : ''}`} onClick={claim}>
      <span className="love-coupon-icon">{coupon.icon}</span>
      <span className="love-coupon-text">
        <small>Love coupon 🎟️</small>
        {coupon.text}
      </span>
      <span className="love-coupon-stamp">{claimed ? 'Claimed 💖' : 'Tap to claim'}</span>
    </button>
  );
}

// A promise hidden on the back of a card.
function PromiseCard({ text, index }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      className={`love-promise${open ? ' is-open' : ''}`}
      onClick={() => {
        if (!open) sfx('pop');
        setOpen(true);
      }}
    >
      <span className="love-promise-front">💍 Promise {index + 1}</span>
      <span className="love-promise-back">{text}</span>
    </button>
  );
}

function SpecialLetter({ status }) {
  const { paragraphs, coupons, promises } = useMemo(() => anniversaryLetter(status), [status]);
  return (
    <>
      <div className="love-letter is-special">
        <p className="love-greeting">My dearest Asma,</p>
        {paragraphs.map((text) => (
          <p key={text}>{text}</p>
        ))}
      </div>
      {promises && (
        <div className="love-extras">
          <h3>My promises for this year</h3>
          <div className="love-promises">
            {promises.map((text, i) => (
              <PromiseCard key={text} text={text} index={i} />
            ))}
          </div>
        </div>
      )}
      <div className="love-extras">
        <h3>{coupons.length > 1 ? 'Your anniversary gifts' : 'Your anniversary gift'}</h3>
        {coupons.map((c) => (
          <Coupon key={c.id} coupon={c} />
        ))}
      </div>
      <div className="love-letter">
        <Signature bn="শুভ বিবাহবার্ষিকী, আমার আসমা ❤️" />
      </div>
    </>
  );
}

function DailyLetter({ status, letter }) {
  const { days, toNext, nextMonths } = status;
  const [bonus, setBonus] = useState([]);
  const more = () => {
    setBonus((b) => [...b, bonusNote(b)]);
    sfx('pop');
  };
  return (
    <div className="love-letter">
      <p className="love-greeting">{letter.greeting}</p>
      {letter.occasion && (
        <p className="love-occasion">
          <span>{letter.occasion.icon}</span> {letter.occasion.text}
        </p>
      )}
      {letter.milestone && (
        <p className="love-occasion is-milestone">
          <span>🎉</span> Today we have been married for {letter.milestone.label}! Every single one of them was a
          gift.
        </p>
      )}
      <p>My dearest Asma, {letter.note}</p>
      {letter.welcome && <p className="love-welcome">{letter.welcome}</p>}
      <p>
        Today is day {days.toLocaleString()} of our forever, and I love you even more than yesterday.{' '}
        {toNext === 1
          ? `Tomorrow is our ${spanLabel(nextMonths)} anniversary! 💍`
          : `Only ${toNext} days until our ${spanLabel(nextMonths)} anniversary. 💍`}
      </p>
      <Surprise surprise={letter.surprise} />
      {letter.ps && <p className="love-ps">P.S. {letter.ps}</p>}
      {bonus.map((text) => (
        <p key={text} className="love-bonus">
          💌 {text}
        </p>
      ))}
      <button type="button" className="love-more" onClick={more} disabled={bonus.length >= BONUS_LIMIT}>
        {bonus.length >= BONUS_LIMIT ? 'Come back tomorrow for more 💌' : 'One more note, please 🥺'}
      </button>
      <Signature bn={letter.bn} sign={letter.sign} />
    </div>
  );
}

const SPECIAL_ICONS = ['💍', '💖', '🌹', '✨', '🎉', '💕', '🥂'];

const capitalize = (s) => s[0].toUpperCase() + s.slice(1);

// The letter itself: a special one on month and year anniversaries, a new everyday letter otherwise.
function LoveLetter({ status, visit, onClose }) {
  const { days, months, isMonthDay, isYearDay, today, toNext } = status;
  const special = isMonthDay || isYearDay;
  const letter = useMemo(() => (special ? null : dailyLetter(days, new Date(), visit)), [special, days, visit]);
  let title = days === 0 ? 'Our Wedding Day! 💍' : `Day ${days.toLocaleString()} of Forever`;
  if (special) title = `Happy ${spanLabel(months)} Anniversary!`;
  else if (letter.milestone) title = `${capitalize(letter.milestone.label)} of Us! 🎉`;
  const ring = isYearDay ? '🎉' : special ? '💍' : (letter.occasion?.icon ?? '💕');

  return (
    <div className="love-overlay" role="dialog" aria-modal="true" aria-label="Love letter" onClick={onClose}>
      <FloatingHearts icons={special ? SPECIAL_ICONS : HEART_ICONS} />
      <div
        className={`love-card${special ? ' is-special' : ''}${isYearDay ? ' is-year' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="card-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="love-ring">{ring}</div>
        <p className="love-kicker">
          Asma 💕 Saimun
          {visit?.count > 0 && <span className="love-chip">Letter #{visit.count.toLocaleString()}</span>}
          {visit?.streak > 1 && <span className="love-chip is-streak">🔥 {visit.streak}</span>}
        </p>
        <h2 className="love-title">{title}</h2>
        <p className="love-date">
          {formatDate(WEDDING)} → {formatDate(today)}
        </p>
        <Counters
          items={[
            [days.toLocaleString(), 'days of love'],
            funStat(days),
            special ? ['∞', 'more to come'] : [toNext, toNext === 1 ? 'day to our next anniversary' : 'days to our next anniversary'],
          ]}
        />
        {special ? <SpecialLetter status={status} /> : <DailyLetter status={status} letter={letter} />}
        <button className="btn-love" onClick={onClose}>
          I love you too 💕
        </button>
      </div>
    </div>
  );
}

function celebrate(status) {
  const { isMonthDay, isYearDay, months, days } = status;
  if (isYearDay) {
    celebrateAnniversary(`Happy ${spanLabel(months)} anniversary, Saimun! 🎉`, [
      `${spanLabel(months)} of love! 💍`,
      'Forever and always! 💖',
      'Happy anniversary, my love! 💕',
    ]);
  } else if (isMonthDay) {
    celebrateAnniversary('Happy anniversary, Saimun! I love you! 💕', [
      `${spanLabel(months)} of love! 💍`,
      'Happy anniversary, my love! 💕',
      'Forever and always, Saimun! 💖',
    ]);
  } else {
    const lines = DAILY_TANK_LINES[days % DAILY_TANK_LINES.length];
    celebrateAnniversary(lines[0], lines);
  }
}

// Shows how many days Asma and Saimun have been married; opens a love letter behind a secret word.
export default function AnniversaryButton() {
  const [step, setStep] = useState(null); // null | 'lock' | 'letter'
  const [visit, setVisit] = useState(null);
  const status = loveStatus();
  const special = status.isMonthDay || status.isYearDay;
  const close = () => setStep(null);
  const unlock = () => {
    setVisit(recordVisit()); // in the click handler, so StrictMode can't count it twice
    setStep('letter');
    celebrate(status);
  };
  return (
    <>
      <button
        className={`btn-anniversary${special ? ' is-special' : ''}`}
        onClick={() => setStep('lock')}
        aria-label={`${plural(status.days, 'day')} together. Open the secret love letter`}
      >
        <span className="btn-anniversary-icon">💍</span>
        <span className="btn-anniversary-text">{plural(status.days, 'day')}</span>
        {special && <span className="btn-anniversary-badge">🎉 {spanLabel(status.months)}</span>}
      </button>
      {step === 'lock' && <SecretPrompt onUnlock={unlock} onClose={close} />}
      {step === 'letter' && <LoveLetter status={status} visit={visit} onClose={close} />}
    </>
  );
}
