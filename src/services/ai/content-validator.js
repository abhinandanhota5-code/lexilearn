/**
 * ContentValidator (§8A) — deterministic, fail-closed content gates.
 *
 * Applies ALL §8A gates to any generated or selected learning content before
 * it is shown to the learner or persisted:
 *   1. Grade-appropriate            (ALIGN-1: objective binding + grade range)
 *   2. Grounded in school material  (bounded-excerpt rule; LLM tier requires
 *      an excerpt, deterministic tier may serve built-in content)
 *   3. Aligned with the objective   (ALIGN-2 coverage, ALIGN-3 vocabulary,
 *      ALIGN-4 intent signal)
 *   4. Within difficulty bounds     (skill min/max + per-grade ceiling)
 *   5. Schema-correct activity      (activity type + required content shape)
 *   6. Answer integrity             (answer present, formable in build mode,
 *      present among options in choose mode — the answer is NEVER rewritten)
 *   7. Age-appropriate / safe       (no clinical, diagnostic, shaming, or
 *      self-identifying content; length caps; no answer disclosure)
 *
 * Authority rule: the LLM proposes text; this validator is the sole accept/
 * reject authority. Any layer that cannot conclusively confirm alignment
 * rejects (fail-closed) and the caller falls back to curated content.
 *
 * Model-independent: no LLM provider imports; reusable by the future Llama
 * layer, IPC handlers, and activity factories alike.
 */

import {
  SKILL_BY_ID,
  GRADE_CEILING
} from '../adaptive/adaptive-config.js';
import {
  extractTerms,
  isTermAllowedAtGrade,
  GRADE_VOCABULARY,
  CORE_COMMON
} from './grade-vocabulary.js';
import { OBJECTIVE_BY_ID } from '../adaptive/objective-registry.js';
import { VALID_ACTIVITY_TYPES } from '../learning/activity-contract.js';

/* ───────────────────────── config constants ───────────────────────── */

export const VALIDATOR_CONFIG = Object.freeze({
  MIN_OBJECTIVE_COVERAGE: 0.5,
  MAX_NOVEL_TERMS: 3,
  EXCERPT_TERMS_CAP: 400,
  MAX_EXPLANATION_CHARS: 240,
  MAX_QUESTION_CHARS: 90,
  MAX_OPTIONS: 6,
  MIN_OPTIONS: 2,
  MAX_TILES: 12,
  MIN_TILES: 2,
  MAX_SYLLABLES: 8,
  MIN_SYLLABLES: 2
});

/** Alignment layer outcomes. */
export const ALIGN_RESULTS = Object.freeze({
  ALIGN_PASS: 'align_pass',
  ALIGN_FAIL: 'align_fail',
  ALIGN_INCONCLUSIVE: 'align_inconclusive'
});

/** Content source tiers — mirrors §8. */
export const CONTENT_SOURCES = Object.freeze({
  DETERMINISTIC: 'deterministic',
  LLM: 'llm'
});

/* ───────────────────────── forbidden patterns ───────────────────────── */

/**
 * Deterministic safety/tone filter (case-insensitive, word-bounded):
 * clinical/diagnostic labels, shaming or ability judgments, test/score talk,
 * meta/self-identification ("I'm an AI"), and tool/network references.
 */
export const FORBIDDEN_CONTENT_PATTERNS = Object.freeze([
  // Diagnosis / clinical labels
  /\bdyslexi(a|c)\b/i,
  /\bdisabilit(y|ies)\b/i,
  /\bdisorder(s)?\b/i,
  /\bdeficit\b/i,
  /\bdiagnos(e|ed|is|tic)\b/i,
  /\bcondition\b/i,
  /\btherap(y|ist)\b/i,
  /\bclinic(al|ally)?\b/i,
  /\bsymptom(s)?\b/i,
  /\bIEP\b/,
  /\bspecial\s+needs?\b/i,
  /\bremedial\b/i,
  /\bintervention\b/i,

  // Shaming / ability judgments
  /\bstruggl(e|es|ing|ed)\b/i,
  /\bcan'?t (read|spell|learn|do|answer|understand)\b/i,
  /\bharder for you\b/i,
  /\bbehind (the|your) (class|others|peers)\b/i,
  /\bfail(ing|ed|ure)?\b/i,
  /\bstupid\b/i,
  /\blazy\b/i,
  /\btoo (slow|dumb|hard for you)\b/i,

  // Test / score / pressure talk
  /\bpercentile\b/i,
  /\bscore(s|d|ing)?\b/i,
  /\bIQ\b/,
  /\bexam\b/i,
  /\bgrading\b/i,

  // Self-identification / meta tool talk
  /\bI am an AI\b/i,
  /\bI'?m an AI\b/i,
  /\bas an AI\b/i,
  /\bI am a (computer|machine|bot|robot|language model)\b/i,
  /\blanguage model\b/i,
  /\balgorithm\b/i,
  /\bwebsite\b/i,
  /\binternet\b/i,
  /\bdownload\b/i,
  /\binstall\b/i,

  // Unsafe / unrelated-for-children
  /\bgun\b/i,
  /\bweapon\b/i,
  /\bdrug(s)?\b/i,
  /\balcohol\b/i,
  /\bkill\b/i,
  /\bdie\b/i,
  /\bblood\b/i
]);

/* ───────────────────────── small helpers ───────────────────────── */

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

/** Deterministic normalization: collapse whitespace, trim, keep case. */
function normalizeText(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

/** Extract content terms using the shared curated tokenizer. */
function termsOf(text) {
  return extractTerms(normalizeText(text));
}

/**
 * Plural-aware collection membership. The shared tokenizer collapses trailing
 * 's' (process → proces), while curated metadata holds unstripped forms, so
 * comparisons must try both shapes. Deterministic.
 */
function collectionHas(collection, term) {
  if (collection.includes(term)) return true;
  if (term.length > 3 && collection.includes(`${term}s`)) return true;
  if (term.length > 4 && term.endsWith('s') && collection.includes(term.slice(0, -1))) return true;
  return false;
}

/** Plural-aware token lookup (collection side holds curated forms). */
function tokenHas(tokens, term) {
  if (tokens.includes(term)) return true;
  if (term.length > 3 && term.endsWith('s') && tokens.includes(term.slice(0, -1))) return true;
  if (tokens.includes(`${term}s`)) return true;
  return false;
}

function clampUnused() { return null; }

/**
 * Supplemental common child-safe words allowed at ANY grade (ALIGN-3).
 * The curated per-grade sets in grade-vocabulary.js are intentionally small;
 * ordinary narrative words that any grade-level child knows would otherwise
 * reject valid grounded content. Terms in this set (or CORE_COMMON) are
 * exempt from the MAX_NOVEL_TERMS count — ordinary narrative vocabulary is
 * not invented curriculum — but every remaining novel term is still capped
 * and grade-checked. Both sets are curated, frozen, deterministic, and never
 * model-derived.
 */
export const SUPPLEMENTARY_COMMON_WORDS = Object.freeze([
  'happen', 'happens', 'puddle', 'puddles', 'sky', 'hazy', 'mist', 'fog',
  'lake', 'river', 'rise', 'rises', 'float', 'floats', 'form', 'forms',
  'droplet', 'droplets', 'breeze', 'puddling'
]);

/**
 * Grade-vocabulary allowance with plural + supplemental fallback (ALIGN-3).
 */
function termAllowedAtGrade(term, grade) {
  if (isTermAllowedAtGrade(term, grade)) return true;
  if (SUPPLEMENTARY_COMMON_WORDS.includes(term)) return true;
  const set = GRADE_VOCABULARY[grade];
  if (!set) return false;
  return set.includes(term) || (term.length > 3 && set.includes(`${term}s`));
}

/**
 * Whether a term is a curated common child-safe word (ALIGN-3). Common words
 * are grade-independent by design: they never count toward MAX_NOVEL_TERMS
 * (ordinary narrative vocabulary is not invented curriculum) and never need a
 * per-grade vocabulary entry. Deterministic set membership only.
 */
function isCommonChildSafeTerm(term) {
  const variants = new Set([
    term,
    term.length > 3 ? `${term}s` : null,
    term.length > 4 && term.endsWith('s') ? term.slice(0, -1) : null
  ].filter(Boolean));
  for (const v of variants) {
    if (CORE_COMMON.has(v) || SUPPLEMENTARY_COMMON_WORDS.includes(v)) return true;
  }
  return false;
}

/** Excerpt terms, capped (§8A.3 EXCERPT_TERMS_CAP). */
function excerptTermsOf(excerpt) {
  if (!excerpt) return [];
  return extractTerms(excerpt).slice(0, VALIDATOR_CONFIG.EXCERPT_TERMS_CAP);
}

/** Whether any forbidden pattern matches; returns matched pattern sources. */
function findForbiddenMatches(content) {
  return FORBIDDEN_CONTENT_PATTERNS.filter((p) => p.test(content)).map((p) => String(p));
}

/* ───────────────────────── ALIGN layer helpers ───────────────────────── */

/**
 * ALIGN-1 — Objective binding.
 * The objective must resolve to a curated objective whose gradeRange includes
 * the learner's grade; skill binding must match the objective's first skill.
 */
export function validateObjectiveBinding({ objectiveId, skillId, grade, gradeRange }) {
  const objective = OBJECTIVE_BY_ID[objectiveId];
  if (!objective) {
    return { pass: false, reason: 'unknown_objective', objective: null };
  }
  if (!grade || !objective.gradeRange.includes(grade)) {
    return { pass: false, reason: 'objective_out_of_grade', objective };
  }
  if (skillId) {
    const expectedSkill = Array.isArray(objective.targetSkills) && objective.targetSkills.length > 0
      ? objective.targetSkills[0]
      : null;
    if (expectedSkill && skillId !== expectedSkill) {
      return { pass: false, reason: 'objective_skill_mismatch', objective };
    }
    if (gradeRange && Array.isArray(gradeRange) && gradeRange.length > 0) {
      const compatible = gradeRange.every((g) => objective.gradeRange.includes(g)) || gradeRange.includes(grade);
      if (!compatible) {
        return { pass: false, reason: 'objective_grade_range_mismatch', objective };
      }
    }
  }
  return { pass: true, reason: 'objective_binding_ok', objective };
}

/**
 * ALIGN-2 — Concept coverage over objective metadata + excerpt context.
 * coverage = |contentTerms ∩ coreTerms| / |coreTerms|.
 * Objectives without coreTerms cannot fail on coverage (nothing to cover).
 */
export function validateCoverage(content, objective, excerpt) {
  const contentTerms = termsOf(content);
  const coreTerms = asArray(objective?.coreTerms);
  if (coreTerms.length === 0) {
    return { pass: true, coverage: 1, perTerm: [], coreTerms: [] };
  }
  const excerptTerms = excerptTermsOf(excerpt);
  const hits = coreTerms.filter((term) => tokenHas(contentTerms, term));
  const coverage = hits.length / coreTerms.length;
  const perTerm = coreTerms.map((term) => ({
    term,
    inContent: tokenHas(contentTerms, term),
    inExcerpt: tokenHas(excerptTerms, term),
    inCoreTerms: true
  }));
  return {
    pass: coverage >= VALIDATOR_CONFIG.MIN_OBJECTIVE_COVERAGE,
    coverage,
    perTerm
  };
}

/**
 * ALIGN-3 — Grounded vocabulary / no invention.
 * novelTerms = contentTerms ∖ (coreTerms ∪ contextTerms ∪ excerptTerms).
 * Excluded concepts ALWAYS reject. Common child-safe words (curated,
 * grade-independent) are exempt from the MAX_NOVEL_TERMS count; every other
 * novel term counts toward the cap and must appear in the curated grade
 * vocabulary. The result records the COUNTED terms so each decision stays
 * inspectable and testable.
 */
export function validateNovelTerms(content, objective, excerpt, grade) {
  const contentTerms = termsOf(content);
  const core = asArray(objective?.coreTerms);
  const context = asArray(objective?.contextTerms);
  const excluded = asArray(objective?.excludedConcepts);
  const excerptTerms = excerptTermsOf(excerpt);

  const excludedHits = excluded.filter((concept) =>
    termsOf(concept).some((t) => tokenHas(contentTerms, t))
  );
  if (excludedHits.length > 0) {
    return { pass: false, novelTerms: [], outOfVocab: [], excludedHits, reason: 'excluded_concept_present' };
  }

  const novelTerms = contentTerms.filter(
    (t) => !collectionHas(core, t) && !collectionHas(context, t) && !collectionHas(excerptTerms, t)
  );

  // Only non-common novel terms count toward the invention cap.
  const countedNovel = novelTerms.filter((t) => !isCommonChildSafeTerm(t));

  if (countedNovel.length > VALIDATOR_CONFIG.MAX_NOVEL_TERMS) {
    return { pass: false, novelTerms: countedNovel, outOfVocab: [], excludedHits: [], reason: 'too_many_novel_terms' };
  }

  const outOfVocab = countedNovel.filter((t) => !termAllowedAtGrade(t, grade));
  if (outOfVocab.length > 0) {
    return { pass: false, novelTerms: countedNovel, outOfVocab, excludedHits: [], reason: 'novel_terms_out_of_vocab' };
  }

  return { pass: true, novelTerms: countedNovel, outOfVocab: [], excludedHits: [], reason: 'novel_terms_ok' };
}

/**
 * Light deterministic stem for intent matching only: trailing 'ing'/'ed'/'s'
 * collapses morphological variants of the same word (changing → chang,
 * covered → cover). Matches the extractTerms plural-collapse spirit; purely
 * rule-based, never model-derived.
 */
function intentStem(term) {
  if (term.length > 5 && term.endsWith('ing')) return term.slice(0, -3);
  if (term.length > 5 && term.endsWith('ed')) return term.slice(0, -2);
  if (term.length > 3 && term.endsWith('s')) return term.slice(0, -1);
  return term;
}

/**
 * ALIGN-4 — Intent signal (weak, non-authoritative).
 * Deterministic overlap between content tokens and the learningStatement's
 * SALIENT tokens — statement terms minus the objective's coreTerms, because
 * core terms are exactly what ALIGN-2 already checks; counting them here
 * would let any core-term echo read as "intent" and make the signal
 * meaningless. Can downgrade confidence; NEVER accepts or rejects alone.
 */
export function validateIntentSignal(content, objective) {
  const statement = normalizeText(objective?.learningStatement || '');
  if (!statement || !content) {
    return { level: 'neutral', salientHitCount: 0, salientHits: [] };
  }
  const core = new Set(asArray(objective?.coreTerms).map((t) => t.toLowerCase()));
  const contentTerms = new Set(termsOf(content).flatMap((t) => [t, intentStem(t)]));
  const salientHits = termsOf(statement)
    .filter((t) => !core.has(t))
    .filter((t) => contentTerms.has(t) || contentTerms.has(intentStem(t)));
  const level = salientHits.length >= 2 ? 'strong' : salientHits.length === 1 ? 'neutral' : 'weak';
  return { level, salientHitCount: salientHits.length, salientHits };
}

/* ───────────────────────── other §8A gates ───────────────────────── */

/**
 * Grade gate — learner grade must appear in the effective gradeRange.
 */
export function validateGrade({ grade, gradeRange, objective }) {
  if (!grade || typeof grade !== 'string') return { pass: false, reason: 'missing_grade' };
  const range = asArray(gradeRange).length > 0 ? asArray(gradeRange) : asArray(objective?.gradeRange);
  if (range.length === 0) return { pass: false, reason: 'invalid_grade_range' };
  if (!range.includes(grade)) return { pass: false, reason: 'grade_not_in_range' };
  return { pass: true, reason: 'grade_ok' };
}

/**
 * Difficulty bounds gate — rejects out-of-bounds difficulty; returns the
 * normalized integer when valid. Never rewrites difficulty upward.
 */
export function validateDifficulty(difficulty, skillId, grade) {
  const skill = SKILL_BY_ID[skillId] || null;
  const ceiling = GRADE_CEILING(grade);
  const max = Math.min(skill?.maxDifficulty ?? 5, ceiling);
  const min = Math.max(1, skill?.minDifficulty ?? 1);
  const n = Number(difficulty);
  if (!Number.isFinite(n)) return { pass: false, reason: 'difficulty_invalid' };
  if (!Number.isInteger(n)) return { pass: false, reason: 'difficulty_not_integer' };
  if (n < min) return { pass: false, reason: 'difficulty_below_skill_floor' };
  if (n > max) return { pass: false, reason: 'difficulty_above_grade_ceiling' };
  return { pass: true, reason: 'difficulty_ok', normalized: n };
}

/**
 * Answer integrity — the intended answer is NEVER rewritten. Choose mode:
 * answer must be a non-empty option (exactly-one-correct enforcement is a
 * warning; duplicates reject). Build mode: the answer must be formable from
 * the supplied tiles/syllables/correctOrder (multiset containment).
 */
export function validateAnswerIntegrity(content, mode = 'choose') {
  const answer = content.answerKey ?? content.answer;
  const answerNorm = normalizeText(Array.isArray(answer) ? answer.join('-') : answer);
  if (!isNonEmptyString(answer) && !Array.isArray(answer)) {
    return { pass: false, reason: 'answer_missing' };
  }

  if (mode === 'build') {
    const material = asArray(content.tiles || content.syllables || content.correctOrder).map((t) => normalizeText(t)).filter(Boolean);
    if (material.length === 0) return { pass: false, reason: 'build_material_missing' };
    const need = (Array.isArray(answer) ? answer : answerNormOf(answer)).map((p) => normalizeText(p)).filter(Boolean);

    // Piece-level multiset containment (syllable chunks, word tiles).
    let pieceOk = true;
    const havePieces = [...material];
    for (const piece of need) {
      const idx = havePieces.indexOf(piece);
      if (idx === -1) { pieceOk = false; break; }
      havePieces.splice(idx, 1);
    }
    if (pieceOk) return { pass: true, reason: 'answer_formable' };

    // Letter-level fallback for letter-tile build items (answer 'cat' from
    // tiles c,a,t). Char multiset of the answer must be coverable.
    const answerChars = answerNorm.replace(/[^a-z0-9]/gi, '').split('');
    const materialChars = material.join('').replace(/[^a-z0-9]/gi, '').split('');
    const have = [...materialChars];
    for (const ch of answerChars) {
      const idx = have.indexOf(ch);
      if (idx === -1) return { pass: false, reason: 'answer_not_formable_from_material' };
      have.splice(idx, 1);
    }
    return { pass: true, reason: 'answer_formable' };
  }

  // choose mode — answer must appear among the options.
  const options = asArray(content.options).map((o) => normalizeText(o));
  if (options.length === 0) return { pass: false, reason: 'options_missing' };
  const answerOption = normalizeText(Array.isArray(answer) ? answer.join(' ') : answer);
  if (!options.includes(answerOption)) {
    return { pass: false, reason: 'answer_not_in_options' };
  }
  const unique = new Set(options);
  if (unique.size !== options.length) {
    return { pass: false, reason: 'duplicate_options' };
  }
  return { pass: true, reason: 'answer_in_options' };
}

function answerNormOf(answer) {
  return String(answer).replace(/-/g, ' ').split(/\s+/);
}

/**
 * Activity schema gate — activity type must be registered and the content
 * shape must satisfy its builder contract (options / tiles / syllables).
 */
export function validateActivitySchema({ activityType, mode, content }) {
  if (!VALID_ACTIVITY_TYPES.includes(activityType)) {
    return { pass: false, reason: 'unknown_activity_type' };
  }
  if (mode && mode !== 'choose' && mode !== 'build') {
    return { pass: false, reason: 'invalid_mode' };
  }
  if (!content || typeof content !== 'object') {
    return { pass: false, reason: 'content_missing' };
  }
  if (activityType === 'sentence_mc' || activityType === 'sound_detect') {
    const options = asArray(content.options);
    if (options.length < VALIDATOR_CONFIG.MIN_OPTIONS || options.length > VALIDATOR_CONFIG.MAX_OPTIONS) {
      return { pass: false, reason: 'options_count_out_of_bounds' };
    }
  }
  if (activityType === 'word_build') {
    const tiles = asArray(content.tiles);
    if (tiles.length < VALIDATOR_CONFIG.MIN_TILES || tiles.length > VALIDATOR_CONFIG.MAX_TILES) {
      return { pass: false, reason: 'tiles_count_out_of_bounds' };
    }
  }
  if (activityType === 'syllable_split') {
    const syllables = asArray(content.syllables);
    if (syllables.length < VALIDATOR_CONFIG.MIN_SYLLABLES || syllables.length > VALIDATOR_CONFIG.MAX_SYLLABLES) {
      return { pass: false, reason: 'syllables_count_out_of_bounds' };
    }
  }
  if (!isNonEmptyString(content.prompt)) {
    return { pass: false, reason: 'prompt_missing' };
  }
  return { pass: true, reason: 'activity_schema_ok' };
}

/**
 * Length gate — explanation vs question caps (§8A.5).
 */
export function validateLength(content, kind) {
  const text = normalizeText(typeof content === 'string' ? content : content?.text || content?.prompt || '');
  if (!text) return { pass: false, reason: 'empty_content' };
  const isExplanation = typeof kind === 'string' && kind.includes('example') || kind === 'make_simpler' || kind === 'show_me' || kind === 'tell_me' || kind === 'break_it_down';
  const cap = isExplanation ? VALIDATOR_CONFIG.MAX_EXPLANATION_CHARS : VALIDATOR_CONFIG.MAX_QUESTION_CHARS;
  if (text.length > cap) {
    return { pass: false, reason: 'content_over_length', cap, actual: text.length };
  }
  return { pass: true, reason: 'length_ok', cap, actual: text.length };
}

/* ───────────────────────── orchestrator ───────────────────────── */

/**
 * Full §8A gate pipeline. Fail-closed: any inconclusive or conflicting
 * evidence rejects. The returned object always carries `valid`, `reasons`,
 * `warnings`, and `normalizedContent` (null when rejected).
 *
 * @param {object} input
 * @param {string}   [input.content]        Explanation/example text (LLM tier)
 * @param {object}   [input.activity]       Full activity content to gate
 * @param {string}   input.kind             Help kind or 'question'
 * @param {string}   input.objectiveId
 * @param {string}   [input.skillId]
 * @param {string}   input.grade
 * @param {string[]} [input.gradeRange]
 * @param {number}   [input.difficulty]
 * @param {object}   [input.objective]      Objective metadata (resolved from registry when omitted)
 * @param {string|null} [input.sourceExcerpt] Learner's school-material excerpt
 * @param {string|null} [input.answerLeak]   Live MC answer that must not appear in content
 * @param {string}   [input.source]         'deterministic' | 'llm'
 * @returns {{ valid: boolean, reasons: string[], warnings: string[], normalizedContent: object|null, alignment: object }}
 */
export function validate(input) {
  const reasons = [];
  const warnings = [];
  const {
    content = null,
    activity = null,
    kind = 'question',
    objectiveId,
    skillId = null,
    grade,
    gradeRange = null,
    difficulty = null,
    objective = null,
    sourceExcerpt = null,
    answerLeak = null,
    source = null
  } = input || {};

  const resolvedObjective = objective && objective.id === objectiveId ? objective : OBJECTIVE_BY_ID[objectiveId] || objective;

  /* Tier inference: an LLM-tier request MUST carry a bounded excerpt
   * (§6B/§8A.2). A missing/blank excerpt means the deterministic built-in
   * path — grounding gates are scoped to the LLM tier; alignment still
   * applies. Blank strings are treated as absent (trimmed check). */
  const hasExcerpt = isNonEmptyString(sourceExcerpt);
  const effectiveSource = source || (hasExcerpt ? CONTENT_SOURCES.LLM : CONTENT_SOURCES.DETERMINISTIC);

  /* ── Gate A: input sanity / malformed content ── */
  const hasText = isNonEmptyString(content);
  const hasActivity = activity && typeof activity === 'object';
  if (!hasText && !hasActivity) {
    return fail(['empty_or_malformed_content'], warnings);
  }

  /* ── Gate B: ALIGN-1 objective binding ── */
  const binding = validateObjectiveBinding({ objectiveId, skillId, grade, gradeRange });
  if (!binding.pass) {
    reasons.push(`align1_${binding.reason}`);
    return fail(reasons, warnings);
  }

  /* ── Gate C: grade range ── */
  const gradeCheck = validateGrade({ grade, gradeRange: gradeRange || binding.objective.gradeRange, objective: binding.objective });
  if (!gradeCheck.pass) {
    reasons.push(`grade_${gradeCheck.reason}`);
    return fail(reasons, warnings);
  }

  /* ── Gate D: difficulty bounds (when provided) ── */
  if (difficulty !== null && difficulty !== undefined) {
    const diffCheck = validateDifficulty(difficulty, skillId, grade);
    if (!diffCheck.pass) {
      reasons.push(diffCheck.reason);
      return fail(reasons, warnings);
    }
  }

  /* ── Gate E: grounding (LLM tier requires an excerpt) ── */
  if (effectiveSource === CONTENT_SOURCES.LLM && !hasExcerpt) {
    reasons.push('grounding_excerpt_required_for_llm_tier');
    return fail(reasons, warnings);
  }
  if (hasExcerpt && sourceExcerpt.length > VALIDATOR_CONFIG.EXCERPT_TERMS_CAP) {
    warnings.push('excerpt_exceeds_recommended_length');
  }

  /* ── Gate F: length caps ── */
  if (hasText) {
    const lengthCheck = validateLength(content, kind);
    if (!lengthCheck.pass) {
      reasons.push(lengthCheck.reason);
      return fail(reasons, warnings);
    }
  }

  /* ── Gate G: safety / suitability patterns ── */
  const textForSafety = hasText ? content : `${activity?.prompt || ''} ${asArray(activity?.options).join(' ')}`;
  const forbidden = findForbiddenMatches(textForSafety);
  if (forbidden.length > 0) {
    reasons.push('forbidden_content_pattern');
    warnings.push(`forbidden_patterns_matched:${forbidden.length}`);
    return fail(reasons, warnings);
  }

  /* ── Gate H: answer-leak check for the live MC item ── */
  if (isNonEmptyString(answerLeak) && textForSafety.toLowerCase().includes(answerLeak.toLowerCase())) {
    reasons.push('answer_leak');
    return fail(reasons, warnings);
  }

  /* ── Gate I: activity schema + answer integrity ── */
  if (hasActivity) {
    const schemaCheck = validateActivitySchema({ activityType: activity.activityType, mode: activity.mode, content: activity.content || activity });
    if (!schemaCheck.pass) {
      reasons.push(`schema_${schemaCheck.reason}`);
      return fail(reasons, warnings);
    }
    const mode = activity.mode || (activity.activityType === 'word_build' || activity.activityType === 'syllable_split' ? 'build' : 'choose');
    const answerCheck = validateAnswerIntegrity(activity.content || activity, mode);
    if (!answerCheck.pass) {
      reasons.push(`answer_${answerCheck.reason}`);
      return fail(reasons, warnings);
    }
  }

  /* ── Gate J: ALIGN-2 coverage ──
   * For activities the assessment content lives in the prompt; distractor
   * options are curated item material and are checked separately (warning). */
  const alignText = hasText ? content : `${activity?.prompt || ''} ${activity?.targetWord || ''}`.trim();
  const coverage = validateCoverage(alignText, resolvedObjective, sourceExcerpt);
  if (!coverage.pass) {
    reasons.push('align2_insufficient_core_term_coverage');
    warnings.push(`align2_coverage_${coverage.coverage.toFixed(2)}`);
    return fail(reasons, warnings);
  }

  /* ── Gate K: ALIGN-3 vocabulary / no invention ── */
  const novel = validateNovelTerms(alignText, resolvedObjective, sourceExcerpt, grade);
  if (!novel.pass) {
    reasons.push(`align3_${novel.reason}`);
    if (novel.outOfVocab?.length) warnings.push(`align3_out_of_vocab:${novel.outOfVocab.join('|')}`);
    if (novel.excludedHits?.length) warnings.push(`align3_excluded:${novel.excludedHits.join('|')}`);
    return fail(reasons, warnings);
  }
  if (hasActivity) {
    // Distractor options out of the grade vocabulary are a quality signal,
    // not a reject (curated banks intentionally include near-miss words).
    const optionNovel = validateNovelTerms(asArray(activity?.options).join(' '), resolvedObjective, sourceExcerpt, grade);
    if (!optionNovel.pass && optionNovel.reason !== 'too_many_novel_terms') {
      warnings.push('align3_option_terms_out_of_vocab');
    }
  }

  /* ── Gate L: ALIGN-4 intent signal (downgrade-only) ── */
  const intent = validateIntentSignal(alignText, resolvedObjective);
  if (intent.level === 'weak') {
    warnings.push('align4_weak_intent_signal');
    if (!hasActivity && effectiveSource === CONTENT_SOURCES.LLM && coverage.coverage < 1) {
      // Fail-closed: LLM-tier TEXT that shares no salient statement token AND
      // does not name every core concept cannot be conclusively confirmed as
      // aligned — the evidence is inconclusive, so reject. Activities keep
      // ALIGN-4 strictly downgrade-only (§8A): their conclusiveness rests on
      // the structural gates (schema, answer integrity, grounded prompt).
      reasons.push('align4_inconclusive_alignment');
      return fail(reasons, warnings);
    }
  }

  /* ── Pass: build normalized content (never rewrites the answer) ── */
  const normalizedContent = hasActivity
    ? {
        kind: normalizeText(activity.kind || kind),
        activityType: activity.activityType,
        mode: activity.mode || 'choose',
        prompt: normalizeText(activity.prompt),
        options: asArray(activity.options).map(normalizeText),
        tiles: activity.tiles ? asArray(activity.tiles).map(normalizeText) : undefined,
        syllables: activity.syllables ? asArray(activity.syllables).map(normalizeText) : undefined,
        answerKey: activity.answerKey ?? activity.answer ?? null,
        objectiveId,
        skillId,
        grade,
        gradeRange: gradeRange || binding.objective.gradeRange,
        difficulty: difficulty ?? null,
        sourceExcerpt: hasExcerpt ? normalizeText(sourceExcerpt).slice(0, VALIDATOR_CONFIG.EXCERPT_TERMS_CAP) : null,
        presentation: activity.presentation || null
      }
    : {
        kind,
        text: normalizeText(content),
        objectiveId,
        skillId,
        grade,
        gradeRange: gradeRange || binding.objective.gradeRange,
        difficulty: difficulty ?? null,
        source: effectiveSource,
        sourceExcerpt: hasExcerpt ? normalizeText(sourceExcerpt).slice(0, VALIDATOR_CONFIG.EXCERPT_TERMS_CAP) : null
      };

  return {
    valid: true,
    reasons: ['all_gates_passed'],
    warnings,
    normalizedContent,
    alignment: {
      align1: ALIGN_RESULTS.ALIGN_PASS,
      align2: coverage.coverage,
      align3: novel.novelTerms,
      align4: intent.level
    }
  };
}

/* ───────────────────────── internal ───────────────────────── */

function fail(reasons, warnings) {
  return { valid: false, reasons, warnings, normalizedContent: null, alignment: null };
}

/**
 * Named class wrapper (compat): exposes the ALIGN helpers as methods and the
 * full pipeline through `validate`. Also exposes `validateObjectiveBinding`,
 * `validateCoverage`, `validateNovelTerms` — the interface the Phase 6 suite
 * consumes.
 */
export class ContentValidator {
  validateObjectiveBinding(args) {
    return validateObjectiveBinding(args);
  }

  validateCoverage(content, objective, excerpt) {
    return validateCoverage(content, objective, excerpt);
  }

  validateNovelTerms(content, objective, excerpt, grade) {
    return validateNovelTerms(content, objective, excerpt, grade);
  }

  validateIntentSignal(content, objective) {
    return validateIntentSignal(content, objective);
  }

  validate(input) {
    return validate(input);
  }
}

export default ContentValidator;
