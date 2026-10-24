/**
 * Adaptive Learning — Configuration
 *
 * Deterministic constants: skill registry, hard grade difficulty ceilings,
 * threshold defaults, preference deltas, rationale tags, and the
 * representation registry. Nothing here is model-driven; every value is a
 * curated constant used by the pure adaptive engine (§7/§7A/§11 of the plan).
 */

export const GRADES_MAX_DIFFICULTY = Object.freeze({
  Kindergarten: 2,
  '1st Grade': 3,
  '2nd Grade': 3,
  '3rd Grade': 4,
  '4th Grade': 4,
  '5th Grade': 5,
  '6th Grade': 5
});

/**
 * Hard curriculum bound: no objective outside the learner's grade band is
 * ever selected by the ALE.
 */
export const GRADE_OBJECTIVE_RANGE_SKIP = Object.freeze([]);

export const SKILLS = Object.freeze([
  {
    id: 'phoneme_awareness',
    label: 'Sound games',
    baselineCategory: 'phoneme_identification',
    minDifficulty: 1,
    maxDifficulty: 5,
    startingDifficulty: 'auto'
  },
  {
    id: 'letter_sound_correspondence',
    label: 'Letter sounds',
    baselineCategory: 'letter_sound_matching',
    minDifficulty: 1,
    maxDifficulty: 5,
    startingDifficulty: 'auto'
  },
  {
    id: 'decoding',
    label: 'Word building',
    baselineCategory: 'word_decoding',
    minDifficulty: 1,
    maxDifficulty: 5,
    startingDifficulty: 'auto'
  },
  {
    id: 'syllable_awareness',
    label: 'Syllable fun',
    baselineCategory: 'syllable_counting',
    minDifficulty: 1,
    maxDifficulty: 5,
    startingDifficulty: 'auto'
  },
  {
    id: 'rhyme_awareness',
    label: 'Rhyme games',
    baselineCategory: 'rhyme_recognition',
    minDifficulty: 1,
    maxDifficulty: 5,
    startingDifficulty: 'auto'
  },
  {
    id: 'comprehension',
    label: 'Sentence clues',
    baselineCategory: 'sentence_completion',
    minDifficulty: 1,
    maxDifficulty: 5,
    startingDifficulty: 'auto'
  }
]);

export const SKILL_BY_ID = Object.freeze(
  SKILLS.reduce((acc, skill) => {
    acc[skill.id] = skill;
    return acc;
  }, {})
);

/**
 * Default preference-modality units (§11). All weights bounded [0.05, 0.95].
 */
export const PREFERENCE_MODALITIES = Object.freeze([
  'visual',
  'audio',
  'text',
  'manipulation',
  'example',
  'repetition',
  'guided_assistance'
]);

export const PREFERENCE_DEFAULTS = Object.freeze({
  initWeight: 0.5,
  successDelta: 0.08,
  failDelta: -0.03,
  firstTryWithModalDelta: 0.02,
  recencyDecay: 0.995,
  minWeight: 0.05,
  maxWeight: 0.95
});

export const AUDIO_PREFERENCE_DELTAS = Object.freeze({
  correctAfterReplay: 0.04,
  correctAfterFirstListen: 0.02,
  textAndAudioUsed: { audio: 0.01, text: 0.01 },
  helpAfterAudio: 0
});

export const ALE_THRESHOLDS = Object.freeze({
  masteryThreshold: 0.7,
  reviewStrengthThreshold: 0.4,
  reviewStrongBreakThreshold: 0.65,
  consolidationCap: 3,
  audioOnlyCapPerSession: 2,
  maxDifficultyIncrement: 1,
  maxDifficultyDecrement: 1,
  practiceCountBeforeReview: 3,
  breakAfterStreakCorrect: 15,
  breakAfterActivities: 20,
  supportScaffoldAfterWrong: 2,
  supportGuidedAfterWrong: 4,
  // Observable-behavior guards (§11A). Thresholds react only to things the
  // learner DID in the current activity — response time, help opened, audio
  // replayed. They never imply or store a diagnosis, severity, or trait.
  behaviorWindowSize: 8,
  // A response time in the slowest coarse band escalates support sooner. The
  // decision reads the BAND (see summarizeBehavior) rather than the raw
  // milliseconds so the ALE and the local-AI prompt use the same coarse,
  // privacy-safe signal; this value is the band edge it escalates on.
  slowResponseMs: 60000,
  // Two or more help opens across the rolling window escalate support.
  behaviorHelpCountForScaffold: 2,
  // Repeated timeouts across the rolling window escalate to guided support.
  behaviorTimeoutCountForGuided: 2
});

/**
 * Representation registry (§7A). Phase 6 implementation column marks which
 * representations are concretely offered by the implemented activity types.
 */
export const REPRESENTATIONS = Object.freeze({
  text: { id: 'text', implemented: true },
  audio: { id: 'audio', implemented: true },
  visual: { id: 'visual', implemented: true },
  manipulation: { id: 'manipulation', implemented: true },
  realLifeExample: { id: 'real_life_example', implemented: false },
  guided: { id: 'guided', implemented: false },
  sentenceCompletion: { id: 'sentence_completion', implemented: true }
});

export const MAX_AUDIO_ONLY_ACTIVITIES = ALE_THRESHOLDS.audioOnlyCapPerSession;

export const GRADE_CEILING = (grade) => {
  const ceiling = GRADES_MAX_DIFFICULTY[grade];
  return ceiling ?? 2;
};

/**
 * Deterministic rationale tags used by the ALE (§7). Each decision records the
 * tags that fired so the reasoning is inspectable and testable.
 */
export const RATIONALE_TAGS = Object.freeze({
  OBJECTIVE_SELECTED: 'objective_selected',
  REPRESENTATION_SELECTED: 'representation_selected',
  REPRESENTATION_TEXT_AUDIO: 'representation_text_audio',
  DIFFICULTY_CLAMPED_GRADE: 'difficulty_clamped_to_grade',
  DIFFICULTY_CLAMPED_SKILL: 'difficulty_clamped_to_skill',
  SUGGEST_REVIEW: 'suggest_review',
  SUGGEST_CONSOLIDATE: 'suggest_consolidate',
  SUGGEST_BREAK_STREAK: 'suggest_break_streak',
  SUGGEST_BREAK_SESSION: 'suggest_break_session',
  AUDIO_CAP_REACHED: 'audio_only_cap_reached',
  MATERIAL_REQUIRED_UNAVAILABLE: 'material_required_unavailable',
  GRADE_MISMATCH_REJECTED: 'grade_mismatch_rejected',
  // Grade-aware difficulty (bounded, deterministic, fail-closed).
  DIFFICULTY_CLAMPED_OBJECTIVE_BOUNDS: 'difficulty_clamped_to_objective_bounds',
  GRADE_DIFFICULTY_UNRESOLVED: 'grade_difficulty_unresolved'
});