/**
 * Schoolwork Schema (Phase 7.2) — canonical records for actual child schoolwork.
 *
 * Schoolwork is a DISTINCT product concept from school material:
 *   - SCHOOL MATERIAL is reference/learning content the parent provides
 *     (textbook chapter, class notes, worksheet, syllabus, reference doc).
 *   - SCHOOLWORK is an actual task the child is expected to complete
 *     (homework, classwork, worksheet assignment, reading assignment,
 *     practice assigned by the teacher).
 *
 * A schoolwork record:
 *   - references a VERIFIED school material by materialId (never copies the
 *     extracted document), plus any optional schoolwork-only metadata
 *     (dueDate, instructions, teacherRef).
 *   - is created from an existing verified material by an explicit parent
 *     action ("Add as Schoolwork") — school material NEVER auto-becomes
 *     schoolwork.
 *   - is inert until the parent verifies it (deterministic lifecycle:
 *     draft → verified → completed; rejected/archived optional).
 *   - leaves unknown fields UNKNOWN — the app never fabricates due dates,
 *     teacher names, instructions, objectives, or grades.
 *
 * Fail-closed design mirrors school-material-model: deterministic FNV-1a ids,
 * no Date.now()/Math.random() inside the model (timestamps injected), and
 * validation on every create/parse path.
 */

import { fnv1aHex } from './school-material-model.js';

/** Schoolwork assignment kinds (§7.2): a small extensible set, not a taxonomy. */
export const ASSIGNMENT_TYPES = Object.freeze([
  'homework',
  'classwork',
  'worksheet',
  'reading',
  'practice'
]);

/** Deterministic lifecycle. Unverified schoolwork never reaches the child. */
export const SCHOOLWORK_STATUSES = Object.freeze([
  'draft',
  'verified',
  'completed',
  'rejected',
  'archived'
]);

/** Small bounded field helpers (mirror curriculum-schema). */
function isNonEmptyString(v, max = 200) {
  return typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;
}

function asStringArray(v, maxItems = 100) {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === 'string' && x.trim().length > 0).slice(0, maxItems);
}

/**
 * Validate a canonical Schoolwork record.
 * @param {object} record
 * @param {object} [context] { knownMaterialIds: string[] } optional cross-check
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateSchoolwork(record, context = {}) {
  const errors = [];
  if (!record || typeof record !== 'object') {
    return { isValid: false, errors: ['Schoolwork record is required.'] };
  }
  if (!isNonEmptyString(record.schoolworkId, 80)) {
    errors.push('schoolworkId is required (max 80 chars).');
  }
  if (!isNonEmptyString(record.materialId, 80)) {
    errors.push('materialId is required (the referenced verified school material).');
  } else if (Array.isArray(context.knownMaterialIds) && context.knownMaterialIds.length > 0
    && !context.knownMaterialIds.includes(record.materialId)) {
    errors.push(`materialId "${record.materialId}" is not a known school material.`);
  }
  if (!isNonEmptyString(record.learnerId, 120)) {
    errors.push('learnerId is required.');
  }
  if (!isNonEmptyString(record.title, 160)) {
    errors.push('title is required (max 160 chars).');
  }
  if (!ASSIGNMENT_TYPES.includes(record.assignmentType)) {
    errors.push(`assignmentType must be one of: ${ASSIGNMENT_TYPES.join(', ')}.`);
  }
  if (!isNonEmptyString(record.subject, 60)) {
    errors.push('subject is required.');
  }
  if (!SCHOOLWORK_STATUSES.includes(record.status)) {
    errors.push(`status must be one of: ${SCHOOLWORK_STATUSES.join(', ')}.`);
  }
  if (!Array.isArray(record.linkedObjectives)) {
    errors.push('linkedObjectives must be an array (possibly empty).');
  }
  // Optional fields are type-checked when present; unknown remains unknown.
  if (record.teacherRef !== undefined && record.teacherRef !== null
    && !isNonEmptyString(record.teacherRef, 200)) {
    errors.push('teacherRef must be a short string when provided.');
  }
  if (record.dueDate !== undefined && record.dueDate !== null
    && Number.isNaN(new Date(record.dueDate).getTime())) {
    errors.push('dueDate must be a valid ISO date string when provided.');
  }
  if (record.instructions !== undefined && record.instructions !== null
    && !isNonEmptyString(record.instructions, 400)) {
    errors.push('instructions must be a short string when provided.');
  }
  return { isValid: errors.length === 0, errors };
}

/**
 * Canonical Schoolwork builder. `schoolworkId` is derived by the caller
 * (deterministic); `materialId`, `learnerId`, `title`, `assignmentType`,
 * `subject` are required. Everything optional is left null when unknown.
 * @param {object} input
 * @returns {object} canonical Schoolwork record
 */
export function buildSchoolwork(input) {
  return {
    schoolworkId: String(input?.schoolworkId || '').trim(),
    materialId: String(input?.materialId || '').trim(),
    learnerId: String(input?.learnerId || '').trim(),
    title: String(input?.title || '').trim(),
    assignmentType: input?.assignmentType,
    subject: String(input?.subject || '').trim(),
    curriculumId: String(input?.curriculumId || '').trim(),
    grade: String(input?.grade || '').trim(),
    linkedObjectives: asStringArray(input?.linkedObjectives, 100),
    teacherRef: typeof input?.teacherRef === 'string' && input.teacherRef.trim()
      ? input.teacherRef.trim() : null,
    dueDate: input?.dueDate || null,
    instructions: typeof input?.instructions === 'string' && input.instructions.trim()
      ? input.instructions.trim() : null,
    status: input?.status || 'draft',
    createdAt: input?.createdAt || null,
    verifiedAt: input?.verifiedAt || null,
    completedAt: input?.completedAt || null,
    completion: input?.completion || null
  };
}

/**
 * Deterministic schoolwork id from the referenced material (same FNV-1a pattern
 * as materials). One schoolwork per material: repeatedly "adding as schoolwork"
 * the same material resolves the same id (idempotent).
 * @param {object} input { learnerId, materialId }
 * @returns {string}
 */
export function deriveSchoolworkId(input) {
  const seed = [input?.learnerId || '', input?.materialId || ''].join('|');
  return `sw_${fnv1aHex(seed)}`;
}

/**
 * Create a canonical Schoolwork record (pure, deterministic).
 * @param {object} input see buildSchoolwork (excluding schoolworkId)
 * @returns {{ ok: boolean, record?: object, errors: string[] }}
 */
export function createSchoolwork(input) {
  const record = buildSchoolwork({
    ...input,
    schoolworkId: deriveSchoolworkId(input)
  });
  const check = validateSchoolwork(record);
  if (!check.isValid) {
    return { ok: false, errors: check.errors };
  }
  return { ok: true, record, errors: [] };
}

/**
 * Serialize a schoolwork record for local persistence (atomic JSON upstream).
 * @param {object} record
 * @returns {string}
 */
export function serializeSchoolwork(record) {
  return JSON.stringify(record, null, 2);
}

/**
 * Parse + validate a persisted schoolwork record (validate-on-load).
 * @param {string} json
 * @returns {{ ok: boolean, record?: object, errors: string[] }}
 */
export function parseSchoolwork(json) {
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, errors: ['Schoolwork JSON is malformed.'] };
  }
  const check = validateSchoolwork(parsed);
  if (!check.isValid) {
    return { ok: false, errors: check.errors };
  }
  return { ok: true, record: parsed, errors: [] };
}