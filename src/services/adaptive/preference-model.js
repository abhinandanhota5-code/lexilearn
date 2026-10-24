/**
 * Learner Preference Signal Model (§11)
 *
 * Deterministic, observational modality weights. Each modality weight is a
 * bounded number in [0.05, 0.95]. Recording applies fixed deltas plus a
 * recency decay; every operation is pure and unit-testable.
 */

import {
  PREFERENCE_MODALITIES,
  PREFERENCE_DEFAULTS,
  AUDIO_PREFERENCE_DELTAS
} from './adaptive-config.js';

/**
 * Create the canonical default preference state.
 * @returns {object} { weights: Record<modality, number>, updatedAt }
 */
export function createDefaultPreferences() {
  const weights = {};
  for (const modality of PREFERENCE_MODALITIES) {
    weights[modality] = PREFERENCE_DEFAULTS.initWeight;
  }
  return { weights, updatedAt: null };
}

/**
 * Clamp a weight into the valid bounds.
 * @param {number} value
 * @returns {number}
 */
export function clampWeight(value) {
  return Math.min(
    PREFERENCE_DEFAULTS.maxWeight,
    Math.max(PREFERENCE_DEFAULTS.minWeight, value)
  );
}

/**
 * Apply recency decay to all weights prior to an update.
 *
 * Decay pulls each weight back toward the neutral init weight by
 * `(1 - recencyDecay)` per update. A MULTIPLICATIVE decay was used here
 * originally, but it drags every modality toward the same lower bound and
 * collapses the whole vector onto one identical value, which silently
 * destroyed every observed preference signal (all weights converged to
 * ~0.4803 and `pickRepresentation` could never rank modalities). Mean
 * reversion keeps relative differences alive while still fading stale
 * observations, and `clampWeight` keeps every weight inside [0.05, 0.95].
 *
 * @param {Record<string, number>} weights
 * @returns {Record<string, number>} decayed copy of weights
 */
export function decayWeights(weights) {
  const next = {};
  const pull = 1 - PREFERENCE_DEFAULTS.recencyDecay;
  for (const modality of PREFERENCE_MODALITIES) {
    const current = weights[modality];
    const base = typeof current === 'number' && Number.isFinite(current)
      ? current
      : PREFERENCE_DEFAULTS.initWeight;
    next[modality] = clampWeight(base + (PREFERENCE_DEFAULTS.initWeight - base) * pull);
  }
  return next;
}

/**
 * Record a single deterministic outcome observation on the preference model.
 *
 * @param {object} state Preference state { weights, ... } to mutate-from
 * @param {object} outcome
 * @param {'success'|'help_success'|'incorrect'|'timeout'} outcome.outcome
 * @param {string[]} outcome.modalityObservations Modalities observed in the activity
 * @param {string[]} outcome.successModalities Modalities present on a successful attempt
 * @param {boolean} [outcome.firstTryWithModal] Apply first-try +delta (once per activity)
 * @param {object} [outcome.audio] Audio signal fields (Phase 6 §6C)
 * @returns {object} new preference state
 */
export function recordPreferenceOutcome(state, outcome) {
  const prev = state || createDefaultPreferences();
  let weights = decayWeights(prev.weights || {});

  const success = outcome.outcome === 'success' || outcome.outcome === 'help_success';
  const delta =
    success
      ? PREFERENCE_DEFAULTS.successDelta
      : PREFERENCE_DEFAULTS.failDelta;

  const modalities = new Set([
    ...(outcome.modalityObservations || []),
    ...(success ? outcome.successModalities || [] : [])
  ]);

  for (const modality of modalities) {
    if (!(modality in weights)) continue;
    weights[modality] = clampWeight(weights[modality] + delta);
  }

  if (outcome.firstTryWithModal) {
    for (const modality of modalities) {
      if (!(modality in weights)) continue;
      weights[modality] = clampWeight(weights[modality] + PREFERENCE_DEFAULTS.firstTryWithModalDelta);
    }
  }

  // Audio-specific deltas (§11 table). @outcome.audio is the audioSignals block.
  const audio = outcome.audio || {};
  if (audio && typeof audio === 'object') {
    const a = (n) => (typeof n === 'number' ? n : 0);
    const audioUsed = a(audio.audioUsed ? 1 : 0);
    const replayDeadlineExceeded = audio.answeredAfterReplay;
    const firstListen = audio.answeredAfterFirstListen;
    const textAndAudio = audio.textAndAudio;

    void audioUsed;

    if (success && replayDeadlineExceeded) {
      weights.audio = clampWeight(weights.audio + AUDIO_PREFERENCE_DELTAS.correctAfterReplay);
    } else if (success && firstListen) {
      weights.audio = clampWeight(weights.audio + AUDIO_PREFERENCE_DELTAS.correctAfterFirstListen);
    }
    if (success && textAndAudio) {
      weights.audio = clampWeight(weights.audio + AUDIO_PREFERENCE_DELTAS.textAndAudioUsed.audio);
      weights.text = clampWeight(weights.text + AUDIO_PREFERENCE_DELTAS.textAndAudioUsed.text);
    }
    // helpRequestedAfterAudio → engagement only, no delta (constant 0).
  }

  return {
    weights,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Read the single strongest modality weight (used by ALE to prefer a
 * representation). Returns a deterministic modality id.
 * @param {object} state
 * @returns {string}
 */
export function strongestModality(state) {
  const weights = state?.weights || {};
  let top = PREFERENCE_MODALITIES[0];
  let topValue = -Infinity;
  for (const modality of PREFERENCE_MODALITIES) {
    const value = weights[modality] ?? PREFERENCE_DEFAULTS.initWeight;
    if (value > topValue) {
      topValue = value;
      top = modality;
    }
  }
  return top;
}