# LexiLearn

A **local-first, offline-capable** learning companion for children with dyslexia. LexiLearn runs as a desktop app (Electron) with no accounts, no cloud services, and no learner data leaving the device.

The child picks a companion — a racing car, a dinosaur, or an ocean friend — goes on short daily "missions" of reading activities, and gets a reading experience tuned to how *they* read best.

## What it does

### For the learner
- **Guided onboarding** — name, grade, and a companion to learn with; a short, game-like screening quest (phoneme/decoding tasks) calibrates where activities should start.
- **Daily missions** — a small, bounded set of activities (word building, syllable clapping, sentence clues, CVC decoding…), served from a curated deterministic pipeline. The child sees adventure language, never scores or mastery numbers.
- **A companion that reacts** — the docked/hero companion celebrates correct answers, encourages after misses, and chats through an "I don't understand" help panel with picture-card options (show me, tell me, break it down, funny example…).
- **Stickers & scrapbook** — original SVG companion stickers decorate every screen and a scrapbook the child can arrange.

### Reading accessibility (built for dyslexic readers)
- **Reading Comfort panel (🛋️ Comfy)** on every activity screen: text size, letter / word / line spacing, dyslexia-friendly font choice, and four color themes (warm cream, light, dark, high-contrast).
- **Live and persistent** — every change applies instantly across questions, prompts and passages, and is saved to the local profile. "Start over" restores defaults.
- **Read-aloud** — prompts and questions can be spoken using the browser's built-in local speech synthesis (no cloud TTS), with narration speed as a preference.
- Accessibility preferences (ruler, syllable coloring, line focus) are stored per learner and applied as CSS custom properties / data attributes.

### For parents
- **Profile overview** with the learner's companion, preferences, and school-material status.
- **Parent dashboard** — activity history and reading-progress charts (rendered locally with Chart.js), settings tiles, and a clear distinction between real learner data and demo data.
- **PIN-protected settings** — changes to the learner profile require adult verification.

## Privacy

- 100% local-first: profiles, progress, and settings live in the app's user-data directory on this machine.
- No cloud APIs, no telemetry, no paid services, no new dependencies for AI.
- An *optional* local LLM integration (Ollama on `127.0.0.1`) exists behind a feature flag and is **off by default**; the app is fully functional without it.

## Tech stack

| Layer | Choice |
|---|---|
| Shell | Electron 44 (ES modules, strict CSP `script-src 'self'`) |
| UI | Vanilla JS render functions + CSS custom properties (theming, accessibility) |
| IPC | `preload.cjs` contextBridge → typed channels in `src/shared/ipc-channels.js` |
| Storage | Atomic JSON writes to the OS user-data dir (`src/services/storage/`) |
| Charts | Chart.js (local UMD bundle, no CDN at runtime) |
| Tests | Vitest + happy-dom |

## Getting started

```bash
npm install
npm start        # launches the desktop app
npm test         # runs the vitest suite
```

Requires Node 18+ and npm. No API keys, no accounts, works offline.

## Project layout

```
main.js                 Electron main process (IPC handlers, services)
preload.cjs             contextBridge surface (window.electronAPI)
src/
  shared/               profile schema, IPC channels — single source of truth
  services/             storage, learning flow, companion state machine, audio, local AI
  renderer/
    app.js              screen router / navigation
    screens/            learner/ and parent/ screens
    components/         companion widget, stickers, help panel, reading comfort
    services/           presentation settings (accommodations → CSS)
    styles/             design tokens, learner & parent themes, reading comfort
```

## Status & known limits

- Implemented and verified in the running app: onboarding + screening, mission flow, help panel, companion reactions, stickers, reading comfort panel with persistence, parent dashboard with demo-data labeling.
- In progress: immersive focus-reading mode, sentence-level read-aloud highlighting, tap-to-define dictionary, reading-practice tracking.
- LexiLearn does **not** diagnose dyslexia and makes no claims about improving reading ability — it is a practice tool with adjustable presentation.

## License

ISC
