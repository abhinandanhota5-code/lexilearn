import fs from 'node:fs/promises';
import path from 'node:path';
import { sanitizeAdaptiveLearning } from '../../shared/profile-schema.js';

/**
 * Local JSON persistence manager for the Learner Profile.
 * Stores data safely under Electron's app.getPath('userData').
 */
export class ProfileStore {
  /**
   * @param {string} baseDir Base directory path (e.g., app.getPath('userData'))
   */
  constructor(baseDir) {
    if (!baseDir) {
      throw new Error('ProfileStore requires a valid baseDir (e.g., app.getPath("userData")).');
    }
    this.profilesDir = path.join(baseDir, 'profiles');
    this.profileFile = path.join(this.profilesDir, 'learner-profile.json');
    this.initialized = false;
  }

  /**
   * Ensure directory exists before read/write operations.
   */
  async init() {
    if (!this.initialized) {
      await fs.mkdir(this.profilesDir, { recursive: true });
      this.initialized = true;
    }
  }

  /**
   * Retrieve the current persisted profile, or null if not yet created.
   * @returns {Promise<object|null>}
   */
  async getProfile() {
    await this.init();
    try {
      const content = await fs.readFile(this.profileFile, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return null;
      }
      throw new Error(`Failed to read learner profile: ${err.message}`);
    }
  }

  /**
   * Persist a learner profile object to disk.
   * @param {object} profileData
   * @returns {Promise<object>} The saved profile data with updated timestamp
   */
  async saveProfile(profileData) {
    await this.init();
    if (!profileData || typeof profileData !== 'object') {
      throw new Error('Invalid profile data: expected an object.');
    }

    const payload = {
      ...profileData,
      // Clamp-on-WRITE (in addition to the existing clamp-on-load): the
      // adaptive block is written by ALE arithmetic, and a NaN produced by a
      // corrupt prior value would otherwise be serialized as `null` and
      // permanently poison the learner profile. Sanitizing here means the
      // persisted file can never hold a non-finite adaptive number.
      adaptiveLearning: sanitizeAdaptiveLearning(profileData.adaptiveLearning),
      updatedAt: new Date().toISOString()
    };

    // Write to a temporary file and atomic rename or write directly
    const tempFile = `${this.profileFile}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(payload, null, 2), 'utf-8');
    await fs.rename(tempFile, this.profileFile);

    return payload;
  }

  /**
   * Reset / clear stored profile data.
   * @returns {Promise<boolean>}
   */
  async resetProfile() {
    await this.init();
    try {
      await fs.unlink(this.profileFile);
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return true;
      }
      throw new Error(`Failed to reset learner profile: ${err.message}`);
    }
  }

  /**
   * Get the absolute path to the stored JSON file.
   * @returns {string}
   */
  getProfilePath() {
    return this.profileFile;
  }
}
