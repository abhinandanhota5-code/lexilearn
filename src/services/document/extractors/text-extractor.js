import fs from 'node:fs/promises';

/**
 * Extractor for plain text (.txt, .md) documents.
 */
export class TextDocumentExtractor {
  canHandle(extension, _mimeType) {
    const ext = extension.toLowerCase().replace(/^\./, '');
    return ext === 'txt' || ext === 'md' || ext === 'text';
  }

  async extractText(filePath) {
    const raw = await fs.readFile(filePath, 'utf-8');
    const text = raw.trim();
    if (!text) {
      throw new Error('The text file is empty.');
    }
    return {
      text,
      pageCount: 1,
      isOcr: false,
      extractorName: 'TextDocumentExtractor'
    };
  }
}
