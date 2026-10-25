/**
 * Companion character art — original, animated SVG illustrations.
 * Companion IDs match profile.avatar: racing-car | dinosaur | ocean-friends.
 * Artwork is local-first (inline SVG + scoped CSS), respects reduced motion.
 */

const ART_STYLES = `
.ca-stage { display: block; width: 100%; height: 100%; overflow: visible; }
.ca-bob { animation: ca-bob 3.4s ease-in-out infinite; }
.ca-sway { transform-origin: 60px 104px; animation: ca-sway 4.2s ease-in-out infinite; }
.ca-breathe { transform-origin: 60px 60px; animation: ca-breathe 3.6s ease-in-out infinite; }
.ca-eyes { transform-origin: 60px 48px; animation: ca-blink 4.6s ease-in-out infinite; }
.ca-wheel { transform-box: fill-box; transform-origin: center; animation: ca-spin 2.6s linear infinite; }
.ca-tail { transform-origin: 84px 74px; animation: ca-tail 2.8s ease-in-out infinite; }
.ca-fish { animation: ca-swim 5.2s ease-in-out infinite; }
.ca-bubble { transform-box: fill-box; animation: ca-rise 4.5s ease-in-out infinite; opacity: 0; }
.ca-bubble--2 { animation-delay: 1.5s; }
.ca-bubble--3 { animation-delay: 3s; }
.ca-glow { transform-box: fill-box; transform-origin: center; animation: ca-glow 3.4s ease-in-out infinite; }

@keyframes ca-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes ca-sway { 0%, 100% { transform: rotate(-1.6deg); } 50% { transform: rotate(1.6deg); } }
@keyframes ca-breathe { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.018); } }
@keyframes ca-blink { 0%, 88%, 100% { transform: scaleY(1); } 92%, 96% { transform: scaleY(0.08); } }
@keyframes ca-spin { to { transform: rotate(360deg); } }
@keyframes ca-tail { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(7deg); } }
@keyframes ca-swim { 0%, 100% { transform: translate(0, 0); } 30% { transform: translate(10px, -5px); } 65% { transform: translate(-6px, 4px); } }
@keyframes ca-rise { 0% { transform: translateY(6px); opacity: 0; } 18% { opacity: .75; } 82% { opacity: .35; } 100% { transform: translateY(-34px); opacity: 0; } }
@keyframes ca-glow { 0%, 100% { opacity: .55; transform: scale(1); } 50% { opacity: .85; transform: scale(1.06); } }

@media (prefers-reduced-motion: reduce) {
  .ca-bob, .ca-sway, .ca-breathe, .ca-eyes, .ca-wheel, .ca-tail, .ca-fish, .ca-bubble, .ca-glow {
    animation: none !important;
  }
  .ca-bubble { opacity: .4; }
}
`;

let stylesInjected = false;
function ensureStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  if (document.getElementById('companion-art-styles')) { stylesInjected = true; return; }
  const style = document.createElement('style');
  style.id = 'companion-art-styles';
  style.textContent = ART_STYLES;
  document.head.appendChild(style);
  stylesInjected = true;
}

function stage(inner) {
  return `<svg class="ca-stage" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-hidden="true" focusable="false">${inner}</svg>`;
}

/* Turbo — the racing car: windshield eyes, friendly smile, spinning wheels */
function racingCar() {
  return stage(`
    <ellipse cx="60" cy="101" rx="40" ry="6" fill="#000" opacity=".14"/>
    <path d="M14 84h10l3-11h-9c-3 0-5 2-5 5v2z" fill="#F6E05E"/>
    <g class="ca-bob">
      <g class="ca-sway">
        <path d="M18 86c1-16 10-24 22-27l7-15c2-4 5-6 9-6h14c5 0 9 3 11 8l5 13c11 3 18 9 19 20 0 4-3 7-7 7H25c-4 0-7-3-7-7z" fill="url(#ca-car-body)"/>
        <path d="M48 60l6-13c1-3 3-4 6-4h12c4 0 6 2 8 6l5 12c-14-6-26-6-37-1z" fill="#BEE3F8" opacity=".55"/>
        <path d="M24 78c8-4 60-4 70 0" stroke="#FF6B8A" stroke-width="3" stroke-linecap="round" fill="none" opacity=".8"/>
        <rect x="52" y="64" width="16" height="9" rx="4.5" fill="#FFF" opacity=".9"/>
        <circle class="ca-glow" cx="24" cy="80" r="4" fill="#FFF9C4"/>
        <g class="ca-eyes">
          <ellipse cx="53" cy="50" rx="6.5" ry="8.5" fill="#FFF"/>
          <ellipse cx="71" cy="50" rx="6.5" ry="8.5" fill="#FFF"/>
          <circle cx="54.5" cy="51.5" r="3.4" fill="#1A202C"/>
          <circle cx="69.5" cy="51.5" r="3.4" fill="#1A202C"/>
          <circle cx="55.8" cy="50" r="1.2" fill="#FFF"/>
          <circle cx="70.8" cy="50" r="1.2" fill="#FFF"/>
        </g>
        <path d="M52 59c4 3.5 12 3.5 16 0" stroke="#7A1E2C" stroke-width="2.6" stroke-linecap="round" fill="none"/>
        <circle cx="46" cy="57" r="2.6" fill="#FF6B8A" opacity=".65"/>
        <circle cx="78" cy="57" r="2.6" fill="#FF6B8A" opacity=".65"/>
      </g>
    </g>
    <g class="ca-wheel">
      <circle cx="38" cy="90" r="13" fill="#1A202C"/>
      <circle cx="38" cy="90" r="6" fill="#CBD5E0"/>
      <path d="M38 84v12M32 90h12" stroke="#4A5568" stroke-width="2"/>
    </g>
    <g class="ca-wheel">
      <circle cx="84" cy="90" r="13" fill="#1A202C"/>
      <circle cx="84" cy="90" r="6" fill="#CBD5E0"/>
      <path d="M84 84v12M78 90h12" stroke="#4A5568" stroke-width="2"/>
    </g>
    <defs>
      <linearGradient id="ca-car-body" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#FF6B8A"/>
        <stop offset="1" stop-color="#D9294C"/>
      </linearGradient>
    </defs>
  `);
}

/* pico — the dinosaur: round proportions, big blinky eyes, warm smile */
function dinosaur() {
  return stage(`
    <ellipse cx="58" cy="103" rx="38" ry="6" fill="#000" opacity=".12"/>
    <g class="ca-bob">
      <g class="ca-sway">
        <path class="ca-tail" d="M86 78c12-2 20-8 24-16 2 12-6 22-22 24z" fill="#6FB03E"/>
        <path d="M30 96c-6 0-9-4-9-9 0-20 10-34 26-40 4-14 14-22 26-22 14 0 24 10 24 24 0 6-2 11-5 15 6 6 9 15 9 24 0 5-3 8-8 8z" fill="url(#ca-dino-body)"/>
        <path d="M44 96c-4-16 0-30 12-38 10 6 15 18 15 38z" fill="#F4FBE9"/>
        <path d="M40 40l-3-10 9 5zM52 31l-1-11 8 7zM66 25l2-10 6 9z" fill="#FFB74D"/>
        <path d="M36 60c-8 2-13 8-13 15 6 2 12-1 15-6z" fill="#6FB03E"/>
        <circle cx="33" cy="76" r="3.4" fill="#558B2F"/>
        <g class="ca-eyes">
          <ellipse cx="62" cy="40" rx="7.5" ry="9.5" fill="#FFF"/>
          <ellipse cx="80" cy="40" rx="7.5" ry="9.5" fill="#FFF"/>
          <circle cx="63.5" cy="41.5" r="3.8" fill="#1B3A12"/>
          <circle cx="78.5" cy="41.5" r="3.8" fill="#1B3A12"/>
          <circle cx="65" cy="39.6" r="1.4" fill="#FFF"/>
          <circle cx="80" cy="39.6" r="1.4" fill="#FFF"/>
        </g>
        <path d="M62 52c5 4 14 4 19-1" stroke="#33691E" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <circle cx="55" cy="49" r="3" fill="#A5D6A7" opacity=".8"/>
        <circle cx="87" cy="49" r="3" fill="#A5D6A7" opacity=".8"/>
        <ellipse cx="71" cy="30" rx="10" ry="4" fill="#FFF" opacity=".22"/>
      </g>
    </g>
    <ellipse cx="47" cy="98" rx="8" ry="4.5" fill="#558B2F"/>
    <ellipse cx="70" cy="99" rx="8" ry="4.5" fill="#558B2F"/>
    <defs>
      <linearGradient id="ca-dino-body" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0" stop-color="#9CCC65"/>
        <stop offset="1" stop-color="#67A83B"/>
      </linearGradient>
    </defs>
  `);
}

/* ink & friends — the octopus with coral, a little fish, and rising bubbles */
function oceanFriends() {
  return stage(`
    <ellipse cx="60" cy="105" rx="42" ry="6" fill="#000" opacity=".12"/>
    <path d="M20 104c-2-12 2-20 8-26-1 10 1 18 4 26z" fill="#26A69A" opacity=".8"/>
    <path d="M32 104c0-9 4-15 10-19-2 7-2 13-1 19z" fill="#4DB6AC" opacity=".75"/>
    <path d="M96 104c3-10 1-18-4-25 0 9-2 16-5 25z" fill="#26A69A" opacity=".7"/>
    <g class="ca-fish">
      <path d="M92 66c6-4 12-4 16 0-4 4-10 4-16 0z" fill="#FFB74D"/>
      <ellipse cx="88" cy="66" rx="8" ry="6" fill="#FFCC80"/>
      <circle cx="85" cy="64.5" r="1.5" fill="#37474F"/>
    </g>
    <circle class="ca-bubble" cx="38" cy="46" r="3.5" fill="#FFF" opacity=".6"/>
    <circle class="ca-bubble ca-bubble--2" cx="86" cy="38" r="2.6" fill="#FFF" opacity=".6"/>
    <circle class="ca-bubble ca-bubble--3" cx="76" cy="26" r="2" fill="#FFF" opacity=".6"/>
    <g class="ca-bob">
      <g class="ca-breathe">
        <path d="M36 74c-4 8-10 12-14 12-4 0-5-4-2-8 4-6 10-10 16-12zM44 80c-2 9-6 15-10 16-4 1-6-3-4-8 2-7 7-12 14-16zM84 74c4 8 10 12 14 12 4 0 5-4 2-8-4-6-10-10-16-12zM76 80c2 9 6 15 10 16 4 1 6-3 4-8-2-7-7-12-14-16z" fill="#F06292"/>
        <path d="M52 82c0 8-1 14-3 17-3 3-7 1-7-3 1-7 4-12 10-14zM68 82c0 8 1 14 3 17 3 3 7 1 7-3-1-7-4-12-10-14z" fill="#EC7FA9"/>
        <path d="M32 58c0-16 12-28 28-28s28 12 28 28c0 10-4 16-8 20-6 5-10 6-20 6s-14-1-20-6c-4-4-8-10-8-20z" fill="url(#ca-octi)"/>
        <path d="M42 34c4-6 12-9 20-8-8 1-15 5-20 8z" fill="#FFF" opacity=".35"/>
        <g class="ca-eyes">
          <ellipse cx="50" cy="52" rx="7.5" ry="9" fill="#FFF"/>
          <ellipse cx="70" cy="52" rx="7.5" ry="9" fill="#FFF"/>
          <circle cx="51.5" cy="53.5" r="3.6" fill="#4A148C"/>
          <circle cx="68.5" cy="53.5" r="3.6" fill="#4A148C"/>
          <circle cx="53" cy="51.6" r="1.3" fill="#FFF"/>
          <circle cx="70" cy="51.6" r="1.3" fill="#FFF"/>
        </g>
        <path d="M52 64c4 3.5 12 3.5 16 0" stroke="#AD1457" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <circle cx="42" cy="61" r="3.2" fill="#F48FB1" opacity=".85"/>
        <circle cx="78" cy="61" r="3.2" fill="#F48FB1" opacity=".85"/>
      </g>
    </g>
    <defs>
      <radialGradient id="ca-octi" cx="0.4" cy="0.3" r="1">
        <stop offset="0" stop-color="#FF8FAB"/>
        <stop offset="1" stop-color="#E05A8C"/>
      </radialGradient>
    </defs>
  `);
}

const ART = {
  'racing-car': racingCar,
  'dinosaur': dinosaur,
  'ocean-friends': oceanFriends
};

/**
 * Render a companion character as inline SVG markup.
 * @param {string} companionId one of racing-car | dinosaur | ocean-friends
 * @param {{ size?: number, className?: string }} [opts] size in px (default 120)
 * @returns {string} HTML string, or '' for an unknown companion
 */
export function companionCharacterArt(companionId, opts = {}) {
  ensureStyles();
  const draw = ART[companionId];
  if (!draw) return '';
  const size = Number(opts.size) > 0 ? Number(opts.size) : 120;
  return `<span class="companion-art ${opts.className || ''}" style="display:inline-block;width:${size}px;height:${size}px;line-height:0;" aria-hidden="true">${draw()}</span>`;
}

export const COMPANION_ART_IDS = Object.freeze(['racing-car', 'dinosaur', 'ocean-friends']);

/**
 * Raw character SVG (no size wrapper) — for embedding in stickers and other
 * markup that controls its own dimensions.
 * @param {string} companionId
 * @returns {string} SVG string, or '' for an unknown companion
 */
export function companionCharacterSvg(companionId) {
  const draw = ART[companionId];
  return draw ? draw() : '';
}
