/**
 * Curriculum Schema — model-independent curriculum abstraction
 *
 * Represents any board/system (CBSE, ICSE/CISCE, Cambridge IGCSE, IB,
 * US/Common Core, UK National Curriculum, ...) with a SMALL canonical model:
 *
 *   Curriculum {
 *     curriculumId, board, name, syllabusVersion,
 *     gradeLevels: [{ gradeId, label, canonicalGrade }],   // ordered
 *     subjects: string[],
 *     learningObjectives: LearningObjective[]
 *   }
 *
 * Canonical grades: a superset of the app's profile GRADE_LEVELS — the full
 * school range 'Kindergarten'..'12th Grade'. Each curriculum maps ITS OWN year
 * labels onto canonical grades so grade comparisons stay deterministic across
 * boards (a Cambridge "Stage 4" and a US "Grade 4" may both map to
 * '4th Grade', while CBSE "Class 3" maps to '3rd Grade'). No real-world
 * syllabus content is hardcoded — boards are identifiers + grade maps only;
 * objectives carry the actual content.
 *
 * A grade that exists in a curriculum's grade map but has NO objective
 * fixtures yet is still a VALID curriculum grade: the selector offers it and
 * add/verify flows accept it; objectives simply come back empty for it.
 *
 * All validation is deterministic and returns `{ isValid, errors }`.
 * Model-independent: no LLM imports, reusable by any future layer.
 */

/**
 * Supported boards/systems (default set). Extensible: additional board ids
 * can be registered at runtime via `registerBoard()` — the frozen export is
 * the DEFAULT catalog, while the internal known-board set gates which `board`
 * values a Curriculum record may declare. Deterministic and explicit.
 */
export const SUPPORTED_BOARDS = Object.freeze([
  'cbse',
  'icse_cisce',
  'cambridge_igcse',
  'ib_pyp',
  'us_common_core',
  'uk_national_curriculum'
]);

/** Internal mutable board set seeded from the default catalog. */
const KNOWN_BOARDS = new Set(SUPPORTED_BOARDS);

/**
 * Register an additional board/system id (extensibility for future systems).
 * Idempotent; deterministic.
 * @param {string} boardId
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function registerBoard(boardId) {
  if (!isNonEmptyString(boardId, 60)) {
    return { ok: false, errors: ['boardId must be a non-empty string (max 60 chars).'] };
  }
  KNOWN_BOARDS.add(boardId.trim());
  return { ok: true, errors: [] };
}

/** Whether a board id is currently registered. */
export function isKnownBoard(boardId) {
  return typeof boardId === 'string' && KNOWN_BOARDS.has(boardId);
}

/** School-material kinds (§6B). */
export const VALID_MATERIAL_TYPES = Object.freeze([
  'textbook_chapter',
  'worksheet',
  'class_notes',
  'assignment',
  'syllabus_document'
]);

/** Parent verification lifecycle (Phase 3 review-confirm pattern). */
export const VERIFICATION_STATUSES = Object.freeze([
  'unverified',
  'verified',
  'rejected'
]);

/** Difficulty bounds apply to the same 1..5 scale as ALE skills. */
export const DIFFICULTY_FLOOR = 1;
export const DIFFICULTY_CEILING = 5;

/**
 * Hard cap on stored extracted content: school material is the primary
 * learning source, so it is bounded but generous; overlong inputs are
 * REJECTED (fail-closed), never silently truncated.
 */
export const MAX_EXTRACTED_CONTENT_CHARS = 20000;

/**
 * Canonical grades: the FULL supported school range (Kindergarten through
 * 12th Grade). Profile creation itself remains capped at 6th Grade by the
 * profile schema; the canonical ladder here exists so curricula can cover
 * their whole real grade/year range (e.g. CBSE Classes 1–12) even where no
 * learner profile or objective fixtures exist for those years yet.
 */
export const CANONICAL_GRADES = Object.freeze([
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
  '5th Grade',
  '6th Grade',
  '7th Grade',
  '8th Grade',
  '9th Grade',
  '10th Grade',
  '11th Grade',
  '12th Grade'
]);

/* ───────────────────────── small helpers ───────────────────────── */

function isNonEmptyString(v, max = 200) {
  return typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;
}

function asStringArray(v, maxItems = 50) {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === 'string' && x.trim().length > 0).slice(0, maxItems);
}

/* ───────────────────────── curriculum validation ───────────────────────── */

/**
 * Validate a Curriculum record.
 * @param {object} curriculum
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateCurriculum(curriculum) {
  const errors = [];
  if (!curriculum || typeof curriculum !== 'object') {
    return { isValid: false, errors: ['Curriculum is required.'] };
  }
  if (!isNonEmptyString(curriculum.curriculumId, 80)) {
    errors.push('curriculumId is required (max 80 chars).');
  }
  if (!isKnownBoard(curriculum.board)) {
    errors.push(`board must be one of: ${[...KNOWN_BOARDS].sort().join(', ')}.`);
  }
  if (!isNonEmptyString(curriculum.name, 120)) {
    errors.push('name is required (max 120 chars).');
  }
  if (!isNonEmptyString(curriculum.syllabusVersion, 40)) {
    errors.push('syllabusVersion is required (max 40 chars).');
  }

  const gradeLevels = Array.isArray(curriculum.gradeLevels) ? curriculum.gradeLevels : [];
  if (gradeLevels.length === 0) {
    errors.push('gradeLevels must contain at least one entry.');
  }
  const seenGrades = new Set();
  const seenCanonical = new Set();
  gradeLevels.forEach((gl, i) => {
    if (!isNonEmptyString(gl?.gradeId, 40)) {
      errors.push(`gradeLevels[${i}].gradeId is required.`);
    } else if (seenGrades.has(gl.gradeId)) {
      errors.push(`gradeLevels[${i}].gradeId "${gl.gradeId}" is duplicated.`);
    } else {
      seenGrades.add(gl.gradeId);
    }
    if (!CANONICAL_GRADES.includes(gl?.canonicalGrade)) {
      errors.push(`gradeLevels[${i}].canonicalGrade must be a canonical grade (${gl?.canonicalGrade}).`);
    } else if (seenCanonical.has(gl.canonicalGrade)) {
      errors.push(`gradeLevels[${i}].canonicalGrade "${gl.canonicalGrade}" is mapped twice.`);
    } else {
      seenCanonical.add(gl.canonicalGrade);
    }
    if (!isNonEmptyString(gl?.label, 60)) {
      errors.push(`gradeLevels[${i}].label is required.`);
    }
  });

  if (!Array.isArray(curriculum.subjects) || curriculum.subjects.length === 0) {
    errors.push('subjects must be a non-empty array.');
  } else if (!curriculum.subjects.every((s) => isNonEmptyString(s, 60))) {
    errors.push('subjects entries must be non-empty strings (max 60 chars).');
  }

  const objectives = Array.isArray(curriculum.learningObjectives) ? curriculum.learningObjectives : [];
  for (const objective of objectives) {
    const check = validateLearningObjective(objective, curriculum);
    if (!check.isValid) errors.push(...check.errors);
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Canonicalize a curriculum input: trims identifiers and freezes array order.
 * Does NOT invent content — objectives must be supplied by the caller.
 * @param {object} input
 * @returns {object} canonical curriculum record
 */
export function buildCanonicalCurriculum(input) {
  const gradeLevels = Array.isArray(input?.gradeLevels) ? input.gradeLevels : [];
  return {
    curriculumId: String(input?.curriculumId || '').trim(),
    board: input?.board,
    name: String(input?.name || '').trim(),
    syllabusVersion: String(input?.syllabusVersion || '').trim(),
    gradeLevels: gradeLevels.map((gl) => ({
      gradeId: String(gl?.gradeId || '').trim(),
      label: String(gl?.label || '').trim(),
      canonicalGrade: gl?.canonicalGrade
    })),
    subjects: asStringArray(input?.subjects).map((s) => s.trim()),
    learningObjectives: Array.isArray(input?.learningObjectives) ? input.learningObjectives : []
  };
}

/* ───────────────────────── learning objective validation ───────────────────────── */

/**
 * Validate a LearningObjective against its curriculum context.
 * Deterministic metadata checks only — content alignment (term coverage etc.)
 * remains the ContentValidator's job (§8A). This schema gate enforces the
 * STRUCTURE the validator and ALE rely on.
 * @param {object} objective
 * @param {object} [curriculum] parent curriculum for grade/subject cross-checks
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateLearningObjective(objective, curriculum = null) {
  const errors = [];
  if (!objective || typeof objective !== 'object') {
    return { isValid: false, errors: ['LearningObjective is required.'] };
  }
  if (!isNonEmptyString(objective.objectiveId, 80)) {
    errors.push('objectiveId is required (max 80 chars).');
  }
  if (!isNonEmptyString(objective.curriculumId, 80)) {
    errors.push('curriculumId is required (max 80 chars).');
  }
  if (curriculum && objective.curriculumId !== curriculum.curriculumId) {
    errors.push(`objective.curriculumId "${objective.curriculumId}" does not match curriculum "${curriculum.curriculumId}".`);
  }
  if (!isNonEmptyString(objective.grade, 40)) {
    errors.push('grade (curriculum gradeId) is required.');
  } else if (curriculum) {
    const known = (curriculum.gradeLevels || []).some((gl) => gl.gradeId === objective.grade);
    if (!known) {
      errors.push(`objective.grade "${objective.grade}" is not a gradeId of curriculum "${curriculum.curriculumId}".`);
    }
  }
  if (!isNonEmptyString(objective.subject, 60)) {
    errors.push('subject is required.');
  } else if (curriculum && Array.isArray(curriculum.subjects) && curriculum.subjects.length > 0
    && !curriculum.subjects.includes(objective.subject)) {
    errors.push(`objective.subject "${objective.subject}" is not declared by curriculum "${curriculum.curriculumId}".`);
  }
  if (!isNonEmptyString(objective.skillCategory, 60)) {
    errors.push('skillCategory is required (maps to ALE skill or curriculum category).');
  }
  if (!isNonEmptyString(objective.description, 500)) {
    errors.push('description is required (max 500 chars).');
  }

  const min = objective.minDifficulty;
  const max = objective.maxDifficulty;
  if (!Number.isInteger(min) || min < DIFFICULTY_FLOOR || min > DIFFICULTY_CEILING) {
    errors.push(`minDifficulty must be an integer in [${DIFFICULTY_FLOOR}, ${DIFFICULTY_CEILING}].`);
  }
  if (!Number.isInteger(max) || max < DIFFICULTY_FLOOR || max > DIFFICULTY_CEILING) {
    errors.push(`maxDifficulty must be an integer in [${DIFFICULTY_FLOOR}, ${DIFFICULTY_CEILING}].`);
  }
  if (Number.isInteger(min) && Number.isInteger(max) && min > max) {
    errors.push('minDifficulty must be <= maxDifficulty.');
  }

  // Grade-aware difficulty (optional, bounded, deterministic). When present,
  // every key must be a canonical grade and every value a valid bounded
  // { min, max, default? } window within the global 1..5 scale. Invalid
  // bounds fail validation — the ALE resolves bounds fail-closed, so a bad
  // map must never enter the registry.
  if (objective.defaultDifficulty !== undefined) {
    if (!Number.isInteger(objective.defaultDifficulty) || objective.defaultDifficulty < DIFFICULTY_FLOOR || objective.defaultDifficulty > DIFFICULTY_CEILING) {
      errors.push(`defaultDifficulty must be an integer in [${DIFFICULTY_FLOOR}, ${DIFFICULTY_CEILING}] when provided.`);
    }
  }
  if (objective.gradeDifficultyBounds !== undefined) {
    const gdb = objective.gradeDifficultyBounds;
    if (!gdb || typeof gdb !== 'object' || Array.isArray(gdb)) {
      errors.push('gradeDifficultyBounds must be an object keyed by canonical grade when provided.');
    } else {
      for (const key of Object.keys(gdb)) {
        if (!CANONICAL_GRADES.includes(key)) {
          errors.push(`gradeDifficultyBounds key "${key}" is not a canonical grade.`);
          continue;
        }
        const b = gdb[key] || {};
        const bMin = b.min;
        const bMax = b.max;
        if (!Number.isInteger(bMin) || bMin < DIFFICULTY_FLOOR || bMin > DIFFICULTY_CEILING) {
          errors.push(`gradeDifficultyBounds["${key}"].min must be an integer in [${DIFFICULTY_FLOOR}, ${DIFFICULTY_CEILING}].`);
        }
        if (!Number.isInteger(bMax) || bMax < DIFFICULTY_FLOOR || bMax > DIFFICULTY_CEILING) {
          errors.push(`gradeDifficultyBounds["${key}"].max must be an integer in [${DIFFICULTY_FLOOR}, ${DIFFICULTY_CEILING}].`);
        }
        if (Number.isInteger(bMin) && Number.isInteger(bMax) && bMin > bMax) {
          errors.push(`gradeDifficultyBounds["${key}"].min must be <= .max.`);
        }
        if (b.default !== undefined) {
          if (!Number.isInteger(b.default) || b.default < DIFFICULTY_FLOOR || b.default > DIFFICULTY_CEILING) {
            errors.push(`gradeDifficultyBounds["${key}"].default must be an integer in [${DIFFICULTY_FLOOR}, ${DIFFICULTY_CEILING}] when provided.`);
          } else if (Number.isInteger(bMin) && Number.isInteger(bMax) && (b.default < bMin || b.default > bMax)) {
            errors.push(`gradeDifficultyBounds["${key}"].default must lie within [min, max].`);
          }
        }
      }
    }
  }

  if (objective.prerequisites !== undefined && !Array.isArray(objective.prerequisites)) {
    errors.push('prerequisites must be an array of objectiveIds.');
  }
  if (objective.materialRequired !== undefined && typeof objective.materialRequired !== 'boolean') {
    errors.push('materialRequired must be a boolean when provided.');
  }
  if (objective.representations !== undefined) {
    if (!Array.isArray(objective.representations) || objective.representations.length === 0) {
      errors.push('representations must be a non-empty array when provided.');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Canonical objective builder with deterministic defaults. Difficulty bounds
 * default to the full scale; the caller narrows them. `representations` is
 * OPTIONAL ("where appropriate"): omitted when not supplied, so the
 * validator's non-empty-when-provided rule stays meaningful.
 * @param {object} input
 * @returns {object} canonical LearningObjective
 */
export function buildLearningObjective(input) {
  const representations = asStringArray(input?.representations, 10);
  return {
    objectiveId: String(input?.objectiveId || '').trim(),
    curriculumId: String(input?.curriculumId || '').trim(),
    grade: String(input?.grade || '').trim(),
    subject: String(input?.subject || '').trim(),
    skillCategory: String(input?.skillCategory || '').trim(),
    description: String(input?.description || '').trim(),
    prerequisites: asStringArray(input?.prerequisites, 20),
    materialRequired: input?.materialRequired === true,
    minDifficulty: Number.isInteger(input?.minDifficulty) ? input.minDifficulty : DIFFICULTY_FLOOR,
    maxDifficulty: Number.isInteger(input?.maxDifficulty) ? input.maxDifficulty : DIFFICULTY_CEILING,
    representations: representations.length > 0 ? representations : undefined,
    defaultDifficulty: Number.isInteger(input?.defaultDifficulty) ? input.defaultDifficulty : undefined,
    gradeDifficultyBounds:
      input?.gradeDifficultyBounds && typeof input.gradeDifficultyBounds === 'object' && !Array.isArray(input.gradeDifficultyBounds)
        ? { ...input.gradeDifficultyBounds }
        : undefined
  };
}

/* ───────────────────────── school material validation ───────────────────────── */

/**
 * Validate a SchoolMaterial record (§ task 3 model).
 * @param {object} material
 * @param {{ knownObjectiveIds?: string[], knownCurriculumIds?: string[] }} [context]
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateSchoolMaterial(material, context = {}) {
  const errors = [];
  if (!material || typeof material !== 'object') {
    return { isValid: false, errors: ['SchoolMaterial is required.'] };
  }
  if (!isNonEmptyString(material.materialId, 80)) {
    errors.push('materialId is required (max 80 chars).');
  }
  if (!isNonEmptyString(material.title, 160)) {
    errors.push('title is required (max 160 chars).');
  }
  if (!VALID_MATERIAL_TYPES.includes(material.type)) {
    errors.push(`type must be one of: ${VALID_MATERIAL_TYPES.join(', ')}.`);
  }
  if (!isNonEmptyString(material.curriculumId, 80)) {
    errors.push('curriculumId is required.');
  } else if (Array.isArray(context.knownCurriculumIds) && context.knownCurriculumIds.length > 0
    && !context.knownCurriculumIds.includes(material.curriculumId)) {
    errors.push(`curriculumId "${material.curriculumId}" is not a registered curriculum.`);
  }
  if (!isNonEmptyString(material.grade, 40)) {
    errors.push('grade (curriculum gradeId) is required.');
  }
  if (!isNonEmptyString(material.subject, 60)) {
    errors.push('subject is required.');
  }

  const source = material.source;
  if (!source || typeof source !== 'object') {
    errors.push('source metadata is required.');
  } else {
    if (!isNonEmptyString(source.reference, 200)) {
      errors.push('source.reference is required (file name, chapter ref, URL-free citation, max 200 chars).');
    }
    if (source.pageRange !== undefined && !isNonEmptyString(source.pageRange, 40)) {
      errors.push('source.pageRange must be a short string when provided.');
    }
  }

  const hasText = typeof material.extractedContent === 'string' && material.extractedContent.trim().length > 0;
  if (!hasText) {
    errors.push('extractedContent must be a non-empty string (school material is the primary learning source).');
  } else if (material.extractedContent.length > MAX_EXTRACTED_CONTENT_CHARS) {
    errors.push(`extractedContent exceeds ${MAX_EXTRACTED_CONTENT_CHARS} chars (split the material instead).`);
  }

  if (!Array.isArray(material.linkedObjectives)) {
    errors.push('linkedObjectives must be an array (possibly empty).');
  } else if (Array.isArray(context.knownObjectiveIds) && context.knownObjectiveIds.length > 0) {
    for (const id of material.linkedObjectives) {
      if (!context.knownObjectiveIds.includes(id)) {
        errors.push(`linkedObjectives contains unknown objective "${id}".`);
      }
    }
  }

  if (!VERIFICATION_STATUSES.includes(material.verificationStatus)) {
    errors.push(`verificationStatus must be one of: ${VERIFICATION_STATUSES.join(', ')}.`);
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Canonical material builder. `materialId` must be provided by the caller
 * (deterministic); id generation stays with the persistence layer.
 * @param {object} input
 * @returns {object} canonical SchoolMaterial
 */
export function buildCanonicalSchoolMaterial(input) {
  return {
    materialId: String(input?.materialId || '').trim(),
    title: String(input?.title || '').trim(),
    type: input?.type,
    curriculumId: String(input?.curriculumId || '').trim(),
    grade: String(input?.grade || '').trim(),
    subject: String(input?.subject || '').trim(),
    source: {
      reference: String(input?.source?.reference || '').trim(),
      pageRange: input?.source?.pageRange ? String(input.source.pageRange).trim() : undefined
    },
    extractedContent: String(input?.extractedContent || ''),
    linkedObjectives: asStringArray(input?.linkedObjectives, 100),
    verificationStatus: input?.verificationStatus || 'unverified',
    addedAt: input?.addedAt || null,
    verifiedAt: input?.verifiedAt || null
  };
}
