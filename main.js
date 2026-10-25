import pkg from 'electron';
const { app, BrowserWindow, ipcMain, dialog } = pkg;
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IPC_CHANNELS } from './src/shared/ipc-channels.js';
import { OllamaLLMProvider } from './src/services/ai/ollama-provider.js';
import { ProfileStore } from './src/services/storage/profile-store.js';
import { PinService } from './src/services/auth/pin-service.js';
import { validateProfileInput, buildCanonicalProfile, AVAILABLE_AVATARS } from './src/shared/profile-schema.js';
import { DocumentIngestionPipeline } from './src/services/document/document-ingestion-pipeline.js';
import { ReportExtractionService } from './src/services/ai/report-extraction-service.js';
import { ScreeningStore } from './src/services/screening/screening-store.js';
import { LearningStore } from './src/services/learning/learning-store.js';
import {
  getMission,
  submitLearningActivity,
  getLearningHelp,
  recordVisualSignal,
  resetLearningFlowState
} from './src/services/learning/learning-flow.js';
import { getDailyDashboard } from './src/services/learning/daily-dashboard-service.js';
import {
  validateTaskSubmission,
  computeBaseline,
  createSession,
  buildCompletionSummary
} from './src/services/screening/quest-engine.js';
import { CompanionService } from './src/services/companion/companion-service.js';
import { COMPANION_CONFIG } from './src/services/companion/companion-config.js';
import { CurriculumRegistry } from './src/services/curriculum/curriculum-registry.js';
import { registerAvailableCurricula } from './src/services/curriculum/curriculum-fixtures.js';
import { CurriculumStore } from './src/services/curriculum/curriculum-store.js';
import {
  getCurriculumOptions,
  getCurriculumObjectives,
  extractSchoolMaterial,
  addSchoolMaterial,
  listSchoolMaterials,
  getSchoolMaterial,
  verifySchoolMaterial,
  linkSchoolMaterialObjectives
} from './src/services/curriculum/curriculum-parent-flow.js';
import {
  addSchoolwork,
  listSchoolwork,
  getSchoolwork,
  verifySchoolwork,
  completeSchoolwork
} from './src/services/curriculum/schoolwork-service.js';
import {
  startSchoolworkSession,
  submitSchoolworkActivity,
  finishSchoolworkReading,
  clearSchoolworkSession
} from './src/services/learning/schoolwork-session.js';
import {
  queueProposal,
  recordDecision,
  getApprovedProposals,
  getPendingProposals,
  cleanupProposal,
  createProposal
} from './src/services/adaptive/approval-gate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize service instances
const llmProvider = new OllamaLLMProvider();
const documentPipeline = new DocumentIngestionPipeline();
const reportExtractionService = new ReportExtractionService(llmProvider);
let profileStore = null;
let screeningStore = null;
let learningStore = null;
let companionService = null;
let curriculumRegistry = null;
let curriculumStore = null;

// In-memory screening sessions keyed by learnerId (source of truth for scoring)
const screeningSessions = new Map();

function createWindow() {
  const win = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 840,
    minHeight: 620,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  win.loadFile('index.html');

  // DevTools only on request (LEXI_DEVTOOLS=1) — docked DevTools halves the
  // viewport and breaks the layout.
  if (process.env.LEXI_DEVTOOLS === '1') {
    win.webContents.openDevTools();
  }

  // Log renderer console messages to main process terminal
  win.webContents.on('console-message', (event) => {
    const level = event.level || 'info';
    const message = event.message || '';
    const line = event.line || 0;
    console.log(`[RENDERER ${level}] ${message} (line ${line})`);
  });
}

// Register IPC Handlers
function registerIpcHandlers() {
  // System Health
  ipcMain.handle(IPC_CHANNELS.SYSTEM_PING, () => 'pong');

  // AI Health Check
  ipcMain.handle(IPC_CHANNELS.AI_HEALTH_CHECK, async () => {
    return await llmProvider.checkHealth();
  });

  // Parent PIN Authentication
  ipcMain.handle(IPC_CHANNELS.AUTH_SET_PIN, async (_event, pin) => {
    try {
      const { hash, salt } = PinService.hashPin(pin);
      return { success: true, hash, salt };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_VERIFY_PIN, async (_event, pin) => {
    try {
      const currentProfile = await profileStore.getProfile();
      if (!currentProfile || !currentProfile.parentPinHash) {
        return { success: false, error: 'No parent PIN has been set yet.' };
      }
      const verified = PinService.verifyPin(
        pin,
        currentProfile.parentPinHash,
        currentProfile.parentPinSalt
      );
      return { success: true, verified };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Persistent Profile Storage
  ipcMain.handle(IPC_CHANNELS.PROFILE_GET, async () => {
    return await profileStore.getProfile();
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_SAVE, async (_event, profileData) => {
    try {
      const validation = validateProfileInput(profileData);
      if (!validation.isValid) {
        return { success: false, errors: validation.errors };
      }
      const existing = await profileStore.getProfile();
      const canonical = buildCanonicalProfile(profileData, existing);
      const saved = await profileStore.saveProfile(canonical);
      // Reflect a companion change in the widget immediately — the service
      // otherwise keeps the avatar it activated with at startup.
      if (companionService && saved.avatar !== existing?.avatar) {
        ensureCompanionActivated({ force: true }).catch((err) =>
          console.error('Companion re-activation after profile save failed:', err?.message || err)
        );
      }
      return { success: true, profile: saved };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_RESET, async () => {
    try {
      const reset = await profileStore.resetProfile();
      resetLearningFlowState();
      return { success: true, reset };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Document Ingestion & Extraction (Phase 3)
  ipcMain.handle(IPC_CHANNELS.DOCUMENT_OPEN, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(window, {
      title: 'Select Educational Assessment or Report',
      properties: ['openFile'],
      filters: [
        { name: 'Educational Reports & Evaluations', extensions: ['pdf', 'txt', 'md', 'png', 'jpg', 'jpeg'] },
        { name: 'PDF Documents', extensions: ['pdf'] },
        { name: 'Text Documents', extensions: ['txt', 'md'] },
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }
      ]
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const filePath = result.filePaths[0];
    return {
      canceled: false,
      filePath,
      fileName: path.basename(filePath)
    };
  });

  ipcMain.handle(IPC_CHANNELS.DOCUMENT_EXTRACT, async (_event, filePath) => {
    const t0 = Date.now();
    try {
      // 1. Ingest and extract text
      console.log(`[report-analysis] stage=document-extraction started file=${filePath}`);
      const docResult = await documentPipeline.extractDocument(filePath);
      console.log(
        `[report-analysis] stage=document-extraction completed ms=${Date.now() - t0} extractor=${docResult.extractorName} textChars=${docResult.text?.length ?? 0}`
      );

      // 2. Run local AI accommodation extraction with strict guardrails
      console.log('[report-analysis] stage=report-extraction started (local LLM)');
      const extraction = await reportExtractionService.extractAccommodations(docResult.text);

      console.log(`[report-analysis] stage=result returned ms=${Date.now() - t0} success=true`);
      return {
        success: true,
        extraction,
        fileMeta: {
          filePath,
          fileName: docResult.fileName,
          fileSize: docResult.fileSize,
          pageCount: docResult.pageCount,
          extractorName: docResult.extractorName
        }
      };
    } catch (err) {
      // Never swallow: surface a structured failure to the renderer. Log the
      // error type/message only — never document contents.
      console.error(
        `[report-analysis] stage=failed ms=${Date.now() - t0} error=${err?.name || 'Error'}: ${err?.message || 'unknown'}`
      );
      return {
        success: false,
        error: err.message
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOCUMENT_CONFIRM, async (_event, payload) => {
    try {
      const { filePath, confirmedAccommodations, parentNotes, appliedSettings } = payload;
      const currentProfile = await profileStore.getProfile();

      if (!currentProfile) {
        return { success: false, error: 'No active learner profile found to link document to.' };
      }

      // Store a local copy of the original document in user's secure app data
      const storedDoc = await documentPipeline.storeDocumentLocally(
        filePath,
        app.getPath('userData'),
        currentProfile.learnerId
      );

      // Update profile with parent-verified document findings and applied settings
      const updatedProfile = {
        ...currentProfile,
        documentExtraction: {
          hasDocument: true,
          originalFileName: storedDoc.fileName,
          localStoredPath: storedDoc.storedPath,
          verifiedByParent: true,
          verifiedAt: new Date().toISOString(),
          confirmedAccommodations: confirmedAccommodations || [],
          parentNotes: parentNotes || ''
        },
        accommodations: {
          ...currentProfile.accommodations,
          ...(appliedSettings || {})
        }
      };

      const saved = await profileStore.saveProfile(updatedProfile);
      return { success: true, profile: saved };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Screening Quest (Phase 4)
  // Each task submission is validated deterministically against its template
  // ground truth. The LLM is never involved in scoring.
  ipcMain.handle(IPC_CHANNELS.SCREENING_SUBMIT_TASK, async (_event, payload) => {
    try {
      const currentProfile = await profileStore.getProfile();
      if (!currentProfile) {
        return { success: false, error: 'No active learner profile found.' };
      }

      // `profile` lets the engine reconstruct the PRESENTED option order
      // main-side, so the persisted answer position is the real measurement
      // rather than the authored (biased) template order.
      const validation = validateTaskSubmission(payload, { profile: currentProfile });
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(' ') };
      }

      // Lazily create an in-memory session for this learner
      let session = screeningSessions.get(currentProfile.learnerId);
      if (!session) {
        session = createSession(currentProfile, 0);
        screeningSessions.set(currentProfile.learnerId, session);
      }

      session.results.push(validation.result);

      // Persist the growing session atomically to disk
      await screeningStore.saveSession(session);

      return { success: true, result: validation.result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCREENING_COMPLETE_QUEST, async () => {
    try {
      const currentProfile = await profileStore.getProfile();
      if (!currentProfile) {
        return { success: false, error: 'No active learner profile found.' };
      }

      const session = screeningSessions.get(currentProfile.learnerId) || null;
      const results = session?.results || [];

      if (results.length === 0) {
        return {
          success: false,
          error: 'No screening results were recorded. The quest must be completed with at least one answered task.'
        };
      }

      // Deterministic baseline computation (pure arithmetic, no LLM)
      const baseline = computeBaseline(results);
      const summary = buildCompletionSummary(results, baseline);

      // Finalize the persisted session
      if (session) {
        session.status = 'completed';
        session.completedAt = summary.completedAt;
        session.taskCount = results.length;
        session.baseline = baseline;
        await screeningStore.saveSession(session);
        screeningSessions.delete(currentProfile.learnerId);
      }

      // Update the learner profile with screening outcome (observations only)
      const updatedProfile = {
        ...currentProfile,
        screeningStatus: 'completed',
        screeningResults: results,
        readingBaseline: baseline,
        screeningCompletedAt: summary.completedAt
      };

      const saved = await profileStore.saveProfile(updatedProfile);
      return { success: true, profile: saved, summary };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Companion System (Phase 5)
  // The companion is bounded: events map to states via the config's transition
  // table; the LLM is not involved. Every state change is pushed to the
  // renderer widget through COMPANION_STATE_CHANGED.
  ipcMain.handle(IPC_CHANNELS.COMPANION_GET_SNAPSHOT, async () => {
    const activated = await ensureCompanionActivated();
    if (!activated) return null;
    return companionService.getSnapshot();
  });

  ipcMain.handle(IPC_CHANNELS.COMPANION_EMIT_EVENT, async (_event, payload) => {
    try {
      const eventType = payload?.eventType;
      if (!eventType || !(eventType in COMPANION_CONFIG.eventStateMap)) {
        return { success: false, error: 'Unknown companion event type.' };
      }
      const activated = await ensureCompanionActivated();
      if (!activated) {
        return { success: false, error: 'No active learner profile for companion.' };
      }
      // Fire-and-forget by design: the renderer never needs the resulting
      // snapshot — it receives it via the COMPANION_STATE_CHANGED push.
      companionService.emitEvent(eventType, payload?.payload || {});
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Curriculum System + School Materials (Phase 6 Step 1: parent setup)
  // Every handler is a thin envelope around the validated parent-flow layer:
  // renderer input is never trusted here — all validation lives in
  // curriculum-parent-flow.js (unit-tested without Electron).
  ipcMain.handle(IPC_CHANNELS.CURRICULUM_GET_OPTIONS, async () => {
    try {
      return getCurriculumOptions(curriculumRegistry);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CURRICULUM_GET_OBJECTIVES, async (_event, selection) => {
    try {
      return getCurriculumObjectives(curriculumRegistry, selection);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.MATERIAL_EXTRACT, async (_event, filePath) => {
    try {
      return await extractSchoolMaterial(documentPipeline, filePath);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.MATERIAL_ADD, async (_event, payload) => {
    try {
      return await addSchoolMaterial(curriculumRegistry, curriculumStore, payload);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.MATERIAL_LIST, async (_event, learnerId) => {
    try {
      return await listSchoolMaterials(curriculumStore, learnerId);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.MATERIAL_GET, async (_event, payload) => {
    try {
      return await getSchoolMaterial(curriculumStore, payload?.learnerId, payload?.materialId);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.MATERIAL_VERIFY, async (_event, payload) => {
    try {
      return await verifySchoolMaterial(curriculumStore, payload);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.MATERIAL_LINK_OBJECTIVES, async (_event, payload) => {
    try {
      return await linkSchoolMaterialObjectives(curriculumRegistry, curriculumStore, payload);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Schoolwork / Homework (Phase 7.2)
  // Thin envelopes around the validated schoolwork-service + schoolwork-session
  // layers: only verified, parent-created assignments ever surface as child
  // tasks, and every interactive submission runs through the SAME evaluator,
  // learning-signal, and activity contract as the ALE mission.
  ipcMain.handle(IPC_CHANNELS.SCHOOLWORK_ADD, async (_event, payload) => {
    try {
      return await addSchoolwork(curriculumStore, payload);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCHOOLWORK_LIST, async (_event, learnerId) => {
    try {
      return await listSchoolwork(curriculumStore, learnerId);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCHOOLWORK_GET, async (_event, payload) => {
    try {
      return await getSchoolwork(curriculumStore, payload?.learnerId, payload?.schoolworkId);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCHOOLWORK_VERIFY, async (_event, payload) => {
    try {
      return await verifySchoolwork(curriculumStore, payload);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCHOOLWORK_COMPLETE, async (_event, payload) => {
    try {
      return await completeSchoolwork(curriculumStore, payload);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCHOOLWORK_START_SESSION, async (_event, payload) => {
    try {
      return await startSchoolworkSession(
        {
          profileStore,
          learningStore,
          materialStore: curriculumStore,
          registry: curriculumRegistry
        },
        payload
      );
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCHOOLWORK_SUBMIT_ACTIVITY, async (_event, payload) => {
    try {
      return await submitSchoolworkActivity(
        { profileStore, learningStore, materialStore: curriculumStore, registry: curriculumRegistry },
        payload
      );
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCHOOLWORK_FINISH_READING, async (_event, payload) => {
    try {
      return await finishSchoolworkReading({ materialStore: curriculumStore }, payload);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCHOOLWORK_CLEAR_SESSION, async (_event, payload) => {
    try {
      clearSchoolworkSession(payload?.learnerId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Adaptive Learning (Phase 6 Step 2: learner learning flow)
  // Thin envelopes around the validated learning-flow layer: renderer input
  // is never trusted, correctness is judged main-side, and the ALE is the
  // only writer of learner skill/preference state.
  ipcMain.handle(IPC_CHANNELS.LEARNING_GET_MISSION, async () => {
    try {
      return await getMission({
        profileStore,
        learningStore,
        materialStore: curriculumStore,
        registry: curriculumRegistry
      });
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LEARNING_SUBMIT_ACTIVITY, async (_event, payload) => {
    try {
      return await submitLearningActivity(
        { profileStore, learningStore, materialStore: curriculumStore, registry: curriculumRegistry },
        payload
      );
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LEARNING_GET_HELP, async (_event, payload) => {
    try {
      return await getLearningHelp({ profileStore, materialStore: curriculumStore }, payload);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Visual-explanation learning signals: semantic events from the "Imagine It"
  // layer (visual_opened, visual_replayed, ...). Record-only — never an input
  // to ALE difficulty/mastery arithmetic.
  ipcMain.handle(IPC_CHANNELS.LEARNING_VISUAL_SIGNAL, async (_event, payload) => {
    try {
      return await recordVisualSignal({ learningStore }, payload);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // My Day dashboard (Phase 7.1): read-only view model derived from persisted
  // profile, verified school materials, and learning sessions.
  ipcMain.handle(IPC_CHANNELS.DAILY_GET_DASHBOARD, async () => {
    try {
      return await getDailyDashboard({
        profileStore,
        learningStore,
        materialStore: curriculumStore,
        registry: curriculumRegistry
      });
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Dashboard Analytics (Parent Dashboard) - get all sessions for charts
  ipcMain.handle(IPC_CHANNELS.LEARNING_GET_ALL_SESSIONS, async (_event, learnerId) => {
    try {
      if (!learningStore || !learnerId) {
        return { success: false, error: 'Learning store or learnerId not available' };
      }
      const sessions = await learningStore.getAllSessions(learnerId);
      return { success: true, sessions };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCREENING_GET_ALL_SESSIONS, async (_event, learnerId) => {
    try {
      if (!screeningStore || !learnerId) {
        return { success: false, error: 'Screening store or learnerId not available' };
      }
      const sessions = await screeningStore.getAllSessions(learnerId);
      return { success: true, sessions };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Personalization Engine: Approval Gate (MVP Hackathon)
  ipcMain.handle(IPC_CHANNELS.PE_GET_PENDING_PROPOSALS, async (_event, learnerId) => {
    try {
      const proposals = getPendingProposals(learnerId);
      return { success: true, proposals };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PE_SUBMIT_APPROVAL, async (_event, { proposalId, approved }) => {
    try {
      const decision = recordDecision(proposalId, approved);
      if (!decision.success) {
        return decision;
      }

      if (approved) {
        // Get profile, apply approved proposals, persist
        const profile = await profileStore.getProfile();
        if (!profile) {
          return { success: false, error: 'profile_not_found' };
        }

        // Apply the approved change
        const approvedList = getApprovedProposals(profile.learnerId);
        for (const prop of approvedList) {
          if (prop.proposalId === proposalId) {
            profile.adaptiveLearning.preferences.weights[prop.modality] = prop.newWeight;
            profile.adaptiveLearning.preferences.updatedAt = new Date().toISOString();
          }
        }

        // Persist updated profile
        await profileStore.saveProfile(profile);
        cleanupProposal(proposalId);

        return { success: true, persisted: true };
      } else {
        // Declined: just clean up without persisting
        cleanupProposal(proposalId);
        return { success: true, persisted: false };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

/**
 * Bind the companion service to the active learner profile, if any.
 * Non-fatal: a missing profile simply leaves the companion unactivated.
 */
async function ensureCompanionActivated({ force = false } = {}) {
  if (!companionService) return false;
  if (companionService.isActivated && !force) return true;

  const currentProfile = await profileStore.getProfile();
  if (!currentProfile) return false;

  // Find the avatar, default to dinosaur for legacy profiles
  const avatar = AVAILABLE_AVATARS.find((a) => a.id === currentProfile.avatar)
    || AVAILABLE_AVATARS.find((a) => a.id === 'dinosaur')
    || {
        id: 'dinosaur',
        label: 'Dinosaur',
        emoji: '🦕',
        animationType: 'dinosaur',
        color: '#8BC34A',
        secondaryColor: '#A5D6A7',
        gradient: 'linear-gradient(135deg, #2d5016 0%, #5a7d3d 50%, #8BC34A 100%)',
        personality: 'friendly',
        quote: "Rawr! Learning is dino-mite!",
        themeId: 'dinosaur-world'
      };

  companionService.activate({
    learnerId: currentProfile.learnerId,
    firstName: currentProfile.name?.split(' ')[0] || 'friend',
    avatar
  });
  return true;
}

app.whenReady().then(() => {
  profileStore = new ProfileStore(app.getPath('userData'));
  screeningStore = new ScreeningStore(app.getPath('userData'));
  learningStore = new LearningStore(app.getPath('userData'));
  companionService = new CompanionService();

  // Curriculum foundation: deterministic registry seeded from code every
  // startup (all six SUPPORTED_BOARDS) so the parent's selection is always
  // available; the store owns persisted school materials only.
  curriculumRegistry = new CurriculumRegistry();
  const seedResult = registerAvailableCurricula(curriculumRegistry);
  if (!seedResult.ok) {
    console.error(`[curriculum] failed to seed registry: ${seedResult.errors.join(' ')}`);
  }
  curriculumStore = new CurriculumStore(app.getPath('userData'));

  // Every companion state change is broadcast to all renderer windows.
  companionService.onStateChanged((snapshot) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC_CHANNELS.COMPANION_STATE_CHANGED, snapshot);
    }
  });

  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});