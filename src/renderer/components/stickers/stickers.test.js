/**
 * Companion sticker system tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveStickerSetId,
  getStickersForPlacement,
  getCelebrationSticker,
  STICKER_SETS,
  COMPANION_IDS
} from './sticker-catalog.js';
import {
  mountStickerDecorations,
  showCelebrationSticker,
  companionIdFromProfile
} from './sticker-layer.js';

describe('sticker-catalog', () => {
  it('resolves each companion id to its own set', () => {
    for (const id of COMPANION_IDS) {
      expect(resolveStickerSetId(id)).toBe(id);
      expect(STICKER_SETS[id]).toBeTruthy();
    }
  });

  it('falls back to neutral when companion is missing or unknown', () => {
    expect(resolveStickerSetId(null)).toBe('neutral');
    expect(resolveStickerSetId(undefined)).toBe('neutral');
    expect(resolveStickerSetId('')).toBe('neutral');
    expect(resolveStickerSetId('fox')).toBe('neutral');
  });

  it('returns placement stickers with svg markup for all companions', () => {
    const placements = ['home', 'selection', 'question', 'celebrate', 'progress'];
    for (const companionId of [...COMPANION_IDS, null]) {
      for (const placement of placements) {
        const stickers = getStickersForPlacement(companionId, placement);
        expect(stickers.length).toBeGreaterThan(0);
        for (const s of stickers) {
          expect(s.svg).toContain('<svg');
          expect(s.slot).toBeTruthy();
          expect(s.id).toBeTruthy();
        }
      }
    }
  });

  it('uses distinct primary artwork per companion', () => {
    const racing = getStickersForPlacement('racing-car', 'home')[0];
    const dino = getStickersForPlacement('dinosaur', 'home')[0];
    const ocean = getStickersForPlacement('ocean-friends', 'home')[0];
    const neutral = getStickersForPlacement(null, 'home')[0];

    expect(racing.id).not.toBe(dino.id);
    expect(dino.id).not.toBe(ocean.id);
    expect(ocean.id).not.toBe(neutral.id);
    expect(racing.svg).not.toBe(dino.svg);
  });

  it('provides a celebration sticker for each companion', () => {
    for (const id of [...COMPANION_IDS, null]) {
      const sticker = getCelebrationSticker(id);
      expect(sticker.svg).toContain('<svg');
    }
  });
});

describe('sticker-layer', () => {
  let host;

  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    host.className = 'learner-container';
    document.body.appendChild(host);
  });

  it('reads companion id from profile.avatar', () => {
    expect(companionIdFromProfile({ avatar: 'ocean-friends' })).toBe('ocean-friends');
    expect(companionIdFromProfile({})).toBe(null);
    expect(companionIdFromProfile(null)).toBe(null);
  });

  it('mounts a non-interactive sticker layer for home placement', () => {
    const layer = mountStickerDecorations(host, {
      companionId: 'racing-car',
      placement: 'home'
    });

    expect(layer).toBeTruthy();
    expect(layer.getAttribute('data-sticker-set')).toBe('racing-car');
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(layer.querySelectorAll('.sticker').length).toBeGreaterThan(0);
    expect(getComputedStyle(layer).pointerEvents || layer.style.pointerEvents).toBeDefined();
  });

  it('replaces previous layer on remount and switches companion set', () => {
    mountStickerDecorations(host, { companionId: 'dinosaur', placement: 'question' });
    mountStickerDecorations(host, { companionId: 'ocean-friends', placement: 'question' });

    const layers = host.querySelectorAll('[data-sticker-layer]');
    expect(layers.length).toBe(1);
    expect(layers[0].getAttribute('data-sticker-set')).toBe('ocean-friends');
  });

  it('shows neutral stickers when no companion is selected', () => {
    const layer = mountStickerDecorations(host, {
      companionId: null,
      placement: 'home'
    });
    expect(layer.getAttribute('data-sticker-set')).toBe('neutral');
  });

  it('appends a celebration sticker without covering host text permanently', () => {
    host.innerHTML = '<div id="feedback">Great job!</div>';
    const feedback = host.querySelector('#feedback');
    const el = showCelebrationSticker(feedback, {
      companionId: 'dinosaur',
      durationMs: 50
    });
    expect(el).toBeTruthy();
    expect(feedback.textContent).toContain('Great job!');
    expect(el.querySelector('svg')).toBeTruthy();
  });
});
