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
      { prompt: 'What is three plus three?', options: ['5', '6', '7', '8'], answer: '6', blank: 'three plus three' },
      { prompt: 'What is four plus one?', options: ['3', '4', '5', '6'], answer: '5', blank: 'four plus one' },
      { prompt: 'What is seven plus two?', options: ['7', '8', '9', '10'], answer: '9', blank: 'seven plus two' },
      { prompt: 'What is one plus eight?', options: ['7', '8', '9', '10'], answer: '9', blank: 'one plus eight' },
      { prompt: 'What is five plus four?', options: ['7', '8', '9', '10'], answer: '9', blank: 'five plus four' },
      { prompt: 'What is three plus four?', options: ['5', '6', '7', '8'], answer: '7', blank: 'three plus four' },
      { prompt: 'What is six plus three?', options: ['7', '8', '9', '10'], answer: '9', blank: 'six plus three' },
      { prompt: 'What is two plus five?', options: ['5', '6', '7', '8'], answer: '7', blank: 'two plus five' },
      { prompt: 'What is four plus four?', options: ['6', '7', '8', '9'], answer: '8', blank: 'four plus four' },
      { prompt: 'What is eight plus one?', options: ['7', '8', '9', '10'], answer: '9', blank: 'eight plus one' },
      { prompt: 'What is nine plus one?', options: ['8', '9', '10', '11'], answer: '10', blank: 'nine plus one' },
      { prompt: 'What is two plus six?', options: ['6', '7', '8', '9'], answer: '8', blank: 'two plus six' },
      { prompt: 'What is three plus five?', options: ['6', '7', '8', '9'], answer: '8', blank: 'three plus five' },
      { prompt: 'What is one plus nine?', options: ['8', '9', '10', '11'], answer: '10', blank: 'one plus nine' },
      { prompt: 'What is five plus five?', options: ['8', '9', '10', '11'], answer: '10', blank: 'five plus five' },
      { prompt: 'What is six plus four?', options: ['8', '9', '10', '11'], answer: '10', blank: 'six plus four' },
      { prompt: 'What is seven plus three?', options: ['8', '9', '10', '11'], answer: '10', blank: 'seven plus three' }
    ]
  },
  subtract_single_digits: {
    items: [
      { prompt: 'What is eight minus three?', options: ['3', '4', '5', '6'], answer: '5', blank: 'eight minus three' },
      { prompt: 'What is nine minus four?', options: ['3', '4', '5', '6'], answer: '5', blank: 'nine minus four' },
      { prompt: 'What is ten minus two?', options: ['6', '7', '8', '9'], answer: '8', blank: 'ten minus two' },
      { prompt: 'What is seven minus three?', options: ['2', '3', '4', '5'], answer: '4', blank: 'seven minus three' },
      { prompt: 'What is six minus one?', options: ['3', '4', '5', '6'], answer: '5', blank: 'six minus one' },
      { prompt: 'What is nine minus five?', options: ['2', '3', '4', '5'], answer: '4', blank: 'nine minus five' },
      { prompt: 'What is eight minus four?', options: ['2', '3', '4', '5'], answer: '4', blank: 'eight minus four' },
      { prompt: 'What is ten minus three?', options: ['5', '6', '7', '8'], answer: '7', blank: 'ten minus three' },
      { prompt: 'What is seven minus two?', options: ['3', '4', '5', '6'], answer: '5', blank: 'seven minus two' },
      { prompt: 'What is six minus four?', options: ['1', '2', '3', '4'], answer: '2', blank: 'six minus four' }
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
      },
      {
        prompt: 'The sun gives energy for water to become ___ .',
        options: ['vapour', 'ice', 'soil', 'sand'],
        answer: 'vapour',
        blank: 'the sun helps water become'
      },
      {
        prompt: 'Puddles dry up because water turns into ___ .',
        options: ['vapour', 'ice', 'mud', 'grass'],
        answer: 'vapour',
        blank: 'where the water goes'
      },
      {
        prompt: 'Wet clothes dry when water becomes ___ .',
        options: ['vapour', 'ice', 'snow', 'rain'],
        answer: 'vapour',
        blank: 'the water in the clothes'
      },
      {
        prompt: 'The heat from the sun makes water ___ .',
        options: ['evaporate', 'freeze', 'grow', 'sleep'],
        answer: 'evaporate',
        blank: 'what the sun does to water'
      },
      {
        prompt: 'Water vapour rises because it is ___ than air.',
        options: ['lighter', 'heavier', 'colder', 'darker'],
        answer: 'lighter',
        blank: 'why vapour goes up'
      }
    ]
  },
  water_cycle_condensation: {
    items: [
      {
        prompt: 'When water vapour cools, it turns back into ___ .',
        options: ['tiny water drops', 'ice', 'soil', 'sand'],
        answer: 'tiny water drops',
        blank: 'cooled vapour becomes'
      },
      {
        prompt: 'Clouds are made of ___ .',
        options: ['tiny water drops', 'cotton', 'smoke', 'dust'],
        answer: 'tiny water drops',
        blank: 'what clouds are made of'
      },
      {
        prompt: 'Water vapour changes to liquid when it gets ___ .',
        options: ['cold', 'hot', 'fast', 'slow'],
        answer: 'cold',
        blank: 'what makes vapour condense'
      },
      {
        prompt: 'Dew on grass in the morning comes from ___ .',
        options: ['water vapour', 'rain', 'hose', 'sprinkler'],
        answer: 'water vapour',
        blank: 'where morning dew comes from'
      },
      {
        prompt: 'The process of vapour becoming liquid is called ___ .',
        options: ['condensation', 'evaporation', 'precipitation', 'collection'],
        answer: 'condensation',
        blank: 'the name of the process'
      }
    ]
  },
  water_cycle_precipitation: {
    items: [
      {
        prompt: 'When cloud drops get too heavy, they fall as ___ .',
        options: ['rain', 'wind', 'sun', 'clouds'],
        answer: 'rain',
        blank: 'what falls from heavy clouds'
      },
      {
        prompt: 'Rain, snow, sleet, and hail are all types of ___ .',
        options: ['precipitation', 'evaporation', 'condensation', 'collection'],
        answer: 'precipitation',
        blank: 'the name for falling water'
      },
      {
        prompt: 'Water falls from clouds when drops get ___ .',
        options: ['heavy', 'light', 'warm', 'small'],
        answer: 'heavy',
        blank: 'why rain falls'
      },
      {
        prompt: 'Snow falls when it is very ___ in the clouds.',
        options: ['cold', 'hot', 'windy', 'sunny'],
        answer: 'cold',
        blank: 'what makes snow'
      },
      {
        prompt: 'After rain, water collects in ___ .',
        options: ['rivers and lakes', 'the sky', 'clouds', 'the sun'],
        answer: 'rivers and lakes',
        blank: 'where rain water goes'
      }
    ]
  },
  plant_parts: {
    items: [
      { prompt: 'The part of a plant that holds it in the soil is the ___ .', options: ['root', 'leaf', 'petal', 'cloud'], answer: 'root', blank: 'the plant part underground' },
      { prompt: 'Leaves make food for the plant using ___ .', options: ['sunlight', 'sugar cubes', 'clay', 'wind'], answer: 'sunlight', blank: 'the plant food source' },
      { prompt: 'The ___ carries water from roots to leaves.', options: ['stem', 'flower', 'seed', 'rock'], answer: 'stem', blank: 'the plant pipe' },
      { prompt: 'Flowers make ___ that grow into new plants.', options: ['seeds', 'stones', 'sand', 'water'], answer: 'seeds', blank: 'what flowers make' },
      { prompt: 'Roots take in ___ from the soil.', options: ['water', 'air', 'light', 'rocks'], answer: 'water', blank: 'what roots drink' },
      { prompt: 'Green leaves catch ___ to make food.', options: ['sunlight', 'rain', 'wind', 'snow'], answer: 'sunlight', blank: 'what leaves catch' },
      { prompt: 'The part of a plant that grows toward the sun is the ___ .', options: ['stem', 'root', 'seed', 'rock'], answer: 'stem', blank: 'the part that grows up' },
      { prompt: 'Seeds need ___, water, and soil to grow.', options: ['sunlight', 'rocks', 'plastic', 'candy'], answer: 'sunlight', blank: 'what seeds need' }
    ]
  },
  animals_and_habitats: {
    items: [
      { prompt: 'A fish lives in the ___ .', options: ['ocean', 'desert', 'sky', 'cupboard'], answer: 'ocean', blank: 'where a fish lives' },
      { prompt: 'Birds make nests up in the ___ .', options: ['trees', 'river', 'basement', 'shoebox'], answer: 'trees', blank: 'where birds nest' },
      { prompt: 'A camel lives in the ___ .', options: ['desert', 'ocean', 'tree', 'house'], answer: 'desert', blank: 'where a camel lives' },
      { prompt: 'A polar bear lives where it is very ___ .', options: ['cold', 'hot', 'wet', 'dark'], answer: 'cold', blank: 'polar bear home' },
      { prompt: 'A monkey swings from ___ .', options: ['trees', 'clouds', 'cars', 'rocks'], answer: 'trees', blank: 'where monkeys play' },
      { prompt: 'A whale lives in the ___ .', options: ['ocean', 'lake', 'river', 'pool'], answer: 'ocean', blank: 'whale home' },
      { prompt: 'A worm lives in the ___ .', options: ['soil', 'sky', 'tree', 'nest'], answer: 'soil', blank: 'worm home' },
      { prompt: 'A bee makes its home in a ___ .', options: ['hive', 'nest', 'cave', 'pond'], answer: 'hive', blank: 'bee home' }
    ]
  },
  time_words: {
    items: [
      { prompt: 'We wake up in the ___ .', options: ['morning', 'night', 'midnight', 'noon'], answer: 'morning', blank: 'the early part of the day' },
      { prompt: 'We sleep at ___ .', options: ['night', 'breakfast', 'lunchtime', 'morning'], answer: 'night', blank: 'the dark part of the day' },
      { prompt: 'The sun is high at ___ .', options: ['noon', 'midnight', 'morning', 'evening'], answer: 'noon', blank: 'middle of the day' },
      { prompt: 'We eat dinner in the ___ .', options: ['evening', 'morning', 'noon', 'midnight'], answer: 'evening', blank: 'dinner time' },
      { prompt: 'The day after today is ___ .', options: ['tomorrow', 'yesterday', 'last week', 'next year'], answer: 'tomorrow', blank: 'next day' },
      { prompt: 'The day before today is ___ .', options: ['yesterday', 'tomorrow', 'next week', 'last year'], answer: 'yesterday', blank: 'previous day' }
    ]
  },
  shapes_two_dimensional: {
    items: [
      { prompt: 'A shape with four equal sides is a ___ .', options: ['square', 'circle', 'triangle', 'star'], answer: 'square', blank: 'the four-sided shape' },
      { prompt: 'A shape with three sides is a ___ .', options: ['triangle', 'square', 'circle', 'heart'], answer: 'triangle', blank: 'the three-sided shape' },
      { prompt: 'A round shape with no corners is a ___ .', options: ['circle', 'square', 'triangle', 'rectangle'], answer: 'circle', blank: 'the round shape' },
      { prompt: 'A shape with four sides, two long and two short, is a ___ .', options: ['rectangle', 'square', 'triangle', 'circle'], answer: 'rectangle', blank: 'the long four-sided shape' },
      { prompt: 'A shape with five sides is a ___ .', options: ['pentagon', 'square', 'triangle', 'hexagon'], answer: 'pentagon', blank: 'five-sided shape' },
      { prompt: 'A shape with six sides is a ___ .', options: ['hexagon', 'pentagon', 'square', 'octagon'], answer: 'hexagon', blank: 'six-sided shape' }
    ]
  },
  sentence_completion_basic: {
    items: [
      { prompt: 'We read a ___ before bed.', options: ['book', 'spoon', 'ball', 'tree'], answer: 'book', blank: 'something we read' },
      { prompt: 'The sun is ___ in the sky.', options: ['bright', 'noisy', 'sweet', 'square'], answer: 'bright', blank: 'how the sun looks' },
      { prompt: 'A dog can ___ .', options: ['bark', 'sing opera', 'read maps', 'peel bananas'], answer: 'bark', blank: 'what a dog does' },
      { prompt: 'The cat sits on the ___ .', options: ['mat', 'moon', 'cloud', 'star'], answer: 'mat', blank: 'where the cat sits' },
      { prompt: 'I like to eat ___ .', options: ['apples', 'rocks', 'shoes', 'dirt'], answer: 'apples', blank: 'good food' },
      { prompt: 'The bird flies in the ___ .', options: ['sky', 'water', 'ground', 'house'], answer: 'sky', blank: 'where birds fly' },
      { prompt: 'We wash our hands with ___ .', options: ['soap', 'sand', 'paint', 'glue'], answer: 'soap', blank: 'what cleans hands' },
      { prompt: 'The ball is ___ .', options: ['round', 'square', 'flat', 'sharp'], answer: 'round', blank: 'ball shape' },
      { prompt: 'Fish swim in the ___ .', options: ['water', 'air', 'trees', 'grass'], answer: 'water', blank: 'where fish swim' },
      { prompt: 'We put on shoes to ___ .', options: ['walk', 'sleep', 'eat', 'read'], answer: 'walk', blank: 'why we wear shoes' },
      { prompt: 'The tree has green ___ .', options: ['leaves', 'roots', 'flowers', 'fruits'], answer: 'leaves', blank: 'tree parts' },
      { prompt: 'My teddy bear is ___ .', options: ['soft', 'hard', 'wet', 'hot'], answer: 'soft', blank: 'teddy feel' },
      { prompt: 'We drink water from a ___ .', options: ['cup', 'plate', 'bowl', 'spoon'], answer: 'cup', blank: 'drinking tool' },
      { prompt: 'The sky is ___ .', options: ['blue', 'green', 'brown', 'black'], answer: 'blue', blank: 'sky color' },
      { prompt: 'A cow says ___ .', options: ['moo', 'woof', 'meow', 'quack'], answer: 'moo', blank: 'cow sound' }
    ]
  },
  initial_sound_identification: {
    items: [
      { prompt: 'Tap the word that starts with the sound /s/.', options: ['sun', 'cat', 'ball', 'mug'], answer: 'sun', blank: 'the /s/ word' },
      { prompt: 'Tap the word that starts with the sound /m/.', options: ['moon', 'dog', 'cat', 'sun'], answer: 'moon', blank: 'the /m/ word' },
      { prompt: 'Tap the word that starts with the sound /b/.', options: ['ball', 'sun', 'cat', 'dog'], answer: 'ball', blank: 'the /b/ word' },
      { prompt: 'Tap the word that starts with the sound /k/.', options: ['cat', 'dog', 'sun', 'ball'], answer: 'cat', blank: 'the /k/ word' },
      { prompt: 'Tap the word that starts with the sound /d/.', options: ['dog', 'cat', 'sun', 'ball'], answer: 'dog', blank: 'the /d/ word' },
      { prompt: 'Tap the word that starts with the sound /t/.', options: ['top', 'cat', 'dog', 'sun'], answer: 'top', blank: 'the /t/ word' },
      { prompt: 'Tap the word that starts with the sound /p/.', options: ['pen', 'sun', 'ball', 'cat'], answer: 'pen', blank: 'the /p/ word' },
      { prompt: 'Tap the word that starts with the sound /h/.', options: ['hat', 'cat', 'dog', 'sun'], answer: 'hat', blank: 'the /h/ word' },
      { prompt: 'Tap the word that starts with the sound /f/.', options: ['fish', 'dog', 'cat', 'sun'], answer: 'fish', blank: 'the /f/ word' },
      { prompt: 'Tap the word that starts with the sound /r/.', options: ['rat', 'cat', 'dog', 'sun'], answer: 'rat', blank: 'the /r/ word' }
    ]
  },
  letter_sound_matching: {
    items: [
      { prompt: 'Which letter makes the /m/ sound?', options: ['m', 'p', 'q', 'x'], answer: 'm', blank: 'the /m/ letter' },
      { prompt: 'Which letter makes the /s/ sound?', options: ['s', 'm', 't', 'p'], answer: 's', blank: 'the /s/ letter' },
      { prompt: 'Which letter makes the /b/ sound?', options: ['b', 'd', 'p', 'q'], answer: 'b', blank: 'the /b/ letter' },
      { prompt: 'Which letter makes the /t/ sound?', options: ['t', 'f', 'd', 'p'], answer: 't', blank: 'the /t/ letter' },
      { prompt: 'Which letter makes the /d/ sound?', options: ['d', 'b', 'p', 'q'], answer: 'd', blank: 'the /d/ letter' },
      { prompt: 'Which letter makes the /p/ sound?', options: ['p', 'b', 'q', 'd'], answer: 'p', blank: 'the /p/ letter' },
      { prompt: 'Which letter makes the /k/ sound?', options: ['c', 's', 'x', 'z'], answer: 'c', blank: 'the /k/ letter' },
      { prompt: 'Which letter makes the /h/ sound?', options: ['h', 'n', 'm', 'r'], answer: 'h', blank: 'the /h/ letter' },
      { prompt: 'Which letter makes the /f/ sound?', options: ['f', 'v', 't', 'p'], answer: 'f', blank: 'the /f/ letter' },
      { prompt: 'Which letter makes the /r/ sound?', options: ['r', 'n', 'm', 'h'], answer: 'r', blank: 'the /r/ letter' }
    ]
  },
  rhyme_recognition_set: {
    items: [
      { prompt: 'Which word rhymes with "cat"?', options: ['hat', 'dog', 'sun', 'tree'], answer: 'hat', blank: 'the rhyme word' },
      { prompt: 'Which word rhymes with "dog"?', options: ['log', 'cat', 'sun', 'bird'], answer: 'log', blank: 'the rhyme word' },
      { prompt: 'Which word rhymes with "sun"?', options: ['fun', 'dog', 'cat', 'tree'], answer: 'fun', blank: 'the rhyme word' },
      { prompt: 'Which word rhymes with "pen"?', options: ['hen', 'dog', 'cat', 'sun'], answer: 'hen', blank: 'the rhyme word' },
      { prompt: 'Which word rhymes with "ball"?', options: ['wall', 'dog', 'cat', 'sun'], answer: 'wall', blank: 'the rhyme word' },
      { prompt: 'Which word rhymes with "fish"?', options: ['wish', 'dog', 'cat', 'sun'], answer: 'wish', blank: 'the rhyme word' },
      { prompt: 'Which word rhymes with "tree"?', options: ['bee', 'dog', 'cat', 'sun'], answer: 'bee', blank: 'the rhyme word' },
      { prompt: 'Which word rhymes with "book"?', options: ['look', 'dog', 'cat', 'sun'], answer: 'look', blank: 'the rhyme word' },
      { prompt: 'Which word rhymes with "cake"?', options: ['lake', 'dog', 'cat', 'sun'], answer: 'lake', blank: 'the rhyme word' },
      { prompt: 'Which word rhymes with "moon"?', options: ['spoon', 'dog', 'cat', 'sun'], answer: 'spoon', blank: 'the rhyme word' }
    ]
  },
  syllable_counting_basic: {
    items: [
      { prompt: 'How many syllables in "cat"?', options: ['1', '2', '3', '4'], answer: '1', blank: 'syllables in cat' },
      { prompt: 'How many syllables in "dog"?', options: ['1', '2', '3', '4'], answer: '1', blank: 'syllables in dog' },
      { prompt: 'How many syllables in "sun"?', options: ['1', '2', '3', '4'], answer: '1', blank: 'syllables in sun' },
      { prompt: 'How many syllables in "pen"?', options: ['1', '2', '3', '4'], answer: '1', blank: 'syllables in pen' },
      { prompt: 'How many syllables in "apple"?', options: ['2', '1', '3', '4'], answer: '2', blank: 'syllables in apple' },
      { prompt: 'How many syllables in "happy"?', options: ['2', '1', '3', '4'], answer: '2', blank: 'syllables in happy' },
      { prompt: 'How many syllables in "butterfly"?', options: ['3', '1', '2', '4'], answer: '3', blank: 'syllables in butterfly' },
      { prompt: 'How many syllables in "elephant"?', options: ['3', '1', '2', '4'], answer: '3', blank: 'syllables in elephant' },
      { prompt: 'How many syllables in "banana"?', options: ['3', '1', '2', '4'], answer: '3', blank: 'syllables in banana' },
      { prompt: 'How many syllables in "computer"?', options: ['3', '1', '2', '4'], answer: '3', blank: 'syllables in computer' }
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