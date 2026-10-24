/**
 * School Material Model (§6B) — reusable canonical model for the material the
 * child is actually learning from: textbook chapters, worksheets, class
 * notes, assignments, and syllabus documents.
 *
 * Design rules:
 * - Deterministic: ids are content-derived (FNV-1a, same pattern as ALE
 *   seeded rotation); no `Date.now()`/`Math.random()` inside — timestamps are
 *   injected by the caller/store.
 * - Self-contained: no fs/LLM imports, so the model is reusable by main,
 *   renderer, stores, and the future Llama layer alike.
 * - Fail-closed: every create/parse path validates; invalid records never
 *   enter circulation.
 * - Excerpts mirror the SchoolMaterialStore §6B caps (≤ 8 chunks × 400 chars)
 *   so any consumer receives a bounded slice.
 */

import {
  validateSchoolMaterial,
  buildCanonicalSchoolMaterial,
  MAX_EXTRACTED_CONTENT_CHARS
} from './curriculum-schema.js';

/** Bounded-record cap (single source of truth: curriculum-schema). */
export { MAX_EXTRACTED_CONTENT_CHARS };

/** Mirrors SchoolMaterialStore §6B caps (kept local to avoid fs coupling). */
export const MATERIAL_EXCERPT_CAP = 400;
export const MATERIAL_MAX_EXCERPTS = 8;

/* ───────────────────────── deterministic id ───────────────────────── */

/**
 * FNV-1a 32-bit hash → 8-char hex. Same deterministic pattern as the ALE's
 * seeded rotation. Used ONLY for content-derived ids, never for validation.
 * @param {string} text
 * @returns {string}
 */
export function fnv1aHex(text) {
  let hash = 0x811c9dc5;
  const s = String(text ?? '');
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Deterministic material id from the record's identity + content. */
function deriveMaterialId(input) {
  const seed = [
    input?.curriculumId || '',
    input?.grade || '',
    input?.subject || '',
    input?.type || '',
    input?.source?.reference || '',
    input?.extractedContent || ''
  ].join('|');
  return `mat_${fnv1aHex(seed)}`;
}

/* ───────────────────────── excerpt derivation ───────────────────────── */

/**
 * Deterministically derive bounded excerpt chunks from extracted content.
 * Same sentence-boundary heuristics as SchoolMaterialStore.makeExcerptChunks.
 * @param {string} text
 * @returns {string[]} up to MATERIAL_MAX_EXCERPTS chunks of ≤ MATERIAL_EXCERPT_CAP chars
 */
export function makeMaterialExcerpts(text) {
  if (typeof text !== 'string') return [];
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const chunks = [];
  let rest = cleaned;
  while (rest.length > 0 && chunks.length < MATERIAL_MAX_EXCERPTS) {
    let slice = rest.slice(0, MATERIAL_EXCERPT_CAP);
    const boundary = slice.lastIndexOf('. ');
    if (boundary > MATERIAL_EXCERPT_CAP * 0.4) {
      slice = slice.slice(0, boundary + 1);
    }
    chunks.push(slice.trim());
    rest = rest.slice(slice.length).trim();
  }
  return chunks;
}

/* ───────────────────────── create / verify ───────────────────────── */

/**
 * Create a validated canonical SchoolMaterial.
 * @param {object} input canonical fields (see buildCanonicalSchoolMaterial)
 *   - `materialId` optional: derived deterministically from content when absent
 *   - `addedAt`/`verifiedAt` optional ISO strings (injected by caller)
 * @returns {{ ok: boolean, material?: object, errors: string[] }}
 */
export function createSchoolMaterial(input) {
  const withDerivedId = {
    ...input,
    materialId: input?.materialId ? String(input.materialId).trim() : deriveMaterialId(input)
  };
  const canonical = buildCanonicalSchoolMaterial(withDerivedId);
  const check = validateSchoolMaterial(canonical);
  if (!check.isValid) {
    return { ok: false, errors: check.errors };
  }
  const material = {
    ...canonical,
    excerptChunks: makeMaterialExcerpts(canonical.extractedContent)
  };
  return { ok: true, material, errors: [] };
}

/**
 * Mark a material verified (Phase 3 review-confirm pattern). Returns a NEW
 * record; the original is untouched. Callers inject the timestamp.
 * @param {object} material
 * @param {{ at?: string }} [options]
 * @returns {{ ok: boolean, material?: object, errors: string[] }}
 */
export function verifyMaterial(material, { at = null } = {}) {
  return transitionVerification(material, 'verified', at);
}

/**
 * Mark a material rejected (parent declined it as a learning source).
 * @param {object} material
 * @param {{ at?: string }} [options]
 * @returns {{ ok: boolean, material?: object, errors: string[] }}
 */
export function rejectMaterial(material, { at = null } = {}) {
  return transitionVerification(material, 'rejected', at);
}

function transitionVerification(material, status, at) {
  if (!material || typeof material !== 'object') {
    return { ok: false, errors: ['SchoolMaterial is required.'] };
  }
  const updated = { ...material, verificationStatus: status, verifiedAt: status === 'verified' ? at : material.verifiedAt };
  const check = validateSchoolMaterial(updated);
  if (!check.isValid) {
    return { ok: false, errors: check.errors };
  }
  return { ok: true, material: updated, errors: [] };
}

/**
 * Idempotently link objectives onto a material record (pure: returns a new
 * record). Structural compatibility is the grounding-service's job; this only
 * maintains the link list deterministically.
 * @param {object} material
 * @param {string[]} objectiveIds
 * @returns {{ ok: boolean, material?: object, errors: string[] }}
 */
export function linkObjectives(material, objectiveIds) {
  if (!Array.isArray(objectiveIds)) {
    return { ok: false, errors: ['objectiveIds must be an array.'] };
  }
  const merged = Array.from(new Set([...(material?.linkedObjectives || []), ...objectiveIds.map((id) => String(id).trim())])).filter(Boolean);
  const updated = { ...material, linkedObjectives: merged };
  const check = validateSchoolMaterial(updated);
  if (!check.isValid) {
    return { ok: false, errors: check.errors };
  }
  return { ok: true, material: updated, errors: [] };
}

/* ───────────────────────── serialization ───────────────────────── */

/**
 * Serialize a material for local persistence (atomic JSON file upstream).
 * @param {object} material
 * @returns {string}
 */
export function serializeSchoolMaterial(material) {
  return JSON.stringify(material, null, 2);
}

/**
 * Parse + validate a persisted material (validate-on-load, fail-closed).
 * @param {string} json
 * @returns {{ ok: boolean, material?: object, errors: string[] }}
 */
export function parseSchoolMaterial(json) {
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, errors: ['Material JSON is malformed.'] };
  }
  const check = validateSchoolMaterial(parsed);
  if (!check.isValid) {
    return { ok: false, errors: check.errors };
  }
  return { ok: true, material: parsed, errors: [] };
}

/* ───────────────────────── compatibility adapter ───────────────────────── */

/**
 * Adapt a legacy SchoolMaterialStore record (pre-curriculum Phase 6 shape:
 * { materialId, learnerId, label, subject, chapter, excerptChunks,
 *   attachedObjectives, addedAt }) into the canonical model.
 *
 * Legacy records carry no curriculum context, so the caller MUST supply the
 * curriculumId + grade explicitly — nothing is inferred (fail-closed). The
 * result starts `unverified` and must pass parent verification before it can
 * ground any objective.
 *
 * @param {object} record legacy store record
 * @param {{ curriculumId: string, grade: string, subject?: string, type?: string, reference?: string }} context
 * @returns {{ ok: boolean, material?: object, errors: string[] }}
 */
export function fromLegacyMaterialRecord(record, context) {
  if (!record || typeof record !== 'object') {
    return { ok: false, errors: ['Legacy material record is required.'] };
  }
  if (!context?.curriculumId || !context?.grade) {
    return { ok: false, errors: ['Compatibility adapter requires explicit curriculumId and grade (nothing is inferred).'] };
  }
  const extractedContent = Array.isArray(record.excerptChunks)
    ? record.excerptChunks.join(' ')
    : '';
  return createSchoolMaterial({
    materialId: record.materialId,
    title: record.label || 'School material',
    type: context.type || (record.chapter ? 'textbook_chapter' : 'class_notes'),
    curriculumId: context.curriculumId,
    grade: context.grade,
    subject: record.subject || context.subject || '',
    source: { reference: context.reference || record.chapter || record.label || 'legacy-import' },
    extractedContent,
    linkedObjectives: record.attachedObjectives || [],
    verificationStatus: 'unverified',
    addedAt: record.addedAt || null
  });
}
