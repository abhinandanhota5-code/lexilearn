# LexiLearn — Implementation Plan

## Phase 1: Technical Foundation ✅ Complete

- Electron shell with security defaults (`contextIsolation`, `nodeIntegration: false`, CSP)
- Secure preload bridge (`preload.cjs`) exposing `electronAPI`
- Centralized IPC channel registry (`ipc-channels.js` / `.cjs`)
- `ILLMProvider` abstraction (`llm-provider.js`)
- `OllamaLLMProvider` implementation (`ollama-provider.js`)
- `ProfileStore` local JSON persistence (`profile-store.js`)
- `PinService` scrypt hashing + verification (`pin-service.js`)
- Dyslexia-accessible design tokens and theme system (`tokens.css`, `parent.css`)

## Phase 2: Parent Setup & Learner Profile ✅ Complete

- `validateProfileInput()` and `buildCanonicalProfile()` (`profile-schema.js`)
- Welcome screen: PIN setup + disclaimer (`welcome-screen.js`)
- Learner basics screen: name, age, grade, avatar, theme, accommodations (`learner-basics-screen.js`)
- Profile overview dashboard (`profile-overview-screen.js`)
- App router for parent flow (`app.js`)

## Phase 3: Document Ingestion & Parent Verification ✅ Complete

- `DocumentIngestionPipeline` with Strategy pattern (`document-ingestion-pipeline.js`)
- `TextDocumentExtractor`, `PdfDocumentExtractor`, `ImageOcrExtractor` (stub)
- `ReportExtractionService` with LLM guardrails (`report-extraction-service.js`)
- Document upload screen (`document-upload-screen.js`)
- Review & confirm screen (`review-confirm-screen.js`)
- `DOCUMENT_OPEN`, `DOCUMENT_EXTRACT`, `DOCUMENT_CONFIRM` IPC handlers
- `storeDocumentLocally()` for secure document copy

---

## Phase 4: Screening Quest 🔲 Next

### Goal
Build the child-facing screening quest — the learner's first interactive session.
An age/grade-appropriate sequence of reading mini-tasks that establishes a
baseline understanding of the learner's current reading abilities.

### Design Principles
1. **Observations, not diagnosis** — Screening measures educational observations
   about reading behavior. It never diagnoses dyslexia or any condition.
2. **Deterministic scoring** — All scoring is rule-based and explainable. The LLM
   is not involved in scoring or baseline computation.
3. **Architecture-ready for Phase 6** — Task templates, quest engine, and result
   schema are designed so the Adaptive Learning Engine can consume screening
   baselines directly.

### Scope
- Child-facing UI (distinct from parent screens)
- Quest engine with task sequencing and difficulty adaptation
- Task templates for reading screening
- Screening results persistence
- IPC handlers for `SCREENING_SUBMIT_TASK` and `SCREENING_COMPLETE_QUEST`
- Profile schema extensions for screening status

### Out of Scope for Phase 4
- Companion system (Phase 5)
- FeedbackManager / haptics (child interaction polish phase)
- Adaptive learning content generation (Phase 6)
- LLM-generated content

### Tasks

#### 4.1 Schema & IPC Wiring

**Task 4.1.1: Extend `profile-schema.js`**
Add screening fields to the canonical profile structure:
```
screeningStatus: 'not_started' | 'in_progress' | 'completed'
screeningResults: ScreeningTaskResult[] | null
readingBaseline: ReadingBaseline | null
screeningCompletedAt: ISO timestamp | null
```

**Task 4.1.2: Verify IPC channels**
`SCREENING_SUBMIT_TASK` and `SCREENING_COMPLETE_QUEST` are already declared in
`ipc-channels.js` and `ipc-channels.cjs`. No new channels needed.

**Task 4.1.3: Wire preload bridge**
Expose on `window.electronAPI` in `preload.cjs`:
- `submitScreeningTask(payload)` → invokes `SCREENING_SUBMIT_TASK`
- `completeScreeningQuest()` → invokes `SCREENING_COMPLETE_QUEST`

**Task 4.1.4: Register IPC handlers in `main.js`**
- `SCREENING_SUBMIT_TASK`: Validate and persist individual task result to the
  in-progress session file.
- `SCREENING_COMPLETE_QUEST`: Compute baseline from accumulated results, update
  profile with `screeningStatus: 'completed'` and `readingBaseline`, return
  summary.

#### 4.2 Screening Service Layer

**Task 4.2.1: Create `src/services/screening/task-templates.js`**

Task registry organized by category and difficulty tier:

| Category | Description | Example |
|----------|-------------|---------|
| `phoneme_identification` | Identify beginning/ending sounds | "What sound does 'cat' start with?" |
| `letter_sound_matching` | Match letters to their sounds | "Which letter makes the /b/ sound?" |
| `word_decoding` | Read and identify real vs. nonsense words | "Is 'flirp' a real word?" |
| `syllable_counting` | Count syllables in a word | "How many syllables in 'butterfly'?" |
| `rhyme_recognition` | Identify rhyming word pairs | "Do 'cat' and 'dog' rhyme?" |
| `sentence_completion` | Fill in the missing word | "The cat sat on the ___." |

Each task template:
```js
{
  id: 'phoneme_start_01',
  category: 'phoneme_identification',
  difficulty: 1,            // 1 = easiest, 5 = hardest
  gradeRange: ['Kindergarten', '1st Grade'],
  prompt: 'What sound does "cat" start with?',
  type: 'multiple_choice',
  options: ['/k/', '/m/', '/t/', '/s/'],
  correctAnswer: '/k/',
  timeLimitMs: 30000        // generous, non-punitive
}
```

Task selection: quest-engine selects 12–15 tasks per session, distributed across
categories, filtered by the learner's age/grade. Difficulty adapts based on
previous answers (see Task 4.2.2).

**Task 4.2.2: Create `src/services/screening/quest-engine.js`**

Quest orchestration:
- `startQuest(learnerProfile)` → filters tasks by grade range, shuffles,
  returns ordered task list
- `getNextTask(currentIndex, results)` → adaptive logic:
  - If last 2 answers correct → increase difficulty tier by 1 (max 5)
  - If last 2 answers incorrect → decrease difficulty tier by 1 (min 1)
  - Maintain category balance across the quest
- `computeBaseline(results)` → deterministic scoring:
  - Per-category accuracy rate
  - Overall accuracy rate
  - Average response time per category
  - Struggle indicators (tasks where response time > 80th percentile or
    required multiple attempts)
  - No LLM involvement — all math is arithmetic

**Task 4.2.3: Create `src/services/screening/screening-store.js`**

Local JSON persistence:
- Path: `userData/screening/{learnerId}/session-{timestamp}.json`
- Methods: `saveSession(data)`, `getLatestSession(learnerId)`,
  `getAllSessions(learnerId)`
- Uses same atomic write pattern as `ProfileStore` (tmp + rename)

#### 4.3 Child-Facing UI

**Task 4.3.1: Create `src/renderer/screens/learner/quest-intro-screen.js`**
- Displays learner's avatar and name
- Age-appropriate welcome: "Hi {name}! Let's do some fun reading activities."
- Simple instructions with visual cues
- "Let's Start" button
- Decorative companion avatar (interactive in Phase 5)

**Task 4.3.2: Create `src/renderer/screens/learner/task-screen.js`**
- Renders current task prompt and answer options
- Large, accessible option buttons (min 64px touch targets)
- Visual progress bar (tasks completed / total)
- Countdown timer (visible but non-pressuring)
- Answer handling:
  - Select option → disable further input → brief feedback flash (green/red)
  - Submit via `submitScreeningTask` IPC
  - After 1.5s delay → advance to next task
- Category badge shown for each task

**Task 4.3.3: Create `src/renderer/screens/learner/quest-complete-screen.js`**
- Congratulatory message with avatar
- Brief summary: "You completed {N} reading activities!"
- "See My Reading Profile" button → transitions to profile overview
  (Phase 6 will replace with adaptive learning dashboard)

#### 4.4 Styling & App Router

**Task 4.4.1: Create `src/renderer/styles/learner.css`**
- Child-facing layout: centered, generous whitespace
- Task card styling (large prompt area, option grid)
- Progress bar and timer
- Completion celebration styling
- Uses existing design tokens from `tokens.css`

**Task 4.4.2: Update `src/renderer/app.js`**
- Add `startScreeningFlow(profile)` function
- After profile setup (or on startup if profile exists but screening not
  completed): route to quest-intro → task-screen loop → quest-complete
- After screening complete: route to profile overview (placeholder until
  Phase 6 learning dashboard)

**Task 4.4.3: Update `index.html`**
- Add `<link rel="stylesheet" href="src/renderer/styles/learner.css">`

### Screening Flow Diagram

```
Profile Setup Complete (or existing profile with screeningStatus !== 'completed')
        │
        ▼
┌─────────────────┐
│  Quest Intro     │  "Hi {name}! Let's do some reading activities."
│  Screen          │
└────────┬────────┘
         │ Click "Let's Start"
         ▼
┌─────────────────┐
│  Task Screen     │  ← loop for 12-15 tasks
│  (Task 1)        │
│  - Show prompt   │
│  - Show options  │
│  - Timer running │
│  - Select answer │
│  - Submit result │
│  - Brief feedback│
└────────┬────────┘
         │ 1.5s delay
         ▼
┌─────────────────┐
│  Task Screen     │  (next task, adaptive difficulty)
│  (Task 2)        │
└────────┬────────┘
         │ ... repeat ...
         ▼
┌─────────────────┐
│  Quest Complete  │  "Great job, {name}! You finished all the activities!"
│  Screen          │  "Start Learning" button
└─────────────────┘
```

### Data Schema

#### `screeningResults` (per-task result)
```js
{
  taskId: 'phoneme_start_01',        // task template ID
  category: 'phoneme_identification',
  difficulty: 2,
  prompt: 'What sound does "cat" start with?',
  type: 'multiple_choice',
  selectedAnswer: '/k/',
  correctAnswer: '/k/',
  isCorrect: true,
  responseTimeMs: 4200,              // time from prompt display to answer submission
  attemptedAt: '2025-09-16T10:30:00.000Z'
}
```

#### `readingBaseline` (computed on quest completion)
```js
{
  overallAccuracy: 0.78,             // 0.0 – 1.0
  categoryAccuracy: {
    phoneme_identification: 0.85,
    letter_sound_matching: 0.90,
    word_decoding: 0.70,
    syllable_counting: 0.65,
    rhyme_recognition: 0.80,
    sentence_completion: 0.75
  },
  avgResponseTimeMs: {
    phoneme_identification: 5200,
    letter_sound_matching: 4800,
    word_decoding: 7100,
    syllable_counting: 6300,
    rhyme_recognition: 4100,
    sentence_completion: 5800
  },
  difficultyReached: {
    phoneme_identification: 3,
    letter_sound_matching: 2,
    word_decoding: 4,
    syllable_counting: 3,
    rhyme_recognition: 2,
    sentence_completion: 3
  },
  totalTasksCompleted: 15,
  strugglingCategories: ['syllable_counting'],  // accuracy < 65% or high response time
  computedAt: '2025-09-16T10:45:00.000Z'
}
```

### Scoring Rules (Deterministic)

1. **Correct/incorrect**: Exact string match of selected answer vs. correct answer.
   No fuzzy matching. No LLM judgment.
2. **Adaptive difficulty**: Based on last 2 answers in the same category:
   - 2 correct → difficulty + 1 (capped at 5)
   - 2 incorrect → difficulty - 1 (floored at 1)
   - Mixed → no change
3. **Response time**: Measured in milliseconds from task display to answer
   submission. Time limit is generous (30s per task) and non-punitive —
   exceeding time limit counts as incorrect but does not trigger additional
   penalties.
4. **Category accuracy**: `correct_in_category / total_attempted_in_category`
5. **Struggling categories**: `overallAccuracy < 0.65` OR
   `avgResponseTime > 1.5 * overallAvgResponseTime`
6. **Baseline computation**: Pure arithmetic on accumulated results. No
   statistical modeling. No threshold-based diagnosis.

### Files Changed/Created

| File | Action |
|------|--------|
| `src/shared/profile-schema.js` | Modify — add screening fields to schema |
| `preload.cjs` | Modify — expose screening bridge methods |
| `main.js` | Modify — register screening IPC handlers |
| `src/renderer/app.js` | Modify — add learner routing |
| `index.html` | Modify — add learner.css link |
| `src/services/screening/task-templates.js` | **Create** — task registry |
| `src/services/screening/quest-engine.js` | **Create** — quest orchestration |
| `src/services/screening/screening-store.js` | **Create** — session persistence |
| `src/renderer/screens/learner/quest-intro-screen.js` | **Create** — child welcome |
| `src/renderer/screens/learner/task-screen.js` | **Create** — task rendering |
| `src/renderer/screens/learner/quest-complete-screen.js` | **Create** — completion |
| `src/renderer/styles/learner.css` | **Create** — child-facing styles |

**Total: 5 files modified, 7 files created**

---

## Phase 5: Companion System Foundation 🔲 Planned

### Goal
Implement the reusable companion system as a standalone service. Integrate it
into the existing child-facing screens (screening quest from Phase 4).

### Tasks (High-Level)
1. Create `src/services/companion/companion-event-bus.js`
2. Create `src/services/companion/companion-state-machine.js`
3. Create `src/services/companion/companion-behaviors.js`
4. Create `src/services/companion/companion-service.js`
5. Create `src/services/companion/companion-config.js`
6. Create `src/renderer/components/companion/companion-widget.js`
7. Create `src/renderer/components/companion/companion-bubble.js`
8. Create `src/renderer/components/companion/companion-animations.css`
9. Add `COMPANION_STATE_CHANGED` IPC channel
10. Integrate companion into screening quest task-screen
11. Replace decorative avatar with interactive companion in quest-intro-screen

---

## Phase 6: Adaptive Learning + Personalized Learning Experience 🔲 Planned

> **Status:** Spec amended — pending approval. Implementation not started.
> Do not commit to Git. No haptics, no diagnosis, no scoring changes, no LLM
> authority over learner state.

### 1. Objective

Transform the app from *screening + companion prototype* into an **adaptive
learning system**: the screening baseline seeds a deterministic, explainable
**Adaptive Learning Engine (ALE)** that selects the next practice activity with
**grade as a hard curriculum constraint**, letting difficulty move only within
bounded, predefined limits. **School-provided material** (worksheets, textbook
chapters, notes, assignments) is the primary grounding source for what is
learned — the ALE maps supplied material to curated **learning objectives**,
and bounded local Llama generation produces **grounded** questions,
explanations, and examples only when appropriate. Questions support **multiple
representations** (text, audio, visual, manipulation, real-life example,
guided, multiple choice, sentence completion) including **audio-assisted
"Duolingo-like" presentation** through a configurable TTS abstraction. Learning
is scaffolded by a first-class, non-shaming **"I don't understand"** flow, and
observed **audio/modality preference signals** quietly influence future
representation selection. The existing Companion reacts to the same semantic
events — never to LLM output.

### 2. User Journey (Phase 6)

```
Screening Quest (Phase 4 baseline)
        ↓ screeningStatus === 'completed'
Parent: attach school material (worksheet/chapter) + link learning objectives
        ↓
Parent overview − "Start Learning" (mission landing)
        ↓
Mission Screen (companion + objective focus + gentle goal, e.g. 6–8 activities)
        ↓
Learning Activity (one task at a time; representation chosen by ALE)
  ├─ audio/text/visual/manipulation presentation with replay button
  ├─ answer → deterministic signal (incl. audio signals) → ALE → next activity
  ├─ "I don't understand" → help panel → deterministic scaffold → Llama (bounded, grounded) → validated explanation → return to task
  └─ hints / struggle → companion reactions (existing events)
        ↓
Activity complete → ALE state persist → continue or Break suggestion
        ↓
Parent overview shows friendly, non-clinical practice summary (persisted data only)
```

The child never sees scores, percentages, difficulty tiers, mastery values, or
"failure" states. Language stays low-pressure and adventure-themed. Audio is an
additional learning/accessibility modality — never a diagnosis mechanism and
never the only path through a question.

### 3. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Main Process                              │
│                                                                  │
│  School Material Store ── ingested via Phase 3 extractors ──┐    │
│        (per-learner chapters/worksheets, excerpt chunks)     │    │
│        │ linked to                                            │    │
│        ▼                                                      │    │
│  Learning Objective Registry (curated: grade, coreTerms,        │    │
│        contextTerms, representation, materialRequired)          │    │
│        │ + Screening Baseline (profile.readingBaseline)       │    │
│        ▼                                                      │    │
│  Adaptive Learning Engine (ALE) ── pure/deterministic ──┐     │    │
│  decide(grade, objectives, material, skillState,         │     │    │
│         preferences, signal) → next activity plan        │     │    │
│   • grade sand described below; difficulty clamped       │     │    │
│   • representation chosen per §7A                        │     │    │
│        │                                                │     │    │
│        ▼                                                │     │    │
│  Preference Model (modality/audio weights, clamps)      │     │    │
│        │                                                │     │    │
│        ▼                                                │     │    │
│  Activity Registry (deterministic content factories)    │     │    │
│        │                                                │     │    │
│        ▼                                                │     │    │
│  ContentValidator ─ grade / grounding / objective /     │     │    │
│        difficulty / suitabiliy gates                     │     │    │
│        │                                                │     │    │
│        ▼                                                │     │    │
│  Explanation/Question Service ─ deterministic tier →    │     │    │
│        Llama tier (grounded excerpts only) → validator  │     │    │
│        └───────── LLM never mutates learner state ──────┘     │    │
│                                                                  │
│  LearningStore (sessions)  •  ProfileStore (adaptiveLearning)    │
│  CompanionService (unchanged, existing events)                   │
└────────────────────────────────┬─────────────────────────────────┘
                                 │ IPC LEARNING_* / MATERIAL_*
                                 ▼
                    ┌──────────────────────────────┐
                    │ Renderer                     │
                    │ Mission → Activity → Help    │
                    │ → Companion widget → TTS     │
                    │   (Web Speech API, local)    │
                    └──────────────────────────────┘
```

**Hard boundaries**
- The ALE is a pure function of persisted learner state + a validated signal.
  No randomness, no wall-clock reads inside the decision (time is injected).
- **Grade is a hard curriculum constraint** (§6A): no question or objective
  outside the learner's grade band is ever selected, and difficulty is clamped
  by an additional per-grade ceiling.
- Llama output can occupy a `content` field only. It cannot set state,
  difficulty, mastery, progression, or the Companion state.
- **Llama never invents a curriculum.** It only generates
  questions/explanations when a supplied school-material excerpt + objective
  are present; otherwise the ALE uses built-in deterministic content.
- The Phase 3 document/report pipeline remains fully separate. The ALE never
  reads `profile.documentExtraction` and never reinterprets clinical
  recommendations.

### 4. Component / Service Responsibilities

| Service | Responsibility | LLM? |
|---------|----------------|------|
| `AdaptiveEngine` | Pure decision: objective/skill/activity/difficulty/support/representation; emits `AdaptiveDecision` + rationale tags | Never |
| `PreferenceModel` | Bounded modality **and audio** weights; clamped deltas from deterministic signals | Never |
| `ObjectiveRegistry` | Curated learning objectives (structured metadata: grade, core/context terms, defaults) | Never |
| `SchoolMaterialStore` | Ingest via Phase 3 extractors; chunk excerpts; link materials to objectives; per-learner index | Never |
| `ActivityRegistry` + contracts | Deterministic activity plans + content; validates ActivityResults (incl. audio signals); emits companion events | Never |
| `ContentValidator` | Grade / grounding / objective / difficulty / suitability gates on any generated content | Never |
| `ExplanationService` | Deterministic tier (show me / tell me / break it down), then bounded grounded Llama tier; validation + fallback | Bounded |
| `TTSService` (interface) | `isAvailable/speak/stop`; configurable voice/rate; renderer Web Speech impl | Never |
| `LearningStore` | Session persistence (mirrors `ScreeningStore` pattern) | Never |
| `CompanionService` | Reacts to existing semantic events only (Phase 5 unchanged) | Never in Phase 6 |
| `Renderer` screens | Mission landing, activity host (+audio/replay), help panel, parent material attach; wires companion mounts | No (renders) |

### 5. Data Flow (Feedback Loop)

```
SchoolMaterial + Objective + Grade + LearnerProfile (baseline, preferences)
   → ALE.decide(...) → ActivitySpecification (objective, representation, difficulty, excerpt)
   → Reusable? No → Activity content = deterministic template OR grounded
     Llama question (bounded, material excerpt present, validated)
   → LEARNER presents activity (text / audio / visual / manipulation; replay)
   → submitAnswer() → ActivityResult (deterministic extraction, incl. audio signals)
   → LEARNING_SUBMIT_ACTIVITY (IPC, main)
   → ALE.record(result, adaptiveState, now)        [pure]
       → updates skillState + audio metrics, preference deltas, meta
       → persists adaptiveLearning (ProfileStore) + session (LearningStore)
   → ALE.decide(...) → next ActivitySpecification (or break suggestion)
   → renderer renders next activity
   → companion already reacted via emitted events (Phase 5 path)
LLM never touches adaptiveState. Grade, difficulty, mastery, preferences are
written only by ALE arithmetic under §6A/§7 bounds.
```

### 6. Exact Schemas / Interfaces

**Skill registry** (`adaptive-config.js`)
```js
SKILLS = [
  { id:'phoneme_awareness',    label:'Sound games', baselineCategory:'phoneme_identification',
    minDifficulty:1, maxDifficulty:5, startingDifficulty:'auto' /* from baseline */ },
  { id:'letter_sound_correspondence', label:'Letter sounds', baselineCategory:'letter_sound_matching', ... },
  { id:'decoding',             label:'Word building', baselineCategory:'word_decoding', ... },
  { id:'syllable_awareness',   label:'Syllable fun', baselineCategory:'syllable_counting', ... },
  { id:'rhyme_awareness',      label:'Rhyme games',   baselineCategory:'rhyme_recognition', ... },
  { id:'comprehension',        label:'Sentence clues', baselineCategory:'sentence_completion', ... }
]
```

**Grade difficulty ceilings** (`adaptive-config.js`) — hard curriculum bound
```
GRADES_MAX_DIFFICULTY = {
  'Kindergarten': 2, '1st Grade': 3, '2nd Grade': 3,
  '3rd Grade': 4,   '4th Grade': 4, '5th Grade': 5, '6th Grade': 5
}
GRADE_OBJECTIVE_RANGE_SKIP = []   // no objective outside learner grade band
```

**Learning Objective** (`objective-registry.js`, curated/static — metadata drives §8A alignment)
```js
{
  id: 'water_cycle_evaporation',
  subject: 'Science',
  label: 'Water changes into water vapour',
  learningStatement: 'The learner can identify the term for water changing into water vapour.',
  gradeRange: ['3rd Grade','4th Grade','5th Grade'],
  targetSkills: ['comprehension'],           // empty = objectives-only activity
  // Structured alignment metadata (§8A). coreTerms must be covered by generated
  // content; contextTerms support but do not satisfy coverage; excludedConcepts
  // must never be introduced. Not a naive keyword-only gate — these feed the
  // layered ALIGN-1..4 deterministic checks alongside the excerpt context.
  coreTerms: ['water','vapour','evaporation'],
  contextTerms: ['change','heat','sun','process'],
  excludedConcepts: [],                      // e.g. 'condensation' for a narrower objective
  defaultRepresentation: 'sentence_completion',
  preferredActivityTypes: ['sentence_mc'],
  materialRequired: false                     // true → built-in content not allowed alone
}
```

**School Material** (`school-material-store.js`)
```js
{
  materialId, learnerId,
  label: 'Ch3 The Water Cycle.pdf',
  sourceFileName, sourcePath,     // local copy (Phase 3 storeDocumentLocally pattern)
  subject, chapter,
  extractedText, excerptChunks: string[],   // capped (e.g. ≤ 8 × 400 chars)
  attachedObjectives: ['water_cycle_evaporation'],
  addedAt
}
```

**SkillState** (persisted, inside `profile.adaptiveLearning.skills[skillId]`)
```js
{
  mastery: number,          // 0.05..0.95 rolling-mean heuristic
  difficulty: number,       // 1..min(skill.maxDifficulty, grade ceiling)
  attempts: number,
  correct: number,
  streakCorrect: number,
  streakWrong: number,
  helpRequests: number,
  audioMetrics: { audioUsed, replays, answeredAfterFirstListen,
                 answeredAfterReplay, textAndAudio, helpAfterAudio }, // cumulative
  lastPracticedAt: string|null,
  practicedDates: string[]  // capped at 14
}
```

**AdaptiveDecision** (output of `decide()`)
```js
{
  suggestion: 'practice'|'review'|'consolidate'|'break',   // no 'advance' to be kid-facing
  nextPlan: {
    sequence, sessionId, skillId, activityType, representation,
    objectiveId, materialId|null, sourceExcerpt|null, gradeRange,
    difficulty, supportLevel, presentation,
    variationSeed, rationale: string[], generatedAt
  } | null,               // null when suggestion === 'break'
  preferenceDelta: { kind, modality, delta } | null
}
```

**ActivitySpecification** (what the renderer receives; no correctAnswer)
```js
{
  sequence: 4, sessionId: 'learning_...',
  skillId: 'comprehension', activityType: 'sentence_mc',
  representation: 'sentence_completion',
  objectiveId: 'water_cycle_evaporation', materialId: 'mat_1', sourceExcerpt: '...',
  gradeRange: ['3rd Grade','4th Grade','5th Grade'],
  difficulty: 3, supportLevel: 'none'|'scaffold'|'guided',
  presentation: {
    mode: 'text_audio',            // 'text' | 'text_audio' | 'audio'
    audioPrompt: 'The process by which water changes into water vapour is called…',
    replayEnabled: true, ttsRate: 0.85
  },
  title: 'Sentence Clues', prompt: 'Tap the word that finishes the sentence.',
  mode: 'choose'|'build',
  content: { ... },               // options/tiles/visual cues/audioRefs; NO correctAnswer
  timeLimitMs, helpOptions: ['show_me','tell_me','break_it_down','give_example','make_simpler','funny_example','real_life_example'],
  rationale: ['objective_selected','representation_text_audio']
}
```
`correctAnswer` is NEVER sent to the renderer for build/check by the client —
correctness is computed in main from the submitted selection (same
ground-truth model as screening).

**ActivityResult** (submitted via `LEARNING_SUBMIT_ACTIVITY`)
```js
{
  activityId, skillId, activityType, representation, objectiveId,
  difficulty, attempts: 1..N,
  correctOnFirstAttempt: boolean,
  hintsUsed: number,
  explanationsUsed: string[],
  modalityObservations: ['visual'|'audio'|'manipulation'|'text'],
  // audio learner signals (Phase 6 §6C/§11)
  audioPresented: boolean,
  audioUsed: boolean,
  replayCount: number,
  answeredAfterFirstListen: boolean,
  answeredAfterReplay: boolean,
  textAndAudio: boolean,
  helpRequestedAfterAudio: boolean,
  gradeMatched: boolean,          // validated true in main before ALE
  responseTimeMs, completedAt, outcome: 'success'|'help_success'|'incorrect'|'timeout'
}
```

### 6A. Grade-Aware Learning (hard curriculum constraint)

1. Every objective carries a `gradeRange`; the ALE **only** selects objectives
   whose `gradeRange` includes the learner's current grade. Objectives never
   override the profile grade.
2. Every activity carries a `gradeRange`/`gradeRange` content check; the ALE
   only emits plans whose materials/excerpt vocabulary and template content are
   within the learner's grade band.
3. Difficulty may move only within
   `[max(1, skill.minDifficulty), min(skill.maxDifficulty, GRADES_MAX_DIFFICULTY[grade])]` —
   two bounds, both enforced (R8/R10). A Kindergarten learner can never receive
   a difficulty-4 item even if mastery is high.
4. Generated content (Llama tier) is validated against the selected objective's
   `gradeRange` and structured objective metadata (ALIGN-1..4, §8A); a failure to match rejects and
   falls back to deterministic content of the same grade band.
5. `gradeMatched` is set by main from the profile on every result; mismatch is
   rejected before the ALE sees it (defense against client tampering).

### 6B. School Material Pipeline (primary curriculum source)

```
Grade + School Material + Learning Objectives + Learner Profile
        ↓
Adaptive Learning Engine
        ↓
Activity Specification
        ↓
Llama generation/explanation where appropriate (grounded in supplied excerpt)
        ↓
Validation (ContentValidator: grade / grounding / objective / difficulty / suitability)
        ↓
Child Activity
```

- **Ingest:** parent adds material in a new minimal screen (reuses
  `DocumentIngestionPipeline` extractors: text + PDF; image OCR stays a stub).
  `SchoolMaterialStore` stores a local copy, chunks the text, and builds the
  per-learner index. No content blobs enter the learner profile.
- **Linking:** parent (or deterministic keyword match against objective
  coreTerms) attaches the material to one or more curated objectives. Linking is
  **never** Llama-driven in Phase 6.
- **Grounding rule:** an activity counts as *material-grounded* when its plan
  carries `materialId` + `sourceExcerpt`. The Llama tier may only be invoked
  when the request embeds a bounded excerpt (≤ 400 chars) of the learner's own
  material and the objective. **If no material exists for the objective, the
  ALE serves built-in deterministic content and the Llama tier is disabled for
  that objective** — the model is never allowed to invent an unrelated
  curriculum.
- `materialRequired: true` objectives with no attached material are invisible
  to the ALE until material is attached.

### 6C. Audio-Assisted Questions & TTS

- **Representations served (Duolingo-like pattern, our own UI):** ALE may set
  `presentation.mode` to `audio` (heard question + visual answer choices) or
  `text_audio` (heard prompt while text is also visible). Everything is
  **inside the existing child UI and implementation** — no third-party widget.
- **TTS abstraction** (`src/services/audio/tts-service.js`): `ITTSService`
  interface — `{ isAvailable(), speak({text,rate}), stop(), cancel() }` — with a
  renderer `WebSpeechTTSService` implementation (`window.speechSynthesis`).
  Voice/rate configurable; rate defaults from profile
  `accommodations.audioNarrationSpeed`. Future providers (system TTS via main,
  eSpeak, cloud) are swappable behind the same interface.
- **Interaction contract:** prompt is spoken (full or partially — blanks read
  as "blank"), a **replay button** is always present once audio is offered,
  answer choices remain visible as text/cards, and the full prompt text is at
  most one tap away (`text_audio` shows it; `audio` reveals via "Show text").
- **Not every question is audio-only:** `mode:'audio'` is capped at
  `MAX_AUDIO_ONLY_ACTIVITIES = 2` per session (config), audio is never used for
  decoding/building tasks (their modality is visual/manipulation), and any
  audio-only item is preceded by the child having successfully used
  text+audio. Audio is an **additional learning/accessibility modality**, never
  a diagnosis mechanism, never required to understand an item.
- **Audio learner signals (persisted):** `audioUsed`, `replayCount`,
  `answeredAfterFirstListen`, `answeredAfterReplay`, `textAndAudio`,
  `helpRequestedAfterAudio` (§6 ActivityResult). These feed deterministic
  preference deltas (§11) and are surfaced later only as non-medical
  observations.

### 7. Adaptive Learning Engine Rules (deterministic, thresholds in config)

Mastery heuristic (per skill, rolling window of last 8 outcomes):
`correct_first_attempt=1.0, correct_after_help=0.6, incorrect=0.0, timeout=0.2` → mean, clamped `[0.05, 0.95]`. Fresh skill defaults to `0.5`.

| # | Rule | Condition | Action |
|---|------|-----------|--------|
| R1 | Session cap | `sessionCount >= 8` OR `elapsed >= 15 min` | `suggestion:'break'`, `nextPlan:null` |
| R1a | Objective eligible | objective `gradeRange` excludes learner grade OR `materialRequired` with no material | objective is invisible to ALE |
| R2 | Objective/skill selection | Among eligible objectives, pick lowest-mastery skill; tie-break by preference-compatible representation; never >3 consecutive same-skill plans | rotate |
| R3 | Repeat | last outcome not success AND `mastery < 0.60` | repeat same objective + activityType (new `variationSeed`), difficulty unchanged or −1 |
| R4 | Difficulty up | `streakCorrect >= 3` (no help) | `difficulty + 1`, clamped (`R10`) |
| R5 | Difficulty down | `streakWrong >= 2` (incl. timeout-as-incorrect; timeout alone no difficulty penalty) | `difficulty - 1`, clamped (`R10`) |
| R6 | Support level | `mastery < 0.35` OR `streakWrong >= 2` → `guided`; else if help used → `scaffold`; else `none` | set `supportLevel` |
| R7 | Preference delta | help kind K used → next attempt correct → `+0.08` to K's modality; K used → next incorrect → `-0.03`; first-try success on modality M → `+0.02`; audio signals per §11 table; before each bump all weights decay ×0.995 | bounded update |
| R8 | Bounds | difficulty/mastery/weights clamped to config bounds | clamp |
| R9 | Representation | choose per §7A (grade, objective default, progress, difficulty, preference/audio weights) | set `representation` + `presentation.mode` |
| R10 | Grade ceiling | `difficulty > GRADES_MAX_DIFFICULTY[grade]` | clamp down; tag `difficulty_grade_capped` |

Rationale tags (closed set in config): `lowest_mastery_selected`, `objective_selected`, `material_grounded`, `grounding_fallback_deterministic`, `repeat_after_incorrect`, `streak_3_correct_advance`, `streak_2_incorrect_backoff`, `support_guided`, `support_scaffold`, `difficulty_capped`, `difficulty_floored`, `difficulty_grade_capped`, `session_cap_break`, `representation_audio`, `representation_text_audio`, `representation_manipulation`, `representation_guided`, `preference_visual_boost`, `preference_audio_boost`, `preference_manipulation_boost`.

Determinism contract: `decide()` and `record()` are pure given `(state, signal, now)`; seeded rotation via `variationSeed` (FNV-1a, same pattern as companion behaviors); no `Math.random`, no `Date.now()` inside. Unit-tested by deep-equality re-runs.

### 7A. Question Variation & Representation Selection

A single learning objective supports multiple representations. The ALE picks one per activity (R9) using: **grade** (constraint), **objective** (its `defaultRepresentation`/`preferredActivityTypes`), **learner progress** (repeat/struggle → guided or example), **difficulty bounds**, and **observed modality effectiveness** (§11 weights).

| Representation | Phase 6 implementation | Selection bias |
|----------------|------------------------|----------------|
| `text` | All choose-mode items render textual options/prompts | Default base |
| `audio` | `presentation.mode:'audio'` via TTS + replay | High audio weight; ≤2/session cap |
| `text_audio` | Prompt heard + text visible | Default when audio served |
| `visual` | Emoji/icon cues + word cards in choose items | Strong visual weight |
| `manipulation` | `word_build`, `syllable_split` tile interactions | Decoding / syllable skills |
| `real_life_example` | Explanation tier (deterministic + grounded Llama) | After struggle (R6) |
| `guided_question` | `supportLevel:'scaffold'/'guided'` step-wise framing | After help/repeat |
| `multiple_choice` | `sound_detect`, `sentence_mc` | Broad default |
| `sentence_completion` | `sentence_mc` with blanked word | Comprehension objective default |

### 8. Llama Integration Contract

Uses the **existing** `ILLMProvider` → `OllamaLLMProvider` (`llama3.1:8b-instruct-q4_K_M`). New `ai-provider-factory.js` is the single swap point for future providers.

**Tier 1 — deterministic (no LLM):** `show_me`, `tell_me`, `break_it_down` are resolved from skill/objective content (syllable-colored word, segmented chunks, curated scaffold). Determined by the app.

**Tier 2 — bounded grounded Llama:** `funny_example`, `real_life_example`, `make_simpler` narrative, and (optionally) grounded question-wording for a supplied excerpt. **Tier 2 only runs when a material excerpt for the selected objective exists** (§6B). No material → built-in deterministic content, no Llama curriculum invention.

LLM request context (structured, bounded; **never** contains correctAnswer, options, mastery, scores, learnerId, other material beyond the selected bounded excerpt, or profile data except `firstName` + `grade` + `objectiveId` + `concept` + `vocabularyHint` + excerpt):
```js
{ task:'generate_explanation'|'generate_grounded_question',
  requestedKind, objectiveId, concept, vocabularyHint,
  grade, firstName, targetLengthChars: 90,
  sourceExcerpt: '≤400-char excerpt from the learner’s own school material' }
```

LLM output: `{ content: string }` via `generateStructured` (temperature 0.4, maxTokens 256 for explanations; 0.3/384 for questions).

Validation (`ContentValidator.validate` per §8A): shape → type/length caps → forbidden-pattern filter (reuse `FORBIDDEN_CONTENT_PATTERNS` + no-diagnosis + no "I'm an AI" + no answer-leak literal check) → **grade-range check** → **structured objective alignment (ALIGN-1..4 per §8A, using objective metadata + excerpt context)** → rejected → curated fallback pool (`explanation-fallbacks.js`).

Failure handling (all non-blocking, child never waits >600ms UX perception):
unavailable (`checkHealth` gate) / timeout (`withTimeout` 12s promise race) / malformed JSON (one retry) / rejected content → curated fallback keyed by `kind`+`skillId`. Records `source:'llm'|'fallback'`.

Preventing state mutation: the generation layer returns `{ content, kind, source }` only; it never receives or writes adaptive state; `LEARNING_GET_HELP` persists an `explanationLog` entry in the session file with the source flag; ALE input is unaffected.

### 8A. Content Validation Requirements (explicit)

`ContentValidator` applies **all** gates to every piece of generated/selected content before it is presented:

1. **Grade-appropriate** — the content's objective `gradeRange` includes the learner's grade; vocabulary guidance is within the grade band.
2. **Grounded in supplied school material** — a generated question/example must reference/extend the `sourceExcerpt` actually present in the request; request without excerpt → deterministically rejected for Tier 2.
3. **Aligned with the learning objective (layered, structured)** — alignment is decided by **deterministic, explainable, testable rules** over the objective's *structured metadata* and the supplied *school-material excerpt context*. The LLM may assist generation but is **never the sole authority** for whether content is aligned — the validator is **fail-closed**: inconclusive or conflicting evidence rejects the content in favor of the curated fallback. Layers:

   - **ALIGN-1 — Objective binding.** `plan.objectiveId` resolves to an enabled objective whose `gradeRange` includes the learner's grade (R1a); the returned content's metadata (`objectiveId`, `skillId`, `gradeRange`) matches the plan exactly.
   - **ALIGN-2 — Concept coverage.** Tokenize content (stopword/term extraction). `coverage = |contentTerms ∩ objective.coreTerms| / |objective.coreTerms|`; require `coverage >= MIN_OBJECTIVE_COVERAGE` (config, default `0.5`). The validator records a per-term verdict `{ term, inExcerpt, inContent, inCoreTerms }` so every decision is inspectable and unit-testable.
   - **ALIGN-3 — Grounded vocabulary / no invention.** `novelTerms = contentTerms ∖ (objective.coreTerms ∪ objective.contextTerms ∪ excerptTerms)`. Reject when `novelTerms.length > MAX_NOVEL_TERMS` (config, default `3`); each remaining novel term **must** appear in `gradeVocabulary[grade]` — a curated, per-grade token set (`grade-vocabulary.js`) — otherwise reject. `excludedConcepts` appearing in content are always rejected.
   - **ALIGN-4 — Intent signal (weak, non-authoritative).** Deterministic token-overlap of content against the `learningStatement`'s salient tokens plus a length-band check. This is a *downgrading* signal only: it may lower confidence to `scaffold` or flag for review, but it **cannot by itself accept** content that failed ALIGN-2/3, and it never substitutes for a semantic judgment.
   - **Authority rule** — the LLM proposes text; the alignment verdict is produced solely by ALIGN-1..4 on the model's structured output. The model never grades its own output, and any path that cannot conclusively confirm alignment rejects (fail-closed) and falls back.

   Config thresholds: `MIN_OBJECTIVE_COVERAGE = 0.5`, `MAX_NOVEL_TERMS = 3`, `EXCERPT_TERMS_CAP = 400`, per-grade vocabulary sets (bounded, no model-derived vocab).
4. **Within deterministic difficulty bounds** — numeric difficulty clamped by `R8`/`R10` before and after generation.
5. **Suitable for the child-facing experience** — length caps (240 explanation / 90 question), tone filter, no shaming/diagnosis/clinical language, no answer disclosure for the live MC item, no tool-like self-identification.
6. **No silent curriculum invention** — anything failing (1)–(5) is rejected and replaced by deterministic fallback; the reject reason (including the ALIGN layer + per-term verdict) is recorded in the session log. The LLM cannot bypass these gates because the gates run in main on the structured output after generation.

### 8B. End-to-End Examples

**Example 1 — Grade 1 (Math, audio-assisted multiple choice)**
```
School material: parent uploads "Unit 2: Addition" worksheet (text: "We can add to
  ten. 5 + 3 = 8. Try: 3 + 5 = ___").
Objective: ['add_single_digits', gradeRange:['Kindergarten','1st Grade'], representation:'audio'] linked by parent.
ALE: selects objective (eligible), representation:audio (audio weight high), difficulty 1 (grade ceiling 3 → ok).
Llama (grounded in excerpt): Q: "What is five plus three?" — validator passes (grade band, coreTerms 'add' present, novel ≤ cap, length).
Activity: child SEES cards [6][7][8][9]; TTS speaks "What is five plus three?"; replay button visible.
Child: hears once → unsure → taps replay → selects 8.
Signals: audioUsed, replayCount=1, answeredAfterReplay, text+audio (cards visible). → persisted.
ALE.record: correct after replay → audio +0.04, mastery +, streakCorrect+1; next: same objective, variation'd prompt (difficulty stays bounded).
```
**Example 2 — Grade 4 (Science vocabulary, sentence completion)**
```
School material: textbook chapter "The Water Cycle" (excerpt: "When water is heated by
  the sun, it changes into water vapour. This process is called evaporation.").
Objective: ['water_cycle_evaporation', gradeRange:['3rd Grade','4th Grade','5th Grade'], defaultRepresentation:'sentence_completion'].
ALE: selects objective; representation sentence_completion; difficulty 3 (≤ grade ceiling 4).
Llama (grounded): Q: "The process by which water changes into water vapour is called ____."
  Validator: grade band ✓, coreTerms 'water/vapour/evaporation' covered, novel ≤ cap ✓, no answer leak ✓.
Activity: text_audio — prompt read aloud with "blank" at the gap; options evaporation / condensation / precipitation / collection; replay enabled.
Child: answers correct on first listen. Signals: textAndAudio, audioUsed, answeredAfterFirstListen.
ALE.record: mastery ↑; audio remains effective; representation stays text_audio; next activity slightly harder (≤ grade ceiling) or guided scaffold if objective were struggled on.
```
Both flows terminate in: `learner signal → ALE → next activity` (§5), with the Companion reacting via its existing semantic events.

### 9. Activity Contract (reusable)

```js
// createActivity(plan) → activity instance
activity = {
  id, skillId, objectiveId, activityType, representation, difficulty,
  start(),                                        // emits activity_started
  submitAnswer({selection, responseTimeMs, audioSignals}) → {isCorrect, gradeMatched},  // main-side ground truth
  requestHint(),                                  // emits hint_requested
  requestExplanation(kind),                       // emits help_requested (companion)
  requestReplay(),                                // TTS replay (audio replayCount signal)
  complete(),                                     // emits activity_completed; returns ActivityResult
  getView(),                                      // renderer descriptor (no correctAnswer; carries presentation)
}
```
Rules: activities contain **no adaptive logic**; they only emit semantic events
and produce deterministic `ActivityResult`s (including audio signals). `mode` ∈
`choose` | `build` (the two realistic input modes for Phase 6;
`draw`/`say`/`write`/`explain` are reserved contract slots).

**Core activity types implemented first (3), each grade-range-bounded:**
1. `sound_detect` — phoneme/letter-sound multiple choice (visual cue + optional audio narration; modalities visual/audio)
2. `word_build` — build a word from letter tiles (manipulation)
3. `syllable_split` — tap syllable chunks in order (audio/manipulation)

**Variants mapped onto the 3 types for representation coverage (§7A):**
- `sentence_mc` (choose-mode comprehension/sentence-completion + text_audio presentation)
- `sound_detect` also serves `representation:'audio'` when ALE sets it

**Contract-ready, deferred** (implemented later phases): `listen`, `show_me`,
`break_it_down` (as standalone activities), `funny_example`,
`real_life_example` (as standalone activities), `visual_match`,
`guided_reading`, `short_comprehension`. Real-life/guided *support* is provided
in Phase 6 via the explanation tier and `supportLevel`, not standalone
activities.

Mapping: `sound_detect` → phoneme_awareness & letter_sound_correspondence; `word_build` → decoding; `syllable_split` → syllable_awareness; `sentence_mc` → comprehension; rhyme/comprehension also selectable via choose-mode variants.

### 10. "I Don't Understand" Flow

```
Learner taps "I need help" (always visible, large, non-judgmental)
   → HelpPanel options: Show me · Tell me · Break it down · Give me an example ·
     Make it simpler · Funny example · Real-life example
   → learner picks kind
   → activity.requestExplanation(kind)   [emits help_requested → companion = helping]
   → ExplanationService:
       kind ∈ {show_me, tell_me, break_it_down} → deterministic tier (immediate, ~0ms)
       kind ∈ {make_simpler, funny_example, real_life_example} → grounded Llama tier
           (only when objective material excerpt exists; else curated fallback)
   → ContentValidator gates (§8A) → pass → return {content, source}
                                  fail / unavailable / timeout → curated fallback (source:'fallback')
   → HelpPanel shows explanation (auto-dismissing, dismissible, never blocking)
   → learner returns to same task (no penalty, attempts+=1 only)
   → next submission becomes ActivityResult; ALE applies R7 preference delta
```
Audio stays available in the help panel (replay of the prompt is always
available). Help is free, unlimited, never penalized; the explanation never
states the answer for the live MC item; the companion reacts exactly as in
Phase 5 (`help_requested` → `helping`).

### 11. Learner Preference Signal Model

Modalities (independent bounded weights): `visual, audio, text, manipulation,
example, repetition, guided_assistance`.

| Constant | Value |
|----------|-------|
| init weight | `0.5` |
| success-after-kind delta | `+0.08` |
| fail-after-kind delta | `-0.03` |
| first-try-with-modal delta | `+0.02` (once per activity) |
| audio: correct after replay | `audio +0.04` |
| audio: correct on first listen | `audio +0.02` |
| audio: text+audio used on success | `audio +0.01`, `text +0.01` |
| audio: help requested after audio | no delta (records engagement only) |
| recency decay per update | `×0.995` |
| clamp | `[0.05, 0.95]` |

Recording is deterministic (R7) and observational only — e.g. *"struggled → visual
explanation → succeeded"* boosts visual; *"answered after replay"* boosts audio.
Weights tilt future representation/activity selection only within bounds (R9 +
tie-breaks; audio-only cap §6C). **No medical interpretation** is derived,
displayed, or persisted. `explanationUsage` and `audioMetrics` counters are
stored for future reporting only — never shown to the child.

### 12. Companion Integration

Phase 5 companion is reused **unchanged**. Activities emit the existing event set
(`activity_started`, `answer_correct`, `answer_incorrect`, `hint_requested`,
`help_requested`, `learner_struggling`, `milestone_reached`,
`activity_completed`) on the existing `COMPANION_EMIT_EVENT` channel. Phase 6
adds **no** companion config/state/event changes and **no** Llama text in
companion bubbles (spec §7.6 optional LLM phrasing stays deferred). The docked
widget mounts for the whole learning flow; the mission screen mounts the hero
widget, mirroring `startScreeningFlow`.

### 13. Persistence Model

- `profile.adaptiveLearning` (same `learner-profile.json`, atomic tmp+rename):
  `{ skills (incl. audioMetrics), preferences, meta:{sessions,activities,lastSessionAt,sessionStreakDays,createdAt,updatedAt} }`.
  Crisp merge-on-write; clamp-on-load; never overwritten wholesale by the
  renderer.
- New `LearningStore` (`userData/learning/{learnerId}/session-*.json`, cloning
  `ScreeningStore` atomic pattern): `{sessionId, learnerId, grade, skillFocus,
  startedAt, status, plans:[], results:[], explanations:[{kind,source,requestedAt}], decisions:[]}`.
- New `SchoolMaterialStore` (`userData/materials/{learnerId}/...`): material
  copies + excerpt chunks + objective links; per-learner index; never in the
  profile file (only references stay in adaptive decisions).
- Minimum persisted signals per result: `activityId, objectiveId, skillId,
  activityType, representation, difficulty, outcome, attempts, hintsUsed,
  explanationsUsed, responseTimeMs, supportLevel` **+ audio signals**
  (`audioUsed, replayCount, answeredAfterFirstListen, answeredAfterReplay,
  textAndAudio, helpRequestedAfterAudio`).
- `profile-schema.js` extended with `adaptiveLearning` default + validation and
  `accommodations.questionsReadAloud` default (`true`) for TTS defaulting.

### 14. Error / Fallback Behavior

| Failure | Response |
|---------|----------|
| Ollama daemon unavailable / model missing | grounded Llama tier disabled → curated pool; mission continues on deterministic content |
| Llama timeout (>12s) or hang | promise-race drop → fallback |
| Malformed/unparseable LLM JSON | one retry, then fallback |
| Disallowed/unapproved content (validator §8A) | rejected → fallback; reason logged |
| **TTS unavailable** (no `speechSynthesis` / no voices) | `presentation.mode` forced to `text` or `text_audio` → `text`; replay hidden |
| **No school material for objective** | ALE: objective invisible if `materialRequired`; else deterministic built-in content; Llama tier disabled for it |
| Profile missing on mission request | `{success:true, plan:null, suggestion:'parent_redirect'}` → renderer routes to setup flow |
| Store write failure | non-fatal to child (logged), retried at next submit; child progress never blocks |
| Renderer disconnect | activity loop is main-driven; recovery on next launch from persisted state |

### 15. Security / Privacy

- 100% local; nothing leaves the device except Ollama HTTP to `127.0.0.1`.
- LLM context is a denormalized, minimal slice (firstName, grade, objectiveId,
  concept, vocabularyHint, requestedKind, one bounded `sourceExcerpt`).
  **Never** sends: learnerId, scores, mastery, preferences, full documents,
  other objectives, or correctAnswer.
- School material is stored locally like Phase 3 documents (tmp+rename); it
  never enters the profile file or any IPC broadcast.
- Incoming IPC payloads re-validated against schemas; `correctAnswer` computed
  main-side from ground truth and `gradeMatched` verified before the ALE runs
  (same tamper model as `validateTaskSubmission`).
- Generated content passes §8A gates (grade, grounding, objective, difficulty,
  suitability) before display/persist; length-capped and pattern-filtered.
- No new secrets or PIN exposure. Audio is local Web Speech; no audio recorded
  or transmitted.
- Child UI never sees clinical/medical text; learning observations (incl. audio
  signals) are explicitly non-medical.

### 16. Test Plan

Scratch unit suite `scratch_test_phase6_run.js` (`node`):
- determinism: identical `(state, signal, now)` → deep-equal decision
- bounds: difficulty floor/cap, **grade ceiling (R10)**, mastery clamp, weight clamp
- **grade constraint:** objectives/activities outside the learner's grade band never selected; `gradeMatched` enforcement
- rules R1–R10 table-driven (streak sequences, repeat, support escalation, representation rotation)
- **representation selection (§7A)** incl. audio-only cap (≤2/session) and TTS-unavailable → text fallback
- **audio learner signals** persisted + deltas (§11 table)
- preference deltas and clamps
- activity contract: create/start/submit/hint/explain/complete event emissions + result schema; no correctAnswer in `getView()`
- **validator:** good LLM passthrough; malformed/wrong-type/long/forbidden/answer-leaking; **wrong grade → reject; ungrounded (no excerpt) → reject; objective alignment (ALIGN-1..4) mismatch → reject; novel terms out-of-vocab → reject; difficulty out of bounds → reject**
- **grade-vocabulary:** curated per-grade token sets testable for completeness vs generated novel terms
- fallback: injected throwing/timeout/malformed provider → curated pool; no-material objective → deterministic content, Llama disabled
- persistence: LearningStore + SchoolMaterialStore atomic write/read; profile adaptiveLearning merge
- Phase 4 + Phase 5 suites unchanged and still green (regression gate)

Scratch e2e `scratch_phase6_e2e_main.js` (`npx electron`):
- seeded completed profile + Grade 1 math material and Grade 4 science material
  (fixtures, §8B examples) → mission → activity render (audio/text_audio with
  replay) → submit with audio signals → ALE decision changes next plan/bounds →
  help flow (fallback + Llama-path when available, grounded) → validator
  rejection path → companion reactions → sessions + materials persisted →
  `screeningResults`/`readingBaseline` untouched → break suggestion at cap

### 17. Files to Create / Modify

Create (19):
| File | Purpose |
|------|---------|
| `src/services/adaptive/adaptive-config.js` | skills, grade ceilings, thresholds, deltas, rationale tags, representation registry |
| `src/services/adaptive/adaptive-engine.js` | pure decide (incl. R9/R10) + record (incl. audio signals) |
| `src/services/adaptive/objective-registry.js` | curated objectives (structured metadata: coreTerms/contextTerms, grade, materialRequired, defaults) |
| `src/services/adaptive/preference-model.js` | modality + audio weights, deltas, clamps |
| `src/services/learning/activity-contract.js` | contract + result validator (incl. audio fields, gradeMatched) |
| `src/services/learning/activity-registry.js` | `sound_detect`, `word_build`, `syllable_split`, `sentence_mc` factories |
| `src/services/learning/learning-store.js` | session persistence |
| `src/services/learning/school-material-store.js` | ingest (Phase 3 extractors), excerpts, objective links, index |
| `src/services/audio/tts-service.js` | `ITTSService` interface + `WebSpeechTTSService` (renderer) |
| `src/services/ai/ai-provider-factory.js` | provider swap point |
| `src/services/ai/content-validator.js` | §8A gates (grade / grounding / ALIGN-1..4 objective alignment / difficulty / suitability) |
| `src/services/ai/grade-vocabulary.js` | curated per-grade token sets used by ALIGN-3; bounded, testable, no model-derived vocab |
| `src/services/ai/explanation-service.js` | deterministic tier + grounded Llama tier + validation |
| `src/services/ai/explanation-fallbacks.js` | curated fallback pools |
| `src/renderer/screens/learner/mission-screen.js` | mission landing |
| `src/renderer/screens/learner/learning-activity-screen.js` | activity host + audio/replay + help wiring |
| `src/renderer/components/learning/help-panel.js` | "I don't understand" panel |
| `src/renderer/screens/parent/school-material-screen.js` | parent add material + link objectives (minimal) |
| `src/renderer/styles/learning.css` | mission/activity/help/audio styling |

Modify (8):
| File | Change |
|------|--------|
| `src/shared/profile-schema.js` | `adaptiveLearning` default + validation; `questionsReadAloud` accommodation default |
| `src/shared/ipc-channels.js` | add `LEARNING_SUBMIT_ACTIVITY`, `LEARNING_GET_HELP`, `MATERIAL_ADD`, `MATERIAL_LIST`, `MATERIAL_LINK_OBJECTIVES` |
| `src/shared/ipc-channels.cjs` | mirror |
| `preload.cjs` | `getLearningMission`, `submitLearningActivity`, `getLearningHelp`, `addSchoolMaterial`, `listSchoolMaterials`, `linkSchoolMaterialObjectives` |
| `main.js` | engine + material/learning stores + TTS-aware handlers + validator + provider factory |
| `src/renderer/app.js` | learning flow routing, activity loop, audio/TTS, companion wiring |
| `src/renderer/screens/parent/profile-overview-screen.js` | friendly practice summary tile + "Add school material" entry |
| `index.html` | link `learning.css` |

**Total: 18 created, 8 modified.** Plus 2 scratch test files.

### 18. Explicitly Deferred

- Llama: story generation (`LEARNING_GENERATE_STORY`), session digests
  (`AI_GENERATE_DIGEST`), companion LLM phrasing (§7.6), training/fine-tuning.
- School material: image OCR extraction (stub unchanged), automatic
  syllabus/curriculum parsing, Llama-driven material→objective auto-tagging
  (parent/deterministic linking instead), arbitrary subject coverage beyond
  seeded objectives, full multi-subject curriculum.
- Activities: `listen`, `show_me`, `break_it_down`, `funny_example`,
  `real_life_example` as standalone activity types, `visual_match`,
  `guided_reading`, `short_comprehension`.
- Input modes: draw / say / write / explain.
- Audio: cloud or OS-backed TTS providers, audio recording/analysis, any
  audio-based diagnosis.
- Parent analytics dashboard (Phase 7), haptics/FeedbackManager/sound (future
  polish phase), production packaging & AI auto-install, cloud AI, diagnosis.
- Nothing in Phase 6 changes scoring, screening, document extraction, or the
  companion core.

### 19. Phase 6 Task Breakdown

**6.1 Schema & Foundation**
- 6.1.1 `adaptive-config.js` (skills, grade ceilings, thresholds, tags, representations)
- 6.1.2 `objective-registry.js` (curated objectives incl. e2e fixtures)
- 6.1.3 `profile-schema.js` — `adaptiveLearning` + `questionsReadAloud` + validation
- 6.1.4 `preference-model.js` (incl. audio deltas)
- 6.1.5 `learning-store.js`
- 6.1.6 `school-material-store.js`

**6.2 Adaptive Learning Engine**
- 6.2.1 `adaptive-engine.js` — `record()` + `decide()` (pure; R1–R10, grade ceiling, representation)
- 6.2.2 unit tests: determinism, grade bounds, audio caps, rules R1–R10

**6.3 Activity & Audio System**
- 6.3.1 `activity-contract.js` (incl. audio signal fields, gradeMatched)
- 6.3.2 `activity-registry.js` — sound_detect, word_build, syllable_split, sentence_mc
- 6.3.3 `tts-service.js` — interface + Web Speech impl + fallback
- 6.3.4 activity contract + audio signal unit tests

**6.4 Content, Validation & Llama Layer**
- 6.4.1 `ai-provider-factory.js`
- 6.4.2 `content-validator.js` (§8A gates incl. ALIGN-1..4 objective alignment)
- 6.4.3 `explanation-service.js` + `explanation-fallbacks.js` (grounded tier)
- 6.4.4 `grade-vocabulary.js` (curated per-grade token sets for ALIGN-3; bounded, testable)
- 6.4.5 validation + grounding + fallback unit tests (malformed/timeout/unavailable/no-material)
- 6.4.6 ALIGN alignment unit tests (objective-metadata + excerpt-based coverage/novel/grade, fail-closed, explainable per-term verdicts)

**6.5 IPC & Main Wiring**
- 6.5.1 channels (js/cjs) + preload
- 6.5.2 `main.js` — handlers + stores + validator + persistence wiring

**6.6 Child & Parent UI**
- 6.6.1 `mission-screen.js`
- 6.6.2 `learning-activity-screen.js` (audio/replay/help) + `help-panel.js` + `learning.css`
- 6.6.3 `school-material-screen.js`
- 6.6.4 `app.js` learning flow + companion + TTS wiring
- 6.6.5 profile-overview practice summary tile + material entry; `index.html`

**6.7 Verification**
- 6.7.1 `scratch_test_phase6_run.js` — full unit gate
- 6.7.2 `scratch_phase6_e2e_main.js` — electron e2e (incl. both grade fixtures)
- 6.7.3 Re-run Phase 4 (55 unit / 31 e2e) + Phase 5 (64 unit / 21 e2e) regression

**Total: 23 tasks across 7 work streams (0 implementation work yet; task breakdown is a planning estimate; nothing is built until the full stream is complete and verified).**

---

## Phase 7: Progress Dashboard & Parent Reporting 🔲 Planned

### Tasks (High-Level)
1. Parent-facing progress view
2. Session history and statistics
3. Milestone tracking
4. Accommodation effectiveness indicators

---

## Phase 8: Multi-Modal Assistance 🔲 Planned

### Tasks (High-Level)
1. Text simplification via LLM
2. Example generation for difficult concepts
3. `HELP_SIMPLIFY` and `HELP_GET_EXAMPLE` IPC handlers

---

## Phase 9: Feedback, Telemetry & Digest 🔲 Planned

### Tasks (High-Level)
1. FeedbackManager implementation (visual + companion + optional sound)
2. Haptics integration (capability-detected, optional)
3. Session digest generation via LLM
4. `FEEDBACK_SUBMIT_SESSION` and `AI_GENERATE_DIGEST` IPC handlers
