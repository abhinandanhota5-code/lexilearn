# LexiLearn — Product Specification

## 1. Overview

LexiLearn is a local-first, offline-capable desktop application that provides a
personalized, dyslexia-friendly learning environment for children ages 4–18 with
dyslexia and language-based learning differences.

The application runs entirely on the user's computer. No learner data, educational
content, or behavioral information is ever sent to external servers.

## 2. Core Principles

1. **100% Local & Private** — All data stays on-device. No cloud sync, no telemetry
   uploads, no third-party data sharing.
2. **Not a Medical Device** — LexiLearn provides educational accommodations and
   learning observations. It does not diagnose, treat, or replace professional
   clinical evaluation.
3. **Parent-Controlled** — A 4-digit PIN gates all profile changes, settings
   adjustments, and document management. The learner cannot modify their own
   accommodations without adult verification.
4. **Accessible by Default** — Large touch targets, dyslexia-friendly typography
   (Lexend/OpenDyslexic), high-contrast themes, generous spacing, and optional
   reading aids are always available.
5. **Optional & Reversible** — Every accommodation, feature, and interaction can
   be enabled, disabled, or skipped without breaking the application.

## 3. Target Users

| Role | Description |
|------|-------------|
| **Parent / Guardian** | Sets up the learner profile, uploads educational documents, manages accommodations, reviews progress. |
| **Learner (Child)** | Uses the application for reading activities, screening quests, and adaptive learning. Interacts via the child-facing interface. |
| **Educator (Future)** | May review progress reports and adjust goals. Not in initial scope. |

## 4. Technology Stack

- **Desktop Framework:** Electron (Chromium-based)
- **Language:** JavaScript (ES Modules in main/renderer, CommonJS in preload)
- **LLM:** Ollama + llama3.1:8b-instruct-q4_K_M (local inference only)
- **Storage:** Local JSON files under Electron's `app.getPath('userData')`
- **Security:** `contextIsolation: true`, `nodeIntegration: false`, CSP headers, secure IPC bridge

---

## 5. Parent Flow (Phases 1–3)

### Phase 1 — Technical Foundation ✅
Electron shell, IPC bridge, LLM provider abstraction, local storage, design token system.

### Phase 2 — Parent Setup & Learner Profile ✅
PIN setup, medical disclaimer, learner basics (name, age, grade, avatar, theme,
accommodations), profile persistence, profile overview dashboard.

### Phase 3 — Document Ingestion & Parent Verification ✅
PDF/text upload, local AI extraction of documented accommodations, parent review
and confirmation, profile update with verified findings.

---

## 6. Child Flow (Phases 4–7)

### Phase 4 — Screening Quest
The learner's first interaction with the app. An age-appropriate sequence of
reading mini-tasks that establishes a baseline understanding of the learner's
current abilities.

**Key outcomes:**
- Child-facing UI distinct from the parent interface
- Interactive screening tasks (phoneme recognition, word decoding, sentence
  reading, syllable segmentation)
- Task results stored per-session in local JSON
- Baseline reading profile computed on quest completion
- Profile updated with screening status and results

**Key constraints:**
- Screening measures educational observations, NOT diagnoses.
- All scoring is deterministic and explainable. No LLM involvement in scoring.
- Architecture must be ready for the future Adaptive Learning Engine (Phase 6).

### Phase 5 — Companion System Foundation
A reusable, event-driven companion that reacts to learner actions across all
child-facing activities. See Section 7 for full specification.

### Phase 6 — Adaptive Learning Engine
AI-generated reading missions, personalized story content, and adaptive
difficulty based on screening results and ongoing performance. Companion
integrated into learning sessions.

### Phase 7 — Progress Dashboard & Parent Reporting
Parent-facing view of learner progress, session history, accommodation
effectiveness, and milestone tracking.

---

## 7. Companion System Specification

### 7.1 Purpose

The companion is an **interactive learning companion**, not a decorative avatar.
It provides contextual emotional support, encouragement, gentle scaffolding, and
help facilitation throughout the child's learning journey.

### 7.2 Architecture

The companion is a **reusable system service** that is completely independent
from individual activities. Activities emit semantic events; the companion
translates those events into bounded behaviors.

```
┌──────────────┐    events     ┌──────────────────┐    state     ┌──────────────┐
│   Activity   │ ────────────→ │  Companion Event  │ ──────────→ │  Companion   │
│  (screening, │              │      Bus          │             │  State       │
│   learning)  │              └──────────────────┘             │  Machine     │
└──────────────┘                                               └──────┬───────┘
                                                                      │ state
                                                                      ▼
                                                              ┌──────────────┐
                                                              │  Behaviors   │
                                                              │  (bounded    │
                                                              │   output)    │
                                                              └──────┬───────┘
                                                                      │
                                                                      ▼
                                                              ┌──────────────┐
                                                              │  Renderer    │
                                                              │  (avatar +   │
                                                              │   bubble)    │
                                                              └──────────────┘
```

**No activity implements its own companion logic.** The companion system is the
single source of truth for all companion behavior.

### 7.3 Event Interface

Activities emit these events via the companion event bus:

| Event | When Emitted | Companion Response |
|-------|-------------|-------------------|
| `activity_started` | Activity begins | → `listening` state |
| `answer_correct` | Learner answers correctly | → `encouraging` state |
| `answer_incorrect` | Learner answers incorrectly | → `helping` state |
| `learner_struggling` | Multiple incorrect attempts detected | → `helping` state |
| `help_requested` | Learner explicitly asks for help | → `helping` state |
| `hint_requested` | Learner asks for a hint | → `thinking` → `helping` |
| `milestone_reached` | Learner hits a progress milestone | → `celebrating` state |
| `activity_completed` | Activity finishes | → `encouraging` → `idle` |

### 7.4 Companion States

| State | Visual | Output | Duration |
|-------|--------|--------|----------|
| `idle` | Subtle breathing animation | None | Default / resting |
| `listening` | Eyes attentive, slight tilt | None | While activity is active |
| `thinking` | Brief "thinking" animation | Optional "Let me think..." | 1–2s max, then transition |
| `encouraging` | Warm expression, gentle bounce | Short positive message | 2–3s, then `idle` |
| `celebrating` | Celebration animation | Milestone acknowledgment | 3–4s, then `idle` |
| `helping` | Supportive expression | Hint at current difficulty level | Until learner responds |

### 7.5 Behavioral Rules (Application-Defined)

1. The companion **never** shames, criticizes, or pressures the learner.
2. The companion **never** pretends to know something the system does not know.
3. The companion **never** reveals answers directly; hints scaffold toward
   discovery.
4. The companion **never** decides its own state transitions — the state machine
   governs all transitions based on activity events.
5. All companion text is accessible and optional — the learner can dismiss or
   ignore it without penalty.
6. Companion interactions are **subtle** — no constant movement, no interruptions
   during active task engagement.

### 7.6 LLM Integration Boundary

- The LLM may generate age-appropriate **hint text** or **encouragement phrasing**
  when the companion enters `helping` or `encouraging` states.
- The LLM **never** decides which state to enter — that is always the state
  machine.
- LLM-generated text is **optional** — if the LLM is unavailable, the companion
  falls back to curated message pools.
- All LLM-generated companion text passes through a behavior filter that enforces
  length limits, tone checks, and forbidden content patterns.

### 7.7 File Locations

```
src/services/companion/            # Core service (event bus, state machine, behaviors)
src/renderer/components/companion/ # Renderer widget (avatar, bubble, animations)
```

---

## 8. Feedback & Haptics Specification

### 8.1 Purpose

Learners receive immediate, multi-modal feedback during activities: visual
(highlights, colors, animations), auditory (optional sound effects), and
haptic (device vibration, optional).

### 8.2 FeedbackManager

A centralized **FeedbackManager** handles all feedback coordination across
activities. Activities do not implement their own feedback logic.

```
Activity emits event
       ↓
FeedbackManager receives event
       ↓
  ┌────┼────────────────┐
  ↓    ↓                ↓
Visual  Companion     Haptics
Feedback Reaction    (optional)
```

### 8.3 Haptics Requirements

- Haptics are **optional** and **capability-detected** at startup.
- If the device does not support haptics (most desktops), the feature is
  silently disabled with no fallback warnings.
- Haptics are **never required** to understand or complete any activity.
- All feedback is also conveyed visually and/or through the companion, ensuring
  haptic-only information is never critical.
- Haptic patterns are lightweight: short pulses for correct answers, gentle
  double-taps for encouragement, no aggressive patterns.

### 8.4 Integration Timeline

- **Phase 4–5:** No haptics. Activities emit semantic events; FeedbackManager is
  designed but not implemented.
- **Child Interaction Polish Phase:** FeedbackManager implemented with visual
  feedback, companion integration, optional sound, and optional haptics.

---

## 9. Phase Overview

| Phase | Name | Status |
|-------|------|--------|
| 1 | Technical Foundation | ✅ Complete |
| 2 | Parent Setup & Learner Profile | ✅ Complete |
| 3 | Document Ingestion & Parent Verification | ✅ Complete |
| 4 | Screening Quest | 🔲 Next |
| 5 | Companion System Foundation | 🔲 Planned |
| 6 | Adaptive Learning Engine + Companion Integration | 🔲 Planned |
| 7 | Progress Dashboard & Parent Reporting | 🔲 Planned |
| 8 | Multi-Modal Assistance | 🔲 Planned |
| 9 | Feedback, Telemetry & Digest | 🔲 Planned |
