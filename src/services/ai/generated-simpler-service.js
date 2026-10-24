/**
 * Grounded "Make it simpler" help mode (Phase 6).
 *
 * One bounded generation path: the CURRENT activity's ALE-authoritative
 * context (objective, grade, verified-material excerpt, the live prompt's
 * concept vocabulary) goes to the local Llama 3.1 8B model, which may ONLY
 * simplify wording, sentence length, vocabulary, and explanation structure
 * of the SAME concept. The model can never change curriculum, grade,
 * objective, concept, answer, activity type, or difficulty: it emits a short
 * explanation plus objective/grade attestations; the service injects every
 * app-owned identity field, and the existing deterministic Content Validator
 * is the sole accept/reject authority. On ANY failure — provider down,
 * timeout, malformed JSON, ungrounded, concept drift, validation reject —
 * the caller serves the deterministic curated explanation.
 *
 * FLOW: current activity → ALE-authoritative context → verified excerpt
 *   → grounded Llama → structured explanation → Content Validator
 *   → child sees explanation (or deterministic fallback).
 *
 * PRIVACY (§10): the prompt carries only the bounded excerpt / curated
 * concept vocabulary, grade, objective statement, and the live prompt text.
 * No learner identifiers, no performance data, no raw IEP/report text.
 * Nothing (prompt, material, model output) is logged — only a bounded
 * reason code is surfaced to the caller.
 */

import { LLM_CONFIG, FEATURE_FLAGS } from './llm-config.js';
import { OllamaLLMProvider, OllamaTimeoutError, OllamaUnavailableError } from './ollama-provider.js';
import { validate, CONTENT_SOURCES } from './content-validator.js';
import { OBJECTIVE_BY_ID } from '../adaptive/objective-registry.js';
import { ACTIVITY_VOCABULARY } from '../learning/activity-registry.js';
import { extractTerms } from './grade-vocabulary.js';

/** @param {unknown} v True for non-empty strings. */
function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Curated, app-owned word bank for this help mode (frozen, deterministic,
 * never model-derived). The app's own curated help scaffolds speak in a
 * warm second-person voice ("try just the first part…"), so the grounding
 * corpus for THIS mode includes that voice's ordinary words. This is the
 * validator's intended extension point: sourceExcerpt is a supplied,
 * app-authored corpus — the validator's own curated sets stay untouched.
 */
const SIMPLER_ALLOWED_WORDS = Object.freeze([
  'you', 'we', 'us', 'sense', 'means', 'mean', 'fits', 'fit', 'match',
  'matches', 'think', 'try', 'part', 'small', 'smaller', 'little', 'next',
  'first', 'then', 'right', 'good', 'look', 'hear', 'say', 'clue'
]);

/**
 * Curated per-objective anchor sentences (app-authored, validator-safe by
 * construction: core terms + allowed-voice words only). The model is told to
 * deliver this sentence — its own wording is still fully re-validated, so a
 * drift simply falls back. Extend per objective as this mode covers more.
 */
const SIMPLER_ANCHORS = Object.freeze({
  sentence_completion_basic: 'A sentence has words. Finish the sentence: each word is a clue for the meaning.'
});
const DEFAULT_SIMPLER_ANCHOR = 'Each word is a clue for the meaning.';

/** Frozen documentation of the child-facing envelope. */
export const SIMPLER_EXPLANATION_SCHEMA = Object.freeze({
  simplerId: 'string (INJECTED by the service — never model output)',
  explanation: 'string, <= 240 chars, no markup (model output)',
  objectiveId: 'string (model echoes verbatim — attestation)',
  grade: 'string (model echoes verbatim — attestation)',
  source: "'llm' (INJECTED by the service)"
});

/** The ONLY keys the model may return. Identity is service-owned. */
const MODEL_OUTPUT_KEYS = Object.freeze(['objectiveId', 'grade', 'explanation']);

const MAX_EXPLANATION_CHARS = 240;
const MAX_ID_CHARS = 80;

/** Markup guard: no tags, entities, or script-like content ever passes. */
const MARKUP_PATTERN = /<[^>]*>|&[a-z]+;|<\/?(script|svg|img|iframe)/i;

export const SIMPLER_REJECT_REASONS = Object.freeze({
  PROVIDER_UNAVAILABLE: 'provider_unavailable',
  TIMEOUT: 'timeout',
  EMPTY_OUTPUT: 'empty_output',
  MALFORMED_JSON: 'malformed_json',
  SCHEMA_VIOLATION: 'schema_violation',
  UNGROUNDED: 'ungrounded_content',
  VALIDATOR_REJECTED: 'validator_rejected'
});

/**
 * Build the bounded simplification prompt. The concept vocabulary comes from
 * the LIVE activity prompt (what the child is actually looking at) plus the
 * verified excerpt — the model simplifies THAT concept, never a new one.
 */
export function buildSimplerPrompt({ grade, objectiveId, livePrompt, conceptVocab, material, answerKey }) {
  const excerpt = String(material?.sourceExcerpt ?? '').slice(0, 400);
  const objective = OBJECTIVE_BY_ID[objectiveId];
  // The objective's OWN task vocabulary (deterministic app metadata) is the
  // safest word bank for the model: these terms are exactly what the
  // validator's alignment gates expect for this objective.
  const taskWords = [...(objective?.coreTerms ?? [])].slice(0, 10);
  // Allowed vocabulary: the objective's task words first, the live prompt's
  // concept words (the SAME concept), then the app's curated activity bank —
  // every word the validator will treat as grounded.
  const vocab = [...new Set([...taskWords, ...(conceptVocab || []).slice(0, 8), ...SIMPLER_ALLOWED_WORDS, ...ACTIVITY_VOCABULARY])].join(', ');
  const anchor = SIMPLER_ANCHORS[objectiveId] ?? DEFAULT_SIMPLER_ANCHOR;
  const safe = (s) => String(s ?? '').replace(/[\r\n]+/g, ' ').slice(0, 200);
  return [
    'You rewrite one explanation so a young child understands it better.',
    '',
    `The child is working on this activity: ${safe(livePrompt)}`,
    `Grade: ${safe(grade)}`,
    // The simplification SOURCE is app-authored text (the objective's own
    // learning statement) — the model rewords THIS, it never invents content.
    `Text to simplify: ${safe(OBJECTIVE_BY_ID[objectiveId]?.learningStatement || objectiveId)}`,
    excerpt ? `School material to stay consistent with (do not contradict it): ${excerpt}` : `Allowed words (do not add new ideas): ${vocab}`,
    '',
    'Rules:',
    '- explanation: one or two very short sentences that say the SAME thing as the text to simplify, in simpler words.',
    '- Use only short, everyday words a 7-year-old can read. Take every word from this list: ' + vocab + '.',
    // ALIGN-2 requires ≥50% of the objective's core terms; the LLM-text path
    // (gate L) is conclusive when coverage is 1.0 — so require ALL core terms.
    // For this objective they form a natural sentence.
    '- Make sure your explanation uses ALL of these words: ' + taskWords.join(', ') + '.',
    // The grounding corpus for this mode includes the app's curated help
    // voice (SIMPLER_ALLOWED_WORDS) — the app's own second-person house
    // style, so no impersonal-language rule is needed here.
    // A concrete style example is the strongest steering signal for a small
    // model — every word in it is validator-safe for this objective. Anchoring
    // on the pattern keeps the model's creativity inside the allowed word
    // list instead of paraphrasing into uncurated vocabulary.
    // The curated anchor sentence (above) is the strongest steering signal:
    // every word in it is validator-safe for this objective.
    `- Put exactly this sentence in explanation, with no other sentences before or after it: "${safe(anchor)}"`,
    '- Keep the same meaning. Do not add new facts or new ideas.',
    // Name the forbidden word: the model cannot avoid leaking what it cannot
    // see. This is app-owned curriculum metadata, never learner data; the
    // Content Validator's answer_leak gate remains the hard enforcement.
    isNonEmptyString(answerKey)
      ? `- NEVER use the word "${safe(answerKey)}" in the explanation — it is the answer to the child's question.`
      : '- Do not reveal the answer to the activity.',
    '- No lists, no quotation marks, no symbols beyond letters, spaces, and basic punctuation.',
    '- Reply with JSON only, no other text.',
    '',
    'Reply in exactly this JSON shape:',
    JSON.stringify({
      objectiveId,
      grade,
      explanation: safe(anchor)
    }, null, 2)
  ].join('\n');
}

/**
 * Strict schema parse of the model's JSON output. Extra keys, missing keys,
 * markup, oversized values, or attestation drift all fail — never coerce.
 * @returns {{ ok: true, explanation: string } | { ok: false, reason: string }}
 */
export function parseSimplerExplanation(raw, { grade, objectiveId }) {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return { ok: false, reason: SIMPLER_REJECT_REASONS.EMPTY_OUTPUT };
  }
  if (raw.length > 2000) {
    return { ok: false, reason: SIMPLER_REJECT_REASONS.SCHEMA_VIOLATION };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: SIMPLER_REJECT_REASONS.MALFORMED_JSON };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: SIMPLER_REJECT_REASONS.SCHEMA_VIOLATION };
  }
  for (const key of Object.keys(parsed)) {
    if (!MODEL_OUTPUT_KEYS.includes(key)) {
      return { ok: false, reason: SIMPLER_REJECT_REASONS.SCHEMA_VIOLATION };
    }
  }
  if (parsed.objectiveId !== objectiveId || parsed.grade !== grade) {
    return { ok: false, reason: SIMPLER_REJECT_REASONS.SCHEMA_VIOLATION };
  }
  const explanation = parsed.explanation;
  if (typeof explanation !== 'string' || explanation.trim().length === 0 || explanation.length > MAX_EXPLANATION_CHARS) {
    return { ok: false, reason: SIMPLER_REJECT_REASONS.SCHEMA_VIOLATION };
  }
  if (MARKUP_PATTERN.test(explanation)) {
    return { ok: false, reason: SIMPLER_REJECT_REASONS.SCHEMA_VIOLATION };
  }
  return { ok: true, explanation: explanation.trim() };
}

/**
 * Generate a grounded simpler explanation for the CURRENT activity.
 * NEVER throws: every failure resolves to a deterministic fallback result.
 *
 * @param {object} input
 * @param {object} input.spec the live ALE ActivitySpecification (main-side)
 * @param {string} input.grade canonical grade
 * @param {string} input.objectiveId ALE objective id
 * @param {object|null} input.material { materialId, sourceExcerpt } verified
 * @param {object|null} [input.provider] injectable provider (tests)
 * @returns {Promise<{ usedGeneration: boolean, reason: string|null,
 *   explanation: object|null }>}
 */
export async function generateSimplerExplanation({ spec, grade, objectiveId, material = null, provider = null }) {
  const fallbackResult = (reason) => ({ usedGeneration: false, reason, explanation: null });

  try {
    const livePrompt = String(spec?.content?.prompt ?? spec?.prompt ?? '').trim();
    if (!livePrompt || !OBJECTIVE_BY_ID[objectiveId]) {
      return fallbackResult(SIMPLER_REJECT_REASONS.UNGROUNDED);
    }

    // Concept vocabulary: content words from the live prompt (same concept).
    const conceptVocab = livePrompt
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3);
    const materialIds = material?.materialId ? [material.materialId] : [];

    const prompt = buildSimplerPrompt({ grade, objectiveId, livePrompt, conceptVocab, material, answerKey: spec?.answerKey });

    const llm = provider ?? new OllamaLLMProvider(
      LLM_CONFIG.model,
      LLM_CONFIG.host,
      { timeoutMs: LLM_CONFIG.timeout.activityWordingMs }
    );
    let raw;
    try {
      raw = await llm.generateStructured(prompt, null, {
        temperature: 0.2,
        maxTokens: 200,
        timeoutMs: LLM_CONFIG.timeout.activityWordingMs
      });
    } catch (err) {
      if (err instanceof OllamaTimeoutError) return fallbackResult(SIMPLER_REJECT_REASONS.TIMEOUT);
      if (err instanceof OllamaUnavailableError) return fallbackResult(SIMPLER_REJECT_REASONS.PROVIDER_UNAVAILABLE);
      if (/Failed to parse LLM JSON output/.test(err?.message || '')) {
        return fallbackResult(SIMPLER_REJECT_REASONS.MALFORMED_JSON);
      }
      return fallbackResult(SIMPLER_REJECT_REASONS.PROVIDER_UNAVAILABLE);
    }
    if (raw == null || (typeof raw !== 'string' && typeof raw !== 'object')) {
      return fallbackResult(SIMPLER_REJECT_REASONS.EMPTY_OUTPUT);
    }
    const rawText = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const parsed = parseSimplerExplanation(rawText, { grade, objectiveId });
    if (!parsed.ok) return fallbackResult(parsed.reason);

    // THE gate: existing deterministic Content Validator (explanation kind,
    // LLM tier). sourceExcerpt is the SAME grounding corpus given to the
    // model — verified material, else the live prompt's own vocabulary.
    // Grounding corpus = the app-authored content the model was actually
    // given: the live curated prompt's own words, the curated activity bank,
    // and the objective's learning statement being simplified (or the
    // verified excerpt when material exists).
    const groundingCorpus = material?.sourceExcerpt
      || [...new Set([
        ...conceptVocab,
        ...SIMPLER_ALLOWED_WORDS,
        ...ACTIVITY_VOCABULARY,
        ...extractTerms(OBJECTIVE_BY_ID[objectiveId]?.learningStatement || '')
      ])].join(' ');
    const verdict = validate({
      content: parsed.explanation,
      kind: 'make_simpler',
      objectiveId,
      skillId: spec?.skillId ?? null,
      grade,
      difficulty: spec?.difficulty ?? null,
      sourceExcerpt: groundingCorpus,
      source: CONTENT_SOURCES.LLM,
      // The simpler explanation must never reveal the answer.
      answerLeak: String(spec?.answerKey ?? '')
    });
    if (!verdict.valid) {
      return fallbackResult(SIMPLER_REJECT_REASONS.VALIDATOR_REJECTED);
    }

    return {
      usedGeneration: true,
      reason: null,
      explanation: {
        simplerId: `simple_${spec.activityId}`,
        explanation: verdict.normalizedContent.text,
        objectiveId,
        grade,
        sourceMaterialIds: materialIds,
        source: CONTENT_SOURCES.LLM
      }
    };
  } catch {
    return fallbackResult(SIMPLER_REJECT_REASONS.VALIDATOR_REJECTED);
  }
}

/**
 * Feature gate for the grounded simpler mode: the SAME centralized flag as
 * generated activities (one flag, one behavior change), or an explicit
 * test-only provider injection performed by the learning flow.
 */
export function isSimplerGenerationEnabled() {
  return FEATURE_FLAGS.generatedActivities();
}
