import { COMPANION_CONFIG } from '../../../services/companion/companion-config.js';

/**
 * Companion Bubble — non-blocking speech bubble for the companion widget.
 * Auto-dismisses, is tappable to dismiss, and never intercepts pointer events
 * on the activity itself. Announcements use aria-live polite for screen readers.
 */

const MESSAGE_DISPLAY_MS = COMPANION_CONFIG.limits.MESSAGE_DISPLAY_MS;
const FADE_TRANSITION_MS = 200;

/**
 * Create a bubble instance bound to a parent element.
 * @param {HTMLElement} host The element the bubble renders inside.
 * @returns {{ update: (message: string|null) => void, dispose: () => void }}
 */
export function mountCompanionBubble(host) {
  const bubble = document.createElement('div');
  bubble.className = 'companion-bubble';
  bubble.setAttribute('role', 'status');
  bubble.setAttribute('aria-live', 'polite');
  bubble.hidden = true;
  host.appendChild(bubble);

  const dismissBtn = document.createElement('button');
  dismissBtn.type = 'button';
  dismissBtn.className = 'companion-bubble-dismiss';
  dismissBtn.setAttribute('aria-label', 'Dismiss message');
  dismissBtn.textContent = '✕';
  bubble.appendChild(dismissBtn);

  const text = document.createElement('span');
  text.className = 'companion-bubble-text';
  bubble.appendChild(text);

  let hideTimer = null;
  let hideScheduledAt = 0;
  let currentMessage = null;

  function clearTimers() {
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    hideScheduledAt = 0;
  }

  function show(message) {
    clearTimers();
    currentMessage = message;
    text.textContent = message;
    bubble.hidden = false;
    // Force reflow so the fade-in transition plays on message changes.
    void bubble.offsetWidth;
    bubble.classList.add('is-visible');
    hideScheduledAt = Date.now() + MESSAGE_DISPLAY_MS;
    hideTimer = setTimeout(() => hide(), MESSAGE_DISPLAY_MS);
  }

  function hide() {
    clearTimers();
    bubble.classList.remove('is-visible');
    setTimeout(() => {
      if (hideScheduledAt === 0) bubble.hidden = true;
    }, FADE_TRANSITION_MS);
  }

  function update(message) {
    if (message) {
      show(message);
    } else {
      currentMessage = null;
      hide();
    }
  }

  dismissBtn.addEventListener('click', () => hide());

  // Never block interaction with the activity content.
  bubble.addEventListener('pointerdown', () => hide());

  return {
    get currentMessage() {
      return currentMessage;
    },
    update,
    dispose() {
      clearTimers();
      dismissBtn.removeEventListener('click', hide);
      bubble.remove();
    }
  };
}