/**
 * Curriculum Store — local-first persistence for the curriculum foundation.
 *
 * Layout (under Electron userData or any baseDir; NO network, NO secrets):
 *   {baseDir}/curriculum/curricula/index.json   → registered curricula
 *   {baseDir}/curriculum/materials/{learnerId}/index.json → canonical materials
 *
 * Contract:
 * - Atomic writes only (tmp + rename; same pattern as LearningStore /
 *   SchoolMaterialStore).
 * - Validate-on-load: persisted records are re-validated; invalid records are
 *   NEVER returned as valid — they are quarantined into an `invalid` list so
 *   callers can report them (fail-closed, nothing silently dropped).
 * - Existing legacy SchoolMaterialStore is untouched; this store owns only
 *   the new canonical records.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { validateCurriculum, validateSchoolMaterial } from './curriculum-schema.js';
import { parseSchoolMaterial } from './school-material-model.js';
import { validateSchoolwork } from './schoolwork-schema.js';

export class CurriculumStore {
  /**
   * @param {string} baseDir Base directory (e.g., app.getPath('userData'))
   */
  constructor(baseDir) {
    if (!baseDir) {
      throw new Error('CurriculumStore requires a valid baseDir.');
    }
    this.rootDir = path.join(baseDir, 'curriculum');
    this.curriculaPath = path.join(this.rootDir, 'curricula', 'index.json');
    this.initialized = false;
  }

  async init() {
    if (!this.initialized) {
      await fs.mkdir(path.join(this.rootDir, 'curricula'), { recursive: true });
      await fs.mkdir(path.join(this.rootDir, 'materials'), { recursive: true });
      this.initialized = true;
    }
  }

  async writeJsonAtomic(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tempFile = `${filePath}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempFile, filePath);
  }

  async readJson(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw new Error(`Failed to read curriculum store file: ${err.message}`);
    }
  }

  /* ───────────────────── curricula ───────────────────── */

  /**
   * Persist registered curricula (validated before write).
   * @param {object[]} curricula
   * @returns {Promise<{ ok: boolean, errors: string[] }>}
   */
  async saveCurricula(curricula) {
    await this.init();
    const errors = [];
    const list = Array.isArray(curricula) ? curricula : [];
    for (const curriculum of list) {
      const check = validateCurriculum(curriculum);
      if (!check.isValid) errors.push(...check.errors);
    }
    if (errors.length > 0) {
      return { ok: false, errors };
    }
    await this.writeJsonAtomic(this.curriculaPath, { curricula: list });
    return { ok: true, errors: [] };
  }

  /**
   * Load persisted curricula, validating on load (fail-closed).
   * @returns {Promise<{ curricula: object[], invalid: Array<{ index: number, errors: string[] }> }>}
   */
  async loadCurricula() {
    await this.init();
    const data = await this.readJson(this.curriculaPath);
    const list = Array.isArray(data?.curricula) ? data.curricula : [];
    const valid = [];
    const invalid = [];
    list.forEach((curriculum, index) => {
      const check = validateCurriculum(curriculum);
      if (check.isValid) valid.push(curriculum);
      else invalid.push({ index, errors: check.errors });
    });
    return { curricula: valid, invalid };
  }

  /* ───────────────────── school materials ───────────────────── */

  materialsPath(learnerId) {
    return path.join(this.rootDir, 'materials', learnerId, 'index.json');
  }

  /**
   * Persist a learner's canonical school materials (each validated).
   * @param {string} learnerId
   * @param {object[]} materials
   * @returns {Promise<{ ok: boolean, errors: string[] }>}
   */
  async saveMaterials(learnerId, materials) {
    await this.init();
    if (!learnerId || typeof learnerId !== 'string') {
      return { ok: false, errors: ['learnerId is required.'] };
    }
    const errors = [];
    const list = Array.isArray(materials) ? materials : [];
    for (const material of list) {
      const check = validateSchoolMaterial(material);
      if (!check.isValid) errors.push(...check.errors);
    }
    if (errors.length > 0) {
      return { ok: false, errors };
    }
    await this.writeJsonAtomic(this.materialsPath(learnerId), { materials: list });
    return { ok: true, errors: [] };
  }

  /**
   * Load a learner's canonical materials, validating on load (fail-closed).
   * Invalid records are quarantined, not returned as valid.
   * @param {string} learnerId
   * @returns {Promise<{ materials: object[], invalid: Array<{ index: number, errors: string[] }> }>}
   */
  async loadMaterials(learnerId) {
    await this.init();
    const data = await this.readJson(this.materialsPath(learnerId));
    const list = Array.isArray(data?.materials) ? data.materials : [];
    const valid = [];
    const invalid = [];
    list.forEach((material, index) => {
      const check = validateSchoolMaterial(material);
      if (check.isValid) valid.push(material);
      else invalid.push({ index, errors: check.errors });
    });
    return { materials: valid, invalid };
  }

  /**
   * Persist a single material record as its own JSON file (serialization
   * round-trip helper for tests and future per-material storage).
   * @param {object} material
   * @returns {Promise<{ ok: boolean, errors: string[] }>}
   */
  async saveMaterialRecord(material) {
    await this.init();
    const check = validateSchoolMaterial(material);
    if (!check.isValid) {
      return { ok: false, errors: check.errors };
    }
    const filePath = path.join(this.rootDir, 'materials', '_records', `${material.materialId}.json`);
    await this.writeJsonAtomic(filePath, material);
    return { ok: true, errors: [] };
  }

  /**
   * Load + validate a single material record.
   * @param {string} materialId
   * @returns {Promise<{ ok: boolean, material?: object, errors: string[] }>}
   */
  async loadMaterialRecord(materialId) {
    await this.init();
    const filePath = path.join(this.rootDir, 'materials', '_records', `${materialId}.json`);
    const data = await this.readJson(filePath);
    if (data === null) {
      return { ok: false, errors: ['Material record not found.'] };
    }
    return parseSchoolMaterial(JSON.stringify(data));
  }

  /* ───────────────────── schoolwork (Phase 7.2) ───────────────────── */

  /**
   * Schoolwork records file path for a learner. Same local-first convention as
   * materials: one per-learner index under {rootDir}/schoolwork/{learner}.
   * @param {string} learnerId
   * @returns {string}
   */
  schoolworkPath(learnerId) {
    return path.join(this.rootDir, 'schoolwork', learnerId, 'index.json');
  }

  /**
   * Persist a learner's canonical schoolwork records (each validated).
   * @param {string} learnerId
   * @param {object[]} records
   * @returns {Promise<{ ok: boolean, errors: string[] }>}
   */
  async saveSchoolwork(learnerId, records) {
    await this.init();
    if (!learnerId || typeof learnerId !== 'string') {
      return { ok: false, errors: ['learnerId is required.'] };
    }
    const errors = [];
    const list = Array.isArray(records) ? records : [];
    for (const record of list) {
      const check = validateSchoolwork(record);
      if (!check.isValid) errors.push(...check.errors);
    }
    if (errors.length > 0) {
      return { ok: false, errors };
    }
    await this.writeJsonAtomic(this.schoolworkPath(learnerId), { schoolwork: list });
    return { ok: true, errors: [] };
  }

  /**
   * Load a learner's schoolwork records, validating on load (fail-closed).
   * Invalid records are quarantined, never returned as valid.
   * @param {string} learnerId
   * @returns {Promise<{ schoolwork: object[], invalid: Array<{ index: number, errors: string[] }> }>}
   */
  async loadSchoolwork(learnerId) {
    await this.init();
    const data = await this.readJson(this.schoolworkPath(learnerId));
    const list = Array.isArray(data?.schoolwork) ? data.schoolwork : [];
    const valid = [];
    const invalid = [];
    list.forEach((record, index) => {
      const check = validateSchoolwork(record);
      if (check.isValid) valid.push(record);
      else invalid.push({ index, errors: check.errors });
    });
    return { schoolwork: valid, invalid };
  }
}
