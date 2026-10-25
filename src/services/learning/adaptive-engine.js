/**
 * Adaptive Learning Engine (Deterministic, Local-First)
 * Tracks performance, adapts difficulty, and generates next activities.
 * All logic is reproducible and testable without external services.
 */

/**
 * Activity result record persisted after each submission.
 * @typedef {object} ActivityResult
 * @property {string} activityId
 * @property {string} lessonId
 * @property {string} timestamp
 * @property {boolean} isCorrect
 * @property {number} attempts - 1, 2, 3+ attempts to get it right
 * @property {number} hintCount - how many hints were used
 * @property {number} responseTimeMs
 * @property {string} outcome - 'success', 'help_success', 'incorrect', 'timeout'
 */

export class AdaptiveLearningEngine {
  constructor(profile = {}) {
    this.profile = profile;
    this.history = profile.adaptiveLearning?.history || [];
    this.skills = profile.adaptiveLearning?.skills || {};
    this.preferences = profile.adaptiveLearning?.preferences || {};
    this.meta = profile.adaptiveLearning?.meta || { sessions: 0, activities: 0 };
  }

  /**
   * Record an activity result and update skill tracking.
   * Deterministic: same input always produces same next recommendation.
   * @param {ActivityResult} result
   * @returns {object} Updated state
   */
  recordActivity(result) {
    this.history.push({
      ...result,
      recordedAt: new Date().toISOString()
    });

    const lessonId = result.lessonId;
    if (!this.skills[lessonId]) {
      this.skills[lessonId] = {
        attempts: 0,
        correct: 0,
        helpUsed: 0,
        firstAttemptCorrect: 0,
        totalTimeMs: 0,
        confidence: 0.5, // 0-1, starts at 50%
        lastActivityAt: null
      };
    }

    const skill = this.skills[lessonId];
    skill.attempts += 1;
    skill.totalTimeMs += result.responseTimeMs || 0;
    skill.lastActivityAt = new Date().toISOString();

    // Track success metrics
    if (result.isCorrect || result.outcome === 'success') {
      skill.correct += 1;
      if (result.attempts === 1) {
        skill.firstAttemptCorrect += 1;
      }
    }

    if (result.hintCount > 0) {
      skill.helpUsed += result.hintCount;
    }

    // Update confidence: moving average of accuracy
    // Confidence = (correct / attempts) with recency weighting
    const recentWindow = Math.max(3, Math.floor(skill.attempts / 3));
    const recentResults = this.history
      .filter(r => r.lessonId === lessonId)
      .slice(-recentWindow);

    const recentCorrect = recentResults.filter(r => r.isCorrect || r.outcome === 'success').length;
    skill.confidence = recentWindow > 0 ? recentCorrect / recentWindow : 0.5;

    // Update meta
    this.meta.activities = (this.meta.activities || 0) + 1;
    this.meta.updatedAt = new Date().toISOString();

    return {
      skills: this.skills,
      history: this.history,
      meta: this.meta
    };
  }

  /**
   * Recommend next activity difficulty based on recent performance.
   * Deterministic algorithm: reproducible given same history.
   * @param {string} lessonId
   * @returns {object} { nextActivityIndex, difficulty, reason }
   */
  recommendNextActivity(lessonId) {
    const skill = this.skills[lessonId];
    if (!skill) {
      return { nextActivityIndex: 0, difficulty: 1, reason: 'New lesson' };
    }

    const accuracy = skill.attempts > 0 ? skill.correct / skill.attempts : 0;
    const firstAttemptRate = skill.attempts > 0 ? skill.firstAttemptCorrect / skill.attempts : 0;
    const avgResponseTimeMs = skill.attempts > 0 ? skill.totalTimeMs / skill.attempts : 0;

    // Decision tree for adaptation:
    // 1. If accuracy < 50%, offer easier version or extra practice
    // 2. If accuracy 50-70% with high help usage, offer explanations
    // 3. If accuracy > 80% with fast responses, increase difficulty
    // 4. If accuracy 70-80%, continue at same level

    let nextDifficulty = 2; // base level
    let reason = 'Continuing at current level';

    if (accuracy < 0.5) {
      nextDifficulty = 1;
      reason = `Accuracy ${Math.round(accuracy * 100)}% - offering easier practice`;
    } else if (accuracy > 0.8 && skill.helpUsed > skill.attempts / 2) {
      // High accuracy but frequent help usage = learner needs explanations, not harder material
      nextDifficulty = 2;
      reason = `Accuracy ${Math.round(accuracy * 100)}% with high help usage - more practice with explanations`;
    } else if (accuracy < 0.7 && skill.helpUsed > skill.attempts / 2) {
      nextDifficulty = 1;
      reason = `Accuracy ${Math.round(accuracy * 100)}% with high help usage - review needed`;
    } else if (accuracy > 0.8 && firstAttemptRate > 0.7 && avgResponseTimeMs < 45000) {
      nextDifficulty = 3;
      reason = `Accuracy ${Math.round(accuracy * 100)}% with fast responses - increasing difficulty`;
    }

    // Next activity index increments by 1 each time (linear progression)
    const resultsForLesson = this.history.filter(r => r.lessonId === lessonId);
    const nextActivityIndex = resultsForLesson.length;

    return {
      nextActivityIndex: Math.max(0, nextActivityIndex),
      difficulty: nextDifficulty,
      accuracy: Math.round(accuracy * 100),
      reason
    };
  }

  /**
   * Generate an alternative explanation for a lesson based on
   * learner's performance and interaction patterns.
   * @param {string} lessonId
   * @returns {string} Alternative explanation
   */
  getAlternativeExplanation(lessonId) {
    const skill = this.skills[lessonId];
    if (!skill) {
      return 'Let me show you another way to think about this.';
    }

    // If learner used many hints, provide visual/example-focused explanation
    if (skill.helpUsed > skill.attempts / 2) {
      return 'Let me show you with more examples and visuals.';
    }

    // If learner is fast but making mistakes, slow-paced explanation
    const avgTime = skill.totalTimeMs / Math.max(1, skill.attempts);
    if (avgTime < 30000) {
      return 'Let me slow down and explain each step carefully.';
    }

    // Default: break into smaller pieces
    return 'Let me break this into smaller, easier pieces.';
  }

  /**
   * Get learning summary for progress display.
   * @returns {object} Summary with stats and insights
   */
  getSummary() {
    const totalActivities = this.history.length;
    const totalCorrect = this.history.filter(r => r.isCorrect || r.outcome === 'success').length;
    const accuracy = totalActivities > 0 ? totalCorrect / totalActivities : 0;

    const skillsSummary = Object.entries(this.skills).map(([lessonId, skill]) => ({
      lessonId,
      accuracy: skill.attempts > 0 ? skill.correct / skill.attempts : 0,
      confidence: skill.confidence,
      attempts: skill.attempts,
      lastActivityAt: skill.lastActivityAt
    }));

    return {
      totalActivities,
      totalCorrect,
      accuracy: Math.round(accuracy * 100),
      skillsSummary,
      lastSessionAt: this.meta.lastSessionAt,
      sessionCount: this.meta.sessions
    };
  }

  /**
   * Export state for persistence.
   * @returns {object} Serializable state
   */
  toJSON() {
    return {
      history: this.history,
      skills: this.skills,
      preferences: this.preferences,
      meta: this.meta
    };
  }
}
