# LexiLearn Baseline Inspection Report

**Date:** October 25, 2026  
**Project:** /Users/abhinandan/Developers Peeve/dyslexia-app  
**Status:** ✅ App running successfully (Electron processes confirmed)

---

## 1. Project Structure Overview

```
/Users/abhinandan/Developers Peeve/dyslexia-app/
├── main.js                      # Electron main process (1,000+ lines)
├── preload.cjs                  # Preload script (CommonJS)
├── package.json                 # "start": "electron ."
├── index.html                   # Entry HTML
├── src/
│   ├── renderer/
│   │   ├── app.js               # Root app controller (1,200+ lines)
│   │   ├── screens/
│   │   │   ├── learner/         # 18 learner-facing screens
│   │   │   └── parent/          # 7 parent-facing screens
│   │   ├── components/
│   │   │   ├── companion/       # Companion widget
│   │   │   └── learning/        # Help panel
│   │   └── styles/              # CSS tokens + learner/parent/learning
│   ├── services/
│   │   ├── learning/            # ALE, activity registry, flow, contracts
│   │   ├── screening/           # Quest engine, task templates
│   │   ├── adaptive/            # Adaptive engine, config, preference model
│   │   ├── companion/           # State machine, behaviors, event bus
│   │   ├── world/               # World state, themes, decorations
│   │   ├── audio/               # TTS service (Web Speech API)
│   │   ├── ai/                  # Ollama provider, LLM services
│   │   ├── curriculum/          # Registry, grade difficulty, fixtures
│   │   ├── document/            # Ingestion pipeline, extraction
│   │   ├── storage/             # Profile, screening, learning stores
│   │   └── auth/                # PIN service
│   └── shared/                  # Profile schema, IPC channels
```

---

## 2. Current Implementation Status

### ✅ Phase 0 — Working Baseline (COMPLETE)
- **Electron app launches** — Main + renderer processes confirmed running
- **Profile system** — `ProfileStore`, `buildCanonicalProfile`, validation
- **Screening Quest** — 6 categories, 15 tasks, adaptive difficulty, deterministic grading
- **Adaptive Learning Engine (ALE)** — Local-first, deterministic, tracks skills/confidence
- **Activity Registry** — 4 activity types (sentence_mc, sound_detect, word_build, syllable_split)
- **Companion System** — State machine, event-driven, deterministic behaviors
- **My World** — 5 themes (dinosaur, racing, ocean, space, fantasy), decorations, placement
- **Parent Dashboard** — Profile view, progress, accessibility settings
- **TTS Service** — Web Speech API with rate control, replay, stop
- **AI Integration** — Ollama local provider (llama3.1:8b), health checks, timeouts

### 🔄 Phase 1 — Cohesive Child Experience (PARTIAL)
| Feature | Status | Notes |
|---------|--------|-------|
| Large, readable questions | ✅ | 28-30px in task screens |
| Consistent button alignment | ⚠️ | CSS needs standardization |
| Delightful transitions | ✅ | Spring animations in CSS |
| Missions, XP, achievements | ⚠️ | Basic progress only |
| Friendly companion | ✅ | 6 avatars with personalities |
| Reduced-motion support | ✅ | CSS `@media (prefers-reduced-motion)` |
| Original illustrations | ❌ | Only emoji placeholders |

### 🔄 Phase 2 — Interactive Learning Activities (PARTIAL)
| Activity Type | Implemented | Grading | Notes |
|--------------|-------------|---------|-------|
| Multiple-choice (sentence_mc) | ✅ | Deterministic | `judgeSelection` in activity-contract |
| True/false | ❌ | — | Not in `VALID_ACTIVITY_TYPES` |
| Fill in the blanks | ❌ | — | Not implemented |
| Word ordering | ❌ | — | Not implemented |
| Matching exercises | ❌ | — | Not implemented |
| Spelling/phonics | ✅ | Deterministic | `sound_detect` activity |
| Reading comprehension | ⚠️ | Deterministic | Limited to sentence_mc |
| Math/visual problem-solving | ✅ | Deterministic | `add_single_digits` bank |

**Activity Variations:** ⚠️ **BLOCKER** — Curated banks are small (3-6 items per objective). Need meaningful variation generation.

### 🔄 Phase 3 — Adaptive Learning Engine (IMPLEMENTED, NEEDS INTEGRATION)
- ✅ `AdaptiveLearningEngine` class with deterministic algorithms
- ✅ Skill tracking: accuracy, help usage, response time, confidence
- ✅ Difficulty recommendation (1-3 levels)
- ✅ Alternative explanations
- ⚠️ **Not fully wired** — `learning-flow.js` has ALE integration but needs verification
- ⚠️ Parent review of progress — not implemented

### 🔄 Phase 4 — Audio & Reading Support (PARTIAL)
| Feature | Status | Notes |
|---------|--------|-------|
| Questions read aloud | ✅ | `WebSpeechTTSService.speak()` |
| Instructions read aloud | ✅ | Same service |
| Reading passages | ⚠️ | Only activity prompt text |
| Answer feedback | ❌ | No audio for feedback |
| Explanations | ❌ | No audio for help panel |
| Listen/replay/stop controls | ✅ | UI buttons in activity screen |
| Adjustable speech rate | ✅ | From `accommodations.audioNarrationSpeed` |
| Sentence-by-sentence | ❌ | Single utterance only |
| Word highlighting | ❌ | Not implemented |
| No overlapping speech | ✅ | `cancel()` before new `speak()` |

### 🔄 Phase 5 — My World, Themes, Rewards (PARTIAL)
| Feature | Status | Notes |
|---------|--------|-------|
| 5 themes implemented | ✅ | dinosaur, racing, ocean, space, fantasy |
| Theme persistence | ✅ | In `WorldState` |
| Sticker collection | ⚠️ | Screen exists, needs integration |
| Rewards tied to achievements | ✅ | `checkAchievementCriteria()` |
| Collectible companions | ⚠️ | 6 avatars, selection screen exists |
| My World screen | ✅ | `renderMyWorldScreen()` |
| Decoration placement | ✅ | `placeDecoration(x, y)` |
| Persistent world layouts | ✅ | Serialized in profile |

**Missing:** Pink Glam, Rainbow World themes from spec

### 🔄 Phase 6 — Parent Dashboard (PARTIAL)
| Feature | Status | Notes |
|---------|--------|-------|
| Learner profiles | ✅ | `ProfileStore`, multiple profiles |
| Grade/subject prefs | ✅ | In profile schema |
| Lesson history | ❌ | Not displayed |
| Topic-level progress | ❌ | Not displayed |
| Strengths/revision areas | ❌ | Not displayed |
| Audio/accessibility settings | ✅ | `accessibility-settings-screen.js` |
| Theme/reward visibility | ✅ | Shows current theme |
| Schoolwork import | ❌ | Document ingestion exists, not in dashboard |
| Local data management | ⚠️ | Profile reset exists |

### 🔄 Phase 7 — Schoolwork Import & AI Practice (PARTIAL)
| Step | Status | Notes |
|------|--------|-------|
| 1. Import document | ✅ | `DOCUMENT_OPEN` IPC, file dialog |
| 2. Extract text | ✅ | `DocumentIngestionPipeline` (PDF, text, images) |
| 3. Display for review | ✅ | `renderReviewConfirmScreen` |
| 4. Adult correct/approve | ✅ | `DOCUMENT_CONFIRM` IPC |
| 5. Organize by grade/subject | ⚠️ | Curriculum registry has structure |
| 6. Generate practice | ⚠️ | AI service exists, needs wiring |
| 7. Record performance | ✅ | Learning flow records outcomes |
| 8. Inform revision | ✅ | ALE uses history |

### ⏭️ Phase 8 — Cloud AI (SKIPPED per user request)

---

## 3. Key Technical Findings

### Architecture Strengths
1. **Clean separation** — Main process (IPC, stores, ALE) vs Renderer (UI only)
2. **Deterministic grading** — No LLM in correctness path (`judgeSelection`, `validateTaskSubmission`)
3. **Type-safe IPC** — `preload.cjs` exposes typed `electronAPI`
4. **Comprehensive testing** — Vitest with happy-dom, 14 test files
5. **Privacy-first** — Local Ollama, no external AI required for core features

### Critical Gaps

#### 🔴 BLOCKER #1: Activity Content Variation (Phase 2)
**Location:** `src/services/learning/activity-registry.js`  
**Issue:** Curated banks have only 3-6 items per objective. Children see repeated questions.
```javascript
// Current: SENTENCE_MC_BANK.add_single_digits has only 4 items
// Needed: Generate meaningful variations programmatically or via AI
```
**Impact:** Poor engagement, memorization instead of learning

#### 🔴 BLOCKER #2: Audio Feedback Missing (Phase 4)
**Location:** `src/renderer/screens/learner/learning-activity-screen.js`  
**Issue:** No TTS for feedback messages, explanations, or help content
```javascript
// FEEDBACK_COPY strings are never spoken
// Help panel content not accessible via audio
```

#### 🔴 BLOCKER #3: Parent Dashboard Analytics (Phase 6)
**Location:** `src/renderer/screens/parent/parent-dashboard-screen.js`  
**Issue:** Shows only basic stats (activities % 100, streak). No topic breakdown, no strengths/weaknesses.

#### 🟡 GAP: Missing Activity Types (Phase 2)
**Location:** `src/services/learning/activity-contract.js` `VALID_ACTIVITY_TYPES`
**Missing:** `true_false`, `fill_blank`, `word_order`, `matching`

#### 🟡 GAP: Theme Completeness (Phase 5)
**Missing themes from spec:** `pink-glam`, `rainbow-world`

#### 🟡 GAP: Word Highlighting Sync (Phase 4)
**Technical challenge:** Web Speech API doesn't provide word boundaries natively

---

## 4. Highest-Priority Blocker

### 🚨 **P0: Activity Content Variation (Phase 2)**

**Why this is P0:**
- Core learning loop is broken if children memorize answers
- ALE can't adapt meaningfully without fresh content
- All downstream features (rewards, progress, parent dashboard) depend on genuine learning activity
- This is the **single feature** that makes the app "educational" vs "flashcard repeater"

**Files to modify:**
1. `src/services/learning/activity-registry.js` — Expand banks OR add variation generator
2. `src/services/ai/generated-activity-service.js` — Use for variation generation (already exists!)
3. `src/services/learning/learning-flow.js` — Ensure ALE requests varied content

**Approach:**
```javascript
// Option A: Programmatic variation (deterministic, no AI)
function generateMathVariations(baseItem, count) { ... }

// Option B: AI-generated variations (existing service)
const variation = await generateGroundedQuestion({ objectiveId, difficulty, count: 5 })

// Option C: Hybrid — deterministic base + AI for explanations/hints
```

**Verification:** Launch app → Start learning → Complete 10+ activities → No exact repeat questions

---

## 5. Next Steps — Phase 1 Execution Plan

### Week 1: Fix P0 Blocker
1. **Audit activity banks** — Count items per objective in `activity-registry.js`
2. **Implement variation generator** — Use `generateGroundedQuestion` (already wired) or deterministic generator
3. **Wire into learning flow** — `getMission` → `buildActivitySpec` → request variations
4. **Test:** Run 20 activities, verify <10% exact repeats

### Week 2: Audio Feedback (P1)
1. Add TTS for `FEEDBACK_COPY` in `learning-activity-screen.js`
2. Add TTS for help panel content
3. Implement sentence-by-sentence with word boundary estimation

### Week 3: Parent Dashboard Analytics (P2)
1. Add topic-level progress from `adaptiveLearning.skills`
2. Show strengths (≥80% accuracy) vs revision (<60%)
3. Add lesson history timeline

### Week 4: Missing Activity Types + Themes (P3)
1. Add `true_false`, `fill_blank`, `word_order`, `matching` to `VALID_ACTIVITY_TYPES`
2. Implement builders in `activity-registry.js`
3. Add `pink-glam` and `rainbow-world` themes

---

## 6. Files to Modify (Priority Order)

| Priority | File | Reason |
|----------|------|--------|
| P0 | `src/services/learning/activity-registry.js` | Expand content banks |
| P0 | `src/services/ai/generated-activity-service.js` | Verify AI variation works |
| P0 | `src/services/learning/learning-flow.js` | Ensure variation request flow |
| P1 | `src/renderer/screens/learner/learning-activity-screen.js` | Audio feedback |
| P1 | `src/services/audio/tts-service.js` | Sentence-level playback |
| P2 | `src/renderer/screens/parent/parent-dashboard-screen.js` | Analytics display |
| P3 | `src/services/learning/activity-contract.js` | Add activity types |
| P3 | `src/services/world/world-state.js` | Add missing themes |

---

## 7. Launch Verification Checklist

- [ ] `npm start` → App opens without blank screen ✅
- [ ] Profile creation → Welcome screen renders ✅
- [ ] Screening quest → 15 tasks complete without error ⏳
- [ ] Learning flow → 8 activities with **varied questions** ❌ **BLOCKER**
- [ ] Audio → Questions + feedback read aloud ❌
- [ ] My World → Decorations placeable, themes switchable ✅
- [ ] Parent Dashboard → Shows topic progress ❌
- [ ] Schoolwork import → PDF → extract → approve → practice ⏳
- [ ] Restart → Profile, world, progress persist ✅

---

**Conclusion:** The foundation is solid. The app runs, the architecture is clean, and most systems exist. The **single critical blocker** is **activity content variation** — without it, the adaptive engine and learning loop are decorative. Fix this first, then the rest follows naturally.