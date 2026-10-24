import fs from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';

/**
 * Extractor for digital text PDF documents.
 */
export class PdfDocumentExtractor {
  canHandle(extension, _mimeType) {
    const ext = extension.toLowerCase().replace(/^\./, '');
    return ext === 'pdf';
  }

  async extractText(filePath) {
    const buffer = await fs.readFile(filePath);
    if (!buffer || buffer.length === 0) {
      throw new Error('The PDF file is empty (0 bytes).');
    }

    let parser = null;
    try {
      parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      const extractedText = (result.text || '').trim();

      if (!extractedText) {
        throw new Error(
          'No digital text could be extracted from this PDF. It appears to be a scanned image-only document, which requires OCR.'
        );
      }

      return {
        text: extractedText,
        pageCount: result.total || 1,
        isOcr: false,
        extractorName: 'PdfDocumentExtractor'
      };
    } catch (err) {
      if (err.message && err.message.includes('scanned image-only')) {
        throw err;
      }
      throw new Error(`Failed to extract text from PDF: ${err.message}`);
    } finally {
      if (parser && typeof parser.destroy === 'function') {
        try {
          await parser.destroy();
        } catch {
          // ignore cleanup errors
        }
      }
    }
  }
}
