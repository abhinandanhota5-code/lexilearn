/**
 * PHASE 2: Advanced Adaptive Learning Engine
 * Tracks performance patterns, recommends difficulty adjustments, suggests revision topics.
 * Works deterministically without external AI, with optional AI for explanations.
 *
 * Extends the basic ALE with:
 * - Pattern detection (repeated mistakes, help-seeking behavior)
 * - Spaced repetition recommendations
 * - Topic mastery confidence scoring
 * - Skill gap identification
 */

export class AdvancedAdaptiveLearningEngine {
  constructor(profile = {}) {
    this.profile = profile;
    this.adaptiveLearning = profile.adaptiveLearning || {};
    this.history = this.adaptiveLearning.history || [];
    this.skills = this.adaptiveLearning.skills || {};
    this.preferences = this.adaptiveLearning.preferences || {};
    this.meta = this.adaptiveLearning.meta || {
      sessions: 0,
      activities: 0,
      lastSessionAt: null,
      sessionStreakDays: 0,
      totalTimeMs: 0
    };
  }

  /**
   * Record an activity result and update adaptive state.
   * @param {object} result ActivityResult from learning-store
   * @returns {object} Updated adaptive state
   */
  recordActivityResult(result) {
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid activity result');
    }

    // Normalize to our tracking format
    const record = {
      activityId: result.activityId,
      skillId: result.skillId,
      objectiveId: result.objectiveId,
      activityType: result.activityType,
      difficulty: result.difficulty || 2,
      attempts: Math.max(1, result.attempts || 1),
      isCorrect: result.outcome === 'success' || result.outcome === 'help_success',
      outcome: result.outcome,
      hintsUsed: result.hintsUsed || 0,
      explanationsUsed: (result.explanationsUsed || []).length,
      responseTimeMs: result.responseTimeMs || 0,
      audioUsed: result.audioSignals?.audioUsed === true,
      recordedAt: result.completedAt || new Date().toISOString()
    };

    this.history.push(record);

    // Update skill tracking
    const skillId = result.skillId || 'unknown';
    if (!this.skills[skillId]) {
      this.skills[skillId] = {
        totalAttempts: 0,
        correctCount: 0,
        firstAttemptCorrect: 0,
        recentAttempts: [], // Last 10 attempts
        confidence: 0.5,
        recommendedDifficulty: 2,
        needsRevision: false,
        revisionReason: null,
        lastPracticed: null,
        masteredAt: null
      };
    }

    const skill = this.skills[skillId];
    skill.totalAttempts += 1;
    skill.lastPracticed = new Date().toISOString();

    if (record.isCorrect) {
      skill.correctCount += 1;
      if (record.attempts === 1) {
        skill.firstAttemptCorrect += 1;
      }
    }

    // Track recent attempts (last 10)
    skill.recentAttempts.push({
      isCorrect: record.isCorrect,
      attempts: record.attempts,
      hintsUsed: record.hintsUsed
    });
    if (skill.recentAttempts.length > 10) {
      skill.recentAttempts.shift();
    }

    // Update confidence using moving average
    this.updateConfidence(skillId, skill);

    // Check for revision recommendations
    this.checkRevisionNeeds(skillId, skill);

    // Update recommended difficulty
    this.updateRecommendedDifficulty(skillId, skill);

    // Update meta
    this.meta.activities = (this.meta.activities || 0) + 1;
    this.meta.totalTimeMs = (this.meta.totalTimeMs || 0) + (record.responseTimeMs || 0);
    this.meta.updatedAt = new Date().toISOString();

    return { skills: this.skills, history: this.history };
  }

  /**
   * Update confidence score using moving average.
   * Confidence = accuracy of recent attempts, with recency weighting.
   */
  updateConfidence(skillId, skill) {
    if (skill.totalAttempts === 0) {
      skill.confidence = 0.5;
      return;
    }

    const recent = Math.min(5, skill.totalAttempts);
    const recentResults = skill.recentAttempts.slice(-recent);
    if (recentResults.length === 0) {
      skill.confidence = 0.5;
      return;
    }

    const recentCorrect = recentResults.filter(r => r.isCorrect).length;
    skill.confidence = recentResults.length > 0 ? recentCorrect / recentResults.length : 0.5;
  }

  /**
   * Check if a skill needs revision based on patterns.
   * Triggers when: repeated mistakes, high help usage, or accuracy < 60%
   */
  checkRevisionNeeds(skillId, skill) {
    if (skill.totalAttempts < 3) {
      skill.needsRevision = false;
      skill.revisionReason = null;
      return;
    }

    const accuracy = skill.correctCount / skill.totalAttempts;
    const recentAttempts = skill.recentAttempts.slice(-5);
    const recentCorrect = recentAttempts.filter(r => r.isCorrect).length;
    const recentAccuracy = recentAttempts.length > 0 ? recentCorrect / recentAttempts.length : 0;

    // Pattern 1: Recent accuracy < 50% = needs revision
    if (recentAccuracy < 0.5 && recentAttempts.length >= 3) {
      skill.needsRevision = true;
      skill.revisionReason = 'recent_struggle';
      return;
    }

    // Pattern 2: Repeated mistakes in same skill (3+ wrong in last 5)
    const recentWrong = recentAttempts.filter(r => !r.isCorrect).length;
    if (recentWrong >= 3) {
      skill.needsRevision = true;
      skill.revisionReason = 'repeated_errors';
      return;
    }

    // Pattern 3: High help usage (>50% of attempts use hints)
    const attemptsWithHelp = skill.recentAttempts.filter(r => r.hintsUsed > 0).length;
    if (recentAttempts.length >= 3 && attemptsWithHelp / recentAttempts.length > 0.5) {
      skill.needsRevision = true;
      skill.revisionReason = 'high_help_dependency';
      return;
    }

    // Pattern 4: Overall accuracy < 60%
    if (accuracy < 0.6 && skill.totalAttempts >= 5) {
      skill.needsRevision = true;
      skill.revisionReason = 'low_accuracy';
      return;
    }

    // Pattern 5: No improvement over time
    if (skill.totalAttempts >= 5) {
      const firstHalf = skill.recentAttempts.slice(0, Math.floor(skill.recentAttempts.length / 2));
      const secondHalf = skill.recentAttempts.slice(Math.floor(skill.recentAttempts.length / 2));
      if (firstHalf.length > 0 && secondHalf.length > 0) {
        const firstAccuracy = firstHalf.filter(r => r.isCorrect).length / firstHalf.length;
        const secondAccuracy = secondHalf.filter(r => r.isCorrect).length / secondHalf.length;
        if (firstAccuracy > 0.7 && secondAccuracy < firstAccuracy - 0.2) {
          skill.needsRevision = true;
          skill.revisionReason = 'regression';
          return;
        }
      }
    }

    skill.needsRevision = false;
    skill.revisionReason = null;
  }

  /**
   * Recommend next difficulty level based on performance.
   */
  updateRecommendedDifficulty(skillId, skill) {
    if (skill.totalAttempts < 2) {
      skill.recommendedDifficulty = 2; // Start at medium
      return;
    }

    const accuracy = skill.correctCount / skill.totalAttempts;
    const recentAttempts = skill.recentAttempts.slice(-3);
    const recentAccuracy = recentAttempts.length > 0
      ? recentAttempts.filter(r => r.isCorrect).length / recentAttempts.length
      : 0;

    // Increase difficulty: >80% accuracy, fast responses, few hints
    if (recentAccuracy > 0.8) {
      const avgTime = recentAttempts.length > 0
        ? recentAttempts.reduce((sum, r) => sum + r.attempts, 0) / recentAttempts.length
        : 1;
      const avgHints = recentAttempts.length > 0
        ? recentAttempts.reduce((sum, r) => sum + r.hintsUsed, 0) / recentAttempts.length
        : 0;

      if (avgTime <= 1.5 && avgHints < 1) {
        skill.recommendedDifficulty = Math.min(5, (skill.recommendedDifficulty || 2) + 1);
        return;
      }
    }

    // Decrease difficulty: <50% accuracy
    if (accuracy < 0.5) {
      skill.recommendedDifficulty = Math.max(1, (skill.recommendedDifficulty || 2) - 1);
      return;
    }

    // Stay at current difficulty: 50-80% accuracy
    skill.recommendedDifficulty = Math.max(1, skill.recommendedDifficulty || 2);
  }

  /**
   * Get skills recommended for revision.
   * @returns {array} Skills with needsRevision=true, sorted by severity
   */
  getRevisionRecommendations() {
    return Object.entries(this.skills)
      .filter(([_, skill]) => skill.needsRevision === true)
      .sort(([_, skillA], [__, skillB]) => {
        // Sort by: repeated_errors > recent_struggle > high_help_dependency > low_accuracy > regression
        const severityOrder = {
          repeated_errors: 1,
          recent_struggle: 2,
          high_help_dependency: 3,
          low_accuracy: 4,
          regression: 5
        };
        const severityA = severityOrder[skillA.revisionReason] || 99;
        const severityB = severityOrder[skillB.revisionReason] || 99;
        return severityA - severityB;
      })
      .map(([skillId, skill]) => ({
        skillId,
        reason: skill.revisionReason,
        confidence: skill.confidence,
        totalAttempts: skill.totalAttempts,
        accuracy: skill.totalAttempts > 0 ? skill.correctCount / skill.totalAttempts : 0
      }));
  }

  /**
   * Get learner summary for parent dashboard.
   */
  getSummary() {
    const totalActivities = this.history.length;
    const totalCorrect = this.history.filter(r => r.isCorrect).length;
    const accuracy = totalActivities > 0 ? totalCorrect / totalActivities : 0;

    const skillsSummary = Object.entries(this.skills).map(([skillId, skill]) => ({
      skillId,
      attempts: skill.totalAttempts,
      accuracy: skill.totalAttempts > 0 ? skill.correctCount / skill.totalAttempts : 0,
      confidence: skill.confidence,
      needsRevision: skill.needsRevision,
      lastPracticed: skill.lastPracticed
    }));

    const revisionNeeded = this.getRevisionRecommendations();

    return {
      totalActivities,
      totalCorrect,
      overallAccuracy: Math.round(accuracy * 100),
      skillsSummary,
      revisionRecommendations: revisionNeeded,
      lastSessionAt: this.meta.lastSessionAt,
      sessionCount: this.meta.sessions,
      totalTimeMs: this.meta.totalTimeMs
    };
  }

  /**
   * Serialize for persistence.
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

/**
 * Helper: Calculate days since last session.
 */
export function daysSinceLastSession(lastSessionAt) {
  if (!lastSessionAt) return null;
  const last = new Date(lastSessionAt);
  const now = new Date();
  const diffMs = now - last;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Helper: Determine if spaced repetition is due for a skill.
 * Returns true if learner should practice this skill again.
 */
export function isSpacedRepetitionDue(skill, daysSinceLastSession) {
  if (!skill || !skill.lastPracticed) return true;

  // Based on SuperMemo 2 algorithm (simplified)
  const confidence = skill.confidence || 0.5;
  let daysUntilNext;

  if (confidence < 0.6) {
    daysUntilNext = 1; // Review soon if struggling
  } else if (confidence < 0.8) {
    daysUntilNext = 3; // Review in 3 days
  } else {
    daysUntilNext = 7; // Review in a week if confident
  }

  return daysSinceLastSession >= daysUntilNext;
}
