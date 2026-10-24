/**
 * Deterministic Help / Explanation Tier (§8 Tier 1, §10)
 *
 * Step 2 scope: NO LLM. Every help kind resolves from curated, bounded,
 * skill/objective-driven scaffolds. The Llama tier (§8 Tier 2: funny_example,
 * real_life_example, make_simpler narrative) is explicitly DEFERRED — this
 * module returns a curated fallback for those kinds so the help panel stays
 * honest and useful without any generated text.
 *
 * Safety contract (mirrors ContentValidator suitability gates):
 * - Length-capped output (240 chars).
 * - NEVER states the live answer: the answerLeak string must not appear.
 * - Tone filter: no forbidden/clinical/shaming patterns pass through.
 * - Deterministic: same inputs → same output (unit-tested).
 */

import { FORBIDDEN_CONTENT_PATTERNS, VALIDATOR_CONFIG } from './content-validator.js';
import { SKILL_BY_ID } from '../adaptive/adaptive-config.js';
import { OBJECTIVE_BY_ID } from '../adaptive/objective-registry.js';

/** Kinds served by the deterministic tier (§10). */
export const DETERMINISTIC_HELP_KINDS = Object.freeze([
  'show_me',
  'tell_me',
  'break_it_down'
]);

/** Kinds whose bounded Llama tier is deferred (§18) — curated fallback only. */
export const LLAMA_DEFERRED_KINDS = Object.freeze([
  'give_example',
  'make_simpler',
  'funny_example',
  'real_life_example'
]);

const MAX_HELP_CHARS = VALIDATOR_CONFIG.MAX_EXPLANATION_CHARS;

/* ───────────────────────── curated scaffolds ───────────────────────── */

const SHOW_ME_BY_SKILL = Object.freeze({
  phoneme_awareness: 'Look at the picture clue and tap each sound you hear as you say the word slowly.',
  letter_sound_correspondence: 'Look at each letter card and say its sound out loud before you pick.',
  decoding: 'Slide the letter tiles into place one at a time — start with the first sound.',
  syllable_awareness: 'Clap once for each part of the word, then tap the parts in your clap order.',
  rhyme_awareness: 'Say both words out loud and listen for the matching ending sound.',
  comprehension: 'Read the sentence up to the blank, then try each option in its place.'
});

const TELL_ME_BY_SKILL = Object.freeze({
  phoneme_awareness: 'Words are made of sounds. Say the word slowly and listen for its very first sound.',
  letter_sound_correspondence: 'Every letter has its own sound. Say each option softly and pick the one that matches.',
  decoding: 'A word is built sound by sound. Blend the tiles from left to right and hear the word appear.',
  syllable_awareness: 'Syllables are the beats in a word. Every beat gets one clap.',
  rhyme_awareness: 'Rhyming words share their ending sounds, like cat and hat.',
  comprehension: 'Sentences give clues. The words around the blank tell you what fits.'
});

const BREAK_IT_DOWN_BY_SKILL = Object.freeze({
  phoneme_awareness: 'Step 1: say the word. Step 2: catch the first sound. Step 3: find that sound in the choices.',
  letter_sound_correspondence: 'Step 1: name each letter. Step 2: say its sound. Step 3: match the sound in the prompt.',
  decoding: 'Step 1: say the first sound. Step 2: add the next one. Step 3: finish the word and check it.',
  syllable_awareness: 'Step 1: say the whole word. Step 2: clap its parts. Step 3: tap the parts in the same order.',
  rhyme_awareness: 'Step 1: say the target word. Step 2: stretch its ending. Step 3: pick the option with that ending.',
  comprehension: 'Step 1: read to the blank. Step 2: ask what makes sense. Step 3: try the best option there.'
});

/** Generic scaffolds (used when the skill has no curated line). */
const SHOW_ME_GENERIC = 'Take another look at the activity card — the words and pictures hold the clues.';
const TELL_ME_GENERIC = 'Try saying things out loud: the prompt, then each option. Listening helps you choose.';
const BREAK_IT_DOWN_GENERIC = 'Step 1: look at what is asked. Step 2: try one piece at a time. Step 3: choose when it feels right.';

/* ── objective-keyed concept phrases ──
 *
 * Skill-keyed text alone loses the activity context: a Math or Science
 * objective resolves to the `comprehension` skill and would be handed a
 * *reading* line ("read the sentence up to the blank") for an addition problem.
 * These phrases name the concept in the objective's own words so the help
 * actually describes what the child is doing.
 *
 * They are APP-OWNED strings keyed by registry objective id — never learner
 * free text and never the answer — so echoing them cannot leak a response.
 */
const OBJECTIVE_CONCEPT = Object.freeze({
  initial_sound_identification: 'the first sound a word starts with',
  letter_sound_matching: 'matching a letter to its sound',
  decode_cvc_words: 'building a word from its sounds',
  syllable_counting_1: 'the clap parts inside a word',
  rhyme_recognition_set: 'words that end the same way',
  sentence_completion_basic: 'the missing word in a sentence',
  water_cycle_evaporation: 'water warming up and changing into vapor',
  plant_parts: 'the parts of a plant and what each one does',
  animals_and_habitats: 'where an animal lives',
  add_single_digits: 'putting small numbers together',
  shapes_two_dimensional: 'flat shapes and their sides',
  time_words: 'the words for times of day'
});

/** Fully objective-specific lines, where the concept phrase is not enough. */
const OBJECTIVE_LINES = Object.freeze({
  water_cycle_evaporation: {
    show_me: 'Watch the picture: the sun warms the water, the tiny water bits move faster, and some float up into the air as vapor. That is evaporation.',
    break_it_down: 'Step 1: the sun gives heat. Step 2: the water bits jiggle faster. Step 3: some bits leave the water and become vapor in the air.'
  },
  plant_parts: {
    show_me: 'Tap each part of the plant: the roots hold it and drink water, the stem carries water up, the leaves catch sunlight, and the flower makes seeds.',
    break_it_down: 'Step 1: find the roots. Step 2: follow the stem up to the leaves. Step 3: notice where the flower sits.'
  },
  add_single_digits: {
    show_me: 'Count the first group, then count the second group, then put both groups together.',
    break_it_down: 'Step 1: count the first number on your fingers. Step 2: count the second number. Step 3: add both counts together.'
  },
  shapes_two_dimensional: {
    show_me: 'Look at each flat shape: count its sides and feel the corners where the sides meet.',
    break_it_down: 'Step 1: name the shape. Step 2: count its sides one at a time. Step 3: check which shape has that many.'
  },
  time_words: {
    show_me: 'Think about your day: which word comes before this one, and which word comes after?',
    break_it_down: 'Step 1: picture what you do at that time. Step 2: say the word for it. Step 3: pick the word that matches.'
  },
  animals_and_habitats: {
    show_me: 'Think about where each animal gets food, water, and shelter — that is its habitat.',
    break_it_down: 'Step 1: name the animal. Step 2: picture where it lives. Step 3: pick the place that matches.'
  }
});

/** Curated fallbacks for the deferred Llama-tier kinds (§18). */
const DEFERRED_FALLBACKS = Object.freeze({
  give_example: 'Here is one way to think about it: find one small clue in the card and use it first.',
  make_simpler: 'Let us make it smaller: try just the first part, then the next.',
  funny_example: 'Pretend the words are playing hide and seek — you just need the first clue to find them!',
  real_life_example: 'Like when you build with blocks: one piece at a time makes the whole thing.'
});

/* ───────────────────────── safety helpers ───────────────────────── */

function normalize(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function capLength(text, max = MAX_HELP_CHARS) {
  const t = normalize(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

function passesToneFilter(text) {
  return !FORBIDDEN_CONTENT_PATTERNS.some((p) => p.test(text));
}

function passesAnswerLeakFilter(text, answerLeak) {
  if (typeof answerLeak !== 'string' || answerLeak.trim().length < 2) return true;
  const leak = answerLeak.trim().toLowerCase();
  const words = leak.split(/\s+/);
  // A single-word answer appearing verbatim is a leak; multi-word keys only
  // leak when the full phrase appears (common words alone are fine).
  return !text.toLowerCase().includes(leak);
}

/* ───────────────────────── public API ───────────────────────── */

/**
 * Resolve the deterministic help content for a kind (§10).
 * Pure: same inputs → same output. Never throws.
 *
 * @param {object} input
 * @param {string} input.kind one of VALID_HELP_KINDS
 * @param {string} [input.skillId]
 * @param {string} [input.objectiveId]
 * @param {string} [input.prompt] live activity prompt (used to keep it generic)
 * @param {string} [input.answerLeak] live answer that must NOT appear
 * @returns {{ kind: string, content: string, source: 'deterministic' } | { kind: string, content: string, source: 'fallback', reason: string }}
 */
export function deterministicExplanation({ kind, skillId = null, objectiveId = null, prompt = '', answerLeak = null }) {
  void prompt; // prompts are never echoed back (answer-leak hygiene)
  // objectiveId IS used now: it selects concept-accurate help. It is an
  // app-owned registry id, not learner text, so it cannot leak an answer.
  const objectiveLine = objectiveId ? OBJECTIVE_LINES[objectiveId]?.[kind] : null;
  const concept = objectiveId ? OBJECTIVE_CONCEPT[objectiveId] : null;

  const skill = skillId ? SKILL_BY_ID[skillId] : null;

  // Candidate lines, most specific first.
  //
  // This is a LIST rather than a single choice because the most specific line
  // is not always usable: for an evaporation activity the answer IS the concept
  // word, so the concept-accurate line would hand over the answer. Previously
  // that case returned empty content and the learner got nothing at all. Now
  // the resolver walks down to the next candidate that is safe to speak, so the
  // child always gets help and never gets the answer.
  let candidates;
  switch (kind) {
    case 'show_me':
      candidates = [
        objectiveLine,
        concept ? `Here is what this one is about: ${concept}. Look for that idea in the card.` : null,
        skill && SHOW_ME_BY_SKILL[skill.id],
        SHOW_ME_GENERIC
      ];
      break;
    case 'tell_me':
      candidates = [
        concept ? `This one is about ${concept}. Say the words softly and listen for what fits.` : null,
        skill && TELL_ME_BY_SKILL[skill.id],
        TELL_ME_GENERIC
      ];
      break;
    case 'break_it_down':
      candidates = [
        objectiveLine,
        concept ? `Step 1: this one is about ${concept}. Step 2: find that idea in the card. Step 3: choose the option that shows it.` : null,
        skill && BREAK_IT_DOWN_BY_SKILL[skill.id],
        BREAK_IT_DOWN_GENERIC
      ];
      break;
    case 'give_example':
      candidates = [DEFERRED_FALLBACKS.give_example];
      break;
    case 'make_simpler':
      candidates = [DEFERRED_FALLBACKS.make_simpler];
      break;
    case 'funny_example':
      candidates = [DEFERRED_FALLBACKS.funny_example];
      break;
    case 'real_life_example':
      candidates = [DEFERRED_FALLBACKS.real_life_example];
      break;
    default:
      return { kind: String(kind), content: '', source: 'fallback', reason: 'unknown_kind' };
  }

  // First candidate that survives both safety filters wins. Determinism holds
  // because the candidate order is fixed for a given (kind, objectiveId, skillId).
  let lastRejection = 'no_candidate';
  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue;
    const text = capLength(candidate);
    if (!passesToneFilter(text)) {
      lastRejection = 'tone_filter_rejected';
      continue;
    }
    if (!passesAnswerLeakFilter(text, answerLeak)) {
      lastRejection = 'answer_leak_rejected';
      continue;
    }
    return { kind, content: text, source: 'deterministic' };
  }

  return { kind, content: '', source: 'fallback', reason: lastRejection };
}

export default { deterministicExplanation, DETERMINISTIC_HELP_KINDS, LLAMA_DEFERRED_KINDS };
