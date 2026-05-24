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
import Logs from './components/Logs';
import StreakCalendar from './components/StreakCalendar';
import CoachChat from './components/CoachChat';
import MoodPanel from './components/MoodPanel';
import BadgesPanel from './components/BadgesPanel';
import AmbientParticles from './components/AmbientParticles';
import FloatingNumbers from './components/FloatingNumbers';
import Character from './components/Character';
import Armory from './components/Armory';
import Section from './components/Section';
import StreakSliders from './components/StreakSliders';
import { useHabitStore } from './store/useHabitStore';

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

      <div className="flex items-center gap-1 mb-5 flex-wrap">
        <TabBtn name="home"      active={tab === 'home'}      onClick={() => setTab('home')}      kbd="1" />
        <TabBtn name="logs"      active={tab === 'logs'}      onClick={() => setTab('logs')}      kbd="2" />
        <TabBtn name="analytics" active={tab === 'analytics'} onClick={() => setTab('analytics')} kbd="3" />
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
            <JumpChip onClick={() => scrollToAnchor('hero')}    label="hero"    accent="purple" />
            <JumpChip onClick={() => scrollToAnchor('journal')} label="journal" accent="lime" />
            <JumpChip onClick={() => scrollToAnchor('battle')}  label="battle"  accent="warm" />
            <JumpChip onClick={() => scrollToAnchor('insight')} label="insight" accent="info" />
            <JumpChip onClick={() => scrollToAnchor('armory')}  label="armory"  accent="purple" />
            <JumpChip onClick={() => scrollToAnchor('chat')}    label="sage"    accent="info" />
          </div>

          {/* ═══ HERO ═══ */}
          <Section
            id="hero" theme="hero"
            eyebrow="01 · your hero" title="Character & Streaks"
            subtitle="Equip gear, watch every time-window streak, and aim at today's boss."
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
            eyebrow="02 · log the day" title="Journal"
            subtitle="Write what you did, how you felt, what you thought. Sage scores it."
            collapsible defaultOpen
          >
            <div className="space-y-4">
              <PassBar />
              <JournalInput />
              <Timeline />
            </div>
          </Section>

          {/* ═══ BATTLE ═══ */}
          <Section
            id="battle" theme="battle"
            eyebrow="03 · today's fight" title="Challenge & Quests"
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
            eyebrow="04 · what sage sees" title="Memory, Wisdom & Badges"
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
            eyebrow="05 · gear up" title="The Armory"
            subtitle="Trade XP for permanent gear. Bonuses stack and apply to every positive entry."
          >
            <Armory />
          </Section>

          {/* ═══ CHAT WITH SAGE — full width, prominent ═══ */}
          <Section
            id="chat" theme="chat"
            eyebrow="06 · talk to sage" title="Coach Conversation"
            subtitle="Ask anything. Sage remembers your patterns and replies in your chosen tone."
          >
            <CoachChat />
          </Section>
        </div>
      )}

      {tab === 'logs'      && <Logs />}
      {tab === 'analytics' && <Analytics />}
      {tab === 'mood'      && <MoodPanel />}
      {tab === 'shop'      && <Shop />}

      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <DailyRecap open={recapOpen} onClose={() => setRecapOpen(false)} />
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
      className={`px-3 py-1.5 rounded-md text-[12px] font-medium uppercase tracking-wider transition flex items-center gap-1.5
        ${active ? 'bg-[var(--accent)] text-[#0a0a0b]' : 'text-[var(--muted)] hover:text-[var(--fg)] hover:bg-white/5'}`}
    >
      {name}
      {kbd && <span className={`mono text-[9px] px-1 py-0.5 rounded border ${active ? 'border-[#0a0a0b]/40 text-[#0a0a0b]/70' : 'border-[var(--line-2)] text-[var(--muted-2)]'}`}>{kbd}</span>}
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
      className={`px-2.5 py-1 rounded-full border bg-transparent hover:bg-white/[0.03] transition ${cls}`}
    >
      ↓ {label}
    </button>
  );
}
