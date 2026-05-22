# HabitQuest

An AI-powered gamified habit journal. Type what you did (one thing or many), and **Sage** — your in-app AI — splits it, classifies it, scores it (positive XP / negative XP), reacts in character, and narrates the result out loud.

Built with React + Vite + TypeScript + Tailwind + Framer Motion + Zustand.

## Highlights

- **One input, AI does the rest.** Multi-entry journal: write *"went to gym, read 30 pages, then doom-scrolled tiktok 1h"* — Sage returns three independently scored entries with personality-rich quips.
- **No-cost AI.** Bring your own free OpenRouter key (or DeepSeek key) — the app auto-detects the provider and falls back through a list of `:free` models on rate-limit / 404. Without a key, an in-browser Transformers.js model (DistilBERT-MNLI, ~67MB, cached) handles classification. Heuristic always available as final fallback.
- **Real-life shop with AI pricing.** Buy *TV Pass*, *Cheat Meal*, *Lazy Morning* — or write your own indulgence ("Order McDonald's takeout") and Sage prices it. Logging via a pass costs zero XP and doesn't break combo: you pre-paid.
- **Sage learns from you.** A memory engine derives your top wins, recurring slips, peak hours, and consistency, and feeds that profile back into every AI call — so categorization, challenges, wisdom and quests all get more personal as you log.
- **Daily Boss.** Themed enemy each day (Sugar Witch, Doom-Scroll Hydra, Procrastination Demon, …). Positive entries deal damage. Defeating one drops a 24h **+10% XP Trophy buff**.
- **AI Daily Challenge** generated from your memory, with an optional **Risk-It Wager** — bet XP, win 2× if you complete the challenge by midnight.
- **AI Daily Quests** seeded by your recent entries — Sage proposes a follow-up that builds on what you just did.
- **Custom badges minted by Sage.** Every few entries, the AI scans your patterns and may mint a personalized achievement ("Crack-of-Dawn Cleric", "Triple Firsts") with a confetti reveal banner.
- **Combo system with milestone callouts:** TRIPLE -> MEGA -> ULTRA -> GODLIKE with on-screen banners and audio fanfares.
- **Loot drops** on positive entries: XP charms, Focus Tokens, Crit Strikes, Streak Freezes.
- **Voice narration.** Sage speaks each log via Web Speech API (toggleable, voice selectable).
- **Deep analytics tab:** 90-day heatmap, 7-day XP velocity, 30-day sentiment trend, 7x24 time-of-week grid, category donut, mood radar, win/slip ratio, comeback rate, average recovery time, category-XP breakdown, word clouds of your most-used positive vs negative words.
- **Daily check-in bonus**, **Boss Report** end-of-day summary (AI-written), **Level-up banner**, **Achievement reveal banner**, **Trophy chip with countdown**.
- **Keyboard shortcuts:** `1` / `2` / `3` switch tabs, `R` opens recap, `,` opens settings, `Esc` closes modals.

## Run locally

```bash
npm install
npm run dev
```

Optional - create `.env.local`:

```
VITE_OPENROUTER_KEY=sk-or-v1-...
```

Or paste a key inside the app via the gear icon. Without a key, the in-browser AI loads on first paint (~67MB one-time download).

## Stack

| Concern        | Library                                  |
| -------------- | ---------------------------------------- |
| UI             | React 18, Vite 5, Tailwind 3             |
| State          | Zustand (with `persist`)                 |
| Animation      | Framer Motion, canvas-confetti           |
| AI (cloud)     | OpenRouter free models, DeepSeek native  |
| AI (browser)   | `@huggingface/transformers` (ONNX/WASM)  |
| Voice          | Web Speech API                           |

## Project layout

```
src/
  App.tsx                 - tabbed shell (Journal / Analytics / Shop)
  store/useHabitStore.ts  - single Zustand store, persisted to localStorage
  lib/
    ai.ts                 - main analyze prompt + provider routing + model fallback chain
    aiMulti.ts            - multi-entry parser with lenient JSON parsing
    aiExtras.ts           - custom item pricing, daily challenge, wisdom
    aiQuests.ts           - quest generation from recent entries
    aiBadges.ts           - custom badge minting
    aiSuggest.ts          - entry suggestions chip
    localAI.ts            - Transformers.js zero-shot classifier
    heuristic.ts          - rule-based fallback analyzer
    quips.ts              - curated quip pool with anti-repeat
    memory.ts             - user profile derivation
    categories.ts         - taxonomy (7 parents, 23 sub-categories)
    gamification.ts       - XP curve, badges, quest definitions
    boss.ts               - daily boss roster + damage math
    loot.ts               - loot drop tables
    shop.ts               - pass + power-up catalog
    tts.ts                - Web Speech wrapper
  components/             - one file per UI block
```

## License

MIT.
