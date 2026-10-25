/**
 * Companion sticker catalog — original lightweight SVG decorations.
 * Companion IDs match profile.avatar / AVAILABLE_AVATARS:
 *   racing-car | dinosaur | ocean-friends
 * Falls back to neutral educational decorations when no companion is set.
 */

import { companionCharacterSvg } from '../companion/companion-art.js';

export const COMPANION_IDS = Object.freeze(['racing-car', 'dinosaur', 'ocean-friends']);

/** @typedef {'home'|'selection'|'question'|'celebrate'|'progress'} StickerPlacement */

/**
 * Resolve which sticker set to use from a saved profile avatar.
 * @param {string|null|undefined} companionId
 * @returns {'racing-car'|'dinosaur'|'ocean-friends'|'neutral'}
 */
export function resolveStickerSetId(companionId) {
  if (companionId && COMPANION_IDS.includes(companionId)) return companionId;
  return 'neutral';
}

function svg(body, viewBox = '0 0 64 64') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%" aria-hidden="true" focusable="false">${body}</svg>`;
}

/* ── Racing Car set ──────────────────────────────────────────────── */

const RACING = {
  car: {
    id: 'racing-car',
    label: 'Racing car',
    svg: companionCharacterSvg('racing-car')
  },
  flag: {
    id: 'racing-flag',
    label: 'Checkered flag',
    svg: svg(`
      <rect x="12" y="10" width="3" height="44" rx="1.5" fill="#4A5568"/>
      <g>
        <rect x="15" y="12" width="10" height="8" fill="#1A202C"/>
        <rect x="25" y="12" width="10" height="8" fill="#FFF"/>
        <rect x="35" y="12" width="10" height="8" fill="#1A202C"/>
        <rect x="15" y="20" width="10" height="8" fill="#FFF"/>
        <rect x="25" y="20" width="10" height="8" fill="#1A202C"/>
        <rect x="35" y="20" width="10" height="8" fill="#FFF"/>
        <rect x="15" y="28" width="10" height="8" fill="#1A202C"/>
        <rect x="25" y="28" width="10" height="8" fill="#FFF"/>
        <rect x="35" y="28" width="10" height="8" fill="#1A202C"/>
      </g>
    `)
  },
  helmet: {
    id: 'racing-helmet',
    label: 'Racing helmet',
    svg: svg(`
      <ellipse cx="32" cy="36" rx="18" ry="16" fill="#E94560"/>
      <path d="M14 36c0-12 8-20 18-20s18 8 18 20" fill="#FF6B8A"/>
      <path d="M16 38h32c0 4-4 8-8 10H24c-4-2-8-6-8-10z" fill="#1A202C"/>
      <rect x="18" y="34" width="28" height="6" rx="3" fill="#2D3748"/>
      <rect x="20" y="35" width="24" height="4" rx="2" fill="#90CDF4" opacity=".85"/>
      <circle cx="40" cy="24" r="3" fill="#F6E05E"/>
    `)
  },
  tire: {
    id: 'racing-tire',
    label: 'Tire',
    svg: svg(`
      <circle cx="32" cy="32" r="20" fill="#1A202C"/>
      <circle cx="32" cy="32" r="12" fill="#4A5568"/>
      <circle cx="32" cy="32" r="5" fill="#CBD5E0"/>
      <path d="M32 14v6M32 44v6M14 32h6M44 32h6M20 20l4 4M40 40l4 4M20 44l4-4M40 24l4-4" stroke="#2D3748" stroke-width="2"/>
    `)
  },
  speed: {
    id: 'racing-speed',
    label: 'Speed trails',
    svg: svg(`
      <path d="M8 20h28" stroke="#E94560" stroke-width="4" stroke-linecap="round" opacity=".9"/>
      <path d="M14 32h34" stroke="#FF6B8A" stroke-width="4" stroke-linecap="round" opacity=".75"/>
      <path d="M10 44h24" stroke="#F6E05E" stroke-width="4" stroke-linecap="round" opacity=".85"/>
      <path d="M42 18l10 4-10 4" fill="#E94560"/>
      <path d="M50 30l10 4-10 4" fill="#FF6B8A"/>
    `)
  },
  trophy: {
    id: 'racing-trophy',
    label: 'Trophy',
    svg: svg(`
      <path d="M22 14h20v12c0 8-6 14-10 14s-10-6-10-14V14z" fill="#F6E05E"/>
      <path d="M22 18c-6 0-8 6-6 10 2 3 6 2 6 2" fill="none" stroke="#ECC94B" stroke-width="3"/>
      <path d="M42 18c6 0 8 6 6 10-2 3-6 2-6 2" fill="none" stroke="#ECC94B" stroke-width="3"/>
      <rect x="28" y="40" width="8" height="6" fill="#D69E2E"/>
      <rect x="22" y="46" width="20" height="6" rx="2" fill="#B7791F"/>
      <circle cx="32" cy="24" r="4" fill="#FFF" opacity=".5"/>
    `)
  },
  star: {
    id: 'racing-star',
    label: 'Star',
    svg: svg(`
      <path d="M32 8l5.5 14.5L52 24l-12 9.5L43.5 52 32 43l-11.5 9 3.5-18.5L12 24l14.5-1.5L32 8z" fill="#F6E05E" stroke="#ECC94B" stroke-width="1.5"/>
    `)
  }
};

/* ── Dinosaur set ────────────────────────────────────────────────── */

const DINO = {
  dino: {
    id: 'dino-friend',
    label: 'Friendly dinosaur',
    svg: companionCharacterSvg('dinosaur')
  },
  footprint: {
    id: 'dino-footprint',
    label: 'Dinosaur footprint',
    svg: svg(`
      <ellipse cx="32" cy="40" rx="14" ry="12" fill="#5A7D3D" opacity=".85"/>
      <ellipse cx="18" cy="22" rx="6" ry="9" fill="#5A7D3D" transform="rotate(-20 18 22)"/>
      <ellipse cx="32" cy="16" rx="6" ry="9" fill="#5A7D3D"/>
      <ellipse cx="46" cy="22" rx="6" ry="9" fill="#5A7D3D" transform="rotate(20 46 22)"/>
    `)
  },
  egg: {
    id: 'dino-egg',
    label: 'Dinosaur egg',
    svg: svg(`
      <ellipse cx="32" cy="34" rx="14" ry="20" fill="#FFF8E7"/>
      <ellipse cx="32" cy="34" rx="14" ry="20" fill="none" stroke="#D69E2E" stroke-width="2"/>
      <path d="M24 28c4-2 8 2 12-1M22 38c6-1 10 3 16 0" fill="none" stroke="#ECC94B" stroke-width="2" stroke-linecap="round"/>
      <circle cx="28" cy="22" r="2" fill="#F6E05E"/>
    `)
  },
  fossil: {
    id: 'dino-fossil',
    label: 'Fossil',
    svg: svg(`
      <ellipse cx="32" cy="32" rx="22" ry="20" fill="#D6BCB0"/>
      <path d="M20 32c4-8 20-8 24 0-4 8-20 8-24 0z" fill="none" stroke="#8B5E4B" stroke-width="3"/>
      <circle cx="24" cy="32" r="3" fill="#8B5E4B"/>
      <circle cx="32" cy="28" r="3" fill="#8B5E4B"/>
      <circle cx="40" cy="32" r="3" fill="#8B5E4B"/>
      <circle cx="32" cy="38" r="3" fill="#8B5E4B"/>
    `)
  },
  leaf: {
    id: 'dino-leaf',
    label: 'Leaf',
    svg: svg(`
      <path d="M32 8c16 8 20 28 8 40-12-4-24-20-16-36 2-2 5-3 8-4z" fill="#8BC34A"/>
      <path d="M32 12c0 20-4 32-8 40" fill="none" stroke="#558B2F" stroke-width="2"/>
      <path d="M30 22h10M28 32h12M26 40h10" stroke="#AED581" stroke-width="1.5" stroke-linecap="round"/>
    `)
  },
  volcano: {
    id: 'dino-volcano',
    label: 'Volcano',
    svg: svg(`
      <path d="M12 50L26 22h12l14 28H12z" fill="#8D6E63"/>
      <path d="M26 22c2-6 6-10 6-10s4 4 6 10H26z" fill="#E94560"/>
      <circle cx="30" cy="14" r="3" fill="#FF8A65" opacity=".8"/>
      <circle cx="38" cy="16" r="2.5" fill="#FFCC02" opacity=".8"/>
      <path d="M18 50h28v4H18z" fill="#6D4C41"/>
    `)
  },
  star: {
    id: 'dino-star',
    label: 'Star',
    svg: svg(`
      <path d="M32 8l5.5 14.5L52 24l-12 9.5L43.5 52 32 43l-11.5 9 3.5-18.5L12 24l14.5-1.5L32 8z" fill="#AED581" stroke="#8BC34A" stroke-width="1.5"/>
    `)
  }
};

/* ── Ocean / Octopus set ─────────────────────────────────────────── */

const OCEAN = {
  octopus: {
    id: 'ocean-octopus',
    label: 'Cute octopus',
    svg: companionCharacterSvg('ocean-friends')
  },
  bubble: {
    id: 'ocean-bubble',
    label: 'Bubbles',
    svg: svg(`
      <circle cx="24" cy="40" r="10" fill="#B2EBF2" opacity=".85" stroke="#4DD0E1" stroke-width="2"/>
      <circle cx="20" cy="36" r="3" fill="#FFF" opacity=".7"/>
      <circle cx="42" cy="28" r="7" fill="#B2EBF2" opacity=".8" stroke="#4DD0E1" stroke-width="1.5"/>
      <circle cx="40" cy="25" r="2" fill="#FFF" opacity=".7"/>
      <circle cx="36" cy="14" r="4" fill="#E0F7FA" stroke="#4DD0E1" stroke-width="1"/>
    `)
  },
  shell: {
    id: 'ocean-shell',
    label: 'Seashell',
    svg: svg(`
      <path d="M32 50c-14-4-18-18-10-30 4-6 12-10 10-10s6 4 10 10c8 12 4 26-10 30z" fill="#FFCCBC"/>
      <path d="M32 16v34M24 24c4 6 4 18 0 26M40 24c-4 6-4 18 0 26M28 20c2 8 2 20 0 28M36 20c-2 8-2 20 0 28" fill="none" stroke="#FF8A65" stroke-width="1.5"/>
    `)
  },
  fish: {
    id: 'ocean-fish',
    label: 'Fish',
    svg: svg(`
      <ellipse cx="34" cy="32" rx="16" ry="10" fill="#26C6DA"/>
      <path d="M10 32l12-8v16L10 32z" fill="#00ACC1"/>
      <circle cx="42" cy="30" r="2.5" fill="#1A202C"/>
      <circle cx="43" cy="29" r="1" fill="#FFF"/>
      <path d="M30 24c4-6 10-4 12 0" fill="#4DD0E1"/>
      <path d="M28 40c3 4 8 4 10 0" fill="#4DD0E1"/>
    `)
  },
  coral: {
    id: 'ocean-coral',
    label: 'Coral',
    svg: svg(`
      <path d="M32 54V28" stroke="#EC407A" stroke-width="5" stroke-linecap="round"/>
      <path d="M32 40c-8-8-12-4-12-12M32 36c8-6 12-2 12-10M32 30c-6-8-2-14-2-14M32 28c6-8 2-14 2-14" fill="none" stroke="#F48FB1" stroke-width="4" stroke-linecap="round"/>
      <circle cx="20" cy="28" r="3" fill="#EC407A"/><circle cx="44" cy="26" r="3" fill="#EC407A"/>
      <circle cx="30" cy="16" r="3" fill="#F48FB1"/><circle cx="34" cy="14" r="3" fill="#F48FB1"/>
    `)
  },
  starfish: {
    id: 'ocean-starfish',
    label: 'Starfish',
    svg: svg(`
      <path d="M32 10l5 14h15l-12 9 5 15-13-9-13 9 5-15-12-9h15z" fill="#FF8A65"/>
      <circle cx="32" cy="30" r="5" fill="#FFCCBC"/>
    `)
  },
  treasure: {
    id: 'ocean-treasure',
    label: 'Treasure',
    svg: svg(`
      <rect x="14" y="28" width="36" height="22" rx="3" fill="#D69E2E"/>
      <rect x="14" y="28" width="36" height="8" fill="#F6E05E"/>
      <rect x="30" y="34" width="4" height="10" fill="#B7791F"/>
      <circle cx="32" cy="40" r="4" fill="#ECC94B" stroke="#B7791F" stroke-width="1.5"/>
      <circle cx="22" cy="22" r="3" fill="#F6E05E"/><circle cx="42" cy="20" r="2.5" fill="#90CDF4"/>
      <circle cx="32" cy="18" r="2" fill="#FC8181"/>
    `)
  }
};

/* ── Neutral educational set ─────────────────────────────────────── */

const NEUTRAL = {
  book: {
    id: 'neutral-book',
    label: 'Book',
    svg: svg(`
      <path d="M12 16h18c2 0 4 2 4 4v28c0-2-2-3-4-3H12V16z" fill="#90CDF4"/>
      <path d="M52 16H34c-2 0-4 2-4 4v28c0-2 2-3 4-3h18V16z" fill="#63B3ED"/>
      <path d="M32 20v28" stroke="#2B6CB0" stroke-width="2"/>
      <path d="M16 24h10M16 30h10M16 36h8M38 24h10M38 30h10M38 36h8" stroke="#FFF" stroke-width="2" stroke-linecap="round" opacity=".7"/>
    `)
  },
  pencil: {
    id: 'neutral-pencil',
    label: 'Pencil',
    svg: svg(`
      <path d="M18 46L40 14l8 6L26 52z" fill="#F6E05E"/>
      <path d="M40 14l4-6 8 6-4 6z" fill="#FC8181"/>
      <path d="M18 46l-4 8 8-4z" fill="#2D3748"/>
      <path d="M22 44l24-32" stroke="#ECC94B" stroke-width="2"/>
      <rect x="42" y="16" width="8" height="6" transform="rotate(36 46 19)" fill="#48BB78"/>
    `)
  },
  abc: {
    id: 'neutral-abc',
    label: 'ABC blocks',
    svg: svg(`
      <rect x="8" y="28" width="20" height="20" rx="3" fill="#FC8181"/>
      <text x="18" y="43" text-anchor="middle" font-size="14" font-weight="700" fill="#FFF" font-family="Lexend,sans-serif">A</text>
      <rect x="24" y="16" width="20" height="20" rx="3" fill="#63B3ED"/>
      <text x="34" y="31" text-anchor="middle" font-size="14" font-weight="700" fill="#FFF" font-family="Lexend,sans-serif">B</text>
      <rect x="36" y="32" width="20" height="20" rx="3" fill="#68D391"/>
      <text x="46" y="47" text-anchor="middle" font-size="14" font-weight="700" fill="#FFF" font-family="Lexend,sans-serif">C</text>
    `)
  },
  star: {
    id: 'neutral-star',
    label: 'Star',
    svg: svg(`
      <path d="M32 8l5.5 14.5L52 24l-12 9.5L43.5 52 32 43l-11.5 9 3.5-18.5L12 24l14.5-1.5L32 8z" fill="#F6AD55" stroke="#DD6B20" stroke-width="1.5"/>
    `)
  },
  sparkle: {
    id: 'neutral-sparkle',
    label: 'Sparkle',
    svg: svg(`
      <path d="M32 6v16M32 42v16M6 32h16M42 32h16M14 14l10 10M40 40l10 10M50 14L40 24M24 40L14 50" stroke="#F6AD55" stroke-width="3" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="5" fill="#FEEBC8"/>
    `)
  },
  badge: {
    id: 'neutral-badge',
    label: 'Badge',
    svg: svg(`
      <circle cx="32" cy="28" r="16" fill="#F6E05E" stroke="#D69E2E" stroke-width="3"/>
      <path d="M22 40l4 16 6-8 6 8 4-16" fill="#FC8181"/>
      <path d="M32 18l2.5 6H41l-5 4 2 6-6-4-6 4 2-6-5-4h6.5z" fill="#FFF"/>
    `)
  }
};

export const STICKER_SETS = Object.freeze({
  'racing-car': Object.freeze(RACING),
  dinosaur: Object.freeze(DINO),
  'ocean-friends': Object.freeze(OCEAN),
  neutral: Object.freeze(NEUTRAL)
});

/**
 * Placement layouts: which stickers appear and where (CSS position keys).
 * Kept sparse so screens stay readable.
 */
export const PLACEMENT_LAYOUTS = Object.freeze({
  home: Object.freeze([
    { key: 'scatter', slot: 'top-left', size: 'lg', animate: 'float' },
    { key: 'secondary', slot: 'top-right', size: 'md', animate: 'float-delay' },
    { key: 'accent', slot: 'bottom-left', size: 'md', animate: 'bob' },
    { key: 'sparkle', slot: 'bottom-right', size: 'sm', animate: 'twinkle' }
  ]),
  selection: Object.freeze([
    { key: 'accent', slot: 'heading-right', size: 'sm', animate: 'none' },
    { key: 'sparkle', slot: 'heading-left', size: 'sm', animate: 'none' },
    { key: 'secondary', slot: 'card-corner', size: 'sm', animate: 'none' }
  ]),
  question: Object.freeze([
    { key: 'cornerA', slot: 'corner-tl', size: 'xs', animate: 'none' },
    { key: 'cornerB', slot: 'corner-br', size: 'xs', animate: 'none' }
  ]),
  celebrate: Object.freeze([
    { key: 'hero', slot: 'celebrate-center', size: 'xl', animate: 'pop' },
    { key: 'sparkle', slot: 'celebrate-left', size: 'md', animate: 'burst' },
    { key: 'accent', slot: 'celebrate-right', size: 'md', animate: 'burst-delay' }
  ]),
  progress: Object.freeze([
    { key: 'badge', slot: 'milestone', size: 'md', animate: 'bob' },
    { key: 'sparkle', slot: 'milestone-side', size: 'sm', animate: 'twinkle' }
  ]),
  // Scrapbook: companion stickers scattered naturally around the edges of a
  // screen, varied sizes and rotations, center column left clear for content.
  scrapbook: Object.freeze([
    { key: 'scatter',   slot: 'sb-1', size: 'lg', animate: 'drift',        rot: -8 },
    { key: 'secondary', slot: 'sb-2', size: 'md', animate: 'drift-delay',  rot: 6 },
    { key: 'accent',    slot: 'sb-3', size: 'md', animate: 'drift',        rot: -4 },
    { key: 'sparkle',   slot: 'sb-4', size: 'sm', animate: 'twinkle',      rot: 12 },
    { key: 'cornerA',   slot: 'sb-5', size: 'md', animate: 'drift-delay',  rot: -10 },
    { key: 'cornerB',   slot: 'sb-6', size: 'sm', animate: 'drift',        rot: 7 },
    { key: 'badge',     slot: 'sb-7', size: 'md', animate: 'drift-delay',  rot: 5 },
    { key: 'sparkle',   slot: 'sb-8', size: 'xs', animate: 'twinkle',      rot: -14 },
    { key: 'secondary', slot: 'sb-9', size: 'xs', animate: 'drift',        rot: 10 },
    { key: 'accent',    slot: 'sb-10', size: 'sm', animate: 'drift-delay', rot: -6 }
  ])
});

/** Maps logical sticker roles → catalog keys per set */
const ROLE_MAP = Object.freeze({
  'racing-car': {
    primary: 'car', secondary: 'flag', accent: 'trophy', sparkle: 'star',
    cornerA: 'speed', cornerB: 'tire', hero: 'trophy', badge: 'trophy',
    // Edge-scatter decoration: never the companion character itself, which is
    // already present on every screen as the live companion widget.
    scatter: 'helmet'
  },
  dinosaur: {
    primary: 'dino', secondary: 'egg', accent: 'leaf', sparkle: 'star',
    cornerA: 'footprint', cornerB: 'fossil', hero: 'dino', badge: 'volcano',
    scatter: 'volcano'
  },
  'ocean-friends': {
    primary: 'octopus', secondary: 'fish', accent: 'shell', sparkle: 'bubble',
    cornerA: 'starfish', cornerB: 'coral', hero: 'treasure', badge: 'treasure',
    scatter: 'coral'
  },
  neutral: {
    primary: 'book', secondary: 'abc', accent: 'pencil', sparkle: 'sparkle',
    cornerA: 'star', cornerB: 'sparkle', hero: 'badge', badge: 'badge',
    scatter: 'book'
  }
});

/**
 * @param {string|null|undefined} companionId
 * @param {StickerPlacement} placement
 * @returns {Array<{id:string,label:string,svg:string,slot:string,size:string,animate:string}>}
 */
export function getStickersForPlacement(companionId, placement) {
  const setId = resolveStickerSetId(companionId);
  const set = STICKER_SETS[setId];
  const roles = ROLE_MAP[setId];
  const layout = PLACEMENT_LAYOUTS[placement] || PLACEMENT_LAYOUTS.home;

  return layout.map((item) => {
    const catalogKey = roles[item.key] || roles.sparkle;
    const sticker = set[catalogKey] || Object.values(set)[0];
    return {
      id: sticker.id,
      label: sticker.label,
      svg: sticker.svg,
      slot: item.slot,
      size: item.size,
      animate: item.animate,
      rot: item.rot ?? 0
    };
  });
}

/**
 * Single celebratory sticker for correct-answer feedback.
 * @param {string|null|undefined} companionId
 */
export function getCelebrationSticker(companionId) {
  const setId = resolveStickerSetId(companionId);
  const set = STICKER_SETS[setId];
  const key = ROLE_MAP[setId].hero;
  return set[key] || set.star || Object.values(set)[0];
}
