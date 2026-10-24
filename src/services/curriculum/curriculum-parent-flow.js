/**
 * Curriculum Parent Flow (Phase 6 Step 1) — thin orchestration layer between
 * the ELECTRON main process (IPC handlers) and the existing curriculum
 * foundation (registry, schema, material model, grounding service, store).
 *
 * Why this module exists: IPC handlers must never trust renderer input, and
 * the foundation services are dependency-injected (registry + store + pipeline)
 * so this layer is unit-testable WITHOUT Electron. main.js handlers stay thin
 * (serialize to real IPC result envelopes here).
 *
 * Contract:
 * - Every exported function returns `{ success: true, ... }` or
 *   `{ success: false, error }` (never throws; malformed input is a result).
 * - Every input is validated in main-process code (this layer), never in the
 *   renderer.
 * - Curriculum/grade/subject combinations are cross-checked against the
 *   registered curriculum (board grades stay tied to their curriculum).
 * - Objective links are gated by the grounding-service structural-compatibility
 *   rule (`canAssociateMaterialWithObjective`); incompatible links are rejected
 *   deterministically, never silently dropped.
 * - `extractedContent` is NEVER returned to the renderer; only bounded
 *   `excerptChunks` (≤ 8 × 400 chars) travel back (payload hygiene).
 */

import { validateSchoolMaterial } from './curriculum-schema.js';
import {
  createSchoolMaterial,
  verifyMaterial,
  rejectMaterial,
  linkObjectives
} from './school-material-model.js';
import { canAssociateMaterialWithObjective } from './grounding-service.js';

/* ───────────────────────── view projection ───────────────────────── */

/**
 * Project a canonical material for the renderer: strip raw extractedContent,
 * keep the bounded excerptChunks + metadata.
 * @param {object} material canonical record
 * @returns {object} view
 */
export function toMaterialView(material) {
  if (!material || typeof material !== 'object') return material;
  const { extractedContent, ...rest } = material;
  return rest;
}

/**
 * Collect every registered objective id (for fail-closed validate context).
 * @param {import('./curriculum-registry.js').CurriculumRegistry} registry
 * @returns {string[]}
 */
function allObjectiveIds(registry) {
  const ids = [];
  for (const curriculum of registry.listCurricula()) {
    for (const objective of curriculum.learningObjectives) {
      ids.push(objective.objectiveId);
    }
  }
  return ids;
}

/* ───────────────────────── curriculum options ───────────────────────── */

/**
 * Options payload for the parent's system/grade/subject pickers.
 * Objectives are NOT included (kept tiny); use getCurriculumObjectives.
 * @param {import('./curriculum-registry.js').CurriculumRegistry} registry
 * @returns {{ success: true, curricula: object[] }}
 */
export function getCurriculumOptions(registry) {
  const curricula = registry.listCurricula().map((c) => ({
    curriculumId: c.curriculumId,
    board: c.board,
    name: c.name,
    syllabusVersion: c.syllabusVersion,
    gradeLevels: c.gradeLevels.map((g) => ({
      gradeId: g.gradeId,
      label: g.label,
      canonicalGrade: g.canonicalGrade
    })),
    subjects: [...c.subjects]
  }));
  return { success: true, curricula };
}

/* ───────────────────────── objectives (filtered, validated) ───────────────────────── */

/**
 * Objectives for the parent's chosen curriculum/grade/subject context,
 * cross-validated against the registry (grade must belong to the curriculum;
 * subject must be declared by the curriculum).
 * @param {import('./curriculum-registry.js').CurriculumRegistry} registry
 * @param {object} input { curriculumId, grade?, subject? }
 * @returns {{ success: true, objectives: object[] } | { success: false, error: string }}
 */
export function getCurriculumObjectives(registry, input) {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'A selection payload is required.' };
  }
  const curriculumId = String(input.curriculumId || '').trim();
  const grade = input.grade ? String(input.grade).trim() : null;
  const subject = input.subject ? String(input.subject).trim() : null;

  const curriculum = registry.getCurriculum(curriculumId);
  if (!curriculum) {
    return { success: false, error: `Unknown curriculum "${curriculumId}".` };
  }
  if (grade && !curriculum.gradeLevels.some((g) => g.gradeId === grade)) {
    return { success: false, error: `"${grade}" is not a grade of curriculum "${curriculumId}".` };
  }
  if (subject && !curriculum.subjects.includes(subject)) {
    return { success: false, error: `"${subject}" is not a subject of curriculum "${curriculumId}".` };
  }

  const objectives = curriculum.learningObjectives
    .filter((o) => (!grade || o.grade === grade) && (!subject || o.subject === subject))
    .map((o) => ({
      objectiveId: o.objectiveId,
      curriculumId: o.curriculumId,
      grade: o.grade,
      subject: o.subject,
      skillCategory: o.skillCategory,
      description: o.description,
      minDifficulty: o.minDifficulty,
      maxDifficulty: o.maxDifficulty,
      materialRequired: o.materialRequired
    }));
  return { success: true, objectives };
}

/* ───────────────────────── extraction (reuses ingestion pipeline) ───────────────────────── */

/**
 * Extract text from a school-material file using the existing ingestion
 * pipeline. Unsupported formats surface the pipeline's own clean error.
 * @param {import('./document/document-ingestion-pipeline.js').DocumentIngestionPipeline} pipeline
 * @param {string} filePath absolute path
 * @returns {{ success: true, text, charCount, fileName, pageCount, extractorName } | { success: false, error }}
 */
export async function extractSchoolMaterial(pipeline, filePath) {
  if (!pipeline || typeof pipeline?.extractDocument !== 'function') {
    return { success: false, error: 'Document pipeline is not available.' };
  }
  try {
    const result = await pipeline.extractDocument(filePath);
    return {
      success: true,
      text: result.text,
      charCount: result.text.length,
      fileName: result.fileName,
      pageCount: result.pageCount,
      extractorName: result.extractorName
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Extraction failed.' };
  }
}

/* ───────────────────────── add material (validated + persisted) ───────────────────────── */

/**
 * Validate, create (unverified), and persist a canonical school material.
 * GATES (all enforced here, fail-closed):
 *   - curriculumId registered
 *   - grade is a grade of THAT curriculum
 *   - subject is declared by THAT curriculum
 *   - each linkedObjective exists AND is structurally compatible
 * @param {import('./curriculum-registry.js').CurriculumRegistry} registry
 * @param {import('./curriculum-store.js').CurriculumStore} store
 * @param {object} input canonical-ish payload (see buildCanonicalSchoolMaterial)
 * @returns {{ success: true, material: object, linkedObjectives: string[], rejected: object[] } | { success: false, error, rejected? }}
 */
export async function addSchoolMaterial(registry, store, input) {
  const rejectedLinking = [];

  if (!input || typeof input !== 'object') {
    return { success: false, error: 'A material payload is required.' };
  }
  const learnerId = String(input.learnerId || '').trim();
  if (!learnerId || learnerId.length > 120) {
    return { success: false, error: 'A valid learnerId is required.' };
  }
  if (!registry || typeof registry.getCurriculum !== 'function') {
    return { success: false, error: 'Curriculum registry is not available.' };
  }

  const curriculum = registry.getCurriculum(String(input.curriculumId || '').trim());
  if (!curriculum) {
    return { success: false, error: `Unknown curriculum "${input.curriculumId}".` };
  }

  const created = createSchoolMaterial({
    title: input.title,
    type: input.type,
    curriculumId: curriculum.curriculumId,
    grade: String(input.grade || '').trim(),
    subject: String(input.subject || '').trim(),
    source: {
      reference: input.source?.reference,
      pageRange: input.source?.pageRange
    },
    extractedContent: input.extractedContent,
    linkedObjectives: [],
    addedAt: new Date().toISOString()
  });
  if (!created.ok) {
    return { success: false, error: created.errors.join(' ') };
  }

  const gradeId = created.material.grade;
  if (!curriculum.gradeLevels.some((g) => g.gradeId === gradeId)) {
    return { success: false, error: `"${gradeId}" is not a grade of curriculum "${curriculum.curriculumId}".` };
  }
  if (!curriculum.subjects.includes(created.material.subject)) {
    return { success: false, error: `"${created.material.subject}" is not a subject of curriculum "${curriculum.curriculumId}".` };
  }

  // Objective links: gate each against the registry BEFORE persistence.
  if (input.linkedObjectives !== undefined && !Array.isArray(input.linkedObjectives)) {
    return { success: false, error: '`linkedObjectives` must be an array of objective ids.' };
  }
  const requested = Array.isArray(input.linkedObjectives) ? input.linkedObjectives : [];
  const linked = [];
  for (const id of requested) {
    const objectiveId = String(id).trim();
    if (!objectiveId) continue;
    const objective = registry.getObjective(objectiveId);
    if (!objective) {
      rejectedLinking.push({ objectiveId, error: `Unknown objective "${objectiveId}".` });
      continue;
    }
    const gate = canAssociateMaterialWithObjective(objective, created.material);
    if (!gate.ok) {
      rejectedLinking.push({ objectiveId, error: `Incompatible with "${objectiveId}": ${gate.errors.join(', ')}.` });
      continue;
    }
    linked.push(objectiveId);
  }

  const linkedResult = linkObjectives(created.material, linked);
  if (!linkedResult.ok) {
    return { success: false, error: linkedResult.errors.join(' ') };
  }

  // Belt-and-braces: full validate with the registered set as context.
  const finalCheck = validateSchoolMaterial(linkedResult.material, {
    knownCurriculumIds: [...registry.curricula.keys()],
    knownObjectiveIds: allObjectiveIds(registry)
  });
  if (!finalCheck.isValid) {
    return { success: false, error: finalCheck.errors.join(' ') };
  }

  // Persist (only when the stored learner index is healthy — no silent drops).
  if (!store || typeof store.saveMaterials !== 'function') {
    return { success: false, error: 'Curriculum store is not available.' };
  }
  const existing = await store.loadMaterials(learnerId);
  if (existing.invalid.length > 0) {
    return {
      success: false,
      error: `Stored school material data for this learner is invalid and cannot be updated (${existing.invalid.length} invalid record(s)). Contact a parent to review.`
    };
  }
  const saved = await store.saveMaterials(learnerId, [...existing.materials, linkedResult.material]);
  if (!saved.ok) {
    return { success: false, error: saved.errors.join(' ') };
  }

  return {
    success: true,
    material: toMaterialView(linkedResult.material),
    linkedObjectives: linked,
    rejected: rejectedLinking
  };
}

/* ───────────────────────── list / get ───────────────────────── */

/**
 * All stored materials for a learner (valid + quarantined, nothing hidden).
 * @param {import('./curriculum-store.js').CurriculumStore} store
 * @param {string} learnerId
 * @returns {{ success: true, materials: object[], invalid: object[] } | { success: false, error }}
 */
export async function listSchoolMaterials(store, learnerId) {
  if (!learnerId || typeof learnerId !== 'string' || !learnerId.trim()) {
    return { success: false, error: 'A valid learnerId is required.' };
  }
  const loaded = await store.loadMaterials(learnerId.trim());
  return {
    success: true,
    materials: loaded.materials.map(toMaterialView),
    invalid: loaded.invalid
  };
}

/**
 * A single stored material by id.
 * @param {import('./curriculum-store.js').CurriculumStore} store
 * @param {string} learnerId
 * @param {string} materialId
 * @returns {{ success: true, material: object } | { success: false, error }}
 */
export async function getSchoolMaterial(store, learnerId, materialId) {
  const loaded = await store.loadMaterials(String(learnerId || '').trim());
  const material = loaded.materials.find((m) => m.materialId === String(materialId || '').trim());
  if (!material) {
    return { success: false, error: `Material "${materialId}" was not found for this learner.` };
  }
  return { success: true, material: toMaterialView(material) };
}

/* ───────────────────────── verification ───────────────────────── */

/**
 * Parent verification of a stored material (verified / rejected). The
 * grounding-service treats only `verified` materials as usable context.
 * @param {import('./curriculum-store.js').CurriculumStore} store
 * @param {object} input { learnerId, materialId, verified }
 * @returns {{ success: true, material: object } | { success: false, error }}
 */
export async function verifySchoolMaterial(store, input) {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'A verification payload is required.' };
  }
  const learnerId = String(input.learnerId || '').trim();
  const materialId = String(input.materialId || '').trim();
  if (!learnerId || !materialId) {
    return { success: false, error: 'learnerId and materialId are required.' };
  }
  if (typeof input.verified !== 'boolean') {
    return { success: false, error: '`verified` must be a boolean (true = verified, false = rejected).' };
  }

  const loaded = await store.loadMaterials(learnerId);
  if (loaded.invalid.length > 0) {
    return {
      success: false,
      error: `Stored school material data for this learner is invalid and cannot be updated.`
    };
  }
  const index = loaded.materials.findIndex((m) => m.materialId === materialId);
  if (index === -1) {
    return { success: false, error: `Material "${materialId}" was not found for this learner.` };
  }

  const at = new Date().toISOString();
  const transition = input.verified
    ? verifyMaterial(loaded.materials[index], { at })
    : rejectMaterial(loaded.materials[index], { at });
  if (!transition.ok) {
    return { success: false, error: transition.errors.join(' ') };
  }

  const updated = [...loaded.materials];
  updated[index] = transition.material;
  const saved = await store.saveMaterials(learnerId, updated);
  if (!saved.ok) {
    return { success: false, error: saved.errors.join(' ') };
  }
  return { success: true, material: toMaterialView(transition.material) };
}

/* ───────────────────────── objective linking (update) ───────────────────────── */

/**
 * Update the objectives linked to an existing material. Structural
 * compatibility is enforced per objective; incompatible ones are returned in a
 * `rejected` list (never silently half-applied: applied ones ARE saved,
 * rejected ones are reported so the parent knows exactly what happened).
 * @param {import('./curriculum-registry.js').CurriculumRegistry} registry
 * @param {import('./curriculum-store.js').CurriculumStore} store
 * @param {object} input { learnerId, materialId, objectiveIds }
 * @returns {{ success: true, material: object, applied: string[], rejected: object[] } | { success: false, error }}
 */
export async function linkSchoolMaterialObjectives(registry, store, input) {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'A linking payload is required.' };
  }
  const learnerId = String(input.learnerId || '').trim();
  const materialId = String(input.materialId || '').trim();
  if (!learnerId || !materialId) {
    return { success: false, error: 'learnerId and materialId are required.' };
  }
  const requested = Array.isArray(input.objectiveIds) ? input.objectiveIds : [];
  if (input.objectiveIds !== undefined && !Array.isArray(input.objectiveIds)) {
    return { success: false, error: '`objectiveIds` must be an array of objective ids.' };
  }

  const loaded = await store.loadMaterials(learnerId);
  if (loaded.invalid.length > 0) {
    return {
      success: false,
      error: `Stored school material data for this learner is invalid and cannot be updated.`
    };
  }
  const index = loaded.materials.findIndex((m) => m.materialId === materialId);
  if (index === -1) {
    return { success: false, error: `Material "${materialId}" was not found for this learner.` };
  }
  const material = loaded.materials[index];

  const applied = [];
  const rejected = [];
  for (const id of requested) {
    const objectiveId = String(id).trim();
    if (!objectiveId) continue;
    const objective = registry.getObjective(objectiveId);
    if (!objective) {
      rejected.push({ objectiveId, error: `Unknown objective "${objectiveId}".` });
      continue;
    }
    const gate = canAssociateMaterialWithObjective(objective, material);
    if (!gate.ok) {
      rejected.push({ objectiveId, error: `Incompatible with "${objectiveId}": ${gate.errors.join(', ')}.` });
      continue;
    }
    applied.push(objectiveId);
  }

  const linked = linkObjectives(material, applied);
  if (!linked.ok) {
    return { success: false, error: linked.errors.join(' ') };
  }

  const finalCheck = validateSchoolMaterial(linked.material, {
    knownCurriculumIds: [...registry.curricula.keys()],
    knownObjectiveIds: allObjectiveIds(registry)
  });
  if (!finalCheck.isValid) {
    return { success: false, error: finalCheck.errors.join(' ') };
  }

  const updated = [...loaded.materials];
  updated[index] = linked.material;
  const saved = await store.saveMaterials(learnerId, updated);
  if (!saved.ok) {
    return { success: false, error: saved.errors.join(' ') };
  }
  return { success: true, material: toMaterialView(linked.material), applied, rejected };
}