/**
 * MY WORLD: Interactive Personalised Learning Space
 *
 * Children can:
 * - See their companion in a themed environment
 * - Earn decorations through learning achievements
 * - Place and arrange decorations
 * - Customize their world appearance
 * - View recent learning missions
 *
 * All customisations and earned rewards persist per learner.
 */

export const WORLD_THEMES = {
  'racing-world': {
    name: 'Racing World',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    foreground: '#E94560',
    secondaryColor: '#FF6B8A',
    emoji: '🏎️',
    companion: 'racing-car',
    decorations: [
      { id: 'racing_flag', name: 'Checkered Flag', emoji: '🏁', unlockedBy: 'complete_5_activities' },
      { id: 'track', name: 'Race Track', emoji: '🏁', unlockedBy: 'complete_10_activities' },
      { id: 'garage', name: 'Garage', emoji: '🏠', unlockedBy: 'complete_fluency_topic' },
      { id: 'car', name: 'Race Car', emoji: '🏎️', unlockedBy: 'first_week_streak' },
      { id: 'trophy', name: 'Trophy', emoji: '🏆', unlockedBy: 'complete_math_mission' }
    ]
  },
  'dinosaur-world': {
    name: 'Dinosaur World',
    background: 'linear-gradient(135deg, #2d5016 0%, #5a7d3d 100%)',
    foreground: '#8BC34A',
    secondaryColor: '#A5D6A7',
    emoji: '🦕',
    companion: 'dinosaur',
    decorations: [
      { id: 'dino_hat', name: 'Dino Hat', emoji: '🦖', unlockedBy: 'complete_5_activities' },
      { id: 'fossil', name: 'Fossil', emoji: '🔶', unlockedBy: 'complete_phonics_topic' },
      { id: 'tree', name: 'Jungle Tree', emoji: '🌴', unlockedBy: 'complete_10_activities' },
      { id: 'egg', name: 'Dino Egg', emoji: '🥚', unlockedBy: 'first_week_streak' },
      { id: 'volcano', name: 'Volcano', emoji: '🌋', unlockedBy: 'complete_reading_mission' }
    ]
  },
  'ocean-world': {
    name: 'Ocean World',
    background: 'linear-gradient(135deg, #0a3d62 0%, #1a5f7a 100%)',
    foreground: '#00BCD4',
    secondaryColor: '#4DD0E1',
    emoji: '🐙',
    companion: 'ocean-friends',
    decorations: [
      { id: 'fish', name: 'Tropical Fish', emoji: '🐠', unlockedBy: 'complete_5_activities' },
      { id: 'coral', name: 'Coral Reef', emoji: '🪸', unlockedBy: 'complete_vocabulary_topic' },
      { id: 'shell', name: 'Shell', emoji: '🐚', unlockedBy: 'complete_10_activities' },
      { id: 'bubble', name: 'Bubble', emoji: '💧', unlockedBy: 'first_week_streak' },
      { id: 'whale', name: 'Whale', emoji: '🐋', unlockedBy: 'complete_comprehension_mission' }
    ]
  }
};

/**
 * Achievement criteria that unlock decorations.
 * Returns true if achievement is met, false otherwise.
 */
export function checkAchievementCriteria(criteriaId, profileStats) {
  const stats = profileStats || {};

  const criteria = {
    'complete_5_activities': () => (stats.totalActivities || 0) >= 5,
    'complete_10_activities': () => (stats.totalActivities || 0) >= 10,
    'first_week_streak': () => (stats.sessionStreakDays || 0) >= 7,
    'complete_phonics_topic': () => (stats.completedTopics || []).includes('phonics'),
    'complete_fluency_topic': () => (stats.completedTopics || []).includes('fluency'),
    'complete_vocabulary_topic': () => (stats.completedTopics || []).includes('vocabulary'),
    'complete_writing_topic': () => (stats.completedTopics || []).includes('writing'),
    'complete_science_topic': () => (stats.completedTopics || []).includes('science'),
    'complete_reading_mission': () => (stats.completedMissions || []).includes('reading'),
    'complete_math_mission': () => (stats.completedMissions || []).includes('math'),
    'complete_comprehension_mission': () => (stats.completedMissions || []).includes('comprehension'),
    'complete_stem_mission': () => (stats.completedMissions || []).includes('stem'),
    'complete_creative_mission': () => (stats.completedMissions || []).includes('creative')
  };

  return criteria[criteriaId] ? criteria[criteriaId]() : false;
}

/**
 * World state: learner's customisations, earned decorations, placed items.
 */
export class WorldState {
  constructor(profile = {}) {
    profile = profile || {};
    this.learnerId = profile.learnerId || 'unknown';
    this.selectedTheme = profile.worldState?.selectedTheme || 'dinosaur-world';
    this.selectedCompanion = profile.worldState?.selectedCompanion || 'fox';
    this.earnedDecorations = profile.worldState?.earnedDecorations || [];
    this.placedDecorations = profile.worldState?.placedDecorations || [];
    this.customBackground = profile.worldState?.customBackground || null;
  }

  /**
   * Get available decorations for current theme.
   * Returns earned decorations only.
   */
  getAvailableDecorations(profileStats) {
    const theme = WORLD_THEMES[this.selectedTheme];
    if (!theme) return [];

    return theme.decorations
      .filter(dec => this.isDecorationUnlocked(dec.id, profileStats))
      .map(dec => ({
        ...dec,
        earned: this.earnedDecorations.includes(dec.id),
        placed: this.placedDecorations.some(p => p.decorationId === dec.id)
      }));
  }

  /**
   * Check if decoration is unlocked by achievement criteria.
   */
  isDecorationUnlocked(decorationId, profileStats) {
    const theme = WORLD_THEMES[this.selectedTheme];
    if (!theme) return false;

    const decoration = theme.decorations.find(d => d.id === decorationId);
    if (!decoration) return false;

    return checkAchievementCriteria(decoration.unlockedBy, profileStats);
  }

  /**
   * Mark decoration as earned.
   * Only awards if achievement criteria met and not already earned.
   */
  unlockDecoration(decorationId, profileStats) {
    if (this.earnedDecorations.includes(decorationId)) {
      return { success: false, message: 'Already earned' };
    }

    if (!this.isDecorationUnlocked(decorationId, profileStats)) {
      return { success: false, message: 'Achievement not met' };
    }

    this.earnedDecorations.push(decorationId);
    return { success: true, message: 'Decoration unlocked!' };
  }

  /**
   * Place decoration at coordinates.
   */
  placeDecoration(decorationId, x, y) {
    if (!this.earnedDecorations.includes(decorationId)) {
      return { success: false, message: 'Decoration not earned' };
    }

    // Check if already placed
    const existing = this.placedDecorations.find(p => p.decorationId === decorationId);
    if (existing) {
      existing.x = x;
      existing.y = y;
      return { success: true, message: 'Decoration moved' };
    }

    this.placedDecorations.push({
      decorationId,
      x,
      y,
      id: `placed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    return { success: true, message: 'Decoration placed!' };
  }

  /**
   * Remove placed decoration.
   */
  removeDecoration(placedDecorationId) {
    const index = this.placedDecorations.findIndex(p => p.id === placedDecorationId);
    if (index >= 0) {
      this.placedDecorations.splice(index, 1);
      return { success: true };
    }
    return { success: false, message: 'Decoration not found' };
  }

  /**
   * Change theme.
   */
  setTheme(themeId) {
    if (!WORLD_THEMES[themeId]) {
      return { success: false, message: 'Invalid theme' };
    }
    this.selectedTheme = themeId;
    this.placedDecorations = []; // Reset placed decorations when theme changes
    return { success: true };
  }

  /**
   * Change companion.
   */
  setCompanion(companionId) {
    if (typeof companionId !== 'string' || companionId.length === 0) {
      return { success: false, message: 'Invalid companion' };
    }
    this.selectedCompanion = companionId;
    return { success: true };
  }

  /**
   * Reset world layout (keeps earned decorations).
   */
  resetLayout() {
    this.placedDecorations = [];
    return { success: true, message: 'World layout reset' };
  }

  /**
   * Serialize for persistence.
   */
  toJSON() {
    return {
      learnerId: this.learnerId,
      selectedTheme: this.selectedTheme,
      selectedCompanion: this.selectedCompanion,
      earnedDecorations: this.earnedDecorations,
      placedDecorations: this.placedDecorations,
      customBackground: this.customBackground,
      savedAt: new Date().toISOString()
    };
  }

  /**
   * Restore from persistence.
   */
  static fromJSON(data) {
    const world = new WorldState();
    if (data) {
      world.learnerId = data.learnerId || world.learnerId;
      world.selectedTheme = data.selectedTheme || world.selectedTheme;
      // Handle legacy data where selectedCompanion was an emoji - map to ID
      const companionMap = {
        '🐝': 'fox',
        '🦊': 'fox',
        '🦉': 'owl',
        '🐻': 'bear',
        '🐬': 'dolphin',
        '🐰': 'rabbit',
        '🐢': 'turtle'
      };
      const companion = data.selectedCompanion || world.selectedCompanion;
      world.selectedCompanion = companionMap[companion] || companion;
      world.earnedDecorations = Array.isArray(data.earnedDecorations) ? data.earnedDecorations : [];
      world.placedDecorations = Array.isArray(data.placedDecorations) ? data.placedDecorations : [];
      world.customBackground = data.customBackground || null;
    }
    return world;
  }
}
