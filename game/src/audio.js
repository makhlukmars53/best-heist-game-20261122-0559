// VAULTBREAK — audio.js
// One clear job: every sound, synthesized with WebAudio. No audio files,
// no network, nothing to download. Created lazily on the first user gesture
// so browsers never block it.

let ctx = null;
let muted = false;
let alarmOsc = null;
let alarmGain = null;

export function ensureAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function toggleMute() {
  muted = !muted;
  if (alarmGain) alarmGain.gain.value = 0;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function playPickup(kind) {
  if (kind === 'vault') {
    tone(523, 0.14, 'sine', 0.22);
    tone(659, 0.14, 'sine', 0.22, 0.09);
    tone(784, 0.22, 'sine', 0.24, 0.18);
    tone(1047, 0.3, 'sine', 0.2, 0.27);
  } else {
    tone(880, 0.09, 'sine', 0.18);
    tone(1319, 0.14, 'sine', 0.16, 0.06);
  }
}

export function playCoin() {
  tone(2400, 0.05, 'square', 0.08);
  tone(1900, 0.06, 'square', 0.07, 0.12);
}

export function playSmoke() {
  tone(300, 0.35, 'sawtooth', 0.06, 0, 90);
}

export function playEmp() {
  tone(1400, 0.3, 'sawtooth', 0.1, 0, 120);
}

export function playSpotted() {
  tone(220, 0.18, 'square', 0.16, 0, 440);
  tone(220, 0.18, 'square', 0.16, 0.2, 440);
}

export function playCaught() {
  tone(392, 0.25, 'sawtooth', 0.2, 0, 98);
  tone(98, 0.7, 'sawtooth', 0.2, 0.22);
}

export function playWin() {
  const notes = [523, 659, 784, 1047, 784, 1047, 1319];
  notes.forEach((n, i) => tone(n, 0.22, 'triangle', 0.2, i * 0.11));
}

export function playClick() {
  tone(700, 0.05, 'sine', 0.12);
}

export function playStep() {
  tone(140, 0.04, 'sine', 0.03);
}

// A low pulsing drone while the alarm is high; silent otherwise.
export function updateAlarmDrone(alarm) {
  if (!ctx || muted) return;
  if (alarm > 55 && !alarmOsc) {
    alarmOsc = ctx.createOscillator();
    alarmGain = ctx.createGain();
    alarmOsc.type = 'sine';
    alarmOsc.frequency.value = 55;
    alarmGain.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 2.2;
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain).connect(alarmGain.gain);
    alarmOsc.connect(alarmGain).connect(ctx.destination);
    alarmOsc.start();
    lfo.start();
  } else if (alarm <= 45 && alarmOsc) {
    try {
      alarmOsc.stop();
    } catch {
      // Already stopped.
    }
    alarmOsc = null;
    alarmGain = null;
  }
}
