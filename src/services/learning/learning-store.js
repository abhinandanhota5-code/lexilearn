import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Local JSON persistence for adaptive learning sessions (§13).
 * Stores data safely under Electron's app.getPath('userData').
 * Mirrors the atomic write pattern used by ScreeningStore (tmp + rename).
 *
 * Session file: { sessionId, learnerId, grade, skillFocus, startedAt,
 *                 status, plans: [], results: [], explanations: [],
 *                 decisions: [] }
 */
export class LearningStore {
  /**
   * @param {string} baseDir Base directory path (e.g., app.getPath('userData'))
   */
  constructor(baseDir) {
    if (!baseDir) {
      throw new Error('LearningStore requires a valid baseDir (e.g., app.getPath("userData")).');
    }
    this.learningDir = path.join(baseDir, 'learning');
    this.initialized = false;
  }

  async init() {
    if (!this.initialized) {
      await fs.mkdir(this.learningDir, { recursive: true });
      this.initialized = true;
    }
  }

  /**
   * Session file path for a learner + session ID.
   * @param {string} learnerId
   * @param {string} sessionId
   * @returns {string}
   */
  sessionPath(learnerId, sessionId) {
    return path.join(this.learningDir, learnerId, `${sessionId}.json`);
  }

  /**
   * Persist a learning session to disk (atomic tmp + rename).
   * @param {object} sessionData Full session object
   * @returns {Promise<object>} The saved session data
   */
  async saveSession(sessionData) {
    await this.init();
    if (!sessionData || typeof sessionData !== 'object') {
      throw new Error('Invalid learning session data: expected an object.');
    }

    const learnerId = sessionData.learnerId || 'unknown';
    const sessionId = sessionData.sessionId || `session_${Date.now()}`;
    const filePath = this.sessionPath(learnerId, sessionId);

    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const tempFile = `${filePath}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(sessionData, null, 2), 'utf-8');
    await fs.rename(tempFile, filePath);

    return { ...sessionData, sessionId };
  }

  /**
   * Load a specific session file.
   * @param {string} learnerId
   * @param {string} sessionId
   * @returns {Promise<object|null>}
   */
  async getSession(learnerId, sessionId) {
    const filePath = this.sessionPath(learnerId, sessionId);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw new Error(`Failed to read learning session: ${err.message}`);
    }
  }

  /**
   * List all session IDs for a learner with in-progress or recent state.
   * @param {string} learnerId
   * @returns {Promise<string[]>} Session IDs sorted newest first
   */
  async listSessionIds(learnerId) {
    const learnerDir = path.join(this.learningDir, learnerId);
    try {
      const entries = await fs.readdir(learnerDir);
      return entries
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace('.json', ''))
        .sort((a, b) => b.localeCompare(a));
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw new Error(`Failed to list learning sessions: ${err.message}`);
    }
  }

  /**
   * Retrieve the most recent session for a learner.
   * @param {string} learnerId
   * @returns {Promise<object|null>}
   */
  async getLatestSession(learnerId) {
    const ids = await this.listSessionIds(learnerId);
    if (ids.length === 0) return null;
    return this.getSession(learnerId, ids[0]);
  }

  /**
   * Retrieve all sessions for a learner.
   * @param {string} learnerId
   * @returns {Promise<object[]>}
   */
  async getAllSessions(learnerId) {
    const ids = await this.listSessionIds(learnerId);
    const sessions = [];
    for (const id of ids) {
      const session = await this.getSession(learnerId, id);
      if (session) sessions.push(session);
    }
    return sessions;
  }
}