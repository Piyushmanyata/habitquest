// Tiny wrapper around Web Speech API. Falls back silently when not supported.

let warm = false;

export function ttsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function listVoices(): SpeechSynthesisVoice[] {
  if (!ttsAvailable()) return [];
  return window.speechSynthesis.getVoices();
}

/** Voices load async; this returns a Promise that resolves when at least one voice is known. */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!ttsAvailable()) return Promise.resolve([]);
  return new Promise(resolve => {
    const v = window.speechSynthesis.getVoices();
    if (v.length) return resolve(v);
    const handler = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // Failsafe
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500);
  });
}

function findVoice(name?: string): SpeechSynthesisVoice | undefined {
  if (!ttsAvailable()) return undefined;
  const all = window.speechSynthesis.getVoices();
  if (name) {
    const exact = all.find(v => v.name === name);
    if (exact) return exact;
  }
  // Prefer English, then any
  return all.find(v => /en/i.test(v.lang) && /google|microsoft|samantha|alex/i.test(v.name))
      || all.find(v => /en/i.test(v.lang))
      || all[0];
}

export function speak(text: string, opts?: { voiceName?: string; rate?: number; pitch?: number; volume?: number }) {
  if (!ttsAvailable() || !text) return;
  try {
    // Cancel anything currently being said so we don't queue up.
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const voice = findVoice(opts?.voiceName);
    if (voice) utt.voice = voice;
    utt.rate   = opts?.rate   ?? 1.05;
    utt.pitch  = opts?.pitch  ?? 1.0;
    utt.volume = opts?.volume ?? 0.9;
    window.speechSynthesis.speak(utt);
    warm = true;
  } catch (err) {
    console.warn('[tts] speak failed:', err);
  }
}

export function stop() {
  if (!ttsAvailable()) return;
  try { window.speechSynthesis.cancel(); } catch {}
}

export function isWarm() { return warm; }
