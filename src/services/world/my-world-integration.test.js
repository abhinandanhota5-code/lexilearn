/**
 * MY WORLD INTEGRATION TEST
 * Verifies complete MY WORLD feature integration with app.js routing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldState, WORLD_THEMES, checkAchievementCriteria } from '../world/world-state.js';
import { renderMyWorldScreen } from '../../renderer/screens/learner/my-world-screen.js';
import { renderThemeSelectionScreen } from '../../renderer/screens/learner/theme-selection-screen.js';
import { renderStickerCollectionScreen } from '../../renderer/screens/learner/sticker-collection-screen.js';
import { renderWorldEditorScreen } from '../../renderer/screens/learner/world-editor-screen.js';

describe('MY WORLD: Complete Integration', () => {
  let mockProfile;
  let mockContainer;
  let worldState;

  beforeEach(() => {
    mockProfile = {
      learnerId: 'learner_integration_test',
      name: 'Integration Tester',
      screeningStatus: 'completed',
      learningStats: {
        totalActivities: 15,
        sessionStreakDays: 5,
        completedTopics: ['phonics', 'fluency'],
        completedMissions: ['reading', 'math'],
        recentMissions: [
          { title: 'Phonics Mastery', completed: true },
          { title: 'Fluency Challenge', completed: false }
        ]
      },
      worldState: null
    };

    worldState = new WorldState(mockProfile);

    // Mock DOM container
    mockContainer = document.createElement('div');
    mockContainer.id = 'app';
    document.body.appendChild(mockContainer);
  });

  afterEach(() => {
    mockContainer?.remove();
  });

  describe('MY WORLD Home Screen', () => {
    it('should render MY WORLD screen with profile data', () => {
      const onContinueLearning = vi.fn();
      const onCustomizeWorld = vi.fn();
      const onViewStickers = vi.fn();
      const onSelectTheme = vi.fn();

      renderMyWorldScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        recentMissions: mockProfile.learningStats.recentMissions,
        onContinueLearning,
        onCustomizeWorld,
        onViewStickers,
        onSelectTheme
      });

      expect(mockContainer.innerHTML).toContain('Welcome back');
      expect(mockContainer.innerHTML).toContain(mockProfile.name);
      expect(mockContainer.innerHTML).toContain('Continue Learning');
      expect(mockContainer.innerHTML).toContain('🎨 Customize');
      expect(mockContainer.innerHTML).toContain('⭐');
    });

    it('should display companion emoji in MY WORLD', () => {
      renderMyWorldScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        recentMissions: [],
        onContinueLearning: () => {},
        onCustomizeWorld: () => {},
        onViewStickers: () => {},
        onSelectTheme: () => {}
      });

      expect(mockContainer.innerHTML).toContain(worldState.selectedCompanion);
    });

    it('should display theme background colors', () => {
      renderMyWorldScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        recentMissions: [],
        onContinueLearning: () => {},
        onCustomizeWorld: () => {},
        onViewStickers: () => {},
        onSelectTheme: () => {}
      });

      const theme = WORLD_THEMES[worldState.selectedTheme];
      expect(mockContainer.innerHTML).toContain(theme.background);
    });

    it('should show recent missions', () => {
      renderMyWorldScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        recentMissions: mockProfile.learningStats.recentMissions,
        onContinueLearning: () => {},
        onCustomizeWorld: () => {},
        onViewStickers: () => {},
        onSelectTheme: () => {}
      });

      expect(mockContainer.innerHTML).toContain('Phonics Mastery');
      expect(mockContainer.innerHTML).toContain('✅'); // completed indicator
    });

    it('should display placed decorations', () => {
      // Unlock and place a decoration
      worldState.unlockDecoration('dino_hat', { totalActivities: 5 });
      worldState.placeDecoration('dino_hat', 100, 150);

      renderMyWorldScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        recentMissions: [],
        onContinueLearning: () => {},
        onCustomizeWorld: () => {},
        onViewStickers: () => {},
        onSelectTheme: () => {}
      });

      // Should display decoration emoji
      const decoration = WORLD_THEMES[worldState.selectedTheme].decorations.find(d => d.id === 'dino_hat');
      expect(mockContainer.innerHTML).toContain(decoration.emoji);
    });

    it('should wire onContinueLearning callback', () => {
      const onContinueLearning = vi.fn();

      renderMyWorldScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        recentMissions: [],
        onContinueLearning,
        onCustomizeWorld: () => {},
        onViewStickers: () => {},
        onSelectTheme: () => {}
      });

      const continueBtn = mockContainer.querySelector('#continue-btn');
      expect(continueBtn).toBeTruthy();
      continueBtn?.click();
      expect(onContinueLearning).toHaveBeenCalled();
    });

    it('should wire onCustomizeWorld callback', () => {
      const onCustomizeWorld = vi.fn();

      renderMyWorldScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        recentMissions: [],
        onContinueLearning: () => {},
        onCustomizeWorld,
        onViewStickers: () => {},
        onSelectTheme: () => {}
      });

      const customizeBtn = mockContainer.querySelector('#customize-btn');
      expect(customizeBtn).toBeTruthy();
      customizeBtn?.click();
      expect(onCustomizeWorld).toHaveBeenCalled();
    });

    it('should wire onViewStickers callback', () => {
      const onViewStickers = vi.fn();

      renderMyWorldScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        recentMissions: [],
        onContinueLearning: () => {},
        onCustomizeWorld: () => {},
        onViewStickers,
        onSelectTheme: () => {}
      });

      const stickersBtn = mockContainer.querySelector('#stickers-btn');
      expect(stickersBtn).toBeTruthy();
      stickersBtn?.click();
      expect(onViewStickers).toHaveBeenCalled();
    });
  });

  describe('Theme Selection Screen', () => {
    it('should render all 5 themes', () => {
      renderThemeSelectionScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        onThemeSelected: () => {},
        onBack: () => {}
      });

      const themes = Object.keys(WORLD_THEMES);
      themes.forEach(themeId => {
        const theme = WORLD_THEMES[themeId];
        expect(mockContainer.innerHTML).toContain(theme.name);
        expect(mockContainer.innerHTML).toContain(theme.emoji);
      });
    });

    it('should highlight current theme', () => {
      renderThemeSelectionScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        onThemeSelected: () => {},
        onBack: () => {}
      });

      expect(mockContainer.innerHTML).toContain('✓ Your World');
    });

    it('should call onThemeSelected with selected theme', () => {
      const onThemeSelected = vi.fn();

      renderThemeSelectionScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        onThemeSelected,
        onBack: () => {}
      });

      const themeCards = mockContainer.querySelectorAll('[data-theme-id]');
      expect(themeCards.length).toBeGreaterThan(0);

      // Click on racing-world theme
      const racingCard = Array.from(themeCards).find(card =>
        card.getAttribute('data-theme-id') === 'racing-world'
      );
      racingCard?.click();

      expect(onThemeSelected).toHaveBeenCalledWith('racing-world');
    });

    it('should show decorations for each theme', () => {
      renderThemeSelectionScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        onThemeSelected: () => {},
        onBack: () => {}
      });

      // Verify all decorations are shown in preview
      Object.values(WORLD_THEMES).forEach(theme => {
        theme.decorations.slice(0, 5).forEach(dec => {
          expect(mockContainer.innerHTML).toContain(dec.emoji);
        });
      });
    });
  });

  describe('Sticker Collection Screen', () => {
    it('should render sticker collection', () => {
      const profileStats = {
        totalActivities: 10,
        sessionStreakDays: 7,
        completedTopics: ['phonics']
      };

      renderStickerCollectionScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        profileStats,
        onBack: () => {}
      });

      expect(mockContainer.innerHTML).toContain('My Sticker Collection');
      expect(mockContainer.innerHTML).toContain('Collection Progress');
    });

    it('should show earned stickers', () => {
      worldState.unlockDecoration('dino_hat', { totalActivities: 5 });

      const profileStats = {
        totalActivities: 10,
        sessionStreakDays: 7,
        completedTopics: ['phonics']
      };

      renderStickerCollectionScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        profileStats,
        onBack: () => {}
      });

      expect(mockContainer.innerHTML).toContain('🎉 Earned');
      expect(mockContainer.innerHTML).toContain('Dino Hat');
    });

    it('should show locked stickers', () => {
      const profileStats = {
        totalActivities: 1, // Not enough for any unlocks
        sessionStreakDays: 0,
        completedTopics: []
      };

      renderStickerCollectionScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        profileStats,
        onBack: () => {}
      });

      expect(mockContainer.innerHTML).toContain('🔒 Locked');
    });

    it('should display progress percentage', () => {
      worldState.unlockDecoration('dino_hat', { totalActivities: 5 });

      const profileStats = { totalActivities: 10 };

      renderStickerCollectionScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        profileStats,
        onBack: () => {}
      });

      // 1 of 5 decorations earned = 20%
      expect(mockContainer.innerHTML).toContain('20%');
    });
  });

  describe('World Editor Screen', () => {
    it('should render world editor', () => {
      worldState.unlockDecoration('dino_hat', { totalActivities: 5 });

      renderWorldEditorScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        onSave: () => {},
        onBack: () => {}
      });

      expect(mockContainer.innerHTML).toContain('Edit Your World');
      expect(mockContainer.innerHTML).toContain('Drag decorations');
    });

    it('should display earned decorations in panel', () => {
      worldState.unlockDecoration('dino_hat', { totalActivities: 5 });
      worldState.unlockDecoration('fossil', { completedTopics: ['phonics'] });

      renderWorldEditorScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        onSave: () => {},
        onBack: () => {}
      });

      expect(mockContainer.innerHTML).toContain('Dino Hat');
      expect(mockContainer.innerHTML).toContain('Fossil');
    });

    it('should show placed decorations on canvas', () => {
      worldState.unlockDecoration('dino_hat', { totalActivities: 5 });
      worldState.placeDecoration('dino_hat', 100, 150);

      renderWorldEditorScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        onSave: () => {},
        onBack: () => {}
      });

      expect(mockContainer.innerHTML).toContain('placed-decoration');
    });

    it('should wire onSave callback', () => {
      const onSave = vi.fn();

      renderWorldEditorScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        onSave,
        onBack: () => {}
      });

      const saveBtn = mockContainer.querySelector('#save-btn');
      expect(saveBtn).toBeTruthy();
      saveBtn?.click();
      expect(onSave).toHaveBeenCalled();
    });

    it('should wire reset button', () => {
      worldState.unlockDecoration('dino_hat', { totalActivities: 5 });
      worldState.placeDecoration('dino_hat', 100, 150);
      expect(worldState.placedDecorations).toHaveLength(1);

      renderWorldEditorScreen(mockContainer, {
        profile: mockProfile,
        worldState,
        onSave: () => {},
        onBack: () => {}
      });

      const resetBtn = mockContainer.querySelector('#reset-btn');
      expect(resetBtn).toBeTruthy();

      // Mock confirm
      global.confirm = vi.fn(() => true);

      resetBtn?.click();

      // After reset, placed decorations should be cleared
      expect(worldState.placedDecorations).toHaveLength(0);
      // But earned decorations stay
      expect(worldState.earnedDecorations).toContain('dino_hat');
    });
  });

  describe('Achievement-Based Unlocking Integration', () => {
    it('should unlock decorations when achievements met', () => {
      const profileStats = {
        totalActivities: 5,
        sessionStreakDays: 7,
        completedTopics: ['phonics', 'fluency'],
        completedMissions: ['reading']
      };

      // These should all unlock now
      worldState.unlockDecoration('dino_hat', profileStats);
      worldState.unlockDecoration('egg', profileStats);
      worldState.unlockDecoration('fossil', profileStats);
      worldState.unlockDecoration('volcano', profileStats);

      expect(worldState.earnedDecorations).toHaveLength(4);
    });

    it('should not unlock if criteria not met', () => {
      const profileStats = {
        totalActivities: 2, // Need 5
        sessionStreakDays: 0
      };

      const result = worldState.unlockDecoration('dino_hat', profileStats);
      expect(result.success).toBe(false);
      expect(worldState.earnedDecorations).toHaveLength(0);
    });

    it('should prevent duplicate unlocking', () => {
      const profileStats = { totalActivities: 5 };

      worldState.unlockDecoration('dino_hat', profileStats);
      const secondAttempt = worldState.unlockDecoration('dino_hat', profileStats);

      expect(secondAttempt.success).toBe(false);
      expect(worldState.earnedDecorations.filter(d => d === 'dino_hat')).toHaveLength(1);
    });
  });

  describe('Persistence Integration', () => {
    it('should serialize world state for saving', () => {
      worldState.unlockDecoration('dino_hat', { totalActivities: 5 });
      worldState.setTheme('racing-world');
      worldState.setCompanion('🦖');
      worldState.placeDecoration('dino_hat', 100, 150);

      const json = worldState.toJSON();

      expect(json.learnerId).toBe(mockProfile.learnerId);
      expect(json.selectedTheme).toBe('racing-world');
      expect(json.selectedCompanion).toBe('🦖');
      expect(json.earnedDecorations).toContain('dino_hat');
      expect(json.placedDecorations).toHaveLength(1);
      expect(json.savedAt).toBeDefined();
    });

    it('should restore world state from JSON', () => {
      worldState.setTheme('ocean-world');
      worldState.unlockDecoration('fish', { totalActivities: 5 });
      worldState.placeDecoration('fish', 200, 200);

      const json = worldState.toJSON();
      const restored = WorldState.fromJSON(json);

      expect(restored.selectedTheme).toBe('ocean-world');
      expect(restored.earnedDecorations).toContain('fish');
      expect(restored.placedDecorations).toHaveLength(1);
      expect(restored.placedDecorations[0].x).toBe(200);
      expect(restored.placedDecorations[0].y).toBe(200);
    });

    it('should save to profile for persistence', () => {
      worldState.unlockDecoration('dino_hat', { totalActivities: 5 });
      worldState.setTheme('space-world');

      mockProfile.worldState = worldState.toJSON();

      // Simulate app reload - recreate from saved profile
      const reloadedWorld = new WorldState(mockProfile);

      expect(reloadedWorld.selectedTheme).toBe('space-world');
      expect(reloadedWorld.earnedDecorations).toContain('dino_hat');
    });
  });

  describe('Multi-Learner Separation', () => {
    it('should keep learners separate', () => {
      const learner1 = new WorldState({ learnerId: 'child_1' });
      const learner2 = new WorldState({ learnerId: 'child_2' });

      learner1.unlockDecoration('dino_hat', { totalActivities: 5 });
      learner1.setCompanion('🦖');

      learner2.setCompanion('🦄');

      expect(learner1.earnedDecorations).toContain('dino_hat');
      expect(learner2.earnedDecorations).toHaveLength(0);
      expect(learner1.selectedCompanion).toBe('🦖');
      expect(learner2.selectedCompanion).toBe('🦄');
    });
  });
});
