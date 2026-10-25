/**
 * Verify companion stickers appear on key learner screens from profile.avatar.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../components/companion/companion-widget.js', () => ({
  mountCompanionWidget: vi.fn()
}));

vi.mock('../../services/pe-integration.js', () => ({
  peIntegration: {
    getPendingProposals: vi.fn(async () => []),
    handleAccept: vi.fn(),
    handleDismiss: vi.fn()
  }
}));

vi.mock('../../../services/learning/curriculum.js', () => ({
  getLessonMap: vi.fn(() => [
    {
      id: 'lesson-1',
      subject: 'Reading',
      title: 'Sounds',
      state: 'available',
      activities: 3,
      difficulty: 1
    }
  ])
}));

import { renderMyDayScreen } from '../../screens/learner/my-day-screen.js';
import { renderLessonSelectionScreen } from '../../screens/learner/lesson-selection-screen.js';
import { renderMissionScreen } from '../../screens/learner/mission-screen.js';
import { renderQuestCompleteScreen } from '../../screens/learner/quest-complete-screen.js';
import { renderLessonCompletionScreen } from '../../screens/learner/lesson-completion-screen.js';

const COMPANIONS = ['racing-car', 'dinosaur', 'ocean-friends'];

function profileFor(avatar) {
  return {
    learnerId: 'test-learner',
    name: 'Sam',
    grade: '2nd Grade',
    avatar,
    theme: `${avatar === 'ocean-friends' ? 'ocean' : avatar === 'racing-car' ? 'racing' : 'dinosaur'}-world`
  };
}

describe('companion stickers on learner screens', () => {
  let root;

  beforeEach(() => {
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it.each(COMPANIONS)('my-day shows %s sticker set from profile.avatar', (avatar) => {
    renderMyDayScreen(root, {
      profile: profileFor(avatar),
      dashboard: {
        greeting: { text: 'Hi Sam!', emoji: '🌟' },
        practice: { availability: 'ready' },
        schoolwork: { availability: 'unavailable', items: [] }
      }
    });
    const layer = root.querySelector('[data-sticker-layer="scrapbook"]');
    expect(layer).toBeTruthy();
    expect(layer.getAttribute('data-sticker-set')).toBe(avatar);
    expect(layer.querySelectorAll('.sticker').length).toBeGreaterThanOrEqual(3);
  });

  it('my-day shows neutral stickers when avatar is missing', () => {
    renderMyDayScreen(root, {
      profile: { name: 'Sam', grade: '2nd Grade' },
      dashboard: {
        greeting: { text: 'Hi!', emoji: '🌟' },
        practice: { availability: 'empty' },
        schoolwork: { availability: 'unavailable', items: [] }
      }
    });
    const layer = root.querySelector('[data-sticker-layer]');
    expect(layer?.getAttribute('data-sticker-set')).toBe('neutral');
  });

  it.each(COMPANIONS)('lesson selection shows %s stickers', (avatar) => {
    renderLessonSelectionScreen(root, {
      profile: profileFor(avatar),
      onSelectLesson: () => {},
      onBackToProfile: () => {}
    });
    const layer = root.querySelector('[data-sticker-layer="scrapbook"]');
    expect(layer?.getAttribute('data-sticker-set')).toBe(avatar);
  });

  it.each(COMPANIONS)('mission screen shows %s stickers', (avatar) => {
    renderMissionScreen(root, {
      profile: profileFor(avatar),
      mission: { plan: { title: 'Adventure' }, goalActivities: 5, companionName: 'Buddy' },
      onStart: () => {}
    });
    expect(root.querySelector('[data-sticker-layer]')?.getAttribute('data-sticker-set')).toBe(avatar);
  });

  it.each(COMPANIONS)('quest complete shows %s progress stickers', (avatar) => {
    renderQuestCompleteScreen(root, {
      profile: profileFor(avatar),
      summary: { totalTasks: 6, categoriesCovered: [1, 2, 3, 4, 5, 6] },
      onFinish: () => {}
    });
    const sets = [...root.querySelectorAll('[data-sticker-layer]')].map((el) =>
      el.getAttribute('data-sticker-set')
    );
    expect(sets.length).toBeGreaterThan(0);
    expect(sets.every((s) => s === avatar)).toBe(true);
  });

  it.each(COMPANIONS)('lesson completion shows %s celebrate stickers', (avatar) => {
    renderLessonCompletionScreen(root, {
      profile: profileFor(avatar),
      lesson: { title: 'Sounds' },
      summary: { accuracy: 80, activitiesCompleted: 3 },
      onContinue: () => {},
      onSelectAnother: () => {}
    });
    const celebrate = root.querySelector('[data-sticker-layer="celebrate"]');
    expect(celebrate?.getAttribute('data-sticker-set')).toBe(avatar);
  });
});
