const { contextBridge, ipcRenderer } = require('electron');

// Typed channel mappings matching src/shared/ipc-channels.js
const IPC_CHANNELS = {
  SYSTEM_PING: 'system:ping',
  AI_HEALTH_CHECK: 'ai:health-check',
  PROFILE_GET: 'profile:get',
  PROFILE_SAVE: 'profile:save',
  PROFILE_RESET: 'profile:reset',
  AUTH_SET_PIN: 'auth:set-pin',
  AUTH_VERIFY_PIN: 'auth:verify-pin',
  // Document Ingestion & Extraction (Phase 3)
  DOCUMENT_OPEN: 'document:open',
  DOCUMENT_EXTRACT: 'document:extract',
  DOCUMENT_CONFIRM: 'document:confirm',
  SCREENING_SUBMIT_TASK: 'screening:submit-task',
  SCREENING_COMPLETE_QUEST: 'screening:complete-quest',
  COMPANION_EMIT_EVENT: 'companion:emit-event',
  COMPANION_GET_SNAPSHOT: 'companion:get-snapshot',
  COMPANION_STATE_CHANGED: 'companion:state-changed',
  LEARNING_GET_MISSION: 'learning:get-mission',
  LEARNING_SUBMIT_ACTIVITY: 'learning:submit-activity',
  LEARNING_GET_HELP: 'learning:get-help',
  LEARNING_VISUAL_SIGNAL: 'learning:visual-signal',
  LEARNING_GENERATE_STORY: 'learning:generate-story',
  DAILY_GET_DASHBOARD: 'daily:get-dashboard',
  // Curriculum System + School Materials (Phase 6 Step 1: parent setup)
  CURRICULUM_GET_OPTIONS: 'curriculum:get-options',
  CURRICULUM_GET_OBJECTIVES: 'curriculum:get-objectives',
  MATERIAL_EXTRACT: 'material:extract',
  MATERIAL_ADD: 'material:add',
  MATERIAL_LIST: 'material:list',
  MATERIAL_GET: 'material:get',
  MATERIAL_VERIFY: 'material:verify',
  MATERIAL_LINK_OBJECTIVES: 'material:link-objectives',
  SCHOOLWORK_ADD: 'schoolwork:add',
  SCHOOLWORK_LIST: 'schoolwork:list',
  SCHOOLWORK_GET: 'schoolwork:get',
  SCHOOLWORK_VERIFY: 'schoolwork:verify',
  SCHOOLWORK_COMPLETE: 'schoolwork:complete',
  SCHOOLWORK_START_SESSION: 'schoolwork:start-session',
  SCHOOLWORK_SUBMIT_ACTIVITY: 'schoolwork:submit-activity',
  SCHOOLWORK_FINISH_READING: 'schoolwork:finish-reading',
  SCHOOLWORK_CLEAR_SESSION: 'schoolwork:clear-session',
  HELP_SIMPLIFY: 'help:simplify',
  HELP_GET_EXAMPLE: 'help:get-example',
  FEEDBACK_SUBMIT_SESSION: 'feedback:submit-session',
  AI_GENERATE_DIGEST: 'ai:generate-digest'
};

/**
 * Expose secure, typed IPC bridge to the renderer process.
 * nodeIntegration remains disabled, contextIsolation remains enabled.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // System Health
  ping: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_PING),
  checkAiHealth: () => ipcRenderer.invoke(IPC_CHANNELS.AI_HEALTH_CHECK),

  // Persistent Profile Storage
  getProfile: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_GET),
  saveProfile: (profile) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_SAVE, profile),
  resetProfile: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_RESET),

  // Parent PIN Authentication
  setPin: (pin) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_SET_PIN, pin),
  verifyPin: (pin) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_VERIFY_PIN, pin),

  // Document Ingestion & Extraction (Phase 3)
  openDocumentDialog: () => ipcRenderer.invoke(IPC_CHANNELS.DOCUMENT_OPEN),
  extractDocument: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.DOCUMENT_EXTRACT, filePath),
  confirmDocumentAccommodations: (payload) => ipcRenderer.invoke(IPC_CHANNELS.DOCUMENT_CONFIRM, payload),

  // Screening Quest (Phase 4)
  submitScreeningTask: (payload) => ipcRenderer.invoke(IPC_CHANNELS.SCREENING_SUBMIT_TASK, payload),
  completeScreeningQuest: () => ipcRenderer.invoke(IPC_CHANNELS.SCREENING_COMPLETE_QUEST),

  // Companion System (Phase 5)
  emitCompanionEvent: (eventType, payload) => ipcRenderer.invoke(IPC_CHANNELS.COMPANION_EMIT_EVENT, { eventType, payload }),
  getCompanionSnapshot: () => ipcRenderer.invoke(IPC_CHANNELS.COMPANION_GET_SNAPSHOT),
  onCompanionStateChanged: (callback) => {
    const listener = (_event, snapshot) => callback(snapshot);
    ipcRenderer.on(IPC_CHANNELS.COMPANION_STATE_CHANGED, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.COMPANION_STATE_CHANGED, listener);
  },

  // Curriculum System + School Materials (Phase 6 Step 1: parent setup)
  getCurriculumOptions: () => ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_GET_OPTIONS),
  getCurriculumObjectives: (selection) => ipcRenderer.invoke(IPC_CHANNELS.CURRICULUM_GET_OBJECTIVES, selection),
  extractSchoolMaterial: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.MATERIAL_EXTRACT, filePath),
  addSchoolMaterial: (payload) => ipcRenderer.invoke(IPC_CHANNELS.MATERIAL_ADD, payload),
  listSchoolMaterials: (learnerId) => ipcRenderer.invoke(IPC_CHANNELS.MATERIAL_LIST, learnerId),
  getSchoolMaterial: (learnerId, materialId) => ipcRenderer.invoke(IPC_CHANNELS.MATERIAL_GET, { learnerId, materialId }),
  verifySchoolMaterial: (payload) => ipcRenderer.invoke(IPC_CHANNELS.MATERIAL_VERIFY, payload),
  linkSchoolMaterialObjectives: (payload) => ipcRenderer.invoke(IPC_CHANNELS.MATERIAL_LINK_OBJECTIVES, payload),

  // Schoolwork / Homework (Phase 7.2)
  addSchoolwork: (payload) => ipcRenderer.invoke(IPC_CHANNELS.SCHOOLWORK_ADD, payload),
  listSchoolwork: (learnerId) => ipcRenderer.invoke(IPC_CHANNELS.SCHOOLWORK_LIST, learnerId),
  getSchoolwork: (learnerId, schoolworkId) => ipcRenderer.invoke(IPC_CHANNELS.SCHOOLWORK_GET, { learnerId, schoolworkId }),
  verifySchoolwork: (payload) => ipcRenderer.invoke(IPC_CHANNELS.SCHOOLWORK_VERIFY, payload),
  completeSchoolwork: (payload) => ipcRenderer.invoke(IPC_CHANNELS.SCHOOLWORK_COMPLETE, payload),
  startSchoolworkSession: (payload) => ipcRenderer.invoke(IPC_CHANNELS.SCHOOLWORK_START_SESSION, payload),
  submitSchoolworkActivity: (payload) => ipcRenderer.invoke(IPC_CHANNELS.SCHOOLWORK_SUBMIT_ACTIVITY, payload),
  finishSchoolworkReading: (payload) => ipcRenderer.invoke(IPC_CHANNELS.SCHOOLWORK_FINISH_READING, payload),
  clearSchoolworkSession: (learnerId) => ipcRenderer.invoke(IPC_CHANNELS.SCHOOLWORK_CLEAR_SESSION, { learnerId }),

  // Adaptive Learning (Phase 6: learner learning flow)
  getLearningMission: () => ipcRenderer.invoke(IPC_CHANNELS.LEARNING_GET_MISSION),
  submitLearningActivity: (payload) => ipcRenderer.invoke(IPC_CHANNELS.LEARNING_SUBMIT_ACTIVITY, payload),
  getLearningHelp: (payload) => ipcRenderer.invoke(IPC_CHANNELS.LEARNING_GET_HELP, payload),
  recordVisualSignal: (payload) => ipcRenderer.invoke(IPC_CHANNELS.LEARNING_VISUAL_SIGNAL, payload),
  getDailyDashboard: () => ipcRenderer.invoke(IPC_CHANNELS.DAILY_GET_DASHBOARD),

  // Channel Constants
  channels: IPC_CHANNELS
});
