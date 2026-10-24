/**
 * Schoolwork Session (Phase 7.2) — connects a VERIFIED schoolwork assignment
 * to the EXISTING activity/help/visual/evaluator/ALE systems.
 *
 * Product boundary (enforced here, fail-closed):
 *  - The assignment is school-provided work. This layer builds a FIXED,
 *    bounded agenda from the assignment's linked objectives — the ALE's
 *    `decide` is NEVER asked to expand or rewrite the assignment.
 *  - Every activity still goes through the SAME contract the ALE mission uses:
 *      buildActivitySpec (deterministic content + main-side answer key)
 *      judgeSelection / buildOutcome (the existing evaluator)
 *      aleRecordOutcome        (the existing learning-signal interface — the
 *                               only writer of ALE skill/preference state)
 *    so completed schoolwork produces real learning signals the existing ALE
 *    can consume for future practice. No second evaluator, no second engine.
 *  - Help and visual signals RE-USE the existing read paths in learning-flow
 *    via `setActiveSessionContext` (deterministic tier, grounded "make
 *    simpler", and the visual explanation layer see the current activity
 *    exactly as in the ALE flow).
 *  - An assignment with NO mappable learning objective is served honestly as
 *    a READING task (bounded material excerpts, no fabricated evaluation, no
 *    invented learning signal).
 *
 * Pure/deterministic where possible: the only wall-clock read is timestamp
 * injection (session ids follow the ALE's `learning_<ts>` convention).
 */

import { GRADE_CEILING, SKILL_BY_ID } from '../adaptive/adaptive-config.js';
import {
  createLearningSession,
  recordOutcome as aleRecordOutcome,
  buildAdaptationContext,
  ensureSkillState,
  pickRepresentation,
  activityTypeFor,
  fnv1a
} from '../adaptive/adaptive-engine.js';
import { OBJECTIVE_BY_ID } from '../adaptive/objective-registry.js';
import { buildActivitySpec, toRendererSpec } from './activity-registry.js';
import {
  validateSubmissionPayload,
  judgeSelection,
  buildOutcome
} from './activity-contract.js';
import { resolveObjectiveGradeBounds, clampDifficultyToBounds } from '../curriculum/grade-difficulty.js';
import { createDefaultAdaptiveLearning } from '../../shared/profile-schema.js';
import { buildMaterialsByObjective, CURRICULUM_OBJECTIVE_ALIASES, setActiveSessionContext, clearActiveSessionContext } from './learning-flow.js';
import {
  getSchoolwork as loadSchoolwork,
  completeSchoolwork,
  toSchoolworkChildView
} from '../curriculum/schoolwork-service.js';

/** Bound on how many activities a schoolwork agenda may spawn. */
const MAX_SCHOOLWORK_PLANS = 8;

/** Help options exposed on every schoolwork activity (existing vocabulary). */
const SCHOOLWORK_HELP_OPTIONS = [
  'show_me', 'tell_me', 'break_it_down', 'give_example', 'make_simpler',
  'funny_example', 'real_life_example'
];

/**
 * In-memory schoolwork agendas keyed by learnerId. A schoolwork session is a
 * bounded, single-child flow; only one exists per learner at a time.
 * @type {Map<string, object>}
 */
const agendas = new Map();

/* ───────────────────────── helpers ───────────────────────── */

function nowIso() {
  return new Date().toISOString();
}

function resolveAleObjectiveId(objectiveId) {
  if (OBJECTIVE_BY_ID[objectiveId]) return objectiveId;
  return CURRICULUM_OBJECTIVE_ALIASES[objectiveId] || null;
}

function skillForObjective(objectiveId) {
  const o = OBJECTIVE_BY_ID[objectiveId];
  if (!o || !Array.isArray(o.targetSkills) || o.targetSkills.length === 0) return null;
  return o.targetSkills[0];
}

function activityTitleForSkill(skillId) {
  const skill = SKILL_BY_ID[skillId];
  return skill ? skill.label : 'Practice';
}

function adaptiveBlockOf(profile) {
  return {
    skills: profile?.adaptiveLearning?.skills || {},
    preferences: profile?.adaptiveLearning?.preferences || undefined,
    meta: profile?.adaptiveLearning?.meta || null
  };
}

async function loadVerifiedMaterial(materialStore, learnerId, materialId) {
  if (!materialStore || typeof materialStore.loadMaterials !== 'function') {
    return { ok: false, error: 'Curriculum store is not available.' };
  }
  const loaded = await materialStore.loadMaterials(learnerId);
  if (loaded.invalid.length > 0) {
    return { ok: false, error: 'Stored school material data is invalid and cannot be read.' };
  }
  const material = loaded.materials.find((m) => m.materialId === materialId);
  if (!material) {
    return { ok: false, error: `Material "${materialId}" was not found for this learner.` };
  }
  if (material.verificationStatus !== 'verified') {
    return { ok: false, error: 'Only verified school material can be worked on.' };
  }
  return { ok: true, material };
}

function materialExcerpts(material) {
  const chunks = Array.isArray(material?.excerptChunks) ? material.excerptChunks : [];
  // Bounded already by the model (≤ 8 × 400 chars); belt-and-braces cap.
  return chunks.slice(0, 8);
}

/* ───────────────────────── start ───────────────────────── */

/**
 * START_SCHOOLWORK_SESSION: load the verified assignment + its material,
 * resolve the mappable objectives, build the fixed agenda, and serve the first
 * activity (or the reading view when nothing is mappable).
 *
 * @param {object} deps { profileStore, learningStore, materialStore }
 * @param {object} input { learnerId, schoolworkId }
 * @returns {Promise<object>}
 */
export async function startSchoolworkSession(deps, input) {
  const { profileStore, learningStore, materialStore } = deps || {};
  try {
    if (!profileStore || typeof profileStore.getProfile !== 'function') {
      return { success: false, error: 'Profile store is not available.' };
    }
    if (!input || typeof input !== 'object') {
      return { success: false, error: 'A schoolwork session payload is required.' };
    }
    const learnerId = String(input.learnerId || '').trim();
    const schoolworkId = String(input.schoolworkId || '').trim();
    if (!learnerId || !schoolworkId) {
      return { success: false, error: 'learnerId and schoolworkId are required.' };
    }

    const profile = await profileStore.getProfile();
    if (!profile || profile.learnerId !== learnerId) {
      return { success: false, error: 'No active learner profile matches this schoolwork.' };
    }

    const sw = await loadSchoolwork(materialStore, learnerId, schoolworkId);
    if (!sw.success) return sw;
    const record = sw.record;

    // Inert until verified: an unverified assignment can never be worked on.
    if (record.status !== 'verified') {
      return {
        success: false,
        error: `This assignment is ${record.status} and cannot be worked on until it is verified.`
      };
    }

    const materialRes = await loadVerifiedMaterial(materialStore, learnerId, record.materialId);
    if (!materialRes.ok) return { success: false, error: materialRes.error };

    const agenda = {
      learnerId,
      schoolwork: record,
      material: materialRes.material,
      mode: 'reading',
      plans: [],
      planIndex: 0,
      currentSpec: null,
      session: null,
      completed: false
    };

    // Resolve mappable ALE objectives from the assignment links (nothing
    // inferred: unmapped objectives are simply not interactively served).
    const materialsByObjective = await buildMaterialsByObjective(materialStore, learnerId);
    const adaptive = adaptiveBlockOf(profile);
    const ctx = buildAdaptationContext({
      profile,
      materialsByObjective,
      adaptiveLearning: adaptive
    });

    const candidateAleIds = Array.isArray(record.linkedObjectives)
      ? record.linkedObjectives.map(resolveAleObjectiveId).filter(Boolean)
      : [];
    const uniqueIds = [...new Set(candidateAleIds)];

    const now = nowIso();
    for (const objectiveId of uniqueIds.slice(0, MAX_SCHOOLWORK_PLANS)) {
      const objective = OBJECTIVE_BY_ID[objectiveId];
      const skillId = skillForObjective(objectiveId);
      if (!objective || !skillId || !SKILL_BY_ID[skillId]) continue;
      // materialRequired objectives need grounded material (ALE semantics).
      if (objective.materialRequired && !materialsByObjective[objectiveId]) continue;
      const shaped = shapeSchoolworkPlan(ctx, objectiveId, { now, sessionTemplate: null });
      if (!shaped.ok) continue;
      agenda.mode = 'activity';
      agenda.plans.push(shaped.plan);
    }

    const schoolworkView = toSchoolworkChildView(record);

    // Nothing interactive mappable → honest reading task (no invented eval).
    if (agenda.mode === 'reading') {
      agendas.set(learnerId, agenda);
      return {
        success: true,
        mode: 'reading',
        schoolwork: schoolworkView,
        material: {
          materialId: record.materialId,
          title: agenda.material.title || record.title,
          subject: agenda.material.subject || record.subject,
          excerptChunks: materialExcerpts(agenda.material)
        },
        objectiveTitle: null
      };
    }

    // Build the learning session (same shape as the ALE mission).
    const session = createLearningSession({
      learnerId,
      grade: profile.grade,
      now
    });
    session.questionsReadAloud = profile.accommodations?.questionsReadAloud !== false;
    session.ttsRate = profile.accommodations?.audioNarrationSpeed ?? 0.85;
    agenda.session = session;
    if (learningStore?.saveSession) {
      await learningStore.saveSession(session).catch((err) => {
        console.error('[schoolwork-session] session save failed (non-fatal):', err.message);
      });
    }

    const firstSpec = buildActivitySpec(agenda.plans[0]);
    agenda.currentSpec = firstSpec;
    agendas.set(learnerId, agenda);
    setActiveSessionContext(learnerId, session, firstSpec);

    return {
      success: true,
      mode: 'activity',
      schoolwork: schoolworkView,
      objectiveTitle: activityTitleForSkill(agenda.plans[0].skillId),
      plan: toRendererSpec(firstSpec),
      activityTotal: agenda.plans.length
    };
  } catch (err) {
    console.error('[schoolwork-session] startSchoolworkSession failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Shape a single plan for ONE schoolwork objective using the same primitives
 * the ALE uses (grade bounds, skill state difficulty, representation,
 * activity type) — but pinned to the assignment, never decided by the ALE.
 */
function shapeSchoolworkPlan(ctx, objectiveId, { now }) {
  const objective = OBJECTIVE_BY_ID[objectiveId];
  const skillId = skillForObjective(objectiveId);
  const state = ensureSkillState(ctx, skillId);
  const gradeCeiling = GRADE_CEILING(ctx.grade);
  const material = (ctx.materialsByObjective || {})[objectiveId] || null;

  const resolved = resolveObjectiveGradeBounds({ objectiveId, grade: ctx.grade, skillId });
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const bounded = clampDifficultyToBounds(state.difficulty, resolved.bounds);
  if (!bounded.ok) return { ok: false, error: bounded.error };

  const rep = pickRepresentation({
    skillId,
    objective,
    preferences: ctx.preferences,
    audioOnlyActivities: 0,
    questionsReadAloud: ctx.questionsReadAloud !== false
  });

  const activityCount = ctx.sequenceOffset || 0;
  const variationSeed = fnv1a(`${skillId}|${objectiveId}|schoolwork|${activityCount + 1}`);
  const supportLevel = state.mastery < 0.35 ? 'guided' : 'none';

  const plan = {
    sequence: activityCount + 1,
    sessionId: ctx.sessionId || 'schoolwork',
    skillId,
    activityType: activityTypeFor(skillId, objective),
    representation: rep.representation,
    objectiveId,
    materialId: material ? material.materialId : null,
    sourceExcerpt: material ? material.sourceExcerpt : null,
    gradeRange: objective.gradeRange,
    difficulty: bounded.difficulty,
    difficultyBounds: resolved.bounds,
    difficultyBoundsSource: resolved.source,
    complexity: resolved.complexity,
    supportLevel,
    presentation: {
      mode: rep.mode,
      audioPrompt: null,
      replayEnabled: rep.replayEnabled,
      ttsRate: 0.85
    },
    title: activityTitleForSkill(skillId),
    prompt: null,
    mode: 'choose',
    content: null,
    timeLimitMs: null,
    helpOptions: SCHOOLWORK_HELP_OPTIONS,
    variationSeed,
    rationale: ['schoolwork_scoped', material ? 'material_grounded' : 'grounding_fallback_deterministic'],
    generatedAt: now
  };
  return { ok: true, plan };
}

/* ───────────────────────── submit ───────────────────────── */

/**
 * SUBMIT_SCHOOLWORK_ACTIVITY: same main-side ground truth + learning-signal
 * path as the ALE mission, but the NEXT activity comes from the fixed
 * schoolwork agenda (the ALE never expands the assignment). When the agenda
 * is exhausted the assignment is marked completed and the learning session
 * finalized.
 *
 * @param {object} deps { profileStore, learningStore, materialStore }
 * @param {object} payload renderer submission (existing activity contract)
 * @returns {Promise<object>}
 */
export async function submitSchoolworkActivity(deps, payload) {
  const { profileStore, learningStore } = deps || {};
  try {
    if (!payload || typeof payload !== 'object') {
      return { success: false, error: 'A submission payload is required.' };
    }
    const validation = validateSubmissionPayload(payload);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(' ') };
    }
    if (!profileStore || typeof profileStore.getProfile !== 'function') {
      return { success: false, error: 'Profile store is not available.' };
    }
    const profile = await profileStore.getProfile();
    if (!profile) {
      return { success: false, error: 'No active learner profile found.' };
    }
    const agenda = agendas.get(profile.learnerId);
    if (!agenda || agenda.completed) {
      return { success: false, error: 'No active schoolwork session for this learner.' };
    }
    if (agenda.mode !== 'activity' || !agenda.currentSpec) {
      return { success: false, error: 'This assignment has no interactive activity to submit.' };
    }
    if (agenda.currentSpec.activityId !== payload.activityId) {
      return {
        success: false,
        error: 'No active schoolwork activity matches this submission. Start the assignment again.'
      };
    }
    if (!profileStore || !learningStore) {
      return { success: false, error: 'Stores are not available.' };
    }

    const spec = agenda.currentSpec;
    const mode = spec.mode === 'build' ? 'build' : 'choose';
    const isCorrect = judgeSelection({
      selection: payload.selection,
      answerKey: spec.answerKey,
      mode,
      content: spec.content
    });
    const result = buildOutcome({
      spec,
      payload,
      isCorrect,
      now: nowIso()
    });

    // Learning signal: the SAME interface the ALE mission uses. This is the
    // only writer of skill/preference/meta state, so completed schoolwork
    // genuinely informs future adaptive practice.
    const materialsByObjective = await buildMaterialsByObjective(deps?.materialStore, profile.learnerId);
    const adaptive = adaptiveBlockOf(profile);
    const ctx = buildAdaptationContext({
      profile,
      materialsByObjective,
      adaptiveLearning: adaptive
    });
    const recorded = aleRecordOutcome(ctx, agenda.session, result, nowIso());
    const updatedSession = recorded.session;

    if (learningStore.saveSession) {
      await learningStore.saveSession(updatedSession).catch((err) => {
        console.error('[schoolwork-session] result save failed (non-fatal):', err.message);
      });
    }
    await profileStore.saveProfile({
      ...profile,
      adaptiveLearning: {
        skills: recorded.ctx.skillStates,
        preferences: recorded.ctx.preferences,
        meta: recorded.ctx.adaptiveMeta
      }
    }).catch((err) => {
      // The ALE signal is non-blocking for the child's schoolwork flow.
      console.error('[schoolwork-session] adaptive state save failed (non-fatal):', err.message);
    });

    agenda.session = updatedSession;
    agenda.planIndex += 1;

    // Next agenda item?
    if (agenda.plans[agenda.planIndex]) {
      const nextSpec = buildActivitySpec(agenda.plans[agenda.planIndex]);
      agenda.currentSpec = nextSpec;
      setActiveSessionContext(profile.learnerId, updatedSession, nextSpec);
      if (learningStore.saveSession) await learningStore.saveSession(updatedSession).catch(() => {});
      return {
        success: true,
        result: { activityId: result.activityId, outcome: result.outcome, isCorrect },
        next: {
          plan: toRendererSpec(nextSpec),
          suggestion: 'practice',
          rationale: agenda.plans[agenda.planIndex].rationale || []
        },
        schoolworkDone: false
      };
    }

    // Agenda exhausted → finalize session + mark assignment completed.
    updatedSession.status = 'completed';
    updatedSession.completedAt = nowIso();
    if (learningStore.saveSession) await learningStore.saveSession(updatedSession).catch(() => {});
    await completeSchoolwork(deps?.materialStore, {
      learnerId: profile.learnerId,
      schoolworkId: agenda.schoolwork.schoolworkId,
      completion: {
        mode: 'activity',
        activitiesCompleted: updatedSession.results.length,
        objectiveIds: [...new Set(updatedSession.results.map((r) => r.objectiveId))]
      }
    });

    const summary = {
      activitiesCompleted: updatedSession.results.length,
      completedAt: updatedSession.completedAt
    };
    agendas.delete(profile.learnerId);
    clearActiveSessionContext(profile.learnerId);

    return {
      success: true,
      result: { activityId: result.activityId, outcome: result.outcome, isCorrect },
      next: { plan: null, suggestion: 'schoolwork_complete', rationale: [] },
      schoolworkDone: true,
      summary
    };
  } catch (err) {
    console.error('[schoolwork-session] submitSchoolworkActivity failed:', err.message);
    return { success: false, error: err.message };
  }
}

/* ───────────────────────── reading completion ───────────────────────── */

/**
 * FINISH_SCHOOLWORK_READING: completes a reading-only assignment (no linked
 * objective) honestly. No evaluator ran (there was nothing to judge), no
 * learning signal is invented — the child read the material and the parent's
 * assignment is recorded as completed.
 *
 * @param {object} deps { materialStore }
 * @param {object} input { learnerId, schoolworkId }
 * @returns {Promise<object>}
 */
export async function finishSchoolworkReading(deps, input) {
  try {
    if (!input || typeof input !== 'object') {
      return { success: false, error: 'A completion payload is required.' };
    }
    const learnerId = String(input.learnerId || '').trim();
    const schoolworkId = String(input.schoolworkId || '').trim();
    if (!learnerId || !schoolworkId) {
      return { success: false, error: 'learnerId and schoolworkId are required.' };
    }
    const agenda = agendas.get(learnerId);
    const completion = {
      mode: 'reading',
      activitiesCompleted: 0
    };
    const res = await completeSchoolwork(deps?.materialStore, { learnerId, schoolworkId, completion });
    if (agenda) {
      agendas.delete(learnerId);
      clearActiveSessionContext(learnerId);
    }
    return res;
  } catch (err) {
    console.error('[schoolwork-session] finishSchoolworkReading failed:', err.message);
    return { success: false, error: err.message };
  }
}

/* ───────────────────────── teardown / diagnostics ───────────────────────── */

/** Clear the schoolwork agenda + active context for a learner (leave flow). */
export function clearSchoolworkSession(learnerId) {
  if (!learnerId || !agendas.has(learnerId)) return false;
  agendas.delete(learnerId);
  clearActiveSessionContext(learnerId);
  return true;
}

/** Unit tests only. */
export function resetSchoolworkSessionState() {
  for (const learnerId of [...agendas.keys()]) clearActiveSessionContext(learnerId);
  agendas.clear();
}

/** Diagnostics/tests only. */
export function peekSchoolworkSession(learnerId) {
  return agendas.get(learnerId) || null;
}

/** Re-export the learning-flow seam so tests can introspect the shared ctx. */
export { setActiveSessionContext };