import { useMemo, useState } from 'react';
import { celebrateAnniversary, sfx } from '../state/store';
import { WEDDING, SECRET, loveStatus, spanLabel, formatDate, dailyNote } from '../data/love';

const plural = (n, word) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

// Hearts and petals drifting up behind the letter.
function FloatingHearts() {
  const hearts = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        icon: ['💖', '💕', '🌸', '💗', '✨', '🌹'][i % 6],
        left: Math.random() * 100,
        size: 16 + Math.random() * 22,
        delay: Math.random() * 6,
        dur: 6 + Math.random() * 5,
      })),
    [],
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
function SecretPrompt({ onUnlock, onClose }) {
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
      <form key={wrong} className={`love-card love-lock${wrong ? ' is-wrong' : ''}`} onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="card-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="love-ring">💌</div>
        <h2 className="love-title">A secret message for Asma</h2>
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

function Counters({ items }) {
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

function Signature() {
  return (
    <>
      <p className="love-bn">ভালোবাসি তোমাকে, আসমা ❤️</p>
      <p className="love-sign">
        Forever yours,
        <br />
        Saimun 💍
      </p>
    </>
  );
}

// The letter itself: a special one on month and year anniversaries, a sweet daily note otherwise.
function LoveLetter({ status, onClose }) {
  const { days, months, years, isMonthDay, isYearDay, today, toNext, nextMonths } = status;
  const special = isMonthDay || isYearDay;
  const ago = isYearDay
    ? years === 1
      ? 'One year ago'
      : `${years} years ago`
    : months === 1
      ? 'One month ago'
      : `${months} months ago`;
  let title = days === 0 ? 'Our Wedding Day! 💍' : `Day ${days.toLocaleString()} of Forever`;
  if (special) title = `Happy ${spanLabel(months)} Anniversary!`;

  return (
    <div className="love-overlay" role="dialog" aria-modal="true" aria-label="Love letter" onClick={onClose}>
      <FloatingHearts />
      <div className={`love-card${isYearDay ? ' is-year' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="love-ring">{isYearDay ? '🎉' : special ? '💍' : '💕'}</div>
        <p className="love-kicker">Asma 💕 Saimun</p>
        <h2 className="love-title">{title}</h2>
        <p className="love-date">
          {formatDate(WEDDING)} → {formatDate(today)}
        </p>
        <Counters
          items={[
            [days.toLocaleString(), 'days of love'],
            [(days * 24).toLocaleString(), 'hours together'],
            special ? ['∞', 'more to come'] : [toNext, toNext === 1 ? 'day to our next anniversary' : 'days to our next anniversary'],
          ]}
        />
        <div className="love-letter">
          <p>My dearest Asma,</p>
          {isYearDay ? (
            <>
              <p>
                {ago}, on {formatDate(WEDDING)}, we promised each other forever, and every single day since has
                proved that promise right.
              </p>
              <p>
                Through every season, every sunrise and every late-night talk, you have been my home, my peace and
                my greatest joy.
              </p>
              <p>
                {plural(days, 'day')} with you, and I would choose you again on each and every one of them. Thank
                you for this beautiful {years === 1 ? 'year' : `${years} years`}. Here's to many, many more, hand in
                hand.
              </p>
            </>
          ) : special ? (
            <>
              <p>
                {ago}, on {formatDate(WEDDING)}, you became my wife, and my whole world got brighter, like sunlight
                dancing through the ocean.
              </p>
              <p>
                Every day with you feels like a little fish finding its home in the coral. You are my calm water, my
                sweetest smile, my favourite hello and my hardest goodbye.
              </p>
              <p>
                Thank you for loving me, for your laughter, and for every tiny moment we share. This is only the
                beginning: a lifetime of months, years and forever, together.
              </p>
            </>
          ) : (
            <>
              <p>{dailyNote(days)}</p>
              <p>
                Today is day {days.toLocaleString()} of our forever, and I love you even more than yesterday.{' '}
                {toNext === 1
                  ? `Tomorrow is our ${spanLabel(nextMonths)} anniversary! 💍`
                  : `Only ${toNext} days until our ${spanLabel(nextMonths)} anniversary. 💍`}
              </p>
            </>
          )}
          <Signature />
        </div>
        <button className="btn-love" onClick={onClose}>
          I love you too 💕
        </button>
      </div>
    </div>
  );
}

function celebrate(status) {
  const { isMonthDay, isYearDay, months } = status;
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
    celebrateAnniversary('I love you, Saimun! 💕', [
      'Every day with you is a gift! 💖',
      'Love you more today! 💕',
      'You make me so happy! 🥰',
    ]);
  }
}

// Shows how many days Asma and Saimun have been married; opens a love letter behind a secret word.
export default function AnniversaryButton() {
  const [step, setStep] = useState(null); // null | 'lock' | 'letter'
  const status = loveStatus();
  const special = status.isMonthDay || status.isYearDay;
  const close = () => setStep(null);
  const unlock = () => {
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
      {step === 'letter' && <LoveLetter status={status} onClose={close} />}
    </>
  );
}
