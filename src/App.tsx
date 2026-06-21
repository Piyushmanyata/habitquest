import { Suspense, lazy, useEffect, useState } from 'react';
import TopBar from './components/TopBar';
import JournalInput from './components/JournalInput';
import Quests from './components/Quests';
import Stats from './components/Stats';
import XpToast from './components/XpToast';
import ScreenFx from './components/ScreenFx';
import Boss from './components/Boss';
import LootToast from './components/LootToast';
import AiStatus from './components/AiStatus';
import LevelUpBanner from './components/LevelUpBanner';
import PassBar from './components/PassBar';
import MemoryCard from './components/MemoryCard';
import CheckinBanner from './components/CheckinBanner';
import AiChallengeCard from './components/AiChallengeCard';
import WisdomPanel from './components/WisdomPanel';
import AchievementReveal from './components/AchievementReveal';
import TrophyChip from './components/TrophyChip';
import ComboCallout from './components/ComboCallout';
import StreakCalendar from './components/StreakCalendar';
import CoachChat from './components/CoachChat';
import BadgesPanel from './components/BadgesPanel';
import AmbientParticles from './components/AmbientParticles';
import FloatingNumbers from './components/FloatingNumbers';
import Character from './components/Character';
import Armory from './components/Armory';
import Section from './components/Section';
import StreakSliders from './components/StreakSliders';
import { useHabitStore } from './store/useHabitStore';

const Settings = lazy(() => import('./components/Settings'));
const DailyRecap = lazy(() => import('./components/DailyRecap'));
const Analytics = lazy(() => import('./components/Analytics'));
const Shop = lazy(() => import('./components/Shop'));
const Logs = lazy(() => import('./components/Logs'));
const MoodPanelLazy = lazy(() => import('./components/MoodPanel'));

type Tab = 'home' | 'logs' | 'analytics' | 'mood' | 'shop';

const ANCHORS: Record<string, string> = {
  hero: 'hero',
  journal: 'journal',
  battle: 'battle',
  insight: 'insight',
  armory: 'armory',
  chat: 'chat',
};

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const refresh = useHabitStore(s => s.refreshQuests);

  useEffect(() => { refresh(); }, [refresh]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') { setSettingsOpen(false); setRecapOpen(false); return; }
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === '1') setTab('home');
        if (e.key === '2') setTab('logs');
        if (e.key === '3') setTab('analytics');
        if (e.key === '4') setTab('mood');
        if (e.key === '5') setTab('shop');
        if (e.key === 'r' || e.key === 'R') setRecapOpen(true);
        if (e.key === ',' ) setSettingsOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function scrollToAnchor(name: string) {
    const el = document.getElementById(ANCHORS[name]);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="min-h-screen px-5 md:px-6 py-5 md:py-7 max-w-7xl mx-auto">
      <TopBar onOpenSettings={() => setSettingsOpen(true)} onOpenRecap={() => setRecapOpen(true)} />

      <div className="flex items-center gap-1 mb-5 flex-wrap pb-1 max-w-full">
        <TabBtn name="home"      active={tab === 'home'}      onClick={() => setTab('home')}      kbd="1" />
        <TabBtn name="logs"      active={tab === 'logs'}      onClick={() => setTab('logs')}      kbd="2" />
        <TabBtn name="codex"     active={tab === 'analytics'} onClick={() => setTab('analytics')} kbd="3" />
        <TabBtn name="mood"      active={tab === 'mood'}      onClick={() => setTab('mood')}      kbd="4" />
        <TabBtn name="shop"      active={tab === 'shop'}      onClick={() => setTab('shop')}      kbd="5" />
        <TrophyChip />
        <div className="ml-auto"><AiStatus /></div>
      </div>

      <CheckinBanner />

      {tab === 'home' && (
        <div className="space-y-6">
          {/* Quick-jump nav inside home page */}
          <div className="flex flex-wrap gap-1.5 text-[11px] mono uppercase tracking-wider">
            <JumpChip onClick={() => scrollToAnchor('hero')}    label="hero forge"    accent="purple" />
            <JumpChip onClick={() => scrollToAnchor('journal')} label="journal"        accent="lime" />
            <JumpChip onClick={() => scrollToAnchor('battle')}  label="boss encounter" accent="warm" />
            <JumpChip onClick={() => scrollToAnchor('insight')} label="codex"          accent="info" />
            <JumpChip onClick={() => scrollToAnchor('armory')}  label="armory"         accent="purple" />
            <JumpChip onClick={() => scrollToAnchor('chat')}    label="campfire"       accent="info" />
          </div>

          {/* ═══ HERO ═══ */}
          <Section
            id="hero" theme="hero"
            eyebrow="realm i · hero forge" title="Hero Forge"
            subtitle="Equip gear, watch every streak band, and pressure today's boss."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Character />
              <StreakCalendar />
              <Boss />
            </div>
            <div className="mt-4">
              <StreakSliders />
            </div>
          </Section>

          {/* ═══ JOURNAL — collapsible ═══ */}
          <Section
            id="journal" theme="journal"
            eyebrow="realm ii · journal command" title="Journal"
            subtitle="Write what you did. Past entries live in the Logs tab by category or date."
            collapsible defaultOpen
          >
            <div className="space-y-4">
              <PassBar />
              <JournalInput />
              <JumpToLogs onClick={() => setTab('logs')} />
            </div>
          </Section>

          {/* ═══ BATTLE ═══ */}
          <Section
            id="battle" theme="battle"
            eyebrow="realm iii · encounter board" title="Quest Board"
            subtitle="Daily challenge from Sage and rolling quests that refresh as you claim them."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AiChallengeCard />
              <Quests />
            </div>
          </Section>

          {/* ═══ INSIGHT ═══ */}
          <Section
            id="insight" theme="insight"
            eyebrow="realm iv · codex" title="Codex"
            subtitle="The patterns Sage has learned about you and every badge you've banked."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MemoryCard />
              <WisdomPanel />
              <Stats />
            </div>
            <div className="mt-4">
              <BadgesPanel />
            </div>
          </Section>

          {/* ═══ ARMORY ═══ */}
          <Section
            id="armory" theme="armory"
            eyebrow="realm v · armory" title="The Armory"
            subtitle="Trade XP for permanent gear. Bonuses stack and apply to every positive entry."
          >
            <Armory />
          </Section>

          {/* ═══ CHAT WITH SAGE — full width, prominent ═══ */}
          <Section
            id="chat" theme="chat"
            eyebrow="campfire · sage" title="Campfire"
            subtitle="Ask anything. Sage remembers your patterns and replies in your chosen tone."
          >
            <CoachChat />
          </Section>
        </div>
      )}

      <Suspense fallback={<LazyPanel label="Loading panel…" />}>
        {tab === 'logs'      && <Logs />}
        {tab === 'analytics' && <Analytics />}
        {tab === 'mood'      && <MoodPanelLazy />}
        {tab === 'shop'      && <Shop />}

        <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <DailyRecap open={recapOpen} onClose={() => setRecapOpen(false)} />
      </Suspense>
      <AmbientParticles />
      <ScreenFx />
      <XpToast />
      <LootToast />
      <LevelUpBanner />
      <AchievementReveal />
      <ComboCallout />
      <FloatingNumbers />
    </div>
  );
}

function TabBtn({ name, active, onClick, kbd }: { name: string; active: boolean; onClick: () => void; kbd?: string }) {
  return (
    <button
      onClick={onClick}
      title={kbd ? `Press ${kbd}` : undefined}
      className={`px-3 py-1.5 rounded-md text-[12px] font-medium uppercase tracking-wider transition flex items-center gap-1.5 whitespace-nowrap flex-shrink-0
        ${active ? 'bg-[var(--accent)] text-[#0a0a0b]' : 'text-[var(--muted)] hover:text-[var(--fg)] hover:bg-white/5'}`}
    >
      {name}
      {kbd && <span className={`mono text-[9px] px-1 py-0.5 rounded border ${active ? 'border-[#0a0a0b]/40 text-[#0a0a0b]/70' : 'border-[var(--line-2)] text-[var(--muted-2)]'}`}>{kbd}</span>}
    </button>
  );
}

function JumpToLogs({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full surface-soft p-3 flex items-center gap-3 hover:bg-white/[0.03] transition group text-left"
    >
      <div className="w-9 h-9 rounded-md bg-[var(--panel-2)] grid place-items-center text-base border hairline-2">
        📜
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-medium text-[var(--fg)]">See all past entries</div>
        <div className="text-[10.5px] text-[var(--muted-2)] mono uppercase tracking-wider">
          jump to logs · view by category or by date
        </div>
      </div>
      <span className="text-[var(--muted-2)] group-hover:text-[var(--accent)] transition mono text-xs">→</span>
    </button>
  );
}

function JumpChip({ label, accent, onClick }: { label: string; accent: 'lime' | 'warm' | 'info' | 'purple'; onClick: () => void }) {
  const cls = accent === 'lime'   ? 'text-[var(--accent)] border-[rgba(194,245,74,0.4)]'
            : accent === 'warm'   ? 'text-amber-300 border-amber-300/40'
            : accent === 'info'   ? 'text-sky-300 border-sky-300/40'
            : 'text-purple-300 border-purple-300/40';
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full border bg-transparent hover:bg-white/[0.03] transition whitespace-nowrap ${cls}`}
    >
      ↓ {label}
    </button>
  );
}

function LazyPanel({ label }: { label: string }) {
  return (
    <div className="surface p-4 text-sm text-[var(--muted)] mono uppercase tracking-wider">
      {label}
    </div>
  );
}
