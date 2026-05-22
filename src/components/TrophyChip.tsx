import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function TrophyChip() {
  const trophy = useHabitStore(s => s.trophy);
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force(x => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  if (!trophy || Date.now() >= trophy.expiresAt) return null;
  const remaining = trophy.expiresAt - Date.now();
  return (
    <div
      className="surface px-3 py-1.5 flex items-center gap-2"
      title="Boss trophy: +10% XP on positive entries"
    >
      <Trophy className="w-3.5 h-3.5 text-amber-300" />
      <span className="mono text-[11px] text-amber-300 font-semibold">+10% XP</span>
      <span className="mono text-[10px] text-[var(--muted-2)]">{fmt(remaining)}</span>
    </div>
  );
}
