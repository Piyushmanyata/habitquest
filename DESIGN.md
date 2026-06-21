# HabitQuest Design System

Design language:
- Arcade-fantasy HUD.
- Dark surfaces with clear hierarchy.
- Strong rarity, XP, gold, boss, loot, and danger cues.
- Game-native labels: realms, encounters, quest board, armory, codex, campfire.

Tokens:
- `--surface`, `--surface-2`, `--surface-3`
- `--xp`, `--gold`, `--loot`, `--boss`, `--focus`, `--slip`
- `--rarity-common`, `--rarity-rare`, `--rarity-epic`, `--rarity-legendary`, `--rarity-mythic`
- `--z-overlay`, `--z-modal`, `--z-toast`, `--z-fx`
- `--motion-fast`, `--motion-normal`, `--motion-slow`

Behavior:
- Use motion for reward moments, not constant decoration.
- Respect `prefers-reduced-motion`.
- Keep primary actions visible on mobile.
- Prefer solid text labels over gradient headlines.
- Make empty states feel intentional and game-like.
