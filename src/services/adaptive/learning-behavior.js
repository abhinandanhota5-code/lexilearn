/**
 * Observable learning behavior (§ Lumi behavior pass).
 *
 * This module is PURE and DETERMINISTIC. It derives descriptors of what a
 * learner DID — pace, retries, self-correction, repeated errors, help, replays
 * — from evidence that is already persisted. It never infers a disorder,
 * intelligence, mental state, severity, or diagnosis, and it never stores or
 * returns free text, identifiers, or raw event logs.
 *
 * Every descriptor is a coarse, bounded enum or count so it is safe to hand to
 * the ALE and to the local-AI prompt.
 *
 * Vocabulary rule for this file: describe the OBSERVABLE ACTION
 * ("steady and accurate", "slow but accurate", "self-corrected"), never the
 * PERSON ("slow reader", "struggling child", "dyslexic").
 */

/* ───────────────────────── evidence gate ───────────────────────── */

/**
 * How much screening evidence is required before the baseline may influence
 * adaptation at all. Below these thresholds `deriveBaselineEvidence` returns
 * null and the ALE behaves exactly as it did before.
 */
export const BASELINE_EVIDENCE_MIN_TOTAL_TASKS = 12;
export const BASELINE_EVIDENCE_MIN_TASKS_PER_CATEGORY = 2;

/* ───────────────────────── pace bands ───────────────────────── */

/**
 * The single coarse response-time vocabulary. Shared by the ALE decision and
 * the local-AI prompt so both read the same signal. Deliberately only four
 * bands — no raw millisecond comparison survives into a decision.
 */
export function paceBand(ms) {
  if (ms == null || !Number.isFinite(ms)) return 'unknown';
  if (ms < 15000) return 'under_15s';
  if (ms < 30000) return '15_to_30s';
  if (ms < 60000) return '30_to_60s';
  return 'over_60s';
}

/** True when a band indicates an unhurried attempt. */
export function isSlowPace(band) {
  return band === '30_to_60s' || band === 'over_60s';
}

/* ───────────────────────── attempt classification ───────────────────────── */

/**
 * Classify ONE activity result by observable behavior.
 *
 * Order matters: assisted and self-corrected successes are recognised before a
 * plain success, because they carry more information about what support the
 * learner needed — not about what they can or cannot do.
 *
 * @param {object} result deterministic ActivityResult
 * @returns {'assisted_success'|'self_corrected'|'effortful_success'|'steady_success'|'error'|'timeout'}
 */
export function classifyAttempt(result) {
  if (!result || typeof result !== 'object') return 'error';
  const outcome = result.outcome;
  const correct = outcome === 'success' || outcome === 'help_success';
  if (outcome === 'timeout') return 'timeout';

  const attempts = Math.max(1, Number(result.attempts) || 1);
  const helped =
    (Number(result.hintsUsed) || 0) > 0 ||
    (Array.isArray(result.explanationsUsed) && result.explanationsUsed.length > 0) ||
    outcome === 'help_success';

  if (!correct) return 'error';

  // Recovery after a wrong attempt is a distinct, positive pattern: the learner
  // found the answer themselves after trying. It is NOT a first-try success and
  // NOT equivalent to repeated failure.
  if (attempts > 1 || result.correctOnFirstAttempt === false) return 'self_corrected';
  if (helped) return 'assisted_success';
  // A correct answer that took real time is an effortful success. It counts as a
  // success but must not be treated as evidence of ready-for-more-challenge.
  if (isSlowPace(paceBand(result.responseTimeMs))) return 'effortful_success';
  return 'steady_success';
}

/**
 * Patterns whose evidence is "the learner got there, but it took something
 * extra". Difficulty must NOT be raised on the strength of these alone.
 */
const EFFORTFUL_PATTERNS = new Set(['effortful_success', 'self_corrected', 'assisted_success']);

/* ───────────────────────── baseline evidence ───────────────────────── */

function finiteInt(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : fallback;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * A reading baseline is only usable when it was computed (has a timestamp) and
 * actually summarizes a session (a positive task count). A missing, empty, or
 * zero-task baseline means "not established yet", not "established as zero".
 */
export function isUsableReadingBaseline(readingBaseline) {
  if (!readingBaseline || typeof readingBaseline !== 'object') return false;
  if (typeof readingBaseline.computedAt !== 'string' || !readingBaseline.computedAt) return false;
  const total = Number(readingBaseline.totalTasksCompleted);
  return Number.isFinite(total) && total > 0;
}

/**
 * Derive observable reading behavior from the PERSISTED screening evidence.
 *
 * `screeningResults` already stores one 11-field record per task
 * (category, difficulty, isCorrect, selectedAnswer, responseTimeMs,
 * attemptedAt). This function finally reads it — but only behind a strict
 * evidence gate, and only to produce coarse descriptors.
 *
 * It deliberately produces NO label about the learner. It answers only
 * "what pace and what accuracy were observed, per category".
 *
 * @param {object} input
 * @param {object[]} [input.screeningResults] persisted per-task records
 * @param {object}   [input.readingBaseline] persisted baseline (optional)
 * @returns {object|null} bounded evidence, or null when evidence is insufficient
 */
export function deriveBaselineEvidence({ screeningResults, readingBaseline } = {}) {
  if (!Array.isArray(screeningResults) || screeningResults.length === 0) return null;

  // The screening evidence only counts if the baseline was actually COMPUTED
  // from it. Without this gate an old or partial profile could accumulate
  // enough raw rows to look "measured" while no baseline was ever established,
  // and an unset baseline would still change how the activity is presented.
  if (!isUsableReadingBaseline(readingBaseline)) return null;

  // Only trust records that actually carry the fields we reason about.
  const usable = screeningResults.filter(
    (r) => r && typeof r === 'object' && typeof r.isCorrect === 'boolean' && typeof r.category === 'string'
  );
  if (usable.length < BASELINE_EVIDENCE_MIN_TOTAL_TASKS) return null;

  const byCategory = new Map();
  for (const r of usable) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category).push(r);
  }

  const perCategory = {};
  let categoriesWithEvidence = 0;

  for (const [category, tasks] of [...byCategory.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (tasks.length < BASELINE_EVIDENCE_MIN_TASKS_PER_CATEGORY) continue;
    categoriesWithEvidence += 1;

    const correct = tasks.filter((t) => t.isCorrect);
    const incorrect = tasks.filter((t) => !t.isCorrect);
    const times = tasks
      .map((t) => Number(t.responseTimeMs))
      .filter((ms) => Number.isFinite(ms) && ms >= 0);
    const avgResponseTimeMs = Math.round(mean(times));
    const band = paceBand(avgResponseTimeMs);
    const accuracy = Math.round((correct.length / tasks.length) * 100) / 100;
    // A timeout is observable as an empty selection; the screening contract
    // stores `selectedAnswer: ''` for it.
    const timeouts = tasks.filter((t) => t.selectedAnswer === '').length;

    perCategory[category] = {
      tasksObserved: tasks.length,
      accuracy,
      avgResponseTimeMs,
      responseTimeBand: band,
      paceAndAccuracy: describePaceAndAccuracy(accuracy, band),
      errorsObserved: incorrect.length,
      timeoutsObserved: timeouts,
      hardestDifficultyAttempted: Math.max(...tasks.map((t) => finiteInt(t.difficulty, 1)))
    };
  }

  if (categoriesWithEvidence === 0) return null;

  return {
    evidence: 'sufficient',
    tasksObserved: usable.length,
    categoriesWithEvidence,
    // The baseline's own numbers are kept for continuity with existing reports.
    overallAccuracy: Math.round((usable.filter((r) => r.isCorrect).length / usable.length) * 100) / 100,
    // True only because the gate above already required a computed baseline.
    // Kept as an explicit fact so a consumer never has to re-derive the gate.
    baselineComputed: true,
    perCategory
  };
}

/**
 * The observable descriptors this phase is allowed to distinguish. Every branch
 * is a statement about observed pace plus observed accuracy — nothing else.
 */
function describePaceAndAccuracy(accuracy, band) {
  if (accuracy >= 0.8 && band === 'under_15s') return 'steady_and_accurate';
  if (accuracy >= 0.8 && isSlowPace(band)) return 'slow_but_accurate';
  if (accuracy >= 0.8) return 'accurate_at_mixed_pace';
  if (band === 'under_15s') return 'quick_with_mistakes';
  if (isSlowPace(band)) return 'slow_with_mistakes';
  return 'mixed_pace_with_mistakes';
}

/* ───────────────────────── learning-phase summary ───────────────────────── */

/**
 * Summarize the observable learning behaviors the ALE may react to, from a
 * single skill's persisted state.
 *
 * These are the six distinctions this phase asks the learner model to make:
 * steady accuracy, slow-but-accurate effort, self-correction, repeated errors,
 * repeated help, and replays.
 *
 * @param {object} state a sanitized skillState
 * @returns {object} bounded, deterministic descriptor set
 */
export function summarizeLearningBehavior(state) {
  const metrics = state?.behaviorMetrics || {};
  const window = Array.isArray(metrics.window) ? metrics.window : [];

  const attempts = window.reduce((sum, e) => sum + Math.max(1, finiteInt(e?.attempts, 1)), 0);
  const selfCorrected = window.reduce((sum, e) => sum + (finiteInt(e?.selfCorrected) > 0 ? 1 : 0), 0);
  const effortful = window.reduce((sum, e) => sum + (finiteInt(e?.effortful) > 0 ? 1 : 0), 0);
  const assisted = window.reduce((sum, e) => sum + (finiteInt(e?.assisted) > 0 ? 1 : 0), 0);
  const steady = window.reduce((sum, e) => sum + (finiteInt(e?.steady) > 0 ? 1 : 0), 0);
  const errors = window.reduce((sum, e) => sum + (finiteInt(e?.error) > 0 ? 1 : 0), 0);
  const timeouts = window.reduce((sum, e) => sum + (finiteInt(e?.timedOut) > 0 ? 1 : 0), 0);
  const helpOpens = window.reduce((sum, e) => sum + Math.max(0, finiteInt(e?.helpOpens)), 0);
  const replays = window.reduce((sum, e) => sum + Math.max(0, finiteInt(e?.replayCount)), 0);
  const tileRemovals = window.reduce((sum, e) => sum + Math.max(0, finiteInt(e?.tileRemovals)), 0);
  const optionInspects = window.reduce((sum, e) => sum + Math.max(0, finiteInt(e?.optionInspects)), 0);
  const lastBand = paceBand(window.length ? window[window.length - 1].responseTimeMs : null);

  return {
    sampleCount: window.length,
    lastResponseTimeBand: lastBand,
    // Counts of observable patterns over the bounded window.
    steadySuccesses: steady,
    effortfulSuccesses: effortful,
    selfCorrections: selfCorrected,
    assistedSuccesses: assisted,
    errorsObserved: errors,
    timeoutsObserved: timeouts,
    helpOpens,
    replays,
    // Repeated backtracking on a manipulable activity (tiles placed then removed)
    // or repeated option hovering are observable "re-reading / second-guessing"
    // proxies. They are counts, not inferences about the child.
    backtrackCount: tileRemovals,
    optionInspects,
    totalAttempts: attempts,
    // Streaks drive the "fast + consistently correct" and "repeated errors" cases.
    streakCorrect: Math.max(0, finiteInt(state?.streakCorrect)),
    streakWrong: Math.max(0, finiteInt(state?.streakWrong))
  };
}

/**
 * Decide whether an attempt may count as evidence that the learner is ready for
 * MORE challenge. Effortful successes and recoveries deliberately do not count,
 * so a long pause before a correct answer never raises difficulty.
 *
 * @param {object} result ActivityResult
 * @param {object} summary output of summarizeLearningBehavior
 * @returns {boolean}
 */
export function countsTowardMoreChallenge(result, summary) {
  if (classifyAttempt(result) !== 'steady_success') return false;
  return (summary?.streakCorrect ?? 0) >= 3;
}

/**
 * True when the learner reached the answer themselves after a wrong attempt.
 * Used by the companion to react to recovery, never to score the child.
 */
export function isSelfCorrection(result) {
  return classifyAttempt(result) === 'self_corrected';
}

export { EFFORTFUL_PATTERNS };
