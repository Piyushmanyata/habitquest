// Big RPG-style hero figure. A central stylised body silhouette with equipped-emoji
// pieces placed over their anatomical slots. Animates whenever gear changes.
import { motion, AnimatePresence } from 'framer-motion';
import { useHabitStore } from '../store/useHabitStore';
import {
  GEAR_BY_ID, GEAR, GearSlot, SLOT_EMOJI, SLOT_LABEL,
  RARITY_COLOR, RARITY_GLOW,
} from '../lib/gear';
import { levelFromXp } from '../lib/gamification';

export default function Character() {
  const equipped = useHabitStore(s => s.gearEquipped);
  const unequip  = useHabitStore(s => s.unequipGear);
  const bonuses  = useHabitStore(s => s.gearBonuses());
  const xp       = useHabitStore(s => s.profile.xp);
  const lvl      = levelFromXp(xp);

  // Closest level-locked piece — drives the "next unlock" hint at the bottom.
  const nextUnlock = GEAR
    .filter(g => g.unlockLevel && g.unlockLevel > lvl.level)
    .sort((a, b) => (a.unlockLevel! - b.unlockLevel!))[0];

  const equippedCount = Object.values(equipped).filter(Boolean).length;

  return (
    <div className="surface p-5 relative overflow-hidden">
      {/* Ambient glow halos */}
      <div className="absolute -top-20 -left-20 w-56 h-56 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.16),transparent_70%)] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-56 h-56 rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.10),transparent_70%)] pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative">
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--fg)] leading-tight">Your Hero</h3>
          <div className="text-[10px] mono uppercase tracking-wider text-[var(--muted-2)]">
            level <span className="text-[var(--accent)]">{lvl.level}</span> · {equippedCount}/7 slots equipped
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] mono uppercase tracking-wider text-[var(--muted-2)]">total bonuses</div>
          <div className="text-[11px] mono text-[var(--accent)]">
            +{Math.round((bonuses.xpMultiplier - 1) * 100)}% XP · +{Math.round((bonuses.bossDamageMultiplier - 1) * 100)}% dmg
          </div>
        </div>
      </div>

      {/* ── Hero Figure ── */}
      <div className="relative mx-auto" style={{ width: 240, height: 360 }}>
        {/* Floor / platform glow */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-40 h-3 rounded-full bg-[radial-gradient(ellipse,rgba(194,245,74,0.18),transparent_70%)] blur-sm" />

        {/* Floor "tile" */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-2 w-44 h-1 rounded-full bg-[var(--line-2)] opacity-60" />

        {/* Body silhouette behind everything */}
        <BodySilhouette />

        {/* Head — top centre, hovering */}
        <SlotFig
          slot="head" itemId={equipped.head} size={78}
          style={{ left: '50%', top: 0, transform: 'translateX(-50%)' }}
          onUnequip={unequip}
        />

        {/* Weapon — far left, mid */}
        <SlotFig
          slot="weapon" itemId={equipped.weapon} size={68}
          style={{ left: 4, top: 130 }}
          onUnequip={unequip}
          rotate={-12}
        />

        {/* Hands — right side */}
        <SlotFig
          slot="hands" itemId={equipped.hands} size={62}
          style={{ right: 4, top: 138 }}
          onUnequip={unequip}
        />

        {/* Body — centre dominant */}
        <SlotFig
          slot="body" itemId={equipped.body} size={108}
          style={{ left: '50%', top: 96, transform: 'translateX(-50%)' }}
          onUnequip={unequip}
          big
        />

        {/* Legs */}
        <SlotFig
          slot="legs" itemId={equipped.legs} size={88}
          style={{ left: '50%', top: 210, transform: 'translateX(-50%)' }}
          onUnequip={unequip}
        />

        {/* Feet */}
        <SlotFig
          slot="feet" itemId={equipped.feet} size={70}
          style={{ left: '50%', top: 290, transform: 'translateX(-50%)' }}
          onUnequip={unequip}
        />

        {/* Trinket — floating beside the head */}
        <SlotFig
          slot="trinket" itemId={equipped.trinket} size={54}
          style={{ right: 14, top: 6 }}
          onUnequip={unequip}
          floating
        />
      </div>

      {/* Stat readout */}
      <div className="mt-4 pt-3 border-t hairline grid grid-cols-2 gap-2 text-[11px] relative">
        <Stat label="XP bonus"     value={`+${Math.round((bonuses.xpMultiplier - 1) * 100)}%`}        accent="lime" />
        <Stat label="Boss damage"  value={`+${Math.round((bonuses.bossDamageMultiplier - 1) * 100)}%`} accent="warm" />
        <Stat label="Combo extend" value={`+${Math.round(bonuses.comboExtendSec / 60)} min`}            accent="info" />
        <Stat label="Loot rate"    value={`+${Math.round(bonuses.lootRateBonus * 100)}%`}              accent="purple" />
        {Object.entries(bonuses.categoryBoost).map(([k, v]) => (
          <Stat key={k} label={`${k} bonus`} value={`+${Math.round((v as number) * 100)}%`} accent="lime" />
        ))}
        {bonuses.streakShields > 0 && (
          <Stat label="Streak shields" value={`${bonuses.streakShields}/wk`} accent="info" />
        )}
      </div>

      {/* Next unlock motivation */}
      {nextUnlock && (
        <div className="mt-3 pt-3 border-t hairline">
          <div className="text-[10px] mono uppercase tracking-wider text-[var(--muted-2)] mb-1.5">
            next unlock at level <span className="text-[var(--accent)]">{nextUnlock.unlockLevel}</span>
          </div>
          <div className="flex items-center gap-2.5 group">
            <div
              className="text-2xl grid place-items-center w-10 h-10 rounded-md border-2 grayscale group-hover:grayscale-0 transition"
              style={{ borderColor: RARITY_COLOR[nextUnlock.rarity] }}
            >
              {nextUnlock.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium truncate">{nextUnlock.name}</div>
              <div className="text-[10px] text-[var(--muted-2)]">
                <span className="mono" style={{ color: RARITY_COLOR[nextUnlock.rarity] }}>{nextUnlock.rarity}</span>
                <span className="mx-1">·</span>
                <span>{nextUnlock.cost} XP</span>
                <span className="mx-1">·</span>
                <span>{nextUnlock.unlockLevel! - lvl.level} levels away</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────

function BodySilhouette() {
  // Soft ghosted body shape so the user sees an outline even with empty slots.
  return (
    <svg viewBox="0 0 240 360" className="absolute inset-0 w-full h-full pointer-events-none">
      <defs>
        <radialGradient id="aura" cx="50%" cy="40%" r="60%">
          <stop offset="0%"   stopColor="rgba(194,245,74,0.07)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="160" r="130" fill="url(#aura)" />
    </svg>
  );
}

function SlotFig({
  slot, itemId, size, style, onUnequip, big, rotate, floating,
}: {
  slot: GearSlot;
  itemId?: string;
  size: number;
  style: React.CSSProperties;
  onUnequip: (s: GearSlot) => void;
  big?: boolean;
  rotate?: number;
  floating?: boolean;
}) {
  const item = itemId ? GEAR_BY_ID[itemId] : undefined;
  const color = item ? RARITY_COLOR[item.rarity] : 'var(--line-2)';
  const glow  = item ? RARITY_GLOW[item.rarity]  : 'none';
  const equippedClass = item ? 'cursor-pointer' : 'opacity-40 cursor-default';
  const shimmer =
    item?.rarity === 'mythic'    ? 'shimmer-bg shimmer-bg-mythic' :
    item?.rarity === 'legendary' ? 'shimmer-bg shimmer-bg-legend' :
    item?.rarity === 'epic'      ? 'shimmer-bg shimmer-bg-epic'   :
    item?.rarity === 'rare'      ? 'shimmer-bg shimmer-bg-rare'   :
    '';

  return (
    <div className="absolute" style={style}>
      <AnimatePresence mode="popLayout">
        <motion.button
          key={item?.id || `empty-${slot}`}
          onClick={() => item && onUnequip(slot)}
          disabled={!item}
          initial={{ scale: 0.8, opacity: 0, rotate: (rotate || 0) - 8 }}
          animate={
            floating
              ? { scale: 1, opacity: 1, rotate: rotate || 0, y: [0, -4, 0] }
              : { scale: 1, opacity: 1, rotate: rotate || 0 }
          }
          transition={
            floating
              ? { y: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }, duration: 0.35 }
              : { type: 'spring', stiffness: 220, damping: 16 }
          }
          exit={{ scale: 0.8, opacity: 0 }}
          whileHover={item ? { scale: 1.08 } : undefined}
          whileTap={item ? { scale: 0.95 } : undefined}
          className={`relative rounded-xl flex items-center justify-center border-2 group bg-[var(--panel-2)] overflow-hidden ${equippedClass} ${big && item ? 'breathe' : ''}`}
          style={{
            width: size,
            height: size,
            borderColor: color,
            boxShadow: glow,
          }}
          title={item ? `${item.name} (click to unequip)` : `${SLOT_LABEL[slot]} (empty)`}
        >
          {/* iridescent shimmer for rare+ */}
          {shimmer && <div className={`absolute inset-0 rounded-xl ${shimmer}`} />}
          {/* gear emoji or empty placeholder */}
          <span style={{ fontSize: big ? size * 0.65 : size * 0.6, lineHeight: 1, position: 'relative', zIndex: 1 }}>
            {item?.emoji ?? <span style={{ opacity: 0.25 }}>{SLOT_EMOJI[slot]}</span>}
          </span>
          {/* slot label, tiny */}
          <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[8.5px] mono uppercase tracking-wider text-[var(--muted-2)] whitespace-nowrap">
            {SLOT_LABEL[slot]}
          </span>
          {/* hover hint */}
          {item && (
            <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition bg-black/60 grid place-items-center text-[10px] mono uppercase tracking-wider text-[var(--neg)]">
              unequip
            </span>
          )}
        </motion.button>
      </AnimatePresence>
    </div>
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
