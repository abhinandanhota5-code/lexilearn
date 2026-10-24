/**
 * Objective Registry — curated learning objectives
 *
 * Deterministic metadata driving both the ALE (grade/skill selection) and the
 * §8A ContentValidator alignment gates (ALIGN-1..4). Nothing here is
 * model-generated; objectives are reviewed, bounded, and testable.
 */

/**
 * Curated objectives. `targetSkills` empty means the objective maps to an
 * objectives-only activity sequence (ALE still needs an activity type).
 */
export const OBJECTIVES = Object.freeze([
  // ── Reading / decoding foundation (Phase 4 baseline categories) ──
  {
    id: 'initial_sound_identification',
    subject: 'Reading',
    label: 'Find the first sound',
    learningStatement: 'The learner can identify the first sound of a spoken word.',
    gradeRange: ['Kindergarten', '1st Grade', '2nd Grade'],
    targetSkills: ['phoneme_awareness'],
    coreTerms: ['first', 'sound', 'start', 'word'],
    contextTerms: ['listen', 'hear', 'says'],
    excludedConcepts: [],
    defaultRepresentation: 'audio',
    preferredActivityTypes: ['sound_detect'],
    materialRequired: false
  },
  {
    id: 'letter_sound_matching',
    subject: 'Reading',
    label: 'Match letter to sound',
    learningStatement: 'The learner can match a letter to its most common sound.',
    gradeRange: ['Kindergarten', '1st Grade', '2nd Grade'],
    targetSkills: ['letter_sound_correspondence'],
    coreTerms: ['letter', 'sound', 'match', 'says'],
    contextTerms: ['choose', 'name', 'alphabet'],
    excludedConcepts: [],
    defaultRepresentation: 'visual',
    preferredActivityTypes: ['sound_detect'],
    materialRequired: false
  },
  {
    id: 'decode_cvc_words',
    subject: 'Reading',
    label: 'Build simple words',
    learningStatement: 'The learner can decode and build consonant-vowel-consonant words.',
    gradeRange: ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade'],
    targetSkills: ['decoding'],
    coreTerms: ['word', 'letter', 'build', 'sound'],
    contextTerms: ['first', 'last', 'middle'],
    excludedConcepts: [],
    defaultRepresentation: 'manipulation',
    preferredActivityTypes: ['word_build'],
    materialRequired: false
  },
  {
    id: 'syllable_counting_1',
    subject: 'Reading',
    label: 'Count the syllables',
    learningStatement: 'The learner can count the number of syllables in a spoken word.',
    gradeRange: ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade'],
    targetSkills: ['syllable_awareness'],
    coreTerms: ['syllable', 'count', 'clap', 'word'],
    contextTerms: ['part', 'listen', 'say'],
    excludedConcepts: [],
    defaultRepresentation: 'audio',
    preferredActivityTypes: ['syllable_split'],
    materialRequired: false
  },
  {
    id: 'rhyme_recognition_set',
    subject: 'Reading',
    label: 'Which words rhyme?',
    learningStatement: 'The learner can identify words that rhyme with a target word.',
    gradeRange: ['Kindergarten', '1st Grade', '2nd Grade'],
    targetSkills: ['rhyme_awareness'],
    coreTerms: ['rhyme', 'sound', 'word', 'same'],
    contextTerms: ['end', 'listen', 'pick'],
    excludedConcepts: [],
    defaultRepresentation: 'audio',
    preferredActivityTypes: ['sentence_mc'],
    materialRequired: false
  },
  {
    id: 'sentence_completion_basic',
    subject: 'Reading',
    label: 'Finish the sentence',
    learningStatement: 'The learner can choose a word that completes a simple sentence.',
    gradeRange: ['1st Grade', '2nd Grade', '3rd Grade', '4th Grade'],
    targetSkills: ['comprehension'],
    coreTerms: ['sentence', 'word', 'finish', 'clue'],
    contextTerms: ['read', 'choose', 'meaning'],
    excludedConcepts: [],
    defaultRepresentation: 'sentence_completion',
    preferredActivityTypes: ['sentence_mc'],
    materialRequired: false
  },

  // ── Math (e2e fixture: Grade 1 audio-assisted addition) ──
  {
    id: 'add_single_digits',
    subject: 'Math',
    label: 'Add numbers up to ten',
    learningStatement: 'The learner can find the sum of two single-digit numbers up to ten.',
    gradeRange: ['Kindergarten', '1st Grade', '2nd Grade'],
    targetSkills: [],
    coreTerms: ['add', 'plus', 'sum', 'total'],
    contextTerms: ['three', 'five', 'eight', 'equals', 'make'],
    excludedConcepts: [],
    defaultRepresentation: 'audio',
    preferredActivityTypes: ['sentence_mc'],
    materialRequired: false
  },

  // ── Science (e2e fixture: Grade 4 water cycle sentence completion) ──
  {
    id: 'water_cycle_evaporation',
    subject: 'Science',
    label: 'Water changes into water vapour',
    learningStatement: 'The learner can identify the term for water changing into water vapour.',
    gradeRange: ['3rd Grade', '4th Grade', '5th Grade'],
    targetSkills: ['comprehension'],
    coreTerms: ['water', 'vapour', 'evaporation'],
    contextTerms: ['change', 'heat', 'sun', 'process'],
    excludedConcepts: [],
    defaultRepresentation: 'sentence_completion',
    preferredActivityTypes: ['sentence_mc'],
    materialRequired: false
  },

  // ── Extended comprehension/science vocabulary (Phase 6 curriculum) ──
  {
    id: 'plant_parts',
    subject: 'Science',
    label: 'Parts of a plant',
    learningStatement: 'The learner can name the main parts of a plant.',
    gradeRange: ['1st Grade', '2nd Grade', '3rd Grade'],
    targetSkills: ['comprehension'],
    coreTerms: ['root', 'stem', 'leaf', 'plant'],
    contextTerms: ['grows', 'flower', 'soil'],
    excludedConcepts: [],
    defaultRepresentation: 'visual',
    preferredActivityTypes: ['sentence_mc'],
    materialRequired: false
  },
  {
    id: 'animals_and_habitats',
    subject: 'Science',
    label: 'Where animals live',
    learningStatement: 'The learner can match an animal to the habitat where it lives.',
    gradeRange: ['Kindergarten', '1st Grade', '2nd Grade'],
    targetSkills: [],
    coreTerms: ['animal', 'lives', 'home', 'habitat'],
    contextTerms: ['water', 'forest', 'ocean', 'farm'],
    excludedConcepts: [],
    defaultRepresentation: 'sentence_completion',
    preferredActivityTypes: ['sentence_mc'],
    materialRequired: false
  },
  {
    id: 'time_words',
    subject: 'Math',
    label: 'Order of the day',
    learningStatement: 'The learner can order morning, afternoon, and night activities.',
    gradeRange: ['Kindergarten', '1st Grade'],
    targetSkills: [],
    coreTerms: ['morning', 'afternoon', 'night', 'day'],
    contextTerms: ['before', 'after', 'first'],
    excludedConcepts: [],
    defaultRepresentation: 'visual',
    preferredActivityTypes: ['sentence_mc'],
    materialRequired: false
  },
  {
    id: 'shapes_two_dimensional',
    subject: 'Math',
    label: 'Square, circle, triangle',
    learningStatement: 'The learner can name common two-dimensional shapes.',
    gradeRange: ['Kindergarten', '1st Grade', '2nd Grade'],
    targetSkills: [],
    coreTerms: ['square', 'circle', 'triangle', 'shape'],
    contextTerms: ['sides', 'corners', 'flat'],
    excludedConcepts: [],
    defaultRepresentation: 'visual',
    preferredActivityTypes: ['sentence_mc'],
    materialRequired: false
  }
]);

export const OBJECTIVE_BY_ID = Object.freeze(
  OBJECTIVES.reduce((acc, objective) => {
    acc[objective.id] = objective;
    return acc;
  }, {})
);

/**
 * Deterministic objective lookup for a learner's grade band.
 * @param {string} grade
 * @returns {string[]} eligible objective IDs (ordered by registry order)
 */
export function objectivesForGrade(grade) {
  return OBJECTIVES.filter((o) => o.gradeRange.includes(grade)).map((o) => o.id);
}

/**
 * Whether the given low-level ALE objective id is eligible for a grade.
 */
export function isObjectiveEligibleForGrade(objectiveId, grade) {
  const objective = OBJECTIVE_BY_ID[objectiveId];
  if (!objective) return false;
  return objective.gradeRange.includes(grade);
}