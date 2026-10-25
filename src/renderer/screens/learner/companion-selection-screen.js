/**
 * Companion Selection Screen
 * Shown during onboarding after Learner Basics. Child chooses their animated companion.
 * The selected companion determines the complete visual theme of the application.
 */

import { AVAILABLE_AVATARS } from '../../../shared/profile-schema.js';
import { companionCharacterArt } from '../../components/companion/companion-art.js';

const COMPANION_PREVIEWS = {
  'racing-car': {
    id: 'racing-car',
    name: 'Racing Car',
    emoji: '🏎️',
    color: '#E94560',
    secondaryColor: '#FF6B8A',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #E94560 100%)',
    tagline: 'Race to Reading Victory!',
    description: 'Zoom through lessons with speed and style. Every correct answer puts you in the lead!',
    personality: 'Energetic & Encouraging',
    animations: ['vroom', 'drift', 'victory-lap', 'pit-stop']
  },
  'dinosaur': {
    id: 'dinosaur',
    name: 'Dinosaur',
    emoji: '🦕',
    color: '#8BC34A',
    secondaryColor: '#A5D6A7',
    gradient: 'linear-gradient(135deg, #2d5016 0%, #5a7d3d 50%, #8BC34A 100%)',
    tagline: 'Learning is Dino-mite!',
    description: 'Stomp through stories and chomp on new words. Rawr means "I can do it!" in dinosaur!',
    personality: 'Friendly & Curious',
    animations: ['roar', 'stomp', 'tail-wag', 'happy-chomp']
  },
  'ocean-friends': {
    id: 'ocean-friends',
    name: 'Ocean Friends',
    emoji: '🐙',
    color: '#00BCD4',
    secondaryColor: '#4DD0E1',
    gradient: 'linear-gradient(135deg, #0a3d62 0%, #1a5f7a 50%, #00BCD4 100%)',
    tagline: 'Dive into Discovery!',
    description: 'Swim through sentences and explore word reefs. Eight tentacles mean eight ways to help!',
    personality: 'Calm & Supportive',
    animations: ['float', 'wave', 'ink-burst', 'treasure-find']
  }
};

export function renderCompanionSelectionScreen(container, {
  profile,
  onCompanionSelected,
  onBack
}) {
  const companions = AVAILABLE_AVATARS;
  let selectedCompanionId = profile?.avatar || companions[0].id;
  let previewVisible = true;

  function render() {
    // Ensure selectedCompanionId is valid
    const validCompanionId = COMPANION_PREVIEWS[selectedCompanionId] ? selectedCompanionId : companions[0].id;
    const selectedCompanion = COMPANION_PREVIEWS[validCompanionId];

    container.innerHTML = `
      <div class="companion-selection-container" style="
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background: ${selectedCompanion?.gradient || companions[0]?.gradient || 'linear-gradient(135deg, #2d5016 0%, #5a7d3d 100%)'};
        font-family: 'Lexend', sans-serif;
        color: white;
        position: relative;
        overflow: hidden;
      ">
        <!-- Animated Background -->
        <div class="companion-bg" style="
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          opacity: 0.15;
          pointer-events: none;
          z-index: 0;
        ">
          ${generateBackgroundPattern(validCompanionId)}
        </div>

        <!-- Main Content -->
        <div style="position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; padding: var(--space-lg);">

          <!-- Header -->
          <div style="text-align: center; margin-bottom: var(--space-xl); padding-top: var(--space-md);">
            <div style="
              font-size: 14px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 2px;
              opacity: 0.9;
              margin-bottom: var(--space-sm);
            ">
              Step 3 of 3 • Choose Your Companion
            </div>
            <h1 style="
              font-size: clamp(28px, 5vw, 40px);
              font-weight: 800;
              margin: 0 0 var(--space-sm) 0;
              text-shadow: 3px 3px 6px rgba(0,0,0,0.3);
              line-height: 1.2;
            ">
              Who will be your<br>learning buddy? 🤝
            </h1>
            <p style="
              font-size: var(--font-size-base);
              opacity: 0.95;
              max-width: 400px;
              margin: 0 auto;
              line-height: 1.6;
            ">
              Your companion will join you on every adventure, celebrate your wins, and help when things get tricky.
            </p>
          </div>

          <!-- Companion Cards Grid -->
          <div style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: var(--space-lg);
            flex: 1;
            max-width: 900px;
            margin: 0 auto;
            width: 100%;
            align-content: center;
          ">
            ${companions.map(c => {
              const preview = COMPANION_PREVIEWS[c.id];
              const isSelected = c.id === selectedCompanionId;
              return `
                <button
                  type="button"
                  class="companion-choice-card ${isSelected ? 'is-selected' : ''}"
                  data-companion="${c.id}"
                  style="
                    position: relative;
                    background: ${isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'};
                    border: 3px solid ${isSelected ? 'white' : 'rgba(255,255,255,0.2)'};
                    border-radius: 20px;
                    padding: var(--space-lg);
                    cursor: pointer;
                    transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
                    backdrop-filter: blur(15px);
                    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    overflow: hidden;
                  "
                  aria-label="Choose ${preview?.name || c.id}"
                  aria-pressed="${isSelected}"
                >
                  <!-- Selection indicator -->
                  ${isSelected ? `
                    <div style="
                      position: absolute;
                      top: -3px; left: -3px; right: -3px; bottom: -3px;
                      border-radius: 20px;
                      background: linear-gradient(135deg, ${preview.color}, ${preview.secondaryColor});
                      z-index: -1;
                      animation: border-pulse 2s ease-in-out infinite;
                    "></div>
                  ` : ''}

                  <!-- Companion Character Artwork -->
                  <div class="companion-preview" style="
                    width: clamp(96px, 16vw, 128px);
                    aspect-ratio: 1;
                    margin-bottom: var(--space-md);
                    filter: drop-shadow(0 6px 14px rgba(0,0,0,0.3));
                  ">
                    ${companionCharacterArt(c.id, { size: 128 })}
                  </div>

                  <!-- Companion Name -->
                  <h3 style="
                    margin: 0 0 var(--space-xs) 0;
                    font-size: clamp(18px, 3vw, 24px);
                    font-weight: 800;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
                  ">
                    ${preview.name}
                  </h3>

                  <!-- Tagline -->
                  <p style="
                    margin: 0 0 var(--space-sm) 0;
                    font-size: var(--font-size-sm);
                    opacity: 0.9;
                    font-weight: 600;
                    color: ${preview.secondaryColor};
                  ">
                    ${preview.tagline}
                  </p>

                  <!-- Personality -->
                  <span style="
                    display: inline-block;
                    padding: 4px 12px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 9999px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: var(--space-md);
                  ">
                    ${preview.personality}
                  </span>

                  <!-- Description (shown on hover/focus or in preview) -->
                  <p class="companion-desc" style="
                    margin: 0;
                    font-size: var(--font-size-xs);
                    opacity: 0.8;
                    line-height: 1.4;
                    min-height: 40px;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                  ">
                    ${preview.description}
                  </p>

                  <!-- Selection checkmark -->
                  ${isSelected ? `
                    <div style="
                      position: absolute;
                      bottom: var(--space-md);
                      right: var(--space-md);
                      width: 28px;
                      height: 28px;
                      background: white;
                      border-radius: 50%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      color: ${preview.color};
                      font-weight: 900;
                      font-size: 16px;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                      animation: check-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    ">✓</div>
                  ` : ''}
                </button>
              `;
            }).join('')}
          </div>

          <!-- Live Preview Area (shows selected companion details) -->
          <div id="companion-preview" style="
            margin-top: var(--space-xl);
            padding: var(--space-lg);
            background: rgba(255,255,255,0.1);
            border-radius: 16px;
            border: 2px solid rgba(255,255,255,0.2);
            backdrop-filter: blur(15px);
            animation: slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            display: ${previewVisible ? 'block' : 'none'};
          ">
            <div style="display: flex; align-items: center; gap: var(--space-lg); flex-wrap: wrap; justify-content: center;">
              <div style="width: 96px; aspect-ratio: 1; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.3));">
                ${companionCharacterArt(validCompanionId, { size: 96 })}
              </div>
              <div style="flex: 1; min-width: 200px; text-align: left;">
                <h3 style="margin: 0 0 var(--space-xs) 0; font-size: 22px; font-weight: 800;">
                  ${selectedCompanion.name}
                </h3>
                <p style="margin: 0 0 var(--space-sm) 0; opacity: 0.9; font-weight: 600; color: ${selectedCompanion.secondaryColor};">
                  "${selectedCompanion.tagline}"
                </p>
                <p style="margin: 0; font-size: var(--font-size-sm); opacity: 0.85; line-height: 1.5;">
                  ${selectedCompanion.description}
                </p>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="
            display: flex;
            gap: var(--space-md);
            margin-top: var(--space-xl);
            padding-top: var(--space-lg);
            border-top: 1px solid rgba(255,255,255,0.1);
            justify-content: center;
            flex-wrap: wrap;
          ">
            ${onBack ? `
              <button type="button" id="back-btn" class="btn-secondary" style="
                min-width: 140px;
                padding: var(--space-md) var(--space-xl);
                background: rgba(255,255,255,0.15);
                border: 2px solid rgba(255,255,255,0.3);
                color: white;
                font-weight: 700;
                border-radius: var(--target-radius);
                cursor: pointer;
                transition: all 200ms ease;
                backdrop-filter: blur(10px);
              ">
                ← Back
              </button>
            ` : ''}
            <button type="button" id="continue-btn" class="btn-primary" style="
              min-width: 200px;
              padding: var(--space-md) var(--space-2xl);
              background: linear-gradient(135deg, #FF6EC7 0%, #A78BFA 50%, #667EEA 100%);
              border: none;
              color: white;
              font-weight: 800;
              font-size: var(--font-size-base);
              border-radius: var(--target-radius);
              cursor: pointer;
              box-shadow: 0 8px 24px rgba(167, 139, 250, 0.4);
              transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
              font-family: 'Lexend', sans-serif;
              position: relative;
              overflow: hidden;
            ">
              <span style="position: relative; z-index: 1;">Start Adventure! 🚀</span>
              <span style="
                position: absolute;
                top: 0; left: -100%; width: 100%; height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                animation: shimmer 2s infinite;
              "></span>
            </button>
          </div>
        </div>

        <!-- Styles -->
        <style>
          @keyframes border-pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }

          @keyframes check-pop {
            0% { transform: scale(0) rotate(-180deg); }
            50% { transform: scale(1.3) rotate(10deg); }
            100% { transform: scale(1) rotate(0); }
          }

          @keyframes slide-up {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }

          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }

          /* Racing Car Animations */
          @keyframes racing-car-idle {
            0%, 100% { transform: translateX(0) rotate(0deg); }
            25% { transform: translateX(-5px) rotate(-2deg); }
            50% { transform: translateX(5px) rotate(2deg); }
            75% { transform: translateX(-3px) rotate(-1deg); }
          }

          @keyframes racing-car-vroom {
            0% { transform: translateX(0) rotate(0deg); }
            20% { transform: translateX(-10px) rotate(-3deg); }
            40% { transform: translateX(20px) rotate(1deg); }
            60% { transform: translateX(-5px) rotate(-1deg); }
            80% { transform: translateX(10px) rotate(2deg); }
            100% { transform: translateX(0) rotate(0deg); }
          }

          @keyframes racing-car-drift {
            0% { transform: translateX(0) rotate(0deg); }
            30% { transform: translateX(-15px) rotate(-5deg) scale(1.05); }
            60% { transform: translateX(15px) rotate(5deg) scale(1.05); }
            100% { transform: translateX(0) rotate(0deg); }
          }

          /* Dinosaur Animations */
          @keyframes dinosaur-idle {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-8px) rotate(1deg); }
            50% { transform: translateY(0) rotate(0deg); }
            75% { transform: translateY(-4px) rotate(-1deg); }
          }

          @keyframes dinosaur-roar {
            0% { transform: translateY(0) rotate(0deg) scale(1); }
            20% { transform: translateY(-15px) rotate(3deg) scale(1.1); }
            40% { transform: translateY(-5px) rotate(-2deg) scale(1.05); }
            60% { transform: translateY(-12px) rotate(2deg) scale(1.1); }
            100% { transform: translateY(0) rotate(0deg) scale(1); }
          }

          @keyframes dinosaur-stomp {
            0% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-20px) rotate(2deg); }
            50% { transform: translateY(0) rotate(-1deg) scale(1.02); }
            75% { transform: translateY(-10px) rotate(1deg); }
            100% { transform: translateY(0) rotate(0deg); }
          }

          /* Ocean Friends (Octopus) Animations */
          @keyframes ocean-friends-idle {
            0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
            25% { transform: translateY(-6px) translateX(3px) rotate(1deg); }
            50% { transform: translateY(-3px) translateX(-3px) rotate(-1deg); }
            75% { transform: translateY(-8px) translateX(2px) rotate(1deg); }
          }

          @keyframes ocean-friends-float {
            0% { transform: translateY(0) translateX(0) rotate(0deg); }
            33% { transform: translateY(-12px) translateX(5px) rotate(2deg); }
            66% { transform: translateY(-4px) translateX(-5px) rotate(-2deg); }
            100% { transform: translateY(0) translateX(0) rotate(0deg); }
          }

          @keyframes ocean-friends-wave {
            0% { transform: translateY(0) rotate(0deg); }
            20% { transform: translateY(-10px) rotate(3deg); }
            40% { transform: translateY(-5px) rotate(-2deg); }
            60% { transform: translateY(-12px) rotate(2deg); }
            80% { transform: translateY(-3px) rotate(-1deg); }
            100% { transform: translateY(0) rotate(0deg); }
          }

          /* Hover effects */
          .companion-choice-card:hover:not(.is-selected) {
            background: rgba(255,255,255,0.2) !important;
            border-color: rgba(255,255,255,0.4) !important;
            transform: translateY(-6px) scale(1.02);
            box-shadow: 0 16px 40px rgba(0,0,0,0.25) !important;
          }

          .companion-choice-card:active:not(.is-selected) {
            transform: translateY(-2px) scale(0.98);
          }

          .companion-choice-card:focus-visible {
            outline: none;
            box-shadow: 0 0 0 4px rgba(255,255,255,0.5), 0 16px 40px rgba(0,0,0,0.25) !important;
          }

          .companion-choice-card:hover .companion-preview,
          .companion-choice-card:focus .companion-preview {
            animation-duration: 1s !important;
          }

          #continue-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 12px 32px rgba(167, 139, 250, 0.6);
          }

          #continue-btn:active {
            transform: scale(0.98);
          }

          #back-btn:hover {
            background: rgba(255,255,255,0.25) !important;
            transform: translateY(-2px);
          }

          @media (prefers-reduced-motion: reduce) {
            * { animation: none !important; transition: none !important; }
            .companion-preview { animation: none !important; }
          }
        </style>
      </div>
    `;

    // Wire event handlers
    container.querySelectorAll('.companion-choice-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-companion');
        if (id !== selectedCompanionId) {
          selectedCompanionId = id;
          render();
        }
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });

    container.querySelector('#continue-btn')?.addEventListener('click', () => {
      if (onCompanionSelected) onCompanionSelected(selectedCompanionId);
    });

    container.querySelector('#back-btn')?.addEventListener('click', () => {
      if (onBack) onBack();
    });
  }

  render();
}

function generateBackgroundPattern(companionId) {
  const preview = COMPANION_PREVIEWS[companionId] || COMPANION_PREVIEWS['dinosaur'];
  const emoji = preview?.emoji || '🦕';
  let pattern = '';
  for (let i = 0; i < 20; i++) {
    pattern += `<span style="display: inline-block; animation: drift-${companionId} ${20 + i * 2}s linear infinite; opacity: ${0.05 + Math.random() * 0.1}; transform: translate(${Math.random() * 100}vw, ${Math.random() * 100}vh) scale(${0.5 + Math.random() * 1.5});">${emoji}</span>`;
  }
  return `
    <style>
      @keyframes drift-${companionId} {
        0% { transform: translate(0, 0) rotate(0deg); }
        25% { transform: translate(50px, -30px) rotate(90deg); }
        50% { transform: translate(-30px, 50px) rotate(180deg); }
        75% { transform: translate(-50px, -20px) rotate(270deg); }
        100% { transform: translate(0, 0) rotate(360deg); }
      }
    </style>
    <div style="width: 100%; height: 100%; display: flex; flex-wrap: wrap; align-content: space-around; justify-content: space-around; padding: 100px;">
      ${pattern}
    </div>
  `;
}