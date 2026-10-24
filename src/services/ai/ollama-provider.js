import { Ollama } from 'ollama';
import { ILLMProvider } from './llm-provider.js';

export const DEFAULT_MODEL = 'llama3.1:8b-instruct-q4_K_M';

/** Model's advertised max context; the daemon loads models at this default. */
export const DEFAULT_CONTEXT_TOKENS = 16384;

/**
 * Default hard timeout for a single Ollama request. The request is genuinely
 * aborted (the underlying HTTP stream is cancelled), not just abandoned.
 */
export const DEFAULT_TIMEOUT_MS = 100_000; // 100s — within the 90–120s target window

/** Thrown when a request exceeds its timeout and has been aborted. */
export class OllamaTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`Local AI request timed out after ${Math.round(timeoutMs / 1000)}s (model may be loading, or the document is taking too long to analyze).`);
    this.name = 'OllamaTimeoutError';
    this.code = 'OLLAMA_TIMEOUT';
  }
}

/** Thrown when the local Ollama daemon cannot be reached or drops the connection. */
export class OllamaUnavailableError extends Error {
  constructor(host, cause) {
    super(`Cannot reach the local Ollama daemon at ${host}. Is Ollama running?${cause ? ` (${cause})` : ''}`);
    this.name = 'OllamaUnavailableError';
    this.code = 'OLLAMA_UNAVAILABLE';
  }
}

function isConnectionError(err) {
  const codes = ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'EPIPE'];
  const code = err?.cause?.code || err?.code;
  if (code && codes.includes(code)) return true;
  return /fetch failed|ECONNREFUSED|socket hang up/i.test(err?.message || '');
}

/**
 * Sanitizes a JSON.parse error message so raw model output (which is derived
 * from uploaded, potentially confidential report text) is never surfaced into
 * logs or thrown errors. V8 embeds quoted input fragments in messages like
 * `Unexpected token 'o', "not json at all" is not valid JSON` — those quoted
 * fragments are replaced with a neutral placeholder.
 */
function sanitizeJsonParseMessage(message) {
  if (!message) return 'malformed JSON';
  return message
    .replace(/, "[^"]*" is not valid JSON/, ' (unexpected token)')
    .replace(/"[^"]*"/g, "'<content>'")
    .trim();
}

/**
 * Ollama-backed implementation of ILLMProvider targeting the local Llama model.
 *
 * All requests are issued as streaming chats so they are GENUINELY abortable:
 * the ollama client only wires an AbortSignal for streamed requests, and the
 * returned iterator exposes abort() which cancels the underlying HTTP stream.
 * A hard timer aborts the stream and rejects deterministically — the renderer
 * never waits indefinitely.
 */
export class OllamaLLMProvider extends ILLMProvider {
  /**
   * @param {string} [modelName] Name/tag of the local model
   * @param {string} [host] Local daemon address
   * @param {object} [options]
   * @param {number} [options.timeoutMs] Hard per-request timeout (default 100s)
   * @param {Function} [options.fetch] Custom fetch impl (tests inject a fake here)
   */
  constructor(modelName = DEFAULT_MODEL, host = 'http://127.0.0.1:11434', options = {}) {
    super();
    this.modelName = modelName;
    this.host = host;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    // Context window for chat requests. Ollama loads models at a 4096-token
    // default unless num_ctx is sent per request; full-text report extraction
    // (8 KB+ IEP text + a complete structured JSON response) exceeds 4096 and
    // previously stalled at the context boundary. The request explicitly
    // requests this window so generation can actually finish.
    this.numCtx = options.numCtx ?? DEFAULT_CONTEXT_TOKENS;
    // Injected fetch (used by tests) becomes the base for per-request wrappers;
    // the library's global default export is never touched.
    this.baseFetch = options.fetch ?? ((...args) => fetch(...args));
    // Instance-level client for non-streamable endpoints (e.g. health/list).
    this.client = new Ollama({
      host,
      ...(options.fetch ? { fetch: options.fetch } : {})
    });
  }

  #log(message) {
    console.log(`[ollama-provider] ${message}`);
  }

  /**
   * Checks if Ollama daemon is reachable and whether the target model is installed.
   */
  async checkHealth() {
    try {
      const modelsList = await this.client.list();
      const models = modelsList.models || [];
      const hasTargetModel = models.some(m =>
        m.name === this.modelName ||
        m.name.startsWith(this.modelName.split(':')[0])
      );

      return {
        available: true,
        modelName: this.modelName,
        modelInstalled: hasTargetModel,
        availableModels: models.map(m => m.name)
      };
    } catch (err) {
      return {
        available: false,
        modelName: this.modelName,
        modelInstalled: false,
        error: err.message || `Unable to reach Ollama daemon on ${this.host}`
      };
    }
  }

  /**
   * Shared abort-safe chat request. Streams the response so the underlying
   * HTTP request is truly cancelled when the hard timer fires.
   * @returns {Promise<string>} Assistant message content
   */
  async #chat({ prompt, temperature, maxTokens, timeoutMs, format }) {
    const startedAt = Date.now();
    const effectiveTimeout = timeoutMs ?? this.timeoutMs;

    this.#log(`request started model=${this.modelName} promptChars=${prompt.length} maxTokens=${maxTokens} timeoutMs=${effectiveTimeout}${format === 'json' ? ' format=json' : ''}`);

    // Hard timer starts BEFORE the request, and each request gets its own
    // AbortController wired into the fetch layer via AbortSignal.any. This is a
    // GENUINE abort in every phase (connect or generation): the HTTP socket is
    // destroyed, the local model stops generating — and no other request on
    // this provider is affected.
    const controller = new AbortController();
    let timedOut = false;
    let timer = null;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reject(new OllamaTimeoutError(effectiveTimeout));
      }, effectiveTimeout);
      // Never keep the event loop alive just for the timeout (keeps tests clean).
      timer.unref?.();
    });

    const wrappedFetch = (url, init = {}) => {
      const signals = init?.signal ? [init.signal, controller.signal] : [controller.signal];
      return this.baseFetch(url, { ...init, signal: AbortSignal.any(signals) });
    };
    const requestClient = new Ollama({ host: this.host, fetch: wrappedFetch });

    let stream = null;
    try {
      stream = await Promise.race([
        requestClient.chat({
          model: this.modelName,
          ...(format === 'json' ? { format: 'json' } : {}),
          messages: [{ role: 'user', content: prompt }],
          stream: true,
          options: { temperature, num_predict: maxTokens, num_ctx: this.numCtx }
        }),
        timeoutPromise
      ]);

      // Chat streaming protocol: every chunk carries a content delta; the final
      // chunk (done: true) carries the complete message. Handle both shapes.
      let accumulated = '';
      let finalPart = null;
      const collect = (async () => {
        for await (const part of stream) {
          if (part?.done) {
            finalPart = part;
          } else if (typeof part?.message?.content === 'string') {
            accumulated += part.message.content;
          }
        }
      })();

      const winner = await Promise.race([collect.then(() => finalPart), timeoutPromise]);
      const content =
        typeof winner?.message?.content === 'string' && winner.message.content.length >= accumulated.length
          ? winner.message.content
          : accumulated;

      this.#log(`request completed ms=${Date.now() - startedAt}`);
      return content;
    } catch (err) {
      const elapsed = Date.now() - startedAt;
      if (timedOut) {
        // controller.abort() already fired (in the timer callback): the HTTP
        // stream is genuinely cancelled in every phase.
        this.#log(`request TIMED OUT after ${elapsed}ms — request aborted`);
        throw new OllamaTimeoutError(effectiveTimeout);
      }
      if (err?.name === 'AbortError') {
        // Aborted without our timer (should not happen today, but fail cleanly).
        this.#log(`request aborted after ${elapsed}ms`);
        throw new OllamaTimeoutError(elapsed);
      }
      if (isConnectionError(err)) {
        const code = err?.cause?.code || err?.code || 'connection failed';
        this.#log(`request failed (unreachable) after ${elapsed}ms code=${code}`);
        throw new OllamaUnavailableError(this.host, code);
      }
      this.#log(`request failed after ${elapsed}ms error=${err?.name || 'Error'}: ${err?.message || 'unknown'}`);
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Generate plain text completion.
   * @param {string} prompt
   * @param {object} [options] { temperature, maxTokens, timeoutMs }
   * @returns {Promise<string>}
   */
  async generateText(prompt, options = {}) {
    const content = await this.#chat({
      prompt,
      temperature: options.temperature ?? 0.5,
      maxTokens: options.maxTokens ?? 512,
      timeoutMs: options.timeoutMs
    });
    return content || '';
  }

  /**
   * Generate structured JSON output.
   * @param {string} prompt
   * @param {object} [schema] Unused (JSON mode is enforced via format:'json')
   * @param {object} [options] { temperature, maxTokens, timeoutMs }
   * @returns {Promise<object>}
   */
  async generateStructured(prompt, schema = null, options = {}) {
    const rawContent = await this.#chat({
      prompt,
      temperature: options.temperature ?? 0.2,
      maxTokens: options.maxTokens ?? 1024,
      timeoutMs: options.timeoutMs,
      format: 'json'
    });

    const text = rawContent || '{}';
    const parseStartedAt = Date.now();
    try {
      const parsed = JSON.parse(text);
      this.#log(`response parsed ok chars=${text.length} ms=${Date.now() - parseStartedAt}`);
      return parsed;
    } catch (err) {
      const safeReason = sanitizeJsonParseMessage(err.message);
      this.#log(`response parsing FAILED chars=${text.length} error=${safeReason}`);
      // Never echo the raw model output into the log or the error: the output
      // is derived from the uploaded (potentially confidential) report text.
      throw new Error(`Failed to parse LLM JSON output: ${safeReason}`);
    }
  }
}
