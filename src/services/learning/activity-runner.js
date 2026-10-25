/**
 * PHASE 2: Interactive Learning Activities Framework
 * Unified activity system supporting multiple interaction types with
 * deterministic grading, hint management, and progress tracking.
 */

import { judgeSelection } from '../learning/activity-contract.js';

/**
 * Validate submission payload (simplified for testing).
 */
function validateSubmissionPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errors: ['Submission payload is required.'] };
  }
  if (typeof payload.selection === 'undefined' && payload.timedOut !== true) {
    return { isValid: false, errors: ['selection is required or timedOut must be true.'] };
  }
  return { isValid: true, errors: [] };
}

/**
 * ActivityRunner: Manages a single activity instance through its lifecycle.
 * Handles answer validation, hint requests, retries, and result compilation.
 */
export class ActivityRunner {
  constructor(spec) {
    if (!spec || typeof spec !== 'object') {
      throw new Error('ActivityRunner requires a valid activity spec');
    }

    this.spec = spec;
    this.state = {
      started: false,
      startedAt: null,
      answered: false,
      answeredAt: null,
      attempts: 0,
      hintsUsed: 0,
      explanationsUsed: [],
      timedOut: false,
      selections: [], // History of selections (for build mode)
      audioSignals: {
        audioUsed: false,
        replayCount: 0,
        answeredAfterFirstListen: false,
        answeredAfterReplay: false,
        textAndAudio: false,
        helpRequestedAfterAudio: false
      },
      behaviorSignals: {
        firstInteractionMs: -1,
        optionInspects: 0,
        tilePlacements: 0,
        tileRemovals: 0,
        replayCount: 0,
        helpOpens: 0
      }
    };

    this.hints = spec.hints || [];
    this.hintsShown = new Set();
  }

  /**
   * Start the activity timer.
   */
  start() {
    this.state.started = true;
    this.state.startedAt = new Date().toISOString();
    return {
      started: true,
      timeLimitMs: this.spec.timeLimitMs || null,
      startedAt: this.state.startedAt
    };
  }

  /**
   * Submit an answer and grade it deterministically.
   * @param {object} payload { selection, responseTimeMs, audioSignals, behavior }
   * @returns {object} { isCorrect, outcome, message, hintsRemaining }
   */
  submitAnswer(payload) {
    // Validate payload
    const validation = validateSubmissionPayload(payload);
    if (!validation.isValid) {
      return {
        isCorrect: false,
        outcome: 'invalid',
        message: 'Invalid submission',
        errors: validation.errors
      };
    }

    this.state.attempts += 1;
    const responseTimeMs = payload.responseTimeMs || 0;

    // Update audio signals
    if (payload.audioSignals) {
      this.state.audioSignals = {
        ...this.state.audioSignals,
        ...payload.audioSignals
      };
    }

    // Grade the answer
    const isCorrect = judgeSelection({
      selection: payload.selection,
      answerKey: this.spec._correctAnswer,
      mode: this.spec.mode || 'choose',
      content: this.spec
    });

    // Track selection
    this.state.selections.push({
      attempt: this.state.attempts,
      selection: payload.selection,
      isCorrect,
      responseTimeMs,
      timestamp: new Date().toISOString()
    });

    // Determine outcome
    let outcome = 'incorrect';
    let message = 'Not quite. Try again!';

    if (isCorrect) {
      outcome = this.state.hintsUsed > 0 ? 'help_success' : 'success';
      message = this.state.hintsUsed > 0 ? 'Great! You got it with help.' : 'Perfect! You got it right!';
      this.state.answered = true;
      this.state.answeredAt = new Date().toISOString();
    } else if (this.state.attempts >= 3) {
      outcome = 'too_many_attempts';
      message = 'Let\'s look at the answer.';
      this.state.answered = true;
      this.state.answeredAt = new Date().toISOString();
    }

    const hintsRemaining = Math.max(0, this.hints.length - this.state.hintsUsed);

    return {
      isCorrect,
      outcome,
      message,
      attempts: this.state.attempts,
      hintsRemaining,
      correctAnswer: isCorrect ? this.spec._correctAnswer : null,
      explanation: this.spec.explanation || null
    };
  }

  /**
   * Request a hint for the current activity.
   * @returns {object} { hint, hintsUsed, hintsRemaining }
   */
  requestHint() {
    if (this.state.answered || this.state.hintsUsed >= this.hints.length) {
      return {
        hint: null,
        hintsUsed: this.state.hintsUsed,
        hintsRemaining: 0,
        message: 'No hints remaining'
      };
    }

    const hint = this.hints[this.state.hintsUsed];
    this.state.hintsUsed += 1;
    this.hintsShown.add(this.state.hintsUsed - 1);

    return {
      hint,
      hintsUsed: this.state.hintsUsed,
      hintsRemaining: Math.max(0, this.hints.length - this.state.hintsUsed),
      message: null
    };
  }

  /**
   * Request an explanation (help kind).
   */
  requestExplanation(kind = 'tell_me') {
    if (this.state.answered) {
      return {
        message: 'Activity already answered',
        explanationKind: kind,
        explanationCount: this.state.explanationsUsed.length
      };
    }

    this.state.explanationsUsed.push(kind);
    this.state.behaviorSignals.helpOpens += 1;

    const explanations = {
      tell_me: 'Let me explain: ' + (this.spec.explanation || 'Try reading carefully.'),
      show_example: 'Here\'s an example: ' + (this.spec.example || 'Look at similar words.'),
      break_down: 'Let\'s break it down step by step.',
      simpler: 'Let me make it simpler for you.',
      animated: 'Watch how this works...'
    };

    return {
      explanation: explanations[kind] || explanations.tell_me,
      explanationKind: kind,
      explanationCount: this.state.explanationsUsed.length
    };
  }

  /**
   * Track user interaction for behavior analysis.
   */
  recordInteraction(interactionType, data = {}) {
    if (interactionType === 'option_inspect') {
      this.state.behaviorSignals.optionInspects += 1;
    } else if (interactionType === 'tile_placement') {
      this.state.behaviorSignals.tilePlacements += 1;
    } else if (interactionType === 'tile_removal') {
      this.state.behaviorSignals.tileRemovals += 1;
    } else if (interactionType === 'first_interaction' && this.state.behaviorSignals.firstInteractionMs === -1) {
      this.state.behaviorSignals.firstInteractionMs = data.delayMs || 0;
    }

    if (!this.state.answered && this.state.behaviorSignals.firstInteractionMs === -1 && interactionType !== 'first_interaction') {
      this.state.behaviorSignals.firstInteractionMs = 0;
    }
  }

  /**
   * Handle timeout when time limit exceeded.
   */
  handleTimeout() {
    if (this.state.answered) return;

    this.state.timedOut = true;
    this.state.answered = true;
    this.state.answeredAt = new Date().toISOString();

    return {
      isCorrect: false,
      outcome: 'timeout',
      message: 'Time is up!',
      correctAnswer: this.spec._correctAnswer,
      explanation: this.spec.explanation || null
    };
  }

  /**
   * Compile final activity result for persistence.
   */
  complete(overrides = {}) {
    const now = new Date().toISOString();
    const responseTimeMs = this.state.answeredAt && this.state.startedAt
      ? new Date(this.state.answeredAt) - new Date(this.state.startedAt)
      : 0;

    return {
      activityId: this.spec.id,
      skillId: this.spec.objectiveId,
      activityType: this.spec.type,
      representation: this.spec.representation || 'text',
      objectiveId: this.spec.objectiveId,
      difficulty: this.spec.difficulty || 2,
      attempts: this.state.attempts,
      correctOnFirstAttempt: this.state.attempts === 1 && this.state.selections[0]?.isCorrect === true,
      hintsUsed: this.state.hintsUsed,
      explanationsUsed: this.state.explanationsUsed,
      modalityObservations: overrides.modalityObservations || [],
      audioPresented: this.spec.audioPresented || false,
      audioSignals: this.state.audioSignals,
      behaviorSignals: this.state.behaviorSignals,
      gradeMatched: true,
      responseTimeMs: Math.max(0, responseTimeMs),
      completedAt: now,
      outcome: this.state.timedOut ? 'timeout' : this.state.selections[0]?.isCorrect ? 'success' : 'incorrect',
      ...overrides
    };
  }

  /**
   * Get renderer-safe view (no answer key).
   */
  getView() {
    return {
      id: this.spec.id,
      type: this.spec.type,
      prompt: this.spec.prompt,
      options: this.spec.options,
      tiles: this.spec.tiles,
      pairs: this.spec.pairs,
      explanation: this.spec.explanation,
      timeLimitMs: this.spec.timeLimitMs,
      hintsAvailable: this.hints.length,
      hintsUsed: this.state.hintsUsed,
      attempts: this.state.attempts,
      answered: this.state.answered,
      // NO _correctAnswer exposed
    };
  }
}

/**
 * ActivitySession: Manages a series of activities for a learning session.
 * Tracks progress, spaced repetition, and adaptive recommendations.
 */
export class ActivitySession {
  constructor(params) {
    this.sessionId = params.sessionId || `session_${Date.now()}`;
    this.learnerId = params.learnerId;
    this.grade = params.grade;
    this.subject = params.subject;
    this.topic = params.topic;
    this.activities = []; // Current activity queue
    this.completedActivities = [];
    this.currentActivityIndex = 0;
    this.sessionStartedAt = new Date().toISOString();
    this.totalTimeMs = 0;
    this.sessionStats = {
      totalAttempts: 0,
      correctCount: 0,
      hintsUsedTotal: 0,
      averageAccuracy: 0
    };
  }

  /**
   * Add activities to the session.
   */
  addActivities(activitySpecs) {
    if (!Array.isArray(activitySpecs)) {
      throw new Error('Activities must be an array');
    }

    this.activities = activitySpecs.map(spec => new ActivityRunner(spec));
  }

  /**
   * Get current activity or null if session complete.
   */
  getCurrentActivity() {
    if (this.currentActivityIndex >= this.activities.length) {
      return null;
    }
    return this.activities[this.currentActivityIndex];
  }

  /**
   * Advance to next activity.
   */
  nextActivity() {
    const current = this.getCurrentActivity();
    if (current && current.state.answered) {
      this.completedActivities.push(current.complete());
      this.currentActivityIndex += 1;
      this.updateSessionStats();
      return this.getCurrentActivity();
    }
    return current;
  }

  /**
   * Update running statistics.
   */
  updateSessionStats() {
    const completed = this.completedActivities;
    this.sessionStats.totalAttempts = completed.reduce((sum, a) => sum + a.attempts, 0);
    this.sessionStats.correctCount = completed.filter(a => a.outcome === 'success' || a.outcome === 'help_success').length;
    this.sessionStats.hintsUsedTotal = completed.reduce((sum, a) => sum + a.hintsUsed, 0);
    this.sessionStats.averageAccuracy = completed.length > 0
      ? Math.round((this.sessionStats.correctCount / completed.length) * 100)
      : 0;
  }

  /**
   * End the session and compile results.
   */
  endSession() {
    const now = new Date().toISOString();
    this.updateSessionStats();

    return {
      sessionId: this.sessionId,
      learnerId: this.learnerId,
      grade: this.grade,
      subject: this.subject,
      topic: this.topic,
      startedAt: this.sessionStartedAt,
      completedAt: now,
      activitiesCompleted: this.completedActivities.length,
      totalActivities: this.activities.length,
      stats: this.sessionStats,
      results: this.completedActivities
    };
  }

  /**
   * Get session progress (0-100%).
   */
  getProgress() {
    const total = this.activities.length;
    const completed = this.completedActivities.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }
}
