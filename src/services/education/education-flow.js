/**
 * Education Mode Flow — session lifecycle with APPROVAL-GATED preference tracking
 *
 * Orchestrates topic-to-explanation pipeline with in-memory session tracking.
 * Reuses preference model, profile store, and Ollama provider.
 * Does NOT use ALE (independent of Workspace/Schoolwork flows).
 *
 * CRITICAL FIX: endEducationSession() now queues proposals for user approval
 * instead of silently persisting preference changes.
 */

import { recordPreferenceOutcome, createDefaultPreferences } from '../adaptive/preference-model.js';
import { getEducationExplanation, getFallbackExplanation } from './education-mode-service.js';
import { queueProposal, createProposal } from '../adaptive/approval-gate.js';

/** Max concurrent education sessions per learner (memory hygiene). */
const MAX_SESSIONS_PER_LEARNER = 10;

/**
 * In-memory session store: learnerId → Map of sessionId → session data
 * @type {Map<string, Map<string, object>>}
 */
const activeSessions = new Map();

/**
 * Create a new Education Mode session.
 * @param {object} opts
 * @param {string} opts.learnerId
 * @param {object} opts.profile Learner profile (grade, adaptiveLearning.preferences)
 * @param {string} opts.topic Topic/question
 * @returns {object} { sessionId, success, error? }
 */
export function createEducationSession({ learnerId, profile, topic }) {
  if (!learnerId || typeof learnerId !== 'string') {
    return { success: false, error: 'Invalid learner ID.' };
  }

  const sessionId = `edu_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Initialize or get learner's session map
  if (!activeSessions.has(learnerId)) {
    activeSessions.set(learnerId, new Map());
  }

  const learnerSessions = activeSessions.get(learnerId);

  // Evict oldest session if at capacity
  if (learnerSessions.size >= MAX_SESSIONS_PER_LEARNER) {
    const oldest = learnerSessions.keys().next().value;
    learnerSessions.delete(oldest);
  }

  const session = {
    sessionId,
    learnerId,
    topic,
    grade: profile?.grade || 'Elementary',
    preferences: profile?.adaptiveLearning?.preferences || createDefaultPreferences(),
    preferences_delta: createDefaultPreferences(),
    modalities_observed: [],
    createdAt: new Date().toISOString(),
    explanation: null,
    variant_cache: {}
  };

  learnerSessions.set(sessionId, session);

  return { success: true, sessionId };
}

/**
 * Generate an explanation for a topic within a session.
 * @param {object} opts
 * @param {string} opts.learnerId
 * @param {string} opts.sessionId
 * @param {object} opts.profileStore ProfileStore instance
 * @returns {Promise<{ success: boolean, explanation?: string, reason?: string }>}
 */
export async function getEducationExplanationInSession({
  learnerId,
  sessionId,
  profileStore
}) {
  const session = getSession(learnerId, sessionId);
  if (!session) {
    return { success: false, reason: 'session_not_found' };
  }

  // Load current profile (in case preferences were updated externally)
  let profile;
  try {
    profile = await profileStore.getProfile();
  } catch (err) {
    return { success: false, reason: 'profile_load_error' };
  }

  if (!profile) {
    return { success: false, reason: 'profile_not_found' };
  }

  // Use blended preferences (session delta + current profile)
  const blendedPreferences = {
    ...profile.adaptiveLearning?.preferences,
    weights: {
      ...(profile.adaptiveLearning?.preferences?.weights || {}),
      ...(session.preferences_delta?.weights || {})
    }
  };

  try {
    const result = await getEducationExplanation({
      profile: {
        ...profile,
        adaptiveLearning: {
          ...profile.adaptiveLearning,
          preferences: blendedPreferences
        }
      },
      topic: session.topic
    });

    if (result.success) {
      session.explanation = result.explanation;
      session.adaptedFor = result.adaptedFor;
      return { success: true, explanation: result.explanation };
    }

    return {
      success: false,
      reason: result.reason,
      fallback: getFallbackExplanation(session.topic, session.grade)
    };
  } catch (err) {
    return {
      success: false,
      reason: 'generation_error',
      fallback: getFallbackExplanation(session.topic, session.grade)
    };
  }
}

/**
 * Get a variant of the explanation (simplified, examples, etc.).
 * Regenerates with adjusted preference weights.
 *
 * @param {object} opts
 * @param {string} opts.learnerId
 * @param {string} opts.sessionId
 * @param {string} opts.variantKind 'make_simpler' | 'give_example' | 'show_me'
 * @param {object} opts.profileStore ProfileStore instance
 * @returns {Promise<{ success: boolean, explanation?: string, reason?: string }>}
 */
export async function getEducationVariant({
  learnerId,
  sessionId,
  variantKind,
  profileStore
}) {
  const session = getSession(learnerId, sessionId);
  if (!session) {
    return { success: false, reason: 'session_not_found' };
  }

  // Load current profile
  let profile;
  try {
    profile = await profileStore.getProfile();
  } catch (err) {
    return { success: false, reason: 'profile_load_error' };
  }

  if (!profile) {
    return { success: false, reason: 'profile_not_found' };
  }

  // Check cache
  if (session.variant_cache[variantKind]) {
    return {
      success: true,
      explanation: session.variant_cache[variantKind],
      cached: true
    };
  }

  // Adjust preferences for variant
  const variantPreferences = buildVariantPreferences(
    profile.adaptiveLearning?.preferences,
    variantKind
  );

  try {
    const result = await getEducationExplanation({
      profile: {
        ...profile,
        adaptiveLearning: {
          ...profile.adaptiveLearning,
          preferences: variantPreferences
        }
      },
      topic: session.topic
    });

    if (result.success) {
      session.variant_cache[variantKind] = result.explanation;
      return { success: true, explanation: result.explanation };
    }

    return {
      success: false,
      reason: result.reason,
      fallback: getFallbackExplanation(session.topic, session.grade)
    };
  } catch (err) {
    return {
      success: false,
      reason: 'generation_error',
      fallback: getFallbackExplanation(session.topic, session.grade)
    };
  }
}

/**
 * Record a modality observation and update preference weights.
 * @param {object} opts
 * @param {string} opts.learnerId
 * @param {string} opts.sessionId
 * @param {string} opts.modality 'visual' | 'audio' | 'text' | 'example' | 'repetition' | 'guided_assistance'
 * @returns {{ success: boolean, reason?: string }}
 */
export function recordEducationModality({
  learnerId,
  sessionId,
  modality
}) {
  const session = getSession(learnerId, sessionId);
  if (!session) {
    return { success: false, reason: 'session_not_found' };
  }

  if (!session.modalities_observed.includes(modality)) {
    session.modalities_observed.push(modality);
  }

  // Record in preference delta (success outcome, modality observed)
  const outcome = {
    outcome: 'success',
    modalityObservations: [modality],
    successModalities: [modality],
    firstTryWithModal: true
  };

  session.preferences_delta = recordPreferenceOutcome(
    session.preferences_delta,
    outcome
  );

  return { success: true };
}

/**
 * End a session and QUEUE preference deltas for user approval.
 * ✅ FIXED: No longer silently persists; returns proposals for approval.
 *
 * @param {object} opts
 * @param {string} opts.learnerId
 * @param {string} opts.sessionId
 * @param {object} opts.profileStore ProfileStore instance
 * @returns {Promise<{ success: boolean, proposals?: object[], reason?: string }>}
 */
export async function endEducationSession({
  learnerId,
  sessionId,
  profileStore
}) {
  const session = getSession(learnerId, sessionId);
  if (!session) {
    return { success: false, reason: 'session_not_found' };
  }

  try {
    // Load current profile
    const profile = await profileStore.getProfile();
    if (!profile) {
      return { success: false, reason: 'profile_not_found' };
    }

    // ✅ NEW: Queue proposals instead of silently persisting
    const proposals = [];
    if (session.preferences_delta?.weights && profile.adaptiveLearning?.preferences?.weights) {
      for (const modality of Object.keys(session.preferences_delta.weights)) {
        const oldWeight = profile.adaptiveLearning.preferences.weights[modality];
        const newWeight = session.preferences_delta.weights[modality];

        // Only queue if weight actually changed
        if (Math.abs(oldWeight - newWeight) > 0.001) {
          const proposal = createProposal(modality, oldWeight, newWeight);
          const proposalId = queueProposal(proposal, learnerId);
          proposals.push({ proposalId, ...proposal });
        }
      }
    }

    // Clean up session
    const learnerSessions = activeSessions.get(learnerId);
    if (learnerSessions) {
      learnerSessions.delete(sessionId);
    }

    // Return proposals for UI to present to user
    return { success: true, proposals };
  } catch (err) {
    return { success: false, reason: 'profile_load_error' };
  }
}

/**
 * Retrieve a session (internal helper).
 * @param {string} learnerId
 * @param {string} sessionId
 * @returns {object|null}
 */
function getSession(learnerId, sessionId) {
  const learnerSessions = activeSessions.get(learnerId);
  if (!learnerSessions) return null;
  return learnerSessions.get(sessionId) || null;
}

/**
 * Build adjusted preference weights for a variant type.
 * @param {object} basePreferences Current preferences object
 * @param {string} variantKind 'make_simpler' | 'give_example' | 'show_me'
 * @returns {object} New preferences with adjusted weights
 */
function buildVariantPreferences(basePreferences, variantKind) {
  const weights = { ...(basePreferences?.weights || {}) };

  switch (variantKind) {
    case 'make_simpler':
      weights.guided_assistance = Math.min(0.95, (weights.guided_assistance || 0.5) + 0.3);
      weights.text = Math.min(0.95, (weights.text || 0.5) + 0.2);
      break;
    case 'give_example':
      weights.example = Math.min(0.95, (weights.example || 0.5) + 0.3);
      break;
    case 'show_me':
      weights.visual = Math.min(0.95, (weights.visual || 0.5) + 0.3);
      break;
    default:
      break;
  }

  return {
    ...basePreferences,
    weights,
    updatedAt: new Date().toISOString()
  };
}

export default {
  createEducationSession,
  getEducationExplanationInSession,
  getEducationVariant,
  recordEducationModality,
  endEducationSession
};
