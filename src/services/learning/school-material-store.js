import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * School Material Store (§6B / §13)
 *
 * Stores parent-uploaded school materials (local copies + excerpt chunks +
 * objective links + per-learner index) under
 * `userData/materials/{learnerId}/...`. Content stays OUT of the learner
 * profile file — only references live in adaptive decisions via excerpts.
 *
 * Excerpts are capped (`excerptChunks`, e.g. ≤ 8 × 400 chars) so the
 * grounded Llama tier always receives a bounded slice.
 */

export const EXCERPT_CHUNK_MAX = 400;
export const MAX_EXCERPT_CHUNKS = 8;

/**
 * Deterministically derive bounded excerpt chunks from raw text.
 * @param {string} text
 * @returns {string[]} up to MAX_EXCERPT_CHUNKS chunks of ≤ EXCERPT_CHUNK_MAX chars
 */
export function makeExcerptChunks(text) {
  if (!text) return [];
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const chunks = [];
  let rest = cleaned;
  while (rest.length > 0 && chunks.length < MAX_EXCERPT_CHUNKS) {
    let slice = rest.slice(0, EXCERPT_CHUNK_MAX);
    // Try to break on a sentence boundary for readability.
    const boundary = slice.lastIndexOf('. ');
    if (boundary > EXCERPT_CHUNK_MAX * 0.4) {
      slice = slice.slice(0, boundary + 1);
    }
    chunks.push(slice.trim());
    rest = rest.slice(slice.length).trim();
  }
  return chunks;
}

export class SchoolMaterialStore {
  /**
   * @param {string} baseDir Base directory (e.g., app.getPath('userData'))
   */
  constructor(baseDir) {
    if (!baseDir) {
      throw new Error('SchoolMaterialStore requires a valid baseDir.');
    }
    this.materialsDir = path.join(baseDir, 'materials');
    this.initialized = false;
  }

  async init() {
    if (!this.initialized) {
      await fs.mkdir(this.materialsDir, { recursive: true });
      this.initialized = true;
    }
  }

  learnerDir(learnerId) {
    return path.join(this.materialsDir, learnerId);
  }

  indexPath(learnerId) {
    return path.join(this.learnerDir(learnerId), 'index.json');
  }

  async readIndex(learnerId) {
    await this.init();
    try {
      const content = await fs.readFile(this.indexPath(learnerId), 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      if (err.code === 'ENOENT') return { learnerId, materials: [] };
      throw new Error(`Failed to read school material index: ${err.message}`);
    }
  }

  async writeIndex(index) {
    await this.init();
    await fs.mkdir(this.learnerDir(index.learnerId), { recursive: true });
    const filePath = this.indexPath(index.learnerId);
    const tempFile = `${filePath}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(index, null, 2), 'utf-8');
    await fs.rename(tempFile, filePath);
  }

  /**
   * Add material from already-extracted text (Phase 3 pattern), storing only
   * the bounded excerpt chunks + metadata. No raw blob enters the profile.
   *
   * @param {object} input
   * @param {string} input.learnerId
   * @param {string} input.label
   * @param {string} input.extractedText
   * @param {string} [input.subject]
   * @param {string} [input.chapter]
   * @param {string[]} [input.attachedObjectives]
   * @returns {Promise<object>} the stored material record
   */
  async addMaterial({ learnerId, label, extractedText, subject = '', chapter = '', attachedObjectives = [] }) {
    await this.init();
    if (!learnerId || typeof extractedText !== 'string' || !extractedText.trim()) {
      throw new Error('Invalid material: learnerId and extractedText are required.');
    }

    const materialId = `mat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const excerptChunks = makeExcerptChunks(extractedText);

    const record = {
      materialId,
      learnerId,
      label: label || `Material ${materialId}`,
      subject,
      chapter,
      excerptChunks,
      attachedObjectives: [...attachedObjectives],
      addedAt: new Date().toISOString()
    };

    const index = await this.readIndex(learnerId);
    index.materials.push(record);
    await this.writeIndex(index);

    return record;
  }

  /**
   * List all materials for a learner.
   * @param {string} learnerId
   * @returns {Promise<object[]>}
   */
  async listMaterials(learnerId) {
    const index = await this.readIndex(learnerId);
    return index.materials;
  }

  /**
   * Link an existing material to one or more curated objectives.
   * @param {string} learnerId
   * @param {string} materialId
   * @param {string[]} objectiveIds
   * @returns {Promise<object>} updated material record
   */
  async linkObjectives(learnerId, materialId, objectiveIds) {
    const index = await this.readIndex(learnerId);
    const material = index.materials.find((m) => m.materialId === materialId);
    if (!material) {
      throw new Error('Material not found for this learner.');
    }
    material.attachedObjectives = Array.from(new Set([...(material.attachedObjectives || []), ...objectiveIds]));
    await this.writeIndex(index);
    return material;
  }

  /**
   * Find materials whose attached objectives include the given objective.
   * @param {string} learnerId
   * @param {string} objectiveId
   * @returns {Promise<object[]>} materials (may be empty)
   */
  async findMaterialsForObjective(learnerId, objectiveId) {
    const index = await this.readIndex(learnerId);
    return index.materials.filter((m) => (m.attachedObjectives || []).includes(objectiveId));
  }

  /**
   * Fetch the first bounded excerpt for this learner + objective, if any.
   * @param {string} learnerId
   * @param {string} objectiveId
   * @returns {Promise<{ materialId: string, sourceExcerpt: string } | null>}
   */
  async getExcerptForObjective(learnerId, objectiveId) {
    const materials = await this.findMaterialsForObjective(learnerId, objectiveId);
    if (materials.length === 0) return null;
    const material = materials[0];
    const excerptChunks = material.excerptChunks || [];
    const sourceExcerpt =
      excerptChunks.join(' ').slice(0, EXCERPT_CHUNK_MAX) || null;
    if (!sourceExcerpt) return null;
    return { materialId: material.materialId, sourceExcerpt };
  }
}