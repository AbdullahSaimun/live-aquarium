import { audio } from './sounds';

// The ocean soundscape, all made in Web Audio (no files):
// - sounds: a soft low underwater hum, little bubble blips, and now and then a far-away whale;
// - music: a slow music-box melody that wanders over a five-note scale, with a gentle echo.
// Nothing plays until the first tap (browsers require it), and it pauses while the tab is hidden.

const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0]; // C major pentatonic

let ac = null;
let master = null;
let echo = null;
let hum = null;
let humGain = null;
let unlocked = false;
let want = { sounds: false, music: false, volume: 0.6 };
let timers = [];
let note = 4;

function ensure() {
  if (ac) return true;
  ac = audio();
  if (!ac) return false;
  master = ac.createGain();
  master.gain.value = 0;
  master.connect(ac.destination);
  // A soft echo for the music.
  echo = ac.createDelay(1);
  echo.delayTime.value = 0.38;
  const feedback = ac.createGain();
  feedback.gain.value = 0.32;
  const wet = ac.createGain();
  wet.gain.value = 0.35;
  echo.connect(feedback).connect(echo);
  echo.connect(wet).connect(master);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) ac.suspend();
    else if (unlocked) ac.resume();
  });
  return true;
}

function startHum() {
  if (hum) return;
  const len = ac.sampleRate * 2;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; // brown noise: deep and soft
    data[i] = last * 3.5;
  }
  hum = ac.createBufferSource();
  hum.buffer = buf;
  hum.loop = true;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 380;
  // The hum swells and settles slowly, like moving water.
  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 120;
  lfo.connect(lfoGain).connect(lp.frequency);
  humGain = ac.createGain();
  humGain.gain.value = 0;
  hum.connect(lp).connect(humGain).connect(master);
  hum.start();
  lfo.start();
}

function blip(freq, to, dur, vol, out = master, type = 'sine') {
  const t0 = ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(out);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function loop(fn, min, max) {
  let id;
  const run = () => {
    if (!document.hidden) fn();
    id = setTimeout(run, (min + Math.random() * (max - min)) * 1000);
  };
  const handle = { stop: () => clearTimeout(id) };
  timers.push(handle);
  id = setTimeout(run, (min + Math.random() * (max - min)) * 1000);
}

function stopLoops() {
  timers.forEach((t) => t.stop());
  timers = [];
}

function bubbles() {
  const f = 500 + Math.random() * 700;
  blip(f, f * 2.2, 0.07, 0.025);
  if (Math.random() < 0.4) setTimeout(() => blip(f * 1.3, f * 2.8, 0.06, 0.018), 90);
}

function whale() {
  const f = 140 + Math.random() * 60;
  blip(f, f * 2, 1.6, 0.03);
  setTimeout(() => blip(f * 2, f * 1.2, 1.8, 0.025), 1500);
}

// One note of the music box: a small step up or down the scale, sometimes a rest.
function musicNote() {
  if (Math.random() < 0.18) return;
  note = Math.max(0, Math.min(SCALE.length - 1, note + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
  const f = SCALE[note];
  const t0 = ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'triangle';
  o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
  o.connect(g);
  g.connect(master);
  g.connect(echo);
  o.start(t0);
  o.stop(t0 + 1.9);
  if (Math.random() < 0.3) {
    // a soft low note underneath now and then
    blip(f / 2, f / 2, 2.2, 0.03, master, 'sine');
  }
}

function apply() {
  if (!unlocked || !ensure()) return;
  const on = want.sounds || want.music;
  master.gain.setTargetAtTime(on ? want.volume * 0.8 : 0, ac.currentTime, 0.5);
  stopLoops();
  if (want.sounds) {
    startHum();
    humGain.gain.setTargetAtTime(0.05, ac.currentTime, 1);
    loop(bubbles, 1.5, 5);
    loop(whale, 60, 150);
  } else if (humGain) humGain.gain.setTargetAtTime(0, ac.currentTime, 0.5);
  if (want.music) loop(musicNote, 0.7, 1.3);
}

/** Called whenever the settings change. */
export function setAmbient(next) {
  want = { ...want, ...next };
  apply();
}

/** Call from the first user tap: browsers only allow sound after one. */
export function unlockAmbient() {
  if (unlocked) return;
  unlocked = true;
  apply();
}
