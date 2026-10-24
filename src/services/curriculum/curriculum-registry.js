/**
 * Curriculum Registry — deterministic in-memory registry for curricula and
 * their learning objectives.
 *
 * Contract:
 * - Registration VALIDATES every record (curriculum-schema.js); invalid input
 *   never enters the registry (fail-closed).
 * - objectiveIds are globally unique across the registry; duplicates are
 *   rejected so lookups stay unambiguous.
 * - Re-registering the same curriculumId with the SAME syllabusVersion
 *   replaces the record deterministically (idempotent updates); a DIFFERENT
 *   syllabusVersion is rejected — bumping a syllabus is an explicit act.
 * - All lookups are pure functions of registry state: same registry content
 *   + same query → same result (deterministic repeated retrieval).
 *
 * Model-independent: no LLM imports; reusable by ALE, validator, stores.
 */

import {
  validateCurriculum,
  CANONICAL_GRADES
} from './curriculum-schema.js';

export class CurriculumRegistry {
  constructor() {
    /** @type {Map<string, object>} curriculumId → curriculum */
    this.curricula = new Map();
    /** @type {Map<string, object>} objectiveId → objective */
    this.objectives = new Map();
  }

  /**
   * Register a validated curriculum (and index its objectives).
   * @param {object} curriculum
   * @returns {{ ok: boolean, errors: string[] }}
   */
  registerCurriculum(curriculum) {
    const check = validateCurriculum(curriculum);
    if (!check.isValid) {
      return { ok: false, errors: check.errors };
    }

    const existing = this.curricula.get(curriculum.curriculumId);
    if (existing && existing.syllabusVersion !== curriculum.syllabusVersion) {
      return {
        ok: false,
        errors: [
          `curriculumId "${curriculum.curriculumId}" is already registered with syllabusVersion "${existing.syllabusVersion}". Register a new curriculumId or bump the version explicitly.`
        ]
      };
    }

    // Objective global-uniqueness check BEFORE mutation (no partial state).
    for (const objective of curriculum.learningObjectives) {
      const owner = this.objectives.get(objective.objectiveId);
      if (owner && owner.curriculumId !== curriculum.curriculumId) {
        return {
          ok: false,
          errors: [
            `objectiveId "${objective.objectiveId}" is already registered by curriculum "${owner.curriculumId}".`
          ]
        };
      }
    }

    // If replacing (same id + same version), drop this curriculum's old
    // objective index entries first so replacements are clean.
    if (existing) {
      for (const objective of existing.learningObjectives) {
        this.objectives.delete(objective.objectiveId);
      }
    }

    const frozenCopy = deepFreeze(curriculum);
    this.curricula.set(curriculum.curriculumId, frozenCopy);
    for (const objective of frozenCopy.learningObjectives) {
      this.objectives.set(objective.objectiveId, objective);
    }

    return { ok: true, errors: [] };
  }

  /** Whether a curriculumId is registered. */
  hasCurriculum(curriculumId) {
    return this.curricula.has(curriculumId);
  }

  /** Get a curriculum by id (or null). */
  getCurriculum(curriculumId) {
    return this.curricula.get(curriculumId) || null;
  }

  /** All registered curricula in registration order. */
  listCurricula() {
    return [...this.curricula.values()];
  }

  /**
   * List curricula filtered by board, canonical grade, and/or subject.
   * Deterministic filter; omitted filters are not applied.
   * @param {{ board?: string, canonicalGrade?: string, subject?: string }} filter
   * @returns {object[]}
   */
  listCurriculaWhere(filter = {}) {
    return this.listCurricula().filter((c) => {
      if (filter.board && c.board !== filter.board) return false;
      if (filter.subject && !c.subjects.includes(filter.subject)) return false;
      if (filter.canonicalGrade && !gradeIdsForCanonicalGrade(c, filter.canonicalGrade).length) return false;
      return true;
    });
  }

  /** Get a learning objective by globally-unique id (or null). */
  getObjective(objectiveId) {
    return this.objectives.get(objectiveId) || null;
  }

  /** All objectives of one curriculum, in curriculum order. */
  objectivesForCurriculum(curriculumId) {
    const curriculum = this.curricula.get(curriculumId);
    return curriculum ? [...curriculum.learningObjectives] : [];
  }

  /**
   * Objectives whose curriculum grade maps to the canonical grade.
   * Optional board/subject filters. Deterministic.
   * @param {string} canonicalGrade
   * @param {{ board?: string, subject?: string }} [filter]
   * @returns {object[]}
   */
  objectivesForCanonicalGrade(canonicalGrade, filter = {}) {
    if (!CANONICAL_GRADES.includes(canonicalGrade)) return [];
    const results = [];
    for (const curriculum of this.curricula.values()) {
      if (filter.board && curriculum.board !== filter.board) continue;
      const gradeIds = new Set(gradeIdsForCanonicalGrade(curriculum, canonicalGrade));
      for (const objective of curriculum.learningObjectives) {
        if (!gradeIds.has(objective.grade)) continue;
        if (filter.subject && objective.subject !== filter.subject) continue;
        results.push(objective);
      }
    }
    return results;
  }

  /**
   * Objectives for a specific board-specific gradeId within one curriculum.
   * Deterministic.
   */
  objectivesForCurriculumGrade(curriculumId, gradeId, subject = null) {
    const curriculum = this.curricula.get(curriculumId);
    if (!curriculum) return [];
    return curriculum.learningObjectives.filter(
      (o) => o.grade === gradeId && (subject === null || o.subject === subject)
    );
  }

  /**
   * Prerequisite closure of an objective within the registry (its own
   * prerequisites first, then theirs, depth-first, cycle-safe).
   * Unknown prerequisite ids are skipped (deterministic, no throw).
   * @param {string} objectiveId
   * @returns {string[]} prerequisite objectiveIds in deterministic order
   */
  prerequisiteClosure(objectiveId) {
    const seen = new Set();
    const order = [];
    const visit = (id) => {
      const objective = this.objectives.get(id);
      if (!objective) return;
      for (const prereq of objective.prerequisites || []) {
        if (prereq === objectiveId || seen.has(prereq)) continue;
        if (!this.objectives.has(prereq)) continue; // unknown ids never enter the closure
        seen.add(prereq);
        order.push(prereq);
        visit(prereq);
      }
    };
    visit(objectiveId);
    return order;
  }

  /** Number of registered curricula (test convenience). */
  get size() {
    return this.curricula.size;
  }
}

/* ───────────────────────── grade mapping helpers ───────────────────────── */

/**
 * Board gradeIds that map to a canonical grade within a curriculum.
 * @param {object} curriculum
 * @param {string} canonicalGrade
 * @returns {string[]}
 */
export function gradeIdsForCanonicalGrade(curriculum, canonicalGrade) {
  if (!curriculum || !Array.isArray(curriculum.gradeLevels)) return [];
  return curriculum.gradeLevels
    .filter((gl) => gl.canonicalGrade === canonicalGrade)
    .map((gl) => gl.gradeId);
}

/**
 * The canonical grade for a board gradeId (or null when unknown).
 * @param {object} curriculum
 * @param {string} gradeId
 * @returns {string|null}
 */
export function canonicalGradeForGradeId(curriculum, gradeId) {
  if (!curriculum || !Array.isArray(curriculum.gradeLevels)) return null;
  const found = curriculum.gradeLevels.find((gl) => gl.gradeId === gradeId);
  return found ? found.canonicalGrade : null;
}

/* ───────────────────────── internal ───────────────────────── */

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze(value[key]);
    }
  }
  return value;
}
