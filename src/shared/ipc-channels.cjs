/**
 * Centralized IPC channel definitions (CommonJS compatible for preload script).
 */
const IPC_CHANNELS = {
  // System & Health Checks
  SYSTEM_PING: 'system:ping',
  AI_HEALTH_CHECK: 'ai:health-check',

  // Persistent Learner Profile Storage
  PROFILE_GET: 'profile:get',
  PROFILE_SAVE: 'profile:save',
  PROFILE_RESET: 'profile:reset',

  // Authentication & Settings (Reserved for Phase 2+)
  AUTH_SET_PIN: 'auth:set-pin',
  AUTH_VERIFY_PIN: 'auth:verify-pin',

  // Document Ingestion & Extraction (Phase 3)
  DOCUMENT_OPEN: 'document:open',
  DOCUMENT_EXTRACT: 'document:extract',
  DOCUMENT_CONFIRM: 'document:confirm',

  // Screening Quest (Reserved for Phase 4+)
  SCREENING_SUBMIT_TASK: 'screening:submit-task',
  SCREENING_COMPLETE_QUEST: 'screening:complete-quest',

  // Companion System (Phase 5)
  COMPANION_EMIT_EVENT: 'companion:emit-event',
  COMPANION_GET_SNAPSHOT: 'companion:get-snapshot',
  COMPANION_STATE_CHANGED: 'companion:state-changed',

  // Adaptive Learning & Content Generation (Phase 6)
  LEARNING_GET_MISSION: 'learning:get-mission',
  LEARNING_SUBMIT_ACTIVITY: 'learning:submit-activity',
  LEARNING_GET_HELP: 'learning:get-help',
  LEARNING_VISUAL_SIGNAL: 'learning:visual-signal',
  LEARNING_GENERATE_STORY: 'learning:generate-story',

  // Curriculum System + School Materials (Phase 6 Step 1: parent setup)
  CURRICULUM_GET_OPTIONS: 'curriculum:get-options',
  CURRICULUM_GET_OBJECTIVES: 'curriculum:get-objectives',
  MATERIAL_EXTRACT: 'material:extract',
  MATERIAL_ADD: 'material:add',
  MATERIAL_LIST: 'material:list',
  MATERIAL_GET: 'material:get',
  MATERIAL_VERIFY: 'material:verify',
  MATERIAL_LINK_OBJECTIVES: 'material:link-objectives',

  // Multi-Modal Assistance (Reserved for Phase 8+)
  HELP_SIMPLIFY: 'help:simplify',
  HELP_GET_EXAMPLE: 'help:get-example',

  // Adaptation & Telemetry Feedback (Reserved for Phase 9+)
  FEEDBACK_SUBMIT_SESSION: 'feedback:submit-session',
  AI_GENERATE_DIGEST: 'ai:generate-digest'
};

module.exports = { IPC_CHANNELS };
