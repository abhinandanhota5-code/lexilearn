/**
 * Companion System — Behaviors
 *
 * Translates (state, event, learner context) into bounded companion output:
 * a short curated message plus an animation hint. Selection is deterministic —
 * seeded by the learner's ID and a monotonic counter — so identical inputs
 * always produce identical outputs. No LLM in Phase 5 (reserved boundary).
 */

import { COMPANION_CONFIG } from './companion-config.js';

/**
 * Deterministic PRNG seeded from a string (FNV-1a hash → mulberry32).
 * Used purely for stable message rotation, not cryptographic purposes.
 */
export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * @param {object} [options]
 * @param {object} [options.config] Companion config (defaults to COMPANION_CONFIG).
 * @param {Function} [options.seedFn] Injectable hash for deterministic rotation.
 */
export function createBehaviorBuilder(options = {}) {
  const config = options.config || COMPANION_CONFIG;
  const seedFn = options.seedFn || hashSeed;

  /**
   * @param {object} ctx
   * @param {string} ctx.state Current companion state
   * @param {string|null} ctx.event Last semantic event (may be null)
   * @param {string} ctx.learnerId For deterministic seed
   * @param {string} [ctx.firstName] Optional name interpolation for `{name}`
   * @param {string} [ctx.label] Optional companion label for `{label}`
   * @param {number} [ctx.seqCounter] Monotonic rotation counter
   * @param {boolean} [ctx.welcome] When true, use the welcome pool (idle greeting)
   * @returns {{ state: string, event: string|null, message: string|null, pool: string|null }}
   */
  function buildBehavior(ctx) {
    const state = ctx.state;
    const event = ctx.event;
    const poolKey = ctx.welcome ? 'welcome' : (event ? `${event}.${state}` : null);
    const pool = poolKey ? config.messagePools[poolKey] : null;

    if (!pool || pool.length === 0) {
      // Listening and idle are intentionally silent; unknown combos produce no message.
      return { state, event, message: null, pool: null };
    }

    const seed = seedFn(String(ctx.learnerId || '') + poolKey);
    const idx = (seed + (ctx.seqCounter || 0)) % pool.length;
    let message = interpolate(pool[idx], {
      name: ctx.firstName || 'friend',
      label: ctx.label || ''
    });

    // Safety filter: length cap + forbidden content. If a curated message were
    // ever to violate the rules, fall back to a safe generic instead of failing.
    if (!isAllowed(message, config)) {
      message = safeFallback(event, config);
    }

    return { state, event, message, pool: poolKey };
  }

  /**
   * Validate a candidate message against length and content rules.
   * Exposed for unit testing of curated pools.
   */
  function isAllowed(message, cfg = config) {
    if (typeof message !== 'string' || message.length === 0) return false;
    if (message.length > cfg.limits.MAX_MESSAGE_LENGTH) return false;
    for (const pattern of cfg.forbiddenPatterns) {
      if (pattern.test(message)) return false;
    }
    return true;
  }

  function safeFallback(event, cfg) {
    const generic = `${event}.helping`;
    const pool = cfg.messagePools[generic];
    if (pool && pool.length > 0) {
      const msg = pool[0];
      if (isAllowed(msg, cfg)) return msg;
    }
    return 'I am right here with you. 🌟';
  }

  function interpolate(message, vars) {
    return message.replace(/\{(\w+)\}/g, (match, key) =>
      key in vars ? vars[key] : match
    );
  }

  return Object.freeze({
    buildBehavior,
    isAllowed,
    interpolate
  });
}

/** Default singleton behavior builder. */
export function buildBehavior(ctx, options = {}) {
  return createBehaviorBuilder(options).buildBehavior(ctx);
}