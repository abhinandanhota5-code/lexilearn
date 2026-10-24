/**
 * Companion System — Event Bus
 *
 * Lightweight, bounded pub/sub between activities and the companion core.
 * Activities emit semantic events; the companion core (state machine) subscribes.
 * Synchronous dispatch with a bounded re-entrancy queue to prevent runaway
 * event storms from a single misbehaving emitter.
 */

import { COMPANION_CONFIG } from './companion-config.js';

const DEFAULT_MAX_QUEUED_EVENTS = 100;

export class CompanionEventBus {
  /**
   * @param {object} [options]
   * @param {number} [options.maxQueuedEvents] Bound on deferred events.
   */
  constructor(options = {}) {
    this.maxQueuedEvents = options.maxQueuedEvents ?? DEFAULT_MAX_QUEUED_EVENTS;
    /** @type {Map<string, Set<Function>>} */
    this._subscribers = new Map();
    this._queue = [];
    this._dispatching = false;
    this._overflowCount = 0;
  }

  /** Number of distinct event types with active subscribers. */
  get subscriberCount() {
    return this._subscribers.size;
  }

  /** Total events dropped due to mailbox overflow (diagnostic only). */
  get droppedEvents() {
    return this._overflowCount;
  }

  /**
   * Register a handler for an event type.
   * @param {string} eventType Must be a configured companion event.
   * @param {(payload: object) => void} handler
   * @returns {() => void} unsubscribe function
   */
  subscribe(eventType, handler) {
    this._assertEventType(eventType);
    if (typeof handler !== 'function') {
      throw new Error('CompanionEventBus: handler must be a function.');
    }
    if (!this._subscribers.has(eventType)) {
      this._subscribers.set(eventType, new Set());
    }
    this._subscribers.get(eventType).add(handler);
    return () => this.unsubscribe(eventType, handler);
  }

  /**
   * Remove a specific handler for an event type.
   */
  unsubscribe(eventType, handler) {
    const set = this._subscribers.get(eventType);
    if (set) {
      set.delete(handler);
      if (set.size === 0) this._subscribers.delete(eventType);
    }
  }

  /**
   * Publish an event synchronously. Re-entrant publishes are deferred into a
   * bounded queue; if the queue overflows, the oldest queued event is dropped.
   * @param {string} eventType
   * @param {object} [payload]
   * @returns {boolean} true if at least one handler received the event
   */
  emit(eventType, payload = {}) {
    this._assertEventType(eventType);

    if (this._dispatching) {
      if (this._queue.length >= this.maxQueuedEvents) {
        this._queue.shift();
        this._overflowCount += 1;
      }
      this._queue.push({ eventType, payload });
      return true;
    }

    this._dispatching = true;
    let delivered = false;
    const maxRounds = this.maxQueuedEvents + 1;
    let rounds = 0;
    try {
      const pending = [{ eventType, payload }];
      while (pending.length > 0) {
        const item = pending.shift();
        delivered = this._deliver(item.eventType, item.payload) || delivered;
        // Fold in deferrals that arrived during this dispatch round.
        while (this._queue.length > 0) {
          const deferred = this._queue.shift();
          pending.push(deferred);
        }
        rounds += 1;
        // Hard bound: a misbehaving handler that re-emits on every invocation
        // must never starve the event loop. Any remainder is dropped.
        if (rounds >= maxRounds) {
          this._overflowCount += this._queue.length + pending.length;
          pending.length = 0;
          this._queue.length = 0;
          break;
        }
      }
    } finally {
      this._dispatching = false;
      this._queue.length = 0;
    }
    return delivered;
  }

  /** Remove every subscription (used on dispose/teardown). */
  clear() {
    this._subscribers.clear();
    this._queue.length = 0;
    this._overflowCount = 0;
  }

  _assertEventType(eventType) {
    // Event types are the values in the config map (e.g. 'answer_correct').
    if (!(eventType in COMPANION_CONFIG.eventStateMap)) {
      throw new Error(`CompanionEventBus: unknown event type "${eventType}".`);
    }
  }

  _deliver(eventType, payload) {
    const set = this._subscribers.get(eventType);
    if (!set || set.size === 0) return false;
    // Copy so handlers may safely unsubscribe during dispatch.
    for (const handler of [...set]) {
      try {
        handler(payload);
      } catch (err) {
        // A subscriber must never break the bus for other subscribers.
        console.error(`CompanionEventBus: handler error for "${eventType}":`, err);
      }
    }
    return true;
  }
}