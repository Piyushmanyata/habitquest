// Category taxonomy: parent -> children + keywords used by the rule-based classifier.
// Used as both the source of truth for UI and a fast fallback when no AI is configured.

export type SubCategory = {
  id: string;
  name: string;
  emoji: string;
  keywords: string[];
};

export type ParentCategory = {
  id: string;
  name: string;
  emoji: string;
  color: string; // tailwind gradient classes
  ring: string;
  subs: SubCategory[];
};

export const CATEGORIES: ParentCategory[] = [
  {
    id: 'health',
    name: 'Health & Body',
    emoji: '💪',
    color: 'from-rose-500 to-orange-400',
    ring: 'ring-rose-400/40',
    subs: [
      { id: 'fitness',   name: 'Fitness',   emoji: '🏋️', keywords: ['gym','workout','exercise','lift','lifted','run','ran','running','jog','jogged','cardio','pushup','push-up','squat','yoga','pilates','swim','swam','cycle','cycled','bike','biked','walk','walked','steps','stretch','stretched','hike','hiked','5k','5km','10k'] },
      { id: 'nutrition', name: 'Nutrition', emoji: '🥗', keywords: ['eat','meal','diet','vegetable','fruit','protein','salad','cook','calorie','sugar','no sugar','fast','intermittent','breakfast','lunch','dinner','snack'] },
      { id: 'hydration', name: 'Hydration', emoji: '💧', keywords: ['water','hydrate','drink water','glass of water','liters','litres'] },
      { id: 'sleep',     name: 'Sleep',     emoji: '😴', keywords: ['sleep','bed','bedtime','wake','wake up','nap','rest','8 hours','early'] },
    ],
  },
  {
    id: 'mind',
    name: 'Mind & Wellbeing',
    emoji: '🧘',
    color: 'from-violet-500 to-fuchsia-500',
    ring: 'ring-violet-400/40',
    subs: [
      { id: 'meditation', name: 'Meditation', emoji: '🧘', keywords: ['meditate','meditation','mindful','mindfulness','breath','breathwork','breathe'] },
      { id: 'journaling', name: 'Journaling', emoji: '📓', keywords: ['journal','diary','write','reflect','reflection','gratitude','morning pages'] },
      { id: 'therapy',    name: 'Mental Care', emoji: '🫶', keywords: ['therapy','therapist','mood','feelings','self care','self-care','affirm'] },
    ],
  },
  {
    id: 'mastery',
    name: 'Learning & Mastery',
    emoji: '🧠',
    color: 'from-cyan-500 to-blue-500',
    ring: 'ring-cyan-400/40',
    subs: [
      { id: 'reading',   name: 'Reading',     emoji: '📚', keywords: ['read','book','reading','chapter','pages','kindle','article'] },
      { id: 'study',     name: 'Study',       emoji: '🎓', keywords: ['study','class','homework','course','lecture','flashcard','anki','language','duolingo','learn'] },
      { id: 'practice',  name: 'Skill Practice', emoji: '🎯', keywords: ['practice','guitar','piano','draw','drawing','paint','sketch','code','coding','program','leetcode','chess'] },
    ],
  },
  {
    id: 'work',
    name: 'Work & Money',
    emoji: '💼',
    color: 'from-amber-500 to-yellow-400',
    ring: 'ring-amber-400/40',
    subs: [
      { id: 'deepwork', name: 'Deep Work',  emoji: '⏱️', keywords: ['deep work','focus','pomodoro','no phone','no distraction','ship','build','work block'] },
      { id: 'admin',    name: 'Admin',      emoji: '📥', keywords: ['inbox','email','admin','schedule','plan day','review','timesheet'] },
      { id: 'finance',  name: 'Finance',    emoji: '💰', keywords: ['budget','save','invest','expense','track money','no spend','bills'] },
    ],
  },
  {
    id: 'social',
    name: 'Relationships',
    emoji: '❤️',
    color: 'from-pink-500 to-rose-400',
    ring: 'ring-pink-400/40',
    subs: [
      { id: 'family',  name: 'Family',  emoji: '👨‍👩‍👧', keywords: ['call mom','call dad','family','parents','sibling','kids','partner','spouse','wife','husband'] },
      { id: 'friends', name: 'Friends', emoji: '🤝', keywords: ['friend','meet','hangout','catch up','text friend','social'] },
      { id: 'kindness',name: 'Kindness',emoji: '🌷', keywords: ['compliment','help','volunteer','give','thank','gratitude note'] },
    ],
  },
  {
    id: 'creative',
    name: 'Creative & Hobby',
    emoji: '🎨',
    color: 'from-emerald-500 to-teal-400',
    ring: 'ring-emerald-400/40',
    subs: [
      { id: 'create',  name: 'Make Things', emoji: '🛠️', keywords: ['build','make','create','craft','project','side project','design'] },
      { id: 'music',   name: 'Music',       emoji: '🎵', keywords: ['music','listen','album','song','sing'] },
      { id: 'outdoor', name: 'Outdoor',     emoji: '🌳', keywords: ['outside','nature','park','garden','sun','sunlight','sunshine'] },
    ],
  },
  {
    id: 'breaking',
    name: 'Breaking Bad Habits',
    emoji: '🛑',
    color: 'from-slate-500 to-zinc-400',
    ring: 'ring-slate-300/30',
    subs: [
      { id: 'screen',   name: 'Less Screens', emoji: '📵', keywords: ['no phone','screen time','no social','no scroll','no tiktok','no instagram','no twitter','no youtube'] },
      { id: 'substance',name: 'Sobriety',     emoji: '🚭', keywords: ['no alcohol','no drink','no smoke','no vape','no weed','no caffeine','no porn','nofap'] },
      { id: 'junk',     name: 'No Junk',      emoji: '🍩', keywords: ['no sugar','no junk','no soda','no fast food','no snack'] },
    ],
  },
];

export const CAT_BY_ID: Record<string, ParentCategory> = Object.fromEntries(
  CATEGORIES.map(c => [c.id, c])
);

export function findSub(parentId: string, subId: string): SubCategory | undefined {
  return CAT_BY_ID[parentId]?.subs.find(s => s.id === subId);
}
