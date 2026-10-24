/**
 * Adaptive Learning Engine (ALE) — deterministic, pure decision core (§7)
 *
 * Implementation notes:
 * - `decide()` and `record()` are PURE: they accept `now`` as an argument,
 *   never call `Date.now()`, never use `Math.random()`. Seedable rotation uses
 *   FNV-1a hashing so deep-equality re-runs are stable (unit-tested).
 * - No LLM. No diagnosis. Grade is a hard curriculum bound (R1a/R10).
 */

import {
  SKILL_BY_ID,
  GRADE_CEILING,
  ALE_THRESHOLDS,
  MAX_AUDIO_ONLY_ACTIVITIES,
  RATIONALE_TAGS
} from './adaptive-config.js';
import { resolveObjectiveGradeBounds, clampDifficultyToBounds } from '../curriculum/grade-difficulty.js';
import {
  isObjectiveEligibleForGrade,
  objectivesForGrade,
  OBJECTIVE_BY_ID,
  OBJECTIVES
} from './objective-registry.js';
import { recordPreferenceOutcome, createDefaultPreferences, strongestModality } from './preference-model.js';
import {
  classifyAttempt,
  summarizeLearningBehavior,
  deriveBaselineEvidence,
  paceBand as behaviorPaceBand
} from './learning-behavior.js';

export const MASTERY_CLAMP_MIN = 0.05;
export const MASTERY_CLAMP_MAX = 0.95;
export const MASTERY_WINDOW_SIZE = 8;
export const MASTERY_SCORES = Object.freeze({
  success: 1.0,
  help_success: 0.6,
  incorrect: 0.0,
  timeout: 0.2
});

/* ───────────────────────────── helpers ───────────────────────────── */

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

/** Deterministic FNV-1a 32-bit → short hex (companion pattern). */
export function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

/**
 * Mastery score for a single outcome (rolling window of last 8).
 */
export function outcomeScore(result) {
  if (result.outcome === 'success') return MASTERY_SCORES.success;
  if (result.outcome === 'help_success') return MASTERY_SCORES.help_success;
  if (result.outcome === 'incorrect') return MASTERY_SCORES.incorrect;
  if (result.outcome === 'timeout') return MASTERY_SCORES.timeout;
  return MASTERY_SCORES.incorrect;
}

function computeMastery(window) {
  if (!window || window.length === 0) return 0.5;
  const mean = window.reduce((a, b) => a + b, 0) / window.length;
  return round3(clamp(mean, MASTERY_CLAMP_MIN, MASTERY_CLAMP_MAX));
}

/* ───────────────────────────── session ───────────────────────────── */

/**
 * Create a fresh learning session (§13).
 * @returns {object} session object ready for persistence
 */
export function createLearningSession({ learnerId, grade, skillFocus = null, now = new Date().toISOString() }) {
  const ts = Date.now();
  return {
    sessionId: `learning_${ts}`,
    learnerId,
    grade,
    skillFocus,
    startedAt: now,
    status: 'in_progress',
    plans: [],
    results: [],
    explanations: [],
    decisions: [],
    audioOnlyActivities: 0
  };
}

/* ───────────────────────────── skill state ───────────────────────────── */

/**
 * Resolve / create the deterministic skill state for a skill.
 * Fresh skills seed difficulty from the Phase 4 baseline (difficultyReached
 * per baseline category) clamped to [1, min(skill.maxDifficulty, grade ceiling)].
 */
export function ensureSkillState(ctx, skillId) {
  if (ctx.skillStates && ctx.skillStates[skillId]) {
    return ctx.skillStates[skillId];
  }
  const skill = SKILL_BY_ID[skillId];
  if (!skill) return null;

  const gradeCeiling = GRADE_CEILING(ctx.grade);
  const maxForSkill = Math.min(skill.maxDifficulty, gradeCeiling);
  const baselineReached = ctx.readingBaseline?.difficultyReached?.[skill.baselineCategory];
  const seed = baselineReached && baselineReached >= 1 ? baselineReached : 1;

  return {
    mastery: 0.5,
    difficulty: clamp(seed, 1, maxForSkill),
    attempts: 0,
    correct: 0,
    streakCorrect: 0,
    streakWrong: 0,
    helpRequests: 0,
    audioMetrics: {
      audioUsed: 0,
      replays: 0,
      answeredAfterFirstListen: 0,
      answeredAfterReplay: 0,
      textAndAudio: 0,
      helpAfterAudio: 0
    },
    lastPracticedAt: null,
    practicedDates: [],
    outcomeWindow: [],
    behaviorMetrics: { window: [], lastResponseTimeMs: null, lastHintsUsed: 0, lastReplayCount: 0 }
  };
}

/**
 * Update a single skill state from a deterministic ActivityResult (§7 R4/R5/R6).
 * @returns {object} new skillState (immutable-style)
 */
export function updateSkillState(state, result, grade, now) {
  const skill = SKILL_BY_ID[result.skillId];
  const ceiling = Math.min(skill?.maxDifficulty ?? 5, GRADE_CEILING(grade));
  const score = outcomeScore(result);

  const window = [...(state.outcomeWindow || []), score].slice(-MASTERY_WINDOW_SIZE);
  const mastery = computeMastery(window);

  const correct = result.outcome === 'success' || result.outcome === 'help_success';

  let streakCorrect = correct ? state.streakCorrect + 1 : 0;
  let streakWrong = !correct ? state.streakWrong + 1 : 0;
  if (result.outcome === 'timeout') streakWrong = state.streakWrong + 1;

  // R4: difficulty up after 3 consecutive correct WITHOUT help.
  // Effort gate: a correct answer that was slow, self-corrected, or assisted is
  // still a success, but it is NOT evidence the learner is ready for more
  // challenge. Only a STEADY success (fast, first try, no help) counts, so a
  // long pause before a correct answer can never lower the ceiling.
  const pattern = classifyAttempt(result);
  let difficulty = state.difficulty;
  const noHelp = (Number(result?.hintsUsed) || 0) === 0
    && (Array.isArray(result?.explanationsUsed) ? result.explanationsUsed.length === 0 : true);
  if (streakCorrect >= 3 && pattern === 'steady_success' && noHelp) {
    difficulty = clamp(difficulty + 1, 1, ceiling);
  }
  // R5: difficulty down after 2 consecutive wrong (timeout counts as wrong for this).
  if (streakWrong >= 2) {
    difficulty = clamp(difficulty - 1, 1, ceiling);
  }

  // Audio metrics (§11). Every base value is read through `base()` first: a
  // persisted/edited `audioMetrics: {}` (all keys missing) previously made
  // `undefined + 0` evaluate to NaN, and that NaN was then written straight
  // into the learner profile and persisted as `null` in JSON.
  const a = result.audioSignals || {};
  const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const priorMetrics = state.audioMetrics && typeof state.audioMetrics === 'object' ? state.audioMetrics : {};
  const base = (key) => num(priorMetrics[key], 0);

  const audioMetrics = {
    audioUsed: base('audioUsed') + num(a.audioUsed ? 1 : 0),
    replays: base('replays') + num(a.replayCount, 0),
    answeredAfterFirstListen: base('answeredAfterFirstListen') + num(a.answeredAfterFirstListen ? 1 : 0),
    answeredAfterReplay: base('answeredAfterReplay') + num(a.answeredAfterReplay ? 1 : 0),
    textAndAudio: base('textAndAudio') + num(a.textAndAudio ? 1 : 0),
    helpAfterAudio: base('helpAfterAudio') + num(a.helpRequestedAfterAudio ? 1 : 0)
  };

  const today = now.slice(0, 10);
  // `let` (not `const`): first practice of a day must append today's date.
  let practicedDates = state.practicedDates || [];
  if (!practicedDates.includes(today)) {
    practicedDates = [...practicedDates, today].slice(-14);
  }

  const behavior = updateBehaviorMetrics(state.behaviorMetrics, result);

  return {
    ...state,
    mastery,
    difficulty,
    attempts: num(state.attempts, 0) + 1,
    correct: num(state.correct, 0) + (correct ? 1 : 0),
    streakCorrect,
    streakWrong,
    // Count help ONCE. `hintsUsed` already covers both hint taps and served
    // explanations (buildOutcome floors it at the main-side served-help count),
    // so adding `explanationsUsed.length` on top would bill the same help event
    // twice and inflate the very signal used to escalate support.
    helpRequests: num(state.helpRequests, 0)
      + Math.max(num(result.hintsUsed), result.explanationsUsed?.length || 0),
    audioMetrics,
    behaviorMetrics: behavior,
    lastPracticedAt: now,
    practicedDates,
    outcomeWindow: window
  };
}

/* ───────────────────────────── behavioral metrics ───────────────────────────── */

/**
 * Rolling window of observable per-attempt behaviors. These are COUNTS and
 * TIMINGS of what the learner did — never an inference about the learner. No
 * diagnosis, severity, trait, or mental-state label is derived or stored here.
 */
export const BEHAVIOR_WINDOW_SIZE = 8;

/** Hard bounds for a single attempt's response time (1 minute .. 30 minutes). */
const RESPONSE_TIME_MIN_MS = 1000;
const RESPONSE_TIME_MAX_MS = 30 * 60 * 1000;

/**
 * Aggregate the OBSERVABLE behaviors already carried by an ActivityResult into
 * a bounded, clamped rolling window. Pure.
 *
 * Fields recorded: how long the attempt took, whether help was opened, and
 * whether audio was replayed more than once. All are things the learner did that
 * the app already observed — nothing is guessed and nothing is inferred.
 *
 * @param {object|undefined} prior existing behaviorMetrics (may be absent/corrupt)
 * @param {object} result ActivityResult
 * @returns {object} bounded behaviorMetrics block
 */
export function updateBehaviorMetrics(prior, result) {
  const safeInt = (v, lo, hi) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return lo;
    return Math.min(hi, Math.max(lo, Math.round(n)));
  };

  const prev = prior && typeof prior === 'object' ? prior : {};
  const rawResponse = Number(result?.responseTimeMs);
  const responseTimeMs = Number.isFinite(rawResponse)
    ? Math.min(RESPONSE_TIME_MAX_MS, Math.max(RESPONSE_TIME_MIN_MS, Math.round(rawResponse)))
    : null;

  const window = Array.isArray(prev.window) ? prev.window : [];
  const signals = result?.behaviorSignals && typeof result.behaviorSignals === 'object' ? result.behaviorSignals : {};
  // Which observable pattern this attempt was. Stored as four 0/1 flags rather
  // than a single label so the window stays a flat, sanitizable record.
  const pattern = classifyAttempt(result);
  const entry = {
    responseTimeMs,
    hintsUsed: safeInt(result?.hintsUsed, 0, 20),
    replayCount: safeInt(result?.audioSignals?.replayCount, 0, 50),
    timedOut: result?.outcome === 'timeout' ? 1 : 0,
    firstInteractionMs: safeInt(signals.firstInteractionMs, -1, RESPONSE_TIME_MAX_MS),
    optionInspects: safeInt(signals.optionInspects, 0, 200),
    tilePlacements: safeInt(signals.tilePlacements, 0, 200),
    tileRemovals: safeInt(signals.tileRemovals, 0, 200),
    helpOpens: safeInt(signals.helpOpens, 0, 50),
    // Attempt/effort/recovery shape — observable, bounded, no inference.
    attempts: safeInt(result?.attempts, 1, 20),
    selfCorrected: pattern === 'self_corrected' ? 1 : 0,
    effortful: pattern === 'effortful_success' ? 1 : 0,
    assisted: pattern === 'assisted_success' ? 1 : 0,
    steady: pattern === 'steady_success' ? 1 : 0,
    error: pattern === 'error' ? 1 : 0
  };

  return {
    window: [...window, entry].slice(-BEHAVIOR_WINDOW_SIZE),
    lastResponseTimeMs: responseTimeMs,
    lastHintsUsed: entry.hintsUsed,
    lastReplayCount: entry.replayCount,
    lastFirstInteractionMs: entry.firstInteractionMs
  };
}

/**
 * Merge every practiced skill's behavior window into ONE bounded aggregate.
 * Skills are visited in sorted id order and the merge keeps the most recent
 * `behaviorWindowSize * 3` entries, so the result is deterministic (no
 * timestamps, no insertion-order dependence) and bounded in size.
 *
 * @param {Record<string, object>} skills skillId → skillState
 * @returns {object} aggregate behaviorMetrics block
 */
export function aggregateBehaviorMetrics(skills) {
  const entries = [];
  for (const skillId of Object.keys(skills || {}).sort()) {
    const metrics = skills[skillId]?.behaviorMetrics;
    if (!metrics || typeof metrics !== 'object') continue;
    const window = Array.isArray(metrics.window) ? metrics.window : [];
    for (const entry of window) entries.push({ entry, skillId });
  }
  const window = entries
    .slice(-ALE_THRESHOLDS.behaviorWindowSize * 3)
    .map(({ entry }) => ({ ...entry }));
  const last = window[window.length - 1] || null;
  return {
    window,
    lastResponseTimeMs: last ? last.responseTimeMs : null,
    lastHintsUsed: last ? last.hintsUsed : 0,
    lastReplayCount: last ? last.replayCount : 0,
    lastFirstInteractionMs: last ? last.firstInteractionMs : -1
  };
}

/**
 * Bounded, human-readable behavior summary for the ALE decision context and the
 * local-AI prompt. Deliberately coarse: a rounded response-time band, help and
 * replay counts over the window, and nothing else. No learner identifiers, no
 * free text, no raw event log.
 *
 * @param {object|undefined} metrics behaviorMetrics block
 * @returns {{ sampleCount, responseTimeBand, helpCount, replayCount, timedOutCount }}
 */
export function summarizeBehavior(metrics) {
  const window = Array.isArray(metrics?.window) ? metrics.window : [];
  // One band vocabulary, shared with the local-AI prompt (learning-behavior.js).
  const band = behaviorPaceBand;
  return {
    sampleCount: window.length,
    responseTimeBand: window.length > 0 ? band(window[window.length - 1].responseTimeMs) : 'unknown',
    helpCount: window.reduce((sum, e) => sum + (Number(e?.hintsUsed) || 0), 0),
    replayCount: window.reduce((sum, e) => sum + (Number(e?.replayCount) || 0), 0),
    timedOutCount: window.reduce((sum, e) => sum + (Number(e?.timedOut) || 0), 0),
    optionInspects: window.reduce((sum, e) => sum + (Number(e?.optionInspects) || 0), 0),
    tilePlacements: window.reduce((sum, e) => sum + (Number(e?.tilePlacements) || 0), 0),
    tileRemovals: window.reduce((sum, e) => sum + (Number(e?.tileRemovals) || 0), 0),
    // Observable recovery / effort patterns over the same bounded window.
    selfCorrections: window.reduce((sum, e) => sum + (Number(e?.selfCorrected) || 0), 0),
    effortfulSuccesses: window.reduce((sum, e) => sum + (Number(e?.effortful) || 0), 0),
    assistedSuccesses: window.reduce((sum, e) => sum + (Number(e?.assisted) || 0), 0),
    steadySuccesses: window.reduce((sum, e) => sum + (Number(e?.steady) || 0), 0),
    errorsObserved: window.reduce((sum, e) => sum + (Number(e?.error) || 0), 0)
  };
}

/* ───────────────────────────── preferences ───────────────────────────── */

export function updatePreferences(state, result) {
  // Decay + deltas are handled by the pure preference-model; expose mapping
  // from the ActivityResult's modality observations.
  return recordPreferenceOutcome(state, {
    outcome: result.outcome,
    modalityObservations: result.modalityObservations || [],
    successModalities: result.outcome === 'success' || result.outcome === 'help_success'
      ? result.modalityObservations || []
      : [],
    firstTryWithModal: Boolean(result.correctOnFirstAttempt),
    audio: result.audioSignals || {}
  });
}

/* ───────────────────────────── eligible candidates ───────────────────────────── */

/**
 * Eligible objective ids for the learner: R1a (grade band + materialRequired).
 */
export function eligibleObjectives(ctx) {
  const gradePool = goalsForGrade(ctx.grade).filter((id) => OBJECTIVE_BY_ID[id]);
  return gradePool.filter((id) => {
    const o = OBJECTIVE_BY_ID[id];
    if (o.materialRequired) {
      return Boolean(ctx.materialsByObjective && ctx.materialsByObjective[id]);
    }
    return true;
  });
}

function goalsForGrade(grade) {
  return objectivesForGrade(grade);
}

/**
 * Resolve the ALE skill for a curated objective.
 * Objectives with no `targetSkills` (objectives-only) resolve to null —
 * callers must skip them instead of building skill state for them.
 * (Crash fix: empty targetSkills must never produce a null skill state.)
 */
function skillForObjective(objectiveId) {
  const o = OBJECTIVE_BY_ID[objectiveId];
  if (!o || !Array.isArray(o.targetSkills) || o.targetSkills.length === 0) return null;
  return o.targetSkills[0];
}

/* ───────────────────────────── decide ───────────────────────────── */

/**
 * Representation + presentation selection (§7A / R9).
 * @returns {{ representation, mode, replayEnabled, tag }}
 */
export function pickRepresentation({ skillId, objective, preferences, audioOnlyActivities, questionsReadAloud }) {
  const qra = questionsReadAloud !== false;
  const audioCapReached = audioOnlyActivities >= MAX_AUDIO_ONLY_ACTIVITIES;
  const weights = preferences?.weights || {};
  const audioW = weights.audio ?? 0.5;
  const visualW = weights.visual ?? 0.5;
  const textW = weights.text ?? 0.5;

  if (skillId === 'decoding' || skillId === 'syllable_awareness') {
    return { representation: 'manipulation', mode: 'text', replayEnabled: false, tag: RATIONALE_TAGS.REPRESENTATION_SELECTED };
  }

  const defaultRep = objective?.defaultRepresentation || 'text';

  // Prefer audio when the objective defaults to audio OR audio is the
  // strongest observed modality (and the cap is not reached).
  const preferAudio = qra && (defaultRep === 'audio' || (audioW > visualW && audioW >= textW));
  if (preferAudio && !audioCapReached) {
    return {
      representation: 'audio',
      mode: 'text_audio',
      replayEnabled: true,
      tag: audioCapReached ? '' : RATIONALE_TAGS.REPRESENTATION_TEXT_AUDIO
    };
  }
  if (preferAudio && audioCapReached) {
    return { representation: 'text', mode: 'text', replayEnabled: false, tag: RATIONALE_TAGS.AUDIO_CAP_REACHED };
  }

  if (visualW > textW && defaultRep !== 'sentence_completion') {
    return { representation: 'visual', mode: 'text', replayEnabled: false, tag: RATIONALE_TAGS.REPRESENTATION_SELECTED };
  }

  return {
    representation: defaultRep === 'sentence_completion' ? 'sentence_completion' : 'text',
    mode: 'text',
    replayEnabled: false,
    tag: RATIONALE_TAGS.REPRESENTATION_SELECTED
  };
}

/**
 * Choose the next activity plan (§7 R2/R3/R4/R5/R6 + R9/R10) — pure.
 * @param {object} ctx { grade, skillStates, preferences, materialsByObjective, readingBaseline }
 * @param {object} session session object (mutable accumulation)
 * @param {string} now ISO timestamp
 * @returns {object} AdaptiveDecision
 */
export function decide(ctx, session, now) {
  const tag = RATIONALE_TAGS;
  const { grade, preferences } = ctx;

  // R1 — session cap / break heuristics (pure: computed from `now`).
  const startMs = session.startedAt ? Date.parse(session.startedAt) : Date.parse(now);
  const nowMs = Date.parse(now);
  const elapsedMs = nowMs - startMs;
  const activityCount = session.results.length;
  const lastResult = session.results[activityCount - 1];
  const breakStreak =
    lastResult && (lastResult.skillId in (ctx.skillStates || {}))
      ? ctx.skillStates[lastResult.skillId].streakCorrect >= ALE_THRESHOLDS.breakAfterStreakCorrect
      : false;

  if (
    activityCount >= ALE_THRESHOLDS.breakAfterActivities ||
    elapsedMs >= 15 * 60 * 1000 ||
    activityCount >= 8 ||
    breakStreak
  ) {
    return {
      suggestion: 'break',
      nextPlan: null,
      preferenceDelta: null,
      rationale: [tag.SUGGEST_BREAK_SESSION]
    };
  }

  // R1a — eligible objectives within the grade band and material bound.
  const eligible = eligibleObjectives(ctx);
  if (eligible.length === 0) {
    return {
      suggestion: 'parent_redirect',
      nextPlan: null,
      preferenceDelta: null,
      rationale: [tag?.SUGGEST_BREAK_SESSION || 'no_eligible_objectives']
    };
  }

  // R2 — pick the lowest-mastery skill among eligible objectives.
  const previousSkill = lastResult?.skillId || null;
  // Count trailing consecutive same-skill plans (rotation guard, ≤3).
  const trailingPlans = session.plans.slice(-3);
  let consecutiveSameSkill = 0;
  for (const plan of trailingPlans) {
    if (plan.skillId === previousSkill) consecutiveSameSkill += 1;
    else break;
  }

  // Group ALL eligible objectives per skill (registry order preserved).
  // Objectives without a skill mapping (empty targetSkills) are objectives-only
  // and cannot drive a skill-based activity — they are skipped, never
  // crashed on. Unknown skill ids are skipped for the same reason.
  const objectivesBySkill = new Map();
  for (const objectiveId of eligible) {
    const skillId = skillForObjective(objectiveId);
    if (!skillId || !SKILL_BY_ID[skillId]) continue;
    if (!objectivesBySkill.has(skillId)) objectivesBySkill.set(skillId, []);
    objectivesBySkill.get(skillId).push(objectiveId);
  }

  if (objectivesBySkill.size === 0) {
    return {
      suggestion: 'parent_redirect',
      nextPlan: null,
      preferenceDelta: null,
      rationale: ['no_skill_backed_objectives']
    };
  }

  let selectedSkill = null;
  let rotationApplied = false;
  if (previousSkill && consecutiveSameSkill >= 3) {
    const others = [...objectivesBySkill.keys()].filter((s) => s !== previousSkill);
    if (others.length > 0) {
      selectedSkill = others[0];
      rotationApplied = true;
    }
  }
  if (!selectedSkill) {
    const withState = [...objectivesBySkill.keys()].map((skillId) => ({
      skillId,
      objectiveId: objectivesBySkill.get(skillId)[0],
      mastery: ensureSkillState(ctx, skillId).mastery
    }));
    withState.sort((a, b) => a.mastery - b.mastery || fnv1a(a.skillId).localeCompare(fnv1a(b.skillId)));
    selectedSkill = withState[0].skillId;
  }

  // R3 — repeat the same objective/activityType after a non-success with low mastery.
  const state = ensureSkillState(ctx, selectedSkill);
  const skillObjectives = objectivesBySkill.get(selectedSkill);
  let repeatSame = false;
  if (lastResult && lastResult.outcome !== 'success' && state.mastery < 0.6) {
    repeatSame = true;
  }

  // Objective selection within the chosen skill: deterministic rotation over
  // EVERY eligible objective of the skill (keyed by activity count) so
  // registry order can never permanently lock out later objectives.
  // R3 repeat takes precedence and holds the last objective when it belongs
  // to the selected skill.
  let objectiveId;
  if (
    repeatSame &&
    lastResult &&
    lastResult.skillId === selectedSkill &&
    skillObjectives.includes(lastResult.objectiveId)
  ) {
    objectiveId = lastResult.objectiveId;
  } else {
    objectiveId = skillObjectives[activityCount % skillObjectives.length];
  }
  const objective = OBJECTIVE_BY_ID[objectiveId];

  const material = (ctx.materialsByObjective || {})[objectiveId] || null;
  const variationSeed = fnv1a(`${selectedSkill}|${objectiveId}|${activityCount + 1}`);
  const gradeCeiling = GRADE_CEILING(grade);

  const rep = pickRepresentation({
    skillId: selectedSkill,
    objective,
    preferences,
    audioOnlyActivities: session.audioOnlyActivities || 0,
    questionsReadAloud: session.questionsReadAloud
  });

  // R6 — support level.
  // Observable behaviors (response time, help opened, timeouts) can raise
  // support on their own, but they can only ADD support — never lower it.
  let supportLevel = 'none';
  const helpUsed = (lastResult?.hintsUsed || 0) > 0 || (lastResult?.explanationsUsed?.length || 0) > 0;
  // Per-skill behavior is the primary signal; when the selected skill has no
  // history yet, fall back to the learner's recent behavior across skills so an
  // observable pace is not forgotten just because the ALE rotated objectives.
  // Both sources are the same bounded counts/bands — no inference, no labels.
  const skillBehavior = summarizeBehavior(state.behaviorMetrics);
  const recentBehavior = ctx.behaviorSummary
    || summarizeBehavior(aggregateBehaviorMetrics(ctx.skillStates));
  const behavior = skillBehavior.sampleCount > 0 ? skillBehavior : recentBehavior;
  const slowLastAttempt =
    behavior.sampleCount > 0 && behavior.responseTimeBand === 'over_60s';

  // Case E — repeated errors on the SAME objective. `repeatSame` already holds
  // the objective; this adds the extra scaffolding that repetition calls for.
  const repeatedErrorsOnObjective = repeatSame && state.streakWrong >= 1;
  // Case F — frequent help. Help means "change how this is presented", which is
  // what supportLevel and pickRepresentation do. It deliberately does NOT lower
  // difficulty: that is handled only by R5 after genuine wrong answers.
  const frequentHelp =
    helpUsed || behavior.helpCount >= ALE_THRESHOLDS.behaviorHelpCountForScaffold;
  // Baseline evidence may only ADD support or hold the ceiling down. It can
  // never raise difficulty and never becomes a label.
  const baselineCategory = SKILL_BY_ID[selectedSkill]?.baselineCategory;
  const baselineCategoryEvidence = ctx.baselineEvidence?.perCategory?.[baselineCategory] || null;
  const baselineWantsMoreSupport = baselineCategoryEvidence
    ? baselineCategoryEvidence.paceAndAccuracy === 'slow_with_mistakes'
      || baselineCategoryEvidence.paceAndAccuracy === 'mixed_pace_with_mistakes'
    : false;

  if (
    state.mastery < 0.35 ||
    state.streakWrong >= 2 ||
    behavior.timedOutCount >= ALE_THRESHOLDS.behaviorTimeoutCountForGuided
  ) {
    supportLevel = 'guided';
  } else if (
    frequentHelp ||
    slowLastAttempt ||
    repeatedErrorsOnObjective ||
    baselineWantsMoreSupport ||
    behavior.helpCount >= ALE_THRESHOLDS.behaviorHelpCountForScaffold
  ) {
    supportLevel = 'scaffold';
  }

  // R4/R5 already mirrored in difficulty adjustments. Re-clamp here (R10),
  // then apply GRADE-AWARE OBJECTIVE BOUNDS (hard constraint): performance
  // may move difficulty within the permitted grade/objective window, never
  // outside it. Fail-closed: an objective whose bounds cannot be resolved for
  // this grade produces NO plan (skipped) rather than a guessed difficulty.
  const skillAbsoluteCeiling = Math.min(SKILL_BY_ID[selectedSkill]?.maxDifficulty ?? 5, gradeCeiling);
  // Bounds resolution priority: the orchestrator's per-objective envelope
  // (ctx.gradeDifficultyBounds — resolved against the learner's profile grade
  // and the eligible set) wins when present; a MISSING entry in a present
  // envelope means "unresolvable at this grade" → fail-closed. When no
  // envelope is supplied (legacy pure-ALE callers), bounds are resolved
  // internally from the objective registry (deterministic derived curve).
  const boundsEnvelope = ctx.gradeDifficultyBounds && typeof ctx.gradeDifficultyBounds === 'object' ? ctx.gradeDifficultyBounds : null;
  const resolved = boundsEnvelope
    ? (boundsEnvelope[objectiveId] || { ok: false, error: `No grade difficulty bounds resolved for "${objectiveId}" at grade "${grade}" — refusing to guess (fail-closed).` })
    : resolveObjectiveGradeBounds({ objectiveId, grade, skillId: selectedSkill });
  if (!resolved.ok) {
    return {
      suggestion: 'parent_redirect',
      nextPlan: null,
      preferenceDelta: null,
      rationale: [
        tag.OBJECTIVE_SELECTED,
        tag.GRADE_DIFFICULTY_UNRESOLVED,
        `bounds_unresolved:${resolved.error}`
      ]
    };
  }
  const bounded = clampDifficultyToBounds(state.difficulty, resolved.bounds);
  if (!bounded.ok) {
    return {
      suggestion: 'parent_redirect',
      nextPlan: null,
      preferenceDelta: null,
      rationale: [
        tag.OBJECTIVE_SELECTED,
        tag.GRADE_DIFFICULTY_UNRESOLVED,
        `bounds_clamp_failed:${bounded.error}`
      ]
    };
  }
  const difficulty = bounded.difficulty;
  const boundsClamped = difficulty !== clamp(state.difficulty, 1, skillAbsoluteCeiling);
  const rationale = [
    rotationApplied ? 'lowest_mastery_selected_rotated' : 'lowest_mastery_selected',
    tag.OBJECTIVE_SELECTED,
    material ? 'material_grounded' : 'grounding_fallback_deterministic',
    rep.tag && rep.tag !== 'none' ? rep.tag : tag.REPRESENTATION_SELECTED,
    ...(boundsClamped ? [tag.DIFFICULTY_CLAMPED_OBJECTIVE_BOUNDS, `difficulty_bounds:${resolved.bounds.min}-${resolved.bounds.max}`] : [resolved.source === 'declared' ? 'difficulty_bounds_declared' : 'difficulty_bounds_derived'])
  ].filter(Boolean);

  // Suggestion classification (deterministic).
  let suggestion = 'practice';
  if (repeatSame) suggestion = 'review';
  else if (state.streakCorrect >= 3 || splitSuggestionForConsolidation(state, lastResult)) suggestion = 'consolidate';

  const gradeRange = objective.gradeRange;
  const ttsRate = session.ttsRate ?? 0.85;

  const title = activityTitleForSkill(selectedSkill);
  const helpOptions = ['show_me', 'tell_me', 'break_it_down', 'give_example', 'make_simpler', 'funny_example', 'real_life_example'];

  const nextPlan = {
    sequence: activityCount + 1,
    sessionId: session.sessionId,
    skillId: selectedSkill,
    activityType: activityTypeFor(skillForObjective(objectiveId), objective),
    representation: rep.representation,
    objectiveId,
    materialId: material ? material.materialId : null,
    sourceExcerpt: material ? material.sourceExcerpt : null,
    gradeRange,
    difficulty,
    difficultyBounds: resolved.bounds,
    difficultyBoundsSource: resolved.source,
    complexity: resolved.complexity,
    supportLevel,
    presentation: {
      mode: rep.mode,
      audioPrompt: null,
      replayEnabled: rep.replayEnabled,
      ttsRate
    },
    title,
    prompt: null,
    mode: 'choose',
    content: null,
    timeLimitMs: null,
    helpOptions,
    variationSeed,
    rationale,
    generatedAt: now
  };

  return {
    suggestion,
    nextPlan,
    preferenceDelta: null
  };
}

function splitSuggestionForConsolidation(state, lastResult) {
  return Boolean(state.mastery >= 0.7 && lastResult && lastResult.outcome === 'success');
}

function activityTitleForSkill(skillId) {
  const skill = SKILL_BY_ID[skillId];
  return skill ? skill.label : 'Practice';
}

/**
 * Deterministic activity-type mapping per skill/objective (§9).
 */
export function activityTypeFor(skillId, objective) {
  if (skillId === 'decoding') return 'word_build';
  if (skillId === 'syllable_awareness') return 'syllable_split';
  if (skillId === 'comprehension') return 'sentence_mc';
  if (skillId === 'phoneme_awareness' || skillId === 'letter_sound_correspondence') return 'sound_detect';
  if (skillId === 'rhyme_awareness') return 'sentence_mc';
  if (objective?.preferredActivityTypes?.length) return objective.preferredActivityTypes[0];
  return 'sentence_mc';
}

/* ───────────────────────────── record ───────────────────────────── */

/**
 * Record a deterministic ActivityResult into the context + session, then
 * produce the next decision. Pure given `(ctx, session, result, now)`.
 *
 * @param {object} ctx { grade, skillStates, preferences, materialsByObjective, readingBaseline, adaptiveMeta }
 * @param {object} session learning session
 * @param {object} result ActivityResult (validated; gradeMatched already true)
 * @param {string} now ISO timestamp
 * @returns {{ ctx, decision }}
 */
export function recordOutcome(ctx, session, result, now) {
  const skillStates = { ...(ctx.skillStates || {}) };
  const prevState = skillStates[result.skillId] || ensureSkillState(ctx, result.skillId);
  skillStates[result.skillId] = updateSkillState(prevState, result, ctx.grade, now);

  const preferences = updatePreferences(ctx.preferences || createDefaultPreferences(), result);

  const audioSignals = result.audioSignals || {};
  const audioOnlyIncrement =
    (audioSignals.audioUsed && !audioSignals.textAndAudio) ? 1 : 0;

  // Recompute the cross-skill behavior summary from the UPDATED states: the
  // decision must be able to see the attempt that was just recorded, not the
  // snapshot the caller built before recording it.
  const behaviorMetrics = aggregateBehaviorMetrics(skillStates);
  const newCtx = {
    ...ctx,
    skillStates,
    preferences,
    behaviorMetrics,
    behaviorSummary: summarizeBehavior(behaviorMetrics),
    adaptiveMeta: {
      ...(ctx.adaptiveMeta || {}),
      activities: (ctx.adaptiveMeta?.activities || 0) + 1,
      lastSessionAt: now,
      updatedAt: now
    }
  };

  const sessionNext = {
    ...session,
    results: [...session.results, result],
    audioOnlyActivities: (session.audioOnlyActivities || 0) + audioOnlyIncrement
  };

  const decision = decide(newCtx, sessionNext, now);
  sessionNext.plans = decision.nextPlan
    ? [...sessionNext.plans, decision.nextPlan]
    : sessionNext.plans;
  sessionNext.decisions = [...(sessionNext.decisions || []), decision];

  return { ctx: newCtx, session: sessionNext, decision };
}

/* ───────────────────────────── adaptation context helpers ───────────────────────────── */

/**
 * Build a pure context object from a profile + material map (main-side).
 */
export function buildAdaptationContext({ profile, materialsByObjective = {}, adaptiveLearning }) {
  const grade = profile?.grade;
  const skills = adaptiveLearning?.skills || {};
  // Aggregate observable behavior across practiced skills into ONE bounded
  // summary. This is what the ALE reads and what the local-AI prompt receives:
  // counts and coarse time bands, never identifiers or raw event history.
  const behaviorMetrics = aggregateBehaviorMetrics(skills);
  // Screening evidence, read for the first time. `deriveBaselineEvidence`
  // returns null unless there is enough per-task data, so an under-screened or
  // hand-edited profile can never influence adaptation.
  const baselineEvidence = deriveBaselineEvidence({
    screeningResults: profile?.screeningResults,
    readingBaseline: profile?.readingBaseline
  });
  return {
    grade,
    learnerId: profile?.learnerId,
    skillStates: skills,
    preferences: adaptiveLearning?.preferences || createDefaultPreferences(),
    materialsByObjective,
    readingBaseline: profile?.readingBaseline || null,
    baselineEvidence,
    behaviorMetrics,
    behaviorSummary: summarizeBehavior(behaviorMetrics),
    adaptiveMeta: adaptiveLearning?.meta || null
  };
}

/**
 * Bounded, privacy-safe learner context for the LOCAL model prompt (§10/§11A).
 *
 * Deliberately narrow: grade band, objective, the app's own mastery/pace
 * signals, and the strongest observed modality. It contains NO learner name or
 * id, NO age or avatar, NO free text, NO raw signal log, and NO diagnosis or
 * severity language — only counts, coarse bands, and enum ids the app itself
 * assigned. Every value is clamped here so a corrupt profile cannot widen it.
 *
 * @param {object} ctx adaptation context from buildAdaptationContext
 * @param {object} plan the nextPlan the ALE just decided
 * @returns {object} bounded context object (safe to serialize into a prompt)
 */
export function buildLearnerModelContext(ctx, plan) {
  const clamp01 = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.round(Math.min(1, Math.max(0, n)) * 100) / 100;
  };
  const clampInt = (v, lo, hi) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.min(hi, Math.max(lo, Math.round(n)));
  };

  const summary = ctx?.behaviorSummary || summarizeBehavior(ctx?.behaviorMetrics);
  const skillState = plan?.skillId ? ctx?.skillStates?.[plan.skillId] : null;
  // Per-skill observable patterns (recovery / effort / repeated errors). These
  // are coarse counts over a bounded window — never a label about the child.
  const patterns = summarizeLearningBehavior(skillState);
  const baselineCategory = plan?.skillId ? SKILL_BY_ID[plan.skillId]?.baselineCategory : null;
  const baselineForSkill = ctx?.baselineEvidence?.perCategory?.[baselineCategory] || null;

  return {
    gradeBand: ctx?.grade || null,
    objectiveId: plan?.objectiveId || null,
    skillId: plan?.skillId || null,
    activityType: plan?.activityType || null,
    difficulty: clampInt(plan?.difficulty, 1, 5),
    supportLevel: ['none', 'scaffold', 'guided'].includes(plan?.supportLevel) ? plan.supportLevel : 'none',
    preferredModality: strongestModality(ctx?.preferences),
    recentAttemptCount: clampInt(summary.sampleCount, 0, 50),
    lastResponseTimeBand: summary.responseTimeBand,
    helpOpenedCount: clampInt(summary.helpCount, 0, 50),
    audioReplayCount: clampInt(summary.replayCount, 0, 50),
    timedOutCount: clampInt(summary.timedOutCount, 0, 50),
    masteryForSkill: clamp01(skillState?.mastery),
    // Observable behavior patterns the ALE is currently reacting to.
    observedPatterns: {
      steadySuccesses: clampInt(patterns.steadySuccesses, 0, 50),
      effortfulSuccesses: clampInt(patterns.effortfulSuccesses, 0, 50),
      selfCorrections: clampInt(patterns.selfCorrections, 0, 50),
      assistedSuccesses: clampInt(patterns.assistedSuccesses, 0, 50),
      errorsObserved: clampInt(patterns.errorsObserved, 0, 50),
      timeoutsObserved: clampInt(patterns.timeoutsObserved, 0, 50),
      replays: clampInt(patterns.replays, 0, 50),
      backtrackCount: clampInt(patterns.backtrackCount, 0, 200)
    },
    // Screening pace/accuracy for this skill's category — only present when the
    // evidence gate passed, and only as an observable descriptor.
    baselinePaceAndAccuracy: baselineForSkill ? baselineForSkill.paceAndAccuracy : null,
    baselineAccuracy: baselineForSkill ? clamp01(baselineForSkill.accuracy) : null
  };
}