// Tiny synthesized sound effects (Web Audio), so the app needs no audio files.
let ctx = null;

function audio() {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// One oscillator sweeping from `from` to `to` Hz with a soft attack/decay.
function tone(ac, { type = 'sine', from, to, start = 0, dur = 0.12, vol = 0.15 }) {
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const SOUNDS = {
  pop: (ac) => tone(ac, { from: 500, to: 1300, dur: 0.09, vol: 0.12 }),
  plop: (ac) => tone(ac, { from: 420, to: 140, dur: 0.16, vol: 0.14 }),
  squeak: (ac) => {
    tone(ac, { from: 900, to: 1700, dur: 0.1, vol: 0.08 });
    tone(ac, { from: 1100, to: 2000, start: 0.11, dur: 0.1, vol: 0.07 });
  },
  chime: (ac) => {
    tone(ac, { type: 'triangle', from: 880, to: 880, dur: 0.25, vol: 0.12 });
    tone(ac, { type: 'triangle', from: 1320, to: 1320, start: 0.12, dur: 0.35, vol: 0.1 });
  },
  bubbles: (ac) => {
    for (let i = 0; i < 6; i++) {
      const f = 400 + Math.random() * 600;
      tone(ac, { from: f, to: f * 2.2, start: i * 0.06 + Math.random() * 0.03, dur: 0.07, vol: 0.07 });
    }
  },
  treasure: (ac) => {
    [660, 830, 990, 1320].forEach((f, i) => tone(ac, { type: 'triangle', from: f, to: f, start: i * 0.08, dur: 0.22, vol: 0.09 }));
  },
  sad: (ac) => {
    tone(ac, { type: 'triangle', from: 520, to: 440, dur: 0.35, vol: 0.08 });
    tone(ac, { type: 'triangle', from: 440, to: 330, start: 0.3, dur: 0.5, vol: 0.07 });
  },
};

export function playSound(name) {
  try {
    const ac = audio();
    if (ac && SOUNDS[name]) SOUNDS[name](ac);
  } catch {
    // Audio is a bonus; never let it break the game.
  }
}
