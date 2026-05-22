// Web Speech Recognition wrapper. Falls back silently when unavailable.

type Listener = (text: string, isFinal: boolean) => void;

export function voiceAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

export function createRecognizer(onResult: Listener, onEnd?: () => void): { start: () => void; stop: () => void } | null {
  const Ctor: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = 'en-US';
  rec.interimResults = true;
  rec.continuous = true;
  rec.onresult = (ev: any) => {
    let interim = '';
    let final = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (r.isFinal) final += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (final) onResult(final, true);
    else if (interim) onResult(interim, false);
  };
  rec.onend = () => { if (onEnd) onEnd(); };
  return {
    start: () => { try { rec.start(); } catch {} },
    stop:  () => { try { rec.stop(); }  catch {} },
  };
}
