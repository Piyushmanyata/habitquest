import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Coins, Check, ShieldCheck, Lock } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';
import {
  GEAR, GEAR_BY_ID, GearItem, GearSlot, SLOT_EMOJI, SLOT_LABEL,
  RARITY_COLOR, RARITY_GLOW, RARITY_ORDER, describeStats,
} from '../lib/gear';
import { levelFromXp } from '../lib/gamification';

const SLOTS: GearSlot[] = ['head', 'body', 'hands', 'legs', 'feet', 'weapon', 'trinket'];

export default function Armory() {
  const xp = useHabitStore(s => s.profile.xp);
  const gold = useHabitStore(s => s.profile.gold);
  const level = levelFromXp(xp).level;
  const owned = useHabitStore(s => s.gearOwned);
  const equipped = useHabitStore(s => s.gearEquipped);
  const buy = useHabitStore(s => s.buyGear);
  const equip = useHabitStore(s => s.equipGear);
  const lastGear = useHabitStore(s => s.lastGear);

  const [flash, setFlash] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<GearSlot>('head');

  useEffect(() => {
    if (!lastGear) return;
    setFlash(lastGear.id);
    const t = setTimeout(() => setFlash(null), 800);
    return () => clearTimeout(t);
  }, [lastGear?.at]);

  const itemsInSlot = GEAR
    .filter(g => g.slot === activeSlot)
    .sort((a, b) => {
      // Affordable + unlocked first, then locked-by-level, then locked-by-cost
      const ar = RARITY_ORDER.indexOf(a.rarity);
      const br = RARITY_ORDER.indexOf(b.rarity);
      return ar - br || (a.unlockLevel ?? 0) - (b.unlockLevel ?? 0) || a.cost - b.cost;
    });

  // Closest locked-by-level item across the entire catalog — the carrot.
  const nextLocked = GEAR
    .filter(g => g.unlockLevel && g.unlockLevel > level && !owned.includes(g.id))
    .sort((a, b) => (a.unlockLevel! - b.unlockLevel!) || a.cost - b.cost)[0];

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-[12px] text-[var(--muted)]">
          Spend gold on permanent gear. Higher tiers unlock as you level up.
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-amber-300" />
            <span className="mono text-amber-300">{gold}</span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--muted-2)] ml-1">gold</span>
          </div>
          <span className="text-[var(--muted-2)]">·</span>
          <span className="text-[10px] uppercase tracking-wider text-[var(--muted-2)]">level {level}</span>
        </div>
      </div>

      {/* Next-unlock motivational banner */}
      {nextLocked && (
        <div className="surface p-3 flex items-center gap-3 relative overflow-hidden"
             style={{ borderColor: RARITY_COLOR[nextLocked.rarity], boxShadow: RARITY_GLOW[nextLocked.rarity] }}>
          <div className="text-3xl grayscale opacity-50">{nextLocked.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] mono uppercase tracking-wider text-[var(--muted-2)]">
              your next unlock at level <span className="text-[var(--accent)]">{nextLocked.unlockLevel}</span>
            </div>
            <div className="text-[14px] font-semibold flex items-center gap-2">
              <span>{nextLocked.name}</span>
              <span className="mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ background: RARITY_COLOR[nextLocked.rarity], color: '#0a0a0b' }}>
                {nextLocked.rarity}
              </span>
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-0.5">
              {describeStats(nextLocked.stats).join(' · ')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] mono uppercase tracking-wider text-[var(--muted-2)]">levels away</div>
            <div className="font-display text-2xl font-bold text-[var(--accent)] mono">{nextLocked.unlockLevel! - level}</div>
          </div>
        </div>
      )}

      {/* Slot picker */}
      <div className="flex flex-wrap gap-1.5">
        {SLOTS.map(s => {
          const active = s === activeSlot;
          const equippedItem = equipped[s] ? GEAR_BY_ID[equipped[s]!] : undefined;
          return (
            <button
              key={s}
              onClick={() => setActiveSlot(s)}
              className={`px-3 py-2 rounded-md text-[12px] font-medium transition flex items-center gap-2 border
                ${active
                  ? 'bg-[var(--accent)] text-[#0a0a0b] border-[var(--accent)]'
                  : 'border-[var(--line-2)] text-[var(--muted)] hover:text-[var(--fg)] hover:bg-white/[0.03]'}`}
            >
              <span className="text-base">{equippedItem?.emoji || SLOT_EMOJI[s]}</span>
              <span>{SLOT_LABEL[s]}</span>
              {equippedItem && (
                <span className={`mono text-[9px] uppercase tracking-wider px-1 rounded
                  ${active ? 'text-[#0a0a0b]/70 bg-[#0a0a0b]/15' : 'text-[var(--muted-2)] bg-[var(--line)]'}`}>
                  on
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Items grid for active slot */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {itemsInSlot.map(item => (
          <GearCard
            key={item.id}
            item={item}
            owned={owned.includes(item.id)}
            equippedHere={equipped[item.slot] === item.id}
            level={level}
            gold={gold}
            flash={flash === item.id}
            onBuy={() => buy(item.id)}
            onEquip={() => equip(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

function GearCard({ item, owned, equippedHere, level, gold, flash, onBuy, onEquip }: {
  item: GearItem; owned: boolean; equippedHere: boolean;
  level: number; gold: number; flash: boolean;
  onBuy: () => void; onEquip: () => void;
}) {
  const locked = !!item.unlockLevel && level < item.unlockLevel;
  const canAfford = gold >= item.cost;
  const stats = describeStats(item.stats);
  const color = RARITY_COLOR[item.rarity];
  const glow = RARITY_GLOW[item.rarity];

  return (
    <motion.div
      animate={flash ? { scale: [1, 1.03, 1] } : {}}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -2 }}
      className="surface p-4 flex flex-col gap-2 relative overflow-hidden"
      style={{ borderColor: color, boxShadow: glow }}
    >
      {/* Shimmer overlay for rare+ items */}
      {(item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary' || item.rarity === 'mythic') && (
        <div className={`absolute inset-0 rounded-[12px] pointer-events-none ${
          item.rarity === 'mythic'    ? 'shimmer-bg shimmer-bg-mythic' :
          item.rarity === 'legendary' ? 'shimmer-bg shimmer-bg-legend' :
          item.rarity === 'epic'      ? 'shimmer-bg shimmer-bg-epic'   :
                                        'shimmer-bg shimmer-bg-rare'
        }`} />
      )}
      {/* Rarity label corner */}
      <div className="absolute top-0 right-0 px-2 py-0.5 text-[9px] mono uppercase tracking-wider rounded-bl z-[1]"
           style={{ background: color, color: '#0a0a0b' }}>
        {item.rarity}
      </div>

      <div className="flex items-start gap-3 mt-3">
        <div className="text-3xl">{item.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[14px]">{item.name}</div>
          <div className="text-[10px] text-[var(--muted-2)] uppercase tracking-wider">{SLOT_LABEL[item.slot]}</div>
        </div>
      </div>

      <div className="text-[11px] text-[var(--muted)] leading-snug">{item.description}</div>

      <ul className="text-[11px] mono space-y-0.5">
        {stats.map(s => <li key={s} className="text-[var(--accent)]">{s}</li>)}
        {stats.length === 0 && <li className="text-[var(--muted-2)]">no bonus</li>}
      </ul>

      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[var(--muted)] text-[12px]">
          {locked ? (
            <><Lock className="w-3 h-3 text-[var(--muted-2)]" /> Lvl {item.unlockLevel}</>
          ) : item.cost === 0 ? (
            <span className="mono text-[var(--muted-2)]">FREE</span>
          ) : (
            <>
              <Coins className="w-3.5 h-3.5 text-amber-300" />
              <span className="mono text-[var(--fg)]">{item.cost}</span> gold
            </>
          )}
        </span>

        {equippedHere ? (
          <span className="px-2.5 py-1 rounded text-[11px] mono uppercase tracking-wider bg-[var(--accent)] text-[#0a0a0b] font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> equipped
          </span>
        ) : owned ? (
          <button
            onClick={onEquip}
            className="px-3 py-1 rounded text-[11px] font-semibold border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#0a0a0b] transition"
          >
            Equip
          </button>
        ) : (
          <button
            onClick={onBuy}
            disabled={locked || !canAfford}
            className={`px-3 py-1 rounded text-[11px] font-semibold transition
              ${locked || !canAfford
                ? 'bg-[var(--line)] text-[var(--muted-2)] cursor-not-allowed'
                : 'bg-[var(--accent)] text-[#0a0a0b] hover:brightness-110'}`}
          >
            <AnimatePresence mode="wait">
              {flash ? (
                <motion.span key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1">
                  <Check className="w-3 h-3" /> got it
                </motion.span>
              ) : (
                <motion.span key="buy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Buy
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )}
      </div>
    </motion.div>
  );
}
