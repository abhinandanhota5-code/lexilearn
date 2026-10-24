/**
 * Companion System — Service Facade
 *
 * The single entry point for activities and the app shell. Emits semantic
 * events into the bus, lets the bounded state machine decide the next state,
 * resolves a curated behavior, and notifies subscribers with a full snapshot.
 *
 * Phase 5: 100% deterministic, no LLM. Curated pools only.
 */

import { COMPANION_CONFIG } from './companion-config.js';
import { CompanionEventBus } from './companion-event-bus.js';
import { CompanionStateMachine } from './companion-state-machine.js';
import { createBehaviorBuilder } from './companion-behaviors.js';

export class CompanionService {
  /**
   * @param {object} [options]
   * @param {object} [options.config] Companion config (defaults to COMPANION_CONFIG).
   * @param {CompanionEventBus} [options.eventBus]
   * @param {CompanionStateMachine} [options.stateMachine]
   * @param {object} [options.builder] Behavior builder ({ buildBehavior }) from companion-behaviors
   */
  constructor(options = {}) {
    this.config = options.config || COMPANION_CONFIG;
    this.eventBus = options.eventBus || new CompanionEventBus();
    this.builder = options.builder || createBehaviorBuilder({ config: this.config });

    /** @type {Set<Function>} */
    this._subscribers = new Set();
    this._seq = 0;
    this._learnerContext = null;
    this._activityContext = null;
    this._counterByPool = new Map();
    this._lastSnapshot = null;
    /** Timestamp of the last SPOKEN message, for the throttle. */
    this._lastMessageAt = -Infinity;
    /** Injectable clock; defaults to Date.now so tests stay deterministic. */
    this._nowFn = options.now || null;

    // The state machine notifies the service only on timer-driven
    // auto-transitions; manual transitions are handled in _handleEvent so the
    // service controls exactly when subscribers are notified. Assignment
    // works with both default and injected machines (onTransition is a public
    // reassignable hook on the machine).
    this.stateMachine = options.stateMachine || new CompanionStateMachine({
      config: this.config,
      onTransition: () => this._syncFromMachine()
    });
    this.stateMachine.onTransition = () => this._syncFromMachine();

    // Bus → state machine wiring: activities publish; the machine consumes.
    for (const eventType of Object.keys(this.config.eventStateMap)) {
      this.eventBus.subscribe(eventType, (payload) => this._handleEvent(eventType, payload));
    }
  }

  /**
   * Bind the companion to the active learner. Returns the initial snapshot
   * (idle + curated welcome greeting) — the widget renders this on mount.
   * @param {object} ctx { learnerId, firstName, avatar: { id, label, emoji } }
   * @returns {object} snapshot
   */
  activate(ctx) {
    const avatar = ctx?.avatar || { id: null, label: '', emoji: '🌟' };
    this._learnerContext = {
      learnerId: ctx?.learnerId || 'anonymous',
      firstName: ctx?.firstName || 'friend',
      avatar
    };
    this._activityContext = null;

    this.stateMachine.reset();
    const behavior = this.builder.buildBehavior({
      state: this.stateMachine.state,
      event: null,
      learnerId: this._learnerContext.learnerId,
      firstName: this._learnerContext.firstName,
      label: avatar.label || '',
      seqCounter: this._nextCounter('welcome'),
      welcome: true
    });

    this._lastSnapshot = this._compose(behavior, null);
    return this._notify(this._lastSnapshot);
  }

  /**
   * Emit a semantic activity event. Deterministic, non-blocking.
   * Routes through the event bus so any other subscriber can observe it.
   * @param {string} eventType A configured companion event.
   * @param {object} [payload] { kind, taskId?, taskIndex?, totalTasks?, ... }
   * @returns {object} resulting snapshot
   */
  emitEvent(eventType, payload = {}) {
    if (!this.config.eventStateMap[eventType]) {
      console.warn(`CompanionService: ignoring unknown event "${eventType}".`);
      return this._lastSnapshot;
    }
    if (!this._learnerContext) {
      console.warn(`CompanionService: ignoring "${eventType}" — service not activated.`);
      return this._lastSnapshot;
    }
    this.eventBus.emit(eventType, payload);
    return this._lastSnapshot;
  }

  /** Latest snapshot without side effects. */
  getSnapshot() {
    return this._lastSnapshot;
  }

  /**
   * Subscribe to every snapshot change. Returns an unsubscribe function.
   * @param {(snapshot: object) => void} callback
   */
  onStateChanged(callback) {
    if (typeof callback !== 'function') {
      throw new Error('CompanionService: callback must be a function.');
    }
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  /** Whether the service has been bound to a learner yet. */
  get isActivated() {
    return this._learnerContext !== null;
  }

  dispose() {
    this._subscribers.clear();
    this.eventBus.clear();
    if (this.stateMachine && typeof this.stateMachine.dispose === 'function') {
      this.stateMachine.dispose();
    }
    this._lastSnapshot = null;
    this._learnerContext = null;
    this._activityContext = null;
  }

  _handleEvent(eventType, payload) {
    this._captureActivityContext(eventType, payload);
    this.stateMachine.transition(eventType);
    this._syncFromMachine();
  }

  /**
   * Rebuild the snapshot from the current machine state and notify.
   * Used for manual events and timer-driven auto-transitions alike.
   */
  _syncFromMachine() {
    if (!this._learnerContext) return;
    const machine = this.stateMachine;
    const behavior = this.builder.buildBehavior({
      state: machine.state,
      event: machine.lastEvent,
      learnerId: this._learnerContext.learnerId,
      firstName: this._learnerContext.firstName,
      label: this._learnerContext.avatar.label || '',
      seqCounter: this._nextCounter(`${machine.lastEvent}.${machine.state}`)
    });
    // Message throttle (MIN_DELAY_BETWEEN_MESSAGES_MS). Rapid learning events
    // (tile placement, repeated clicks) would otherwise stack speech bubbles.
    // The STATE still transitions and is still pushed — only the spoken line is
    // suppressed, so the companion never appears frozen or unresponsive.
    const minGap = Number(this.config.behaviorLimits?.MIN_DELAY_BETWEEN_MESSAGES_MS) || 0;
    const now = this._now();
    if (behavior.message && minGap > 0 && now - this._lastMessageAt < minGap) {
      behavior.message = null;
    } else if (behavior.message) {
      this._lastMessageAt = now;
    }
    this._lastSnapshot = this._compose(behavior, machine);
    this._notify(this._lastSnapshot);
  }

  /**
   * Monotonic clock source. Injectable so the throttle stays testable and the
   * service never reaches for a global directly.
   * @returns {number}
   */
  _now() {
    if (typeof this._nowFn === 'function') return this._nowFn();
    return Date.now();
  }

  /**
   * Capture minimal, safe activity context for the snapshot. Deliberately
   * excludes answer content and performance fields — it must never carry
   * scoring data to the UI.
   */
  _captureActivityContext(eventType, payload = {}) {
    if (eventType === this.config.events.ACTIVITY_COMPLETED) {
      this._activityContext = null;
      return;
    }
    if (!this.config.eventStateMap[eventType]) return;
    this._activityContext = {
      kind: payload.kind || 'screening',
      ...(payload.taskId ? { taskId: payload.taskId } : {}),
      ...(Number.isInteger(payload.taskIndex) ? { taskIndex: payload.taskIndex } : {}),
      ...(Number.isInteger(payload.totalTasks) ? { totalTasks: payload.totalTasks } : {})
    };
  }

  _compose(behavior, machine) {
    const ctx = this._learnerContext || { learnerId: 'anonymous', firstName: 'friend', avatar: { id: null, label: '', emoji: '🌟' } };
    return {
      seq: this._seq++,
      state: behavior.state,
      event: behavior.event,
      message: behavior.message,
      expiresAt: machine ? machine.expiresAt : null,
      avatar: ctx.avatar,
      learner: { firstName: ctx.firstName },
      activity: this._activityContext
    };
  }

  _nextCounter(key) {
    const next = (this._counterByPool.get(key) || 0) + 1;
    this._counterByPool.set(key, next);
    return next;
  }

  _notify(snapshot) {
    for (const callback of [...this._subscribers]) {
      try {
        callback(snapshot);
      } catch (err) {
        console.error('CompanionService: subscriber error:', err);
      }
    }
    return snapshot;
  }
}