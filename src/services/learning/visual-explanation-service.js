/**
 * Visual-Explanation Service — bounded, declarative, grounded (§ Imagine It)
 *
 * Chain: School Material → Learning Objective → Activity/Explanation Spec →
 * Representation Selector (HERE) → Visual Explanation (declarative spec) →
 * Child Interaction (renderer-owned) → Learning Signal (record-only).
 *
 * Safety contract (hard):
 * - Specs contain ONLY bounded declarative data: shape TOKENS (never raw
 *   SVG/HTML/JS), numbers, and short strings. The renderer maps tokens to
 *   trusted, application-defined visual primitives.
 * - `validateVisualSpec` fail-closes: any unknown key, non-whitelisted shape,
 *   count above caps, over-long text, or tone-filter violation rejects the
 *   whole spec. Llama (later) may only ever emit data that passes this gate.
 * - Grounding gate: a visual is served ONLY for an objective that has a
 *   curated template AND covers the learner's grade. Verified school material
 *   is attached when available. Without sufficient grounding the caller falls
 *   back to the existing deterministic TEXT explanation — never invented
 *   content.
 * - Grade awareness: per-grade element/step/interaction budgets trim the
 *   template deterministically (younger → fewer elements, fewer steps,
 *   stronger scaffolding). No medical or developmental inference: budgets are
 *   a fixed table keyed by canonical grade.
 * - Deterministic: same inputs → byte-identical spec.
 */

import { FORBIDDEN_CONTENT_PATTERNS } from '../ai/content-validator.js';
import { OBJECTIVE_BY_ID } from '../adaptive/objective-registry.js';
import { CANONICAL_GRADES } from '../curriculum/curriculum-schema.js';

/* ───────────────────────── representation registry ───────────────────────── */

/**
 * Extensible representation-type registry. `implemented: true` types have
 * renderer support today (the current learner flow needs exactly these);
 * the others are declared to pin the contract without expanding scope.
 */
export const VISUAL_REPRESENTATION_TYPES = Object.freeze({
  diagram: { implemented: true, animated: false, interactive: false },
  step_diagram: { implemented: true, animated: false, interactive: false },
  process_animation: { implemented: true, animated: true, interactive: false },
  interactive_diagram: { implemented: true, animated: false, interactive: true },
  real_life_scene: { implemented: false, animated: false, interactive: false },
  comparison_visual: { implemented: false, animated: false, interactive: false },
  sorting_visual: { implemented: false, animated: false, interactive: false }
});

/** Whitelisted shape TOKENS the renderer knows how to draw safely. */
export const VISUAL_ELEMENT_SHAPES = Object.freeze([
  'rect', 'circle', 'ellipse', 'arrow', 'sun', 'droplet', 'puddle', 'vapor',
  'plant_root', 'plant_stem', 'plant_leaf', 'plant_flower', 'container', 'heat_waves',
  'letter_tile'
]);

/** Semantic learning-signal events (record-only; never an ALE input). */
export const VISUAL_SIGNAL_EVENTS = Object.freeze([
  'visual_opened',
  'visual_step_viewed',
  'visual_replayed',
  'visual_element_selected',
  'visual_completed',
  'visual_help_requested'
]);

/* ───────────────────────── bounded budgets ───────────────────────── */

const SPEC_LIMITS = Object.freeze({
  elements: 10,
  steps: 8,
  interactions: 6,
  relationships: 8,
  labelChars: 60,
  stepNoteChars: 120,
  revealChars: 120,
  titleChars: 80,
  conceptChars: 120,
  explanationChars: 240,
  textAlternativeChars: 400
});

/**
 * Grade visual budgets (deterministic table — no developmental inference).
 * Lower grades get fewer elements/steps/interactions and stronger scaffolding.
 * Keyed by canonical grade; unknown grades fail the grounding gate.
 */
export const GRADE_VISUAL_BUDGETS = Object.freeze({
  Kindergarten: { maxElements: 3, maxSteps: 2, maxInteractions: 2, scaffoldingLevel: 3 },
  '1st Grade': { maxElements: 3, maxSteps: 2, maxInteractions: 2, scaffoldingLevel: 3 },
  '2nd Grade': { maxElements: 4, maxSteps: 3, maxInteractions: 2, scaffoldingLevel: 3 },
  '3rd Grade': { maxElements: 5, maxSteps: 3, maxInteractions: 3, scaffoldingLevel: 2 },
  '4th Grade': { maxElements: 6, maxSteps: 4, maxInteractions: 3, scaffoldingLevel: 2 },
  '5th Grade': { maxElements: 7, maxSteps: 5, maxInteractions: 4, scaffoldingLevel: 1 },
  '6th Grade': { maxElements: 8, maxSteps: 6, maxInteractions: 4, scaffoldingLevel: 1 },
  '7th Grade': { maxElements: 8, maxSteps: 6, maxInteractions: 4, scaffoldingLevel: 1 },
  '8th Grade': { maxElements: 9, maxSteps: 7, maxInteractions: 5, scaffoldingLevel: 1 },
  '9th Grade': { maxElements: 10, maxSteps: 8, maxInteractions: 6, scaffoldingLevel: 1 },
  '10th Grade': { maxElements: 10, maxSteps: 8, maxInteractions: 6, scaffoldingLevel: 1 },
  '11th Grade': { maxElements: 10, maxSteps: 8, maxInteractions: 6, scaffoldingLevel: 1 },
  '12th Grade': { maxElements: 10, maxSteps: 8, maxInteractions: 6, scaffoldingLevel: 1 }
});

/* ───────────────────────── curated visual templates ───────────────────────── */

/**
 * Curated, objective-anchored visual templates. Content mirrors the SAME
 * curated concepts as the ALE objective registry (no invented syllabus) —
 * these are representations of already-curated objectives, exactly like the
 * deterministic activity builders. Adding a subject = adding a template.
 */
const VISUAL_TEMPLATES = Object.freeze({
  // ── Reading: CVC word building (decode_cvc_words) ──
  // Content mirrors the VERIFIED activity bank (WORD_BUILD_WORDS: cat, dog,
  // sun, bus, hat, pen) — no invented syllabus. The child sees that a word
  // is built from letter sounds: tap each letter, hear/see its sound, then
  // the letters combine into the word with a concrete picture cue.
  decode_cvc_words: {
    title: 'Build a word from sounds',
    concept: 'A word is made of letter sounds put together.',
    explanation: 'Every letter makes a sound. Tap each letter to see its sound. Then the sounds join to build the word.',
    representations: {
      interactive_diagram: {
        // Trim priority: the 3 letter tiles first (the core interaction),
        // then the word band (the assembly payoff), then the combining
        // arrow. Young-grade budgets (3 elements) keep the tap-the-letters
        // experience; 2nd Grade+ adds the completed word.
        elements: [
          { id: 'l1', shape: 'letter_tile', x: 34, y: 60, w: 60, h: 60, label: 's' },
          { id: 'l2', shape: 'letter_tile', x: 130, y: 60, w: 60, h: 60, label: 'u' },
          { id: 'l3', shape: 'letter_tile', x: 226, y: 60, w: 60, h: 60, label: 'n' },
          { id: 'word', shape: 'letter_tile', x: 95, y: 210, w: 130, h: 56, label: 'sun' },
          { id: 'combine', shape: 'arrow', x: 60, y: 150, w: 200, h: 24, label: 'sounds join' }
        ],
        relationships: [
          { from: 'l1', to: 'word', label: 'first sound' },
          { from: 'l2', to: 'word', label: 'middle sound' },
          { from: 'l3', to: 'word', label: 'last sound' }
        ],
        steps: [
          { id: 's1', label: 'Letters stand for sounds', note: 'Tap a letter to see its sound.', move: ['l1', 'l2', 'l3'] },
          { id: 's2', label: 'The sounds join together', note: 's · u · n — say them slow.', move: ['l1', 'l2', 'l3'] },
          { id: 's3', label: 'You built the word sun!', note: 'Now say it fast: sun!', move: ['word'] }
        ],
        interactions: [
          { elementId: 'l1', revealText: 's says /s/ — like the start of sun.' },
          { elementId: 'l2', revealText: 'u says /u/ — like the middle of sun.' },
          { elementId: 'l3', revealText: 'n says /n/ — like the end of sun.' }
        ]
      }
    }
  },

  // ── Reading: syllable chunks (syllable_counting_1) ──
  // Content mirrors the VERIFIED SYLLABLE_WORDS bank (but-ter-fly, el-e-phant,
  // ta-ble, ba-na-na, hap-py, oc-to-pus) — real words already in the app.
  syllable_counting_1: {
    title: 'Syllables are word parts',
    concept: 'Long words are made of syllable chunks you can clap.',
    explanation: 'Say the word slowly and clap each part. Tap each chunk to see how the parts build the whole word.',
    representations: {
      interactive_diagram: {
        // Trim priority: the chunks first, then the whole word, then the
        // combining arrow.
        elements: [
          { id: 'c1', shape: 'letter_tile', x: 24, y: 60, w: 84, h: 56, label: 'but' },
          { id: 'c2', shape: 'letter_tile', x: 118, y: 60, w: 84, h: 56, label: 'ter' },
          { id: 'c3', shape: 'letter_tile', x: 212, y: 60, w: 84, h: 56, label: 'fly' },
          { id: 'whole', shape: 'letter_tile', x: 66, y: 200, w: 188, h: 56, label: 'butterfly' },
          { id: 'combine', shape: 'arrow', x: 60, y: 140, w: 200, h: 24, label: 'chunks join' }
        ],
        relationships: [
          { from: 'c1', to: 'whole', label: 'first clap' },
          { from: 'c2', to: 'whole', label: 'next clap' },
          { from: 'c3', to: 'whole', label: 'last clap' }
        ],
        steps: [
          { id: 's1', label: 'Say the word in chunks', note: 'but · ter · fly — three claps.', move: ['c1', 'c2', 'c3'] },
          { id: 's2', label: 'Every chunk gets a clap', note: 'Tap a chunk to see its clap.', move: ['c1', 'c2', 'c3'] },
          { id: 's3', label: 'All the chunks make the word', note: 'Chunks together say butterfly!', move: ['whole'] }
        ],
        interactions: [
          { elementId: 'c1', revealText: 'but — one clap.' },
          { elementId: 'c2', revealText: 'ter — the next clap.' },
          { elementId: 'c3', revealText: 'fly — the last clap.' }
        ]
      }
    }
  },

  // ── Reading: sentence segmentation (sentence_completion_basic) ──
  // Content mirrors the VERIFIED SENTENCE_MC_BANK for this objective (book /
  // bright / bark sentences) — a real sentence from the child's own activity.
  sentence_completion_basic: {
    title: 'A sentence is made of words',
    concept: 'A sentence is separate words that go together.',
    explanation: 'A sentence is made of separate words. Tap each word to see it. All the words together make one sentence.',
    representations: {
      interactive_diagram: {
        // Sentence segmentation with the canonical example "The cat runs.":
        // each word is a distinct tap unit; together they form one sentence.
        // Trim priority: the 3 words first, then the sentence band.
        elements: [
          { id: 'w1', shape: 'letter_tile', x: 24, y: 70, w: 84, h: 56, label: 'The' },
          { id: 'w2', shape: 'letter_tile', x: 118, y: 70, w: 84, h: 56, label: 'cat' },
          { id: 'w3', shape: 'letter_tile', x: 212, y: 70, w: 84, h: 56, label: 'runs.' },
          { id: 'sentence', shape: 'letter_tile', x: 40, y: 200, w: 240, h: 56, label: 'The cat runs.' }
        ],
        relationships: [
          { from: 'w1', to: 'sentence', label: 'word 1' },
          { from: 'w2', to: 'sentence', label: 'word 2' },
          { from: 'w3', to: 'sentence', label: 'word 3' }
        ],
        steps: [
          { id: 's1', label: 'A sentence is separate words', note: 'Three words stand side by side.', move: ['w1', 'w2', 'w3'] },
          { id: 's2', label: 'Words go in order', note: 'First, next, last — order matters.', move: ['w1', 'w2', 'w3'] },
          { id: 's3', label: 'Together they make one sentence', note: 'Read it all at once: The cat runs.', move: ['sentence'] }
        ],
        interactions: [
          { elementId: 'w1', revealText: 'The — names who we talk about.' },
          { elementId: 'w2', revealText: 'cat — who the sentence is about.' },
          { elementId: 'w3', revealText: 'runs. — what the cat does.' }
        ]
      }
    }
  },

  water_cycle_evaporation: {
    title: 'Water becomes vapor',
    concept: 'Evaporation: liquid water becomes water vapor when warmed.',
    explanation: 'The sun warms the water. Tiny water bits move faster and faster. Some fly out of the water into the air. That is called evaporation.',
    representations: {
      process_animation: {
        // Element order doubles as the grade-trim priority (see trimForGrade):
        // the STORY elements (water, particles, vapor, sun) come first so the
        // scene stays complete at young-grade budgets — backdrop (sky) and
        // decoration (heat waves) are the first to go.
        elements: [
          { id: 'puddle', shape: 'puddle', x: 60, y: 190, w: 200, h: 70, label: 'Water' },
          { id: 'p1', shape: 'droplet', x: 110, y: 205, w: 18, h: 18, label: '' },
          { id: 'p2', shape: 'droplet', x: 150, y: 210, w: 18, h: 18, label: '' },
          { id: 'v1', shape: 'vapor', x: 130, y: 150, w: 22, h: 22, label: 'Water vapor' },
          { id: 'sun', shape: 'sun', x: 240, y: 20, w: 56, h: 56, label: 'Sun gives heat' },
          { id: 'sky', shape: 'rect', x: 0, y: 0, w: 320, h: 120, label: 'Air' },
          { id: 'heat', shape: 'heat_waves', x: 200, y: 130, w: 40, h: 60, label: 'Heat' }
        ],
        relationships: [
          { from: 'sun', to: 'puddle', label: 'warms' },
          { from: 'puddle', to: 'v1', label: 'water leaves as vapor' }
        ],
        steps: [
          { id: 's1', label: 'The sun warms the water', note: 'Heat makes the tiny water bits move faster.', move: ['sun', 'heat'] },
          { id: 's2', label: 'The water bits jiggle faster', note: 'Warmer water means faster, jigglier bits.', move: ['p1', 'p2'] },
          { id: 's3', label: 'Some bits fly into the air', note: 'The fastest bits leave the water as vapor.', move: ['v1'] },
          { id: 's4', label: 'That is evaporation!', note: 'Liquid water became water vapor in the air.', move: [] }
        ],
        interactions: []
      },
      step_diagram: {
        elements: [
          { id: 'sun', shape: 'sun', x: 240, y: 20, w: 56, h: 56, label: 'Sun' },
          { id: 'puddle', shape: 'puddle', x: 60, y: 190, w: 200, h: 70, label: 'Water' },
          { id: 'v1', shape: 'vapor', x: 130, y: 140, w: 22, h: 22, label: 'Vapor' }
        ],
        relationships: [
          { from: 'sun', to: 'puddle', label: 'warms' },
          { from: 'puddle', to: 'v1', label: 'becomes vapor' }
        ],
        steps: [
          { id: 'd1', label: 'Step 1: heat touches the water', note: 'The sun warms the puddle.', move: ['sun'] },
          { id: 'd2', label: 'Step 2: bits speed up', note: 'Warm bits jiggle faster and faster.', move: [] },
          { id: 'd3', label: 'Step 3: vapor rises', note: 'Water leaves the puddle as vapor.', move: ['v1'] }
        ],
        interactions: []
      },
      diagram: {
        elements: [
          { id: 'puddle', shape: 'puddle', x: 60, y: 190, w: 200, h: 70, label: 'Liquid water' },
          { id: 'v1', shape: 'vapor', x: 130, y: 140, w: 22, h: 22, label: 'Water vapor' },
          { id: 'sun', shape: 'sun', x: 240, y: 20, w: 56, h: 56, label: 'Heat from the sun' }
        ],
        relationships: [{ from: 'sun', to: 'puddle', label: 'warms' }, { from: 'puddle', to: 'v1', label: 'evaporates' }],
        steps: [],
        interactions: []
      }
    }
  },
  plant_parts: {
    title: 'Parts of a plant',
    concept: 'A plant has parts, and each part does its own job.',
    explanation: 'Roots hold the plant and drink water. The stem carries the water up. Leaves catch sunlight. The flower makes seeds.',
    representations: {
      interactive_diagram: {
        // Element order doubles as the grade-trim priority: the pedagogically
        // core parts (stem, roots) survive the youngest-grade budgets first.
        elements: [
          { id: 'stem', shape: 'plant_stem', x: 156, y: 90, w: 16, h: 130, label: 'Stem' },
          { id: 'roots', shape: 'plant_root', x: 110, y: 220, w: 110, h: 60, label: 'Roots' },
          { id: 'leaf1', shape: 'plant_leaf', x: 80, y: 110, w: 54, h: 40, label: 'Leaf' },
          { id: 'flower', shape: 'plant_flower', x: 140, y: 30, w: 60, h: 60, label: 'Flower' },
          { id: 'leaf2', shape: 'plant_leaf', x: 190, y: 130, w: 54, h: 40, label: 'Leaf' }
        ],
        relationships: [
          { from: 'roots', to: 'stem', label: 'water travels up' },
          { from: 'stem', to: 'leaf1', label: 'feeds the leaves' }
        ],
        steps: [],
        interactions: [
          { elementId: 'roots', revealText: 'Roots hold the plant in the soil and drink water.' },
          { elementId: 'stem', revealText: 'The stem carries water and food up the plant.' },
          { elementId: 'leaf1', revealText: 'Leaves catch sunlight to make plant food.' },
          { elementId: 'flower', revealText: 'The flower makes seeds for new plants.' }
        ]
      },
      diagram: {
        elements: [
          { id: 'flower', shape: 'plant_flower', x: 140, y: 30, w: 60, h: 60, label: 'Flower — seeds' },
          { id: 'stem', shape: 'plant_stem', x: 156, y: 90, w: 16, h: 130, label: 'Stem — carries water' },
          { id: 'roots', shape: 'plant_root', x: 110, y: 220, w: 110, h: 60, label: 'Roots — drink water' }
        ],
        relationships: [{ from: 'roots', to: 'stem', label: 'water travels up' }],
        steps: [],
        interactions: []
      },
      step_diagram: {
        elements: [
          { id: 'roots', shape: 'plant_root', x: 110, y: 220, w: 110, h: 60, label: 'Roots' },
          { id: 'stem', shape: 'plant_stem', x: 156, y: 90, w: 16, h: 130, label: 'Stem' },
          { id: 'leaf1', shape: 'plant_leaf', x: 80, y: 110, w: 54, h: 40, label: 'Leaf' }
        ],
        relationships: [],
        steps: [
          { id: 'p1', label: 'Roots drink water', note: 'Roots take water from the soil.', move: ['roots'] },
          { id: 'p2', label: 'The stem carries it up', note: 'Water travels up the stem.', move: ['stem'] },
          { id: 'p3', label: 'Leaves catch sunlight', note: 'Leaves use light to make food.', move: ['leaf1'] }
        ],
        interactions: []
      }
    }
  }
});

/** Help-kind → allowed representation types (the § integration mapping). */
const KIND_REPRESENTATIONS = Object.freeze({
  show_me: ['process_animation', 'interactive_diagram', 'diagram'],
  break_it_down: ['step_diagram', 'diagram'],
  make_simpler: ['diagram'],
  give_example: ['real_life_scene'],
  real_life_example: ['real_life_scene'],
  funny_example: ['real_life_scene'],
  tell_me: []
});

/* ───────────────────────── text safety helpers ───────────────────────── */

function normalizeText(value, max) {
  const t = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (t.length > max) return null;
  // Visual specs are declarative: no markup, entities, or script URLs may
  // hide in any text node. The renderer sets textContent exclusively, but
  // validation fails closed as well (no arbitrary HTML/JS by construction).
  if (/<\s*\/?\s*[a-z][^>]*>|&(#x?[0-9a-f]+|[a-z]+);|javascript:/i.test(t)) return null;
  if (FORBIDDEN_CONTENT_PATTERNS.some((p) => p.test(t))) return null;
  return t;
}

function isBoundedNumber(v, lo, hi) {
  return typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
}

/* ───────────────────────── spec validation (fail-closed) ───────────────────────── */

const ELEMENT_KEYS = Object.freeze(['id', 'shape', 'x', 'y', 'w', 'h', 'label']);
const STEP_KEYS = Object.freeze(['id', 'label', 'note', 'move']);
const INTERACTION_KEYS = Object.freeze(['elementId', 'revealText']);
const RELATIONSHIP_KEYS = Object.freeze(['from', 'to', 'label']);
const SPEC_KEYS = Object.freeze([
  'specVersion', 'visualId', 'representationType', 'objectiveId', 'grade', 'title', 'concept',
  'explanation', 'elements', 'relationships', 'steps', 'interactions', 'completion',
  'accessibility', 'grounding', 'scaffold'
]);

function validId(v) {
  return typeof v === 'string' && /^[a-z0-9_]{1,24}$/.test(v);
}

// Objective ids are anchored to the REAL ALE registry, whose longest id
// (sentence_completion_basic, 26 chars) exceeds the generic 24-char element
// cap — same strict character class, slightly longer bound.
function validObjectiveId(v) {
  return typeof v === 'string' && /^[a-z0-9_]{1,40}$/.test(v);
}

function validVisualId(v) {
  return typeof v === 'string' && /^[a-z0-9_]{1,64}$/.test(v);
}

/**
 * Validate a visual-explanation spec. Fail-closed: returns
 * `{ ok: false, errors }` for ANY deviation from the bounded contract.
 * @param {object} spec
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateVisualSpec(spec) {
  const errors = [];
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    return { ok: false, errors: ['Visual spec is required.'] };
  }
  for (const key of Object.keys(spec)) {
    if (!SPEC_KEYS.includes(key)) errors.push(`Unknown spec key "${key}" (whitelist violated).`);
  }
  if (spec.specVersion !== 1) errors.push('specVersion must be 1.');
  if (!validVisualId(spec.visualId || '')) errors.push('visualId must be a short [a-z0-9_] id (≤64).');
  const rep = VISUAL_REPRESENTATION_TYPES[spec.representationType];
  if (!rep || !rep.implemented) errors.push(`representationType "${spec.representationType}" is not an implemented type.`);
  if (!validObjectiveId(spec.objectiveId || '')) errors.push('objectiveId must be a short id.');
  if (!CANONICAL_GRADES.includes(spec.grade)) errors.push('grade must be a canonical grade.');
  if (!normalizeText(spec.title, SPEC_LIMITS.titleChars)) errors.push('title is required (≤80 chars, tone-safe).');
  if (!normalizeText(spec.concept, SPEC_LIMITS.conceptChars)) errors.push('concept is required (≤120 chars, tone-safe).');
  if (!normalizeText(spec.explanation, SPEC_LIMITS.explanationChars)) errors.push('explanation is required (≤240 chars, tone-safe).');

  const elements = spec.elements;
  if (!Array.isArray(elements) || elements.length === 0 || elements.length > SPEC_LIMITS.elements) {
    errors.push(`elements must be a non-empty array (≤${SPEC_LIMITS.elements}).`);
  } else {
    const ids = new Set();
    for (const el of elements) {
      for (const key of Object.keys(el)) {
        if (!ELEMENT_KEYS.includes(key)) errors.push(`Unknown element key "${key}".`);
      }
      if (!validId(el.id) || ids.has(el.id)) errors.push(`element id "${el.id}" must be unique [a-z0-9_].`);
      ids.add(el.id);
      if (!VISUAL_ELEMENT_SHAPES.includes(el.shape)) errors.push(`element "${el.id}" shape "${el.shape}" is not a whitelisted primitive.`);
      if (!isBoundedNumber(el.x, 0, 400) || !isBoundedNumber(el.y, 0, 300) || !isBoundedNumber(el.w, 4, 320) || !isBoundedNumber(el.h, 4, 240)) {
        errors.push(`element "${el.id}" coordinates out of the bounded stage.`);
      }
      if (el.label !== undefined && el.label !== '' && !normalizeText(el.label, SPEC_LIMITS.labelChars)) {
        errors.push(`element "${el.id}" label must be ≤${SPEC_LIMITS.labelChars} tone-safe chars.`);
      }
    }
    const knownIds = new Set(elements.map((el) => el.id));
    const rels = spec.relationships;
    if (!Array.isArray(rels) || rels.length > SPEC_LIMITS.relationships) {
      errors.push(`relationships must be an array (≤${SPEC_LIMITS.relationships}).`);
    } else {
      for (const r of rels) {
        for (const key of Object.keys(r)) {
          if (!RELATIONSHIP_KEYS.includes(key)) errors.push(`Unknown relationship key "${key}".`);
        }
        if (!knownIds.has(r.from) || !knownIds.has(r.to)) errors.push(`relationship "${r.from}→${r.to}" references unknown elements.`);
        if (r.label !== undefined && !normalizeText(r.label, SPEC_LIMITS.labelChars)) errors.push('relationship label too long or unsafe.');
      }
    }
    const steps = spec.steps;
    if (!Array.isArray(steps) || steps.length > SPEC_LIMITS.steps) {
      errors.push(`steps must be an array (≤${SPEC_LIMITS.steps}).`);
    } else {
      for (const s of steps) {
        for (const key of Object.keys(s)) {
          if (!STEP_KEYS.includes(key)) errors.push(`Unknown step key "${key}".`);
        }
        if (!validId(s.id)) errors.push('step id invalid.');
        if (!normalizeText(s.label, SPEC_LIMITS.labelChars)) errors.push('step label required (≤60 chars).');
        if (s.note !== undefined && !normalizeText(s.note, SPEC_LIMITS.stepNoteChars)) errors.push('step note too long or unsafe.');
        if (!Array.isArray(s.move) || s.move.some((m) => !knownIds.has(m))) errors.push('step move must reference known element ids.');
      }
    }
    const interactions = spec.interactions;
    if (!Array.isArray(interactions) || interactions.length > SPEC_LIMITS.interactions) {
      errors.push(`interactions must be an array (≤${SPEC_LIMITS.interactions}).`);
    } else {
      for (const it of interactions) {
        for (const key of Object.keys(it)) {
          if (!INTERACTION_KEYS.includes(key)) errors.push(`Unknown interaction key "${key}".`);
        }
        if (!knownIds.has(it.elementId)) errors.push(`interaction element "${it.elementId}" unknown.`);
        if (!normalizeText(it.revealText, SPEC_LIMITS.revealChars)) errors.push('interaction revealText required (≤120 chars).');
      }
    }
    // Unknown/unimplemented types already pushed an error above — the type
    // specific interaction/step rules only apply to a KNOWN type.
    if (rep) {
      if (rep.interactive && interactions.length === 0) errors.push('interactive_diagram requires ≥1 interaction.');
      if (rep.animated && steps.length < 2) errors.push('process_animation requires ≥2 steps.');
    }
  }

  const acc = spec.accessibility;
  if (!acc || typeof acc !== 'object') {
    errors.push('accessibility block is required.');
  } else {
    if (!normalizeText(acc.textAlternative, SPEC_LIMITS.textAlternativeChars)) errors.push('accessibility.textAlternative required (≤400 chars).');
    if (acc.reducedMotionSafe !== true || acc.replayable !== true) errors.push('accessibility must be reducedMotionSafe + replayable.');
    if (acc.minTargetPx !== 44) errors.push('accessibility.minTargetPx must be 44.');
  }
  const grounding = spec.grounding;
  if (!grounding || grounding.objectiveId !== spec.objectiveId || grounding.grade !== spec.grade
    || !['verified_material', 'curated_objective'].includes(grounding.basis)) {
    errors.push('grounding block must bind the spec to its objective + grade + basis.');
  }
  const completion = spec.completion;
  if (!completion || !['all_steps_viewed', 'all_interactions'].includes(completion.type)) {
    errors.push('completion.type must be all_steps_viewed or all_interactions.');
  }
  const sc = spec.scaffold;
  if (!sc || !Number.isInteger(sc.scaffoldingLevel) || sc.scaffoldingLevel < 1 || sc.scaffoldingLevel > 3) {
    errors.push('scaffold.scaffoldingLevel must be an integer 1..3.');
  }

  return { ok: errors.length === 0, errors };
}

/* ───────────────────────── grade trimming (deterministic) ───────────────────────── */

/**
 * Trim a template representation to the grade budget: keep the FIRST N
 * elements/steps/interactions (declaration order is the pedagogical order),
 * drop relationships referencing trimmed elements, keep interactivity sane.
 */
function trimForGrade(representation, budget) {
  const elements = representation.elements.slice(0, budget.maxElements);
  const kept = new Set(elements.map((e) => e.id));
  const steps = representation.steps.slice(0, budget.maxSteps).map((s) => ({
    ...s,
    move: (s.move || []).filter((m) => kept.has(m))
  }));
  const interactions = representation.interactions
    .filter((it) => kept.has(it.elementId))
    .slice(0, budget.maxInteractions);
  const relationships = representation.relationships.filter((r) => kept.has(r.from) && kept.has(r.to));
  return { elements, steps, interactions, relationships };
}

/* ───────────────────────── public API ───────────────────────── */

/**
 * Build a bounded visual-explanation spec (the Representation Selector).
 *
 * @param {object} input
 * @param {string} input.kind help kind requested (show_me, break_it_down, ...)
 * @param {string} input.objectiveId curated ALE objective id
 * @param {string} input.grade canonical learner grade
 * @param {string} [input.skillId]
 * @param {object|null} [input.material] verified material grounding
 *   { materialId, sourceExcerpt } from buildMaterialsByObjective
 * @returns {{ ok: true, visual: object } | { ok: false, reason: string, errors?: string[] }}
 */
/* ───────────── activity grounding ───────────── */

/**
 * Maximum label length accepted from activity context. Anything longer is
 * treated as free text and refused, so a child-typed string can never reach a
 * visual spec.
 */
const MAX_CONTEXT_LABEL_CHARS = 12;

/**
 * Reduce an activity-context value to a safe display token.
 *
 * Accepts only short single words made of letters/apostrophes/hyphens (the
 * shape of the curated WORD_BUILD_WORDS / SYLLABLE_WORDS vocabulary) or a short
 * pre-segmented word run. Anything else — a sentence, punctuation, markup, an
 * empty string, the correct answer — returns null so the template keeps its own
 * canonical label.
 */
function safeContextToken(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_CONTEXT_LABEL_CHARS) return null;
  if (!/^[A-Za-z][A-Za-z'-]*(\s+[A-Za-z][A-Za-z'-]*)*$/.test(trimmed)) return null;
  return trimmed;
}

/** Syllables of a short word, split conservatively. Never guesses silently. */
function simpleSyllables(word) {
  const token = safeContextToken(word);
  if (!token || /\s/.test(token)) return [];
  const groups = token.toLowerCase().match(/[aeiouy]+/g);
  if (!groups || groups.length === 0) return [];
  return groups.slice(0, 4);
}

/**
 * Produce a copy of `representation` whose labels reflect the live activity.
 *
 * Only these substitutions are performed, and each is a pure relabel:
 * - word_build (decode_cvc_words): the three letter tiles and the joined word
 * - syllable_split (syllable_counting_1): the syllable chunks and the whole word
 * - sentence_mc (sentence_completion_basic): the sentence word tiles
 *
 * Geometry, steps, relationships, interactions, and the concept/explanation
 * text are left exactly as authored, and the whole thing still has to pass
 * `validateVisualSpec` downstream.
 */
function applyActivityContext(representation, objectiveId, activity) {
  if (!activity || typeof activity !== 'object') return representation;

  const clone = {
    ...representation,
    elements: Array.isArray(representation.elements) ? representation.elements.map((e) => ({ ...e })) : [],
    steps: Array.isArray(representation.steps) ? representation.steps.map((s) => ({ ...s })) : [],
    relationships: Array.isArray(representation.relationships) ? representation.relationships : representation.relationships,
    interactions: Array.isArray(representation.interactions) ? representation.interactions.map((i) => ({ ...i })) : []
  };

  const byId = new Map(clone.elements.map((e) => [e.id, e]));
  const setLabel = (id, value) => {
    const el = byId.get(id);
    if (el && typeof value === 'string' && value.length > 0) el.label = value;
  };

  if (objectiveId === 'decode_cvc_words') {
    const word = safeContextToken(activity.targetWord || activity.word);
    if (word) {
      const letters = word.replace(/[^A-Za-z]/g, '').slice(0, 3).split('');
      if (letters.length === 3) {
        setLabel('l1', letters[0].toLowerCase());
        setLabel('l2', letters[1].toLowerCase());
        setLabel('l3', letters[2].toLowerCase());
        setLabel('word', word.toLowerCase());
        // Keep the spoken-sound reveals truthful about the new word.
        for (const interaction of clone.interactions) {
          if (interaction.elementId === 'l1') interaction.revealText = `${letters[0].toLowerCase()} is the first sound of ${word.toLowerCase()}.`;
          if (interaction.elementId === 'l2') interaction.revealText = `${letters[1].toLowerCase()} is the middle sound of ${word.toLowerCase()}.`;
          if (interaction.elementId === 'l3') interaction.revealText = `${letters[2].toLowerCase()} is the last sound of ${word.toLowerCase()}.`;
        }
      }
    }
    return clone;
  }

  if (objectiveId === 'syllable_counting_1') {
    const word = safeContextToken(activity.targetWord || activity.word);
    const chunks = simpleSyllables(word || '');
    if (chunks.length >= 2 && chunks.length <= 3) {
      setLabel('c1', chunks[0]);
      setLabel('c2', chunks[1]);
      if (chunks.length === 3) setLabel('c3', chunks[2]);
      setLabel('whole', String(word).toLowerCase());
      for (const step of clone.steps) {
        if (step.id === 's1' && typeof step.note === 'string') {
          step.note = `${chunks.join(' · ')} — ${chunks.length} claps.`;
        }
        if (step.id === 's3' && typeof step.note === 'string') {
          step.note = `Chunks together say ${String(word).toLowerCase()}!`;
        }
      }
      const ids = ['c1', 'c2', chunks.length === 3 ? 'c3' : null].filter(Boolean);
      clone.interactions = clone.interactions.filter((i) => ids.includes(i.elementId));
      ids.forEach((id, index) => {
        const match = clone.interactions.find((i) => i.elementId === id);
        if (match) match.revealText = `${chunks[index]} — ${index === 0 ? 'one' : index === 1 ? 'the next' : 'the last'} clap.`;
      });
    }
    return clone;
  }

  if (objectiveId === 'sentence_completion_basic') {
    // The sentence under discussion, already segmented by the activity
    // contract. Only the words are used — never the option list or answer.
    const words = Array.isArray(activity.sentenceWords) ? activity.sentenceWords : [];
    const safe = words.map(safeContextToken).filter(Boolean).slice(0, 3);
    if (safe.length >= 2) {
      setLabel('w1', safe[0]);
      setLabel('w2', safe[1]);
      if (safe.length === 3) setLabel('w3', safe[2]);
      setLabel('sentence', safe.join(' '));
    }
    return clone;
  }

  return clone;
}

export function buildVisualExplanation({ kind, objectiveId, grade, skillId = null, material = null, activity = null }) {
  if (!KIND_REPRESENTATIONS[kind]) {
    return { ok: false, reason: 'kind_not_visual' };
  }
  const allowedTypes = KIND_REPRESENTATIONS[kind];
  const template = VISUAL_TEMPLATES[objectiveId];
  if (!template) {
    return { ok: false, reason: 'no_curated_visual' };
  }
  const objective = OBJECTIVE_BY_ID[objectiveId];
  if (!objective) {
    return { ok: false, reason: 'unknown_objective' };
  }
  // Grade grounding gate: the objective must actually cover this grade.
  if (!CANONICAL_GRADES.includes(grade) || !objective.gradeRange.includes(grade)) {
    return { ok: false, reason: 'grade_not_covered' };
  }
  const budget = GRADE_VISUAL_BUDGETS[grade];
  if (!budget) {
    return { ok: false, reason: 'grade_not_covered' };
  }
  // Representation selection: first ALLOWED type the template offers.
  const repType = allowedTypes.find((t) => template.representations[t]);
  if (!repType) {
    return { ok: false, reason: 'representation_unavailable_for_kind' };
  }
  // Activity grounding: relabel the curated template with the words the child
  // is ACTUALLY working with, so a word_build on "pen" does not show "sun" and
  // a syllable split on "octopus" does not show "butterfly". Labels are replaced
  // only when the incoming value is a short, safe, app-produced token; the
  // template's geometry, steps, and relationships are untouched.
  const representation = applyActivityContext(template.representations[repType], objectiveId, activity);
  const trimmed = trimForGrade(representation, budget);
  const repMeta = VISUAL_REPRESENTATION_TYPES[repType];

  const visualId = `vis_${objectiveId}_${repType}_${CANONICAL_GRADES.indexOf(grade)}`;
  const basis = material?.materialId ? 'verified_material' : 'curated_objective';
  const spec = {
    specVersion: 1,
    visualId,
    representationType: repType,
    objectiveId,
    grade,
    title: template.title,
    concept: template.concept,
    explanation: template.explanation,
    elements: trimmed.elements,
    relationships: trimmed.relationships,
    steps: trimmed.steps,
    interactions: trimmed.interactions,
    completion: { type: repMeta.interactive ? 'all_interactions' : 'all_steps_viewed' },
    accessibility: {
      textAlternative: `${template.explanation} (This picture shows: ${template.concept})`,
      reducedMotionSafe: true,
      replayable: true,
      minTargetPx: 44
    },
    grounding: {
      objectiveId,
      grade,
      materialId: material?.materialId || null,
      basis
    },
    scaffold: { scaffoldingLevel: budget.scaffoldingLevel }
  };

  const check = validateVisualSpec(spec);
  if (!check.ok) {
    // Fail-closed: a template bug must never reach the child — text fallback.
    return { ok: false, reason: 'spec_validation_failed', errors: check.errors };
  }
  return { ok: true, visual: Object.freeze(spec) };
}

/** Whether a curated visual template exists for an objective (diagnostics). */
export function hasVisualTemplate(objectiveId) {
  return Object.prototype.hasOwnProperty.call(VISUAL_TEMPLATES, objectiveId);
}

/** Implemented representation types (diagnostics/tests). */
export function implementedRepresentationTypes() {
  return Object.entries(VISUAL_REPRESENTATION_TYPES)
    .filter(([, meta]) => meta.implemented)
    .map(([id]) => id);
}
