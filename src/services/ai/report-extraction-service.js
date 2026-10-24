/**
 * AI-assisted information extraction service for educational reports and assessments.
 * Uses local Llama 3.1 8B via ILLMProvider with strict prompt guardrails.
 *
 * Bounded by design: report text sent to the model is capped (MAX_REPORT_TEXT_CHARS)
 * and generated output is capped (EXTRACTION_MAX_TOKENS) so total request latency
 * is deterministic. Truncation is announced to the model explicitly so it cannot
 * speculate about unshown content, and nothing removed by truncation is invented.
 */

/** Maximum report text characters sent to the model (bounded latency budget). */
export const MAX_REPORT_TEXT_CHARS = 30000;

/** Maximum generated tokens for the structured extraction response. */
export const EXTRACTION_MAX_TOKENS = 8192;

/**
 * Hard per-request deadline for IEP/report extraction.
 * Defaults (100s) are calibrated for short completions; a full digital IEP
 * (8+ KB text) measures ~2.5 minutes on local Llama 3.1 8B, and a verbose
 * model roll can run much longer — measured 84s to >300s for the same
 * document (output length 3.3k–11.3k+ chars, occasionally overrunning even
 * large caps). The report path gets its own generous budget while every other
 * caller keeps the provider default. Abort behavior is unchanged.
 */
export const EXTRACTION_TIMEOUT_MS = 600000;

export class ReportExtractionService {
  /**
   * @param {import('./llm-provider.js').ILLMProvider} llmProvider
   */
  constructor(llmProvider) {
    if (!llmProvider) {
      throw new Error('ReportExtractionService requires an ILLMProvider instance.');
    }
    this.llmProvider = llmProvider;
  }

  /**
   * Extract structured educational observations and accommodations from report text.
   * @param {string} documentText Raw extracted text from PDF or TXT report
   * @returns {Promise<object>} Structured, reviewable extraction candidate
   */
  async extractAccommodations(documentText) {
    if (!documentText || typeof documentText !== 'string' || documentText.trim().length === 0) {
      throw new Error('Document text is empty. Cannot extract accommodations.');
    }

    // Bounded text budget: first N chars, deterministically. A clear notice is
    // added to the INSTRUCTIONS (never inside the document block, so quoted
    // excerpts cannot be polluted by it) telling the model the document ends there.
    const truncated = documentText.length > MAX_REPORT_TEXT_CHARS;
    const truncatedText = truncated
      ? documentText.slice(0, MAX_REPORT_TEXT_CHARS)
      : documentText;

    console.log(
      `[report-extraction] started docChars=${documentText.length} charsSent=${truncatedText.length} truncated=${truncated}`
    );

    const truncationNotice = truncated
      ? `\nNOTE: This document is longer than the analysis limit. Only the first ${MAX_REPORT_TEXT_CHARS} characters are provided below. Treat the document as ending there. Do NOT speculate about any content that was not shown; if an area is not visible in the provided portion, treat it as not mentioned and list it in "unmentionedAreas".\n`
      : '';

    const prompt = `
You are an educational accommodations assistant for children with dyslexia and learning differences.
Your role is to extract ONLY facts and recommendations explicitly written in the provided assessment, IEP, or educational report.

CRITICAL GUARDRAIL RULES:
1. Extract ONLY information directly and explicitly stated in the document text below.
2. DO NOT DIAGNOSE dyslexia, ADHD, or any medical/clinical condition.
3. DO NOT reinterpret, dispute, speculate, or override any professional recommendations.
4. Clearly distinguish between what is documented vs what is NOT mentioned.
5. If an area or accommodation is NOT explicitly in the text, list it in "unmentionedAreas". DO NOT INVENT or assume anything.
6. Output MUST be valid JSON matching this schema:

{
  "documentSummary": "Brief neutral 1-2 sentence overview of the document (e.g. 'Educational assessment report containing reading accommodation recommendations.')",
  "extractedStrengths": [
    "Explicitly documented strength (e.g. 'Strong listening comprehension')"
  ],
  "extractedChallenges": [
    "Explicitly documented challenge (e.g. 'Difficulty with rapid decoding of multi-syllabic words')"
  ],
  "recommendedAccommodations": [
    {
      "id": "readingRuler | syllableColoring | largerFont | wideSpacing | audioNarration | extendedTime | other",
      "label": "Descriptive title for the accommodation",
      "sourceQuoteOrExcerpt": "The exact sentence or passage from the document recommending this support",
      "category": "visual | phonological | pacing | auditory",
      "recommendedDefault": true
    }
  ],
  "unmentionedAreas": [
    "List of potential supports that were NOT mentioned in the document (e.g. 'Text-to-speech audio was not discussed')"
  ]
}

Be COMPLETE but CONCISE: list every distinct accommodation/strength/challenge exactly once, with short labels — do not restate the same item or passage repeatedly, and do not pad the response. Prefer a concise, complete, valid JSON output.

${truncationNotice}
DOCUMENT TEXT:
"""
${truncatedText}
"""
`;

    try {
      const rawResult = await this.llmProvider.generateStructured(prompt, null, {
        temperature: 0.2,
        maxTokens: EXTRACTION_MAX_TOKENS,
        timeoutMs: EXTRACTION_TIMEOUT_MS
      });

      console.log('[report-extraction] model response received, normalizing');
      const normalized = this.normalizeExtractionOutput(rawResult);
      console.log(
        `[report-extraction] completed accommodations=${normalized.recommendedAccommodations.length} strengths=${normalized.extractedStrengths.length} challenges=${normalized.extractedChallenges.length}`
      );
      return normalized;
    } catch (err) {
      throw new Error(`AI extraction failed: ${err.message}`);
    }
  }

  /**
   * Normalizes and verifies the LLM output into a safe, predictable structure.
   */
  normalizeExtractionOutput(raw) {
    const data = raw || {};

    return {
      documentSummary: typeof data.documentSummary === 'string' && data.documentSummary.trim()
        ? data.documentSummary.trim()
        : 'Educational assessment document analyzed.',
      extractedStrengths: Array.isArray(data.extractedStrengths)
        ? data.extractedStrengths.filter(s => typeof s === 'string' && s.trim())
        : [],
      extractedChallenges: Array.isArray(data.extractedChallenges)
        ? data.extractedChallenges.filter(c => typeof c === 'string' && c.trim())
        : [],
      recommendedAccommodations: Array.isArray(data.recommendedAccommodations)
        ? data.recommendedAccommodations.map((acc, idx) => ({
            id: acc.id || `acc_${idx}`,
            label: acc.label || 'Recommended Support',
            sourceQuoteOrExcerpt: acc.sourceQuoteOrExcerpt || 'Mentioned in evaluation report.',
            category: acc.category || 'reading',
            recommendedDefault: acc.recommendedDefault !== false
          }))
        : [],
      unmentionedAreas: Array.isArray(data.unmentionedAreas)
        ? data.unmentionedAreas.filter(u => typeof u === 'string' && u.trim())
        : [
            'Specific color contrast tints were not discussed',
            'Syllable color breakdown was not specifically evaluated'
          ]
    };
  }
}
