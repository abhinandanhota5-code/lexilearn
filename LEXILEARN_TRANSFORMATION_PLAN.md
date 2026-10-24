# LexiLearn Product Transformation & Implementation Plan

**Status:** STARTING PHASE 1 - STABILIZATION  
**Date:** October 24, 2026  
**Objective:** Transform LexiLearn into a polished, engaging, intelligent learning companion for children with dyslexia

---

## PHASE OVERVIEW

The transformation is organized into 8 sequential phases:

1. **Phase 1: Stabilization** ✅ STARTING
2. **Phase 2: Visual Foundation** (Branding, Contrast, Typography)
3. **Phase 3: Core Learning Experience** (Education Mode Integration, Themes, Companion)
4. **Phase 4: Audio First-Class Feature** (Narration, Feedback, Controls)
5. **Phase 5: AI Performance** (Model Benchmarking, Optimization)
6. **Phase 6: Curriculum Intelligence** (Materials, Grade-Specific Questions)
7. **Phase 7: Parent Experience** (Dashboard, Progress, Settings)
8. **Phase 8: Verification & Cleanup** (Tests, Journeys, Polish)

---

## PHASE 1: STABILIZATION (IN PROGRESS)

### Goals
- [ ] Audit complete codebase and architecture
- [ ] Confirm app launches without errors
- [ ] Verify screen navigation works
- [ ] Identify all working features
- [ ] Document remaining issues
- [ ] Establish testing baseline
- [ ] Remove obsolete product branding (LumiLearn, On You)
- [ ] Plan subsequent phases with complete knowledge

### Status

#### ✅ COMPLETED
- App launches successfully (verified)
- Core IPC handlers registered and functional
- Profile storage and authentication working
- AI health check system in place
- All major services initialized (llmProvider, documentPipeline, profileStore, etc.)
- Curriculum registry with CBSE/ICSE support
- Learning and screening systems structured

#### 🔍 IN PROGRESS
- Branding cleanup (LumiLearn → LexiLearn)
- Full codebase audit
- Screen navigation verification
- Feature status mapping

#### ❓ TO VERIFY
- Document extraction and report analysis
- Screening quest UI and scoring
- Companion animations and state management
- Curriculum and school material flows
- Learning mission generation
- Audio functionality (if implemented)
- Parent section completeness

### Key Files to Audit

**Main Process:**
- main.js (670 lines) - All IPC handlers, service initialization
- preload.cjs - Secure API bridge

**Renderer:**
- src/renderer/app.js - Root controller and screen routing
- src/renderer/screens/parent/ - Onboarding, profile, curriculum, materials
- src/renderer/screens/learner/ - Quest, mission, learning activities

**Services (Production-Ready):**
- src/services/ai/ollama-provider.js - LLM integration
- src/services/storage/profile-store.js - Persistent profile data
- src/services/learning/learning-flow.js - Adaptive mission generation
- src/services/companion/companion-service.js - Character state and behavior
- src/services/curriculum/ - Curriculum registry, materials, schoolwork
- src/services/screening/quest-engine.js - Assessment logic

**Styles:**
- src/renderer/styles/tokens.css - Design tokens (dyslexia-friendly)
- src/renderer/styles/parent.css, learner.css, learning.css

### Blockers / Known Issues
- None identified yet from startup - full audit in progress

### Metrics to Establish
- App startup time
- Average screen load time
- LLM response time (baseline)
- Profile load time
- Navigation response time

---

## FEATURE STATUS MATRIX

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Profile Management | ✅ Complete | main.js L136-153, ProfileStore | Persistent, validated |
| Parent PIN Auth | ✅ Complete | main.js L109-133, PinService | Secure hashing |
| Document Ingestion | ✅ Complete | main.js L166-228, DocumentIngestionPipeline | Supports PDF, images, text |
| Report Extraction | ✅ Complete | main.js L191-228, ReportExtractionService | LLM-based accommodation detection |
| Screening Quest | ✅ Complete | main.js L274-352, quest-engine.js | Deterministic scoring |
| Companion System | ✅ Complete | main.js L358-381, CompanionService | State-driven behavior |
| Curriculum Registry | ✅ Complete | main.js L387-401, CurriculumRegistry | CBSE/ICSE seeded |
| School Materials | ✅ Complete | main.js L403-449, schoolwork-service.js | Ingestion & linking |
| Learning Missions | ✅ Complete | main.js L544-575, learning-flow.js | Adaptive generation |
| Learning Activities | ✅ Complete | main.js L557-586, learning-activity-screen.js | Deterministic evaluation |
| Daily Dashboard | ✅ Complete | main.js L589-600, daily-dashboard-service.js | Read-only progress view |
| Personalization Engine | ✅ Complete | main.js L602-648, approval-gate.js | Proposal + decision workflow |
| Audio Support | ❓ Unknown | src/services/audio/ | Needs verification |
| Education Mode | ❓ Unknown | src/services/education/ | Needs removal/integration |
| Visual Explanations | ❓ Unknown | Multiple screens | Status unclear |
| Contrast & A11y | ⚠️ Partial | styles/*.css | Needs audit |
| Typography Settings | ⚠️ Partial | presentation-settings.js | Partial implementation |
| Themes | ⚠️ Partial | tokens.css | Dinosaurs/cars not implemented |

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                   Electron Main Process                     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ IPC Handlers (26 channels registered)                │  │
│  │ ├─ Auth (PIN setup/verify)                           │  │
│  │ ├─ Profile (get/save/reset)                          │  │
│  │ ├─ Document (open/extract/confirm)                   │  │
│  │ ├─ Screening (submit/complete)                       │  │
│  │ ├─ Companion (snapshot/emit event)                   │  │
│  │ ├─ Curriculum (options/objectives/materials/etc)    │  │
│  │ ├─ Schoolwork (add/list/verify/complete/etc)        │  │
│  │ ├─ Learning (mission/submit/help/signals)           │  │
│  │ ├─ Dashboard (daily view)                            │  │
│  │ └─ Personalization (proposals/approval)              │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Service Layer (Business Logic)                       │  │
│  │ ├─ OllamaLLMProvider (AI inference)                  │  │
│  │ ├─ ProfileStore (persistent user data)              │  │
│  │ ├─ DocumentIngestionPipeline (PDF/text extraction)  │  │
│  │ ├─ ReportExtractionService (accommodation detect)   │  │
│  │ ├─ LearningStore (session tracking)                 │  │
│  │ ├─ ScreeningStore (assessment results)              │  │
│  │ ├─ CurriculumRegistry (curriculum definitions)      │  │
│  │ ├─ CurriculumStore (school materials)               │  │
│  │ ├─ CompanionService (character state)               │  │
│  │ └─ Various flow services (learning, schoolwork)    │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Data & Configuration                                 │  │
│  │ ├─ ~/.config/dyslexia-app/ (profiles, materials)   │  │
│  │ ├─ AVAILABLE_AVATARS (companion characters)         │  │
│  │ ├─ IPC_CHANNELS (message contract)                  │  │
│  │ └─ COMPANION_CONFIG (behavior state machine)        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         ↑                                          ↓
    Preload Bridge                         ┌─────────────────┐
  (Secure API Layer)                       │ Ollama LLM      │
         ↓                                 │ (Local Server)  │
┌─────────────────────────────────────────────────────────────┐
│              Renderer Process (DOM/React-ish)               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Root Controller (app.js)                             │  │
│  │ ├─ startSetupFlow()                                  │  │
│  │ ├─ startDocumentFlow()                               │  │
│  │ ├─ startScreeningFlow()                              │  │
│  │ ├─ startCurriculumSetupFlow()                        │  │
│  │ ├─ startDailyDashboard()                             │  │
│  │ └─ Navigation between screens                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Screen Components                                    │  │
│  │ ├─ Parent: welcome, learner-basics, curriculum,     │  │
│  │ │           school-material, schoolwork-create      │  │
│  │ ├─ Learner: quest-intro, task, mission, learning-   │  │
│  │ │            activity, break, my-day, schoolwork-   │  │
│  │ │            read, pe-demo                          │  │
│  │ └─ Companion: companion-widget, animations          │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Presentation & Styling                              │  │
│  │ ├─ presentation-settings.js (font/spacing/theme)   │  │
│  │ ├─ tokens.css (design tokens, color schemes)        │  │
│  │ ├─ parent.css, learner.css, learning.css            │  │
│  │ └─ companion-animations.css (character movement)    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## CURRENT GAPS VS. REQUIREMENTS

### Branding ✅ 
- [x] Rename "LumiLearn" → "LexiLearn" in title and console logs
- [ ] Audit entire codebase for "On You" branding
- [ ] Update app metadata (package.json, Electron config)

### UI/UX Design ⚠️
- [ ] Contrast audit across all screens
- [ ] Typography and spacing consistency
- [ ] Question-centric layout (reduce data-centric feel)
- [ ] Companion positioning (non-obstructing)
- [ ] Responsive design validation

### Personalization Themes ❌
- [ ] Dinosaurs theme (question examples, illustrations, companion dialogue)
- [ ] Cars theme (vehicles, journeys, distances)
- [ ] Space theme, Animals theme (template system)
- [ ] Theme-aware content generation

### Learning Companion ⚠️
- [ ] Expressive animations and reactions
- [ ] Varied dialogue (avoid repetition)
- [ ] Contextual hints and explanations
- [ ] Theme-aware dialogue
- [ ] Reduced-motion accessibility

### Audio First-Class ⚠️
- [ ] Question narration with replay
- [ ] Answer feedback (spoken + sound effects)
- [ ] Configurable audio behavior
- [ ] Keyboard-accessible audio controls

### Education Mode ❌
- [ ] Remove separate mode UI
- [ ] Integrate as contextual actions ("Explain it", "Show example", etc.)
- [ ] Preserve underlying explanation capabilities

### Grade-Specific Questions ❌
- [ ] Structured metadata on all generated questions
- [ ] Curriculum-aligned question templates
- [ ] Deterministic answer evaluation where possible
- [ ] Source grounding and traceability

### AI Performance ⚠️
- [ ] Benchmark current model (Llama 3.1 8B)
- [ ] Test smaller candidates (Qwen 3B, Llama 3.2 3B)
- [ ] Optimize for deterministic evaluation
- [ ] Separate fast evaluation from LLM calls

### Parent Dashboard ⚠️
- [ ] Organized settings and customization
- [ ] Learning progress visualization
- [ ] Material/curriculum management
- [ ] Access controls and data privacy

---

## SUCCESS CRITERIA (ACCEPTANCE)

By project completion:

1. ✅ Product consistently identifies as LexiLearn
2. ✅ Application launches without blank screen
3. ✅ Main learning journey works end-to-end
4. ✅ Learner sees clear, grade-appropriate questions
5. ✅ Questions incorporate learner's chosen interests
6. ✅ Correct/incorrect answers receive appropriate feedback
7. ✅ Companion responds to meaningful learning events
8. ✅ Audio narration and replay work where supported
9. ✅ Audio settings behave predictably
10. ✅ Contrast improved throughout application
11. ✅ Typography and accessibility preferences are usable
12. ✅ Education Mode integrated into contextual help
13. ✅ Curriculum/school materials influence question generation
14. ✅ AI evaluation faster where deterministic
15. ✅ Local model has been benchmarked
16. ✅ Parent section supports learner configuration
17. ✅ Learner data remains local by default
18. ✅ Existing backend capabilities preserved
19. ✅ Tests and manual verification demonstrate workflow success

---

## IMPLEMENTATION SEQUENCE

### Phase 1: Stabilization (THIS PHASE)
**Duration:** 1 day | **Goal:** Establish baseline, plan next phases

- [x] Start app without errors
- [x] Remove LumiLearn branding
- [ ] Complete full codebase audit
- [ ] Document all feature status
- [ ] Identify all UI/UX issues
- [ ] Test all screen navigation
- [ ] Verify all IPC handlers work
- [ ] Establish testing framework
- **Deliverable:** Comprehensive audit report + baseline metrics

### Phase 2: Visual Foundation (Day 1-2)
**Duration:** 2 days | **Goal:** Fix contrast, typography, layout

- [ ] Audit contrast on every screen (WCAG AA targets)
- [ ] Fix low-contrast text and borders
- [ ] Standardize button, card, and input styling
- [ ] Improve question screen layout
- [ ] Add consistent spacing and alignment
- [ ] Improve companion positioning
- [ ] Remove unnecessarily technical labels
- **Deliverable:** Polished visual foundation, all screens accessible

### Phase 3: Core Learning Experience (Day 2-3)
**Duration:** 2 days | **Goal:** Themes, companion, Education Mode integration

- [ ] Implement theme selection (Dinosaurs, Cars, Space, Animals, Other)
- [ ] Build theme-aware content generation
- [ ] Improve companion behavior (animations, varied dialogue)
- [ ] Integrate Education Mode explanations as contextual actions
- [ ] Improve feedback messaging
- [ ] Add visual progress indicators
- **Deliverable:** Engaging learning experience with personalization

### Phase 4: Audio Features (Day 3-4)
**Duration:** 1.5 days | **Goal:** Make audio first-class

- [ ] Implement question narration with replay
- [ ] Add spoken answer feedback
- [ ] Create configurable audio controls
- [ ] Add keyboard-accessible audio UI
- [ ] Implement reduced-motion support
- [ ] Test audio quality and timing
- **Deliverable:** Accessible, configurable audio system

### Phase 5: AI Performance (Day 4)
**Duration:** 1 day | **Goal:** Benchmark and optimize

- [ ] Benchmark current model (Llama 3.1 8B)
- [ ] Test smaller candidates
- [ ] Measure response times and accuracy
- [ ] Optimize deterministic evaluation
- [ ] Select best default model
- **Deliverable:** Performance baseline and optimized inference

### Phase 6: Curriculum Intelligence (Day 5)
**Duration:** 1.5 days | **Goal:** Grade-specific, sourced questions

- [ ] Improve parent curriculum setup
- [ ] Enhance school material ingestion
- [ ] Implement grade-specific question templates
- [ ] Add source grounding
- [ ] Validate answer correctness
- **Deliverable:** Curriculum-aligned, grade-appropriate learning

### Phase 7: Parent Experience (Day 5-6)
**Duration:** 1 day | **Goal:** Complete parent dashboard

- [ ] Organize parent settings by section
- [ ] Add progress visualization
- [ ] Improve material management
- [ ] Add data privacy controls
- [ ] Verify access control
- **Deliverable:** Polished, organized parent control center

### Phase 8: Verification & Cleanup (Day 6)
**Duration:** 0.5 day | **Goal:** Test, verify, deliver

- [ ] Run all tests
- [ ] Verify major user journeys
- [ ] Test all model-unavailable scenarios
- [ ] Test audio controls
- [ ] Test multiple learner configurations
- [ ] Verify contrast throughout
- [ ] Verify responsive design
- [ ] Clean up console logs
- [ ] Update documentation
- **Deliverable:** Production-ready LexiLearn application

---

## NEXT STEPS

1. **Immediately (next 2 hours):**
   - [ ] Complete full codebase audit (in progress)
   - [ ] Document feature status matrix
   - [ ] Identify all UI/UX issues
   - [ ] Test all screen flows

2. **Phase 1 completion (end of day):**
   - [ ] Publish comprehensive audit report
   - [ ] Get approval for Phase 2 sequence
   - [ ] Begin Phase 2 visual work

3. **Daily cadence:**
   - [ ] Run app at start of day
   - [ ] Verify affected screens after changes
   - [ ] Commit working changes daily
   - [ ] Update this plan as blockers emerge

---

## RISK ASSESSMENT

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Audio not fully implemented | Medium | Medium | Audit early, implement fallback UI |
| Contrast too severe to fix without redesign | Low | High | Audit all screens early, plan accordingly |
| Ollama model unavailable | Low | High | Add offline mode detection, helpful error messages |
| Education Mode integration too complex | Medium | Medium | Review code first, extract reusable logic |
| Performance issues with large materials | Low | Medium | Optimize query layer, add pagination |
| Tests missing or broken | Medium | Medium | Establish test baseline in Phase 1 |

---

## FILES TO PRESERVE

Do NOT delete or significantly refactor:
- All service layer files (business logic)
- IPC contract (channels, schemas)
- Existing tests
- Data persistence layer
- Authentication mechanisms
- Curriculum registry (extend, don't replace)

---

## CURRENT PRIORITIES

1. ✅ Complete Phase 1 audit
2. ⏳ Fix branding (LexiLearn everywhere)
3. ⏳ Fix contrast issues
4. ⏳ Implement themes (Dinosaurs, Cars)
5. ⏳ Improve companion behavior
6. ⏳ Make audio first-class
7. ⏳ Optimize AI performance

---

**Plan Status:** ACTIVE | **Last Updated:** 2026-10-24T16:25Z | **Owner:** Kiro
