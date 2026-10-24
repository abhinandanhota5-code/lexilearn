/**
 * Grounding Service (§6B) — deterministic rules for how school material
 * grounds learning objectives.
 *
 * Distinction preserved (hard rule): curriculum OBJECTIVES describe what the
 * board expects; SCHOOL MATERIAL is the child's actual source of truth for
 * what is being learned right now. Nothing here merges the two: generic
 * curriculum knowledge NEVER counts as material, and material never counts as
 * curriculum.
 *
 * Fail-closed: an objective is only "grounded" when
 *   1. the objective exists in a registered curriculum,
 *   2. at least one linked material exists for it,
 *   3. that material is VERIFIED (parent confirmed; Phase 3 pattern),
 *   4. the material is structurally compatible (curriculum + grade +
 *      subject) with the objective,
 *   5. it carries a non-empty bounded excerpt.
 * Any inconclusive case → { grounded: false } with machine-readable reasons.
 * No keyword matching is used for the grounding decision — association is
 * explicit (parent/deterministic linking), compatibility is structural.
 *
 * Model-independent: no LLM imports; reusable by the ALE and future Llama
 * layer (mirrors ContentValidator's fail-closed contract).
 */

import { canonicalGradeForGradeId } from './curriculum-registry.js';
import { MATERIAL_EXCERPT_CAP } from './school-material-model.js';

/** Machine-readable grounding outcomes (mirror ALIGN_* style). */
export const GROUNDING_REASONS = Object.freeze({
  GROUNDED: 'grounded',
  NO_MATERIAL: 'no_material',
  MATERIAL_UNVERIFIED: 'material_unverified',
  MATERIAL_CURRICULUM_MISMATCH: 'material_curriculum_mismatch',
  MATERIAL_GRADE_MISMATCH: 'material_grade_mismatch',
  MATERIAL_SUBJECT_MISMATCH: 'material_subject_mismatch',
  MATERIAL_NO_EXCERPT: 'material_no_excerpt',
  UNKNOWN_OBJECTIVE: 'unknown_objective'
});

/**
 * Whether one material record is structurally compatible with an objective.
 * Structural ONLY — no content/keyword analysis here. Deterministic.
 * @param {object} objective registry objective (needs curriculumId, grade, subject)
 * @param {object} material canonical SchoolMaterial
 * @returns {{ compatible: boolean, reasons: string[] }}
 */
export function isMaterialCompatibleWithObjective(objective, material) {
  const reasons = [];
  if (!objective || !material) {
    return { compatible: false, reasons: [GROUNDING_REASONS.UNKNOWN_OBJECTIVE] };
  }
  if (material.curriculumId !== objective.curriculumId) {
    reasons.push(GROUNDING_REASONS.MATERIAL_CURRICULUM_MISMATCH);
  }
  if (material.grade !== objective.grade) {
    reasons.push(GROUNDING_REASONS.MATERIAL_GRADE_MISMATCH);
  }
  if (material.subject !== objective.subject) {
    reasons.push(GROUNDING_REASONS.MATERIAL_SUBJECT_MISMATCH);
  }
  return { compatible: reasons.length === 0, reasons };
}

/**
 * Deterministic association check: may this material be linked to this
 * objective? Same structural rules as compatibility; intended as the gate the
 * parent/deterministic-linking flow calls BEFORE persisting a link.
 * @param {object} objective
 * @param {object} material
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function canAssociateMaterialWithObjective(objective, material) {
  const { compatible, reasons } = isMaterialCompatibleWithObjective(objective, material);
  return { ok: compatible, errors: compatible ? [] : reasons };
}

/**
 * Retrieve verified, compatible materials for an objective.
 * @param {object} objective registry objective
 * @param {object[]} materials candidate canonical SchoolMaterial records
 * @returns {{ materials: object[], rejected: Array<{ materialId: string|null, reasons: string[] }> }}
 */
export function materialsForObjective(objective, materials) {
  const accepted = [];
  const rejected = [];
  for (const material of Array.isArray(materials) ? materials : []) {
    const { compatible, reasons } = isMaterialCompatibleWithObjective(objective, material);
    if (!compatible) {
      rejected.push({ materialId: material?.materialId || null, reasons });
      continue;
    }
    if (material.verificationStatus !== 'verified') {
      rejected.push({ materialId: material?.materialId || null, reasons: [GROUNDING_REASONS.MATERIAL_UNVERIFIED] });
      continue;
    }
    if (!hasUsableExcerpt(material)) {
      rejected.push({ materialId: material?.materialId || null, reasons: [GROUNDING_REASONS.MATERIAL_NO_EXCERPT] });
      continue;
    }
    accepted.push(material);
  }
  return { materials: accepted, rejected };
}

/**
 * THE grounding gate (fail-closed). Decides whether an objective may be
 * treated as grounded by school material right now.
 *
 * @param {object} input
 * @param {object|null} input.objective        Registry objective (or null)
 * @param {object[]} input.linkedMaterials     Canonical materials linked to the objective
 * @param {boolean}  [input.materialRequired]  Objective requires material to be usable at all
 * @returns {{
 *   grounded: boolean,
 *   reason: string,
 *   reasons: string[],
 *   excerpt: { materialId: string, sourceExcerpt: string } | null
 * }}
 */
export function evaluateGrounding({ objective, linkedMaterials, materialRequired = false }) {
  if (!objective) {
    return groundedNo(GROUNDING_REASONS.UNKNOWN_OBJECTIVE, [GROUNDING_REASONS.UNKNOWN_OBJECTIVE]);
  }

  const candidateMaterials = Array.isArray(linkedMaterials) ? linkedMaterials : [];

  if (candidateMaterials.length === 0) {
    // Fail-closed: generic curriculum knowledge NEVER substitutes for
    // material. When the objective is materialRequired this also means the
    // objective is unusable; otherwise the caller may fall back to
    // deterministic built-in content — but it is NOT grounded.
    return groundedNo(GROUNDING_REASONS.NO_MATERIAL, [GROUNDING_REASONS.NO_MATERIAL], materialRequired);
  }

  const { materials: verified, rejected } = materialsForObjective(objective, candidateMaterials);
  if (verified.length === 0) {
    const reasons = rejected.length > 0 ? [...new Set(rejected.flatMap((r) => r.reasons))] : [GROUNDING_REASONS.NO_MATERIAL];
    return groundedNo(reasons[0], reasons, materialRequired);
  }

  // Deterministic order: first verified+compatible material wins; excerpt is
  // bounded to the §6B cap.
  const material = verified[0];
  const sourceExcerpt = material.excerptChunks.join(' ').slice(0, MATERIAL_EXCERPT_CAP);
  if (!sourceExcerpt) {
    return groundedNo(GROUNDING_REASONS.MATERIAL_NO_EXCERPT, [GROUNDING_REASONS.MATERIAL_NO_EXCERPT], materialRequired);
  }

  return {
    grounded: true,
    reason: GROUNDING_REASONS.GROUNDED,
    reasons: [GROUNDING_REASONS.GROUNDED],
    excerpt: { materialId: material.materialId, sourceExcerpt }
  };
}

/**
 * Convenience wrapper: resolve the objective from a registry, then evaluate.
 * @param {object} input
 * @param {import('./curriculum-registry.js').CurriculumRegistry} input.registry
 * @param {string} input.objectiveId
 * @param {object[]} input.materials   All candidate materials (filtering happens here)
 * @returns {same shape as evaluateGrounding, plus objective}
 */
export function evaluateGroundingForObjective({ registry, objectiveId, materials }) {
  const objective = registry?.getObjective?.(objectiveId) || null;
  const linked = (Array.isArray(materials) ? materials : []).filter(
    (m) => Array.isArray(m?.linkedObjectives) && m.linkedObjectives.includes(objectiveId)
  );
  const result = evaluateGrounding({ objective, linkedMaterials: linked, materialRequired: objective?.materialRequired === true });
  return { ...result, objective };
}

/**
 * Grade-compatibility helper for cross-checking a material against a learner's
 * canonical grade: the material's board grade must map to the canonical grade.
 * Deterministic; used to keep board/grade separation airtight.
 * @param {object} curriculum
 * @param {object} material
 * @param {string} canonicalGrade learner's canonical grade
 * @returns {boolean}
 */
export function isMaterialForCanonicalGrade(curriculum, material, canonicalGrade) {
  return canonicalGradeForGradeId(curriculum, material?.grade) === canonicalGrade;
}

/* ───────────────────────── internal ───────────────────────── */

function hasUsableExcerpt(material) {
  return Array.isArray(material?.excerptChunks)
    && material.excerptChunks.some((c) => typeof c === 'string' && c.trim().length > 0);
}

function groundedNo(reason, reasons, materialRequired = false) {
  const all = materialRequired ? [...reasons, 'objective_material_required'] : reasons;
  return { grounded: false, reason: reason, reasons: all, excerpt: null };
}
