/**
 * Schoolwork Service (Phase 7.2) — thin orchestration between the ELECTRON main
 * process (IPC handlers) and the schoolwork persistence + existing curriculum
 * foundation.
 *
 * Product rules enforced here (fail-closed, unit-testable WITHOUT Electron):
 *  - School material NEVER automatically becomes schoolwork. A schoolwork
 *    record is created only by an explicit parent action ("Add as Schoolwork").
 *  - A schoolwork record references its verified material by `materialId` —
 *    the extracted document is never duplicated.
 *  - Schoolwork is inert until parent verification (draft → verified).
 *    Unverified records never appear as child tasks.
 *  - Unknown fields stay UNKNOWN: due dates, teacher refs, and instructions
 *    are only persisted when the parent actually supplies them. Nothing is
 *    fabricated, derived, or invented.
 *  - Completion records the child's real persisted outcome; it never invents
 *    scores or streaks.
 *
 * The learning side (launching activities, evaluator, learning signals, ALE)
 * lives in schoolwork-session.js; this service owns state lifecycle only.
 */

import { createSchoolwork, deriveSchoolworkId, ASSIGNMENT_TYPES } from './schoolwork-schema.js';

/* ───────────────────────── view projections ───────────────────────── */

/**
 * Project a schoolwork record for the PARENT renderer (metadata only — the
 * referenced material is fetched separately; no extracted content is copied).
 * @param {object} record canonical schoolwork record
 * @returns {object} parent-facing view
 */
export function toSchoolworkParentView(record) {
  if (!record || typeof record !== 'object') return record;
  return { ...record };
}

/**
 * Project a schoolwork record for the CHILD dashboard. Only fields the child
 * can safely see: title, subject, assignment kind, due date, and simple
 * "continue" semantics. Never exposes teacherRef/instructions/objectives in
 * raw form (instructions may be shown to the child in the activity screen,
 * not here); due date is rendered as kid-safe, non-punitive copy.
 * @param {object} record canonical schoolwork record
 * @param {Date|string} [now] injectable clock for deterministic copy
 * @returns {object} child-facing view
 */
export function toSchoolworkChildView(record, now = new Date()) {
  if (!record || typeof record !== 'object') return record;
  const due = record.dueDate ? new Date(record.dueDate) : null;
  return {
    schoolworkId: record.schoolworkId,
    materialId: record.materialId,
    title: record.title || 'Schoolwork',
    subject: record.subject || '',
    assignmentType: record.assignmentType,
    assignmentLabel: assignmentTypeLabel(record.assignmentType),
    status: record.status,
    dueDate: record.dueDate || null,
    dueCopy: due ? dueDateCopy(due, now) : null,
    completedAt: record.completedAt || null
  };
}

function assignmentTypeLabel(type) {
  return {
    homework: 'Homework',
    classwork: 'Classwork',
    worksheet: 'Worksheet',
    reading: 'Reading',
    practice: 'Practice'
  }[type] || 'Schoolwork';
}

/**
 * Kid-safe, non-punitive due-date copy. Never claims today's message is a
 * failure; an expired date renders as a plain, neutral date only.
 * @param {Date} due
 * @param {Date|string} now
 * @returns {string}
 */
function dueDateCopy(due, now) {
  const ref = now instanceof Date ? now : new Date(now);
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((startOf(due).getTime() - startOf(ref).getTime()) / 86400000);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days > 1) return `Due in ${Math.min(days, 7)} day${days === 1 ? '' : 's'}`;
  return `Due ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

/* ───────────────────────── create ───────────────────────── */

/**
 * Parent explicitly adds a branch school material's record as schoolwork.
 * Requires the referenced material to EXIST and be VERIFIED (an unverified
 * material can never become schoolwork). Identity fields (subject,
 * curriculumId, grade) are inherited from the material, never guessed.
 * Optional schoolwork-only fields are persisted ONLY when the parent supplies
 * them (unknown stays unknown).
 *
 * @param {import('./curriculum-store.js').CurriculumStore} store
 * @param {object} input { learnerId, materialId, title?, assignmentType?,
 *   teacherRef?, dueDate?, instructions?, linkedObjectives? }
 * @returns {{ success: true, record: object, existing?: boolean } | { success: false, error }}
 */
export async function addSchoolwork(store, input) {
  if (!store || typeof store.loadMaterials !== 'function' || typeof store.loadSchoolwork !== 'function') {
    return { success: false, error: 'Curriculum store is not available.' };
  }
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'A schoolwork payload is required.' };
  }
  const learnerId = String(input.learnerId || '').trim();
  const materialId = String(input.materialId || '').trim();
  if (!learnerId || !materialId) {
    return { success: false, error: 'learnerId and materialId are required.' };
  }

  // The created record must inherit the canonical material title if the parent
  // did not supply one (the material is the source of the assignment).
  const loaded = await store.loadMaterials(learnerId);
  if (loaded.invalid.length > 0) {
    return { success: false, error: 'Stored school material data is invalid and cannot be read.' };
  }
  const material = loaded.materials.find((m) => m.materialId === materialId);
  if (!material) {
    return { success: false, error: `Material "${materialId}" was not found for this learner.` };
  }
  if (material.verificationStatus !== 'verified') {
    return {
      success: false,
      error: 'Only verified school material can become schoolwork. Verify the material first.'
    };
  }

  const assignmentType = String(input.assignmentType || 'homework').trim();
  if (!ASSIGNMENT_TYPES.includes(assignmentType)) {
    return {
      success: false,
      error: `assignmentType must be one of: ${ASSIGNMENT_TYPES.join(', ')}.`
    };
  }

  const created = createSchoolwork({
    learnerId,
    materialId,
    title: String(input.title || material.title || '').trim() || 'Schoolwork',
    assignmentType,
    subject: material.subject || '',
    curriculumId: material.curriculumId || '',
    grade: material.grade || '',
    // Objectives are inherited from the verified material links ONLY; the
    // parent is never required to know them, and nothing is invented.
    linkedObjectives: Array.isArray(input.linkedObjectives)
      ? input.linkedObjectives
      : (material.linkedObjectives || []),
    teacherRef: input.teacherRef || null,
    dueDate: input.dueDate || null,
    instructions: input.instructions || null,
    status: 'draft',
    createdAt: new Date().toISOString()
  });
  if (!created.ok) {
    return { success: false, error: created.errors.join(' ') };
  }
  const record = created.record;

  const existing = await store.loadSchoolwork(learnerId);
  if (existing.invalid.length > 0) {
    return { success: false, error: 'Stored schoolwork data is invalid and cannot be updated.' };
  }
  // Idempotent: one schoolwork per material. Re-adding an EXISTING record
  // returns it unchanged (success without side effects) so parent UIs can
  // freely toggle the "Add as Schoolwork" affordance.
  if (existing.schoolwork.some((r) => r.schoolworkId === record.schoolworkId)) {
    return { success: true, record, existing: true };
  }
  const saved = await store.saveSchoolwork(learnerId, [...existing.schoolwork, record]);
  if (!saved.ok) {
    return { success: false, error: saved.errors.join(' ') };
  }
  return { success: true, record };
}

/* ───────────────────────── verification ───────────────────────── */

/**
 * Parent verification: draft → verified (the moment schoolwork becomes an
 * active child task). Deterministic; injectable clock optional.
 * @param {import('./curriculum-store.js').CurriculumStore} store
 * @param {object} input { learnerId, schoolworkId, verified }
 * @returns {{ success: true, record: object } | { success: false, error }}
 */
export async function verifySchoolwork(store, input) {
  const res = await updateRecord(store, input, (record, at) => {
    if (typeof input.verified !== 'boolean') {
      return { ok: false, errors: ['`verified` must be a boolean.'] };
    }
    const next = input.verified ? 'verified' : 'rejected';
    return {
      ok: true,
      record: { ...record, status: next, verifiedAt: at }
    };
  });
  return res;
}

/* ───────────────────────── completion ───────────────────────── */

/**
 * Mark schoolwork completed from a finished schoolwork session. The completion
 * summary is derived from the persisted learning session (never invented).
 * verified → completed; idempotent for already-completed records; inert
 * records (draft/rejected/archived) fail closed.
 *
 * @param {import('./curriculum-store.js').CurriculumStore} store
 * @param {object} input { learnerId, schoolworkId, completion? }
 * @returns {{ success: true, record: object } | { success: false, error }}
 */
export async function completeSchoolwork(store, input) {
  const res = await updateRecord(store, input, (record) => {
    if (record.status === 'completed') return { ok: true, record };
    if (record.status !== 'verified') {
      return {
        ok: false,
        errors: [`Cannot complete a ${record.status} assignment. Only verified schoolwork can be completed.`]
      };
    }
    const completion = input.completion && typeof input.completion === 'object'
      ? input.completion
      : { activitiesCompleted: null };
    return {
      ok: true,
      record: { ...record, status: 'completed', completedAt: new Date().toISOString(), completion }
    };
  });
  return res;
}

/* ───────────────────────── read ───────────────────────── */

/**
 * Active child tasks: schoolwork the child can actually work on — status
 * `verified` only (draft/rejected/archived/completed are never active).
 * @param {import('./curriculum-store.js').CurriculumStore} store
 * @param {string} learnerId
 * @param {object} [options] { now }
 * @returns {{ success: true, items: object[] } | { success: false, error }}
 */
export async function listActiveSchoolwork(store, learnerId, options = {}) {
  const res = await listSchoolwork(store, learnerId);
  if (!res.success) return res;
  const now = options?.now || new Date();
  const active = res.schoolwork
    .filter((r) => r.status === 'verified')
    .sort((a, b) => {
      // Verified first, then by due date (missing due dates last), then title.
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      if (aDue !== bDue) return aDue - bDue;
      return String(a.title).localeCompare(String(b.title));
    });
  return { success: true, items: active.map((r) => toSchoolworkChildView(r, now)) };
}

/**
 * Invariant for the dashboard: a schoolwork item is a child task only when it
 * is verified AND not completed. Exported so the dashboard service never
 * re-implements the rule.
 * @param {object} record
 * @returns {boolean}
 */
export function isActiveSchoolwork(record) {
  return !!record && record.status === 'verified' && record.status !== 'completed';
}

/**
 * All schoolwork records for a learner (parent view; every status included).
 * @param {import('./curriculum-store.js').CurriculumStore} store
 * @param {string} learnerId
 * @returns {{ success: true, schoolwork: object[], invalid: object[] } | { success: false, error }}
 */
export async function listSchoolwork(store, learnerId) {
  if (!store || typeof store.loadSchoolwork !== 'function') {
    return { success: false, error: 'Curriculum store is not available.' };
  }
  const loaded = await store.loadSchoolwork(String(learnerId || '').trim());
  return {
    success: true,
    schoolwork: loaded.schoolwork.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || ''))),
    invalid: loaded.invalid
  };
}

/**
 * A single schoolwork record by id.
 * @param {import('./curriculum-store.js').CurriculumStore} store
 * @param {string} learnerId
 * @param {string} schoolworkId
 * @returns {{ success: true, record: object } | { success: false, error }}
 */
export async function getSchoolwork(store, learnerId, schoolworkId) {
  const res = await listSchoolwork(store, learnerId);
  if (!res.success) return res;
  const record = res.schoolwork.find((r) => r.schoolworkId === String(schoolworkId || '').trim());
  if (!record) {
    return { success: false, error: `Schoolwork "${schoolworkId}" was not found for this learner.` };
  }
  return { success: true, record };
}

/* ───────────────────────── shared transition helper ───────────────────────── */

async function updateRecord(store, input, transition) {
  if (!store || typeof store.loadSchoolwork !== 'function' || typeof store.saveSchoolwork !== 'function') {
    return { success: false, error: 'Curriculum store is not available.' };
  }
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'A schoolwork payload is required.' };
  }
  const learnerId = String(input.learnerId || '').trim();
  const schoolworkId = String(input.schoolworkId || '').trim();
  if (!learnerId || !schoolworkId) {
    return { success: false, error: 'learnerId and schoolworkId are required.' };
  }
  const loaded = await store.loadSchoolwork(learnerId);
  if (loaded.invalid.length > 0) {
    return { success: false, error: 'Stored schoolwork data is invalid and cannot be updated.' };
  }
  const index = loaded.schoolwork.findIndex((r) => r.schoolworkId === schoolworkId);
  if (index === -1) {
    return { success: false, error: `Schoolwork "${schoolworkId}" was not found for this learner.` };
  }
  const at = new Date().toISOString();
  const transitioned = transition(loaded.schoolwork[index], at);
  if (!transitioned.ok) {
    return { success: false, error: transitioned.errors.join(' ') };
  }
  const updated = [...loaded.schoolwork];
  updated[index] = transitioned.record;
  const saved = await store.saveSchoolwork(learnerId, updated);
  if (!saved.ok) {
    return { success: false, error: saved.errors.join(' ') };
  }
  return { success: true, record: transitioned.record };
}

export { deriveSchoolworkId as schoolworkIdOfMaterial };