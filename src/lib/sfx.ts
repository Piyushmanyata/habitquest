// Centralized sound effects via Web Audio API. Reuses one AudioContext so we
// don't leak. Each effect is a layered tone chord with envelope shaping for
// impactful but non-annoying feedback. Respects a global volume (0..1).

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let _volume = 0.7;

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    const c: AudioContext = new Ctx();
    const g = c.createGain();
    g.gain.value = _volume;
    g.connect(c.destination);
    ctx = c;
    masterGain = g;
    return c;
  } catch { return null; }
}

export function setSfxVolume(v: number) {
  _volume = Math.max(0, Math.min(1, v));
  if (masterGain) masterGain.gain.value = _volume;
  if (typeof localStorage !== 'undefined') localStorage.setItem('hq-sfx-volume', String(_volume));
}

export function getSfxVolume(): number {
  if (typeof localStorage === 'undefined') return _volume;
  const stored = parseFloat(localStorage.getItem('hq-sfx-volume') || '');
  if (Number.isFinite(stored)) _volume = stored;
  return _volume;
}

// Initialize volume from localStorage at module load.
getSfxVolume();

type ToneSpec = {
  type?: OscillatorType;     // default 'sine'
  freqStart: number;
  freqEnd?: number;
  duration: number;
  delay?: number;            // seconds after start
  vol?: number;              // peak gain (before master)
  attack?: number;
  release?: number;
};

function playTones(tones: ToneSpec[]) {
  const c = ensure();
  if (!c || !masterGain) return;
  // Re-attach masterGain if it was closed.
  if (masterGain.context.state === 'closed') {
    ctx = null; masterGain = null;
    return playTones(tones);
  }
  const now = c.currentTime;
  for (const t of tones) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = t.type || 'sine';
    const start = now + (t.delay || 0);
    o.frequency.setValueAtTime(t.freqStart, start);
    if (t.freqEnd !== undefined) {
      o.frequency.exponentialRampToValueAtTime(Math.max(1, t.freqEnd), start + t.duration * 0.6);
    }
    const peak = t.vol ?? 0.10;
    const attack = t.attack ?? 0.015;
    const release = t.release ?? Math.max(0.03, t.duration * 0.6);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + t.duration + release);
    o.connect(g);
    g.connect(masterGain);
    o.start(start);
    o.stop(start + t.duration + release + 0.02);
  }
}

// ── effect catalog ───────────────────────────────────────────────────────

export function sfxPositive(intensity = 3) {
  // Light bell-like rising chord
  const base = 660 + intensity * 20;
  playTones([
    { type: 'sine',     freqStart: base,         freqEnd: base * 1.5, duration: 0.18, vol: 0.10 },
    { type: 'triangle', freqStart: base * 2,     freqEnd: base * 2.5, duration: 0.16, vol: 0.05, delay: 0.04 },
    { type: 'sine',     freqStart: base * 3,                          duration: 0.12, vol: 0.03, delay: 0.10 },
  ]);
}

export function sfxNegative() {
  // Low sour descent
  playTones([
    { type: 'triangle', freqStart: 260, freqEnd: 140, duration: 0.28, vol: 0.09 },
    { type: 'sawtooth', freqStart: 130, freqEnd: 80,  duration: 0.30, vol: 0.05, delay: 0.06 },
  ]);
}

export function sfxNeutral() {
  playTones([{ type: 'sine', freqStart: 440, freqEnd: 520, duration: 0.12, vol: 0.06 }]);
}

export function sfxLevelUp() {
  // C major arpeggio with bass octave: C-E-G-C-E
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25];
  notes.forEach((n, i) => {
    playTones([
      { type: 'triangle', freqStart: n,     duration: 0.18, vol: 0.10, delay: i * 0.085 },
      { type: 'sine',     freqStart: n * 2, duration: 0.14, vol: 0.05, delay: i * 0.085 },
    ]);
  });
  // Bass undertone
  playTones([{ type: 'sine', freqStart: 130.81, duration: 0.7, vol: 0.07, delay: 0.0 }]);
}

export function sfxLoot(rarity: 'common' | 'rare' | 'epic') {
  if (rarity === 'common') {
    playTones([
      { type: 'sine', freqStart: 880, freqEnd: 1320, duration: 0.16, vol: 0.08 },
    ]);
  } else if (rarity === 'rare') {
    playTones([
      { type: 'sine', freqStart: 660, freqEnd: 990, duration: 0.18, vol: 0.09 },
      { type: 'sine', freqStart: 990, freqEnd: 1480, duration: 0.20, vol: 0.07, delay: 0.10 },
    ]);
  } else {
    // epic: shimmery 4-note rise
    [523, 659, 784, 1047, 1568].forEach((n, i) => {
      playTones([
        { type: 'sine',     freqStart: n,     duration: 0.14, vol: 0.10, delay: i * 0.07 },
        { type: 'triangle', freqStart: n * 2, duration: 0.12, vol: 0.04, delay: i * 0.07 + 0.02 },
      ]);
    });
  }
}

export function sfxBossHit() {
  // sharp thump + crack
  playTones([
    { type: 'sawtooth', freqStart: 220, freqEnd: 80,  duration: 0.10, vol: 0.10 },
    { type: 'square',   freqStart: 1500, freqEnd: 400, duration: 0.05, vol: 0.05, delay: 0.005 },
  ]);
}

export function sfxBossDefeat() {
  // descending heroic horn
  playTones([
    { type: 'sawtooth', freqStart: 523, freqEnd: 392, duration: 0.18, vol: 0.08 },
    { type: 'triangle', freqStart: 392, freqEnd: 261, duration: 0.34, vol: 0.10, delay: 0.18 },
    { type: 'sine',     freqStart: 130, duration: 0.7, vol: 0.07, delay: 0.18 },
  ]);
}

export function sfxComboTier(idx: number) {
  // Higher tier = more notes + brighter color
  const ladders = [
    [[660, 990], [990, 1320]],
    [[660, 990], [990, 1320], [1320, 1760]],
    [[523, 784], [659, 988], [784, 1175], [1047, 1568]],
    [[523, 1047], [659, 1318], [784, 1568], [1047, 2093], [1318, 2637]],
  ];
  const ladder = ladders[Math.min(idx, ladders.length - 1)];
  ladder.forEach(([a, b], i) => {
    playTones([{ type: 'sine', freqStart: a, freqEnd: b, duration: 0.16, vol: 0.10, delay: i * 0.085 }]);
  });
}

export function sfxAchievement() {
  // Twinkle + chord
  [1318, 1568, 2093].forEach((n, i) => {
    playTones([{ type: 'sine', freqStart: n, duration: 0.12, vol: 0.08, delay: i * 0.05 }]);
  });
  // Warm pad
  playTones([
    { type: 'triangle', freqStart: 261.63, duration: 0.6, vol: 0.05, delay: 0.05 },
    { type: 'sine',     freqStart: 392.00, duration: 0.6, vol: 0.05, delay: 0.05 },
    { type: 'sine',     freqStart: 523.25, duration: 0.6, vol: 0.05, delay: 0.05 },
  ]);
}

export function sfxCheckin() {
  playTones([
    { type: 'sine', freqStart: 523, freqEnd: 659, duration: 0.16, vol: 0.08 },
    { type: 'sine', freqStart: 659, freqEnd: 784, duration: 0.18, vol: 0.07, delay: 0.10 },
  ]);
}

export function sfxClick() {
  playTones([{ type: 'square', freqStart: 1200, duration: 0.03, vol: 0.05 }]);
}
