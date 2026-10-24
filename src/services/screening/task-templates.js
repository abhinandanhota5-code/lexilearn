/**
 * Screening Task Templates Registry.
 * Organized by category and difficulty tier for age/grade-appropriate selection.
 *
 * Categories:
 *   phoneme_identification — Beginning/ending sound awareness
 *   letter_sound_matching  — Letter-to-sound correspondence
 *   word_decoding           — Real vs. nonsense word recognition
 *   syllable_counting      — Syllable segmentation
 *   rhyme_recognition      — Rhyming pair identification
 *   sentence_completion    — Contextual word insertion
 *
 * Difficulty: 1 (easiest) to 5 (hardest)
 * Each task is multiple-choice with 4 options.
 */

export const CATEGORIES = [
  'phoneme_identification',
  'letter_sound_matching',
  'word_decoding',
  'syllable_counting',
  'rhyme_recognition',
  'sentence_completion'
];

export const MAX_DIFFICULTY = 5;
export const DEFAULT_TASKS_PER_QUEST = 15;
export const TIME_LIMIT_MS = 30000;

/**
 * All screening task templates.
 */
export const TASK_TEMPLATES = [

  // ─── PHONEME IDENTIFICATION ───────────────────────────────────────

  // Difficulty 1
  {
    id: 'phon_id_1a',
    category: 'phoneme_identification',
    difficulty: 1,
    gradeRange: ['Kindergarten', '1st Grade'],
    prompt: 'What sound does "sun" start with?',
    type: 'multiple_choice',
    options: ['/s/', '/m/', '/t/', '/b/'],
    correctAnswer: '/s/',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'phon_id_1b',
    category: 'phoneme_identification',
    difficulty: 1,
    gradeRange: ['Kindergarten', '1st Grade'],
    prompt: 'What sound does "mat" start with?',
    type: 'multiple_choice',
    options: ['/p/', '/m/', '/k/', '/d/'],
    correctAnswer: '/m/',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'phon_id_1c',
    category: 'phoneme_identification',
    difficulty: 1,
    gradeRange: ['Kindergarten', '1st Grade'],
    prompt: 'What sound does "top" start with?',
    type: 'multiple_choice',
    options: ['/s/', '/n/', '/t/', '/g/'],
    correctAnswer: '/t/',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 2
  {
    id: 'phon_id_2a',
    category: 'phoneme_identification',
    difficulty: 2,
    gradeRange: ['Kindergarten', '1st Grade', '2nd Grade'],
    prompt: 'What sound does "fish" end with?',
    type: 'multiple_choice',
    options: ['/sh/', '/ch/', '/th/', '/ck/'],
    correctAnswer: '/sh/',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'phon_id_2b',
    category: 'phoneme_identification',
    difficulty: 2,
    gradeRange: ['Kindergarten', '1st Grade', '2nd Grade'],
    prompt: 'What sound does "duck" start with?',
    type: 'multiple_choice',
    options: ['/b/', '/d/', '/t/', '/g/'],
    correctAnswer: '/d/',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 3
  {
    id: 'phon_id_3a',
    category: 'phoneme_identification',
    difficulty: 3,
    gradeRange: ['1st Grade', '2nd Grade', '3rd Grade'],
    prompt: 'What sound does "think" start with?',
    type: 'multiple_choice',
    options: ['/s/', '/f/', '/th/', '/sh/'],
    correctAnswer: '/th/',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'phon_id_3b',
    category: 'phoneme_identification',
    difficulty: 3,
    gradeRange: ['1st Grade', '2nd Grade', '3rd Grade'],
    prompt: 'What sound does "chat" start with?',
    type: 'multiple_choice',
    options: ['/sh/', '/ch/', '/th/', '/wh/'],
    correctAnswer: '/ch/',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 4
  {
    id: 'phon_id_4a',
    category: 'phoneme_identification',
    difficulty: 4,
    gradeRange: ['2nd Grade', '3rd Grade', '4th Grade'],
    prompt: 'What sound does "bridge" end with?',
    type: 'multiple_choice',
    options: ['/j/', '/ch/', '/dge/', '/g/'],
    correctAnswer: '/j/',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'phon_id_4b',
    category: 'phoneme_identification',
    difficulty: 4,
    gradeRange: ['2nd Grade', '3rd Grade', '4th Grade'],
    prompt: 'What sound does "phone" start with?',
    type: 'multiple_choice',
    options: ['/f/', '/p/', '/ph/', '/h/'],
    correctAnswer: '/f/',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 5
  {
    id: 'phon_id_5a',
    category: 'phoneme_identification',
    difficulty: 5,
    gradeRange: ['3rd Grade', '4th Grade', '5th Grade', '6th Grade'],
    prompt: 'What sound does "knight" start with?',
    type: 'multiple_choice',
    options: ['/k/', '/n/', '/kn/', '/m/'],
    correctAnswer: '/n/',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'phon_id_5b',
    category: 'phoneme_identification',
    difficulty: 5,
    gradeRange: ['3rd Grade', '4th Grade', '5th Grade', '6th Grade'],
    prompt: 'What sound does "wrench" end with?',
    type: 'multiple_choice',
    options: ['/ch/', '/sh/', '/nch/', '/tch/'],
    correctAnswer: '/ch/',
    timeLimitMs: TIME_LIMIT_MS
  },

  // ─── LETTER-SOUND MATCHING ────────────────────────────────────────

  // Difficulty 1
  {
    id: 'lsm_1a',
    category: 'letter_sound_matching',
    difficulty: 1,
    gradeRange: ['Kindergarten', '1st Grade'],
    prompt: 'Which letter makes the /s/ sound?',
    type: 'multiple_choice',
    options: ['s', 'f', 't', 'm'],
    correctAnswer: 's',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'lsm_1b',
    category: 'letter_sound_matching',
    difficulty: 1,
    gradeRange: ['Kindergarten', '1st Grade'],
    prompt: 'Which letter makes the /m/ sound?',
    type: 'multiple_choice',
    options: ['n', 'b', 'm', 'p'],
    correctAnswer: 'm',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'lsm_1c',
    category: 'letter_sound_matching',
    difficulty: 1,
    gradeRange: ['Kindergarten', '1st Grade'],
    prompt: 'Which letter makes the /t/ sound?',
    type: 'multiple_choice',
    options: ['d', 't', 'b', 'l'],
    correctAnswer: 't',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 2
  {
    id: 'lsm_2a',
    category: 'letter_sound_matching',
    difficulty: 2,
    gradeRange: ['Kindergarten', '1st Grade', '2nd Grade'],
    prompt: 'Which letter makes the /b/ sound?',
    type: 'multiple_choice',
    options: ['d', 'p', 'b', 'q'],
    correctAnswer: 'b',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'lsm_2b',
    category: 'letter_sound_matching',
    difficulty: 2,
    gradeRange: ['Kindergarten', '1st Grade', '2nd Grade'],
    prompt: 'Which letter makes the /k/ sound at the start of "cat"?',
    type: 'multiple_choice',
    options: ['c', 's', 'k', 'q'],
    correctAnswer: 'c',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 3
  {
    id: 'lsm_3a',
    category: 'letter_sound_matching',
    difficulty: 3,
    gradeRange: ['1st Grade', '2nd Grade', '3rd Grade'],
    prompt: 'Which two letters together make the /sh/ sound?',
    type: 'multiple_choice',
    options: ['sh', 'ch', 'th', 'wh'],
    correctAnswer: 'sh',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'lsm_3b',
    category: 'letter_sound_matching',
    difficulty: 3,
    gradeRange: ['1st Grade', '2nd Grade', '3rd Grade'],
    prompt: 'Which two letters together make the /ch/ sound?',
    type: 'multiple_choice',
    options: ['sh', 'th', 'ch', 'ph'],
    correctAnswer: 'ch',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 4
  {
    id: 'lsm_4a',
    category: 'letter_sound_matching',
    difficulty: 4,
    gradeRange: ['2nd Grade', '3rd Grade', '4th Grade'],
    prompt: 'Which letter combination makes the /ight/ sound in "light"?',
    type: 'multiple_choice',
    options: ['ight', 'eet', 'ite', 'eat'],
    correctAnswer: 'ight',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'lsm_4b',
    category: 'letter_sound_matching',
    difficulty: 4,
    gradeRange: ['2nd Grade', '3rd Grade', '4th Grade'],
    prompt: 'Which letters make the /oa/ sound in "boat"?',
    type: 'multiple_choice',
    options: ['ow', 'oa', 'ou', 'oo'],
    correctAnswer: 'oa',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 5
  {
    id: 'lsm_5a',
    category: 'letter_sound_matching',
    difficulty: 5,
    gradeRange: ['3rd Grade', '4th Grade', '5th Grade', '6th Grade'],
    prompt: 'Which letters make the /tion/ sound at the end of "nation"?',
    type: 'multiple_choice',
    options: ['tion', 'sion', 'shun', 'chen'],
    correctAnswer: 'tion',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'lsm_5b',
    category: 'letter_sound_matching',
    difficulty: 5,
    gradeRange: ['3rd Grade', '4th Grade', '5th Grade', '6th Grade'],
    prompt: 'Which letters make the /ous/ sound in "famous"?',
    type: 'multiple_choice',
    options: ['ous', 'oise', 'us', 'oss'],
    correctAnswer: 'ous',
    timeLimitMs: TIME_LIMIT_MS
  },

  // ─── WORD DECODING ────────────────────────────────────────────────

  // Difficulty 1
  {
    id: 'wd_1a',
    category: 'word_decoding',
    difficulty: 1,
    gradeRange: ['Kindergarten', '1st Grade'],
    prompt: 'Is "cat" a real word?',
    type: 'multiple_choice',
    options: ['Yes', 'No'],
    correctAnswer: 'Yes',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'wd_1b',
    category: 'word_decoding',
    difficulty: 1,
    gradeRange: ['Kindergarten', '1st Grade'],
    prompt: 'Is "dog" a real word?',
    type: 'multiple_choice',
    options: ['Yes', 'No'],
    correctAnswer: 'Yes',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'wd_1c',
    category: 'word_decoding',
    difficulty: 1,
    gradeRange: ['Kindergarten', '1st Grade'],
    prompt: 'Is "blark" a real word?',
    type: 'multiple_choice',
    options: ['Yes', 'No'],
    correctAnswer: 'No',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 2
  {
    id: 'wd_2a',
    category: 'word_decoding',
    difficulty: 2,
    gradeRange: ['1st Grade', '2nd Grade'],
    prompt: 'Is "flirp" a real word?',
    type: 'multiple_choice',
    options: ['Yes', 'No'],
    correctAnswer: 'No',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'wd_2b',
    category: 'word_decoding',
    difficulty: 2,
    gradeRange: ['1st Grade', '2nd Grade'],
    prompt: 'Is "jump" a real word?',
    type: 'multiple_choice',
    options: ['Yes', 'No'],
    correctAnswer: 'Yes',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'wd_2c',
    category: 'word_decoding',
    difficulty: 2,
    gradeRange: ['1st Grade', '2nd Grade'],
    prompt: 'Is "stimple" a real word?',
    type: 'multiple_choice',
    options: ['Yes', 'No'],
    correctAnswer: 'No',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 3
  {
    id: 'wd_3a',
    category: 'word_decoding',
    difficulty: 3,
    gradeRange: ['2nd Grade', '3rd Grade'],
    prompt: 'Is "brumble" a real word?',
    type: 'multiple_choice',
    options: ['Yes', 'No'],
    correctAnswer: 'No',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'wd_3b',
    category: 'word_decoding',
    difficulty: 3,
    gradeRange: ['2nd Grade', '3rd Grade'],
    prompt: 'Is "glimmer" a real word?',
    type: 'multiple_choice',
    options: ['Yes', 'No'],
    correctAnswer: 'Yes',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 4
  {
    id: 'wd_4a',
    category: 'word_decoding',
    difficulty: 4,
    gradeRange: ['3rd Grade', '4th Grade'],
    prompt: 'Is "crastinate" a real word?',
    type: 'multiple_choice',
    options: ['Yes', 'No'],
    correctAnswer: 'No',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'wd_4b',
    category: 'word_decoding',
    difficulty: 4,
    gradeRange: ['3rd Grade', '4th Grade'],
    prompt: 'Is "enormous" a real word?',
    type: 'multiple_choice',
    options: ['Yes', 'No'],
    correctAnswer: 'Yes',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 5
  {
    id: 'wd_5a',
    category: 'word_decoding',
    difficulty: 5,
    gradeRange: ['4th Grade', '5th Grade', '6th Grade'],
    prompt: 'Is "embellishment" a real word?',
    type: 'multiple_choice',
    options: ['Yes', 'No'],
    correctAnswer: 'Yes',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'wd_5b',
    category: 'word_decoding',
    difficulty: 5,
    gradeRange: ['4th Grade', '5th Grade', '6th Grade'],
    prompt: 'Is "conflagrate" a real word?',
    type: 'multiple_choice',
    options: ['Yes', 'No'],
    correctAnswer: 'No',
    timeLimitMs: TIME_LIMIT_MS
  },

  // ─── SYLLABLE COUNTING ────────────────────────────────────────────

  // Difficulty 1
  {
    id: 'sc_1a',
    category: 'syllable_counting',
    difficulty: 1,
    gradeRange: ['Kindergarten', '1st Grade'],
    prompt: 'How many syllables are in "cat"?',
    type: 'multiple_choice',
    options: ['1', '2', '3', '4'],
    correctAnswer: '1',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'sc_1b',
    category: 'syllable_counting',
    difficulty: 1,
    gradeRange: ['Kindergarten', '1st Grade'],
    prompt: 'How many syllables are in "happy"?',
    type: 'multiple_choice',
    options: ['1', '2', '3', '4'],
    correctAnswer: '2',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'sc_1c',
    category: 'syllable_counting',
    difficulty: 1,
    gradeRange: ['Kindergarten', '1st Grade'],
    prompt: 'How many syllables are in "apple"?',
    type: 'multiple_choice',
    options: ['1', '2', '3', '4'],
    correctAnswer: '2',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 2
  {
    id: 'sc_2a',
    category: 'syllable_counting',
    difficulty: 2,
    gradeRange: ['1st Grade', '2nd Grade'],
    prompt: 'How many syllables are in "banana"?',
    type: 'multiple_choice',
    options: ['1', '2', '3', '4'],
    correctAnswer: '3',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'sc_2b',
    category: 'syllable_counting',
    difficulty: 2,
    gradeRange: ['1st Grade', '2nd Grade'],
    prompt: 'How many syllables are in "water"?',
    type: 'multiple_choice',
    options: ['1', '2', '3', '4'],
    correctAnswer: '2',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 3
  {
    id: 'sc_3a',
    category: 'syllable_counting',
    difficulty: 3,
    gradeRange: ['2nd Grade', '3rd Grade'],
    prompt: 'How many syllables are in "butterfly"?',
    type: 'multiple_choice',
    options: ['2', '3', '4', '5'],
    correctAnswer: '3',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'sc_3b',
    category: 'syllable_counting',
    difficulty: 3,
    gradeRange: ['2nd Grade', '3rd Grade'],
    prompt: 'How many syllables are in "elephant"?',
    type: 'multiple_choice',
    options: ['2', '3', '4', '5'],
    correctAnswer: '3',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 4
  {
    id: 'sc_4a',
    category: 'syllable_counting',
    difficulty: 4,
    gradeRange: ['3rd Grade', '4th Grade', '5th Grade'],
    prompt: 'How many syllables are in "adventure"?',
    type: 'multiple_choice',
    options: ['2', '3', '4', '5'],
    correctAnswer: '3',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'sc_4b',
    category: 'syllable_counting',
    difficulty: 4,
    gradeRange: ['3rd Grade', '4th Grade', '5th Grade'],
    prompt: 'How many syllables are in "important"?',
    type: 'multiple_choice',
    options: ['2', '3', '4', '5'],
    correctAnswer: '3',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 5
  {
    id: 'sc_5a',
    category: 'syllable_counting',
    difficulty: 5,
    gradeRange: ['4th Grade', '5th Grade', '6th Grade'],
    prompt: 'How many syllables are in "encyclopedia"?',
    type: 'multiple_choice',
    options: ['4', '5', '6', '7'],
    correctAnswer: '6',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'sc_5b',
    category: 'syllable_counting',
    difficulty: 5,
    gradeRange: ['4th Grade', '5th Grade', '6th Grade'],
    prompt: 'How many syllables are in "communicate"?',
    type: 'multiple_choice',
    options: ['3', '4', '5', '6'],
    correctAnswer: '4',
    timeLimitMs: TIME_LIMIT_MS
  },

  // ─── RHYME RECOGNITION ────────────────────────────────────────────

  // Difficulty 1
  {
    id: 'rr_1a',
    category: 'rhyme_recognition',
    difficulty: 1,
    gradeRange: ['Kindergarten', '1st Grade'],
    prompt: 'Do "cat" and "hat" rhyme?',
    type: 'multiple_choice',
    options: ['Yes', 'No'],
    correctAnswer: 'Yes',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'rr_1b',
    category: 'rhyme_recognition',
    difficulty: 1,
    gradeRange: ['Kindergarten', '1st Grade'],
    prompt: 'Do "dog" and "cat" rhyme?',
    type: 'multiple_choice',
    options: ['Yes', 'No'],
    correctAnswer: 'No',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'rr_1c',
    category: 'rhyme_recognition',
    difficulty: 1,
    gradeRange: ['Kindergarten', '1st Grade'],
    prompt: 'Do "ball" and "tall" rhyme?',
    type: 'multiple_choice',
    options: ['Yes', 'No'],
    correctAnswer: 'Yes',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 2
  {
    id: 'rr_2a',
    category: 'rhyme_recognition',
    difficulty: 2,
    gradeRange: ['Kindergarten', '1st Grade', '2nd Grade'],
    prompt: 'Which word rhymes with "day"?',
    type: 'multiple_choice',
    options: ['play', 'come', 'big', 'run'],
    correctAnswer: 'play',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'rr_2b',
    category: 'rhyme_recognition',
    difficulty: 2,
    gradeRange: ['Kindergarten', '1st Grade', '2nd Grade'],
    prompt: 'Which word rhymes with "moon"?',
    type: 'multiple_choice',
    options: ['star', 'tune', 'sun', 'rain'],
    correctAnswer: 'tune',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 3
  {
    id: 'rr_3a',
    category: 'rhyme_recognition',
    difficulty: 3,
    gradeRange: ['1st Grade', '2nd Grade', '3rd Grade'],
    prompt: 'Which word rhymes with "light"?',
    type: 'multiple_choice',
    options: ['bright', 'laugh', 'deep', 'cool'],
    correctAnswer: 'bright',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'rr_3b',
    category: 'rhyme_recognition',
    difficulty: 3,
    gradeRange: ['1st Grade', '2nd Grade', '3rd Grade'],
    prompt: 'Do "great" and "bright" rhyme?',
    type: 'multiple_choice',
    options: ['Yes', 'No'],
    correctAnswer: 'No',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 4
  {
    id: 'rr_4a',
    category: 'rhyme_recognition',
    difficulty: 4,
    gradeRange: ['2nd Grade', '3rd Grade', '4th Grade'],
    prompt: 'Which word rhymes with "enough"?',
    type: 'multiple_choice',
    options: ['tough', 'though', 'through', 'thought'],
    correctAnswer: 'tough',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'rr_4b',
    category: 'rhyme_recognition',
    difficulty: 4,
    gradeRange: ['2nd Grade', '3rd Grade', '4th Grade'],
    prompt: 'Do "bough" and "rough" rhyme?',
    type: 'multiple_choice',
    options: ['Yes', 'No'],
    correctAnswer: 'No',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 5
  {
    id: 'rr_5a',
    category: 'rhyme_recognition',
    difficulty: 5,
    gradeRange: ['4th Grade', '5th Grade', '6th Grade'],
    prompt: 'Which word rhymes with "thorough"?',
    type: 'multiple_choice',
    options: ['borrow', 'laugh', 'through', 'cough'],
    correctAnswer: 'borrow',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'rr_5b',
    category: 'rhyme_recognition',
    difficulty: 5,
    gradeRange: ['4th Grade', '5th Grade', '6th Grade'],
    prompt: 'Do "receipt" and "deceit" rhyme?',
    type: 'multiple_choice',
    options: ['Yes', 'No'],
    correctAnswer: 'Yes',
    timeLimitMs: TIME_LIMIT_MS
  },

  // ─── SENTENCE COMPLETION ──────────────────────────────────────────

  // Difficulty 1
  {
    id: 'sent_1a',
    category: 'sentence_completion',
    difficulty: 1,
    gradeRange: ['Kindergarten', '1st Grade'],
    prompt: 'The cat sat on the ___.',
    type: 'multiple_choice',
    options: ['mat', 'blue', 'run', 'happy'],
    correctAnswer: 'mat',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'sent_1b',
    category: 'sentence_completion',
    difficulty: 1,
    gradeRange: ['Kindergarten', '1st Grade'],
    prompt: 'I like to eat ___.',
    type: 'multiple_choice',
    options: ['apples', 'runs', 'blue', 'jump'],
    correctAnswer: 'apples',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'sent_1c',
    category: 'sentence_completion',
    difficulty: 1,
    gradeRange: ['Kindergarten', '1st Grade'],
    prompt: 'The sun is ___.',
    type: 'multiple_choice',
    options: ['bright', 'book', 'table', 'chair'],
    correctAnswer: 'bright',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 2
  {
    id: 'sent_2a',
    category: 'sentence_completion',
    difficulty: 2,
    gradeRange: ['1st Grade', '2nd Grade'],
    prompt: 'The dog wagged its ___ when it was happy.',
    type: 'multiple_choice',
    options: ['tail', 'book', 'shoe', 'wall'],
    correctAnswer: 'tail',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'sent_2b',
    category: 'sentence_completion',
    difficulty: 2,
    gradeRange: ['1st Grade', '2nd Grade'],
    prompt: 'We use a ___ to read books.',
    type: 'multiple_choice',
    options: ['eyes', 'ears', 'feet', 'hands'],
    correctAnswer: 'eyes',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 3
  {
    id: 'sent_3a',
    category: 'sentence_completion',
    difficulty: 3,
    gradeRange: ['2nd Grade', '3rd Grade'],
    prompt: 'The teacher asked the students to ___ quietly.',
    type: 'multiple_choice',
    options: ['work', 'jump', 'shout', 'sleep'],
    correctAnswer: 'work',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'sent_3b',
    category: 'sentence_completion',
    difficulty: 3,
    gradeRange: ['2nd Grade', '3rd Grade'],
    prompt: 'After the rain, we saw a ___ in the sky.',
    type: 'multiple_choice',
    options: ['rainbow', 'shadow', 'mirror', 'blanket'],
    correctAnswer: 'rainbow',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 4
  {
    id: 'sent_4a',
    category: 'sentence_completion',
    difficulty: 4,
    gradeRange: ['3rd Grade', '4th Grade', '5th Grade'],
    prompt: 'The scientist made an important ___ about the experiment.',
    type: 'multiple_choice',
    options: ['discovery', 'pencil', 'window', 'hungry'],
    correctAnswer: 'discovery',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'sent_4b',
    category: 'sentence_completion',
    difficulty: 4,
    gradeRange: ['3rd Grade', '4th Grade', '5th Grade'],
    prompt: 'The hiker needed water because the trail was very ___.',
    type: 'multiple_choice',
    options: ['long', 'easy', 'short', 'quiet'],
    correctAnswer: 'long',
    timeLimitMs: TIME_LIMIT_MS
  },
  // Difficulty 5
  {
    id: 'sent_5a',
    category: 'sentence_completion',
    difficulty: 5,
    gradeRange: ['4th Grade', '5th Grade', '6th Grade'],
    prompt: 'Despite the challenge, she showed great ___ and finished the race.',
    type: 'multiple_choice',
    options: ['determination', 'kitchen', 'bicycle', 'silence'],
    correctAnswer: 'determination',
    timeLimitMs: TIME_LIMIT_MS
  },
  {
    id: 'sent_5b',
    category: 'sentence_completion',
    difficulty: 5,
    gradeRange: ['4th Grade', '5th Grade', '6th Grade'],
    prompt: 'The ancient ruins were a ___ to the civilization that built them.',
    type: 'multiple_choice',
    options: ['testament', 'kitchen', 'blanket', 'window'],
    correctAnswer: 'testament',
    timeLimitMs: TIME_LIMIT_MS
  }
];

/**
 * Get all tasks for a given category.
 * @param {string} category
 * @returns {object[]}
 */
export function getTasksByCategory(category) {
  return TASK_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get all tasks matching a grade level.
 * @param {string} grade
 * @returns {object[]}
 */
export function getTasksByGrade(grade) {
  return TASK_TEMPLATES.filter(t => t.gradeRange.includes(grade));
}

/**
 * Get tasks matching both category and difficulty.
 * @param {string} category
 * @param {number} difficulty 1–5
 * @returns {object[]}
 */
export function getTasksByCategoryAndDifficulty(category, difficulty) {
  return TASK_TEMPLATES.filter(
    t => t.category === category && t.difficulty === difficulty
  );
}
