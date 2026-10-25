/**
 * Help Panel (§10) — "I don't understand" flow, extended with the bounded
 * visual-explanation layer ("Imagine It" / "Show me").
 *
 * Renders the help options and requests the deterministic explanation via
 * the LEARNING_GET_HELP bridge. "Show me 👀" is the VISUAL imagination
 * action: when the bridge returns a VALIDATED visual spec, the panel
 * transitions straight into the trusted-primitive visual scene (no extra
 * toggle step) — a tiny interactive learning world with replay/step controls
 * and a text alternative always available (the visual is never the only way
 * to understand). Other kinds keep the text experience with an optional
 * "Imagine It" toggle. A subtle back control returns from the scene to the
 * other help options without redesigning the modal.
 * Visual interactions emit semantic learning signals via
 * LEARNING_VISUAL_SIGNAL; they are record-only and never feed ALE arithmetic.
 *
 * Help is free, non-penalized, and dismissible; the panel never blocks the
 * activity and never reveals the answer.
 */

import { mountVisualExplanation } from './visual-explanation.js';
import { helpOptionIcon } from './help-icons.js';

const HELP_OPTIONS = Object.freeze([
  { kind: 'show_me', label: 'Show me', caption: 'See it move in a little scene' },
  { kind: 'tell_me', label: 'Tell me', caption: 'Hear it said out loud' },
  { kind: 'break_it_down', label: 'Break it down', caption: 'One small step at a time' },
  { kind: 'give_example', label: 'Give me an example', caption: 'A word just like it' },
  { kind: 'make_simpler', label: 'Make it simpler', caption: 'Smaller and easier' },
  { kind: 'funny_example', label: 'Funny example', caption: 'Silly and memorable' },
  { kind: 'real_life_example', label: 'Real-life example', caption: 'Somewhere you can see it' }
]);

const HELP_KIND_LABELS = Object.freeze(
  HELP_OPTIONS.reduce((acc, o) => { acc[o.kind] = o.label; return acc; }, {})
);

const VISUAL_KIND_LABELS = Object.freeze({
  break_it_down: 'Imagine It step by step ✨',
  give_example: 'Imagine a real example ✨',
  real_life_example: 'Imagine a real example ✨'
});

/**
 * Mount the help panel overlay inside `container`.
 * @param {HTMLElement} container host element (usually #app)
 * @param {object} options
 * @param {string} options.activityId live activity id
 * @param {string|null} [options.learnerId] active learner (for visual signals)
 * @param {string|null} [options.sessionId] live session (for visual signals)
 * @param {Function} options.onHelpShown ({ kind }) — record explanation usage
 * @param {Function} options.onClose
 * @returns {{ dispose: () => void }}
 */
export function mountHelpPanel(container, { activityId, learnerId = null, sessionId = null, onHelpShown, onClose }) {
  const overlay = document.createElement('div');
  overlay.className = 'help-overlay';
  overlay.innerHTML = `
    <div class="help-panel" role="dialog" aria-modal="true" aria-label="Help options">
      <h2 class="help-panel-title">How can we look at this together?</h2>
      <div class="help-options">
        ${HELP_OPTIONS
          .map((o) => `
            <button type="button" class="help-option-btn" data-kind="${o.kind}" aria-label="${o.label} — ${o.caption}">
              <span class="help-option-icon">${helpOptionIcon(o.kind)}</span>
              <span class="help-option-text">
                <span class="help-option-label">${o.label}</span>
                <span class="help-option-caption">${o.caption}</span>
              </span>
              <span class="help-option-thinking" aria-hidden="true"><i></i><i></i><i></i></span>
            </button>`)
          .join('')}
      </div>
      <div class="help-content is-empty" id="help-content">
        Pick a way to look at it — help is always free here. 💙
      </div>
      <button type="button" class="help-close-btn" id="help-close-btn">Back to the activity</button>
    </div>
  `;
  container.appendChild(overlay);

  const panelEl = overlay.querySelector('.help-panel');
  const contentEl = overlay.querySelector('#help-content');
  let closed = false;
  let visualHandle = null;

  function close() {
    if (closed) return;
    closed = true;
    dispose();
    if (onClose) onClose();
  }

  function clearVisual() {
    if (visualHandle) {
      visualHandle.dispose();
      visualHandle = null;
    }
  }

  /**
   * Mount a validated visual spec and bridge its semantic learning signals
   * (record-only). Shared by the show_me scene and the toggle flow.
   */
  function mountWithSignalBridge(mountPoint, visual) {
    return mountVisualExplanation(mountPoint, visual, {
      onSignal: ({ event, detail }) => {
        // Learning signal only: record-and-forget; failures are silent
        // and never affect help, difficulty, or mastery.
        if (window.electronAPI?.recordVisualSignal) {
          window.electronAPI
            .recordVisualSignal({
              learnerId,
              sessionId,
              visualId: visual.visualId,
              event,
              detail
            })
            .catch(() => { /* non-fatal */ });
        }
      }
    });
  }

  /**
   * "Show me 👀" = the visual imagination action: the panel transitions
   * straight into the visual scene. The deterministic text explanation stays
   * available through the scene's "Read it instead" alternative.
   */
  function renderShowMeScene(help) {
    clearVisual();
    contentEl.classList.add('is-empty');
    contentEl.textContent = '';
    panelEl.classList.add('is-scene');

    const bar = document.createElement('div');
    bar.className = 'help-scene-bar';
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'help-scene-back-btn';
    back.textContent = '‹ Other ways';
    back.setAttribute('aria-label', 'Back to the other help options');
    back.addEventListener('click', () => {
      if (closed) return;
      panelEl.classList.remove('is-scene');
      clearVisual();
      contentEl.classList.add('is-empty');
      contentEl.textContent = 'Pick a way to look at it — help is always free here. 💙';
    });
    const sceneTitle = document.createElement('span');
    sceneTitle.className = 'help-scene-title';
    sceneTitle.textContent = help.visual.title || 'Imagine It ✨';
    bar.appendChild(back);
    bar.appendChild(sceneTitle);
    contentEl.appendChild(bar);

    const mountPoint = document.createElement('div');
    mountPoint.className = 'help-visual-mount help-scene-mount';
    contentEl.appendChild(mountPoint);
    visualHandle = mountWithSignalBridge(mountPoint, help.visual);
  }

  /**
   * Render a validated visual spec for the NON-show_me kinds behind a
   * text/visual toggle. The text explanation stays available — the visual is
   * never the only way to understand.
   */
  function renderToggleVisual(help, kind) {
    clearVisual();

    const wrap = document.createElement('div');
    wrap.className = 'help-visual-wrap';

    const textBlock = document.createElement('p');
    textBlock.className = 'help-visual-text';
    textBlock.textContent = help.content || '';
    wrap.appendChild(textBlock);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'visual-toggle-btn';
    toggle.textContent = VISUAL_KIND_LABELS[kind] || 'Imagine It ✨';
    wrap.appendChild(toggle);

    const mountPoint = document.createElement('div');
    mountPoint.className = 'help-visual-mount';
    wrap.appendChild(mountPoint);

    contentEl.appendChild(wrap);

    let visualOpen = false;
    toggle.addEventListener('click', () => {
      visualOpen = !visualOpen;
      if (visualOpen) {
        if (!visualHandle) {
          visualHandle = mountWithSignalBridge(mountPoint, help.visual);
        }
        mountPoint.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        toggle.textContent = 'Hide the picture';
      } else {
        mountPoint.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = VISUAL_KIND_LABELS[kind] || 'Imagine It ✨';
      }
    });
  }

  overlay.querySelectorAll('.help-option-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const kind = btn.getAttribute('data-kind');
      overlay.querySelectorAll('.help-option-btn').forEach((b) => (b.disabled = true));
      btn.classList.add('is-thinking');

      let help = null;
      try {
        const res = await window.electronAPI.getLearningHelp({ activityId, kind });
        if (res?.success) {
          help = res.help || null;
        }
      } catch (err) {
        console.error('Help request failed (non-fatal):', err);
      }

      if (closed) return;
      btn.classList.remove('is-thinking');
      overlay.querySelectorAll('.help-option-btn').forEach((b) => {
        b.disabled = false;
      });

      clearVisual();
      contentEl.classList.remove('is-empty');
      contentEl.textContent = '';

      const hasAnswer = !!(help && (help.visual?.visualId || help.content));
      if (hasAnswer) {
        const head = document.createElement('div');
        head.className = 'help-content-head';
        head.innerHTML = `${helpOptionIcon(kind)}<span>${HELP_KIND_LABELS[kind]}</span>`;
        contentEl.appendChild(head);
      }

      if (hasAnswer && help.visual && help.visual.visualId && kind === 'show_me') {
        renderShowMeScene(help);
      } else if (help) {
        if (help.visual && help.visual.visualId) {
          renderToggleVisual(help, kind);
        } else if (help.content) {
          const p = document.createElement('p');
          p.className = 'help-content-text';
          p.textContent = help.content;
          contentEl.appendChild(p);
        }
        if (onHelpShown) onHelpShown({ kind });
      } else {
        const p = document.createElement('p');
        p.className = 'help-content-text';
        p.textContent = 'Let us try a different way together — pick another option.';
        contentEl.appendChild(p);
      }
    });
  });

  overlay.querySelector('#help-close-btn').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  function dispose() {
    clearVisual();
    overlay.remove();
  }

  return { dispose };
}
