import { useEffect, useState } from 'react';
import TopBar from './components/TopBar';
import JournalInput from './components/JournalInput';
import Timeline from './components/Timeline';
import Quests from './components/Quests';
import Stats from './components/Stats';
import Settings from './components/Settings';
import XpToast from './components/XpToast';
import ScreenFx from './components/ScreenFx';
import DailyRecap from './components/DailyRecap';
import Boss from './components/Boss';
import Inventory from './components/Inventory';
import LootToast from './components/LootToast';
import Analytics from './components/Analytics';
import AiStatus from './components/AiStatus';
import LevelUpBanner from './components/LevelUpBanner';
import Shop from './components/Shop';
import PassBar from './components/PassBar';
import MemoryCard from './components/MemoryCard';
import CheckinBanner from './components/CheckinBanner';
import AiChallengeCard from './components/AiChallengeCard';
import WisdomPanel from './components/WisdomPanel';
import AchievementReveal from './components/AchievementReveal';
import TrophyChip from './components/TrophyChip';
import ComboCallout from './components/ComboCallout';
import { useHabitStore } from './store/useHabitStore';
import { warmupLocalAI } from './lib/localAI';

type Tab = 'journal' | 'analytics' | 'shop';

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('journal');
  const refresh = useHabitStore(s => s.refreshQuests);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { const t = setTimeout(() => warmupLocalAI(), 800); return () => clearTimeout(t); }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // ignore typing in inputs
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') { setSettingsOpen(false); setRecapOpen(false); return; }
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === '1') setTab('journal');
        if (e.key === '2') setTab('analytics');
        if (e.key === '3') setTab('shop');
        if (e.key === 'r' || e.key === 'R') setRecapOpen(true);
        if (e.key === ',' ) setSettingsOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen px-5 md:px-6 py-5 md:py-7 max-w-6xl mx-auto">
      <TopBar onOpenSettings={() => setSettingsOpen(true)} onOpenRecap={() => setRecapOpen(true)} />

      <div className="flex items-center gap-1 mb-5 flex-wrap">
        <TabBtn name="journal"   active={tab === 'journal'}   onClick={() => setTab('journal')} kbd="1" />
        <TabBtn name="analytics" active={tab === 'analytics'} onClick={() => setTab('analytics')} kbd="2" />
        <TabBtn name="shop"      active={tab === 'shop'}      onClick={() => setTab('shop')} kbd="3" />
        <TrophyChip />
        <div className="ml-auto"><AiStatus /></div>
      </div>

      <CheckinBanner />

      {tab === 'journal' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <main className="space-y-4">
            <PassBar />
            <JournalInput />
            <Timeline />
          </main>
          <aside className="space-y-4">
            <Boss />
            <AiChallengeCard />
            <MemoryCard />
            <WisdomPanel />
            <Inventory />
            <Quests />
            <Stats />
          </aside>
        </div>
      )}
      {tab === 'analytics' && <Analytics />}
      {tab === 'shop'      && <Shop />}

      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <DailyRecap open={recapOpen} onClose={() => setRecapOpen(false)} />
      <ScreenFx />
      <XpToast />
      <LootToast />
      <LevelUpBanner />
      <AchievementReveal />
      <ComboCallout />
    </div>
  );
}

function TabBtn({ name, active, onClick, kbd }: { name: string; active: boolean; onClick: () => void; kbd?: string }) {
  return (
    <button
      onClick={onClick}
      title={kbd ? `Press ${kbd}` : undefined}
      className={`px-3 py-1.5 rounded-md text-[12px] font-medium uppercase tracking-wider transition flex items-center gap-1.5
        ${active ? 'bg-[var(--accent)] text-[#0a0a0b]' : 'text-[var(--muted)] hover:text-[var(--fg)] hover:bg-white/5'}`}
    >
      {name}
      {kbd && <span className={`mono text-[9px] px-1 py-0.5 rounded border ${active ? 'border-[#0a0a0b]/40 text-[#0a0a0b]/70' : 'border-[var(--line-2)] text-[var(--muted-2)]'}`}>{kbd}</span>}
    </button>
  );
}
