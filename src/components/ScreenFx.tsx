import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useHabitStore } from '../store/useHabitStore';

function tone(freqA: number, freqB: number, dur = 0.32, type: OscillatorType = 'sine', vol = 0.08) {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = type;
    const now = ctx.currentTime;
    o.frequency.setValueAtTime(freqA, now);
    o.frequency.exponentialRampToValueAtTime(freqB, now + dur * 0.55);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.start(now); o.stop(now + dur + 0.02);
  } catch {}
}

function playPositive() { tone(660, 990, 0.32, 'sine', 0.08); }
function playNegative() { tone(220, 140, 0.30, 'triangle', 0.08); }
function playLoot()     { setTimeout(() => tone(880, 1320, 0.18, 'sine', 0.07), 0); setTimeout(() => tone(1320, 1760, 0.2, 'sine', 0.06), 120); }
function playBossDown() { setTimeout(() => tone(523, 392, 0.2, 'sawtooth', 0.06), 0); setTimeout(() => tone(392, 261, 0.5, 'sawtooth', 0.07), 180); }

export default function ScreenFx() {
  const last = useHabitStore(s => s.lastChange);
  const lastLoot = useHabitStore(s => s.lastLoot);
  const bossesDefeated = useHabitStore(s => s.profile.bossesDefeated);
  const prevBosses = useRef(bossesDefeated);
  const [flash, setFlash] = useState<null | 'pos' | 'neg'>(null);
  const [shake, setShake] = useState(false);

  // Entry feedback
  useEffect(() => {
    if (!last) return;
    const isPos = last.sentiment === 'positive' || last.delta > 0;
    const isNeg = last.sentiment === 'negative' || last.delta < 0;
    if (isPos) {
      setFlash('pos');
      const burst = Math.min(220, 60 + Math.abs(last.delta) * 3 + last.combo * 15);
      confetti({ particleCount: burst, spread: 75, startVelocity: 40, scalar: 0.9,
        colors: ['#c2f54a', '#ffffff', '#9be700', '#e6ffb3'], origin: { y: 0.18 } });
      if (last.combo >= 3) setTimeout(() => confetti({ particleCount: 120, spread: 140, origin: { y: 0.4 } }), 120);
      playPositive();
    } else if (isNeg) {
      setFlash('neg');
      setShake(true);
      setTimeout(() => setShake(false), 380);
      playNegative();
    }
    const t = setTimeout(() => setFlash(null), 500);
    return () => clearTimeout(t);
  }, [last?.at]);

  // Loot feedback
  useEffect(() => { if (lastLoot) playLoot(); }, [lastLoot?.at]);

  // Boss-defeat fanfare
  useEffect(() => {
    if (bossesDefeated > prevBosses.current) {
      playBossDown();
      confetti({ particleCount: 250, spread: 140, startVelocity: 55,
        colors: ['#ff6b6b', '#ffa94d', '#ffd43b', '#ffffff'], origin: { y: 0.35 } });
      setTimeout(() => confetti({ particleCount: 100, spread: 100, origin: { y: 0.5 } }), 250);
    }
    prevBosses.current = bossesDefeated;
  }, [bossesDefeated]);

  return (
    <>
      <AnimatePresence>
        {flash && (
          <motion.div
            className={`pointer-events-none fixed inset-0 z-40 ${flash === 'pos'
              ? 'bg-[radial-gradient(ellipse_at_top,rgba(194,245,74,0.18),transparent_60%)]'
              : 'bg-[radial-gradient(ellipse_at_center,rgba(255,107,107,0.20),transparent_60%)]'}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
        )}
      </AnimatePresence>
      <style>{`
        ${shake ? `#root { animation: hq-shake 0.36s cubic-bezier(.36,.07,.19,.97) both; }` : ''}
        @keyframes hq-shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
          40%, 60% { transform: translate3d(3px, 0, 0); }
        }
      `}</style>
    </>
  );
}
