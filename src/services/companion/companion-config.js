/**
 * Companion System — Configuration
 *
 * Single source of truth for companion states, events, durations, transitions,
 * and curated message pools. The companion never decides its own behavior:
 * it is bounded entirely by this app-defined configuration.
 *
 * Phase 5 scope: deterministic, no LLM. The LLM integration boundary is
 * reserved per the product specification (§7.6).
 */

export const COMPANION_STATES = Object.freeze({
  IDLE: 'idle',
  LISTENING: 'listening',
  THINKING: 'thinking',
  ENCOURAGING: 'encouraging',
  CELEBRATING: 'celebrating',
  HELPING: 'helping'
});

export const COMPANION_EVENTS = Object.freeze({
  ACTIVITY_STARTED: 'activity_started',
  ANSWER_CORRECT: 'answer_correct',
  ANSWER_INCORRECT: 'answer_incorrect',
  LEARNER_STRUGGLING: 'learner_struggling',
  HELP_REQUESTED: 'help_requested',
  HINT_REQUESTED: 'hint_requested',
  MILESTONE_REACHED: 'milestone_reached',
  ACTIVITY_COMPLETED: 'activity_completed',
  /**
   * The learner reached the answer themselves after a wrong attempt. This is an
   * observable ACTION, not an assessment: the companion celebrates the trying.
   */
  SELF_CORRECTED: 'self_corrected',
  /** An activity is still being prepared / the app is working. */
  ACTIVITY_LOADING: 'activity_loading'
});

/**
 * Duration each transient state is allowed to occupy before auto-transitioning.
 * From the product spec §7.4: thinking 1–2s, encouraging 2–3s, celebrating 3–4s.
 * Helping persists until the next activity event ("until learner responds").
 */
export const COMPANION_STATE_DURATIONS_MS = Object.freeze({
  [COMPANION_STATES.THINKING]: 1200,
  [COMPANION_STATES.ENCOURAGING]: 2500,
  [COMPANION_STATES.CELEBRATING]: 3500
});

/**
 * Immediate state entered when an event is observed (spec §7.3).
 * Transient states then follow the AUTO_TRANSITIONS table after their duration.
 */
export const EVENT_STATE_MAP = Object.freeze({
  [COMPANION_EVENTS.ACTIVITY_STARTED]: COMPANION_STATES.LISTENING,
  [COMPANION_EVENTS.ANSWER_CORRECT]: COMPANION_STATES.ENCOURAGING,
  [COMPANION_EVENTS.ANSWER_INCORRECT]: COMPANION_STATES.HELPING,
  [COMPANION_EVENTS.LEARNER_STRUGGLING]: COMPANION_STATES.HELPING,
  [COMPANION_EVENTS.HELP_REQUESTED]: COMPANION_STATES.HELPING,
  [COMPANION_EVENTS.HINT_REQUESTED]: COMPANION_STATES.THINKING,
  [COMPANION_EVENTS.MILESTONE_REACHED]: COMPANION_STATES.CELEBRATING,
  [COMPANION_EVENTS.ACTIVITY_COMPLETED]: COMPANION_STATES.ENCOURAGING,
  // Recovery is celebrated, not corrected: the learner found it themselves.
  [COMPANION_EVENTS.SELF_CORRECTED]: COMPANION_STATES.ENCOURAGING,
  // Loading is the app working, never the child thinking about a judgement.
  [COMPANION_EVENTS.ACTIVITY_LOADING]: COMPANION_STATES.THINKING
});

/**
 * Timer-driven auto-transitions applied to transient states.
 * `idle`, `listening`, and `helping` never auto-transition:
 *  - idle: resting until the next event
 *  - listening: persists while an activity is active
 *  - helping: persists until the learner responds (next activity event)
 */
export const AUTO_TRANSITIONS = Object.freeze([
  { from: COMPANION_STATES.THINKING, to: COMPANION_STATES.HELPING },
  { from: COMPANION_STATES.ENCOURAGING, to: COMPANION_STATES.IDLE },
  { from: COMPANION_STATES.CELEBRATING, to: COMPANION_STATES.IDLE }
]);

/**
 * Behavior output limits. All companion text is short and optional.
 */
export const COMPANION_BEHAVIOR_LIMITS = Object.freeze({
  MAX_MESSAGE_LENGTH: 140,
  MESSAGE_DISPLAY_MS: 4000,
  MIN_DELAY_BETWEEN_MESSAGES_MS: 800
});

/**
 * Patterns that must never appear in companion text. The companion never:
 * diagnoses, makes claims about the learner's ability, shames, or pressures.
 */
export const FORBIDDEN_CONTENT_PATTERNS = Object.freeze([
  /dyslex/i,
  /diagnos/i,
  /disorder/i,
  /disabilit/i,
  /your reading level/i,
  /your (grade|level)/i,
  /behind/i,
  /below/i,
  /\byou'?re (so |too )?slow\b/i,
  /\byou are (so |too )?slow\b/i,
  /stupid/i,
  /dumb/i,
  /silly/i,
  /wrong/i,
  /failed/i,
  /try harder/i,
  /give up/i,
  /can'?t do this/i,
  /you must/i
]);

/**
 * Curated message pools, keyed by `{ event }: { state }` pairs.
 * Messages are age-appropriate, encouraging, non-shaming, and never reveal
 * answers — hints scaffold toward discovery only.
 */
export const COMPANION_MESSAGE_POOLS = Object.freeze({
  welcome: Object.freeze([
    "Hi {name}! I'm {label} — let's have fun learning together!",
    "Hello {name}! I'm {label}. I'll be right here cheering for you!",
    "Hi {name}! {label} here. Today is going to be a great day!"
  ]),
  [`${COMPANION_EVENTS.ANSWER_CORRECT}.${COMPANION_STATES.ENCOURAGING}`]: Object.freeze([
    'You did it — nice going! 🌟',
    'That one sounded just right to you!',
    'Woohoo, you found it! ✨',
    'Great pick! You are on a roll!',
    'Yes! You listened so carefully.'
  ]),
  [`${COMPANION_EVENTS.ANSWER_INCORRECT}.${COMPANION_STATES.HELPING}`]: Object.freeze([
    'That is totally okay — every try helps us learn.',
    'No worries at all. Let us keep going at your own pace.',
    'It is alright! Learning is all about trying.',
    'That one was a tricky one. Thanks for giving it a go!',
    'Everyone finds some of these hard. You are doing fine.'
  ]),
  [`${COMPANION_EVENTS.LEARNER_STRUGGLING}.${COMPANION_STATES.HELPING}`]: Object.freeze([
    'Let us take a slow, steady breath together. In… and out. 🌬️',
    'That was a few tricky ones in a row — let us shake it off!',
    'You are allowed to find some of these hard. I am right here.',
    'Let us relax and tackle the next one together.'
  ]),
  [`${COMPANION_EVENTS.HELP_REQUESTED}.${COMPANION_STATES.HELPING}`]: Object.freeze([
    "I'm right here! Let us look at it step by step.",
    'Take your time — I am not going anywhere.',
    'Let us take it nice and slow. You can do it.',
    "We will figure it out together. Where would you like to start?"
  ]),
  [`${COMPANION_EVENTS.HINT_REQUESTED}.${COMPANION_STATES.THINKING}`]: Object.freeze([
    'Let me think… 🤔',
    'Hmm, just a moment…',
    'One moment, I am thinking…'
  ]),
  [`${COMPANION_EVENTS.HINT_REQUESTED}.${COMPANION_STATES.HELPING}`]: Object.freeze([
    'Look at the very first part of the word and sound it out slowly.',
    'Say the word slowly out loud, then listen to each choice.',
    'Try reading each option one at a time and pick the one that feels right.',
    'Think about how the word sounds at the start — that can be a clue.'
  ]),
  [`${COMPANION_EVENTS.MILESTONE_REACHED}.${COMPANION_STATES.CELEBRATING}`]: Object.freeze([
    'Look at you go! 🎉',
    'You are doing amazing — keep it up! 🌟',
    'What a champion! Way to go!',
    'Wow, you are really getting the hang of this!'
  ]),
  [`${COMPANION_EVENTS.ACTIVITY_COMPLETED}.${COMPANION_STATES.ENCOURAGING}`]: Object.freeze([
    'You finished all the reading games today! 🎉',
    'What a fun journey — you did it! 🌟',
    'All done! Be proud of yourself! 🏆',
    'You explored so much today. Great job!'
  ]),
  // Recovery copy celebrates the TRYING, never the mistake. Deliberately never
  // mentions that the first try was wrong.
  [`${COMPANION_EVENTS.SELF_CORRECTED}.${COMPANION_STATES.ENCOURAGING}`]: Object.freeze([
    'You kept going until it clicked — that is the best kind of trying! ⭐',
    'You worked it out on your own. I noticed! 🌟',
    'Trying again until you find it — that is real cleverness!',
    'You tried and tried, and look what happened! ✨'
  ]),
  [`${COMPANION_EVENTS.ACTIVITY_LOADING}.${COMPANION_STATES.THINKING}`]: Object.freeze([
    'Getting your next activity ready…',
    'One moment while I set things up…',
    'Almost ready! 🌟'
  ])
});

/** Events that produce a spoken behavior (message). Listening/idle stay silent. */
export const MESSAGE_EVENTS = Object.freeze([
  COMPANION_EVENTS.ANSWER_CORRECT,
  COMPANION_EVENTS.ANSWER_INCORRECT,
  COMPANION_EVENTS.LEARNER_STRUGGLING,
  COMPANION_EVENTS.HELP_REQUESTED,
  COMPANION_EVENTS.HINT_REQUESTED,
  COMPANION_EVENTS.MILESTONE_REACHED,
  COMPANION_EVENTS.ACTIVITY_COMPLETED,
  COMPANION_EVENTS.SELF_CORRECTED,
  COMPANION_EVENTS.ACTIVITY_LOADING
]);

export const COMPANION_CONFIG = Object.freeze({
  states: COMPANION_STATES,
  events: COMPANION_EVENTS,
  stateDurationsMs: COMPANION_STATE_DURATIONS_MS,
  eventStateMap: EVENT_STATE_MAP,
  autoTransitions: AUTO_TRANSITIONS,
  limits: COMPANION_BEHAVIOR_LIMITS,
  forbiddenPatterns: FORBIDDEN_CONTENT_PATTERNS,
  messagePools: COMPANION_MESSAGE_POOLS,
  messageEvents: MESSAGE_EVENTS
});