/**
 * Learner Screen M2: Learning Activity Host (§9, Phase 6 Step 2)
 *
 * Renders ONE activity at a time from a renderer-safe ActivitySpecification
 * (no answerKey ever reaches this screen). Supports:
 *  - choose mode: sentence_mc / sound_detect option cards
 *  - build mode: word_build letter tiles, syllable_split chunks
 *  - audio presentation: speak/replay via the Web Speech TTS service with
 *    graceful fallback (TTS is an accessibility modality, never required)
 *  - the help panel ("I don't understand")
 *
 * Feedback mirrors the screening task screen: gentle green highlight on the
 * correct option, neutral strike-through otherwise, never harsh. Correctness
 * is NEVER decided in this screen — the answer key does not cross IPC — so the
 * learner sees the main-side verdict returned by the submission, and the parent
 * flow (app.js) waits out FEEDBACK_DELAY_MS before advancing to the next plan.
 */

import { AVAILABLE_AVATARS } from '../../../shared/profile-schema.js';
import { WebSpeechTTSService } from '../../../services/audio/tts-service.js';
import { mountHelpPanel } from '../../components/learning/help-panel.js';

/**
 * How long the learner gets to SEE the outcome of what they just answered
 * before the next activity replaces it. Owned here (the screen owns the
 * feedback presentation); app.js awaits exactly this constant before
 * advancing. Same dwell as the screening task screen.
 */
export const FEEDBACK_DELAY_MS = 1500;

/**
 * Kid-safe feedback copy. Never a score, a streak, or a percentage — and never
 * any AI/model wording (the child UI is asserted free of it in e2e).
 */
const FEEDBACK_COPY = Object.freeze({
  success: 'That is it! 🌟',
  help_success: 'That is it! 🌟',
  incorrect: 'Not quite — that is okay, we keep going 💙',
  timeout: 'Time is up — that is okay, we keep going 💙'
});

/**
 * @param {HTMLElement} container
 * @param {object} options
 * @param {object} options.profile learner profile
 * @param {object} options.plan renderer-safe ActivitySpecification
 * @param {number} options.completedCount activities completed this session
 * @param {Function} options.onSubmit (payload) => Promise<{isCorrect, outcome}|undefined> —
 *   resolves with the MAIN-side verdict once main has accepted the submission,
 *   or undefined when the submission was rejected
 * @param {Function} options.onTimeoutSubmit (payload) => Promise<{isCorrect, outcome}|undefined>
 * @param {Function} [options.onAdvance] (verdict) => void — called once the
 *   verdict is on screen, so the parent flow can wait out FEEDBACK_DELAY_MS
 *   and then render the next plan
 * @param {Function} [options.onEvent] (eventType, payload) => void — companion events
 */
export function renderLearningActivityScreen(container, {
  profile,
  plan,
  completedCount,
  goalActivities = 8,
  onSubmit,
  onTimeoutSubmit,
  onAdvance,
  onEvent
}) {
  const avatar = AVAILABLE_AVATARS.find(a => a.id === profile?.avatar) || { emoji: '🌟', label: 'Star' };
  const progressPct = Math.min(100, Math.round((completedCount / Math.max(1, goalActivities)) * 100));
  const mode = plan.mode === 'build' ? 'build' : 'choose';
  const presentation = plan.presentation || { mode: 'text', replayEnabled: false };

  // ALWAYS create TTS service — speak the visible question text
  const tts = new WebSpeechTTSService({ rate: presentation.ttsRate ?? 0.85 });
  const audioPrompt = presentation.audioPrompt || plan.content?.audioPrompt || plan.prompt || plan.content?.prompt || '';

  const audioSignals = {
    audioUsed: false,
    replayCount: 0,
    answeredAfterFirstListen: false,
    answeredAfterReplay: false,
    textAndAudio: false,
    helpRequestedAfterAudio: false
  };

  const startedAt = Date.now();
  let answered = false;
  let helpOpen = false;
  let explanationUses = 0;
  let hintUses = 0;
  let placedTiles = [];
  // Help kinds actually opened, reported to main. Main keeps its own ledger and
  // takes the higher count, so this is a floor, not the source of truth.
  const helpKindsUsed = [];
  // Observable interaction signals (behavioral, never diagnostic):
  // how long before the first interaction, how many options were inspected
  // before committing, and how many build pieces were picked up and put back.
  let firstInteractionMs = null;
  let optionInspects = 0;
  let tilePlacements = 0;
  let tileRemovals = 0;

  function markInteraction() {
    if (firstInteractionMs === null) firstInteractionMs = Date.now() - startedAt;
  }
  let timerInterval = null;

  const timeLimitMs = plan.timeLimitMs ?? 60000;

  /* ── markup ── */

  const supportRow = `
    <div class="activity-support-row">
      <button type="button" class="audio-btn" id="audio-btn" aria-label="Read this aloud">🔊 Listen</button>
      <button type="button" class="audio-btn" id="replay-btn" aria-label="Read again">🔁 Again</button>
      <button type="button" class="help-trigger" id="help-trigger-btn">I don't understand 💙</button>
    </div>
  `;

  const contentHtml = mode === 'choose'
    ? renderChooseContent(plan)
    : renderBuildContent(plan);

  container.innerHTML = `
    <div class="learner-container screen-enter" style="justify-content: flex-start; padding-top: var(--space-xl);">
      <div class="quest-progress">
        <div class="quest-progress-track">
          <div class="quest-progress-fill" style="width: ${progressPct}%;"></div>
        </div>
        <div class="quest-progress-label progress-pop">
          <span>Activity ${completedCount + 1}</span>
          <span>${progressPct}% done</span>
        </div>
      </div>

      <div class="learner-card task-card-enter" style="margin-top: var(--space-md);">
        <span class="task-category-badge">${escapeHtml(plan.title || 'Practice')}</span>

        <div class="task-prompt" id="activity-prompt">${escapeHtml(plan.prompt || plan.content?.prompt || '')}</div>

        ${contentHtml}

        <div class="activity-feedback" id="activity-feedback" role="status" aria-live="polite"></div>

        ${supportRow}

        <div class="quest-timer" id="quest-timer">
          <span>⏱️</span>
          <span id="timer-display">${formatTime(timeLimitMs)}</span>
        </div>
      </div>
    </div>
  `;

  const timerDisplay = container.querySelector('#timer-display');
  const optionGrid = container.querySelector('#option-grid');
  const tilePool = container.querySelector('#tile-pool');
  const buildTray = container.querySelector('#build-tray');

  /* ── timer (gentle, non-punitive) ── */

  timerInterval = setInterval(() => {
    const remaining = Math.max(0, timeLimitMs - (Date.now() - startedAt));
    if (timerDisplay) timerDisplay.textContent = formatTime(remaining);
    if (remaining <= 0 && !answered) {
      clearInterval(timerInterval);
      finishTimedOut();
    }
  }, 250);

  /* ── audio presentation ── */

  // Determine what text to speak: use audioPrompt, or fall back to visible prompt text
  const textToSpeak = audioPrompt || plan.prompt || plan.content?.prompt || '';

  async function speak(isReplay) {
    if (!tts || !textToSpeak) return;
    const btn = container.querySelector(isReplay ? '#replay-btn' : '#audio-btn');
    if (btn) {
      btn.disabled = true;
      btn.classList.add('is-speaking');
    }

    try {
      const res = await tts.speak(textToSpeak, { rate: presentation.ttsRate ?? 0.85 });
      if (res?.ok) {
        audioSignals.audioUsed = true;
        if (isReplay) {
          audioSignals.replayCount += 1;
          audioSignals.answeredAfterReplay = true;
          audioSignals.answeredAfterFirstListen = false;
        } else {
          audioSignals.answeredAfterFirstListen = true;
          audioSignals.answeredAfterReplay = false;
        }
        audioSignals.textAndAudio = true;
      }
    } catch (err) {
      console.error('Speech synthesis error:', err);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('is-speaking');
      }
    }
  }

  const audioBtn = container.querySelector('#audio-btn');
  const replayBtn = container.querySelector('#replay-btn');
  if (audioBtn) audioBtn.addEventListener('click', () => speak(false));
  if (replayBtn) replayBtn.addEventListener('click', () => speak(true));

  // Auto-speak when audio leads presentation, or if textToSpeak is available
  if (tts && textToSpeak) {
    if (presentation.mode === 'audio') {
      setTimeout(() => speak(false), 350);
    }
  }

  /* ── help panel ── */

  container.querySelector('#help-trigger-btn').addEventListener('click', () => {
    if (helpOpen || answered) return;
    helpOpen = true;
    // Two observable moments: the child asked for help, then the companion is
    // working on an explanation. `hint_requested` is the only event mapped to
    // the thinking state, so it is emitted here rather than never at all.
    emitEvent('help_requested', {});
    emitEvent('hint_requested', {});
    mountHelpPanel(container, {
      activityId: plan.activityId,
      learnerId: profile?.learnerId || null,
      sessionId: plan.sessionId || null,
      onHelpShown: ({ kind } = {}) => {
        explanationUses += 1;
        if (kind) helpKindsUsed.push(kind);
        if (audioSignals.audioUsed) audioSignals.helpRequestedAfterAudio = true;
      },
      onClose: () => {
        helpOpen = false;
      }
    });
  });

  /* ── choose mode interaction ── */

  if (mode === 'choose' && optionGrid) {
    optionGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.option-btn');
      if (!btn || answered) return;
      const selection = btn.getAttribute('data-option');
      optionInspects += 1;
      markInteraction();
      finishWithSelection(selection, btn);
    });

    // Focus/hover inspections are observable behavior too (rereading before
    // answering), but they are counted only — they never block the commit.
    optionGrid.addEventListener('focusin', (e) => {
      if (e.target.closest('.option-btn') && !answered) optionInspects += 1;
    });
  }

  /* ── build mode interaction ── */

  if (mode === 'build' && tilePool && buildTray) {
    tilePool.addEventListener('click', (e) => {
      const chip = e.target.closest('.tile-chip');
      if (!chip || answered || chip.classList.contains('is-placed')) return;
      const piece = chip.getAttribute('data-piece');
      placedTiles.push(piece);
      tilePlacements += 1;
      markInteraction();
      chip.classList.add('is-placed');
      renderTray();
      // No companion event here: placing a tile is already captured as the
      // `tilePlacements` behavior signal, and it previously emitted a
      // `piece_placed` event that was not in COMPANION_EVENTS and was silently
      // rejected by the main process on every single placement.
    });

    buildTray.addEventListener('click', (e) => {
      const chip = e.target.closest('.tile-chip');
      if (!chip || answered) return;
      const index = Number(chip.getAttribute('data-index'));
      if (Number.isNaN(index)) return;
      const [piece] = placedTiles.splice(index, 1);
      placedTiles = placedTiles.filter((p, i) => !(i === index));
      tileRemovals += 1;
      if (piece) {
        const poolChip = [...tilePool.querySelectorAll('.tile-chip')]
          .find((c) => c.getAttribute('data-piece') === piece && c.classList.contains('is-placed'));
        poolChip?.classList.remove('is-placed');
      }
      renderTray();
    });

    const checkBtn = container.querySelector('#build-submit-btn');
    checkBtn?.addEventListener('click', () => {
      if (answered || placedTiles.length === 0) return;
      finishWithSelection(placedTiles.join('-'), null);
    });
  }

  function renderTray() {
    if (!buildTray) return;
    buildTray.innerHTML = placedTiles.length === 0
      ? '<span style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">Tap the pieces below in order…</span>'
      : placedTiles
          .map((piece, i) => `<span class="tile-chip" data-index="${i}">${escapeHtml(piece)}</span>`)
          .join('');
    const checkBtn = container.querySelector('#build-submit-btn');
    if (checkBtn) checkBtn.disabled = placedTiles.length === 0;
  }

  /* ── finishing ── */

  /**
   * Freeze the activity: the learner has committed, so nothing else is
   * accepted while main judges the submission and the feedback is shown.
   */
  function lockActivity() {
    answered = true;
    clearInterval(timerInterval);
    tts?.cancel();
    container
      .querySelectorAll('.option-btn, .tile-chip, #build-submit-btn')
      .forEach((el) => { el.disabled = true; });
  }

  /**
   * Show the outcome of what the learner just did.
   *
   * Correctness comes ONLY from the main-side verdict: `answerKey` never
   * crosses IPC (it is stripped in toRendererSpec), so this screen has no
   * way to know the answer and never guesses it. That also means a WRONG
   * answer is never "revealed" — only the learner's own choice is marked,
   * which keeps the ground truth in main exactly as the tamper model
   * requires.
   *
   * @param {{isCorrect?: boolean, outcome?: string}} verdict main's result
   * @param {HTMLElement|null} selectedBtn the option the learner tapped
   */
  function showFeedback(verdict, selectedBtn) {
    const outcome = verdict?.outcome || (verdict?.isCorrect ? 'success' : 'incorrect');
    const isCorrect = verdict?.isCorrect === true;

    if (mode === 'choose') {
      optionGrid?.querySelectorAll('.option-btn').forEach((btn) => {
        if (btn === selectedBtn) btn.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');
        else btn.classList.add('is-muted');
      });
    } else if (buildTray) {
      buildTray.querySelectorAll('.tile-chip').forEach((chip) => {
        chip.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');
      });
    }

    const feedbackEl = container.querySelector('#activity-feedback');
    if (feedbackEl) {
      feedbackEl.textContent = FEEDBACK_COPY[outcome] || FEEDBACK_COPY.incorrect;
      feedbackEl.classList.add('is-visible');
    }
  }

  /**
   * Commit an answer: lock, submit, then let MAIN's verdict drive the
   * feedback before the parent flow is told it may advance. Never throws and
   * never rejects — a rejected submission simply resolves undefined, and the
   * activity stays exactly where it is (existing non-blocking behaviour).
   *
   * @returns {Promise<{isCorrect?: boolean, outcome?: string}|undefined>}
   */
  async function commit({ payload, submit, selectedBtn }) {
    try {
      const verdict = await submit(payload);
      if (!verdict) return undefined;
      showFeedback(verdict, selectedBtn);
      if (onAdvance) onAdvance(verdict);
      return verdict;
    } catch (err) {
      console.error('Activity submit failed:', err);
      return undefined;
    }
  }

  function finishWithSelection(selection, selectedBtn) {
    if (answered) return undefined;
    lockActivity();

    const payload = {
      activityId: plan.activityId,
      selection,
      attempts: 1,
      hintsUsed: hintUses + explanationUses,
      explanationsUsed: [...new Set(helpKindsUsed)],
      responseTimeMs: Date.now() - startedAt,
      audioSignals: { ...audioSignals },
      ...behaviorSignals()
    };

    // The companion's answer reaction is emitted once, by app.js, from the
    // SAME main-side verdict that paints this feedback — never before it is
    // known, and never from a locally guessed result.
    return commit({ payload, submit: onSubmit, selectedBtn });
  }

  function finishTimedOut() {
    if (answered) return undefined;
    lockActivity();

    const payload = {
      activityId: plan.activityId,
      selection: '',
      timedOut: true,
      attempts: 1,
      hintsUsed: hintUses + explanationUses,
      explanationsUsed: [...new Set(helpKindsUsed)],
      responseTimeMs: timeLimitMs,
      audioSignals: { ...audioSignals },
      ...behaviorSignals()
    };

    return commit({ payload, submit: onTimeoutSubmit, selectedBtn: null });
  }

  /**
   * Observable-behavior signals for this attempt. Plain counts and one timing,
   * nothing else: no reading-quality judgment, no diagnosis, no severity, no
   * free text. Main validates and clamps every field.
   */
  function behaviorSignals() {
    return {
      behavior: {
        firstInteractionMs: firstInteractionMs ?? -1,
        optionInspects,
        tilePlacements,
        tileRemovals,
        replayCount: audioSignals.replayCount,
        helpOpens: helpKindsUsed.length
      }
    };
  }

  function emitEvent(eventType, extra = {}) {
    try {
      if (!onEvent) return;
      onEvent(eventType, { activityId: plan.activityId, ...extra });
    } catch (err) {
      // Companion is observational — never disturb the activity.
      console.error('Companion event failed (non-fatal):', err);
    }
  }

  void avatar;
}

/* ───────────────────────── content renderers ───────────────────────── */

function renderChooseContent(plan) {
  const options = Array.isArray(plan.content?.options) ? plan.content.options : [];
  const visualCue = plan.content?.visualCue;
  const buttons = options.map((opt, i) => `
    <button type="button" class="option-btn option-enter" data-option="${escapeHtml(opt)}" style="animation-delay: ${i * 0.06}s;">
      ${visualCue ? `<span style="margin-right: 8px;">${escapeHtml(visualCue)}</span>` : ''}${escapeHtml(opt)}
    </button>
  `).join('');
  return `<div class="option-grid" id="option-grid">${buttons}</div>`;
}

function renderBuildContent(plan) {
  const pieces = Array.isArray(plan.content?.tiles) ? plan.content.tiles : Array.isArray(plan.content?.syllables) ? plan.content.syllables : [];
  const chips = pieces.map((piece, i) => `
    <button type="button" class="tile-chip" data-piece="${escapeHtml(piece)}" style="animation-delay: ${i * 0.05}s;">
      ${escapeHtml(piece)}
    </button>
  `).join('');
  return `
    <div class="build-tray" id="build-tray">
      <span style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">Tap the pieces below in order…</span>
    </div>
    <div class="tile-pool" id="tile-pool">${chips}</div>
    <div class="learner-button-row" style="margin-top: var(--space-md);">
      <button type="button" class="learner-btn-primary" id="build-submit-btn" disabled>Check My Answer ✅</button>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${seconds}s`;
}
