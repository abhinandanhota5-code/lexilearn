import fs from 'node:fs/promises';
import path from 'node:path';
import { TextDocumentExtractor } from './extractors/text-extractor.js';
import { PdfDocumentExtractor } from './extractors/pdf-extractor.js';
import { ImageOcrExtractor } from './extractors/image-ocr-extractor.js';

export const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024; // 30 MB

/**
 * Orchestrator for document ingestion and text extraction.
 * Routes files to the appropriate extractor using the Strategy Pattern.
 */
export class DocumentIngestionPipeline {
  constructor(extractors = null) {
    this.extractors = extractors || [
      new TextDocumentExtractor(),
      new PdfDocumentExtractor(),
      new ImageOcrExtractor()
    ];
  }

  /**
   * Register a new or custom extractor strategy.
   * @param {object} extractor Instance implementing canHandle() and extractText()
   */
  registerExtractor(extractor) {
    this.extractors.unshift(extractor);
  }

  /**
   * Extract text from a document file path.
   * @param {string} filePath Absolute path to document
   * @returns {Promise<{ text: string, pageCount: number, fileName: string, fileSize: number, extractorName: string }>}
   */
  async extractDocument(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('A valid file path must be provided.');
    }

    let stats;
    try {
      stats = await fs.stat(filePath);
    } catch (err) {
      throw new Error(`Document file not found: ${filePath}`);
    }

    if (!stats.isFile()) {
      throw new Error(`Specified path is not a file: ${filePath}`);
    }

    if (stats.size === 0) {
      throw new Error('The selected document is empty (0 bytes).');
    }

    if (stats.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File exceeds the maximum allowable size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`);
    }

    const ext = path.extname(filePath);
    const extractor = this.extractors.find(e => e.canHandle(ext));

    if (!extractor) {
      throw new Error(
        `Unsupported document format: "${ext}". Supported formats include PDF (.pdf) and Plain Text (.txt, .md).`
      );
    }

    const result = await extractor.extractText(filePath);

    return {
      text: result.text,
      pageCount: result.pageCount || 1,
      fileName: path.basename(filePath),
      fileSize: stats.size,
      extractorName: result.extractorName || extractor.constructor.name
    };
  }

  /**
   * Securely persist the original uploaded document locally in the app's userData directory.
   * @param {string} sourcePath Original document path
   * @param {string} baseUserDataDir Electron's app.getPath('userData')
   * @param {string} learnerId Current learner identifier
   * @returns {Promise<{ storedPath: string, fileName: string, fileSize: number, storedAt: string }>}
   */
  async storeDocumentLocally(sourcePath, baseUserDataDir, learnerId = 'default') {
    const docsDir = path.join(baseUserDataDir, 'documents', learnerId);
    await fs.mkdir(docsDir, { recursive: true });

    const originalName = path.basename(sourcePath);
    const sanitizedBase = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFileName = `${Date.now()}_${sanitizedBase}`;
    const destinationPath = path.join(docsDir, storedFileName);

    await fs.copyFile(sourcePath, destinationPath);
    const stats = await fs.stat(destinationPath);

    return {
      storedPath: destinationPath,
      fileName: originalName,
      fileSize: stats.size,
      storedAt: new Date().toISOString()
    };
  }
}
