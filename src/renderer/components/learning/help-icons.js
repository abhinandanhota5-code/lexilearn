/**
 * Help option illustrations — original inline SVG art for the help panel,
 * in the same friendly style as companion-art.js. Each icon is a 48×48
 * scene that shows WHAT the option does, so a child can pick by picture.
 */

function svg(inner) {
  return `<svg class="help-icon" viewBox="0 0 48 48" width="44" height="44" role="img" aria-hidden="true" focusable="false">${inner}</svg>`;
}

/* Show me — an eye seeing a sparkle */
function showMe() {
  return svg(`
    <ellipse cx="24" cy="26" rx="16" ry="11" fill="#FFF" stroke="#4A5568" stroke-width="2.5"/>
    <circle cx="24" cy="26" r="6.5" fill="#63B3ED"/>
    <circle cx="24" cy="26" r="3" fill="#1A202C"/>
    <circle cx="26" cy="24" r="1.3" fill="#FFF"/>
    <path d="M10 17c3-4 8-6 14-6s11 2 14 6" fill="none" stroke="#4A5568" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M40 33l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="#F6E05E"/>
  `);
}

/* Tell me — a talking bubble with sound waves */
function tellMe() {
  return svg(`
    <path d="M8 12a5 5 0 015-5h14a5 5 0 015 5v10a5 5 0 01-5 5h-8l-8 6v-6h-1a5 5 0 01-2-15z" fill="#BEE3F8" stroke="#3182CE" stroke-width="2.5"/>
    <path d="M15 16h10M15 21h7" stroke="#2B6CB0" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M37 15a8 8 0 010 14M41 11a13 13 0 010 22" fill="none" stroke="#3182CE" stroke-width="2.5" stroke-linecap="round"/>
  `);
}

/* Break it down — a puzzle piece splitting into steps */
function breakItDown() {
  return svg(`
    <path d="M10 10h10a3 3 0 016 0h12v10a3 3 0 010 6v12H26a3 3 0 00-6 0H10V28a3 3 0 000-6z" fill="none"/>
    <rect x="9" y="9" width="13" height="13" rx="3" fill="#9F7AEA"/>
    <rect x="26" y="9" width="13" height="13" rx="3" fill="#B794F4"/>
    <rect x="9" y="26" width="13" height="13" rx="3" fill="#D6BCFA"/>
    <rect x="26" y="26" width="13" height="13" rx="3" fill="#9F7AEA" opacity=".55"/>
    <path d="M23 15h2M23 32h2" stroke="#553C9A" stroke-width="2" stroke-linecap="round"/>
  `);
}

/* Give me an example — a bright idea bulb */
function giveExample() {
  return svg(`
    <circle cx="24" cy="20" r="12" fill="#FEFCBF" stroke="#D69E2E" stroke-width="2.5"/>
    <path d="M19 30h10M20 34h8M22 38h4" stroke="#B7791F" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M24 13v9M20 16l4 4 4-4" fill="none" stroke="#D69E2E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M40 8l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM7 26l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="#F6E05E"/>
  `);
}

/* Make it simpler — a light feather */
function makeSimpler() {
  return svg(`
    <path d="M36 8C22 10 13 20 11 34l-2 7 7-2c14-2 24-11 26-25z" fill="#C6F6D5" stroke="#38A169" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M12 38C18 26 26 17 36 10" fill="none" stroke="#38A169" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M20 26l6-2M24 19l6-2M16 33l6-2" stroke="#68D391" stroke-width="2" stroke-linecap="round"/>
  `);
}

/* Funny example — a big grinning face */
function funnyExample() {
  return svg(`
    <circle cx="24" cy="24" r="16" fill="#FBD38D" stroke="#DD6B20" stroke-width="2.5"/>
    <path d="M15 19q3-4 6 0M27 19q3-4 6 0" fill="none" stroke="#7B341E" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M14 27q10 10 20 0" fill="#7B341E" stroke="#7B341E" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M14 27q10 4 20 0" fill="#FFF" stroke="none"/>
    <circle cx="12" cy="27" r="3" fill="#F6AD55" opacity=".8"/>
    <circle cx="36" cy="27" r="3" fill="#F6AD55" opacity=".8"/>
  `);
}

/* Real-life example — the world */
function realLifeExample() {
  return svg(`
    <circle cx="24" cy="24" r="16" fill="#BEE3F8" stroke="#3182CE" stroke-width="2.5"/>
    <path d="M12 18c4-2 6 2 10 0s4-6 8-4c1 1 2 3 1 5-3 5-9 3-13 6s-6 8-9 6c-2-4-1-11 3-13z" fill="#9AE6B4"/>
    <path d="M31 28c3-1 6 1 6 4s-3 6-6 5c-2-3-2-7 0-9z" fill="#9AE6B4"/>
    <path d="M8 24h32M24 8c-6 5-6 27 0 32M24 8c6 5 6 27 0 32" fill="none" stroke="#3182CE" stroke-width="1.4" opacity=".5"/>
  `);
}

const ICONS = {
  show_me: showMe,
  tell_me: tellMe,
  break_it_down: breakItDown,
  give_example: giveExample,
  make_simpler: makeSimpler,
  funny_example: funnyExample,
  real_life_example: realLifeExample
};

/**
 * @param {string} kind help option kind
 * @returns {string} inline SVG markup ('' for unknown kinds)
 */
export function helpOptionIcon(kind) {
  const draw = ICONS[kind];
  return draw ? draw() : '';
}
