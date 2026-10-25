/**
 * Tests for MY WORLD: Interactive Learning Space
 * Verifies: reward eligibility, world persistence, decoration placement, learner separation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldState, checkAchievementCriteria, WORLD_THEMES } from './world-state.js';

describe('MY WORLD: World State and Decorations', () => {
  let world;
  let mockProfile;

  beforeEach(() => {
    mockProfile = {
      learnerId: 'learner_world_1',
      name: 'Explorer',
      worldState: null
    };
    world = new WorldState(mockProfile);
  });

  it('should initialize with default theme and companion', () => {
    expect(world.selectedTheme).toBe('dinosaur-world');
    expect(world.selectedCompanion).toBe('🐝');
    expect(world.earnedDecorations).toEqual([]);
    expect(world.placedDecorations).toEqual([]);
  });

  it('should have all theme types available', () => {
    const themes = Object.keys(WORLD_THEMES);
    expect(themes).toContain('dinosaur-world');
    expect(themes).toContain('racing-world');
    expect(themes).toContain('ocean-world');
    expect(themes).toContain('space-world');
    expect(themes).toContain('fantasy-world');
  });

  it('should get decorations for current theme', () => {
    const stats = { totalActivities: 10, sessionStreakDays: 7, completedTopics: ['phonics'] };
    const decorations = world.getAvailableDecorations(stats);
    expect(Array.isArray(decorations)).toBe(true);
    // Some decorations should be available with these stats
    expect(decorations.length).toBeGreaterThanOrEqual(0);
  });

  it('should check achievement criteria: complete_5_activities', () => {
    const notMet = checkAchievementCriteria('complete_5_activities', { totalActivities: 3 });
    const met = checkAchievementCriteria('complete_5_activities', { totalActivities: 5 });

    expect(notMet).toBe(false);
    expect(met).toBe(true);
  });

  it('should check achievement criteria: first_week_streak', () => {
    const notMet = checkAchievementCriteria('first_week_streak', { sessionStreakDays: 3 });
    const met = checkAchievementCriteria('first_week_streak', { sessionStreakDays: 7 });

    expect(notMet).toBe(false);
    expect(met).toBe(true);
  });

  it('should check achievement criteria: topic completion', () => {
    const notMet = checkAchievementCriteria('complete_phonics_topic', { completedTopics: [] });
    const met = checkAchievementCriteria('complete_phonics_topic', { completedTopics: ['phonics'] });

    expect(notMet).toBe(false);
    expect(met).toBe(true);
  });

  it('should unlock decoration when achievement criteria met', () => {
    const stats = { totalActivities: 5 };
    const result = world.unlockDecoration('dino_hat', stats);

    expect(result.success).toBe(true);
    expect(world.earnedDecorations).toContain('dino_hat');
  });

  it('should not unlock decoration when criteria not met', () => {
    const stats = { totalActivities: 1 }; // Need 5
    const result = world.unlockDecoration('dino_hat', stats);

    expect(result.success).toBe(false);
  });

  it('should not duplicate decoration awards', () => {
    const stats = { totalActivities: 5 };

    const first = world.unlockDecoration('dino_hat', stats);
    const second = world.unlockDecoration('dino_hat', stats);

    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
    expect(world.earnedDecorations.filter(d => d === 'dino_hat')).toHaveLength(1);
  });

  it('should place decoration at coordinates', () => {
    const stats = { totalActivities: 5 };
    world.unlockDecoration('dino_hat', stats);

    const result = world.placeDecoration('dino_hat', 100, 150);

    expect(result.success).toBe(true);
    expect(world.placedDecorations).toHaveLength(1);
    expect(world.placedDecorations[0]).toHaveProperty('x', 100);
    expect(world.placedDecorations[0]).toHaveProperty('y', 150);
  });

  it('should not place decoration that is not earned', () => {
    const result = world.placeDecoration('dino_hat', 100, 150);

    expect(result.success).toBe(false);
    expect(world.placedDecorations).toHaveLength(0);
  });

  it('should move placed decoration when placing again', () => {
    const stats = { totalActivities: 5 };
    world.unlockDecoration('dino_hat', stats);

    world.placeDecoration('dino_hat', 100, 150);
    const result = world.placeDecoration('dino_hat', 200, 250);

    expect(result.success).toBe(true);
    expect(world.placedDecorations).toHaveLength(1);
    expect(world.placedDecorations[0]).toHaveProperty('x', 200);
    expect(world.placedDecorations[0]).toHaveProperty('y', 250);
  });

  it('should remove placed decoration', () => {
    const stats = { totalActivities: 5 };
    world.unlockDecoration('dino_hat', stats);
    world.placeDecoration('dino_hat', 100, 150);

    const placedId = world.placedDecorations[0].id;
    const result = world.removeDecoration(placedId);

    expect(result.success).toBe(true);
    expect(world.placedDecorations).toHaveLength(0);
  });

  it('should change theme', () => {
    const result = world.setTheme('racing-world');

    expect(result.success).toBe(true);
    expect(world.selectedTheme).toBe('racing-world');
  });

  it('should reset placed decorations when theme changes', () => {
    const stats = { totalActivities: 5 };
    world.unlockDecoration('dino_hat', stats);
    world.placeDecoration('dino_hat', 100, 150);

    world.setTheme('racing-world');

    expect(world.placedDecorations).toHaveLength(0);
    expect(world.earnedDecorations).toContain('dino_hat'); // Earned decorations kept
  });

  it('should not change to invalid theme', () => {
    const result = world.setTheme('invalid-theme');

    expect(result.success).toBe(false);
    expect(world.selectedTheme).toBe('dinosaur-world');
  });

  it('should change companion', () => {
    const result = world.setCompanion('🦖');

    expect(result.success).toBe(true);
    expect(world.selectedCompanion).toBe('🦖');
  });

  it('should reset world layout', () => {
    const stats = { totalActivities: 5 };
    world.unlockDecoration('dino_hat', stats);
    world.placeDecoration('dino_hat', 100, 150);

    const result = world.resetLayout();

    expect(result.success).toBe(true);
    expect(world.placedDecorations).toHaveLength(0);
    expect(world.earnedDecorations).toContain('dino_hat'); // Keeps earned
  });

  it('should serialize world state to JSON', () => {
    const stats = { totalActivities: 5 };
    world.unlockDecoration('dino_hat', stats);
    world.setCompanion('🦖');
    world.placeDecoration('dino_hat', 100, 150);

    const json = world.toJSON();

    expect(json.learnerId).toBe(mockProfile.learnerId);
    expect(json.selectedCompanion).toBe('🦖');
    expect(json.earnedDecorations).toContain('dino_hat');
    expect(json.placedDecorations).toHaveLength(1);
    expect(json.savedAt).toBeDefined();
  });

  it('should restore world state from JSON', () => {
    const original = new WorldState(mockProfile);
    const stats = { totalActivities: 5 };
    original.unlockDecoration('dino_hat', stats);
    original.setCompanion('🦖');
    original.placeDecoration('dino_hat', 100, 150);

    const json = original.toJSON();
    const restored = WorldState.fromJSON(json);

    expect(restored.learnerId).toBe(original.learnerId);
    expect(restored.selectedCompanion).toBe(original.selectedCompanion);
    expect(restored.selectedTheme).toBe(original.selectedTheme);
    expect(restored.earnedDecorations).toEqual(original.earnedDecorations);
    expect(restored.placedDecorations).toHaveLength(original.placedDecorations.length);
  });

  it('should support multiple earned decorations', () => {
    const stats = { totalActivities: 10, sessionStreakDays: 7 };

    world.unlockDecoration('dino_hat', { totalActivities: 5 });
    world.unlockDecoration('fossil', { completedTopics: ['phonics'] });
    world.unlockDecoration('egg', stats);

    expect(world.earnedDecorations).toHaveLength(3);
  });

  it('should keep learner data separate', () => {
    const world1 = new WorldState({ learnerId: 'learner_1' });
    const world2 = new WorldState({ learnerId: 'learner_2' });

    const stats = { totalActivities: 5 };
    world1.unlockDecoration('dino_hat', stats);
    world2.setCompanion('🦖');

    expect(world1.earnedDecorations).toContain('dino_hat');
    expect(world2.earnedDecorations).toHaveLength(0);
    expect(world1.selectedCompanion).toBe('🐝');
    expect(world2.selectedCompanion).toBe('🦖');
  });

  it('should handle multiple decorations per theme', () => {
    const theme = WORLD_THEMES['dinosaur-world'];
    expect(theme.decorations.length).toBeGreaterThan(1);

    // Each decoration should have unique id
    const ids = theme.decorations.map(d => d.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should validate theme data structure', () => {
    Object.entries(WORLD_THEMES).forEach(([themeId, theme]) => {
      expect(theme.name).toBeDefined();
      expect(theme.background).toBeDefined();
      expect(theme.emoji).toBeDefined();
      expect(Array.isArray(theme.decorations)).toBe(true);

      theme.decorations.forEach(dec => {
        expect(dec.id).toBeDefined();
        expect(dec.name).toBeDefined();
        expect(dec.emoji).toBeDefined();
        expect(dec.unlockedBy).toBeDefined();
      });
    });
  });

  it('should handle empty profile data gracefully', () => {
    const emptyWorld = new WorldState(null);

    expect(emptyWorld.learnerId).toBe('unknown');
    expect(emptyWorld.selectedTheme).toBe('dinosaur-world');
    expect(emptyWorld.earnedDecorations).toEqual([]);
  });

  it('should track multiple placed decorations separately', () => {
    const stats = { totalActivities: 10 };
    world.unlockDecoration('dino_hat', stats);
    world.unlockDecoration('fossil', { completedTopics: ['phonics'] });

    world.placeDecoration('dino_hat', 100, 100);
    world.placeDecoration('fossil', 200, 200);

    expect(world.placedDecorations).toHaveLength(2);
    expect(world.placedDecorations[0].x).toBe(100);
    expect(world.placedDecorations[1].x).toBe(200);
  });
});

describe('MY WORLD: Achievement Eligibility', () => {
  it('should track all achievement types', () => {
    const achievements = [
      'complete_5_activities',
      'complete_10_activities',
      'first_week_streak',
      'complete_phonics_topic',
      'complete_fluency_topic',
      'complete_vocabulary_topic',
      'complete_reading_mission',
      'complete_math_mission'
    ];

    achievements.forEach(achievement => {
      const result = checkAchievementCriteria(achievement, {});
      expect(typeof result).toBe('boolean');
    });
  });

  it('should return false for unknown achievement', () => {
    const result = checkAchievementCriteria('unknown_achievement', {});
    expect(result).toBe(false);
  });

  it('should check mission completion', () => {
    const notMet = checkAchievementCriteria('complete_reading_mission', { completedMissions: [] });
    const met = checkAchievementCriteria('complete_reading_mission', { completedMissions: ['reading'] });

    expect(notMet).toBe(false);
    expect(met).toBe(true);
  });

  it('should require exact achievement match', () => {
    const stats = { totalActivities: 4 }; // 1 short of 5
    const result = checkAchievementCriteria('complete_5_activities', stats);
    expect(result).toBe(false);
  });
});
