import path from 'node:path';

/**
 * Strategy contract and adapter for Image / Scanned Document OCR.
 * Enables adding local OCR engines (such as Tesseract.js or native Apple Vision)
 * in future phases without redesigning the ingestion pipeline or UI.
 */
export class ImageOcrExtractor {
  constructor(ocrEngine = null) {
    this.ocrEngine = ocrEngine;
  }

  canHandle(extension, _mimeType) {
    const ext = extension.toLowerCase().replace(/^\./, '');
    return ['png', 'jpg', 'jpeg', 'tiff', 'tif', 'bmp', 'webp'].includes(ext);
  }

  async extractText(filePath) {
    if (!this.ocrEngine) {
      const ext = path.extname(filePath).toUpperCase();
      throw new Error(
        `Scanned ${ext} image detected. Direct image OCR is structured in the pipeline architecture and scheduled for an upcoming update. Please provide a digital PDF or plain text report for current extraction.`
      );
    }

    // Future OCR execution:
    // return await this.ocrEngine.recognize(filePath);
    return await this.ocrEngine.extractText(filePath);
  }
}
