import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Check, Dice5 } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';

export default function AiChallengeCard() {
  const challenge = useHabitStore(s => s.aiChallenge);
  const ensure = useHabitStore(s => s.ensureDailyChallenge);
  const complete = useHabitStore(s => s.completeChallenge);
  const wager = useHabitStore(s => s.wager);
  const placeWager = useHabitStore(s => s.placeWager);
  const xp = useHabitStore(s => s.profile.xp);
  const resolve = useHabitStore(s => s.resolveWagerIfDue);
  const [wagerInput, setWagerInput] = useState(25);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { ensure(); resolve(); }, [ensure, resolve]);

  if (!challenge) {
    return (
      <div className="surface p-4">
        <Header />
        <div className="text-[11px] text-[var(--muted-2)] mt-1">Loading your AI-personalized challenge…</div>
      </div>
    );
  }

  return (
    <div className="surface p-4">
      <Header />
      <div className="mt-3 flex items-start gap-3">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-2xl leading-none"
        >
          {challenge.emoji}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-[14px] text-[var(--fg)]">{challenge.title}</span>
            <span className="mono text-[10px] text-[var(--accent)]">+{challenge.xpReward}</span>
          </div>
          <div className="text-[12px] text-[var(--muted)] leading-snug mt-0.5">{challenge.description}</div>
        </div>
      </div>
      <button
        onClick={() => { complete(); confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 }, colors: ['#c2f54a','#ffffff'] }); }}
        disabled={challenge.claimed}
        className={`mt-3 w-full px-3 py-1.5 rounded-md text-[12px] font-semibold transition
          ${challenge.claimed
            ? 'bg-[var(--line)] text-[var(--muted-2)] cursor-not-allowed'
            : 'bg-[var(--accent)] text-[#0a0a0b] hover:brightness-110'}`}
      >
        {challenge.claimed
          ? <span className="flex items-center gap-1 justify-center"><Check className="w-3 h-3"/> Claimed +{challenge.xpReward}{wager?.resolved==='win' ? ` (+${wager.amount*2} wager!)` : ''}</span>
          : 'I did it — claim XP'}
      </button>

      {/* Wager UI */}
      {!challenge.claimed && (
        <div className="mt-3 pt-3 border-t hairline">
          {!wager ? (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--muted-2)] mb-1.5">
                <Dice5 className="w-3 h-3 text-amber-300" /> Risk-It Wager
                <span className="ml-auto mono text-[10px]">double or nothing</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={wagerInput}
                  onChange={e => setWagerInput(parseInt(e.target.value) || 0)}
                  min={10} max={Math.min(200, xp)}
                  className="w-16 px-2 py-1 rounded border hairline-2 mono text-[12px] text-center"
                />
                <span className="text-[10px] text-[var(--muted-2)]">XP stake</span>
                <button
                  onClick={() => { setErr(null); const r = placeWager(wagerInput); if (!r.ok) setErr(r.reason || 'failed'); }}
                  disabled={wagerInput < 10 || xp < wagerInput}
                  className="ml-auto px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-300 text-[#0a0a0b] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
                >
                  Wager
                </button>
              </div>
              <div className="text-[10px] text-[var(--muted-2)] mt-1.5">
                Win the challenge today → get <span className="mono text-[var(--accent)]">{wagerInput * 2} XP</span> back. Fail → lose stake.
              </div>
              {err && <div className="text-[10px] text-[var(--neg)] mt-1">{err}</div>}
            </div>
          ) : wager.resolved === null ? (
            <div className="flex items-center gap-2 text-[11px]">
              <Dice5 className="w-3 h-3 text-amber-300" />
              <span className="text-[var(--fg)]">
                <span className="mono text-amber-300">{wager.amount} XP</span> staked. Win = <span className="mono text-[var(--accent)]">+{wager.amount * 2}</span>.
              </span>
            </div>
          ) : null}
        </div>
      )}
      {wager?.resolved === 'lose' && !challenge.claimed && (
        <div className="mt-3 pt-3 border-t hairline text-[11px] text-[var(--neg)] flex items-center gap-1.5">
          <Dice5 className="w-3 h-3" /> Wager lost — <span className="mono">−{wager.amount} XP</span>. Tomorrow's another roll.
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
        <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">AI Challenge</h3>
      </div>
      <span className="mono text-[10px] text-[var(--muted-2)]">today only</span>
    </div>
  );
}
