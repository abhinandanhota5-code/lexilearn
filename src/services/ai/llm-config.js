/**
 * Centralized LLM provider configuration (Phase 6).
 *
 * Single source of truth for the local Llama 3.1 8B model: model tag, daemon
 * host, and per-purpose request timeouts. The provider classes read this
 * config; nothing else hardcodes a model name or endpoint.
 *
 * PRIVACY (§10): every consumer of this config is a LOCAL daemon. No learner
 * data, prompts, or school material ever leave the device, and callers must
 * pass only the minimum structured signals required by the task.
 */

export const LLM_CONFIG = Object.freeze({
  /** Local Ollama daemon — the only LLM endpoint the app talks to. */
  host: 'http://127.0.0.1:11434',
  /** Local Llama 3.1 8B instruct model (quantized for laptop-class hardware). */
  model: 'llama3.1:8b-instruct-q4_K_M',
  /** Purpose-scoped hard timeouts. */
  timeout: Object.freeze({
    /** Full-report extraction (existing document-upload path). */
    reportExtractionMs: 100_000,
    /**
     * Short-activity wording generation: the prompt is tiny (a bounded
     * excerpt + a schema) and the output is ~120 tokens, so anything past
     * 20s means the daemon is cold/loading — fall back deterministically
     * rather than making the child wait.
     */
    activityWordingMs: 20_000
  })
});

/**
 * Centralized feature flags (Phase 6).
 *
 * generatedActivities — grounded Llama activity wording. Default OFF: the
 * app behaves EXACTLY as the deterministic pipeline when off. When ON,
 * supported activities may use the existing grounded generation service;
 * every result still passes the deterministic Content Validator and any
 * rejection falls back to the curated item. Development/testing control is
 * via the environment (LEXI_LEARN_GENERATED_ACTIVITY=1). No settings UI yet
 * by design; nothing else may gate on ad-hoc env reads.
 */
export const FEATURE_FLAGS = Object.freeze({
  generatedActivities() {
    return process.env.LEXI_LEARN_GENERATED_ACTIVITY === '1';
  }
});
