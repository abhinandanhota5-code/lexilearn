/**
 * Unit tests for Adaptive Learning Engine and Curriculum
 * Tests deterministic behavior, persistence, and adaptation logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveLearningEngine } from './adaptive-engine.js';
import { getLessonMap, getActivityForLesson, CURRICULUM_STRUCTURE } from './curriculum.js';

describe('Curriculum', () => {
  it('should have valid grade structure', () => {
    expect(Object.keys(CURRICULUM_STRUCTURE.grades)).toContain('1st Grade');
    expect(Object.keys(CURRICULUM_STRUCTURE.grades)).toContain('6th Grade');
  });

  it('should generate lesson map for a grade', () => {
    const map = getLessonMap('1st Grade');
    expect(Array.isArray(map)).toBe(true);
    expect(map.length).toBeGreaterThan(0);
    expect(map[0]).toHaveProperty('state');
    expect(map[0]).toHaveProperty('subject');
  });

  it('should mark lessons as locked when prerequisites incomplete', () => {
    const map = getLessonMap('1st Grade', {
      completedTopics: [],
      inProgressTopics: {}
    });

    const lockedLesson = map.find(l => l.prerequisites?.length > 0);
    if (lockedLesson) {
      expect(lockedLesson.state).toBe('locked');
    }
  });

  it('should unlock lessons when prerequisites complete', () => {
    const lesson = getLessonMap('1st Grade')[0];
    const prerequisiteId = lesson.id;

    const map = getLessonMap('1st Grade', {
      completedTopics: [prerequisiteId],
      inProgressTopics: {}
    });

    const dependentLesson = map.find(l => l.prerequisites?.includes(prerequisiteId));
    if (dependentLesson) {
      expect(dependentLesson.state).not.toBe('locked');
    }
  });

  it('should return activity spec for lesson', () => {
    const activity = getActivityForLesson('phonics_1_a', 0);
    expect(activity).toHaveProperty('id');
    expect(activity).toHaveProperty('prompt');
    expect(activity).toHaveProperty('options');
    expect(activity).toHaveProperty('hints');
    expect(activity).toHaveProperty('explanation');
  });

  it('should not include answer keys in activity spec', () => {
    const activity = getActivityForLesson('phonics_1_a', 0);
    expect(activity).not.toHaveProperty('correctAnswer');
    expect(activity).not.toHaveProperty('answerKey');
  });
});

describe('Adaptive Learning Engine', () => {
  let engine;

  beforeEach(() => {
    engine = new AdaptiveLearningEngine({
      adaptiveLearning: {
        history: [],
        skills: {},
        meta: { sessions: 0, activities: 0 }
      }
    });
  });

  it('should initialize with empty history', () => {
    expect(engine.history).toEqual([]);
    expect(Object.keys(engine.skills)).toHaveLength(0);
  });

  it('should record activity result', () => {
    const result = {
      activityId: 'act_1',
      lessonId: 'lesson_1',
      isCorrect: true,
      attempts: 1,
      hintCount: 0,
      responseTimeMs: 15000,
      outcome: 'success'
    };

    engine.recordActivity(result);

    expect(engine.history).toHaveLength(1);
    expect(engine.skills.lesson_1).toBeDefined();
    expect(engine.skills.lesson_1.correct).toBe(1);
    expect(engine.skills.lesson_1.attempts).toBe(1);
  });

  it('should track multiple attempts', () => {
    const lesson = 'lesson_1';

    engine.recordActivity({
      activityId: 'act_1',
      lessonId: lesson,
      isCorrect: false,
      attempts: 1,
      hintCount: 1,
      responseTimeMs: 45000,
      outcome: 'incorrect'
    });

    engine.recordActivity({
      activityId: 'act_1',
      lessonId: lesson,
      isCorrect: true,
      attempts: 2,
      hintCount: 0,
      responseTimeMs: 20000,
      outcome: 'success'
    });

    expect(engine.skills[lesson].attempts).toBe(2);
    expect(engine.skills[lesson].correct).toBe(1);
    expect(engine.skills[lesson].helpUsed).toBe(1);
  });

  it('should calculate accuracy correctly', () => {
    const lesson = 'lesson_1';

    // 3 activities: 2 correct, 1 incorrect
    engine.recordActivity({
      activityId: 'act_1',
      lessonId: lesson,
      isCorrect: true,
      attempts: 1,
      hintCount: 0,
      responseTimeMs: 15000,
      outcome: 'success'
    });

    engine.recordActivity({
      activityId: 'act_2',
      lessonId: lesson,
      isCorrect: false,
      attempts: 1,
      hintCount: 0,
      responseTimeMs: 30000,
      outcome: 'incorrect'
    });

    engine.recordActivity({
      activityId: 'act_3',
      lessonId: lesson,
      isCorrect: true,
      attempts: 1,
      hintCount: 0,
      responseTimeMs: 18000,
      outcome: 'success'
    });

    const rec = engine.recommendNextActivity(lesson);
    expect(rec.accuracy).toBe(67); // 2/3
  });

  it('should recommend easier activities when accuracy < 50%', () => {
    const lesson = 'lesson_1';

    // 4 incorrect, 1 correct = 20% accuracy
    for (let i = 0; i < 4; i++) {
      engine.recordActivity({
        activityId: `act_${i}`,
        lessonId: lesson,
        isCorrect: false,
        attempts: 1,
        hintCount: 0,
        responseTimeMs: 60000,
        outcome: 'incorrect'
      });
    }

    engine.recordActivity({
      activityId: 'act_4',
      lessonId: lesson,
      isCorrect: true,
      attempts: 1,
      hintCount: 0,
      responseTimeMs: 15000,
      outcome: 'success'
    });

    const rec = engine.recommendNextActivity(lesson);
    expect(rec.difficulty).toBe(1);
    expect(rec.reason).toContain('easier');
  });

  it('should recommend harder activities when accuracy > 80%', () => {
    const lesson = 'lesson_1';

    // 8 correct, 1 incorrect = 89% accuracy, fast responses, high first-attempt rate
    for (let i = 0; i < 8; i++) {
      engine.recordActivity({
        activityId: `act_${i}`,
        lessonId: lesson,
        isCorrect: true,
        attempts: 1,
        hintCount: 0,
        responseTimeMs: 12000,
        outcome: 'success'
      });
    }

    engine.recordActivity({
      activityId: 'act_8',
      lessonId: lesson,
      isCorrect: false,
      attempts: 1,
      hintCount: 0,
      responseTimeMs: 20000,
      outcome: 'incorrect'
    });

    const rec = engine.recommendNextActivity(lesson);
    expect(rec.difficulty).toBe(3);
    expect(rec.reason).toContain('increasing difficulty');
  });

  it('should generate summary statistics', () => {
    const lesson = 'lesson_1';

    engine.recordActivity({
      activityId: 'act_1',
      lessonId: lesson,
      isCorrect: true,
      attempts: 1,
      hintCount: 0,
      responseTimeMs: 15000,
      outcome: 'success'
    });

    engine.recordActivity({
      activityId: 'act_2',
      lessonId: lesson,
      isCorrect: true,
      attempts: 1,
      hintCount: 0,
      responseTimeMs: 18000,
      outcome: 'success'
    });

    const summary = engine.getSummary();
    expect(summary.totalActivities).toBe(2);
    expect(summary.totalCorrect).toBe(2);
    expect(summary.accuracy).toBe(100);
  });

  it('should serialize to JSON for persistence', () => {
    engine.recordActivity({
      activityId: 'act_1',
      lessonId: 'lesson_1',
      isCorrect: true,
      attempts: 1,
      hintCount: 0,
      responseTimeMs: 15000,
      outcome: 'success'
    });

    const json = engine.toJSON();
    expect(json).toHaveProperty('history');
    expect(json).toHaveProperty('skills');
    expect(json.history).toHaveLength(1);
  });

  it('should be deterministic: same input produces same recommendation', () => {
    const lesson = 'lesson_1';

    // Record identical results
    for (let i = 0; i < 5; i++) {
      engine.recordActivity({
        activityId: `act_${i}`,
        lessonId: lesson,
        isCorrect: i < 3, // 3 correct, 2 incorrect = 60%
        attempts: 1,
        hintCount: 0,
        responseTimeMs: 20000,
        outcome: i < 3 ? 'success' : 'incorrect'
      });
    }

    const rec1 = engine.recommendNextActivity(lesson);
    const rec2 = engine.recommendNextActivity(lesson);

    expect(rec1.difficulty).toBe(rec2.difficulty);
    expect(rec1.accuracy).toBe(rec2.accuracy);
    expect(rec1.reason).toBe(rec2.reason);
  });

  it('should track help usage and adjust recommendations', () => {
    const lesson = 'lesson_1';

    // High accuracy but with many hints = recommend review
    for (let i = 0; i < 5; i++) {
      engine.recordActivity({
        activityId: `act_${i}`,
        lessonId: lesson,
        isCorrect: true,
        attempts: 1,
        hintCount: 3, // Heavy hint usage
        responseTimeMs: 60000,
        outcome: 'success'
      });
    }

    const rec = engine.recommendNextActivity(lesson);
    expect(rec.reason).toContain('help');
  });
});
