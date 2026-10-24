/**
 * Grade Vocabulary (§8A ALIGN-3)
 *
 * Curated, bounded per-grade token sets used to decide whether a "novel" term
 * introduced by generated content is acceptable. NEVER model-derived: these
 * sets are curated, frozen in the registry, and unit-testable. A term not
 * found here and not grounded in the objective/excerpt is rejected.
 *
 * Sets are intentionally small but meaningful: a generated sentence may
 * introduce at most MAX_NOVEL_TERMS terms and each must appear in the
 * learner's grade set (or the set of an adjacent grade that is underage-safe
 * is NOT used — strict grade match only).
 */

export const GRADE_VOCABULARY = Object.freeze({
  Kindergarten: Object.freeze([
    'dog', 'cat', 'sun', 'moon', 'ball', 'car', 'tree', 'hat', 'book', 'cup',
    'house', 'door', 'bed', 'red', 'blue', 'big', 'small', 'hot', 'cold',
    'run', 'jump', 'play', 'eat', 'sleep', 'happy', 'sad', 'one', 'two', 'three'
  ]),
  '1st Grade': Object.freeze([
    'dog', 'cat', 'sun', 'moon', 'ball', 'car', 'tree', 'hat', 'book', 'cup',
    'house', 'door', 'bed', 'red', 'blue', 'big', 'small', 'hot', 'cold',
    'run', 'jump', 'play', 'eat', 'sleep', 'happy', 'sad', 'one', 'two', 'three',
    'bird', 'fish', 'boat', 'truck', 'cloud', 'rain', 'snow', 'grow', 'seed',
    'leaves', 'bark', 'howl', 'buzz', 'bright', 'warm', 'soft', 'tall', 'short',
    'find', 'make', 'read', 'write', 'five', 'ten', 'sum'
  ]),
  '2nd Grade': Object.freeze([
    'dog', 'cat', 'sun', 'moon', 'ball', 'car', 'tree', 'hat', 'book', 'cup',
    'house', 'door', 'bed', 'red', 'blue', 'big', 'small', 'hot', 'cold',
    'run', 'jump', 'play', 'eat', 'sleep', 'happy', 'sad', 'one', 'two', 'three',
    'bird', 'fish', 'boat', 'truck', 'cloud', 'rain', 'snow', 'grow', 'seed',
    'leaves', 'bark', 'howl', 'buzz', 'bright', 'warm', 'soft', 'tall', 'short',
    'find', 'make', 'read', 'write', 'five', 'ten', 'sum',
    'ocean', 'forest', 'desert', 'farm', 'sky', 'water', 'plant', 'root',
    'stem', 'leaf', 'flower', 'soil', 'morning', 'night', 'day', 'noon',
    'before', 'after', 'first', 'last', 'circle', 'square', 'triangle'
  ]),
  '3rd Grade': Object.freeze([
    'water', 'air', 'soil', 'sunlight', 'plant', 'root', 'stem', 'leaf',
    'flower', 'seed', 'grow', 'change', 'heat', 'warm', 'cool', 'vapour',
    'cloud', 'rain', 'wind', 'animal', 'forest', 'ocean', 'desert', 'habitat',
    'life', 'body', 'order', 'size', 'weight', 'group', 'season', 'spring',
    'summer', 'autumn', 'winter', 'shelter', 'food', 'move', 'protect',
    'energy', 'direction', 'measure', 'save', 'collect', 'nine', 'three', 'five'
  ]),
  '4th Grade': Object.freeze([
    'water', 'air', 'soil', 'sunlight', 'plant', 'root', 'stem', 'leaf',
    'flower', 'seed', 'grow', 'change', 'heat', 'warm', 'cool', 'vapour',
    'cloud', 'rain', 'wind', 'animal', 'forest', 'ocean', 'desert', 'habitat',
    'life', 'body', 'order', 'size', 'weight', 'group', 'season', 'spring',
    'summer', 'autumn', 'winter', 'shelter', 'food', 'move', 'protect',
    'energy', 'direction', 'measure', 'save', 'collect',
    'process', 'cycle', 'temperature', 'matter', 'solid', 'liquid', 'vapour',
    'evaporation', 'surface', 'property', 'observe', 'record', 'predict'
  ]),
  '5th Grade': Object.freeze([
    'water', 'air', 'soil', 'sunlight', 'plant', 'root', 'stem', 'leaf',
    'flower', 'seed', 'grow', 'change', 'heat', 'warm', 'cool', 'vapour',
    'cloud', 'rain', 'wind', 'animal', 'forest', 'ocean', 'desert', 'habitat',
    'life', 'body', 'order', 'size', 'weight', 'group', 'season', 'spring',
    'summer', 'autumn', 'winter', 'shelter', 'food', 'move', 'protect',
    'energy', 'direction', 'measure', 'save', 'collect',
    'process', 'cycle', 'temperature', 'matter', 'solid', 'liquid', 'vapour',
    'evaporation', 'surface', 'property', 'observe', 'record', 'predict',
    'density', 'volume', 'gravity', 'force', 'motion', 'element', 'mixture'
  ]),
  '6th Grade': Object.freeze([
    'water', 'air', 'soil', 'sunlight', 'plant', 'root', 'stem', 'leaf',
    'flower', 'seed', 'grow', 'change', 'heat', 'warm', 'cool', 'vapour',
    'cloud', 'rain', 'wind', 'animal', 'forest', 'ocean', 'desert', 'habitat',
    'life', 'body', 'order', 'size', 'weight', 'group', 'season', 'spring',
    'summer', 'autumn', 'winter', 'shelter', 'food', 'move', 'protect',
    'energy', 'direction', 'measure', 'save', 'collect',
    'process', 'cycle', 'temperature', 'matter', 'solid', 'liquid', 'vapour',
    'evaporation', 'surface', 'property', 'observe', 'record', 'predict',
    'density', 'volume', 'gravity', 'force', 'motion', 'element', 'mixture',
    'absorb', 'reflect', 'convert', 'variable', 'constant', 'evidence'
  ])
});

export const GRADE_VOCAB_DEFAULTS = Object.freeze({
  MAX_NOVEL_TERMS: 3
});

/**
 * Common English function words — always excluded from term extraction. They
 * carry no curriculum signal, so they can never count toward ALIGN-2 and are
 * never flagged as novel in ALIGN-3.
 */
export const STOPWORDS = new Set(
  (
    'the a an and or but if then so for with without of in on at to from by ' +
    'that this these those it its as is are was were be been being do does did ' +
    'not no yes have has had will would can could should shall may might must ' +
    'about above after again against all always any around because before ' +
    'below between both during each else even every few first following here ' +
    'how into just like most much my near next now off once only other our ' +
    'out over own per same since some still such than though through till ' +
    'toward under until up very via when where which while who whom why your '
  ).split(/\s+/)
);

/**
 * Shared core vocabulary — extremely common, child-safe words allowed at ANY
 * grade. They do NOT satisfy ALIGN-2 coverage but may appear as ≤MAX_NOVEL_TERMS
 * non-frequency words without tripping ALIGN-3.
 */
export const CORE_COMMON = new Set((
  'called call make made name same way far stay still thing things think thought ' +
  'know know that again never always every away around together sometimes ' +
  'little many much more most less few some any another other water time ' +
  'day today night place part start end go going goes come came see saw look ' +
  'find found give gave take took put show show today use used help hold ' +
  'keep build turn let get got want need like love play work live move talk ' +
  'walk run stop begin try feel feel good nice great cool best better ready ' +
  'happy glad warm clean dark light sound fun easy hard high low left right ' +
  'top bottom here there where why how what who when'
).split(/\s+/));

/**
 * Deterministic term extraction: lowercase tokens, strip punctuation, drop
 * stopwords, collapse plurals.
 * @param {string} text
 * @returns {string[]} unique content lemmas
 */
export function extractTerms(text) {
  if (!text) return [];
  const tokens = String(text)
    .toLowerCase()
    .replace(/[.,;:!?()"“”'/]/g, ' ')
    .split(/\s+/)
    .filter((t) => /^[a-z]+$/.test(t) && !STOPWORDS.has(t));
  return [...new Set(tokens.map((t) => (t.endsWith('s') && t.length > 3 ? t.slice(0, -1) : t)))];
}

/**
 * Whether a single term is allowed to be "novel" at the grade: either a
 * common core word or a member of the curated grade set (strict).
 */
export function isTermAllowedAtGrade(term, grade) {
  const clean = term.toLowerCase().replace(/s$/, '');
  if (CORE_COMMON.has(clean)) return true;
  const set = GRADE_VOCABULARY[grade];
  if (!set) return false;
  return set.includes(clean);
}