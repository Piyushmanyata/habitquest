import { motion } from 'framer-motion';
import { Target, Zap, Snowflake } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';

export default function Inventory() {
  const inv = useHabitStore(s => s.inventory);
  const buffs = useHabitStore(s => s.buffs);
  const use = useHabitStore(s => s.useItem);

  return (
    <div className="surface p-4">
      <h3 className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-3">Inventory</h3>
      <div className="grid grid-cols-3 gap-2">
        <Slot
          active={buffs.focus} count={inv.focus} label="Focus" sub="2× next +"
          icon={<Target className="w-3.5 h-3.5" />}
          onClick={() => inv.focus > 0 && !buffs.focus && use('focus')}
        />
        <Slot
          active={buffs.crit} count={inv.crit} label="Crit" sub="3× next +"
          icon={<Zap className="w-3.5 h-3.5" />}
          onClick={() => inv.crit > 0 && !buffs.crit && use('crit')}
        />
        <Slot
          active={false} count={inv.freeze} label="Freeze" sub="saves streak"
          icon={<Snowflake className="w-3.5 h-3.5" />}
          onClick={() => {}}
        />
      </div>
      {(buffs.focus || buffs.crit) && (
        <div className="mt-3 text-[11px] text-[var(--accent)] mono">
          Buff active: {[buffs.focus && '×2 FOCUS', buffs.crit && '×3 CRIT'].filter(Boolean).join(' · ')} — log a positive!
        </div>
      )}
    </div>
  );
}

function Slot({ icon, count, label, sub, active, onClick }: any) {
  const usable = count > 0 && !active && onClick;
  return (
    <motion.button
      whileHover={usable ? { scale: 1.03 } : undefined}
      whileTap={usable ? { scale: 0.97 } : undefined}
      onClick={onClick}
      className={`p-2.5 rounded-md border text-left transition
        ${active ? 'border-[var(--accent)] bg-[rgba(194,245,74,0.08)]' :
          count > 0 ? 'border-[var(--line-2)] hover:border-[var(--accent)] cursor-pointer' :
          'border-[var(--line)] opacity-40 cursor-default'}`}
    >
      <div className="flex items-center gap-1.5 text-[var(--fg)]">{icon}<span className="text-[11px] font-medium">{label}</span></div>
      <div className="mt-0.5 mono text-[12px]">×{count}</div>
      <div className="text-[10px] text-[var(--muted-2)]">{sub}</div>
    </motion.button>
  );
}
