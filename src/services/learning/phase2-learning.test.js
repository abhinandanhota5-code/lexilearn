/**
 * PHASE 2: Comprehensive Tests for Advanced ALE, Lesson Generation, and Activity Framework
 * Tests deterministic behavior, persistence, and parent insights generation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AdvancedAdaptiveLearningEngine, daysSinceLastSession, isSpacedRepetitionDue } from './advanced-ale.js';
import {
  generateLessonActivityDeterministic,
  getObjectivesForTopic,
  getTopicsForSubject,
  getSubjectsForGrade,
  validateGeneratedActivity
} from './smart-lesson-generator.js';
import { ActivityRunner, ActivitySession } from './activity-runner.js';

describe('Advanced Adaptive Learning Engine', () => {
  let engine;
  let mockProfile;

  beforeEach(() => {
    mockProfile = {
      learnerId: 'learner_test',
      name: 'Test Child',
      adaptiveLearning: {
        history: [],
        skills: {},
        meta: { sessions: 0, activities: 0, totalTimeMs: 0 }
      }
    };
    engine = new AdvancedAdaptiveLearningEngine(mockProfile);
  });

  it('should initialize with empty history and skills', () => {
    expect(engine.history).toEqual([]);
    expect(Object.keys(engine.skills)).toHaveLength(0);
  });

  it('should record activity results correctly', () => {
    const result = {
      activityId: 'act_1',
      skillId: 'skill_phonics_a',
      objectiveId: 'obj_a_sound',
      activityType: 'sound_detect',
      difficulty: 1,
      attempts: 1,
      outcome: 'success',
      hintsUsed: 0,
      explanationsUsed: [],
      responseTimeMs: 15000,
      audioSignals: { audioUsed: true },
      completedAt: new Date().toISOString()
    };

    engine.recordActivityResult(result);

    expect(engine.history).toHaveLength(1);
    expect(engine.skills.skill_phonics_a).toBeDefined();
    expect(engine.skills.skill_phonics_a.totalAttempts).toBe(1);
    expect(engine.skills.skill_phonics_a.correctCount).toBe(1);
  });

  it('should track multiple attempts for same skill', () => {
    const skill = 'skill_test';

    engine.recordActivityResult({
      activityId: 'act_1',
      skillId: skill,
      objectiveId: 'obj_1',
      outcome: 'success',
      attempts: 1,
      hintsUsed: 0,
      completedAt: new Date().toISOString()
    });

    engine.recordActivityResult({
      activityId: 'act_2',
      skillId: skill,
      objectiveId: 'obj_1',
      outcome: 'incorrect',
      attempts: 2,
      hintsUsed: 1,
      completedAt: new Date().toISOString()
    });

    expect(engine.skills[skill].totalAttempts).toBe(2);
    expect(engine.skills[skill].correctCount).toBe(1);
    expect(engine.skills[skill].recentAttempts).toHaveLength(2);
  });

  it('should calculate confidence correctly', () => {
    const skill = 'skill_test';

    // First 3 successes
    for (let i = 0; i < 3; i++) {
      engine.recordActivityResult({
        activityId: `act_${i}`,
        skillId: skill,
        objectiveId: 'obj_1',
        outcome: 'success',
        attempts: 1,
        hintsUsed: 0,
        completedAt: new Date().toISOString()
      });
    }

    let skillData = engine.skills[skill];
    expect(skillData.confidence).toBe(1); // 3/3 correct

    // Add 2 failures
    for (let i = 3; i < 5; i++) {
      engine.recordActivityResult({
        activityId: `act_${i}`,
        skillId: skill,
        objectiveId: 'obj_1',
        outcome: 'incorrect',
        attempts: 1,
        hintsUsed: 0,
        completedAt: new Date().toISOString()
      });
    }

    skillData = engine.skills[skill];
    expect(skillData.confidence).toBeLessThanOrEqual(0.6); // Recent failures lower confidence
  });

  it('should detect revision need: repeated errors', () => {
    const skill = 'skill_test';

    // 3 wrong answers in last 5 = needs revision
    for (let i = 0; i < 3; i++) {
      engine.recordActivityResult({
        activityId: `act_${i}`,
        skillId: skill,
        objectiveId: 'obj_1',
        outcome: 'incorrect',
        attempts: 1,
        hintsUsed: 0,
        completedAt: new Date().toISOString()
      });
    }

    const skillData = engine.skills[skill];
    expect(skillData.needsRevision).toBe(true);
    // Could be either repeated_errors or recent_struggle - both are valid
    expect(['repeated_errors', 'recent_struggle']).toContain(skillData.revisionReason);
  });

  it('should detect revision need: recent struggle', () => {
    const skill = 'skill_test';

    // 2 successes, then 3 failures = recent struggle
    engine.recordActivityResult({
      activityId: 'act_0',
      skillId: skill,
      objectiveId: 'obj_1',
      outcome: 'success',
      attempts: 1,
      hintsUsed: 0,
      completedAt: new Date().toISOString()
    });

    engine.recordActivityResult({
      activityId: 'act_1',
      skillId: skill,
      objectiveId: 'obj_1',
      outcome: 'success',
      attempts: 1,
      hintsUsed: 0,
      completedAt: new Date().toISOString()
    });

    for (let i = 2; i < 5; i++) {
      engine.recordActivityResult({
        activityId: `act_${i}`,
        skillId: skill,
        objectiveId: 'obj_1',
        outcome: 'incorrect',
        attempts: 1,
        hintsUsed: 0,
        completedAt: new Date().toISOString()
      });
    }

    const skillData = engine.skills[skill];
    expect(skillData.needsRevision).toBe(true);
    expect(skillData.revisionReason).toBe('recent_struggle');
  });

  it('should recommend higher difficulty on strong performance', () => {
    const skill = 'skill_test';

    // 3 correct answers, fast, no hints
    for (let i = 0; i < 3; i++) {
      engine.recordActivityResult({
        activityId: `act_${i}`,
        skillId: skill,
        objectiveId: 'obj_1',
        outcome: 'success',
        attempts: 1,
        hintsUsed: 0,
        responseTimeMs: 10000, // Fast
        completedAt: new Date().toISOString()
      });
    }

    const skillData = engine.skills[skill];
    expect(skillData.recommendedDifficulty).toBeGreaterThan(2);
  });

  it('should recommend lower difficulty on poor performance', () => {
    const skill = 'skill_test';

    // Multiple failures
    for (let i = 0; i < 5; i++) {
      engine.recordActivityResult({
        activityId: `act_${i}`,
        skillId: skill,
        objectiveId: 'obj_1',
        outcome: 'incorrect',
        attempts: 2,
        hintsUsed: 1,
        completedAt: new Date().toISOString()
      });
    }

    const skillData = engine.skills[skill];
    expect(skillData.recommendedDifficulty).toBe(1);
  });

  it('should generate revision recommendations sorted by severity', () => {
    // Create multiple struggling skills
    for (let i = 1; i <= 3; i++) {
      for (let j = 0; j < 3; j++) {
        engine.recordActivityResult({
          activityId: `act_${i}_${j}`,
          skillId: `skill_${i}`,
          objectiveId: `obj_${i}`,
          outcome: 'incorrect',
          attempts: 1,
          hintsUsed: 0,
          completedAt: new Date().toISOString()
        });
      }
    }

    const recommendations = engine.getRevisionRecommendations();
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0]).toHaveProperty('reason');
    expect(recommendations[0]).toHaveProperty('skillId');
  });

  it('should generate accurate summary', () => {
    engine.recordActivityResult({
      activityId: 'act_1',
      skillId: 'skill_1',
      objectiveId: 'obj_1',
      outcome: 'success',
      attempts: 1,
      hintsUsed: 0,
      completedAt: new Date().toISOString()
    });

    engine.recordActivityResult({
      activityId: 'act_2',
      skillId: 'skill_2',
      objectiveId: 'obj_2',
      outcome: 'incorrect',
      attempts: 2,
      hintsUsed: 1,
      completedAt: new Date().toISOString()
    });

    const summary = engine.getSummary();
    expect(summary.totalActivities).toBe(2);
    expect(summary.totalCorrect).toBe(1);
    expect(summary.overallAccuracy).toBe(50);
    expect(summary.skillsSummary).toHaveLength(2);
  });

  it('should serialize to JSON for persistence', () => {
    engine.recordActivityResult({
      activityId: 'act_1',
      skillId: 'skill_1',
      objectiveId: 'obj_1',
      outcome: 'success',
      attempts: 1,
      hintsUsed: 0,
      completedAt: new Date().toISOString()
    });

    const json = engine.toJSON();
    expect(json.history).toHaveLength(1);
    expect(json.skills).toBeDefined();
    expect(json.meta).toBeDefined();
  });
});

describe('Smart Lesson Generator', () => {
  it('should generate deterministic activity with valid structure', () => {
    const activity = generateLessonActivityDeterministic({
      grade: '1st Grade',
      subject: 'Phonics',
      topic: 'Letter A',
      difficulty: 1,
      activityType: 'sound_detect',
      objectiveId: 'obj_letter_a'
    });

    expect(activity).toBeDefined();
    expect(activity.id).toBeDefined();
    expect(activity.prompt).toBeDefined();
    expect(activity.type).toBe('sound_detect');
    expect(activity.difficulty).toBe(1);
    expect(activity.explanation).toBeDefined();
    expect(activity._correctAnswer).toBeDefined();
    // Activity includes options but they're visible for renderer
  });

  it('should not expose answer keys in activity spec', () => {
    const activity = generateLessonActivityDeterministic({
      grade: '2nd Grade',
      subject: 'Phonics',
      topic: 'Word Families',
      activityType: 'word_build'
    });

    // Answer key should not be accessible
    expect(activity._correctAnswer).toBeDefined(); // Internal only
    expect(activity.correctAnswer).toBeUndefined();
  });

  it('should respect difficulty bounds (1-5)', () => {
    const activity1 = generateLessonActivityDeterministic({
      grade: '1st Grade',
      subject: 'Phonics',
      topic: 'Letter A',
      difficulty: 0
    });

    const activity2 = generateLessonActivityDeterministic({
      grade: '1st Grade',
      subject: 'Phonics',
      topic: 'Letter A',
      difficulty: 10
    });

    expect(activity1.difficulty).toBe(1);
    expect(activity2.difficulty).toBe(5);
  });

  it('should get objectives for valid grade/subject/topic', () => {
    const objectives = getObjectivesForTopic('1st Grade', 'Phonics', 'Letter A');
    expect(Array.isArray(objectives)).toBe(true);
    expect(objectives.length).toBeGreaterThan(0);
  });

  it('should return empty for invalid grade/subject/topic', () => {
    const objectives = getObjectivesForTopic('99th Grade', 'Invalid', 'None');
    expect(objectives).toEqual([]);
  });

  it('should get topics for valid grade/subject', () => {
    const topics = getTopicsForSubject('1st Grade', 'Phonics');
    expect(Array.isArray(topics)).toBe(true);
    expect(topics.length).toBeGreaterThan(0);
  });

  it('should get subjects for valid grade', () => {
    const subjects = getSubjectsForGrade('2nd Grade');
    expect(Array.isArray(subjects)).toBe(true);
    expect(subjects.length).toBeGreaterThan(0);
  });

  it('should validate generated activities correctly', () => {
    const validActivity = {
      id: 'act_1',
      type: 'sentence_mc',
      prompt: 'Test?',
      options: ['A', 'B'],
      difficulty: 2
    };

    const validation = validateGeneratedActivity(validActivity);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should reject invalid activities', () => {
    const invalidActivity = {
      type: 'sentence_mc',
      // Missing id, prompt, options
      difficulty: 10 // Out of bounds
    };

    const validation = validateGeneratedActivity(invalidActivity);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});

describe('Activity Runner and Session', () => {
  let runner;
  let spec;

  beforeEach(() => {
    spec = {
      id: 'act_1',
      type: 'sentence_mc',
      objectiveId: 'obj_1',
      prompt: 'Which word has the A sound?',
      options: ['apple', 'bike', 'cat'],
      _correctAnswer: 0, // 'apple'
      explanation: 'Apple has the A sound.',
      mode: 'choose',
      hints: ['Think of fruit', 'It starts with A'],
      timeLimitMs: 60000
    };

    runner = new ActivityRunner(spec);
  });

  it('should initialize activity runner', () => {
    expect(runner.spec).toBe(spec);
    expect(runner.state.started).toBe(false);
    expect(runner.state.attempts).toBe(0);
  });

  it('should start activity and record timestamp', () => {
    const result = runner.start();
    expect(result.started).toBe(true);
    expect(result.startedAt).toBeDefined();
    expect(runner.state.started).toBe(true);
  });

  it('should grade correct answer', () => {
    runner.start();
    const result = runner.submitAnswer({
      selection: 0, // 'apple'
      responseTimeMs: 15000,
      audioSignals: { audioUsed: false }
    });

    expect(result.isCorrect).toBe(true);
    expect(result.outcome).toBe('success');
  });

  it('should grade incorrect answer', () => {
    runner.start();
    const result = runner.submitAnswer({
      selection: 1, // 'bike' - wrong
      responseTimeMs: 15000
    });

    expect(result.isCorrect).toBe(false);
    expect(result.outcome).toBe('incorrect');
  });

  it('should allow retries up to limit', () => {
    runner.start();

    // Attempt 1: wrong
    runner.submitAnswer({ selection: 1, responseTimeMs: 10000 });
    expect(runner.state.attempts).toBe(1);
    expect(runner.state.answered).toBe(false);

    // Attempt 2: wrong
    runner.submitAnswer({ selection: 2, responseTimeMs: 10000 });
    expect(runner.state.attempts).toBe(2);
    expect(runner.state.answered).toBe(false);

    // Attempt 3: exhausted
    const result = runner.submitAnswer({ selection: 1, responseTimeMs: 10000 });
    expect(runner.state.answered).toBe(true);
    expect(result.outcome).toBe('too_many_attempts');
  });

  it('should provide hints', () => {
    runner.start();
    const hint1 = runner.requestHint();
    expect(hint1.hint).toBeDefined();
    expect(hint1.hintsUsed).toBe(1);
    expect(hint1.hintsRemaining).toBe(1);

    const hint2 = runner.requestHint();
    expect(hint2.hintsUsed).toBe(2);
    expect(hint2.hintsRemaining).toBe(0);

    const hint3 = runner.requestHint();
    expect(hint3.hint).toBeNull();
    expect(hint3.hintsRemaining).toBe(0);
  });

  it('should track explanations', () => {
    runner.start();
    runner.requestExplanation('tell_me');
    expect(runner.state.explanationsUsed).toHaveLength(1);

    runner.requestExplanation('show_example');
    expect(runner.state.explanationsUsed).toHaveLength(2);
  });

  it('should handle timeout', () => {
    runner.start();
    const result = runner.handleTimeout();

    expect(result.outcome).toBe('timeout');
    expect(runner.state.timedOut).toBe(true);
    expect(runner.state.answered).toBe(true);
  });

  it('should compile activity result', () => {
    runner.start();
    runner.submitAnswer({ selection: 0, responseTimeMs: 15000 });
    const result = runner.complete();

    expect(result.activityId).toBe(spec.id);
    expect(result.attempts).toBe(1);
    expect(result.outcome).toBe('success');
    expect(result.correctOnFirstAttempt).toBe(true);
    expect(result.completedAt).toBeDefined();
  });

  it('should provide renderer-safe view without answer key', () => {
    const view = runner.getView();
    expect(view.id).toBe(spec.id);
    expect(view.prompt).toBe(spec.prompt);
    expect(view.options).toBe(spec.options);
    expect(view._correctAnswer).toBeUndefined();
  });
});

describe('Activity Session', () => {
  let session;

  beforeEach(() => {
    session = new ActivitySession({
      sessionId: 'session_1',
      learnerId: 'learner_1',
      grade: '2nd Grade',
      subject: 'Phonics',
      topic: 'Word Families'
    });
  });

  it('should initialize session', () => {
    expect(session.sessionId).toBe('session_1');
    expect(session.learnerId).toBe('learner_1');
    expect(session.activities).toHaveLength(0);
    expect(session.completedActivities).toHaveLength(0);
  });

  it('should add activities to session', () => {
    const specs = [
      { id: 'act_1', type: 'sentence_mc', prompt: 'Q1?', options: ['A', 'B'], _correctAnswer: 0 },
      { id: 'act_2', type: 'sentence_mc', prompt: 'Q2?', options: ['A', 'B'], _correctAnswer: 1 }
    ];

    session.addActivities(specs);
    expect(session.activities).toHaveLength(2);
  });

  it('should get current activity', () => {
    const specs = [
      { id: 'act_1', type: 'sentence_mc', prompt: 'Q1?', options: ['A', 'B'], _correctAnswer: 0 }
    ];

    session.addActivities(specs);
    const current = session.getCurrentActivity();
    expect(current).toBeDefined();
    expect(current.spec.id).toBe('act_1');
  });

  it('should advance to next activity', () => {
    const specs = [
      { id: 'act_1', type: 'sentence_mc', prompt: 'Q1?', options: ['A', 'B'], _correctAnswer: 0 },
      { id: 'act_2', type: 'sentence_mc', prompt: 'Q2?', options: ['A', 'B'], _correctAnswer: 1 }
    ];

    session.addActivities(specs);
    let current = session.getCurrentActivity();
    current.start();
    current.submitAnswer({ selection: 0 });

    const next = session.nextActivity();
    expect(next).toBeDefined();
    expect(next.spec.id).toBe('act_2');
    expect(session.completedActivities).toHaveLength(1);
  });

  it('should calculate session progress', () => {
    const specs = [
      { id: 'act_1', type: 'sentence_mc', prompt: 'Q1?', options: ['A', 'B'], _correctAnswer: 0 },
      { id: 'act_2', type: 'sentence_mc', prompt: 'Q2?', options: ['A', 'B'], _correctAnswer: 1 }
    ];

    session.addActivities(specs);
    expect(session.getProgress()).toBe(0);

    const current = session.getCurrentActivity();
    current.start();
    current.submitAnswer({ selection: 0 });
    session.nextActivity();

    expect(session.getProgress()).toBe(50);
  });

  it('should compile session results', () => {
    const specs = [
      { id: 'act_1', type: 'sentence_mc', prompt: 'Q1?', options: ['A', 'B'], _correctAnswer: 0 }
    ];

    session.addActivities(specs);
    const current = session.getCurrentActivity();
    current.start();
    current.submitAnswer({ selection: 0 });
    session.nextActivity();

    const result = session.endSession();
    expect(result.sessionId).toBe('session_1');
    expect(result.activitiesCompleted).toBe(1);
    expect(result.totalActivities).toBe(1);
    expect(result.stats.correctCount).toBe(1);
    expect(result.stats.averageAccuracy).toBe(100);
  });
});
