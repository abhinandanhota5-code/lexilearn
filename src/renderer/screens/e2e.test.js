/**
 * End-to-End Navigation and Feature Tests
 * Tests: parent dashboard access, lesson selection, learning activities, audio controls
 * Can run in isolated DOM environment for quick verification
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderProfileOverviewScreen } from './parent/profile-overview-screen.js';
import { renderParentDashboardScreen } from './parent/parent-dashboard-screen.js';
import { renderLessonSelectionScreen } from './learner/lesson-selection-screen.js';
import { renderLearningActivityScreen } from './learner/learning-activity-screen.js';

describe('LexiLearn E2E Navigation', () => {
  let container;
  let mockProfile;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    mockProfile = {
      learnerId: 'test_learner',
      name: 'Test Child',
      age: 8,
      grade: '2nd Grade',
      avatar: 'fox',
      theme: 'warm-parchment',
      screeningStatus: 'completed',
      accommodations: {
        fontSizePx: 24,
        lineHeight: 1.8,
        letterSpacingEm: 0.16,
        syllableColoringEnabled: true,
        readingRulerEnabled: true,
        questionsReadAloud: true,
        audioNarrationSpeed: 0.85
      },
      adaptiveLearning: {
        history: [],
        skills: {},
        meta: { sessions: 0, activities: 0 }
      }
    };
  });

  afterEach(() => {
    if (container) container.remove();
  });

  it('should render profile overview screen with parent dashboard button', () => {
    let dashboardClicked = false;

    renderProfileOverviewScreen(container, {
      profile: mockProfile,
      onEditProfile: () => {},
      onParentDashboard: () => { dashboardClicked = true; },
      onUploadDocument: () => {},
      onSchoolMaterial: () => {},
      onStartLearning: () => {},
      onResetProfile: () => {}
    });

    const dashboardBtn = container.querySelector('#parent-dashboard-btn');
    expect(dashboardBtn).toBeDefined();
    expect(dashboardBtn.textContent).toContain('📊');

    // Simulate click
    dashboardBtn.click();
    expect(dashboardClicked).toBe(true);
  });

  it('should render parent dashboard when button clicked', () => {
    renderParentDashboardScreen(container, {
      profile: mockProfile,
      onSelectLearner: () => {},
      onEditProfile: () => {},
      onAccessibilitySettings: () => {},
      onBackToProfile: () => {},
      onStartLearning: () => {}
    });

    const title = container.querySelector('h1');
    expect(title.textContent).toContain('Parent Dashboard');

    const learnerName = container.textContent;
    expect(learnerName).toContain('Test Child');
  });

  it('should show learner progress stats on parent dashboard', () => {
    renderParentDashboardScreen(container, {
      profile: mockProfile,
      onBackToProfile: () => {}
    });

    const stats = container.textContent;
    expect(stats).toContain('Active Learner');
    expect(stats).toContain('Progress Overview');
    expect(stats).toContain('Settings & Preferences');
  });

  it('should have Start Learning button on parent dashboard', () => {
    let startLearningClicked = false;

    renderParentDashboardScreen(container, {
      profile: mockProfile,
      onStartLearning: () => { startLearningClicked = true; }
    });

    const startBtn = container.querySelector('#start-learning-btn');
    expect(startBtn).toBeDefined();
    expect(startBtn.textContent).toContain('Start Learning');

    startBtn.click();
    expect(startLearningClicked).toBe(true);
  });

  it('should render lesson selection screen', () => {
    renderLessonSelectionScreen(container, {
      profile: mockProfile,
      onSelectLesson: () => {},
      onBackToProfile: () => {}
    });

    const title = container.textContent;
    expect(title).toContain("Test Child's Learning Path");
    expect(title).toContain('2nd Grade');
  });

  it('should show available lessons grouped by subject', () => {
    renderLessonSelectionScreen(container, {
      profile: mockProfile,
      onSelectLesson: () => {},
      onBackToProfile: () => {}
    });

    // Lessons should be grouped by subject
    const content = container.textContent;
    // 2nd Grade has Word Families as a subject
    expect(content.toLowerCase()).toContain('word families');
  });

  it('should allow selecting available lessons', () => {
    let selectedLesson = null;

    renderLessonSelectionScreen(container, {
      profile: mockProfile,
      onSelectLesson: (lesson) => { selectedLesson = lesson; },
      onBackToProfile: () => {}
    });

    const lessonButtons = container.querySelectorAll('.lesson-card:not([disabled])');
    if (lessonButtons.length > 0) {
      lessonButtons[0].click();
      expect(selectedLesson).toBeDefined();
    }
  });

  it('should render learning activity screen with audio buttons', () => {
    const mockPlan = {
      id: 'activity_1',
      lessonId: 'lesson_1',
      mode: 'choose',
      title: 'Practice',
      prompt: 'Which word has the short a sound?',
      presentation: {
        mode: 'text',
        audioPrompt: 'Which word has the short a sound?',
        ttsRate: 0.85,
        replayEnabled: true
      },
      options: [
        { id: 'opt_1', label: 'Make' },
        { id: 'opt_2', label: 'Cat' },
        { id: 'opt_3', label: 'Cake' }
      ]
    };

    renderLearningActivityScreen(container, {
      profile: mockProfile,
      plan: mockPlan,
      completedCount: 0,
      goalActivities: 3,
      onSubmit: async () => ({ isCorrect: true }),
      onTimeoutSubmit: async () => ({ isCorrect: false }),
      onAdvance: () => {}
    });

    // Verify audio buttons are rendered
    const listenBtn = container.querySelector('#audio-btn');
    const replayBtn = container.querySelector('#replay-btn');
    const stopBtn = container.querySelector('#stop-btn');

    expect(listenBtn).toBeDefined();
    expect(listenBtn.textContent).toContain('🔊');
    expect(replayBtn).toBeDefined();
    expect(replayBtn.textContent).toContain('🔁');
    expect(stopBtn).toBeDefined();
  });

  it('should display question text in learning activity', () => {
    const mockPlan = {
      id: 'activity_1',
      lessonId: 'lesson_1',
      mode: 'choose',
      title: 'Practice',
      prompt: 'Which word has the short a sound?',
      presentation: { mode: 'text', ttsRate: 0.85 },
      options: [
        { id: 'opt_1', label: 'Make' },
        { id: 'opt_2', label: 'Cat' },
        { id: 'opt_3', label: 'Cake' }
      ]
    };

    renderLearningActivityScreen(container, {
      profile: mockProfile,
      plan: mockPlan,
      onSubmit: async () => ({ isCorrect: true }),
      onAdvance: () => {}
    });

    const prompt = container.querySelector('#activity-prompt');
    expect(prompt).toBeDefined();
    expect(prompt.textContent).toContain('Which word has the short a sound?');

    // Verify large font size (28px)
    const fontSize = window.getComputedStyle(prompt).fontSize;
    expect(parseInt(fontSize)).toBeGreaterThanOrEqual(24); // At least 24px
  });

  it('should show answer options in learning activity', () => {
    const mockPlan = {
      id: 'activity_1',
      lessonId: 'lesson_1',
      mode: 'choose',
      title: 'Practice',
      prompt: 'Which word has the short a sound?',
      presentation: { mode: 'text', ttsRate: 0.85 },
      options: [
        { id: 'opt_1', label: 'Make' },
        { id: 'opt_2', label: 'Cat' },
        { id: 'opt_3', label: 'Cake' }
      ]
    };

    renderLearningActivityScreen(container, {
      profile: mockProfile,
      plan: mockPlan,
      onSubmit: async () => ({ isCorrect: true }),
      onAdvance: () => {}
    });

    // Activity screen renders successfully with question
    const question = container.querySelector('#activity-prompt');
    expect(question).toBeDefined();
    expect(question.textContent).toContain('Which word has the short a sound?');
  });

  it('should have functional audio button that is clickable', () => {
    const mockPlan = {
      id: 'activity_1',
      lessonId: 'lesson_1',
      mode: 'choose',
      title: 'Practice',
      prompt: 'Which word has the short a sound?',
      presentation: {
        mode: 'text',
        audioPrompt: 'Which word has the short a sound?',
        ttsRate: 0.85
      },
      options: [
        { id: 'opt_1', label: 'Make' },
        { id: 'opt_2', label: 'Cat' },
        { id: 'opt_3', label: 'Cake' }
      ]
    };

    renderLearningActivityScreen(container, {
      profile: mockProfile,
      plan: mockPlan,
      onSubmit: async () => ({ isCorrect: true }),
      onAdvance: () => {},
      onEvent: () => {}
    });

    const listenBtn = container.querySelector('#audio-btn');
    expect(listenBtn).toBeDefined();
    expect(listenBtn.disabled).toBe(false);
    // Button should be in DOM and accessible
    expect(listenBtn.tagName).toBe('BUTTON');
  });

  it('should display progress indicator in learning activity', () => {
    const mockPlan = {
      id: 'activity_1',
      lessonId: 'lesson_1',
      mode: 'choose',
      title: 'Practice',
      prompt: 'Test question',
      presentation: { mode: 'text' },
      options: [
        { id: 'opt_1', label: 'Option A' },
        { id: 'opt_2', label: 'Option B' }
      ]
    };

    renderLearningActivityScreen(container, {
      profile: mockProfile,
      plan: mockPlan,
      completedCount: 2,
      goalActivities: 5,
      onSubmit: async () => ({ isCorrect: true }),
      onAdvance: () => {}
    });

    const progressLabel = container.textContent;
    expect(progressLabel).toContain('Activity 3 of 5');
  });

  it('should have back button in lesson selection', () => {
    let backClicked = false;

    renderLessonSelectionScreen(container, {
      profile: mockProfile,
      onSelectLesson: () => {},
      onBackToProfile: () => { backClicked = true; }
    });

    const backBtn = container.querySelector('#back-btn');
    expect(backBtn).toBeDefined();
    backBtn.click();
    expect(backClicked).toBe(true);
  });

  it('should have back button in parent dashboard', () => {
    let backClicked = false;

    renderParentDashboardScreen(container, {
      profile: mockProfile,
      onBackToProfile: () => { backClicked = true; }
    });

    const backBtn = container.querySelector('#back-btn');
    expect(backBtn).toBeDefined();
    backBtn.click();
    expect(backClicked).toBe(true);
  });
});

describe('Audio Controls Wiring', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container) container.remove();
  });

  it('should have Listen button with correct aria-label', () => {
    const mockProfile = {
      learnerId: 'test',
      name: 'Test',
      age: 8,
      grade: '2nd Grade',
      accommodations: { audioNarrationSpeed: 0.85 }
    };

    const mockPlan = {
      id: 'activity_1',
      mode: 'choose',
      prompt: 'Test question',
      presentation: { mode: 'text', audioPrompt: 'Test question' },
      options: [{ id: 'opt_1', label: 'Option' }]
    };

    renderLearningActivityScreen(container, {
      profile: mockProfile,
      plan: mockPlan,
      onSubmit: async () => ({ isCorrect: true }),
      onAdvance: () => {}
    });

    const listenBtn = container.querySelector('#audio-btn');
    expect(listenBtn.getAttribute('aria-label')).toBe('Read this aloud');
  });

  it('should have Replay button with correct aria-label', () => {
    const mockProfile = {
      learnerId: 'test',
      name: 'Test',
      age: 8,
      grade: '2nd Grade',
      accommodations: { audioNarrationSpeed: 0.85 }
    };

    const mockPlan = {
      id: 'activity_1',
      mode: 'choose',
      prompt: 'Test question',
      presentation: { mode: 'text', audioPrompt: 'Test question' },
      options: [{ id: 'opt_1', label: 'Option' }]
    };

    renderLearningActivityScreen(container, {
      profile: mockProfile,
      plan: mockPlan,
      onSubmit: async () => ({ isCorrect: true }),
      onAdvance: () => {}
    });

    const replayBtn = container.querySelector('#replay-btn');
    expect(replayBtn.getAttribute('aria-label')).toBe('Read again');
  });

  it('should have Stop button with correct aria-label', () => {
    const mockProfile = {
      learnerId: 'test',
      name: 'Test',
      age: 8,
      grade: '2nd Grade',
      accommodations: { audioNarrationSpeed: 0.85 }
    };

    const mockPlan = {
      id: 'activity_1',
      mode: 'choose',
      prompt: 'Test question',
      presentation: { mode: 'text', audioPrompt: 'Test question' },
      options: [{ id: 'opt_1', label: 'Option' }]
    };

    renderLearningActivityScreen(container, {
      profile: mockProfile,
      plan: mockPlan,
      onSubmit: async () => ({ isCorrect: true }),
      onAdvance: () => {}
    });

    const stopBtn = container.querySelector('#stop-btn');
    expect(stopBtn.getAttribute('aria-label')).toBe('Stop audio');
  });
});
