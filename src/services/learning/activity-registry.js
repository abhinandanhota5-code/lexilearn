/**
 * Activity Registry (§9) — deterministic content builders
 *
 * Turns a raw ALE plan into a full ActivitySpecification. All content is
 * pulled from curated, grade-appropriate banks keyed deterministically by
 * variationSeed (FNV-1a). NO adaptive logic lives here.
 *
 * The returned spec includes `answerKey` for MAIN-side ground truth only.
 * `toRendererSpec()` strips it before anything crosses IPC.
 */

import { OBJECTIVE_BY_ID } from '../adaptive/objective-registry.js';
import { fnv1a } from '../adaptive/adaptive-engine.js';

/* ───────────── curated banks (deterministic, age-appropriate) ───────────── */

const SENTENCE_MC_BANK = {
  add_single_digits: {
    items: [
      { prompt: 'What is five plus three?', options: ['6', '7', '8', '9'], answer: '8', blank: 'five plus three' },
      { prompt: 'What is two plus two?', options: ['2', '3', '4', '5'], answer: '4', blank: 'two plus two' },
      { prompt: 'What is six plus two?', options: ['7', '8', '9', '10'], answer: '8', blank: 'six plus two' },
      { prompt: 'What is three plus three?', options: ['5', '6', '7', '8'], answer: '6', blank: 'three plus three' }
    ]
  },
  water_cycle_evaporation: {
    items: [
      {
        prompt: 'The process by which water changes into water vapour is called ___ .',
        options: ['Evaporation', 'Condensation', 'Precipitation', 'Collection'],
        answer: 'Evaporation',
        blank: 'water changing into vapour'
      },
      {
        prompt: 'When the sun warms it, water changes into ___ .',
        options: ['water vapour', 'a rock', 'a cloud', 'ice'],
        answer: 'water vapour',
        blank: 'the warm water turning into'
      },
      {
        prompt: 'Water that turns into vapour goes up into the ___ .',
        options: ['air', 'soil', 'ocean floor', 'your shoe'],
        answer: 'air',
        blank: 'where the vapour rises'
      }
    ]
  },
  sentence_completion_basic: {
    items: [
      { prompt: 'We read a ___ before bed.', options: ['book', 'spoon', 'ball', 'tree'], answer: 'book', blank: 'something we read' },
      { prompt: 'The sun is ___ in the sky.', options: ['bright', 'noisy', 'sweet', 'square'], answer: 'bright', blank: 'how the sun looks' },
      { prompt: 'A dog can ___ .', options: ['bark', 'sing opera', 'read maps', 'peel bananas'], answer: 'bark', blank: 'what a dog does' }
    ]
  },
  initial_sound_identification: {
    items: [
      { prompt: 'Tap the word that starts with the sound /s/.', options: ['sun', 'cat', 'ball', 'mug'], answer: 'sun', blank: 'the /s/ word' }
    ]
  },
  letter_sound_matching: {
    items: [
      { prompt: 'Which letter makes the /m/ sound?', options: ['m', 'p', 'q', 'x'], answer: 'm', blank: 'the /m/ letter' }
    ]
  },
  rhyme_recognition_set: {
    items: [
      { prompt: 'Which word rhymes with "cat"?', options: ['hat', 'dog', 'sun', 'tree'], answer: 'hat', blank: 'the rhyme word' }
    ]
  },
  plant_parts: {
    items: [
      { prompt: 'The part of a plant that holds it in the soil is the ___ .', options: ['root', 'leaf', 'petal', 'cloud'], answer: 'root', blank: 'the plant part underground' },
      { prompt: 'Leaves make food for the plant using ___ .', options: ['sunlight', 'sugar cubes', 'clay', 'wind'], answer: 'sunlight', blank: 'the plant food source' }
    ]
  },
  animals_and_habitats: {
    items: [
      { prompt: 'A fish lives in the ___ .', options: ['ocean', 'desert', 'sky', 'cupboard'], answer: 'ocean', blank: 'where a fish lives' },
      { prompt: 'Birds make nests up in the ___ .', options: ['trees', 'river', 'basement', 'shoebox'], answer: 'trees', blank: 'where birds nest' }
    ]
  },
  time_words: {
    items: [
      { prompt: 'We wake up in the ___ .', options: ['morning', 'night', 'midnight', 'noon'], answer: 'morning', blank: 'the early part of the day' },
      { prompt: 'We sleep at ___ .', options: ['night', 'breakfast', 'lunchtime', 'morning'], answer: 'night', blank: 'the dark part of the day' }
    ]
  },
  shapes_two_dimensional: {
    items: [
      { prompt: 'A shape with four equal sides is a ___ .', options: ['square', 'circle', 'triangle', 'star'], answer: 'square', blank: 'the four-sided shape' },
      { prompt: 'A shape with three sides is a ___ .', options: ['triangle', 'square', 'circle', 'heart'], answer: 'triangle', blank: 'the three-sided shape' }
    ]
  }
};

const SOUND_DETECT_TARGETS = [
  { target: 'sun', answer: 's', options: ['s', 'm', 'p', 't'], cue: '☀️' },
  { target: 'ball', answer: 'b', options: ['b', 'd', 'g', 'k'], cue: '⚽' },
  { target: 'car', answer: 'k', options: ['k', 'c', 't', 'n'], cue: '🚗' },
  { target: 'dog', answer: 'd', options: ['d', 'l', 'r', 'w'], cue: '🐶' },
  { target: 'moon', answer: 'm', options: ['m', 'n', 'b', 'h'], cue: '🌙' },
  { target: 'rain', answer: 'r', options: ['r', 'p', 's', 'k'], cue: '🌧️' }
];

const SOUND_DETECT_PROMPTS = [
  'Which letter makes the first sound you hear in "{target}"?',
  'Tap the letter that starts the word "{target}".'
];

const WORD_BUILD_WORDS = [
  { word: 'cat', letters: ['c', 'a', 't'] },
  { word: 'dog', letters: ['d', 'o', 'g'] },
  { word: 'sun', letters: ['s', 'u', 'n'] },
  { word: 'bus', letters: ['b', 'u', 's'] },
  { word: 'hat', letters: ['h', 'a', 't'] },
  { word: 'pen', letters: ['p', 'e', 'n'] }
];

const SYLLABLE_WORDS = [
  { word: 'but-ter-fly', chunks: ['but', 'ter', 'fly'], label: 'butterfly' },
  { word: 'el-e-phant', chunks: ['el', 'e', 'phant'], label: 'elephant' },
  { word: 'ta-ble', chunks: ['ta', 'ble'], label: 'table' },
  { word: 'ba-na-na', chunks: ['ba', 'na', 'na'], label: 'banana' },
  { word: 'hap-py', chunks: ['hap', 'py'], label: 'happy' },
  { word: 'oc-to-pus', chunks: ['oc', 'to', 'pus'], label: 'octopus' }
];

const VISUAL_CUES = Object.freeze({
  sun: '☀️', moon: '🌙', car: '🚗', dog: '🐶', cat: '🐱', ball: '⚽',
  rain: '🌧️', hat: '🎩', pen: '🖊️', bus: '🚌', book: '📖', tree: '🌳',
  fish: '🐟', bird: '🐦', root: '🌱', leaf: '🍃'
});

/* ───────────── grounding corpus (Phase 6 Llama wording tier) ───────────── */

/**
 * Every word the app's own curated activity banks use — sentence-MC options,
 * sound-detect targets, word builds, and syllable words. This is the
 * grounding corpus for the Llama wording tier: the model may re-word
 * questions but may only pick choice words from this list (or from verified
 * school material). Derived programmatically so it always matches the banks.
 */
export const ACTIVITY_VOCABULARY = Object.freeze([
  ...new Set([
    ...Object.values(SENTENCE_MC_BANK).flatMap((bank) => bank.items.flatMap((it) => it.options)),
    ...SOUND_DETECT_TARGETS.map((t) => t.target),
    ...WORD_BUILD_WORDS.map((w) => w.word),
    ...SYLLABLE_WORDS.map((w) => w.label)
  ])
]);

/* ───────────── deterministic pickers ───────────── */

function pick(seed, arr) {
  if (!arr || arr.length === 0) return null;
  // fnv1a returns an 8-char hex STRING — parse it before the modulo
  // (coercing via Number() yields NaN for hex without a 0x prefix).
  return arr[parseInt(fnv1a(seed), 16) % arr.length];
}

/* ───────────── content builders ───────────── */

function buildSentenceMc(plan) {
  const bank = SENTENCE_MC_BANK[plan.objectiveId];
  const item =
    pick(`${plan.variationSeed}|sentence`, bank?.items || null) ||
    fallbackSentenceItem(plan);
  const audioPrompt = formatAudioPrompt(item);

  return {
    prompt: item.prompt,
    options: item.options,
    answerKey: item.answer,
    blank: item.blank,
    visualCues: bank ? {} : {},
    audioPrompt
  };
}

function fallbackSentenceItem(plan) {
  const objective = OBJECTIVE_BY_ID[plan.objectiveId];
  const terms = objective?.coreTerms || [];
  return {
    prompt: `Which of these belongs with "${objective?.label || 'this topic'}"?`,
    options: terms.slice(0, 4).concat(['Another thing']).slice(0, 4).length >= 4
      ? terms.slice(0, 4)
      : [...terms, 'Also another thing', 'Not the right one'].slice(0, 4),
    answer: terms[0] || 'yes',
    blank: 'the matching word'
  };
}

function formatAudioPrompt(item) {
  const blankPhrase = item.blank ? ` (the answer for "${item.blank}")` : '';
  return `${item.prompt.replace('___', 'blank')}${''}`.replace(/\s*$/, '');
}

function buildSoundDetect(plan) {
  const target = pick(`${plan.variationSeed}|sound`, SOUND_DETECT_TARGETS);
  const prompt = pick(`${plan.variationSeed}|prompt`, SOUND_DETECT_PROMPTS).replace(
    '{target}',
    target.target
  );
  return {
    prompt,
    options: target.options,
    answerKey: target.answer,
    visualCue: target.cue,
    target: target.target,
    audioPrompt: `${prompt}. The word is "${target.target}".`
  };
}

function buildWordBuild(plan) {
  const word = pick(`${plan.variationSeed}|word`, WORD_BUILD_WORDS);
  // Shuffled tiles (deterministic permutation seeded by variationSeed).
  const perm = seededShuffle(word.letters, `${plan.variationSeed}|tiles`);
  return {
    prompt: 'Tap the letters in the right order to build the word.',
    targetWord: word.word,
    tiles: perm,
    answerKey: word.word,
    audioPrompt: `Build the word "${word.word}".`
  };
}

function buildSyllableSplit(plan) {
  const word = pick(`${plan.variationSeed}|syll`, SYLLABLE_WORDS);
  const perm = seededShuffle(word.chunks, `${plan.variationSeed}|chunks`);
  return {
    prompt: 'Tap the syllables in the right order.',
    targetWord: word.label,
    syllables: perm,
    correctOrder: word.chunks,
    answerKey: word.chunks.join('-'),
    audioPrompt: `Tap the parts of the word "${word.label}" in order.`
  };
}

/** Deterministic Fisher–Yates seeded by fnv1a (no Math.random). */
function seededShuffle(items, seed) {
  const arr = [...items];
  let seedHash = parseInt(fnv1a(seed), 16);
  for (let i = arr.length - 1; i > 0; i--) {
    seedHash = (seedHash * 1103515245 + 12345) >>> 0;
    const j = seedHash % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ───────────── spec composition ───────────── */

const CONTENT_BUILDERS = {
  sentence_mc: buildSentenceMc,
  sound_detect: buildSoundDetect,
  word_build: buildWordBuild,
  syllable_split: buildSyllableSplit
};

/**
 * Read-only view of the content builders, keyed by activity type. Exported
 * for validator/main-side reuse (Phase 6 Step 2); mutation has no effect.
 */
export const CONTENT_BUILDERS_FOR_VALIDATION = Object.freeze({ ...CONTENT_BUILDERS });

/**
 * Compose a full ActivitySpecification from an ALE plan.
 * The returned spec includes `answerKey` (main-side only).
 * @param {object} plan nextPlan from the ALE
 * @returns {object} ActivitySpecification incl. answerKey
 */
export function buildActivitySpec(plan) {
  const builder = CONTENT_BUILDERS[plan.activityType] || buildSentenceMc;
  const content = builder(plan);

  const objective = OBJECTIVE_BY_ID[plan.objectiveId];
  const title = plan.title || objective?.label || 'Practice';
  const blankMode = plan.activityType === 'word_build' || plan.activityType === 'syllable_split' ? 'build' : 'choose';

  return {
    ...plan,
    activityId: `${plan.sessionId}_${plan.sequence}`,
    title,
    mode: blankMode,
    content,
    timeLimitMs: 60000,
    prompt: content.prompt,
    presentation: {
      ...(plan.presentation || {}),
      audioPrompt: plan.presentation?.audioPrompt || content.audioPrompt || null,
      audioPromptVisible: null
    },
    answerKey: content.answerKey,
    options: content.options || null
  };
}

/**
 * Strip main-side secrets (answerKey, answer) for the renderer.
 * @param {object} spec full ActivitySpecification
 * @returns {object} renderer-safe spec
 */
export function toRendererSpec(spec) {
  const { answerKey, options, ...rest } = spec;
  const safe = { ...rest, content: { ...(spec.content || {}) } };
  delete safe.content.answerKey;
  delete safe.content.correctOrder;
  delete safe.correctOrder;
  return {
    ...safe,
    content: {
      prompt: safe.content.prompt,
      options: safe.content.options || null,
      visualCue: safe.content.visualCue || null,
      target: safe.content.target || null,
      tiles: safe.content.tiles || null,
      syllables: safe.content.syllables || null,
      targetWord: safe.content.targetWord || null,
      audioPrompt: safe.content.audioPrompt || null
    }
  };
}