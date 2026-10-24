/**
 * Learning Flow (Phase 6 Step 2) — main-side orchestration between the IPC
 * handlers and the existing deterministic foundation (ALE, activity registry,
 * ground truth judging, help scaffolds, stores).
 *
 * Why this module exists: IPC handlers must never trust renderer input, and
 * every decision here is deterministic + explainable. This layer is
 * dependency-injected (profileStore, learningStore, materialStore, registry)
 * so it is unit-testable WITHOUT Electron. main.js handlers stay thin.
 *
 * Contract:
 * - Every exported function returns a result envelope; malformed input is a
 *   result, never a throw.
 * - correctAnswer/answerKey NEVER crosses IPC: ground truth stays main-side
 *   (same model as screening's validateTaskSubmission).
 * - The ALE is a pure decision core; wall-clock time is injected (`now`).
 * - The LLM is not involved anywhere in Step 2: the deterministic help tier
 *   (show_me / tell_me / break_it_down) resolves from curated skill/objective
 *   scaffolds; no generated text reaches the child.
 * - Learner state (skill states, preferences, meta) is written ONLY by ALE
 *   arithmetic — never by renderer input.
 */

import { GRADE_CEILING, SKILL_BY_ID, ALE_THRESHOLDS } from '../adaptive/adaptive-config.js';
import { CONTENT_SOURCES } from '../ai/content-validator.js';
import { FEATURE_FLAGS } from '../ai/llm-config.js';
import { generateGroundedQuestion } from '../ai/generated-activity-service.js';
import { generateSimplerExplanation } from '../ai/generated-simpler-service.js';
import { OBJECTIVE_BY_ID } from '../adaptive/objective-registry.js';
import {
  createLearningSession,
  decide as aleDecide,
  recordOutcome as aleRecordOutcome,
  buildAdaptationContext,
  buildLearnerModelContext,
  eligibleObjectives
} from '../adaptive/adaptive-engine.js';
import {
  buildActivitySpec,
  toRendererSpec,
  CONTENT_BUILDERS_FOR_VALIDATION
} from './activity-registry.js';
import {
  validateSubmissionPayload,
  judgeSelection,
  buildOutcome,
  activityTypeMode,
  VALID_HELP_KINDS
} from './activity-contract.js';
import { deterministicExplanation } from '../ai/explanation-service.js';
import {
  buildVisualExplanation,
  validateVisualSpec,
  VISUAL_SIGNAL_EVENTS
} from './visual-explanation-service.js';
import { createDefaultPreferences } from '../adaptive/preference-model.js';
import { createDefaultAdaptiveLearning, sanitizeAdaptiveLearning } from '../../shared/profile-schema.js';
import { resolveObjectiveGradeBounds } from '../curriculum/grade-difficulty.js';

/** Max in-memory learning sessions held concurrently (main-process hygiene). */
const MAX_ACTIVE_SESSIONS = 50;

/**
 * Explicit bridge between the two curated objective-ID namespaces (Step 1
 * curriculum registry ↔ ALE objective registry). Nothing is inferred: a
 * curriculum objective grounds an ALE objective ONLY via this table, mirroring
 * the grounding-service's no-keyword-matching rule. Unmapped curriculum
 * objectives simply never receive ALE material grounding (deterministic
 * fallback content is served instead — fail-safe, never fail-open).
 *
 * Extend this table explicitly when new curricula/objectives are added.
 */
export const CURRICULUM_OBJECTIVE_ALIASES = Object.freeze({
  // Water cycle (CBSE/Cambridge/UK fixtures → ALE comprehension objective)
  cbse_sc_3_evaporation: 'water_cycle_evaporation',
  cam_sc_3_water_cycle: 'water_cycle_evaporation',
  uk_sc_3_water_cycle: 'water_cycle_evaporation',
  // States of water (states/matter objectives → ALE comprehension)
  cbse_sc_3_states_of_water: 'water_cycle_evaporation',
  icse_sc_3_water_forms: 'water_cycle_evaporation',
  ib_sc_3_matter_change: 'water_cycle_evaporation',
  us_sc_3_states_change: 'water_cycle_evaporation'
});

/**
 * Resolve the ALE objective id for a curriculum objective id (or null).
 * Deterministic: ids already in the ALE registry pass through unchanged.
 * @param {string} objectiveId
 * @returns {string|null}
 */
function resolveAleObjectiveId(objectiveId) {
  if (OBJECTIVE_BY_ID[objectiveId]) return objectiveId;
  return CURRICULUM_OBJECTIVE_ALIASES[objectiveId] || null;
}

/**
 * Build the per-objective grade-bounds context consumed by the ALE
 * (grade-aware difficulty, hard constraint). For EVERY objective the ALE
 * could select at the learner's grade (the eligible set), resolve its
 * difficulty bounds. Objectives whose bounds cannot be resolved (grade
 * mismatch, unknown objective, conflicting windows) are simply ABSENT from
 * the context — the ALE then fail-closes on them (no plan) instead of
 * guessing a difficulty.
 *
 * @param {object|null} registry curriculum registry (reserved for future
 *   per-curriculum bound overrides; unused today)
 * @param {object|null} profile learner profile
 * @param {object} adaptationCtx the ALE adaptation context (grade + materials)
 * @returns {Promise<object>} objectiveId → resolved bounds envelope
 */
async function buildGradeBoundsContext(registry, profile, adaptationCtx) {
  const bounds = {};
  const grade = profile?.grade || null;
  if (!grade) return bounds;
  for (const objectiveId of eligibleObjectives(adaptationCtx)) {
    const resolved = resolveObjectiveGradeBounds({ objectiveId, grade });
    if (resolved.ok) bounds[objectiveId] = resolved;
    // Unresolved → omitted: the ALE fail-closes on that objective.
  }
  void registry;
  return bounds;
}

/** How long an in-progress session is resumed before a fresh one starts. */
const SESSION_RESUME_WINDOW_MS = 30 * 60 * 1000;

/**
 * Live in-memory sessions keyed by learnerId. The LearningStore file is the
 * durable record; this map avoids re-reading on every submit.
 * @type {Map<string, { session: object, answerKey: string, spec: object }>}
 */
const activeSessions = new Map();

/* ───────────────────────── helpers ───────────────────────── */

function nowIso() {
  return new Date().toISOString();
}

function isNonEmptyString(v, max = 200) {
  return typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;
}

/**
 * Build the map of objectiveId → { materialId, sourceExcerpt } from the
 * learner's persisted VERIFIED school materials. Only verified materials can
 * ground an objective (Step 1 parent-verification rule, fail-closed).
 * @param {object|null} materialStore
 * @param {string} learnerId
 * @returns {Promise<object>}
 */
export async function buildMaterialsByObjective(materialStore, learnerId) {
  if (!materialStore || typeof materialStore.loadMaterials !== 'function' || !learnerId) {
    return {};
  }
  let materials = [];
  try {
    const res = await materialStore.loadMaterials(learnerId);
    materials = Array.isArray(res) ? res : Array.isArray(res?.materials) ? res.materials : [];
  } catch (err) {
    console.error('[learning-flow] failed to read school materials:', err.message);
    return {};
  }
  const byObjective = {};
  for (const material of materials) {
    if (material?.verificationStatus !== 'verified') continue;
    const excerpt = Array.isArray(material?.excerptChunks)
      ? material.excerptChunks.join(' ').slice(0, 400)
      : '';
    if (!excerpt) continue;
    for (const linkedId of material.linkedObjectives || []) {
      if (!isNonEmptyString(linkedId, 80)) continue;
      const aleId = resolveAleObjectiveId(linkedId);
      if (!aleId) continue; // unmapped curriculum objective → no ALE grounding
      // Deterministic: first verified material wins per ALE objective.
      if (!byObjective[aleId]) {
        byObjective[aleId] = { materialId: material.materialId, sourceExcerpt: excerpt };
      }
    }
    void 0;
  }
  return byObjective;
}

/**
 * Resolve the learner's persisted adaptiveLearning block (or defaults).
 */
async function adaptiveBlockOf(profileStore) {
  const profile = await profileStore.getProfile();
  if (!profile) return { profile: null, adaptive: createDefaultAdaptiveLearning() };
  return {
    profile,
    // Sanitize on READ as well as on write: a profile written by an older
    // build (or hand-edited) can still hold null/NaN/out-of-range counters,
    // and those must never reach the ALE's mastery or support math.
    adaptive: sanitizeAdaptiveLearning(profile.adaptiveLearning)
  };
}

function touchSessionsLru(learnerId) {
  if (activeSessions.has(learnerId)) {
    const entry = activeSessions.get(learnerId);
    activeSessions.delete(learnerId);
    activeSessions.set(learnerId, entry);
  }
  while (activeSessions.size > MAX_ACTIVE_SESSIONS) {
    const oldest = activeSessions.keys().next().value;
    activeSessions.delete(oldest);
  }
}

/* ───────────────────────── mission (decide + build) ───────────────────────── */

/**
 * GET_MISSION: profile gate → eligible objectives → ALE decide → full
 * ActivitySpecification (renderer-safe). Non-blocking, never throws.
 *
 * Failure modes (§14):
 *  - missing profile      → { success:true, plan:null, suggestion:'parent_redirect' }
 *  - screening unfinished → { success:true, plan:null, suggestion:'screen_first' }
 *  - no eligible objective → { success:true, plan:null, suggestion:'parent_redirect' }
 *
 * @param {object} deps { profileStore, learningStore, materialStore }
 * @returns {Promise<object>}
 */
export async function getMission(deps) {
  const { profileStore, learningStore, materialStore, registry } = deps || {};
  try {
    if (!profileStore || typeof profileStore.getProfile !== 'function') {
      return { success: false, error: 'Profile store is not available.' };
    }
    const { profile, adaptive } = await adaptiveBlockOf(profileStore);
    if (!profile) {
      return { success: true, plan: null, suggestion: 'parent_redirect' };
    }
    if (profile.screeningStatus !== 'completed') {
      return { success: true, plan: null, suggestion: 'screen_first' };
    }

    const materialsByObjective = await buildMaterialsByObjective(materialStore, profile.learnerId);
    const ctx = buildAdaptationContext({
      profile,
      materialsByObjective,
      adaptiveLearning: adaptive
    });
    // Grade-aware difficulty: attach the per-objective bounds envelope so the
    // ALE clamps (and fail-closes) against grade/objective bounds.
    ctx.gradeDifficultyBounds = await buildGradeBoundsContext(registry, profile, ctx);

    // Resume an in-progress session, else start a new one (deterministic id
    // via created timestamp; sessions are per learner).
    let session = null;
    const cached = activeSessions.get(profile.learnerId);
    if (cached && cached.session.status === 'in_progress') {
      session = cached.session;
    } else if (learningStore && typeof learningStore.getLatestSession === 'function') {
      const latest = await learningStore.getLatestSession(profile.learnerId).catch(() => null);
      if (
        latest &&
        latest.status === 'in_progress' &&
        latest.startedAt &&
        Date.now() - Date.parse(latest.startedAt) < SESSION_RESUME_WINDOW_MS
      ) {
        session = latest;
      }
    }
    if (!session) {
      session = createLearningSession({
        learnerId: profile.learnerId,
        grade: profile.grade,
        now: nowIso()
      });
      session.questionsReadAloud = profile.accommodations?.questionsReadAloud !== false;
      session.ttsRate = profile.accommodations?.audioNarrationSpeed ?? 0.85;
      if (learningStore?.saveSession) {
        await learningStore.saveSession(session).catch((err) => {
          console.error('[learning-flow] session save failed (non-fatal):', err.message);
        });
      }
    }

    const decision = aleDecide(ctx, session, nowIso());
    const plan = decision.nextPlan;

    if (!plan || decision.suggestion === 'break') {
      session.status = 'completed';
      if (learningStore?.saveSession) await learningStore.saveSession(session).catch(() => {});
      activeSessions.delete(profile.learnerId);
      return {
        success: true,
        plan: null,
        suggestion: 'break',
        rationale: decision.rationale || [],
        summary: summarizeSession(session)
      };
    }

    // Build the full activity spec (with main-side answerKey) and strip the
    // key before anything crosses IPC.
    let spec = buildActivitySpec(plan);

    // ── Grounded Llama wording (Phase 6) ──
    // ALE decided curriculum/grade/objective/difficulty/type. The local model
    // may only re-word the question inside that decision, and only for the
    // supported activity type (choose-mode questions). Gated by the central
    // feature flag (default OFF — the pipeline is byte-identical to the
    // deterministic path). Any rejection — timeout, unavailability, schema,
    // grounding, or Content Validator — silently keeps the deterministic
    // item; only a bounded reason code is logged (never prompt, material,
    // learner data, or model output).
    if (isGeneratedActivityEnabled()) {
      if (spec.activityType === 'sentence_mc' && spec.mode === 'choose') {
        const material = materialsByObjective[plan.objectiveId] || null;
        const outcome = await generateGroundedQuestion({
          spec,
          grade: session.grade || profile.grade,
          objectiveId: plan.objectiveId,
          material,
          learnerPreferences: { language: profile.language ?? null },
          // Bounded learner context: counts, coarse time bands, and enums the
          // app itself assigned. No identifiers, no free text, no diagnosis.
          learnerContext: buildLearnerModelContext(ctx, plan),
          provider: generationProviderOverride ?? undefined
        });
        if (outcome.usedGeneration && outcome.activity) {
          // Keep every ALE-owned field (sessionId/sequence/difficulty/etc.)
          // and overwrite ONLY the wording-bearing fields. The top-level
          // prompt is the renderer's first source — it must follow the
          // generated content, never stay stale.
          spec = {
            ...spec,
            ...outcome.activity,
            prompt: outcome.activity.content.prompt,
            source: CONTENT_SOURCES.LLM
          };
        } else if (outcome.reason) {
          console.log(`[learning-flow] generated activity unavailable (${outcome.reason}); using deterministic item`);
        }
      }
    }

    const rendererSpec = toRendererSpec(spec);

    session.plans = [...(session.plans || []), plan];
    if (learningStore?.saveSession) await learningStore.saveSession(session).catch(() => {});
    activeSessions.set(profile.learnerId, {
      session,
      answerKey: spec.answerKey,
      spec
    });
    touchSessionsLru(profile.learnerId);

    return {
      success: true,
      suggestion: decision.suggestion,
      rationale: (plan && plan.rationale) || decision.rationale || [],
      plan: rendererSpec,
      sessionStatus: session.status
    };
  } catch (err) {
    console.error('[learning-flow] getMission failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * PROBE_MISSION (read-only): does the ALE currently have an eligible plan to
 * serve this learner, and would it RESUME or START?
 *
 * This is a NON-WRITING slice of `getMission` for dashboards/widgets: it runs
 * the exact same plumbing (profile gate, material grounding, adaptation
 * context, grade bounds, ALE decide) but NEVER creates, persists, or caches
 * a session, and NEVER touches the generation pipeline. It answers two
 * questions deterministically:
 *   - eligible: the ALE can produce a `nextPlan` for this learner right now
 *   - resumed:  an in-progress session is live (in-memory or persisted within
 *               the resume window) that `getMission` would continue
 *
 * `eligible:false` does NOT mean "wrong"; it means zero recommendable
 * activities exist today (break / parent_redirect / screen_first), so a UI
 * must show an empty state instead of a fabricated Start CTA.
 *
 * @param {object} deps { profileStore, learningStore, materialStore, registry }
 * @param {object} [options] { now } — injectable clock for determinism
 * @returns {Promise<{ success: boolean, eligible: boolean, resumed: boolean, suggestion?: string, error?: string }>}
 */
export async function probeMission(deps, options = {}) {
  const { profileStore, learningStore, materialStore, registry } = deps || {};
  try {
    if (!profileStore || typeof profileStore.getProfile !== 'function') {
      return { success: false, error: 'Profile store is not available.' };
    }
    const { profile, adaptive } = await adaptiveBlockOf(profileStore);
    if (!profile) {
      return { success: true, eligible: false, resumed: false, suggestion: 'parent_redirect' };
    }
    if (profile.screeningStatus !== 'completed') {
      return { success: true, eligible: false, resumed: false, suggestion: 'screen_first' };
    }

    const materialsByObjective = await buildMaterialsByObjective(materialStore, profile.learnerId);
    const ctx = buildAdaptationContext({
      profile,
      materialsByObjective,
      adaptiveLearning: adaptive
    });
    ctx.gradeDifficultyBounds = await buildGradeBoundsContext(registry, profile, ctx);

    // Same resume decision as getMission — inspected, NEVER written.
    const now = options?.now || new Date();
    let resumeSession = null;
    const cached = activeSessions.get(profile.learnerId);
    if (cached && cached.session.status === 'in_progress') {
      resumeSession = cached.session;
    } else if (learningStore && typeof learningStore.getLatestSession === 'function') {
      const latest = await learningStore.getLatestSession(profile.learnerId).catch(() => null);
      if (
        latest &&
        latest.status === 'in_progress' &&
        latest.startedAt &&
        Date.parse(now.toISOString()) - Date.parse(latest.startedAt) < SESSION_RESUME_WINDOW_MS
      ) {
        resumeSession = latest;
      }
    }

    // decide() on a synthetic empty session (never persisted) → is a plan
    // possible at this exact moment? The ALE's own caps/heuristics decide.
    const synthetic = resumeSession || createLearningSession({
      learnerId: profile.learnerId,
      grade: profile.grade,
      now: now.toISOString()
    });
    const decision = aleDecide(ctx, synthetic, now.toISOString());

    return {
      success: true,
      eligible: decision.nextPlan !== null,
      resumed: resumeSession !== null,
      suggestion: decision.suggestion || 'practice'
    };
  } catch (err) {
    console.error('[learning-flow] probeMission failed:', err.message);
    return { success: false, error: err.message };
  }
}

function summarizeSession(session) {
  const results = session?.results || [];
  return {
    totalActivities: results.length,
    completedAt: nowIso()
  };
}

/* ───────────────────────── submit activity ───────────────────────── */

/**
 * SUBMIT_ACTIVITY: validate payload → judge against the main-side answer key →
 * build a deterministic ActivityResult → ALE record() → persist → next plan.
 *
 * The renderer's outcome hints are advisory only; the ground truth is
 * recomputed here from the cached spec (tamper model identical to screening).
 *
 * @param {object} deps { profileStore, learningStore, materialStore }
 * @param {object} payload renderer submission
 * @returns {Promise<object>}
 */
export async function submitLearningActivity(deps, payload) {
  const { profileStore, learningStore, materialStore, registry } = deps || {};
  try {
    if (!profileStore || typeof profileStore.getProfile !== 'function') {
      return { success: false, error: 'Profile store is not available.' };
    }
    if (!payload || typeof payload !== 'object') {
      return { success: false, error: 'A submission payload is required.' };
    }
    const validation = validateSubmissionPayload(payload);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join(' ') };
    }

    const { profile, adaptive } = await adaptiveBlockOf(profileStore);
    if (!profile) {
      return { success: false, error: 'No active learner profile found.' };
    }

    const cached = activeSessions.get(profile.learnerId);
    if (!cached || cached.spec?.activityId !== payload.activityId) {
      return {
        success: false,
        error: 'No active activity matches this submission. Request a new mission.'
      };
    }
    const { session, spec, answerKey } = cached;

    // Main-side ground truth (renderer never supplies correctness).
    const mode = activityTypeMode(spec.activityType);
    const isCorrect = judgeSelection({
      selection: payload.selection,
      answerKey,
      mode,
      content: spec.content
    });

    const result = buildOutcome({
      spec,
      payload,
      isCorrect,
      now: nowIso(),
      // Help actually served by main for THIS activity. Recorded as the
      // authoritative floor for the help signal, then cleared so a retry or a
      // reused spec can never inherit the previous attempt's count.
      observedHelp: { count: cached.helpRequests?.count || 0, kinds: cached.helpRequests?.kinds || [] }
    });
    cached.helpRequests = { count: 0, kinds: [] };

    // NOTE: do NOT append the result here — aleRecordOutcome appends it via
    // its returned session (double-append would skew the ALE rotation and
    // duplicate persisted results).

    // ALE record: the only writer of skill states / preferences / meta.
    const materialsByObjective = await buildMaterialsByObjective(materialStore, profile.learnerId);
    const ctx = buildAdaptationContext({
      profile,
      materialsByObjective,
      adaptiveLearning: adaptive
    });
    // Grade-aware difficulty: same bounds envelope as GET_MISSION so the
    // recorded outcome's next-plan decision clamps identically.
    ctx.gradeDifficultyBounds = await buildGradeBoundsContext(registry, profile, ctx);
    const recorded = aleRecordOutcome(ctx, session, result, nowIso());
    const updatedSession = recorded.session;

    // Persist the session (result + plans + decisions) FIRST so progress
    // survives even if later steps fail.
    if (learningStore?.saveSession) {
      await learningStore.saveSession(updatedSession).catch((err) => {
        console.error('[learning-flow] result save failed (non-fatal):', err.message);
      });
    }

    const nextPlan = recorded.decision.nextPlan;
    let nextRendererPlan = null;
    if (nextPlan) {
      const nextSpec = buildActivitySpec(nextPlan);
      nextRendererPlan = toRendererSpec(nextSpec);
      cached.spec = nextSpec;
      cached.answerKey = nextSpec.answerKey;
      cached.session = updatedSession;
      if (learningStore?.saveSession) await learningStore.saveSession(updatedSession).catch(() => {});
    } else {
      // Break suggestion: finalize the session.
      updatedSession.status = 'completed';
      updatedSession.completedAt = nowIso();
      if (learningStore?.saveSession) await learningStore.saveSession(updatedSession).catch(() => {});
      activeSessions.delete(profile.learnerId);
    }

    // Persist the ALE-updated adaptive block (merge-on-write, clamp-on-load).
    const updatedProfile = {
      ...profile,
      adaptiveLearning: {
        skills: recorded.ctx.skillStates,
        preferences: recorded.ctx.preferences,
        meta: recorded.ctx.adaptiveMeta
      }
    };
    await profileStore.saveProfile(updatedProfile);

    return {
      success: true,
      result: {
        activityId: result.activityId,
        outcome: result.outcome,
        isCorrect // the child's own attempt feedback (already shown locally)
      },
      next: nextRendererPlan
        ? { plan: nextRendererPlan, suggestion: recorded.decision.suggestion, rationale: recorded.decision.rationale || [] }
        : { plan: null, suggestion: recorded.decision.suggestion, rationale: recorded.decision.rationale || [] }
    };
  } catch (err) {
    console.error('[learning-flow] submitLearningActivity failed:', err);
    return { success: false, error: err.message };
  }
}

/* ───────────────────────── help (deterministic tier) ───────────────────────── */

/**
 * GET_HELP: deterministic scaffold tier for the live activity. No LLM: the
 * explanation resolves from curated skill/objective content and passes through
 * the safety filter's shape checks (length cap + no answer leak).
/**
 * The words a learner has already read BEFORE the blank in a sentence-completion
 * prompt. This is what the visual should show: the lead-in the child is
 * completing. The blank marker and everything after it are dropped, so this can
 * never carry the answer across.
 *
 * @param {string} [prompt] activity prompt
 * @returns {string[]|null} up to three short leading words, or null
 */
function leadInWords(prompt) {
  if (typeof prompt !== 'string') return null;
  const [before] = prompt.split('___');
  if (!before) return null;
  const words = before
    .replace(/[^A-Za-z' ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);
  return words.length >= 2 ? words : null;
}

/**
 * @param {object} deps { profileStore }
 * @param {object} payload { activityId, kind }
 * @returns {Promise<object>}
 */
export async function getLearningHelp(deps, payload) {  try {
    if (!payload || typeof payload !== 'object') {
      return { success: false, error: 'A help payload is required.' };
    }
    const kind = String(payload.kind || '').trim();
    if (!VALID_HELP_KINDS.includes(kind)) {
      return { success: false, error: `kind must be one of: ${VALID_HELP_KINDS.join(', ')}` };
    }
    const { profileStore, materialStore } = deps || {};
    const { profile } = await adaptiveBlockOf(profileStore);
    if (!profile) {
      return { success: false, error: 'No active learner profile found.' };
    }

    const cached = activeSessions.get(profile.learnerId);
    if (!cached || cached.spec?.activityId !== payload.activityId) {
      return { success: false, error: 'No active activity matches this help request.' };
    }
    const spec = cached.spec;

    // Main-side help ledger for the live activity. buildOutcome() reads this at
    // submission time so the recorded help signal reflects the help main really
    // served, independent of what the renderer counted. `count` is the number of
    // REQUESTS (re-opening the same help is still two observable requests);
    // `kinds` stays unique because it is a union used for modality/explanation
    // signals, not a tally.
    if (!cached.helpRequests) cached.helpRequests = { count: 0, kinds: [] };
    cached.helpRequests.count += 1;
    if (!cached.helpRequests.kinds.includes(kind)) cached.helpRequests.kinds.push(kind);

    const explanation = deterministicExplanation({
      kind,
      skillId: spec.skillId,
      objectiveId: spec.objectiveId,
      prompt: spec.prompt || '',
      answerLeak: spec.answerKey
    });

    const materialsByObjective = await buildMaterialsByObjective(materialStore, profile.learnerId);

    // ── Grounded "Make it simpler" (Phase 6) ──
    // The LIVE activity's ALE-authoritative context (objective, grade,
    // verified excerpt, the prompt's own concept words) goes through the
    // existing grounded generation pipeline. The model may only simplify
    // wording/structure of the SAME concept — never the answer, type, or
    // difficulty. Same centralized flag as generated activities; the
    // deterministic curated line is the fallback for EVERY failure mode
    // (unavailable, timeout, malformed, ungrounded, validation reject).
    let simpler = null;
    if (kind === 'make_simpler' && isGeneratedActivityEnabled()) {
      const outcome = await generateSimplerExplanation({
        spec,
        grade: profile.grade,
        objectiveId: spec.objectiveId,
        material: materialsByObjective[spec.objectiveId] || null,
        provider: generationProviderOverride ?? undefined
      });
      if (outcome.usedGeneration && outcome.explanation) {
        simpler = outcome.explanation;
      } else if (outcome.reason) {
        console.log(`[learning-flow] simpler explanation unavailable (${outcome.reason}); using deterministic line`);
      }
    }

    // Bounded visual layer ("Show me" / "Imagine It"): only for kinds that
    // map to a representation, only for objectives with a curated visual
    // template, only when the objective covers the learner's grade. Verified
    // school material is attached as grounding when available. Every failure
    // mode falls back to the deterministic TEXT explanation — nothing is
    // invented, and the visual is never the only way to understand.
    let visual = null;
    try {
      const material = materialsByObjective[spec.objectiveId] || null;
      const candidate = buildVisualExplanation({
        kind,
        objectiveId: spec.objectiveId,
        grade: profile.grade,
        skillId: spec.skillId,
        material,
        // Ground the visual in the words the child is actually working with,
        // so the picture matches the live activity. Only short app-produced
        // tokens are accepted downstream — never the answer or option list.
        activity: {
          activityType: spec.activityType || null,
          targetWord: spec.content?.targetWord || spec.content?.target || null,
          sentenceWords: leadInWords(spec.content?.prompt)
        }
      });
      if (candidate.ok && validateVisualSpec(candidate.visual).ok) {
        visual = candidate.visual;
      }
      // candidate.ok === false → silent text fallback (no invented concept).
    } catch (visualErr) {
      console.error('[learning-flow] visual explanation unavailable (non-fatal):', visualErr.message);
    }

    return {
      success: true,
      help: {
        kind,
        content: simpler ? simpler.explanation : explanation.content,
        source: simpler ? 'llm' : 'deterministic',
        visual,
        ...(simpler ? { simpler: { simplerId: simpler.simplerId, explanation: simpler.explanation, sourceMaterialIds: simpler.sourceMaterialIds } } : {})
      }
    };
  } catch (err) {
    console.error('[learning-flow] getLearningHelp failed:', err);
    return { success: false, error: err.message };
  }
}

/* ───────────────────────── visual learning signals ───────────────────────── */

/**
 * Record a semantic VISUAL learning signal (visual_opened, visual_replayed,
 * visual_element_selected, ...). Learning-signal ONLY: appended to the live
 * session's explanations log for progress visibility — it is NEVER an input
 * to ALE difficulty/mastery arithmetic and cannot diagnose the learner.
 * Bounded: unknown events and malformed payloads are rejected deterministically.
 *
 * @param {object} deps { learningStore }
 * @param {object} payload { learnerId, sessionId, visualId, event, detail? }
 * @returns {Promise<{ success: true, recorded: true } | { success: false, error }>}
 */
export async function recordVisualSignal(deps, payload) {
  try {
    if (!payload || typeof payload !== 'object') {
      return { success: false, error: 'A visual signal payload is required.' };
    }
    const event = String(payload.event || '').trim();
    if (!VISUAL_SIGNAL_EVENTS.includes(event)) {
      return { success: false, error: `event must be one of: ${VISUAL_SIGNAL_EVENTS.join(', ')}` };
    }
    const learnerId = String(payload.learnerId || '').trim();
    const sessionId = String(payload.sessionId || '').trim();
    const visualId = String(payload.visualId || '').trim();
    if (!learnerId || !sessionId || !visualId) {
      return { success: false, error: 'learnerId, sessionId and visualId are required.' };
    }
    // Bounded detail: primitives only, short.
    let detail = null;
    if (payload.detail !== undefined && payload.detail !== null) {
      const d = payload.detail;
      if (typeof d === 'string' && d.length <= 64) detail = d;
      else if (typeof d === 'number' && Number.isFinite(d)) detail = d;
      else if (typeof d === 'boolean') detail = d;
      else return { success: false, error: 'detail must be a short string, number, or boolean.' };
    }
    // Persist-lite: the LearningStore keeps the durable session record; the
    // signal lives in the in-session explanation log (bounded count).
    const cached = activeSessions.get(learnerId);
    if (cached && cached.session?.sessionId === sessionId) {
      const explanations = Array.isArray(cached.session.explanations) ? cached.session.explanations : [];
      if (explanations.length < 50) {
        explanations.push({ type: 'visual_signal', visualId, event, detail, at: nowIso() });
        cached.session.explanations = explanations;
      }
    }
    return { success: true, recorded: true };
  } catch (err) {
    console.error('[learning-flow] recordVisualSignal failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Test/diagnostics-only provider seam for the grounded Llama path. main.js
 * never sets this; unit and app-level tests inject a fake provider here so
 * generation behavior is verified deterministically without a daemon.
 */
let generationProviderOverride = null;
export function setGenerationProviderForTests(provider) {
  generationProviderOverride = provider;
}

/**
 * Grounded Llama wording gate: the CENTRAL feature flag (default OFF) or an
 * explicit test-only provider injection. No other env reads exist.
 */
function isGeneratedActivityEnabled() {
  return FEATURE_FLAGS.generatedActivities() || generationProviderOverride !== null;
}

/* ───────────────────────── test / diagnostics hooks ───────────────────────── */

/** Clear in-memory session state (unit tests + profile reset). */
export function resetLearningFlowState() {
  activeSessions.clear();
}

/**
 * Schoolwork-session seam (Phase 7.2): install or clear the ACTIVE session
 * context for a learner so the EXISTING help and visual-signal read paths
 * (`getLearningHelp`, `recordVisualSignal`) resolve for a schoolwork session
 * running outside the ALE mission.
 *
 * The schoolwork session coordinates its own bounded agenda — it never calls
 * the ALE mission's `getMission`/`submitLearningActivity` — but it reuses this
 * context ONLY so the deterministic help tier, the grounded "make simpler"
 * line, and the visual layer see the current activity exactly as they would
 * in the ALE flow. `spec` MUST be the full main-side spec (with answerKey).
 *
 * Passing a null/undefined `spec` clears the context.
 * @param {string} learnerId
 * @param {object|null} session schoolwork learning session (or null)
 * @param {object|null} spec full ActivitySpecification (or null to clear)
 * @returns {boolean}
 */
export function setActiveSessionContext(learnerId, session, spec) {
  if (!learnerId) return false;
  if (!spec || typeof spec !== 'object') {
    activeSessions.delete(learnerId);
    return true;
  }
  activeSessions.set(learnerId, {
    session: session || null,
    answerKey: spec.answerKey,
    spec
  });
  touchSessionsLru(learnerId);
  return true;
}

/** Clear the active session context for a learner (schoolwork teardown). */
export function clearActiveSessionContext(learnerId) {
  if (!learnerId) return false;
  activeSessions.delete(learnerId);
  return true;
}

/** Introspect the active session for a learner (diagnostics/tests only). */
export function peekActiveSession(learnerId) {
  return activeSessions.get(learnerId) || null;
}

/* Re-export for thin main.js handlers and tests. */
export {
  ALE_THRESHOLDS,
  GRADE_CEILING,
  SKILL_BY_ID,
  OBJECTIVE_BY_ID,
  CONTENT_BUILDERS_FOR_VALIDATION,
  createDefaultPreferences
};
