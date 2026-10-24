/**
 * Screening Quest Engine.
 * Pure logic service: quest orchestration, task selection, adaptive difficulty,
 * and deterministic baseline computation.
 *
 * No LLM dependency. All scoring is rule-based and explainable.
 */
import {
  CATEGORIES,
  TASK_TEMPLATES,
  MAX_DIFFICULTY,
  DEFAULT_TASKS_PER_QUEST
} from './task-templates.js';

const STRUGGLE_ACCURACY_THRESHOLD = 0.65;
const STRUGGLE_TIME_MULTIPLIER = 1.5;
const MIN_DIFFICULTY = 1;

/* ─────────────────────── option-order balancing ─────────────────────── */

/**
 * The screening templates stored their answer key at a FIXED position: 36 of 67
 * templates put it first, 24 second, 7 third, and never last — and every single
 * `sentence_completion` item had it first. A child (or an adult reading along)
 * could score well by always picking the first button, which measures nothing
 * about reading. The fix reorders the OPTIONS at presentation time only; the
 * template's `correctAnswer` value and every grading path are untouched because
 * screening is graded by option TEXT (`selectedAnswer === correctAnswer`).
 */

/** Deterministic 32-bit string hash (FNV-1a), seeded shuffling only. */
function seedFrom(str) {
  let hash = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash >>> 0;
}

/** Small deterministic PRNG (mulberry32). Same seed → same permutation. */
function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(items, rng) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Create a per-quest answer-position balancer.
 *
 * Every presented item gets a deterministic permutation of its options, seeded
 * from (quest seed, task id, presentation index) so a replayed quest is
 * identical and nothing is random at answer time. On top of that, the balancer
 * steers the key toward the positions used least so far in the quest, which is
 * what actually removes the bias: across a full 15-task quest the key lands on
 * each position roughly evenly instead of clustering, and the least-used rule
 * also prevents the key from sitting on the same position twice in a row when an
 * alternative is available. The permutation is still seed-driven, so the
 * resulting order is not a repeating A/B/C/D cycle.
 *
 * @param {object} [options]
 * @param {string|number} [options.seed] quest seed (learner/session derived)
 * @returns {{ order: (task: object, presentationIndex?: number) => object }}
 */
export function createOptionBalancer({ seed = 'quest' } = {}) {
  const used = new Map(); // optionCount -> counts per position
  const lastUsed = new Map(); // optionCount -> last position used

  function order(task, presentationIndex = 0) {
    if (!task || !Array.isArray(task.options) || task.options.length < 2) return task;
    const optionCount = task.options.length;
    if (!used.has(optionCount)) {
      used.set(optionCount, new Array(optionCount).fill(0));
      lastUsed.set(optionCount, -1);
    }
    const counts = used.get(optionCount);
    const previous = lastUsed.get(optionCount);

    // Least-used positions, with the previously used one deprioritized so the
    // key does not repeat back-to-back unless the options are exhausted.
    const minCount = Math.min(...counts);
    let candidates = counts.map((_, i) => i).filter((i) => counts[i] === minCount);
    if (candidates.length > 1 && previous >= 0 && candidates.includes(previous)) {
      candidates = candidates.filter((i) => i !== previous);
    }

    const rng = makeRng(seedFrom(`${seed}|${task.id}|${presentationIndex}|${optionCount}`));
    const target = candidates[Math.floor(rng() * candidates.length)];

    const correctIndex = task.options.indexOf(task.correctAnswer);
    if (correctIndex < 0) return task;

    const others = shuffled(
      task.options.filter((_, i) => i !== correctIndex),
      rng
    );
    const options = [...others];
    options.splice(target, 0, task.correctAnswer);

    counts[target] += 1;
    lastUsed.set(optionCount, target);

    return { ...task, options };
  }

  return { order };
}

/**
 * Convenience wrapper: reorder one task's options with a deterministic seed.
 * @param {object} task template
 * @param {object} [options] { seed, presentationIndex }
 * @returns {object} task with reordered `options` (same `correctAnswer` value)
 */
export function balanceTaskOptions(task, { seed = 'quest', presentationIndex = 0 } = {}) {
  return createOptionBalancer({ seed }).order(task, presentationIndex);
}

/**
 * Select tasks for a screening quest based on learner grade level.
 * Ensures coverage across all categories with difficulty start points
 * derived from the learner's age/grade band.
 *
 * @param {object} learnerProfile Canonical learner profile
 * @param {object} [options]
 * @param {number} [options.taskCount] Number of tasks per quest
 * @param {string[]} [options.categories] Categories to include
 * @returns {{ tasks: object[], startingDifficulties: object }}
 */
export function selectQuestTasks(learnerProfile, options = {}) {
  const taskCount = options.taskCount || DEFAULT_TASKS_PER_QUEST;
  const categories = options.categories || CATEGORIES;
  const grade = learnerProfile?.grade || '2nd Grade';
  const startingDifficulty = gradeStartingDifficulty(grade);

  const perCategoryCount = Math.max(2, Math.floor(taskCount / categories.length));

  const selected = [];
  const usedIds = new Set();
  const startingDifficulties = {};
  // One balancer per quest keeps answer positions balanced across the WHOLE
  // quest, not per task.
  const balancer = createOptionBalancer({ seed: questSeed(learnerProfile) });
  const balancerSeed = questSeed(learnerProfile);

  for (const category of categories) {
    const startDiff = startingDifficulty;
    startingDifficulties[category] = startDiff;

    // Pick tasks at the starting difficulty, then branch to neighbors
    // to build a balanced, sequenced selection.
    const pool = TASK_TEMPLATES.filter(t =>
      t.category === category &&
      t.difficulty === startDiff &&
      !usedIds.has(t.id)
    );

    let candidates = pool.length > 0 ? pool : TASK_TEMPLATES.filter(t =>
      t.category === category &&
      !usedIds.has(t.id)
    );

    // Shuffle for variety, seeded per (quest, category) so the same learner
    // always gets the same quest — reproducible for a learner while still
    // varied across learners.
    candidates = shuffled(candidates, makeRng(seedFrom(`${balancerSeed}|sel|${category}`)));

    for (let i = 0; i < perCategoryCount && i < candidates.length; i++) {
      const task = candidates[i];
      const questIndex = selected.length;
      selected.push({
        ...balancer.order(task, questIndex),
        assignedDifficulty: task.difficulty,
        questIndex
      });
      usedIds.add(task.id);
    }
  }

  // If we still need more tasks, fill from remaining templates (any category)
  const remainingNeeded = taskCount - selected.length;
  if (remainingNeeded > 0) {
    const unused = shuffled(
      TASK_TEMPLATES.filter(t => !usedIds.has(t.id)),
      makeRng(seedFrom(`${balancerSeed}|fill`))
    );
    for (let i = 0; i < remainingNeeded && i < unused.length; i++) {
      const task = unused[i];
      const questIndex = selected.length;
      selected.push({
        ...balancer.order(task, questIndex),
        assignedDifficulty: task.difficulty,
        questIndex
      });
      usedIds.add(task.id);
    }
  }

  return { tasks: selected, startingDifficulties };
}

/**
 * Deterministic per-quest seed for option reordering. Derived from the learner
 * id (and the grade, which is part of the quest identity) so the same learner
 * gets a stable-but-not-fixed answer order, and two learners never share a
 * deterministic sequence by accident. No name, no age, no dates.
 * @param {object} learnerProfile
 * @returns {string}
 */
export function questSeed(learnerProfile) {
  return `${learnerProfile?.learnerId || 'anon'}|${learnerProfile?.grade || 'unknown'}`;
}

/**
 * Determine an appropriate starting difficulty tier for a grade level.
 * @param {string} grade
 * @returns {number} 1–5
 */
export function gradeStartingDifficulty(grade) {
  switch (grade) {
    case 'Kindergarten':
      return 1;
    case '1st Grade':
      return 2;
    case '2nd Grade':
      return 3;
    case '3rd Grade':
      return 3;
    case '4th Grade':
      return 4;
    case '5th Grade':
      return 4;
    case '6th Grade':
      return 5;
    default:
      return 2;
  }
}

/**
 * Compute the next task for a category given cumulative results.
 * Adaptive rule:
 *   - Last 2 answers in this category correct → difficulty + 1 (max MAX)
 *   - Last 2 answers in this category incorrect → difficulty - 1 (min 1)
 *   - Mixed or fewer than 2 signals → keep last difficulty used
 *
 * If no results exist yet for the category, returns a task at the current
 * difficulty (should be the grade-based starting difficulty provided by
 * the caller's initial quest list).
 *
 * @param {string} category Task category
 * @param {object[]} results Accumulated per-task results
 * @param {string[]} [excludedTaskIds] Task IDs already used in this quest
 * @returns {{ task: object|null }}
 */
export function getNextTask(category, results, excludedTaskIds = []) {
  const usedIds = new Set(excludedTaskIds);
  const categoryResults = results.filter(r => r.category === category);

  let difficulty = categoryResults.length > 0
    ? categoryResults[categoryResults.length - 1].difficulty
    : MIN_DIFFICULTY;

  const lastTwo = categoryResults.slice(-2);
  if (lastTwo.length >= 2) {
    const allCorrect = lastTwo.every(r => r.isCorrect);
    const allIncorrect = lastTwo.every(r => !r.isCorrect);

    if (allCorrect) {
      difficulty = Math.min(MAX_DIFFICULTY, difficulty + 1);
    } else if (allIncorrect) {
      difficulty = Math.max(MIN_DIFFICULTY, difficulty - 1);
    }
  }

  // Prefer an unused task at the adapted difficulty tier
  let candidates = TASK_TEMPLATES.filter(t =>
    t.category === category &&
    t.difficulty === difficulty &&
    !usedIds.has(t.id)
  );

  // Fall back to any unused task in the category
  if (candidates.length === 0) {
    candidates = TASK_TEMPLATES.filter(t =>
      t.category === category &&
      !usedIds.has(t.id)
    );
  }

  if (candidates.length === 0) {
    return { task: null };
  }

  // Deterministic pick: the same category/difficulty/usage state always yields
  // the same task, so an interrupted quest resumes identically.
  const seed = `${category}|${difficulty}|${usedIds.size}|${categoryResults.length}`;
  const task = shuffled(candidates, makeRng(seedFrom(`${seed}|next`)))[0];
  // Reorder options for presentation. Adaptive follow-up tasks are not part of
  // the opening quest's running balance, so this uses a stateless
  // deterministic permutation: it breaks the templates' fixed answer position
  // without disturbing the balance already established by the quest list.
  return {
    task: {
      ...balanceTaskOptions(task, { seed, presentationIndex: usedIds.size }),
      assignedDifficulty: task.difficulty
    }
  };
}

/**
 * Deterministic baseline computation from accumulated screening results.
 * Pure arithmetic. No LLM. No statistical modeling. No diagnosis.
 *
 * @param {object[]} results Per-task screening results
 * @returns {object} readingBaseline object (see implementation_plan.md)
 */
export function computeBaseline(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  const categoryGroups = groupBy(results, r => r.category);
  const categoryAccuracy = {};
  const avgResponseTimeMs = {};
  const difficultyReached = {};

  for (const [category, tasks] of Object.entries(categoryGroups)) {
    const correctCount = tasks.filter(t => t.isCorrect).length;
    categoryAccuracy[category] = round(correctCount / tasks.length);

    const avgTime = average(tasks.map(t => t.responseTimeMs));
    avgResponseTimeMs[category] = avgTime;

    const maxDifficulty = Math.max(...tasks.map(t => t.difficulty));
    difficultyReached[category] = maxDifficulty;
  }

  const totalCorrect = results.filter(r => r.isCorrect).length;
  const overallAccuracy = round(totalCorrect / results.length);
  const overallAvgTime = average(results.map(r => r.responseTimeMs));

  // Struggling categories: low accuracy OR notably slow average response
  const strugglingCategories = Object.entries(categoryAccuracy)
    .filter(([category, acc]) =>
      acc < STRUGGLE_ACCURACY_THRESHOLD ||
      (avgResponseTimeMs[category] > overallAvgTime * STRUGGLE_TIME_MULTIPLIER)
    )
    .map(([category]) => category);

  return {
    overallAccuracy,
    categoryAccuracy,
    avgResponseTimeMs,
    difficultyReached,
    totalTasksCompleted: results.length,
    strugglingCategories,
    computedAt: new Date().toISOString()
  };
}

/**
 * Create a new empty screening session descriptor.
 * @param {object} learnerProfile
 * @returns {object} Session object
 */
export function createSession(learnerProfile, taskCount) {
  return {
    sessionId: `session_${Date.now()}`,
    learnerId: learnerProfile?.learnerId || 'unknown',
    learnerGrade: learnerProfile?.grade || '2nd Grade',
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    taskCount,
    results: []
  };
}

/**
 * Validate a single screening task submission payload.
 * @param {object} payload
 * @returns {{ isValid: boolean, errors: string[], result?: object }}
 */
export function validateTaskSubmission(payload, { profile } = {}) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    errors.push('Task submission payload is required.');
    return { isValid: false, errors };
  }

  const task = TASK_TEMPLATES.find(t => t.id === payload.taskId);
  if (!task) {
    errors.push(`Unknown task template: ${payload.taskId}`);
  }

  if (typeof payload.isCorrect !== 'boolean') {
    errors.push('isCorrect must be a boolean.');
  }

  if (typeof payload.responseTimeMs !== 'number' || payload.responseTimeMs < 0) {
    errors.push('responseTimeMs must be a non-negative number.');
  }

  if (typeof payload.selectedAnswer !== 'string') {
    errors.push('selectedAnswer is required.');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Ground truth is recomputed MAIN-side from the template, never taken from
  // the renderer. `reportedCorrect` is retained only as an audit trail.
  const reportedCorrect = payload.isCorrect;
  const groundTruth = payload.selectedAnswer === task.correctAnswer;

  // WHERE the correct answer actually sat ON SCREEN.
  //
  // `task.options` here is the AUTHORED template order, which is not what the
  // learner saw: `selectQuestTasks` reorders options through the seeded
  // balancer, and that presented order exists only in the renderer's copy.
  // Recording the authored index would therefore audit the bias instead of the
  // fix.
  //
  // The balancer is deterministic per learner, so the presented order is
  // RECONSTRUCTED main-side from the same profile rather than trusted from the
  // renderer. Grading above never needed this: it compares values, so option
  // order cannot affect whether an answer is right.
  const presentedIndex = resolvePresentedOptionIndex({ taskId: task.id, profile });
  const optionCount = Array.isArray(task.options) ? task.options.length : 0;

  // Build a canonical result record
  // NOTE: screening is observational. If the taskTemplate's correctAnswer
  // comparison disagrees with the reported isCorrect, we trust the template
  // ground truth (deterministic). This guards against client tampering.
  const result = {
    taskId: task.id,
    category: task.category,
    difficulty: task.difficulty,
    prompt: task.prompt,
    type: task.type,
    selectedAnswer: payload.selectedAnswer,
    correctAnswer: task.correctAnswer,
    isCorrect: groundTruth,
    reportedCorrect: Boolean(reportedCorrect),
    responseTimeMs: payload.responseTimeMs,
    // Presented answer position, so answer-position bias is MEASURABLE rather
    // than merely "fixed". `null` means "not reconstructable" — an absent
    // measurement is recorded as absent, never guessed.
    correctOptionIndex: presentedIndex,
    selectedOptionIndex: typeof payload.selectedOptionIndex === 'number' && Number.isInteger(payload.selectedOptionIndex)
      ? payload.selectedOptionIndex
      : null,
    optionCount,
    attemptedAt: payload.attemptedAt || new Date().toISOString()
  };

  return { isValid: true, errors: [], result };
}

/**
 * Reconstruct the presented option order for one screening task, main-side.
 *
 * Returns the index of the correct answer within the options the learner was
 * actually shown, or `null` when it cannot be determined (no profile, task not
 * in the reconstructed quest, or the value is missing). Never falls back to the
 * authored index: that would measure the bias the balancer removes.
 *
 * @param {{taskId: string, profile?: object}} input
 * @returns {number|null}
 */
export function resolvePresentedOptionIndex({ taskId, profile } = {}) {
  if (!taskId || !profile) return null;
  try {
    const { tasks } = selectQuestTasks(profile);
    const presented = tasks.find((t) => t.id === taskId);
    if (!presented || !Array.isArray(presented.options)) return null;
    const idx = presented.options.indexOf(presented.correctAnswer);
    return idx >= 0 ? idx : null;
  } catch {
    // Never let an audit field break grading.
    return null;
  }
}

/**
 * Compute the quest summary returned on completion.
 * @param {object[]} results
 * @param {object} baseline
 * @returns {object}
 */
export function buildCompletionSummary(results, baseline) {
  const total = results.length;
  const correct = results.filter(r => r.isCorrect).length;

  return {
    totalTasks: total,
    correctAnswers: correct,
    accuracy: baseline?.overallAccuracy ?? 0,
    categoriesCovered: Object.keys(baseline?.categoryAccuracy || {}),
    strugglingCategories: baseline?.strugglingCategories || [],
    completedAt: new Date().toISOString()
  };
}

// ─── Internal Helpers ───────────────────────────────────────────────

function groupBy(items, keyFn) {
  const groups = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

function average(numbers) {
  if (!numbers.length) return 0;
  return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
}

function round(value, precision = 2) {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}