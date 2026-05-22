// Visual "paper doll" + aggregate stat readout. Click an equipped slot to unequip.
import { motion } from 'framer-motion';
import { useHabitStore } from '../store/useHabitStore';
import {
  GEAR_BY_ID, GearSlot, SLOT_EMOJI, SLOT_LABEL, RARITY_COLOR, RARITY_GLOW,
} from '../lib/gear';
import { levelFromXp } from '../lib/gamification';

const SLOTS: GearSlot[] = ['head', 'body', 'hands', 'legs', 'feet', 'weapon', 'trinket'];

export default function Character() {
  const equipped = useHabitStore(s => s.gearEquipped);
  const unequip  = useHabitStore(s => s.unequipGear);
  const bonuses  = useHabitStore(s => s.gearBonuses());
  const xp       = useHabitStore(s => s.profile.xp);
  const lvl      = levelFromXp(xp);

  return (
    <div className="surface p-5 relative overflow-hidden">
      <div className="absolute -top-16 -left-16 w-44 h-44 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.10),transparent_70%)] pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-44 h-44 rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.08),transparent_70%)] pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative">
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--fg)] leading-tight">Your Character</h3>
          <div className="text-[10px] mono uppercase tracking-wider text-[var(--muted-2)]">level <span className="text-[var(--accent)]">{lvl.level}</span></div>
        </div>
        <div className="text-right">
          <div className="text-[10px] mono uppercase tracking-wider text-[var(--muted-2)]">equipped bonuses</div>
          <div className="text-[11px] mono text-[var(--accent)]">
            +{Math.round((bonuses.xpMultiplier - 1) * 100)}% XP · +{Math.round((bonuses.bossDamageMultiplier - 1) * 100)}% dmg
          </div>
        </div>
      </div>

      {/* Paper doll grid — central body column with head/weapon on top, trinket below */}
      <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto relative">
        <span />
        <Slot slot="head" itemId={equipped.head} onUnequip={unequip} />
        <span />

        <Slot slot="weapon" itemId={equipped.weapon} onUnequip={unequip} />
        <Slot slot="body"   itemId={equipped.body}   onUnequip={unequip} big />
        <Slot slot="hands"  itemId={equipped.hands}  onUnequip={unequip} />

        <span />
        <Slot slot="legs" itemId={equipped.legs} onUnequip={unequip} />
        <span />

        <span />
        <Slot slot="feet" itemId={equipped.feet} onUnequip={unequip} />
        <span />

        <span />
        <Slot slot="trinket" itemId={equipped.trinket} onUnequip={unequip} />
        <span />
      </div>

      {/* Stat readout */}
      <div className="mt-4 pt-3 border-t hairline grid grid-cols-2 gap-2 text-[11px] relative">
        <Stat label="XP bonus"      value={`+${Math.round((bonuses.xpMultiplier - 1) * 100)}%`} accent="lime" />
        <Stat label="Boss damage"   value={`+${Math.round((bonuses.bossDamageMultiplier - 1) * 100)}%`} accent="warm" />
        <Stat label="Combo extend"  value={`+${Math.round(bonuses.comboExtendSec / 60)}min`} accent="info" />
        <Stat label="Loot rate"     value={`+${Math.round(bonuses.lootRateBonus * 100)}%`} accent="purple" />
        {Object.entries(bonuses.categoryBoost).map(([k, v]) => (
          <Stat key={k} label={`${k} bonus`} value={`+${Math.round((v as number) * 100)}%`} accent="lime" />
        ))}
        {bonuses.streakShields > 0 && (
          <Stat label="Streak shields" value={`${bonuses.streakShields}/wk`} accent="info" />
        )}
      </div>
    </div>
  );
}

function Slot({ slot, itemId, onUnequip, big }: {
  slot: GearSlot; itemId?: string; onUnequip: (s: GearSlot) => void; big?: boolean;
}) {
  const item = itemId ? GEAR_BY_ID[itemId] : undefined;
  const color = item ? RARITY_COLOR[item.rarity] : 'var(--line-2)';
  const glow  = item ? RARITY_GLOW[item.rarity]  : 'none';
  const size = big ? 80 : 60;
  return (
    <motion.button
      onClick={() => item && onUnequip(slot)}
      whileHover={item ? { scale: 1.05 } : undefined}
      whileTap={item ? { scale: 0.95 } : undefined}
      disabled={!item}
      className="relative rounded-lg flex flex-col items-center justify-center border-2 transition group bg-[var(--panel-2)]"
      style={{
        borderColor: color,
        boxShadow: glow,
        width: '100%',
        height: size,
        opacity: item ? 1 : 0.42,
      }}
      title={item ? `${item.name} (click to unequip)` : `${SLOT_LABEL[slot]} (empty)`}
    >
      <div className={big ? 'text-3xl' : 'text-2xl'}>
        {item?.emoji ?? <span className="opacity-40">{SLOT_EMOJI[slot]}</span>}
      </div>
      <div className="text-[8.5px] mono uppercase tracking-wider text-[var(--muted-2)] mt-0.5">
        {SLOT_LABEL[slot]}
      </div>
      {item && (
        <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition bg-black/50 grid place-items-center text-[10px] mono uppercase tracking-wider text-[var(--neg)]">
          unequip
        </div>
      )}
    </motion.button>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: 'lime' | 'warm' | 'info' | 'purple' }) {
  const cls = accent === 'lime'   ? 'text-[var(--accent)]'
            : accent === 'warm'   ? 'text-amber-300'
            : accent === 'info'   ? 'text-sky-300'
            : 'text-purple-300';
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[var(--muted)] uppercase tracking-wider text-[10px]">{label}</span>
      <span className={`mono text-[11px] ${cls}`}>{value}</span>
    </div>
  );
}
