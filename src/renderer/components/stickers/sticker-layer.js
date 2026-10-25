/**
 * Reusable companion sticker decorations.
 * Mounts a pointer-events-none layer so stickers never block UI controls.
 * Uses profile.avatar (via companionId) — no second companion system.
 */

import {
  getStickersForPlacement,
  getCelebrationSticker,
  resolveStickerSetId
} from './sticker-catalog.js';

const LAYER_ATTR = 'data-sticker-layer';
const CELEBRATE_ATTR = 'data-sticker-celebrate';

/**
 * Mount decorative stickers into a screen root (or a relative host).
 * Safe to call repeatedly — replaces any existing layer in the host.
 *
 * @param {HTMLElement} host - typically the screen's outer .learner-container
 * @param {{ companionId?: string|null, placement?: string, className?: string }} opts
 * @returns {HTMLElement|null} the layer element
 */
export function mountStickerDecorations(host, opts = {}) {
  if (!host) return null;

  const companionId = opts.companionId ?? null;
  const placement = opts.placement || 'home';
  const setId = resolveStickerSetId(companionId);
  const stickers = getStickersForPlacement(companionId, placement);

  // Ensure host can position absolutely-placed stickers
  const computed = window.getComputedStyle?.(host);
  if (computed && computed.position === 'static') {
    host.style.position = 'relative';
  }

  host.querySelectorAll(`[${LAYER_ATTR}]`).forEach((el) => el.remove());

  const layer = document.createElement('div');
  layer.setAttribute(LAYER_ATTR, placement);
  layer.setAttribute('data-sticker-set', setId);
  layer.className = `sticker-layer sticker-layer--${placement}${opts.className ? ` ${opts.className}` : ''}`;
  layer.setAttribute('aria-hidden', 'true');

  layer.innerHTML = stickers.map((s) => `
    <div class="sticker sticker--${s.size} sticker-slot--${s.slot} sticker-anim--${s.animate}"
         data-sticker-id="${s.id}" style="--sticker-rot: ${s.rot || 0}deg;" title="">
      ${s.svg}
    </div>
  `).join('');

  // Insert as first child so content/paint order stays above via z-index CSS
  host.insertBefore(layer, host.firstChild);
  return layer;
}

/**
 * Brief celebratory sticker for correct-answer feedback.
 * Appends next to a feedback host, auto-removes after animation.
 *
 * @param {HTMLElement} host
 * @param {{ companionId?: string|null, durationMs?: number }} opts
 */
export function showCelebrationSticker(host, opts = {}) {
  if (!host) return null;

  const companionId = opts.companionId ?? null;
  const durationMs = opts.durationMs ?? 1800;
  const sticker = getCelebrationSticker(companionId);

  host.querySelectorAll(`[${CELEBRATE_ATTR}]`).forEach((el) => el.remove());

  const el = document.createElement('div');
  el.setAttribute(CELEBRATE_ATTR, 'true');
  el.setAttribute('data-sticker-set', resolveStickerSetId(companionId));
  el.className = 'sticker-celebrate';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="sticker sticker--lg sticker-anim--pop">
      ${sticker.svg}
    </div>
  `;

  // Prefer placing inside feedback row without covering text
  const computed = window.getComputedStyle?.(host);
  if (computed && computed.position === 'static') {
    host.style.position = 'relative';
  }
  host.appendChild(el);

  window.setTimeout(() => {
    el.classList.add('is-leaving');
    window.setTimeout(() => el.remove(), 280);
  }, durationMs);

  return el;
}

/**
 * Convenience: resolve companion id from a profile object.
 * @param {{ avatar?: string }|null|undefined} profile
 */
export function companionIdFromProfile(profile) {
  return profile?.avatar || null;
}
