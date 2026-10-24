/**
 * Grounded Llama generation — FIRST integration path (Phase 6).
 *
 * ALE remains the SOLE authority for curriculum, grade, objective, difficulty,
 * activity type, and learner adaptation. This module only asks the local
 * Llama 3.1 8B model (via the existing Ollama provider) to generate
 * child-friendly WORDING — a simple sentence-completion question — inside an
 * already-decided ALE ActivitySpecification. Nothing the model produces ever
 * reaches the child without passing the existing deterministic Content
 * Validator; on ANY failure the deterministic curated item is served.
 *
 * Flow (one generation path only):
 *   verified school material + curriculum + grade + objective
 *   + ALE activity specification + bounded learner preferences
 *     → grounded Llama 3.1 8B → structured JSON
 *     → existing deterministic Content Validator
 *     → accepted content OR deterministic fallback
 *     → existing child activity UI
 *
 * PRIVACY (§10): the prompt contains ONLY — the bounded verified excerpt
 * already resolved for this objective, the activity vocabulary item ALE
 * selected, grade/objective identifiers, and the language preference. No raw
 * IEP/report text, no learner identifiers, no performance history. Failures
 * are logged WITHOUT prompt, material, learner data, or model output.
 */

import { LLM_CONFIG } from './llm-config.js';
import { OllamaLLMProvider, OllamaTimeoutError, OllamaUnavailableError } from './ollama-provider.js';
import { validate } from './content-validator.js';
import { CONTENT_SOURCES } from './content-validator.js';
import { OBJECTIVE_BY_ID } from '../adaptive/objective-registry.js';
import { ACTIVITY_VOCABULARY } from '../learning/activity-registry.js';

/** Fixed child-facing envelope (service-injected identity + model wording). */
export const GENERATED_QUESTION_SCHEMA = Object.freeze({
  activityId: 'string (INJECTED by the service — never model output)',
  question: 'string, <= 90 chars, no markup, must use the given focus word',
  choices: 'array of 3-4 short strings, no markup, one must be the given focus word',
  correctChoiceId: 'string, must equal one of the provided choice ids',
  explanation: 'string, <= 240 chars, no markup',
  objectiveId: 'string (model echoes verbatim — attestation)',
  grade: 'string (model echoes verbatim — attestation)',
  sourceMaterialIds: 'array of strings (INJECTED by the service)'
});

/**
 * The ONLY keys the model may return. App-owned identity fields
 * (activityId, sourceMaterialIds) are deliberately excluded: opaque
 * session-scoped tokens are exactly what small models mangle, and the
 * service owns them anyway — so the model cannot corrupt what it never
 * emits, and every accepted envelope still carries the full schema.
 */
const MODEL_OUTPUT_KEYS = Object.freeze(['objectiveId', 'grade', 'question', 'choices', 'correctChoiceId', 'explanation']);

const MAX_QUESTION_CHARS = 90;
const MAX_EXPLANATION_CHARS = 240;
const MAX_CHOICES = 4;
const MAX_CHOICE_CHARS = 24;
const MAX_ID_CHARS = 80;
const MAX_CHOICE_ID_CHARS = 16;

/** Failure reasons surfaced to tests/callers (never model output). */
export const GENERATION_REJECT_REASONS = Object.freeze({
  PROVIDER_UNAVAILABLE: 'provider_unavailable',
  TIMEOUT: 'timeout',
  EMPTY_OUTPUT: 'empty_output',
  MALFORMED_JSON: 'malformed_json',
  SCHEMA_VIOLATION: 'schema_violation',
  UNGROUNDED: 'ungrounded_content',
  VALIDATOR_REJECTED: 'validator_rejected'
});

/**
 * Build the bounded generation prompt. Every dynamic value is app-controlled:
 * the excerpt comes from verified material (≤400 chars, already resolved by
 * buildMaterialsByObjective), the focus word from the ALE-chosen vocabulary,
 * grade/objective from the plan. NO learner identifiers, performance data,
 * or raw report text are ever included.
 */
export function buildGenerationPrompt({ spec, grade, objectiveId, material, focusWord, learnerContext = null }) {
  const excerpt = String(material?.sourceExcerpt ?? '').slice(0, 400);
  const safe = (s) => String(s ?? '').replace(/[\r\n]+/g, ' ').slice(0, 200);
  return [
    'You write one simple practice question for a young child.',
    '',
    `Focus word (you MUST use exactly this word): ${safe(focusWord)}`,
    `Grade: ${safe(grade)}`,
    `Learning objective: ${safe(OBJECTIVE_BY_ID[objectiveId]?.learningStatement || objectiveId)}`,
    excerpt
      ? `School material to stay consistent with (do not contradict it): ${excerpt}`
      : `Allowed choice words (pick every non-answer choice from this list): ${ACTIVITY_VOCABULARY.join(', ')}`,
    ...renderLearnerContextBlock(learnerContext),
    '',
    'Rules:',
    '- question: a completion question that names the focus word and asks which word finishes the sentence clue. Use the words finish, sentence, word, clue, and read. Max 90 characters. Example shape: Which word can finish this sentence clue about the sun?',
    '- choices: 3 or 4 short answer choices; one is exactly the focus word; the others must come from the school material or the allowed word list above.',
    '- explanation: one short sentence saying which word is the answer and why (max 240 characters).',
    '- Use plain words a 7-year-old can read. No lists, no quotation marks, no symbols beyond letters, spaces, and basic punctuation.',
    '- Reply with JSON only, no other text.',
    '',
    'Reply in exactly this JSON shape:',
    JSON.stringify({
      objectiveId,
      grade,
      question: 'Which word can finish this sentence clue about the sun?',
      choices: [{ id: 'ch_1', text: focusWord }, { id: 'ch_2', text: 'another word' }, { id: 'ch_3', text: 'another word' }],
      correctChoiceId: 'ch_1',
      explanation: 'The clue can finish with the word ' + focusWord + '.'
    }, null, 2)
  ].join('\n');
}

/**
 * Render the bounded learner context as a short instruction block.
 *
 * PRIVACY: this is the ONLY learner information that ever reaches the model,
 * and it is deliberately coarse — grade, the app's own objective/skill ids,
 * support level, a preference enum, small counts, and one response-time BAND.
 * There is no learner name or id, no age, no avatar, no free text, no raw
 * signal log, and no diagnosis or severity language. `sanitizeLearnerContext`
 * is applied again here (defense in depth) so a caller that forgets to
 * sanitize still cannot widen what the model sees.
 *
 * @param {object|null} learnerContext bounded context from
 *   adaptive-engine's buildLearnerModelContext()
 * @returns {string[]} prompt lines (empty when there is no usable context)
 */
export function renderLearnerContextBlock(learnerContext) {
  const ctx = sanitizeLearnerContext(learnerContext);
  if (!ctx) return [];
  const lines = [
    '',
    'This learner (facts observed by the app — use them only for wording length and word choice):',
    `- Support level available: ${ctx.supportLevel}`
  ];
  if (ctx.responseTimeBand && ctx.responseTimeBand !== 'unknown') {
    lines.push(`- Takes more time on some questions: ${ctx.responseTimeBand.replace(/_/g, ' ')}`);
  }
  if (ctx.helpOpenedCount > 0) lines.push(`- Has opened help ${ctx.helpOpenedCount} time(s) recently`);
  if (ctx.audioReplayCount > 0) lines.push(`- Has replayed the audio ${ctx.audioReplayCount} time(s) recently`);
  if (ctx.preferredModality) lines.push(`- Learns best through: ${ctx.preferredModality}`);
  if (ctx.masteryForSkill !== null) lines.push(`- Current confidence on this skill: ${Math.round(ctx.masteryForSkill * 100)}%`);
  // Observable patterns, phrased as recent actions. These guide WORDING and
  // STRUCTURE only (e.g. shorter prompt after a retry) — never difficulty, and
  // never as a judgement about the child.
  const p = ctx.observedPatterns;
  if (p.selfCorrections > 0) {
    lines.push(`- Recently got it right after trying again on their own ${p.selfCorrections} time(s) — praise the trying, keep the wording familiar`);
  }
  if (p.effortfulSuccesses > 0) {
    lines.push(`- Recently answered correctly after a longer pause ${p.effortfulSuccesses} time(s) — keep steps short and clearly sequenced`);
  }
  if (p.assistedSuccesses > 0) {
    lines.push(`- Recently finished with help open ${p.assistedSuccesses} time(s) — make the clue easy to spot`);
  }
  if (p.errorsObserved >= 3) {
    lines.push('- Has had several wrong answers on this skill recently — use the clearest possible wording, one idea per sentence');
  }
  if (p.timeoutsObserved > 0) {
    lines.push(`- Recently ran out of time ${p.timeoutsObserved} time(s) — keep the question very short`);
  }
  if (p.replays > 0) {
    lines.push(`- Replayed the audio ${p.replays} time(s) recently — sound and picture cues both help`);
  }
  if (ctx.baselinePaceAndAccuracy) {
    lines.push(`- Longer-term observed reading pace: ${ctx.baselinePaceAndAccuracy.replace(/_/g, ' ')}`);
  }
  lines.push('- Never mention any of this to the child, never name a condition, and keep the question short and encouraging.');
  return lines;
}

/**
 * Clamp an arbitrary learner-context object down to the exact bounded shape the
 * prompt is allowed to receive. Unknown keys are dropped, numbers are clamped,
 * and only enum strings from a fixed allow-list survive. Returns null when
 * nothing usable remains.
 *
 * @param {unknown} raw
 * @returns {object|null}
 */
export function sanitizeLearnerContext(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const clamp01 = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.round(Math.min(1, Math.max(0, n)) * 100) / 100;
  };
  const clampCount = (v, hi = 50) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.min(hi, Math.max(0, Math.round(n)));
  };
  const MODALITIES = ['visual', 'audio', 'text', 'manipulation', 'example', 'repetition', 'guided_assistance'];
  const BANDS = ['unknown', 'under_15s', '15_to_30s', '30_to_60s', 'over_60s'];
  const SUPPORT = ['none', 'scaffold', 'guided'];

  const supportLevel = SUPPORT.includes(raw.supportLevel) ? raw.supportLevel : 'none';
  const preferredModality = MODALITIES.includes(raw.preferredModality) ? raw.preferredModality : null;
  const responseTimeBand = BANDS.includes(raw.responseTimeBand) ? raw.responseTimeBand : 'unknown';
  const PACE_ACCURACY = [
    'steady_and_accurate',
    'slow_but_accurate',
    'accurate_at_mixed_pace',
    'quick_with_mistakes',
    'slow_with_mistakes',
    'mixed_pace_with_mistakes'
  ];
  const baselinePaceAndAccuracy = PACE_ACCURACY.includes(raw.baselinePaceAndAccuracy)
    ? raw.baselinePaceAndAccuracy
    : null;

  // Observable behavior patterns. Counts only, each independently clamped; an
  // absent or non-numeric entry becomes 0 so the prompt never sees NaN/undefined.
  const patternSource = (raw.observedPatterns && typeof raw.observedPatterns === 'object')
    ? raw.observedPatterns
    : {};
  const observedPatterns = {
    steadySuccesses: clampCount(patternSource.steadySuccesses) ?? 0,
    effortfulSuccesses: clampCount(patternSource.effortfulSuccesses) ?? 0,
    selfCorrections: clampCount(patternSource.selfCorrections) ?? 0,
    assistedSuccesses: clampCount(patternSource.assistedSuccesses) ?? 0,
    errorsObserved: clampCount(patternSource.errorsObserved) ?? 0,
    timeoutsObserved: clampCount(patternSource.timeoutsObserved) ?? 0,
    replays: clampCount(patternSource.replays) ?? 0,
    backtrackCount: clampCount(patternSource.backtrackCount, 200) ?? 0
  };

  const out = {
    supportLevel,
    responseTimeBand,
    preferredModality,
    helpOpenedCount: clampCount(raw.helpOpenedCount),
    audioReplayCount: clampCount(raw.audioReplayCount),
    masteryForSkill: clamp01(raw.masteryForSkill),
    observedPatterns,
    baselinePaceAndAccuracy,
    baselineAccuracy: clamp01(raw.baselineAccuracy)
  };
  const patternTotal = Object.values(observedPatterns).reduce((a, b) => a + b, 0);
  const hasSignal =
    out.helpOpenedCount > 0 || out.audioReplayCount > 0 || out.masteryForSkill !== null ||
    (out.responseTimeBand !== 'unknown') || out.preferredModality !== null ||
    patternTotal > 0 || out.baselinePaceAndAccuracy !== null;
  return hasSignal ? out : null;
}

/**
 * Strict schema parse of the model's JSON output. Extra fields, missing
 * fields, wrong types, markup, or oversized values all fail — never coerce.
 * When `vocabulary` is supplied (the no-verified-material case), every choice
 * must come from that curated whitelist.
 * @returns {{ ok: true, value: object } | { ok: false, reason: string }}
 */
export function parseGeneratedQuestion(raw, { spec, grade, objectiveId, material, vocabulary = null }) {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return { ok: false, reason: GENERATION_REJECT_REASONS.EMPTY_OUTPUT };
  }
  if (raw.length > 4000) {
    return { ok: false, reason: GENERATION_REJECT_REASONS.SCHEMA_VIOLATION };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: GENERATION_REJECT_REASONS.MALFORMED_JSON };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: GENERATION_REJECT_REASONS.SCHEMA_VIOLATION };
  }

  const allowedKeys = MODEL_OUTPUT_KEYS;
  for (const key of Object.keys(parsed)) {
    if (!allowedKeys.includes(key)) {
      return { ok: false, reason: GENERATION_REJECT_REASONS.SCHEMA_VIOLATION };
    }
  }
  const str = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;
  if (!str(parsed.objectiveId, MAX_ID_CHARS)
    || !str(parsed.grade, 24)
    || !str(parsed.question, MAX_QUESTION_CHARS)
    || !str(parsed.explanation, MAX_EXPLANATION_CHARS)
    || !Array.isArray(parsed.choices)
    || parsed.choices.length < 3
    || parsed.choices.length > MAX_CHOICES
    || !str(parsed.correctChoiceId, MAX_CHOICE_ID_CHARS)) {
    return { ok: false, reason: GENERATION_REJECT_REASONS.SCHEMA_VIOLATION };
  }

  // Attestation check: the two ALE-owned fields the model still emits
  // (objectiveId, grade) must match the expected values EXACTLY — any drift
  // is a rejection (defense in depth; the validator would catch it too).
  if (parsed.objectiveId !== objectiveId || parsed.grade !== grade) {
    return { ok: false, reason: GENERATION_REJECT_REASONS.SCHEMA_VIOLATION };
  }

  // Choices: bounded plain strings with stable ids.
  const seenIds = new Set();
  for (const choice of parsed.choices) {
    if (!choice || typeof choice !== 'object' || Array.isArray(choice)) {
      return { ok: false, reason: GENERATION_REJECT_REASONS.SCHEMA_VIOLATION };
    }
    const keys = Object.keys(choice);
    if (keys.length !== 2 || !keys.includes('id') || !keys.includes('text')) {
      return { ok: false, reason: GENERATION_REJECT_REASONS.SCHEMA_VIOLATION };
    }
    if (!str(choice.id, MAX_CHOICE_ID_CHARS) || !str(choice.text, MAX_CHOICE_CHARS)) {
      return { ok: false, reason: GENERATION_REJECT_REASONS.SCHEMA_VIOLATION };
    }
    if (seenIds.has(choice.id)) {
      return { ok: false, reason: GENERATION_REJECT_REASONS.SCHEMA_VIOLATION };
    }
    seenIds.add(choice.id);
  }

  // correctChoiceId must point at a real choice.
  if (!parsed.choices.some((c) => c.id === parsed.correctChoiceId)) {
    return { ok: false, reason: GENERATION_REJECT_REASONS.SCHEMA_VIOLATION };
  }

  // Markup guard on every child-visible free-text field: no tags, entities,
  // or script-like content ever passes the schema layer.
  const freeText = `${parsed.question} ${parsed.explanation} ${parsed.choices.map((c) => c.text).join(' ')}`;
  if (MARKUP_PATTERN.test(freeText)) {
    return { ok: false, reason: GENERATION_REJECT_REASONS.SCHEMA_VIOLATION };
  }

  // Grounding: the focus word MUST appear as a choice. Everything the child
  // reads must already come from the app's own vocabulary or material.
  if (!parsed.choices.some((c) => c.text.trim().toLowerCase() === String(spec.focusWord ?? spec.answerKey ?? '').trim().toLowerCase())) {
    return { ok: false, reason: GENERATION_REJECT_REASONS.UNGROUNDED };
  }

  // Choice whitelist (no verified material): every choice must come from the
  // app's curated vocabulary — the model picks wording, never invents nouns.
  if (vocabulary) {
    const vocab = new Set(vocabulary.map((w) => String(w).trim().toLowerCase()));
    if (!parsed.choices.every((c) => vocab.has(c.text.trim().toLowerCase()))) {
      return { ok: false, reason: GENERATION_REJECT_REASONS.UNGROUNDED };
    }
  }

  return { ok: true, value: parsed };
}

/** Markup guard shared with the visual tier: no tags, entities, or scripts. */
const MARKUP_PATTERN = /<[^>]*>|&[a-z]+;|<\/?(script|svg|img|iframe)/i;

/**
 * Convert a validated generated question into the app's choose-mode content
 * shape (same shape buildSentenceMc emits), mapping choice ids to texts.
 */
function toActivityContent(parsed, { focusWord, answerText }) {
  return {
    prompt: parsed.question,
    options: parsed.choices.map((c) => c.text),
    answerKey: answerText,
    visualCue: null,
    target: focusWord,
    audioPrompt: parsed.question
  };
}

/**
 * Generate a grounded question via local Llama. NEVER throws: every failure
 * mode resolves to a deterministic fallback with a bounded reason code.
 *
 * @param {object} input
 * @param {object} input.spec ALE ActivitySpecification (renderer-safe or full)
 * @param {string} input.grade canonical grade from the plan
 * @param {string} input.objectiveId ALE objective id
 * @param {object|null} input.material { materialId, sourceExcerpt } verified
 * @param {object|null} input.learnerPreferences bounded { language } only
 * @param {object|null} [input.provider] injectable provider (tests)
 * @returns {Promise<{ usedGeneration: boolean, reason: string|null,
 *   activity: object|null, generated: object|null }>}
 */
export async function generateGroundedQuestion({
  spec,
  grade,
  objectiveId,
  material = null,
  learnerPreferences = null,
  learnerContext = null,
  provider = null
}) {
  const fallbackResult = (reason, activity = null) => ({
    usedGeneration: false,
    reason,
    activity,
    generated: null
  });

  try {
    // Grounding prerequisites: a focus word from the app's own vocabulary and
    // an objective the registry knows. Without them → deterministic path.
    const focusWord = String(spec?.answerKey ?? spec?.content?.targetWord ?? '').trim();
    if (!focusWord || !OBJECTIVE_BY_ID[objectiveId]) {
      return fallbackResult(GENERATION_REJECT_REASONS.UNGROUNDED);
    }

    // Grounding corpus: verified material when attached; otherwise the app's
    // own curated activity vocabulary. The prompt and the validator see the
    // SAME corpus — the model re-words, it never invents concepts.
    const groundingExcerpt = material?.sourceExcerpt || ACTIVITY_VOCABULARY.join(', ');

    // ── 1. Build the bounded prompt (language + the coarse learner context). ──
    const language = learnerPreferences?.language === 'Spanish' ? 'Spanish' : 'English';
    const prompt = buildGenerationPrompt({
      spec: { activityId: spec.activityId },
      grade,
      objectiveId,
      material,
      focusWord,
      learnerContext
    });

    // ── 2. Ask the local model. ──
    const llm = provider ?? new OllamaLLMProvider(
      LLM_CONFIG.model,
      LLM_CONFIG.host,
      { timeoutMs: LLM_CONFIG.timeout.activityWordingMs }
    );
    let raw;
    try {
      raw = await llm.generateStructured(prompt, null, {
        temperature: 0.2,
        maxTokens: 400,
        timeoutMs: LLM_CONFIG.timeout.activityWordingMs
      });
    } catch (err) {
      if (err instanceof OllamaTimeoutError) return fallbackResult(GENERATION_REJECT_REASONS.TIMEOUT);
      if (err instanceof OllamaUnavailableError) return fallbackResult(GENERATION_REJECT_REASONS.PROVIDER_UNAVAILABLE);
      // generateStructured throws a sanitized parse error when the model's
      // output is not valid JSON — map it distinctly from daemon failures.
      if (/Failed to parse LLM JSON output/.test(err?.message || '')) {
        return fallbackResult(GENERATION_REJECT_REASONS.MALFORMED_JSON);
      }
      return fallbackResult(GENERATION_REJECT_REASONS.PROVIDER_UNAVAILABLE);
    }
    if (raw == null || (typeof raw !== 'string' && typeof raw !== 'object')) {
      return fallbackResult(GENERATION_REJECT_REASONS.EMPTY_OUTPUT);
    }

    // ── 4. Strict schema parse (includes the markup guard). The service
    // then INJECTS the app-owned identity fields the model never emits. ──
    const rawText = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const parsed = parseGeneratedQuestion(rawText, { spec: { activityId: spec.activityId, focusWord, answerKey: focusWord }, grade, objectiveId, material, vocabulary: material ? null : ACTIVITY_VOCABULARY });
    if (!parsed.ok) return fallbackResult(parsed.reason);
    const value = {
      activityId: spec.activityId,
      sourceMaterialIds: material?.materialId ? [material.materialId] : [],
      ...parsed.value
    };

    // ── 5. THE gate: existing deterministic Content Validator. ──
    const answerChoice = value.choices.find((c) => c.id === value.correctChoiceId);
    const verdict = validate({
      content: null,
      activity: {
        kind: 'question',
        activityType: 'sentence_mc',
        mode: 'choose',
        prompt: value.question,
        options: value.choices.map((c) => c.text),
        answerKey: answerChoice.text,
        presentation: null
      },
      kind: 'question',
      objectiveId,
      skillId: spec.skillId ?? null,
      grade,
      difficulty: spec.difficulty ?? null,
      sourceExcerpt: groundingExcerpt,
      source: CONTENT_SOURCES.LLM,
      answerLeak: null
    });
    if (!verdict.valid) {
      return fallbackResult(GENERATION_REJECT_REASONS.VALIDATOR_REJECTED);
    }

    // ── 6. Accept: shape for the existing renderer pipeline. ──
    const generated = {
      activityId: value.activityId,
      question: value.question,
      choices: value.choices,
      correctChoiceId: value.correctChoiceId,
      explanation: value.explanation,
      objectiveId,
      grade,
      sourceMaterialIds: value.sourceMaterialIds
    };
    const activity = {
      activityId: value.activityId,
      objectiveId,
      grade,
      activityType: 'sentence_mc',
      mode: 'choose',
      content: toActivityContent(value, { focusWord, answerText: answerChoice.text }),
      answerKey: answerChoice.text,
      source: CONTENT_SOURCES.LLM,
      explanation: value.explanation,
      materialIds: value.sourceMaterialIds
    };
    return { usedGeneration: true, reason: null, activity, generated };
  } catch {
    // Absolute fail-closed: any unexpected error serves the deterministic item.
    return fallbackResult(GENERATION_REJECT_REASONS.VALIDATOR_REJECTED);
  }
}
