/**
 * Grade-Aware Difficulty (bounded, deterministic, fail-closed)
 *
 * Requirement chain: Curriculum → Grade/Year → Learning Objective →
 * grade-specific difficulty bounds → ALE → ActivitySpecification → Question.
 *
 * Model (extends the existing 1..5 integer difficulty — nothing new to learn):
 *
 *   DifficultyBounds { min: 1..5, max: 1..5, default: min..max }  (min ≤ default ≤ max)
 *
 * Bounds come from independent bounded layers, combined so the NARROWEST
 * window wins:
 *
 *   1. Skill absolute floor:  [SKILL_BY_ID[skillId].minDifficulty,
 *                              SKILL_BY_ID[skillId].maxDifficulty] (default [1,5])
 *   2. Grade ceiling:         [1, FULL_GRADE_CEILINGS[grade]] — the existing
 *      GRADES_MAX_DIFFICULTY table (KG..6th unchanged) extended monotonically
 *      over the full 12-grade ladder.
 *   3. Per-objective, per-grade layer: an objective may DECLARE
 *      `gradeDifficultyBounds` (canonicalGrade → { min, max, default? }) and
 *     /or a `defaultDifficulty`. When nothing is declared, a deterministic
 *      DERIVED curve is computed from the objective's own gradeRange
 *      (see derivedBoundsForGrade). The objective's declared grade band is
 *      itself the curriculum signal — nothing is invented for grades the
 *      objective does not claim.
 *
 * Difficulty determines task COMPLEXITY, not which concepts are taught:
 * content comes from verified school materials + objectives; bounds shape how
 * demanding the activity presentation is. Learner performance (R4/R5) moves
 * difficulty only WITHIN the resolved bounds; it can never exceed them.
 *
 * Fail-closed rule: an objective whose gradeRange does not contain the
 * learner's grade, or whose declared bounds are structurally invalid, gets
 * NO resolved bounds → the ALE refuses to produce a plan for it rather than
 * guessing a difficulty.
 *
 * No medical or developmental assumptions are made from grade alone: the
 * curve is a deterministic lookup, not a claim about children.
 */

import { SKILL_BY_ID } from '../adaptive/adaptive-config.js';
import { CANONICAL_GRADES } from './curriculum-schema.js';
import { OBJECTIVE_BY_ID } from '../adaptive/objective-registry.js';

/**
 * Full monotone non-decreasing grade→ceiling curve (KG..12th Grade).
 * KG..6th Grade are byte-identical to the existing GRADES_MAX_DIFFICULTY
 * (adaptive-config) — existing behavior is preserved; 7th..12th continue the
 * curve at the existing global ceiling of 5.
 */
export const FULL_GRADE_CEILINGS = Object.freeze({
  Kindergarten: 2,
  '1st Grade': 3,
  '2nd Grade': 3,
  '3rd Grade': 4,
  '4th Grade': 4,
  '5th Grade': 5,
  '6th Grade': 5,
  '7th Grade': 5,
  '8th Grade': 5,
  '9th Grade': 5,
  '10th Grade': 5,
  '11th Grade': 5,
  '12th Grade': 5
});

/**
 * Deterministic COMPLEXITY DIMENSIONS derived from a resolved bound +
 * difficulty (requirement: cognitive demand, steps, information, vocabulary,
 * distractors, reasoning, abstraction, scaffolding). All values are bounded
 * integers derived by pure arithmetic — no content, no randomness, no
 * developmental claims. `scaffoldingLevel` is inverse: higher difficulty →
 * less scaffolding.
 */
export const COMPLEXITY_DIMENSIONS = Object.freeze([
  'cognitiveDemand',
  'stepCount',
  'informationLoad',
  'vocabularyComplexity',
  'distractorComplexity',
  'reasoningRequired',
  'abstractionLevel',
  'scaffoldingLevel'
]);

/* ───────────────────────── validation helpers ───────────────────────── */

function isNonEmptyString(v, max = 200) {
  return typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;
}

function clampInt(v, lo, hi) {
  const n = Number(v);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.floor(n)));
}

/**
 * Validate a bounds object { min, max, default? }.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateBounds(b) {
  const errors = [];
  if (!b || typeof b !== 'object' || Array.isArray(b)) {
    return { ok: false, errors: ['bounds object is required.'] };
  }
  const { min, max, default: dflt } = b;
  for (const [name, value] of [['min', min], ['max', max]]) {
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      errors.push(`bounds.${name} must be an integer in [1, 5].`);
    }
  }
  if (Number.isInteger(min) && Number.isInteger(max) && min > max) {
    errors.push('bounds.min must be <= bounds.max.');
  }
  if (dflt !== undefined) {
    if (!Number.isInteger(dflt) || dflt < 1 || dflt > 5) {
      errors.push('bounds.default must be an integer in [1, 5].');
    } else if (Number.isInteger(min) && Number.isInteger(max) && (dflt < min || dflt > max)) {
      errors.push('bounds.default must lie within [min, max].');
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Normalize/validate an objective's optional `gradeDifficultyBounds` map.
 * Keys must be canonical grades; values must be valid bounds. The whole map
 * is rejected if ANY entry is invalid (fail-closed, no silent partial data).
 * @returns {{ ok: boolean, bounds: object, errors: string[] }}
 */
export function normalizeGradeDifficultyBounds(raw) {
  if (raw === undefined || raw === null) return { ok: true, bounds: {}, errors: [] };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, bounds: {}, errors: ['gradeDifficultyBounds must be an object keyed by canonical grade.'] };
  }
  const bounds = {};
  for (const key of Object.keys(raw)) {
    if (!CANONICAL_GRADES.includes(key)) {
      return { ok: false, bounds: {}, errors: [`gradeDifficultyBounds key "${key}" is not a canonical grade.`] };
    }
    const check = validateBounds(raw[key]);
    if (!check.ok) {
      return { ok: false, bounds: {}, errors: [`gradeDifficultyBounds["${key}"] invalid: ${check.errors.join(' ')}`] };
    }
    bounds[key] = { ...raw[key] };
  }
  return { ok: true, bounds, errors: [] };
}

/* ───────────────────────── derived per-grade curve ───────────────────────── */

/**
 * Deterministic derived bounds for an objective at a grade, computed ONLY
 * from the objective's own declared gradeRange (no invented content):
 *
 *   lowRank  = canonical rank of the objective's lowest declared grade
 *   highRank = canonical rank of the objective's highest declared grade
 *   spread   = highRank - lowRank (grade steps this objective spans)
 *   k        = steps above the objective's lowest grade for the learner's grade
 *
 *   window at the objective's lowest grade:  [1, 1 + spread]
 *   window at each later grade:              [1 + k, min(5, 1 + spread + k)]
 *
 * The curve is monotone non-decreasing in grade, bounded to 1..5, and
 * identical for every learner of the same grade/objective. Grades the
 * objective does not declare return null (the caller fail-closes; the ALE's
 * R1a gate already never selects such objectives).
 */
export function derivedBoundsForGrade(objective, grade) {
  if (!objective || !Array.isArray(objective.gradeRange) || objective.gradeRange.length === 0) {
    return null;
  }
  const ranks = objective.gradeRange
    .map((g) => CANONICAL_GRADES.indexOf(g))
    .filter((r) => r >= 0);
  if (ranks.length === 0) return null;
  const lowRank = Math.min(...ranks);
  const highRank = Math.max(...ranks);
  const spread = highRank - lowRank;
  const gradeRank = CANONICAL_GRADES.indexOf(grade);
  if (gradeRank < 0 || gradeRank < lowRank) return null;

  const k = gradeRank - lowRank; // 0-based steps above the lowest declared grade
  const min = Math.min(5, 1 + k);
  const max = Math.min(5, 1 + spread + k);
  if (min > max) return null;
  return { min, max };
}

/* ───────────────────────── resolution entry point ───────────────────────── */

/**
 * Resolve the effective difficulty bounds for (objective, grade, skill).
 *
 * @param {object} input
 * @param {string} input.objectiveId  ALE objective id
 * @param {string} input.grade        canonical grade (profile grade)
 * @param {string} [input.skillId]    ALE skill id (for the absolute skill floor)
 * @returns {{ ok: true, bounds: {min,max,default}, source: string, complexity: object }
 *          | { ok: false, error: string }}  fail-closed: ok:false → no plan
 */
export function resolveObjectiveGradeBounds({ objectiveId, grade, skillId = null }) {
  if (!isNonEmptyString(objectiveId) || !isNonEmptyString(grade)) {
    return { ok: false, error: 'objectiveId and grade are required to resolve difficulty bounds.' };
  }
  const objective = OBJECTIVE_BY_ID[objectiveId];
  if (!objective) {
    return { ok: false, error: `Unknown objective "${objectiveId}" — refusing to resolve bounds (fail-closed).` };
  }
  if (!CANONICAL_GRADES.includes(grade)) {
    return { ok: false, error: `"${grade}" is not a canonical grade — refusing to resolve bounds (fail-closed).` };
  }
  // Grade-band gate (fail-closed): the objective must actually cover the grade.
  if (!Array.isArray(objective.gradeRange) || !objective.gradeRange.includes(grade)) {
    return { ok: false, error: `Objective "${objectiveId}" does not cover grade "${grade}" — no bounds (fail-closed).` };
  }

  const gradeCeiling = FULL_GRADE_CEILINGS[grade];
  if (!Number.isInteger(gradeCeiling)) {
    return { ok: false, error: `No grade ceiling defined for "${grade}" — refusing to guess (fail-closed).` };
  }

  const skill = skillId ? SKILL_BY_ID[skillId] : null;
  const skillMin = skill?.minDifficulty ?? 1;
  const skillMax = skill?.maxDifficulty ?? 5;

  // Declared per-grade bounds narrow the window; the derived curve provides a
  // deterministic default when nothing is declared.
  const declaredRaw = objective.gradeDifficultyBounds?.[grade] || null;
  const declaredCheck = declaredRaw ? validateBounds(declaredRaw) : { ok: true, errors: [] };
  if (!declaredCheck.ok) {
    return { ok: false, error: `Invalid declared bounds for "${objectiveId}" at "${grade}": ${declaredCheck.errors.join(' ')} (fail-closed).` };
  }
  const derived = derivedBoundsForGrade(objective, grade);
  const layer = declaredRaw || derived;
  if (!layer) {
    return { ok: false, error: `No difficulty bounds resolvable for "${objectiveId}" at "${grade}" (fail-closed).` };
  }

  // Narrowest window wins, always inside the skill floor + grade ceiling.
  const min = Math.max(1, skillMin, layer.min);
  const max = Math.min(5, skillMax, gradeCeiling, layer.max);
  if (min > max) {
    return {
      ok: false,
      error: `Conflicting difficulty bounds for "${objectiveId}" at "${grade}" (skill floor ${skillMin}-${skillMax}, grade ceiling ${gradeCeiling}, layer ${layer.min}-${layer.max}) — fail-closed.`
    };
  }
  let dflt = Number.isInteger(layer.default) ? layer.default : Math.floor((min + max + 1) / 2);
  dflt = clampInt(dflt, min, max);

  const bounds = Object.freeze({ min, max, default: dflt });
  return {
    ok: true,
    bounds,
    source: declaredRaw ? 'declared' : 'derived',
    complexity: complexityProfileFor({ bounds, difficulty: dflt })
  };
}

/* ───────────────────────── clamp helpers ───────────────────────── */

/**
 * Clamp a requested difficulty into resolved bounds (min ≤ d ≤ max).
 * Integers only — non-integer requests are rejected (determinism).
 */
export function clampDifficultyToBounds(requested, bounds) {
  if (!bounds || !Number.isInteger(bounds.min) || !Number.isInteger(bounds.max) || bounds.min > bounds.max) {
    return { ok: false, error: 'Valid resolved bounds are required to clamp difficulty.' };
  }
  if (!Number.isInteger(requested)) {
    return { ok: false, error: 'Requested difficulty must be an integer.' };
  }
  return { ok: true, difficulty: Math.min(bounds.max, Math.max(bounds.min, requested)) };
}

/**
 * Deterministic COMPLEXITY PROFILE for an activity at a difficulty within
 * resolved bounds. Pure arithmetic over the difficulty level — the values
 * shape presentation complexity (how demanding the task is), never content.
 * Bounded: every dimension lands in a fixed small range.
 */
export function complexityProfileFor({ bounds, difficulty }) {
  if (!bounds || !Number.isInteger(bounds.min) || !Number.isInteger(bounds.max)) return null;
  if (!Number.isInteger(difficulty)) return null;
  const within = clampInt(difficulty - bounds.min, 0, Math.max(0, bounds.max - bounds.min));
  const profile = {
    cognitiveDemand: clampInt(1 + within, 1, 5),
    stepCount: clampInt(1 + Math.floor(within / 2), 1, 3),
    informationLoad: clampInt(1 + Math.floor(within / 2), 1, 3),
    vocabularyComplexity: clampInt(1 + within, 1, 5),
    distractorComplexity: clampInt(1 + within, 1, 5),
    reasoningRequired: clampInt(1 + within, 1, 5),
    abstractionLevel: clampInt(1 + Math.floor(within / 2), 1, 3),
    // Scaffolding is inverse: harder task within the window → less support.
    scaffoldingLevel: clampInt(3 - within, 1, 3)
  };
  return Object.freeze({
    difficulty,
    boundsMin: bounds.min,
    boundsMax: bounds.max,
    within,
    dims: Object.freeze(profile)
  });
}
