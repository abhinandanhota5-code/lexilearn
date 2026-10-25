import { mountCompanionBubble } from './companion-bubble.js';
import { companionCharacterArt, COMPANION_ART_IDS } from './companion-art.js';

/**
 * Companion Widget — interactive learning companion (not a decorative avatar).
 *
 * Renders the learner's chosen avatar with a bounded per-state animation and a
 * curated, auto-dismissing speech bubble. All behavior decisions live in the
 * main-process CompanionService; this widget only reflects pushed snapshots.
 *
 * The widget is stateless by design: it re-reads the latest snapshot on mount,
 * then follows COMPANION_STATE_CHANGED pushes. Re-mounting is cheap and safe.
 */

const STATE_ANIMATION_CLASSES = {
  idle: 'companion-idle',
  listening: 'companion-listening',
  thinking: 'companion-thinking',
  encouraging: 'companion-encouraging',
  celebrating: 'companion-celebrating',
  helping: 'companion-helping'
};

/**
 * Mount the companion widget into a host element.
 * @param {HTMLElement} host Container element.
 * @param {object} [options]
 * @param {'docked'|'hero'} [options.variant] 'docked' = small corner companion,
 *   'hero' = large inline companion.
 * @returns {{ snapshot: () => object|null, dispose: () => void }}
 */
export function mountCompanionWidget(host, options = {}) {
  const variant = options.variant === 'hero' ? 'hero' : 'docked';

  // One widget per host: screens and the app router both mount into
  // #companion-hero-host — a second mount would double the character.
  if (host.__companionWidget) {
    return host.__companionWidget;
  }

  // Exactly one companion on screen: any previous widget (dock or hero,
  // including stale hosts left by My Day or the mission screen) is disposed.
  document.querySelectorAll('.companion-widget-host').forEach((el) => {
    if (el === host) return;
    try { el.__companionWidget?.dispose(); } catch { /* already gone */ }
    el.remove();
  });
  document.querySelectorAll('#companion-dock-host').forEach((el) => {
    if (el !== host && !el.isConnected) el.remove();
  });

  host.classList.add('companion-widget-host');
  host.classList.add(`companion-widget-${variant}`);

  const root = document.createElement('div');
  root.className = 'companion-widget';
  host.appendChild(root);

  const avatarEl = document.createElement('div');
  avatarEl.className = 'companion-avatar';
  root.appendChild(avatarEl);

  const bubble = mountCompanionBubble(root);

  let currentSeq = -1;
  let latestSnapshot = null;
  let disposed = false;
  let _lastAnimClass = null;

  const removeListener = window.electronAPI?.onCompanionStateChanged
    ? window.electronAPI.onCompanionStateChanged((snapshot) => {
        if (disposed) return;
        applySnapshot(snapshot);
      })
    : () => {};

  async function loadInitial() {
    try {
      if (!window.electronAPI?.getCompanionSnapshot) return;
      const snapshot = await window.electronAPI.getCompanionSnapshot();
      if (disposed) return;
      if (snapshot) applySnapshot(snapshot, /* force */ true);
    } catch (err) {
      console.error('Companion widget: failed to load initial snapshot:', err);
    }
  }

  function applySnapshot(snapshot, force = false) {
    if (!snapshot) return;
    // Ignore stale/out-of-order pushes.
    if (!force && currentSeq >= snapshot.seq) return;
    latestSnapshot = snapshot;
    currentSeq = snapshot.seq;

    const emoji = snapshot.avatar?.emoji || '🌟';
    const animType = snapshot.avatar?.animationType || 'dinosaur';
    const companionId = snapshot.avatar?.id;
    const art = COMPANION_ART_IDS.includes(companionId) ? companionCharacterArt(companionId) : '';
    if (art) {
      avatarEl.innerHTML = art;
    } else {
      avatarEl.textContent = emoji;
    }

    // Update the companion type class for theme-specific animations
    avatarEl.classList.remove('racing-car', 'dinosaur', 'ocean-friends');
    avatarEl.classList.add(animType);

    const animClass = STATE_ANIMATION_CLASSES[snapshot.state] || 'companion-idle';
    // Only remove the previous state animation class — never remove the base
    // companion-entity or companion-avatar layout classes.
    if (_lastAnimClass && _lastAnimClass !== animClass) {
      avatarEl.classList.remove(_lastAnimClass);
    }
    avatarEl.classList.add('companion-entity', animClass);
    _lastAnimClass = animClass;

    bubble.update(snapshot.message || null);
  }

  loadInitial();

  const handle = {
    snapshot: () => latestSnapshot,
    dispose() {
      disposed = true;
      removeListener();
      bubble.dispose();
      root.remove();
      host.classList.remove('companion-widget-host');
      host.classList.remove(`companion-widget-${variant}`);
      if (host.__companionWidget === handle) delete host.__companionWidget;
    }
  };
  host.__companionWidget = handle;
  return handle;
}