import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Check, ShoppingBag, Sparkles, Loader2, Trash2, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { SHOP_ITEMS, ShopItem } from '../lib/shop';

export default function Shop() {
  const xp = useHabitStore(s => s.profile.xp);
  const buy = useHabitStore(s => s.buyItem);
  const passes = useHabitStore(s => s.passes);
  const inventory = useHabitStore(s => s.inventory);
  const lastPurchase = useHabitStore(s => s.lastPurchase);
  const customItems = useHabitStore(s => s.customItems);
  const addCustom = useHabitStore(s => s.addCustomItem);
  const removeCustom = useHabitStore(s => s.removeCustomItem);

  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    if (!lastPurchase) return;
    setFlash(lastPurchase.itemId);
    const t = setTimeout(() => setFlash(null), 900);
    return () => clearTimeout(t);
  }, [lastPurchase?.at]);

  const passesList   = SHOP_ITEMS.filter(i => i.kind === 'pass');
  const powerupsList = SHOP_ITEMS.filter(i => i.kind === 'powerup');

  function ownedCount(item: ShopItem) {
    if (item.kind === 'pass') return passes[item.id] || 0;
    if (item.kind === 'powerup' && item.powerup) return inventory[item.powerup] as number;
    return 0;
  }

  return (
    <div className="space-y-5">
      <div className="surface p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-gradient-to-br from-amber-300 to-amber-500 grid place-items-center text-[#0a0a0b]">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display font-semibold text-[15px]">The Armory</div>
            <div className="text-[11px] text-[var(--muted)]">Spend XP on real-life passes, combat buffs, or invent your own.</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Coins className="w-4 h-4 text-[var(--accent)]" />
          <span className="mono text-[var(--accent)] text-lg">{xp}</span>
          <span className="text-[10px] uppercase tracking-wider text-[var(--muted-2)] ml-1">XP</span>
        </div>
      </div>

      <CustomItemForge onAdd={addCustom} />

      {customItems.length > 0 && (
        <Section title="Your Custom Passes" subtitle="AI-priced. Tap × to remove.">
          <Grid>
            {customItems.map(item => (
              <Card
                key={item.id}
                item={item}
                xp={xp}
                owned={ownedCount(item)}
                flash={flash === item.id}
                onBuy={() => buy(item.id)}
                onRemove={() => removeCustom(item.id)}
              />
            ))}
          </Grid>
        </Section>
      )}

      <Section title="Real-life Passes" subtitle="Logging these costs nothing — you already paid up front.">
        <Grid>
          {passesList.map(item => (
            <Card key={item.id} item={item} xp={xp} owned={ownedCount(item)} flash={flash === item.id} onBuy={() => buy(item.id)} />
          ))}
        </Grid>
      </Section>

      <Section title="Power-ups" subtitle="Stack the deck for your next positive entry.">
        <Grid>
          {powerupsList.map(item => (
            <Card key={item.id} item={item} xp={xp} owned={ownedCount(item)} flash={flash === item.id} onBuy={() => buy(item.id)} />
          ))}
        </Grid>
      </Section>
    </div>
  );
}

function CustomItemForge({ onAdd }: { onAdd: (text: string) => Promise<{ ok: boolean; reason?: string }> }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true); setError(null);
    const res = await onAdd(text);
    setBusy(false);
    if (!res.ok) setError(res.reason || 'failed');
    else setText('');
  }

  return (
    <div className="surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Forge a Custom Pass</span>
        <span className="ml-auto text-[10px] text-[var(--muted-2)] mono">AI picks the price</span>
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="e.g. Order McDonald's takeout · Watch a 3-hour movie · Skip dishes for a day"
          className="flex-1 px-3 py-2 rounded-md border hairline-2 text-[13px] focus:border-[var(--accent)]"
        />
        <button onClick={submit} disabled={!text.trim() || busy} className="btn btn-primary">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {busy ? 'AI pricing…' : 'Add'}
        </button>
      </div>
      {error && <div className="text-[11px] text-[var(--neg)] mt-2">{error}</div>}
      <div className="text-[10px] text-[var(--muted-2)] mt-2">
        Describe any real-life indulgence. The AI evaluates it, names it, prices it, and slots it into your shop.
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-2 px-1">
        <h2 className="font-display text-sm font-semibold tracking-tight">{title}</h2>
        <span className="text-[11px] text-[var(--muted-2)]">{subtitle}</span>
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>;
}

function Card({ item, xp, owned, flash, onBuy, onRemove }: {
  item: ShopItem;
  xp: number;
  owned: number;
  flash: boolean;
  onBuy: () => void;
  onRemove?: () => void;
}) {
  const canAfford = xp >= item.cost;
  return (
    <motion.div
      animate={flash ? { scale: [1, 1.03, 1], boxShadow: ['0 0 0 0 rgba(194,245,74,0)', '0 0 0 6px rgba(194,245,74,0.25)', '0 0 0 0 rgba(194,245,74,0)'] } : {}}
      transition={{ duration: 0.6 }}
      className="surface p-4 flex flex-col gap-3 group relative"
    >
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 p-1 rounded-md text-[var(--muted-2)] hover:text-[var(--neg)] hover:bg-white/5 opacity-0 group-hover:opacity-100 transition"
          aria-label="Remove custom item"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
      <div className="flex items-start gap-3">
        <div className="text-3xl">{item.emoji}</div>
        <div className="flex-1 min-w-0 pr-5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[14px]">{item.name}</span>
            {owned > 0 && <span className="chip chip-pos mono">×{owned}</span>}
          </div>
          <div className="text-[11px] text-[var(--muted)] leading-snug mt-0.5">{item.description}</div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[var(--muted)] text-[12px]">
          <Coins className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="mono text-[var(--fg)]">{item.cost}</span> XP
        </span>
        <button
          onClick={onBuy}
          disabled={!canAfford}
          className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition
            ${canAfford
              ? 'bg-[var(--accent)] text-[#0a0a0b] hover:brightness-110'
              : 'bg-[var(--line)] text-[var(--muted-2)] cursor-not-allowed'}`}
        >
          <AnimatePresence mode="wait">
            {flash ? (
              <motion.span key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1">
                <Check className="w-3 h-3" /> Got it
              </motion.span>
            ) : (
              <motion.span key="buy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Buy
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.div>
  );
}
