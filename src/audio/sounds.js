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
  giggle: (ac) => {
    [880, 1046, 932, 1175].forEach((f, i) => tone(ac, { type: 'triangle', from: f, to: f * 1.1, start: i * 0.09, dur: 0.08, vol: 0.06 }));
  },
  splash: (ac) => {
    for (let i = 0; i < 8; i++) {
      const f = 900 - i * 80 + Math.random() * 120;
      tone(ac, { from: f, to: f * 0.4, start: i * 0.03, dur: 0.12, vol: 0.06 });
    }
  },
  gasp: (ac) => tone(ac, { from: 260, to: 900, dur: 0.25, vol: 0.07 }),
  // Low "dun-dun... dun-dun" when the shark sneaks in.
  shark: (ac) => {
    [0, 0.42, 0.95, 1.25].forEach((start, i) =>
      tone(ac, { type: 'sawtooth', from: i % 2 ? 117 : 110, to: i % 2 ? 112 : 104, start, dur: 0.3, vol: 0.09 }),
    );
  },
  bonk: (ac) => {
    tone(ac, { type: 'square', from: 320, to: 120, dur: 0.12, vol: 0.07 });
    tone(ac, { from: 1400, to: 1900, start: 0.04, dur: 0.08, vol: 0.05 });
  },
  chomp: (ac) => {
    tone(ac, { type: 'square', from: 220, to: 70, dur: 0.1, vol: 0.06 });
    tone(ac, { type: 'square', from: 200, to: 60, start: 0.13, dur: 0.1, vol: 0.06 });
  },
  // Pufferfish gulping water as it blows up.
  puff: (ac) => {
    tone(ac, { from: 180, to: 520, dur: 0.22, vol: 0.1 });
    tone(ac, { type: 'triangle', from: 900, to: 1200, start: 0.2, dur: 0.06, vol: 0.05 });
  },
  // Octopus ink: a soft, low whoosh of bubbles.
  ink: (ac) => {
    for (let i = 0; i < 5; i++) tone(ac, { from: 300 - i * 30, to: 90, start: i * 0.04, dur: 0.18, vol: 0.05 });
  },
  // A distant whale song: two slow, low sweeps.
  whale: (ac) => {
    tone(ac, { type: 'sine', from: 160, to: 340, dur: 1.4, vol: 0.06 });
    tone(ac, { type: 'sine', from: 330, to: 180, start: 1.3, dur: 1.6, vol: 0.05 });
  },
  // "Happy Birthday to You" (public domain melody), played softly on a music-box tone.
  birthday: (ac) => {
    const N = { G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, F5: 698, G5: 784 };
    const tune = [
      ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2],
      ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
      ['G4', 0.75], ['G4', 0.25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 2],
      ['F5', 0.75], ['F5', 0.25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 2.5],
    ];
    const beat = 0.34;
    let t = 0;
    for (const [note, len] of tune) {
      const f = N[note];
      tone(ac, { type: 'triangle', from: f, to: f, start: t, dur: Math.max(0.18, len * beat * 0.95), vol: 0.08 });
      tone(ac, { type: 'sine', from: f * 2, to: f * 2, start: t, dur: 0.12, vol: 0.025 });
      t += len * beat;
    }
  },
  // A soft breath of air.
  blow: (ac) => {
    for (let i = 0; i < 6; i++) tone(ac, { from: 260 - i * 20, to: 70, start: i * 0.03, dur: 0.22, vol: 0.035 });
  },
  // A match striking, then the little whoomph of a flame.
  light: (ac) => {
    tone(ac, { type: 'square', from: 2400, to: 1600, dur: 0.04, vol: 0.03 });
    tone(ac, { from: 300, to: 620, start: 0.05, dur: 0.14, vol: 0.06 });
  },
  clam: (ac) => {
    tone(ac, { type: 'square', from: 240, to: 80, dur: 0.07, vol: 0.08 });
    tone(ac, { from: 520, to: 260, start: 0.05, dur: 0.12, vol: 0.05 });
  },
  balloon: (ac) => {
    tone(ac, { type: 'square', from: 700, to: 90, dur: 0.08, vol: 0.08 });
    tone(ac, { from: 1600, to: 2400, start: 0.05, dur: 0.06, vol: 0.04 });
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
