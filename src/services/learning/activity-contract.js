/**
 * Activity Contract (§9) — reusable activity vocabulary
 *
 * Activities contain NO adaptive logic; they emit semantic events and produce
 * deterministic ActivityResults (including audio signals). Correctness is
 * computed MAIN-side from the submitted selection using the same
 * ground-truth model as screening. `getView()` never contains correctAnswer.
 */

export const VALID_ACTIVITY_TYPES = Object.freeze([
  'sound_detect',
  'word_build',
  'syllable_split',
  'sentence_mc'
]);

export const VALID_MODES = Object.freeze(['choose', 'build']);

export const VALID_HELP_KINDS = Object.freeze([
  'show_me',
  'tell_me',
  'break_it_down',
  'give_example',
  'make_simpler',
  'funny_example',
  'real_life_example'
]);

export const VALID_OUTCOMES = Object.freeze(['success', 'help_success', 'incorrect', 'timeout']);

/**
 * Input mode for an activity type (§9): build-mode activities manipulate
 * tiles/chunks; everything else is choose-mode. Used by main-side judging.
 */
export function activityTypeMode(activityType) {
  return activityType === 'word_build' || activityType === 'syllable_split' ? 'build' : 'choose';
}

/**
 * Normalize a selection for comparison. Strings are whitespace-collapsed;
 * arrays (build-mode sequences) join with '-' after normalization, matching
 * the syllable answerKey format ('but-ter-fly').
 */
function normalizeSelection(selection) {
  if (Array.isArray(selection)) {
    return selection.map((p) => String(p).replace(/\s+/g, ' ').trim()).join('-');
  }
  return String(selection ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * MAIN-SIDE ground truth judging (§6): deterministic, no LLM, no fuzzy
 * matching. Choose mode requires exact match with the answer key; build mode
 * requires the ordered selection to equal the key (order matters — the child
 * is building a word or tapping syllables in sequence).
 *
 * @param {object} input { selection, answerKey, mode, content }
 * @returns {boolean}
 */
export function judgeSelection({ selection, answerKey, mode = 'choose', content = null }) {
  if (mode === 'build') {
    const picked = normalizeSelection(selection);
    const key = normalizeSelection(answerKey);
    if (picked === key) return true;
    // Letter-tile items: answer key is the joined word ('cat'), the child
    // taps letters ['c','a','t']. Compare the joined tiles to the key.
    return picked.replace(/-/g, '') === key.replace(/-/g, '');
  }
  // choose mode: selection may be the option text or its index.
  if (typeof selection === 'number') {
    const options = Array.isArray(content?.options) ? content.options : null;
    if (!options || options[selection] === undefined) return false;
    return normalizeSelection(options[selection]) === normalizeSelection(answerKey);
  }
  return normalizeSelection(selection) === normalizeSelection(answerKey);
}

/**
 * Modality ids the preference model understands. Kept as a local copy of the
 * adaptive config list so this contract module stays dependency-free.
 */
const PREFERENCE_MODALITY_IDS = Object.freeze([
  'visual',
  'audio',
  'text',
  'manipulation',
  'example',
  'repetition',
  'guided_assistance'
]);

/**
 * Derive the OBSERVABLE modalities actually present in an activity attempt.
 *
 * This is the fix for preference signals never moving: the renderer always
 * submitted `modalityObservations: []`, so the preference model had nothing to
 * weight and every modality weight decayed to the same value. The presentation
 * of an activity is known MAIN-side (it was decided by the ALE and lives in the
 * cached spec), so the modalities are derived here from ground truth about the
 * attempt rather than taken on trust from the renderer.
 *
 * Observation only — never a diagnosis, a trait, or a label about the learner.
 *
 * @param {object} input
 * @param {object} input.spec main-side ActivitySpecification
 * @param {object} input.audioSignals normalized audio signal block
 * @param {number} input.hintsUsed
 * @param {string[]} input.explanationsUsed
 * @returns {string[]} bounded, de-duplicated, deterministically ordered modalities
 */
export function observedModalities({ spec, audioSignals = {}, hintsUsed = 0, explanationsUsed = [] }) {
  const found = new Set();
  const representation = spec?.representation;
  const mode = spec?.presentation?.mode;

  // What the activity actually presented.
  if (representation === 'audio' || mode === 'text_audio' || spec?.presentation?.replayEnabled) {
    found.add('audio');
  }
  if (representation === 'text' || representation === 'sentence_completion' || String(mode || '').startsWith('text')) {
    found.add('text');
  }
  if (representation === 'visual') found.add('visual');
  if (representation === 'manipulation') found.add('manipulation');

  // What the learner actually engaged with, on top of the presentation.
  if (audioSignals.audioUsed === true) found.add('audio');
  if (audioSignals.textAndAudio === true) {
    found.add('audio');
    found.add('text');
  }
  const replayCount = Number(audioSignals.replayCount) || 0;
  if (replayCount > 1) found.add('repetition');

  // Help is a guided-assistance observation, not a penalty signal.
  const explanations = Array.isArray(explanationsUsed) ? explanationsUsed : [];
  if (hintsUsed > 0 || explanations.length > 0) {
    found.add('guided_assistance');
    if (explanations.some((k) => k === 'give_example' || k === 'funny_example' || k === 'real_life_example')) {
      found.add('example');
    }
  }

  return PREFERENCE_MODALITY_IDS.filter((m) => found.has(m));
}

/**
 * Hard bounds for each observable-behavior signal. `-1` is the "not observed"
 * sentinel for the one timing field (the learner may never have interacted).
 */
export const BEHAVIOR_SIGNAL_BOUNDS = Object.freeze({
  firstInteractionMs: Object.freeze([-1, 30 * 60 * 1000]),
  optionInspects: Object.freeze([0, 200]),
  tilePlacements: Object.freeze([0, 200]),
  tileRemovals: Object.freeze([0, 200]),
  replayCount: Object.freeze([0, 200]),
  helpOpens: Object.freeze([0, 50])
});

/**
 * Clamp the renderer's observable-behavior payload into a canonical block.
 * Missing fields become 0 (or -1 for the timing sentinel) and anything
 * non-finite or out of range is clamped — validation already rejects the
 * malformed shapes, and this keeps the persisted result bounded either way.
 *
 * @param {unknown} raw payload.behavior
 * @returns {object} bounded behaviorSignals block
 */
export function normalizeBehaviorSignals(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const out = {};
  for (const [key, [lo, hi]] of Object.entries(BEHAVIOR_SIGNAL_BOUNDS)) {
    const v = Number(src[key]);
    if (!Number.isFinite(v)) {
      out[key] = lo === -1 ? -1 : 0;
      continue;
    }
    out[key] = Math.min(hi, Math.max(lo, Math.round(v)));
  }
  return out;
}

/**
 * Merge renderer-reported modality observations with the main-side derived
 * set. Unknown ids are dropped (the preference model ignores them anyway, but
 * filtering keeps the persisted result bounded) and the union is returned in
 * the canonical modality order so results stay byte-stable.
 *
 * @param {string[]} derived main-side derived modalities
 * @param {unknown} reported renderer-reported modality array
 * @returns {string[]}
 */
export function mergeModalityObservations(derived, reported) {
  const found = new Set(Array.isArray(derived) ? derived : []);
  if (Array.isArray(reported)) {
    for (const id of reported) {
      if (typeof id === 'string' && PREFERENCE_MODALITY_IDS.includes(id)) found.add(id);
    }
  }
  return PREFERENCE_MODALITY_IDS.filter((m) => found.has(m));
}

/**
 * Build the deterministic ActivityResult (§6) from a validated submission +
 * main-side ground truth. Pure given its inputs (timestamps injected).
 *
 * @param {object} input
 * @param {object} input.spec full ActivitySpecification (main-side, incl. answerKey)
 * @param {object} input.payload validated renderer submission
 * @param {boolean} input.isCorrect main-side judged correctness
 * @param {string} input.now ISO timestamp
 * @param {{count?: number, kinds?: string[]}} [input.observedHelp] MAIN-side
 *   record of help actually served for this activity (from getLearningHelp).
 *   The renderer reports what it counted; main reports what it actually
 *   delivered. The higher of the two is used, so help usage can never be
 *   under-reported by the client — the adaptive signal must reflect the help
 *   the learner really received.
 * @returns {object} ActivityResult
 */
export function buildOutcome({ spec, payload, isCorrect, now, observedHelp = null }) {
  const audio = payload.audioSignals || {};
  const attempts = Math.max(1, Number(payload.attempts) || 1);
  const timedOut = payload.timedOut === true;
  const outcome = timedOut ? 'timeout' : isCorrect ? 'success' : 'incorrect';
  const reportedExplanations = Array.isArray(payload.explanationsUsed)
    ? payload.explanationsUsed.filter((k) => typeof k === 'string')
    : [];
  const observedKinds = Array.isArray(observedHelp?.kinds)
    ? observedHelp.kinds.filter((k) => typeof k === 'string')
    : [];
  // Union of renderer-reported and main-observed help kinds: an explanation the
  // main process actually served is never dropped because the client forgot to
  // list it.
  const explanationsUsed = [...new Set([...reportedExplanations, ...observedKinds])];

  const observedCount = Math.max(0, Number(observedHelp?.count) || 0);
  const hintsUsed = Math.max(Math.max(0, Number(payload.hintsUsed) || 0), observedCount);

  const audioSignals = {
    audioUsed: audio.audioUsed === true,
    replayCount: Math.max(0, Number(audio.replayCount) || 0),
    answeredAfterFirstListen: audio.answeredAfterFirstListen === true,
    answeredAfterReplay: audio.answeredAfterReplay === true,
    textAndAudio: audio.textAndAudio === true,
    helpRequestedAfterAudio: audio.helpRequestedAfterAudio === true
  };

  const modalityObservations = mergeModalityObservations(
    observedModalities({ spec, audioSignals, hintsUsed, explanationsUsed }),
    payload.modalityObservations
  );

  const behaviorSignals = normalizeBehaviorSignals(payload.behavior);

  return {
    activityId: spec.activityId,
    skillId: spec.skillId,
    activityType: spec.activityType,
    representation: spec.representation,
    objectiveId: spec.objectiveId,
    difficulty: spec.difficulty,
    supportLevel: spec.supportLevel || 'none',
    attempts,
    correctOnFirstAttempt: !timedOut && isCorrect && attempts === 1,
    hintsUsed,
    explanationsUsed,
    modalityObservations,
    audioPresented: Boolean(spec.presentation?.replayEnabled) || audioSignals.audioUsed,
    audioSignals,
    behaviorSignals,
    gradeMatched: true, // set by main from the profile (ALE gate already applied)
    responseTimeMs: Math.max(0, Number(payload.responseTimeMs) || 0),
    completedAt: now,
    outcome
  };
}

const DEFAULT_AUDIO_SIGNALS = Object.freeze({
  audioUsed: false,
  replayCount: 0,
  answeredAfterFirstListen: false,
  answeredAfterReplay: false,
  textAndAudio: false,
  helpRequestedAfterAudio: false
});

/**
 * Validate the renderer's submission payload (LEARNING_SUBMIT_ACTIVITY).
 * Correctness is NOT part of this payload — main judges it against the cached
 * answer key.
 * @param {object} payload
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateSubmissionPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errors: ['Submission payload is required.'] };
  }
  if (typeof payload.activityId !== 'string' || !payload.activityId) {
    errors.push('activityId is required.');
  }
  const hasSelection =
    typeof payload.selection === 'string' ||
    typeof payload.selection === 'number' ||
    Array.isArray(payload.selection);
  const timedOut = payload.timedOut === true;
  if (!hasSelection && !timedOut) {
    errors.push('selection is required.');
  }
  const num = (v, name, lo = 0) => {
    if (v === undefined || v === null) return;
    if (typeof v !== 'number' || Number.isNaN(v) || v < lo) {
      errors.push(`${name} must be a number >= ${lo}.`);
    }
  };
  num(payload.attempts, 'attempts', 1);
  num(payload.hintsUsed, 'hintsUsed');
  num(payload.responseTimeMs, 'responseTimeMs');
  if (payload.explanationsUsed !== undefined && !Array.isArray(payload.explanationsUsed)) {
    errors.push('explanationsUsed must be an array.');
  }
  if (payload.modalityObservations !== undefined && !Array.isArray(payload.modalityObservations)) {
    errors.push('modalityObservations must be an array.');
  }

  // Observable-behavior signals: counts and one timing only. Rejected when the
  // shape is wrong or any value is out of bounds, so a corrupt payload can
  // never widen what the adaptive engine sees. Bounded and diagnostic-free by
  // construction — the contract has no field for any inference about the learner.
  if (payload.behavior !== undefined && payload.behavior !== null) {
    const b = payload.behavior;
    if (typeof b !== 'object' || Array.isArray(b)) {
      errors.push('behavior must be an object.');
    } else {
      const bounds = {
        firstInteractionMs: [-1, 30 * 60 * 1000],
        optionInspects: [0, 200],
        tilePlacements: [0, 200],
        tileRemovals: [0, 200],
        replayCount: [0, 200],
        helpOpens: [0, 50]
      };
      for (const [key, [lo, hi]] of Object.entries(bounds)) {
        const v = b[key];
        if (v === undefined || v === null) continue;
        if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi) {
          errors.push(`behavior.${key} must be a finite number between ${lo} and ${hi}.`);
        }
      }
    }
  }

  const audio = payload.audioSignals || {};
  for (const key of ['audioUsed', 'answeredAfterFirstListen', 'answeredAfterReplay', 'textAndAudio', 'helpRequestedAfterAudio']) {
    if (audio[key] !== undefined && typeof audio[key] !== 'boolean') {
      errors.push(`audioSignals.${key} must be a boolean.`);
    }
  }
  if (audio.replayCount !== undefined && (typeof audio.replayCount !== 'number' || audio.replayCount < 0)) {
    errors.push('audioSignals.replayCount must be a number >= 0.');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate an ActivityResult according to the §6 contract.
 * @param {object} result
 * @returns {{ isValid: boolean, errors: string[], result?: object }}
 */
export function validateActivityResult(result) {
  const errors = [];
  if (!result || typeof result !== 'object') {
    return { isValid: false, errors: ['ActivityResult is required.'] };
  }

  const num = (v, name, lo = 0) => {
    if (v === undefined || v === null) return null;
    if (typeof v !== 'number' || Number.isNaN(v) || v < lo) {
      errors.push(`${name} must be a number >= ${lo}.`);
      return null;
    }
    return v;
  };

  // activityId is the string id minted by buildActivitySpec
  // (`${sessionId}_${sequence}`) — same shape validateSubmissionPayload
  // requires and buildOutcome copies. Numeric-only ids are not produced
  // anywhere in the pipeline.
  if (typeof result.activityId !== 'string' || !result.activityId) {
    errors.push('activityId is required.');
  }
  if (typeof result.skillId !== 'string' || !result.skillId) errors.push('skillId is required.');
  if (!VALID_ACTIVITY_TYPES.includes(result.activityType)) {
    errors.push(`activityType must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}`);
  }
  if (typeof result.objectiveId !== 'string' || !result.objectiveId) errors.push('objectiveId is required.');
  num(result.difficulty, 'difficulty', 1);
  num(result.attempts, 'attempts', 1);
  if (typeof result.correctOnFirstAttempt !== 'boolean') errors.push('correctOnFirstAttempt must be a boolean.');
  num(result.hintsUsed, 'hintsUsed');
  if (!Array.isArray(result.explanationsUsed)) errors.push('explanationsUsed must be an array.');
  if (!Array.isArray(result.modalityObservations)) errors.push('modalityObservations must be an array.');
  if (result.gradeMatched !== true) errors.push('gradeMatched must be true (main-side ground truth).');
  num(result.responseTimeMs, 'responseTimeMs');
  if (!VALID_OUTCOMES.includes(result.outcome)) {
    errors.push(`outcome must be one of: ${VALID_OUTCOMES.join(', ')}`);
  }

  // Audio signals (§6C).
  const audio = result.audioSignals || {};
  if (typeof audio.audioUsed !== 'boolean') errors.push('audioSignals.audioUsed must be a boolean.');
  num(audio.replayCount, 'audioSignals.replayCount');
  if (typeof audio.answeredAfterFirstListen !== 'boolean') errors.push('audioSignals.answeredAfterFirstListen must be a boolean.');
  if (typeof audio.answeredAfterReplay !== 'boolean') errors.push('audioSignals.answeredAfterReplay must be a boolean.');
  if (typeof audio.textAndAudio !== 'boolean') errors.push('audioSignals.textAndAudio must be a boolean.');
  if (typeof audio.helpRequestedAfterAudio !== 'boolean') errors.push('audioSignals.helpRequestedAfterAudio must be a boolean.');

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create an activity instance from a plan descriptor (§9).
 * Emits via `events` (optional observer stub) and computes correctness with
 * the provided `judge` function (main-side ground truth).
 *
 * @param {object} plan plan.skillId, activityType, representation, objectiveId, difficulty, mode, [judge], [events]
 * @returns {object} activity instance
 */
export function createActivity(plan) {
  const state = {
    id: plan.activityId || `act_${Date.now()}`,
    skillId: plan.skillId,
    activityType: plan.activityType,
    representation: plan.representation,
    objectiveId: plan.objectiveId,
    difficulty: plan.difficulty,
    mode: plan.mode || 'choose',
    startedAt: null,
    attempts: 0,
    hintsUsed: 0,
    explanationsUsed: [],
    answered: false,
    audioSignals: { ...DEFAULT_AUDIO_SIGNALS }
  };

  function emit(eventType, payload = {}) {
    plan.events?.(eventType, { activityId: state.id, ...payload });
  }

  return {
    id: state.id,
    ...state,

    start() {
      state.startedAt = new Date().toISOString();
      emit('activity_started');
      return { id: state.id, startedAt: state.startedAt };
    },

    /**
     * Submits a selection. correctness delegated to `plan.judge` (main-side).
     * @returns {{ isCorrect: boolean, gradeMatched: boolean }}
     */
    submitAnswer({ selection, responseTimeMs, audioSignals = {}, correctAnswer } = {}) {
      const signals = { ...DEFAULT_AUDIO_SIGNALS, ...audioSignals };
      state.attempts += 1;
      state.audioSignals = signals;

      const isCorrect = plan.judge
        ? plan.judge({ selection, correctAnswer })
        : false;
      state.answered = true;

      emit(isCorrect ? 'answer_correct' : 'answer_incorrect');

      return { isCorrect, gradeMatched: plan.gradeMatched === true };
    },

    requestHint() {
      state.hintsUsed += 1;
      emit('hint_requested');
      return { hintsUsed: state.hintsUsed };
    },

    requestExplanation(kind) {
      state.explanationsUsed.push(kind);
      emit('help_requested', { kind });
      return { kind, counts: state.explanationsUsed.length };
    },

    requestReplay() {
      state.audioSignals.replayCount += 1;
      emit('hint_requested', { replay: true });
      return { replayCount: state.audioSignals.replayCount };
    },

    complete(overrides = {}) {
      const finishedAt = new Date().toISOString();
      emit('activity_completed');
      return {
        activityId: state.id,
        skillId: state.skillId,
        activityType: state.activityType,
        representation: state.representation,
        objectiveId: state.objectiveId,
        difficulty: state.difficulty,
        attempts: Math.max(1, state.attempts),
        correctOnFirstAttempt: state.attempts === 1 && state.answered,
        hintsUsed: state.hintsUsed,
        explanationsUsed: [...state.explanationsUsed],
        modalityObservations: overrides.modalityObservations || [],
        audioPresented: overrides.audioPresented ?? false,
        audioSignals: { ...state.audioSignals, ...(overrides.audioSignals || {}) },
        gradeMatched: plan.gradeMatched === true,
        responseTimeMs: overrides.responseTimeMs ?? 0,
        completedAt: finishedAt,
        outcome: overrides.outcome || (state.answered ? 'success' : 'timeout'),
        ...overrides.resultExtras
      };
    },

    getView() {
      return {
        id: state.id,
        skillId: state.skillId,
        activityType: state.activityType,
        representation: state.representation,
        objectiveId: state.objectiveId,
        difficulty: state.difficulty,
        mode: state.mode,
        prompt: plan.prompt || null,
        content: plan.content || {},
        presentation: plan.presentation || { mode: 'text', replayEnabled: false },
        helpOptions: plan.helpOptions || [],
        timeLimitMs: plan.timeLimitMs ?? null,
        title: plan.title || 'Practice'
      };
    }
  };
}