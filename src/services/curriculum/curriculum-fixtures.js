/**
 * Curriculum Fixtures — small deterministic dataset for testing.
 *
 * NOT real-world syllabi: each curriculum carries a handful of illustrative
 * objectives only, enough to exercise multi-board separation, canonical grade
 * mapping, subjects, prerequisites, difficulty bounds, and grounding tests.
 * All records pass `validateCurriculum`/`validateLearningObjective`.
 *
 * Two fixture sets:
 *   - `buildAllFixtureCurricula()` / `registerFixtures()` — the ORIGINAL
 *     3-board set (cbse, cambridge, us_common_core) used by the foundation
 *     test suite (90/90). NOT changed.
 *   - `buildAllAvailableCurricula()` / `registerAvailableCurricula()` — the
 *     parent-facing catalog: ALL six SUPPORTED_BOARDS represented (adds
 *     icse_cisce, ib_pyp, uk_national_curriculum) so the parent flow can offer
 *     every supported system while the original fixture set stays frozen.
 */

import { buildCanonicalCurriculum, buildLearningObjective } from './curriculum-schema.js';

/* ───────────────────────── objective templates ───────────────────────── */

function obj(curriculumId, grade, subject, skillCategory, description, extra = {}) {
  return buildLearningObjective({
    curriculumId,
    grade,
    subject,
    skillCategory,
    description,
    ...extra
  });
}

/* ───────────────────────── CBSE ───────────────────────── */

const cbseObjectives = [
  obj('cbse_elementary_v1', 'class_3', 'Science', 'comprehension',
    'Identify evaporation as the process by which liquid water becomes water vapour.',
    { prerequisites: [], minDifficulty: 2, maxDifficulty: 4, representations: ['sentence_completion', 'multiple_choice'], materialRequired: false }),
  obj('cbse_elementary_v1', 'class_3', 'Science', 'comprehension',
    'Name the three states of water and one everyday example of each.',
    { prerequisites: ['cbse_sc_3_evaporation'], minDifficulty: 1, maxDifficulty: 3, representations: ['sentence_completion'], materialRequired: false }),
  obj('cbse_elementary_v1', 'class_4', 'Mathematics', 'decoding',
    'Add and subtract two-digit numbers with regrouping.',
    { prerequisites: [], minDifficulty: 2, maxDifficulty: 5, representations: ['multiple_choice'], materialRequired: false })
];

/**
 * CBSE grade/year map: the board's FULL supported range, Classes 1–12.
 * The registry exposes the whole range to the parent selector; only the
 * grades listed in `cbseObjectives` carry objective fixtures yet. A grade
 * with an empty objective/material fixture set is still a valid curriculum
 * grade (selector + validation accept it) — do NOT invent objectives here.
 */
const CBSE_GRADE_LEVELS = [
  { gradeId: 'class_1', label: 'Class 1', canonicalGrade: '1st Grade' },
  { gradeId: 'class_2', label: 'Class 2', canonicalGrade: '2nd Grade' },
  { gradeId: 'class_3', label: 'Class 3', canonicalGrade: '3rd Grade' },
  { gradeId: 'class_4', label: 'Class 4', canonicalGrade: '4th Grade' },
  { gradeId: 'class_5', label: 'Class 5', canonicalGrade: '5th Grade' },
  { gradeId: 'class_6', label: 'Class 6', canonicalGrade: '6th Grade' },
  { gradeId: 'class_7', label: 'Class 7', canonicalGrade: '7th Grade' },
  { gradeId: 'class_8', label: 'Class 8', canonicalGrade: '8th Grade' },
  { gradeId: 'class_9', label: 'Class 9', canonicalGrade: '9th Grade' },
  { gradeId: 'class_10', label: 'Class 10', canonicalGrade: '10th Grade' },
  { gradeId: 'class_11', label: 'Class 11', canonicalGrade: '11th Grade' },
  { gradeId: 'class_12', label: 'Class 12', canonicalGrade: '12th Grade' }
].map((g) => Object.freeze({ ...g }));

export function buildCbseCurriculum() {
  return buildCanonicalCurriculum({
    curriculumId: 'cbse_elementary_v1',
    board: 'cbse',
    name: 'CBSE Elementary Fixture',
    syllabusVersion: 'fixture-2026',
    gradeLevels: CBSE_GRADE_LEVELS.map((g) => ({ ...g })),
    subjects: ['Science', 'Mathematics'],
    learningObjectives: [
      cbseObjectives[0], // id: cbse_sc_3_evaporation
      cbseObjectives[1], // id: cbse_sc_3_states_of_water
      cbseObjectives[2]  // id: cbse_math_4_two_digit
    ].map((o, i) => ({
      ...o,
      objectiveId: ['cbse_sc_3_evaporation', 'cbse_sc_3_states_of_water', 'cbse_math_4_two_digit'][i]
    }))
  });
}

/* ───────────────────────── Cambridge IGCSE (lower years) ───────────────────────── */

export function buildCambridgeCurriculum() {
  return buildCanonicalCurriculum({
    curriculumId: 'cambridge_primary_v1',
    board: 'cambridge_igcse',
    name: 'Cambridge Primary Fixture',
    syllabusVersion: 'fixture-2026',
    gradeLevels: [
      { gradeId: 'stage_3', label: 'Stage 3', canonicalGrade: '3rd Grade' },
      { gradeId: 'stage_4', label: 'Stage 4', canonicalGrade: '4th Grade' }
    ],
    subjects: ['Science', 'Mathematics'],
    learningObjectives: [
      {
        ...obj('cambridge_primary_v1', 'stage_3', 'Science', 'comprehension',
          'Describe the water cycle using the terms evaporation and condensation.',
          { prerequisites: [], minDifficulty: 2, maxDifficulty: 4, representations: ['sentence_completion'] }),
        objectiveId: 'cam_sc_3_water_cycle'
      },
      {
        ...obj('cambridge_primary_v1', 'stage_4', 'Mathematics', 'decoding',
          'Compare and order simple fractions.',
        { prerequisites: [], minDifficulty: 3, maxDifficulty: 5, representations: ['multiple_choice'] }),
        objectiveId: 'cam_math_4_fractions'
      }
    ]
  });
}

/* ───────────────────────── US / Common Core ───────────────────────── */

export function buildUsCommonCoreCurriculum() {
  return buildCanonicalCurriculum({
    curriculumId: 'us_cc_elementary_v1',
    board: 'us_common_core',
    name: 'US Common Core Elementary Fixture',
    syllabusVersion: 'fixture-2026',
    gradeLevels: [
      { gradeId: 'us_grade_3', label: 'Grade 3', canonicalGrade: '3rd Grade' },
      { gradeId: 'us_grade_4', label: 'Grade 4', canonicalGrade: '4th Grade' }
    ],
    subjects: ['Science', 'Mathematics'],
    learningObjectives: [
      {
        ...obj('us_cc_elementary_v1', 'us_grade_3', 'Science', 'comprehension',
          'Explain how heating and cooling changes the state of water.',
        { prerequisites: [], minDifficulty: 1, maxDifficulty: 3, representations: ['sentence_completion'], materialRequired: true }),
        objectiveId: 'us_sc_3_states_change'
      },
      {
        ...obj('us_cc_elementary_v1', 'us_grade_4', 'Mathematics', 'decoding',
          'Multiply a whole number of up to four digits by a one-digit number.',
        { prerequisites: [], minDifficulty: 3, maxDifficulty: 5, representations: ['multiple_choice'] }),
        objectiveId: 'us_math_4_multiplication'
      }
    ]
  });
}

/* ───────────────────────── convenience bundle ───────────────────────── */

/**
 * Build ALL fixture curricula in deterministic order.
 * @returns {object[]}
 */
export function buildAllFixtureCurricula() {
  return [buildCbseCurriculum(), buildCambridgeCurriculum(), buildUsCommonCoreCurriculum()];
}

/**
 * Register all fixtures into a registry.
 * @param {import('./curriculum-registry.js').CurriculumRegistry} registry
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function registerFixtures(registry) {
  for (const curriculum of buildAllFixtureCurricula()) {
    const result = registry.registerCurriculum(curriculum);
    if (!result.ok) return result;
  }
  return { ok: true, errors: [] };
}

/* ───────────────────────── additional boards (parent catalog) ───────────────────────── */

/* ───────────────────────── ICSE / CISCE ───────────────────────── */

export function buildIcseCurriculum() {
  return buildCanonicalCurriculum({
    curriculumId: 'icse_elementary_v1',
    board: 'icse_cisce',
    name: 'ICSE/CISCE Elementary Fixture',
    syllabusVersion: 'fixture-2026',
    gradeLevels: [
      { gradeId: 'class_3', label: 'Class 3', canonicalGrade: '3rd Grade' },
      { gradeId: 'class_4', label: 'Class 4', canonicalGrade: '4th Grade' }
    ],
    subjects: ['Science', 'Mathematics'],
    learningObjectives: [
      {
        ...obj('icse_elementary_v1', 'class_3', 'Science', 'comprehension',
          'Recognise that water exists in solid, liquid and gaseous forms.',
          { prerequisites: [], minDifficulty: 1, maxDifficulty: 3, representations: ['multiple_choice'] }),
        objectiveId: 'icse_sc_3_water_forms'
      },
      {
        ...obj('icse_elementary_v1', 'class_4', 'Mathematics', 'decoding',
          'Add and subtract amounts of money using rupees and paise.',
          { prerequisites: [], minDifficulty: 2, maxDifficulty: 4, representations: ['multiple_choice'] }),
        objectiveId: 'icse_math_4_money'
      }
    ]
  });
}

/* ───────────────────────── IB PYP ───────────────────────── */

export function buildIbCurriculum() {
  return buildCanonicalCurriculum({
    curriculumId: 'ib_pyp_elementary_v1',
    board: 'ib_pyp',
    name: 'IB Primary Years Programme Fixture',
    syllabusVersion: 'fixture-2026',
    gradeLevels: [
      { gradeId: 'pyp_grade_3', label: 'Grade 3', canonicalGrade: '3rd Grade' },
      { gradeId: 'pyp_grade_4', label: 'Grade 4', canonicalGrade: '4th Grade' }
    ],
    subjects: ['Science', 'Mathematics'],
    learningObjectives: [
      {
        ...obj('ib_pyp_elementary_v1', 'pyp_grade_3', 'Science', 'comprehension',
          'Identify how the states of matter change when materials are heated or cooled.',
          { prerequisites: [], minDifficulty: 1, maxDifficulty: 3, representations: ['sentence_completion', 'multiple_choice'] }),
        objectiveId: 'ib_sc_3_matter_change'
      },
      {
        ...obj('ib_pyp_elementary_v1', 'pyp_grade_4', 'Mathematics', 'decoding',
          'Read and write fractions as parts of a whole set.',
          { prerequisites: [], minDifficulty: 2, maxDifficulty: 4, representations: ['multiple_choice'] }),
        objectiveId: 'ib_math_4_fractions'
      }
    ]
  });
}

/* ───────────────────────── UK National Curriculum ───────────────────────── */

export function buildUkCurriculum() {
  return buildCanonicalCurriculum({
    curriculumId: 'uk_primary_v1',
    board: 'uk_national_curriculum',
    name: 'UK National Curriculum Primary Fixture',
    syllabusVersion: 'fixture-2026',
    gradeLevels: [
      { gradeId: 'year_3', label: 'Year 3', canonicalGrade: '3rd Grade' },
      { gradeId: 'year_4', label: 'Year 4', canonicalGrade: '4th Grade' }
    ],
    subjects: ['Science', 'Mathematics'],
    learningObjectives: [
      {
        ...obj('uk_primary_v1', 'year_3', 'Science', 'comprehension',
          'Describe in simple terms how evaporation and condensation occur in the water cycle.',
          { prerequisites: [], minDifficulty: 1, maxDifficulty: 3, representations: ['sentence_completion'] }),
        objectiveId: 'uk_sc_3_water_cycle'
      },
      {
        ...obj('uk_primary_v1', 'year_4', 'Mathematics', 'decoding',
          'Recall multiplication facts for the 6 and 9 times tables.',
          { prerequisites: [], minDifficulty: 2, maxDifficulty: 5, representations: ['multiple_choice'] }),
        objectiveId: 'uk_math_4_times_tables'
      }
    ]
  });
}

/**
 * Build ALL available curricula for the parent-facing catalog (all six
 * SUPPORTED_BOARDS). Deterministic order.
 * @returns {object[]}
 */
export function buildAllAvailableCurricula() {
  return [
    ...buildAllFixtureCurricula(),
    buildIcseCurriculum(),
    buildIbCurriculum(),
    buildUkCurriculum()
  ];
}

/**
 * Register the full parent-facing catalog INTO a registry (all 6 boards).
 * @param {import('./curriculum-registry.js').CurriculumRegistry} registry
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function registerAvailableCurricula(registry) {
  for (const curriculum of buildAllAvailableCurricula()) {
    const result = registry.registerCurriculum(curriculum);
    if (!result.ok) return result;
  }
  return { ok: true, errors: [] };
}

/** Fixture material content (water cycle — matches cbse_sc_3_evaporation). */
export const WATER_CYCLE_EXCERPT =
  'When water is heated by the sun, it changes into water vapour. ' +
  'This process is called evaporation. Water vapour rises into the air.';

/** Fixture material content (two-digit addition — matches cbse_math_4_two_digit). */
export const TWO_DIGIT_ADDITION_EXCERPT =
  'To add 47 and 25, first add the ones: 7 plus 5 is 12. Write 2 and carry 1. ' +
  'Then add the tens: 4 plus 2 plus 1 is 7. The sum is 72.';
