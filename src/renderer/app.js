import { renderWelcomeScreen } from './screens/parent/welcome-screen.js';
import { renderLearnerBasicsScreen } from './screens/parent/learner-basics-screen.js';
import { renderProfileOverviewScreen } from './screens/parent/profile-overview-screen.js';
import { renderDocumentUploadScreen } from './screens/parent/document-upload-screen.js';
import { renderReviewConfirmScreen } from './screens/parent/review-confirm-screen.js';
import { renderCurriculumSelectionScreen } from './screens/parent/curriculum-selection-screen.js';
import { renderSchoolMaterialScreen } from './screens/parent/school-material-screen.js';
import { renderSchoolworkCreateScreen } from './screens/parent/schoolwork-create-screen.js';
import { renderQuestIntroScreen } from './screens/learner/quest-intro-screen.js';
import { renderTaskScreen } from './screens/learner/task-screen.js';
import { renderQuestCompleteScreen } from './screens/learner/quest-complete-screen.js';
import { renderMissionScreen } from './screens/learner/mission-screen.js';
import { renderLearningActivityScreen, FEEDBACK_DELAY_MS } from './screens/learner/learning-activity-screen.js';
import { renderLearningBreakScreen } from './screens/learner/learning-break-screen.js';
import { renderMyDayScreen } from './screens/learner/my-day-screen.js';
import { renderSchoolworkReadScreen } from './screens/learner/schoolwork-read-screen.js';
import { selectQuestTasks, getNextTask } from './../services/screening/quest-engine.js';
import { mountCompanionWidget } from './components/companion/companion-widget.js';
import { applyPresentationSettings } from './services/presentation-settings.js';

/**
 * Root Application Controller (Renderer)
 * Coordinates parent onboarding, document ingestion, screening quest, and profile management.
 */

async function initApp() {
  const root = document.getElementById('app');
  if (!root) {
    console.error('Root element #app not found in document.');
    return;
  }

  // Load existing profile from Electron storage via secure IPC bridge
  try {
    const existingProfile = await window.electronAPI.getProfile();

    // Apply the learner's saved reading/presentation preferences BEFORE any
    // screen renders, so the first paint already uses their chosen typography.
    applyPresentationSettings(existingProfile?.accommodations);

    if (existingProfile && existingProfile.name) {
      // Route: if screening not yet completed, offer the screening quest
      if (existingProfile.screeningStatus === 'completed') {
        showProfileOverview(existingProfile);
      } else {
        startScreeningFlow(existingProfile);
      }
    } else {
      startSetupFlow();
    }
  } catch (err) {
    console.error('Failed to load profile on startup:', err);
    startSetupFlow();
  }

  function showProfileOverview(profile) {
    renderProfileOverviewScreen(root, {
      profile,
      onEditProfile: (prof) => {
        renderLearnerBasicsScreen(root, {
          existingProfile: prof,
          onSaved: (saved) => {
            applyPresentationSettings(saved?.accommodations);
            showProfileOverview(saved);
          },
          onBack: () => showProfileOverview(prof)
        });
      },
      onUploadDocument: (prof) => {
        // After the parent CONFIRMS the IEP review (verified data), route into
        // curriculum + school-material setup (Phase 6 Step 1). Skipping or
        // backing out of the upload flow goes straight back to the overview.
        startDocumentFlow(prof, (finalProfile) => {
          startCurriculumSetupFlow(finalProfile, () => showProfileOverview(finalProfile));
        }, { afterConfirmOnly: true });
      },
      onSchoolMaterial: (prof) => {
        startCurriculumSetupFlow(prof, () => showProfileOverview(prof));
      },
      onStartLearning: (prof) => {
        startDailyDashboard(prof);
      },
      onResetProfile: () => {
        startSetupFlow();
      }
    });
  }

  function startSetupFlow() {
    renderWelcomeScreen(root, {
      onContinue: (authData) => {
        renderLearnerBasicsScreen(root, {
          authData,
          onSaved: (savedProfile) => {
            // After initial profile basics are saved, offer optional document
            // upload, then hand off to the child's screening quest.
            startDocumentFlow(savedProfile, (finalProfile) => {
              startScreeningFlow(finalProfile);
            });
          },
          onBack: () => {
            startSetupFlow();
          }
        });
      }
    });
  }

  function startDocumentFlow(profile, onComplete, opts = {}) {
    const finishImmediately = (finalProfile) => {
      if (onComplete) onComplete(finalProfile);
      else showProfileOverview(finalProfile);
    };
    renderDocumentUploadScreen(root, {
      profile,
      onExtractionComplete: ({ extraction, fileMeta }) => {
        renderReviewConfirmScreen(root, {
          profile,
          extractionData: extraction,
          fileMeta,
          onConfirmed: (updatedProfile) => {
            if (onComplete) onComplete(updatedProfile);
            else showProfileOverview(updatedProfile);
          },
          onBack: () => {
            startDocumentFlow(profile, onComplete, opts);
          }
        });
      },
      onSkip: () => {
        if (opts.afterConfirmOnly) showProfileOverview(profile);
        else finishImmediately(profile);
      },
      onBack: () => {
        if (opts.afterConfirmOnly) showProfileOverview(profile);
        else finishImmediately(profile);
      }
    });
  }

  /**
   * Parent curriculum + school-material setup (Phase 6 Step 1).
   * Parent picks the school system/grade/subject, then adds and verifies the
   * child's actual learning material. No learner-facing screens here — the
   * child's learning flow consumes this data in later phases.
   */
  function startCurriculumSetupFlow(profile, onComplete) {
    renderCurriculumSelectionScreen(root, {
      profile,
      onContinue: (selection) => {
        renderSchoolMaterialScreen(root, {
          profile,
          flow: selection,
          onAddSchoolwork: (materialId) => {
            startSchoolworkCreateFlow(profile, selection, materialId, (updatedProfile) => {
              if (onComplete) onComplete(updatedProfile || profile);
              else showProfileOverview(profile);
            });
          },
          onDone: () => {
            if (onComplete) onComplete(profile);
            else showProfileOverview(profile);
          },
          onBack: () => startCurriculumSetupFlow(profile, onComplete)
        });
      },
      onBack: () => {
        if (onComplete) onComplete(profile);
        else showProfileOverview(profile);
      }
    });
  }

  /**
   * Parent "Add as Schoolwork" (Phase 7.2): pick a VERIFIED material → build
   * the assignment (type + optional due date/teacher/instructions/objectives)
   * → creates a draft record → parent verifies it → it appears on My Day.
   */
  async function startSchoolworkCreateFlow(profile, flow, materialId, onComplete) {
    const listRes = await window.electronAPI.listSchoolMaterials(profile.learnerId).catch(() => null);
    const material = listRes?.materials?.find((m) => m.materialId === materialId) || null;
    if (!material) {
      showProfileOverview(profile);
      return;
    }

    // Resolve objective descriptions for the material's own curriculum slice so
    // the parent sees real labels, never guessed ids.
    let objectivesForUi = [];
    try {
      const objRes = await window.electronAPI.getCurriculumObjectives({
        curriculumId: material.curriculumId,
        grade: material.grade,
        subject: material.subject
      });
      if (objRes?.success && Array.isArray(objRes.objectives)) {
        const byId = new Map(objRes.objectives.map((o) => [o.objectiveId, o]));
        objectivesForUi = (material.linkedObjectives || [])
          .map((id) => byId.get(id))
          .filter(Boolean);
      }
    } catch (err) {
      console.error('[schoolwork] objective resolution failed (non-fatal):', err?.message);
    }

    renderSchoolworkCreateScreen(root, {
      profile,
      material: { ...material, objectives: objectivesForUi },
      flow,
      existing: null,
      onCompleted: (createdRecord) => {
        if (onComplete) onComplete(profile);
        else showProfileOverview(profile);
      },
      onBack: () => startCurriculumSetupFlow(profile, onComplete)
    });
  }

  /**
   * Learner screening quest flow.
   * Runs the child through a balanced sequence of reading tasks, persisting
   * each result via secure IPC, then finalizes the reading baseline on
   * completion. Adaptive difficulty is driven by quest-engine (deterministic).
   *
   * Emits semantic events to the companion system: the companion observes —
   * it never influences scoring or the quest sequence.
   */
  function startScreeningFlow(profile) {
    console.debug('LumiLearn Phase 1 DX: startScreeningFlow invoked', { learnerId: profile?.learnerId, name: profile?.name });
    const { tasks: questTasks } = selectQuestTasks(profile);
    const results = [];
    const usedTaskIds = new Set();
    let taskIndex = 0;

    // Companion wiring (Phase 5). The docked widget stays for the whole
    // learner flow; hero widgets mount per-screen and are disposed on screen
    // change. All events are fire-and-forget and non-blocking.
    const dockHost = document.createElement('div');
    dockHost.id = 'companion-dock-host';
    document.body.appendChild(dockHost);
    const dockWidget = mountCompanionWidget(dockHost, { variant: 'docked' });

    let heroWidget = null;
    let consecutiveWrong = 0;
    const emittedQuartiles = new Set();

    function emitCompanion(eventType, payload = {}) {
      try {
        window.electronAPI.emitCompanionEvent(eventType, {
          kind: 'screening',
          taskId: payload.taskId,
          taskIndex: payload.taskIndex,
          totalTasks: questTasks.length,
          ...payload
        });
      } catch (err) {
        // Companion is observational — failures must never disturb the child.
        console.error('Companion event emit failed (non-fatal):', err);
      }
    }

    function mountHeroCompanion(host) {
      if (!host) return;
      heroWidget = mountCompanionWidget(host, { variant: 'hero' });
    }

    function disposeHeroCompanion() {
      if (heroWidget) {
        heroWidget.dispose();
        heroWidget = null;
      }
    }

    function trackMilestones(completedCount) {
      // Celebrate at 25%/50%/75% (100% is handled by activity_completed).
      const threshold = Math.max(1, Math.ceil(questTasks.length / 4));
      if (completedCount % threshold === 0) {
        const pct = (completedCount / threshold) * 25;
        if (!emittedQuartiles.has(pct)) {
          emittedQuartiles.add(pct);
          emitCompanion('milestone_reached', {
            taskIndex: completedCount,
            totalTasks: questTasks.length
          });
        }
      }
    }

    console.info('LumiLearn Phase 1: about to render Quest Intro screen');
    console.info('Phase1-DX: About to render Quest Intro screen (startScreeningFlow)');
    console.info('Phase1-DX: Quest Intro render cycle start (startScreeningFlow)');
    console.trace('LumiLearn: trace startScreeningFlow render Quest Intro');
    renderQuestIntroScreen(root, {
      profile,
      onStart: () => {
        // The intro card (with its hero companion) is about to be replaced.
        disposeHeroCompanion();
        emitCompanion('activity_started', { taskIndex: 0, totalTasks: questTasks.length });
        renderNextTask();
      }
    });

    // Mount the hero companion after the intro screen has rendered its host.
    mountHeroCompanion(root.querySelector('#companion-hero-host'));

    function renderNextTask() {
      if (taskIndex >= questTasks.length) {
        completeQuest();
        return;
      }

      // First task per category comes from the pre-selected grade-appropriate
      // quest list; later tasks in the same category are adaptively chosen
      // based on recent performance in that category. Both paths return options
      // already reordered by quest-engine, so the answer key is not pinned to a
      // fixed position.
      const slot = questTasks[taskIndex];
      const hasPriorInCategory = results.some(r => r.category === slot.category);

      let task = slot;
      if (hasPriorInCategory) {
        const { task: adapted } = getNextTask(slot.category, results, [...usedTaskIds]);
        if (adapted) task = adapted;
      }

      renderTaskScreen(root, {
        profile,
        task,
        currentIndex: taskIndex,
        totalTasks: questTasks.length,
        onAnswer: async (payload) => {
          results.push({
            taskId: task.id,
            category: task.category,
            difficulty: task.difficulty,
            prompt: task.prompt,
            type: task.type,
            selectedAnswer: payload.selectedAnswer,
            correctAnswer: task.correctAnswer,
            isCorrect: payload.isCorrect,
            responseTimeMs: payload.responseTimeMs,
            attemptedAt: payload.attemptedAt || new Date().toISOString()
          });
          usedTaskIds.add(task.id);

          // Companion reactions to the answer (observational only).
          if (payload.isCorrect) {
            consecutiveWrong = 0;
            emitCompanion('answer_correct', { taskIndex: taskIndex + 1 });
          } else {
            consecutiveWrong += 1;
            emitCompanion('answer_incorrect', { taskIndex: taskIndex + 1 });
            if (consecutiveWrong >= 3) {
              emitCompanion('learner_struggling', { taskIndex: taskIndex + 1 });
              consecutiveWrong = 0;
            }
          }

          // Persist each result via secure IPC. Failures are logged but never
          // block the child's progress (non-punitive).
          try {
            await window.electronAPI.submitScreeningTask(payload);
          } catch (err) {
            console.error('Failed to persist screening task result:', err);
          }

          taskIndex += 1;
          trackMilestones(taskIndex);
          renderNextTask();
        }
      });
    }

    async function completeQuest() {
      try {
        const res = await window.electronAPI.completeScreeningQuest();
        const updatedProfile = res.success ? res.profile : profile;
        const summary = res.success ? res.summary : fallbackSummary(results);

        emitCompanion('activity_completed', { taskIndex: questTasks.length });

        renderQuestCompleteScreen(root, {
          profile: updatedProfile,
          summary,
          onFinish: () => {
            disposeCompanion();
            showProfileOverview(updatedProfile);
          }
        });
      } catch (err) {
        console.error('Failed to complete screening quest:', err);
        disposeCompanion();
        renderQuestCompleteScreen(root, {
          profile,
          summary: fallbackSummary(results),
          onFinish: () => showProfileOverview(profile)
        });
      }
    }

    function disposeCompanion() {
      disposeHeroCompanion();
      if (dockWidget) dockWidget.dispose();
      dockHost.remove();
    }
  }

  /**
   * My Day dashboard (Phase 7.1) — child daily home.
   * Renders the read-only view model from main and hands off to the existing
   * learning flow for Today's Practice. The ALE decides the plan and when the
   * day is done; returning from a finished mission comes back here.
   */
  async function startDailyDashboard(profile) {
    const render = async (prof) => {
      const res = await window.electronAPI.getDailyDashboard();
      if (!res?.success || !res.dashboard) {
        console.error('My Day unavailable:', res?.error);
        showProfileOverview(prof || profile);
        return;
      }
      renderMyDayScreen(root, {
        profile: prof || profile,
        dashboard: res.dashboard,
        onStartPractice: () => {
          startLearningFlow(prof || profile, { onHome: (updated) => render(updated) });
        },
        onStartSchoolwork: (schoolworkId) => {
          startSchoolworkFlow(prof || profile, { schoolworkId, onHome: (updated) => render(updated) });
        },
        onBackToProfile: () => {
          showProfileOverview(prof || profile);
        }
      });
    };

    render(profile);
  }

  /**
   * Hold the learner on the answer they just gave for FEEDBACK_DELAY_MS so the
   * feedback is actually seen before the next activity replaces it. The
   * activity screen has already painted main's verdict when this runs; the
   * advance happens once the dwell is over.
   * @returns {Promise<void>}
   */
  function settleFeedback() {
    return new Promise((resolve) => setTimeout(resolve, FEEDBACK_DELAY_MS));
  }

  /**
   * Learner adaptive learning flow (Phase 6 Step 2).
   * Mission landing → activity loop → break/celebration. Every plan, result
   * judgment, and state update happens main-side (ALE + ground truth);
   * this renderer loop only renders renderer-safe specs and forwards
   * submissions. Companion reactions reuse the Phase 5 event path.
   */
  async function startLearningFlow(profile, { onHome } = {}) {
    const GOAL_ACTIVITIES = 8;
    let completedCount = 0;
    let flowActive = true;

    // Companion dock + hero hosts (Phase 5 pattern, reused unchanged).
    const dockHost = document.createElement('div');
    dockHost.id = 'companion-dock-host';
    document.body.appendChild(dockHost);
    const dockWidget = mountCompanionWidget(dockHost, { variant: 'docked' });

    let heroWidget = null;
    let consecutiveWrong = 0;

    function emitCompanion(eventType, payload = {}) {
      try {
        window.electronAPI.emitCompanionEvent(eventType, { kind: 'learning', ...payload });
      } catch (err) {
        console.error('Companion event emit failed (non-fatal):', err);
      }
    }

    function mountHeroCompanion(host) {
      if (!host) return;
      heroWidget = mountCompanionWidget(host, { variant: 'hero' });
    }

    function disposeHeroCompanion() {
      if (heroWidget) {
        heroWidget.dispose();
        heroWidget = null;
      }
    }

    function disposeCompanion() {
      disposeHeroCompanion();
      if (dockWidget) dockWidget.dispose();
      dockHost.remove();
    }

    function returnHome(updatedProfile, deactivated = false) {
      if (!flowActive) return;
      flowActive = false;
      if (!deactivated) disposeCompanion();
      if (typeof onHome === 'function') {
        onHome(updatedProfile || profile);
      } else {
        showProfileOverview(updatedProfile || profile);
      }
    }

    const firstMission = await window.electronAPI.getLearningMission();

    if (!firstMission?.success) {
      console.error('Learning mission unavailable:', firstMission?.error);
      returnHome(profile);
      return;
    }

    if (firstMission.suggestion === 'screen_first' || firstMission.suggestion === 'parent_redirect') {
      // No mission possible (no profile / screening incomplete): back home.
      returnHome(profile);
      return;
    }

    if (firstMission.suggestion === 'break' || !firstMission.plan) {
      renderLearningBreakScreen(root, {
        profile,
        summary: firstMission.summary || { totalActivities: 0 },
        onFinish: () => returnHome(profile)
      });
      return;
    }

    renderMissionScreen(root, {
      profile,
      mission: {
        plan: firstMission.plan,
        goalActivities: GOAL_ACTIVITIES,
        companionName: ''
      },
      onStart: () => {
        disposeHeroCompanion();
        emitCompanion('activity_started', {});
        renderActivity(firstMission.plan);
      }
    });
    mountHeroCompanion(root.querySelector('#companion-hero-host'));

    function renderActivity(plan) {
      // The single main-side response for THIS activity. The screen hands it
      // back through onAdvance (after it has painted the feedback), so the
      // dwell and the advance are sequenced exactly once per activity.
      let pendingResponse = null;

      renderLearningActivityScreen(root, {
        profile,
        plan,
        completedCount,
        goalActivities: GOAL_ACTIVITIES,
        onSubmit: async (payload) => {
          const res = await window.electronAPI.submitLearningActivity(payload);
          if (!res?.success) {
            console.error('Activity submission rejected:', res?.error);
            return undefined;
          }
          trackAnswerCompanion(payload, res.result);
          pendingResponse = res;
          return res.result;
        },
        onTimeoutSubmit: async (payload) => {
          const res = await window.electronAPI.submitLearningActivity(payload);
          if (!res?.success) {
            console.error('Timeout submission rejected:', res?.error);
            return undefined;
          }
          pendingResponse = res;
          return res.result;
        },
        onAdvance: async () => {
          const res = pendingResponse;
          pendingResponse = null;
          await settleFeedback();
          if (res) advance(res);
        },
        onEvent: (eventType, extra) => {
          emitCompanion(eventType, extra);
        }
      });
    }

    function trackAnswerCompanion(payload, result) {
      if (result?.outcome === 'success') {
        consecutiveWrong = 0;
        // Recovery: the learner answered correctly after more than one attempt.
        // The main-side result is authoritative for `attempts`, so this is a
        // fact about what happened, not a judgement about the child.
        if (Number(result?.attempts) > 1) {
          emitCompanion('self_corrected', {});
        } else {
          emitCompanion('answer_correct', {});
        }
      } else if (result?.outcome === 'help_success') {
        consecutiveWrong = 0;
        emitCompanion('answer_correct', {});
      } else {
        consecutiveWrong += 1;
        emitCompanion('answer_incorrect', {});
        if (consecutiveWrong >= 3) {
          emitCompanion('learner_struggling', {});
          consecutiveWrong = 0;
        }
      }
      void payload;
    }

    async function advance(res) {
      completedCount += 1;

      const next = res.next;
      if (!next?.plan || next.suggestion === 'break') {
        emitCompanion('activity_completed', {});
        // A mission milestone is a real celebration moment and was previously
        // reachable only in screening — `celebrating` could never fire here.
        emitCompanion('milestone_reached', { completed: completedCount });
        renderLearningBreakScreen(root, {
          profile,
          summary: { totalActivities: completedCount },
          onFinish: () => returnHome(profile)
        });
        return;
      }

      renderActivity(next.plan);
    }
  }

  /**
   * Schoolwork session flow (Phase 7.2) — a VERIFIED parent-created
   * assignment, run as a second, scoped learning flow.
   *
   * Interactive assignment → the SAME child activity host as the ALE mission
   * (reusing help, audio, and companion events unchanged) with submissions
   * sent to the schoolwork session layer main-side; the agenda is bounded to
   * the assignment's own linked objectives.
   *
   * Assignment with no mappable objective → the honest reading screen (bounded
   * material excerpts, no evaluator, no invented signals).
   */
  async function startSchoolworkFlow(profile, { schoolworkId, onHome }) {
    const emerged = await window.electronAPI.startSchoolworkSession({
      learnerId: profile.learnerId,
      schoolworkId
    });

    if (!emerged?.success) {
      console.error('Schoolwork unavailable:', emerged?.error);
      home();
      return;
    }

    const session = emerged;
    let flowActive = true;
    let consecutiveWrong = 0;

    // Reading mode: nothing to evaluate — full-stop comprehension screen.
    if (session.mode === 'reading') {
      const close = () => {
        if (!flowActive) return;
        flowActive = false;
        if (typeof onHome === 'function') onHome(profile);
        else showProfileOverview(profile);
      };
      renderSchoolworkReadScreen(root, {
        profile,
        schoolwork: session.schoolwork,
        material: session.material,
        onFinish: async () => {
          const res = await window.electronAPI.finishSchoolworkReading({
            learnerId: profile.learnerId,
            schoolworkId
          }).catch(() => null);
          if (!res?.success) console.error('Reading completion failed:', res?.error);
          close();
        },
        onBack: () => {
          window.electronAPI.clearSchoolworkSession(profile.learnerId).catch(() => {});
          close();
        }
      });
      return;
    }

    // Interactive mode reuses the existing activity host + companion wiring.
    function home() {
      if (flowActive) { flowActive = false; disposeCompanion(); }
      window.electronAPI.clearSchoolworkSession(profile.learnerId).catch(() => {});
      if (typeof onHome === 'function') onHome(profile);
      else showProfileOverview(profile);
    }

    const dockHost = document.createElement('div');
    dockHost.id = 'companion-dock-host';
    document.body.appendChild(dockHost);
    const dockWidget = mountCompanionWidget(dockHost, { variant: 'docked' });

    let heroWidget = null;

    function emitCompanion(eventType, payload = {}) {
      try {
        window.electronAPI.emitCompanionEvent(eventType, { kind: 'schoolwork', ...payload });
      } catch (err) {
        console.error('Companion event emit failed (non-fatal):', err);
      }
    }

    function mountHeroCompanion(host) {
      if (!host) return;
      heroWidget = mountCompanionWidget(host, { variant: 'hero' });
    }

    function disposeHeroCompanion() {
      if (heroWidget) { heroWidget.dispose(); heroWidget = null; }
    }

    function disposeCompanion() {
      disposeHeroCompanion();
      if (dockWidget) dockWidget.dispose();
      dockHost.remove();
    }

    function renderActivity(plan) {
      // Same sequencing as the mission flow: main's verdict paints the
      // feedback first, then this advance fires after the dwell.
      let pendingResponse = null;

      renderLearningActivityScreen(root, {
        profile,
        plan,
        completedCount: 0,
        goalActivities: session.activityTotal || 8,
        onSubmit: async (payload) => {
          const res = await window.electronAPI.submitSchoolworkActivity(payload);
          if (!res?.success) {
            console.error('Schoolwork submission rejected:', res?.error);
            return undefined;
          }
          trackAnswerCompanion(res.result);
          pendingResponse = res;
          return res.result;
        },
        onTimeoutSubmit: async (payload) => {
          const res = await window.electronAPI.submitSchoolworkActivity(payload);
          if (!res?.success) {
            console.error('Schoolwork timeout submission rejected:', res?.error);
            return undefined;
          }
          pendingResponse = res;
          return res.result;
        },
        onAdvance: async () => {
          const res = pendingResponse;
          pendingResponse = null;
          await settleFeedback();
          if (res) advance(res);
        },
        onEvent: (eventType, extra) => {
          emitCompanion(eventType, extra);
        }
      });
    }

    function trackAnswerCompanion(result) {
      if (result?.outcome === 'success' || result?.outcome === 'help_success') {
        consecutiveWrong = 0;
        emitCompanion('answer_correct', {});
      } else {
        consecutiveWrong += 1;
        emitCompanion('answer_incorrect', {});
        if (consecutiveWrong >= 3) {
          emitCompanion('learner_struggling', {});
          consecutiveWrong = 0;
        }
      }
    }

    function advance(res) {
      if (res.schoolworkDone || !res.next?.plan) {
        emitCompanion('activity_completed', {});
        home();
        return;
      }
      renderActivity(res.next.plan);
    }

    emitCompanion('activity_started', {});
    renderActivity(session.plan);
  }

  function fallbackSummary(results) {
    const correct = results.filter(r => r.isCorrect).length;
    return {
      totalTasks: results.length,
      correctAnswers: correct,
      accuracy: results.length > 0 ? correct / results.length : 0,
      categoriesCovered: [],
      strugglingCategories: [],
      completedAt: new Date().toISOString()
    };
  }
}

// Bootstrap on DOM readiness
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
