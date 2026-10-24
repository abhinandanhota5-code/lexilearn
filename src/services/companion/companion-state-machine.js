/**
 * Companion System — State Machine
 *
 * Deterministic finite state machine governing companion behavior.
 * All transitions are driven exclusively by activity events — the companion
 * never decides its own transitions. Timer-based auto-transitions move
 * transient states (thinking/encouraging/celebrating) back to resting states.
 *
 * Timers are injectable so the machine is fully testable without real delays.
 */

import { COMPANION_CONFIG } from './companion-config.js';

export class CompanionStateMachine {
  /**
   * @param {object} [options]
   * @param {object} [options.config] Companion config (defaults to COMPANION_CONFIG).
   * @param {Function} [options.setTimer] Injectable setTimeout-compatible timer.
   * @param {Function} [options.clearTimer] Injectable clearTimeout-compatible clear.
   * @param {Function} [options.now] Injectable clock (ms epoch).
   * @param {Function} [options.onTransition] Optional callback fired on every transition.
   */
  constructor(options = {}) {
    this.config = options.config || COMPANION_CONFIG;
    this._setTimer = options.setTimer || ((fn, ms) => setTimeout(fn, ms));
    this._clearTimer = options.clearTimer || ((handle) => clearTimeout(handle));
    this._now = options.now || (() => Date.now());

    this._state = this.config.states.IDLE;
    this._lastEvent = null;
    this._timer = null;
    this._expiresAt = null;
    this._transitionCount = 0;

    // Public hook fired only on timer-driven auto-transitions. The service
    // uses it to re-sync subscribers after a state auto-changes. May be
    // reassigned after construction (the service owns this behavior).
    this.onTransition = options.onTransition || null;
  }

  /** Current state name (always one of the configured states). */
  get state() {
    return this._state;
  }

  /** Last semantic event that drove a transition (null before any event). */
  get lastEvent() {
    return this._lastEvent;
  }

  /** Epoch ms when the current state auto-transitions, or null. */
  get expiresAt() {
    return this._expiresAt;
  }

  /** Number of state transitions observed since construction (diagnostic). */
  get transitionCount() {
    return this._transitionCount;
  }

  /**
   * Apply a semantic activity event.
   * @param {string} eventType A configured companion event.
   * @returns {{ state: string, event: string|null, expiresAt: number|null }}
   */
  transition(eventType) {
    const target = this.config.eventStateMap[eventType];
    if (!target) {
      // Unknown events are ignored — the machine stays put (bounded behavior).
      return this._snapshot();
    }
    return this._enter(target, eventType);
  }

  /**
   * Force the machine to a resting state (used by the service on activate).
   * @returns {object} current snapshot
   */
  reset() {
    this._clearScheduledTransition();
    return this._enter(this.config.states.IDLE, null);
  }

  _enter(state, eventType) {
    this._clearScheduledTransition();
    this._state = state;
    this._lastEvent = eventType;
    this._transitionCount += 1;

    // Schedule auto-transition for transient states per the config table.
    const auto = this.config.autoTransitions.find((t) => t.from === state);
    if (auto) {
      const duration = this.config.stateDurationsMs[state] ?? 0;
      this._expiresAt = duration > 0 ? this._now() + duration : null;
      if (duration > 0) {
        this._timer = this._setTimer(() => {
          this._timer = null;
          this._expiresAt = null;
          this._enter(auto.to, this._lastEvent);
          // Auto-transition notifications let the service re-render the
          // companion (e.g. encouraging -> idle clears the bubble).
          if (this.onTransition) this.onTransition(this._snapshot());
        }, duration);
      }
    } else {
      this._expiresAt = null;
    }
    return this._snapshot();
  }

  _clearScheduledTransition() {
    if (this._timer !== null) {
      this._clearTimer(this._timer);
      this._timer = null;
    }
    this._expiresAt = null;
  }

  /** Dispose of machine resources (cancels any pending auto-transition). */
  dispose() {
    this._clearScheduledTransition();
  }

  _snapshot() {
    return {
      state: this._state,
      event: this._lastEvent,
      expiresAt: this._expiresAt
    };
  }
}