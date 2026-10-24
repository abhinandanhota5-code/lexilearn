/**
 * Canonical Learner Profile Schema & Validation.
 */

export const AVAILABLE_AVATARS = [
  { id: 'fox', label: 'Curious Fox', emoji: '🦊' },
  { id: 'owl', label: 'Wise Owl', emoji: '🦉' },
  { id: 'bear', label: 'Friendly Bear', emoji: '🐻' },
  { id: 'dolphin', label: 'Playful Dolphin', emoji: '🐬' },
  { id: 'rabbit', label: 'Quick Rabbit', emoji: '🐰' },
  { id: 'turtle', label: 'Calm Turtle', emoji: '🐢' }
];

export const AVAILABLE_THEMES = [
  { id: 'warm-parchment', name: 'Warm Parchment', description: 'Soft cream tint', bg: '#FDFBF7' },
  { id: 'soft-mint', name: 'Soft Mint', description: 'Gentle pale green', bg: '#F4FAF6' },
  { id: 'peach-glow', name: 'Peach Glow', description: 'Warm soothing tone', bg: '#FFF8F3' },
  { id: 'soft-lavender', name: 'Soft Lavender', description: 'Muted purple tint', bg: '#F9F7FD' },
  { id: 'high-contrast', name: 'High Contrast', description: 'Crisp light text on dark surface', bg: '#1A202C' }
];

export const GRADE_LEVELS = [
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
  '5th Grade',
  '6th Grade'
];

export const DEFAULT_ACCOMMODATIONS = {
  fontFamily: 'Lexend',
  fontSizePx: 24,
  lineHeight: 1.9,
  letterSpacingEm: 0.16,
  readingRulerEnabled: true,
  syllableColoringEnabled: true,
  audioNarrationSpeed: 0.85,
  questionsReadAloud: true
};

/**
 * Default adaptive learning state (§13) attached to the learner profile.
 * Skill states are keyed by skill id; preference weights are bounded.
 */
export function createDefaultAdaptiveLearning() {
  const now = new Date().toISOString();
  return {
    skills: {},
    preferences: { weights: {}, updatedAt: null },
    meta: {
      sessions: 0,
      activities: 0,
      lastSessionAt: null,
      sessionStreakDays: 0,
      createdAt: now,
      updatedAt: now
    }
  };
}

/**
 * Clamp-on-load sanitizer for a persisted adaptiveLearning block. Missing
 * keys are filled with defaults; out-of-range numeric fields are clamped so
 * a corrupt/edited file can never break the deterministic engine.
 * @param {object} [block]
 * @returns {object} sanitized adaptiveLearning block
 */
export function sanitizeAdaptiveLearning(block) {
  const base = createDefaultAdaptiveLearning();
  if (!block || typeof block !== 'object') return base;

  const clamp = (v, lo, hi, dflt) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return dflt;
    return Math.min(hi, Math.max(lo, n));
  };

  const clampCount = (v, dflt = 0) => Math.max(0, clamp(v, 0, 1e9, dflt));

  /**
   * Observable per-attempt behavior window. Counts and clamped timings only —
   * the block is rebuilt field-by-field so a corrupt or edited file can never
   * introduce an extra key, a raw string, or an unbounded array.
   */
  /**
   * Strict numeric check: `Number(null)` and `Number('')` are 0, so a null or
   * empty field would otherwise be clamped to 0 instead of falling back to the
   * not-observed default. Sanitizing must be idempotent — the second pass over
   * an already-sanitized block has to produce an identical object.
   */
  const numOrNull = (v, lo, hi) => {
    if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.min(hi, Math.max(lo, n));
  };

  const sanitizeBehavior = (b) => {
    const src = b && typeof b === 'object' ? b : {};
    const window = Array.isArray(src.window)
      ? src.window.slice(0, 50).map((e) => ({
          responseTimeMs: numOrNull(e?.responseTimeMs, 0, 30 * 60 * 1000),
          hintsUsed: clampCount(e?.hintsUsed),
          replayCount: clampCount(e?.replayCount),
          timedOut: e?.timedOut === 1 ? 1 : 0,
          firstInteractionMs: numOrNull(e?.firstInteractionMs, -1, 30 * 60 * 1000) ?? -1,
          optionInspects: clampCount(e?.optionInspects),
          tilePlacements: clampCount(e?.tilePlacements),
          tileRemovals: clampCount(e?.tileRemovals),
          helpOpens: clampCount(e?.helpOpens),
          // Observable attempt/recovery shape. Without these, clamp-on-write
          // would silently erase every effortful/self-correction signal on the
          // next save and the ALE would forget how the learner got there.
          attempts: Math.min(20, Math.max(1, clampCount(e?.attempts) || 1)),
          selfCorrected: e?.selfCorrected === 1 ? 1 : 0,
          effortful: e?.effortful === 1 ? 1 : 0,
          assisted: e?.assisted === 1 ? 1 : 0,
          steady: e?.steady === 1 ? 1 : 0,
          error: e?.error === 1 ? 1 : 0
        }))
      : [];
    return {
      window,
      lastResponseTimeMs: numOrNull(src.lastResponseTimeMs, 0, 30 * 60 * 1000),
      lastHintsUsed: clampCount(src.lastHintsUsed),
      lastReplayCount: clampCount(src.lastReplayCount),
      lastFirstInteractionMs: numOrNull(src.lastFirstInteractionMs, -1, 30 * 60 * 1000) ?? -1
    };
  };

  const skills = {};
  for (const skillId of Object.keys(block.skills || {})) {
    const s = block.skills[skillId] || {};
    const audio = s.audioMetrics || {};
    skills[skillId] = {
      mastery: clamp(s.mastery, 0.05, 0.95, 0.05),
      difficulty: clamp(s.difficulty, 1, 5, 1),
      attempts: clampCount(s.attempts),
      correct: clampCount(s.correct),
      streakCorrect: clampCount(s.streakCorrect),
      streakWrong: clampCount(s.streakWrong),
      helpRequests: clampCount(s.helpRequests),
      audioMetrics: {
        audioUsed: Math.max(0, clamp(audio.audioUsed, 0, 1e9, 0)),
        replays: Math.max(0, clamp(audio.replays, 0, 1e9, 0)),
        answeredAfterFirstListen: Math.max(0, clamp(audio.answeredAfterFirstListen, 0, 1e9, 0)),
        answeredAfterReplay: Math.max(0, clamp(audio.answeredAfterReplay, 0, 1e9, 0)),
        textAndAudio: Math.max(0, clamp(audio.textAndAudio, 0, 1e9, 0)),
        helpAfterAudio: clampCount(audio.helpAfterAudio)
      },
      behaviorMetrics: sanitizeBehavior(s.behaviorMetrics),
      lastPracticedAt: s.lastPracticedAt || null,
      practicedDates: Array.isArray(s.practicedDates) ? s.practicedDates.slice(0, 14) : [],
      // Rolling mastery window. Clamp-on-write must preserve it: dropping it
      // here would silently reset every skill's mastery on the next write.
      outcomeWindow: Array.isArray(s.outcomeWindow)
        ? s.outcomeWindow.slice(0, 8).map((v) => clamp(v, 0, 1, 0))
        : []
    };
  }

  const weights = {};
  const weightIn = block.preferences?.weights || {};
  for (const modality of ['visual', 'audio', 'text', 'manipulation', 'example', 'repetition', 'guided_assistance']) {
    weights[modality] = clamp(weightIn[modality], 0.05, 0.95, 0.5);
  }

  const meta = block.meta || {};
  const metaNow = new Date().toISOString();
  return {
    skills,
    preferences: { weights, updatedAt: block.preferences?.updatedAt || null },
    meta: {
      sessions: Math.max(0, clamp(meta.sessions, 0, 1e9, 0)),
      activities: Math.max(0, clamp(meta.activities, 0, 1e9, 0)),
      lastSessionAt: meta.lastSessionAt || null,
      sessionStreakDays: Math.max(0, clamp(meta.sessionStreakDays, 0, 3650, 0)),
      createdAt: meta.createdAt || metaNow,
      updatedAt: meta.updatedAt || metaNow
    }
  };
}

/**
 * Validate incoming raw profile input.
 * @param {object} input
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateProfileInput(input) {
  const errors = {};

  if (!input || typeof input !== 'object') {
    return { isValid: false, errors: { general: 'Profile data is required.' } };
  }

  // Name validation
  if (!input.name || typeof input.name !== 'string' || input.name.trim().length < 2) {
    errors.name = 'Please enter a name or nickname (at least 2 characters).';
  } else if (input.name.trim().length > 40) {
    errors.name = 'Name cannot exceed 40 characters.';
  }

  // Grade validation
  if (!input.grade || !GRADE_LEVELS.includes(input.grade)) {
    errors.grade = 'Please select a grade level from Kindergarten to 6th Grade.';
  }

  // Age validation
  const age = Number(input.age);
  if (!input.age || isNaN(age) || age < 4 || age > 18) {
    errors.age = 'Please enter a valid age between 4 and 18.';
  }

  // Avatar validation
  if (!input.avatar || !AVAILABLE_AVATARS.some(a => a.id === input.avatar)) {
    errors.avatar = 'Please select a companion avatar.';
  }

  // Theme validation
  if (!input.theme || !AVAILABLE_THEMES.some(t => t.id === input.theme)) {
    errors.theme = 'Please select a visual color theme.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Build a canonical profile structure from validated input.
 * @param {object} input Validated profile input
 * @param {object} [existingProfile] Previous profile to preserve IDs/history
 * @returns {object} Canonical profile
 */
export function buildCanonicalProfile(input, existingProfile = null) {
  const now = new Date().toISOString();

  return {
    learnerId: existingProfile?.learnerId || `learner_${Date.now()}`,
    name: input.name.trim(),
    age: Number(input.age),
    grade: input.grade,
    language: input.language || 'English',
    avatar: input.avatar,
    theme: input.theme,
    parentPinHash: input.parentPinHash || existingProfile?.parentPinHash || null,
    parentPinSalt: input.parentPinSalt || existingProfile?.parentPinSalt || null,
    disclaimerAccepted: input.disclaimerAccepted ?? existingProfile?.disclaimerAccepted ?? true,
    disclaimerAcceptedAt: existingProfile?.disclaimerAcceptedAt || now,
    accommodations: {
      ...DEFAULT_ACCOMMODATIONS,
      ...(existingProfile?.accommodations || {}),
      ...(input.accommodations || {})
    },

    // Parent-verified IEP/document extraction (Phase 3): preserved across
    // profile edits so verified accommodation data is never dropped. Input may
    // override; otherwise the existing block survives.
    documentExtraction: input.documentExtraction || existingProfile?.documentExtraction || null,

    // Screening Quest (Phase 4)
    screeningStatus: existingProfile?.screeningStatus || 'not_started',
    screeningResults: existingProfile?.screeningResults || null,
    readingBaseline: existingProfile?.readingBaseline || null,
    screeningCompletedAt: existingProfile?.screeningCompletedAt || null,

    // Adaptive Learning (Phase 6)
    adaptiveLearning: sanitizeAdaptiveLearning(existingProfile?.adaptiveLearning ?? input.adaptiveLearning),

    createdAt: existingProfile?.createdAt || now,
    updatedAt: now
  };
}
