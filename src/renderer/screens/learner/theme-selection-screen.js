/**
 * THEME SELECTION SCREEN
 * Child picks a theme for their My World environment
 * Shows live previews of each theme with decorations and colors
 */

import { WORLD_THEMES } from '../../../services/world/world-state.js';
import { mountStickerDecorations } from '../../components/stickers/sticker-layer.js';

export function renderThemeSelectionScreen(container, {
  profile,
  worldState,
  onThemeSelected,
  onBack
}) {
  const themes = Object.entries(WORLD_THEMES);
  const currentTheme = worldState.selectedTheme;

  container.innerHTML = `
    <div class="theme-selection-container" style="
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: var(--space-lg);
      display: flex;
      flex-direction: column;
      font-family: 'Lexend', sans-serif;
      color: #333;
    ">
      <!-- Header -->
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-lg);
      ">
        <div>
          <h1 style="
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            color: #2c3e50;
          ">
            🎨 Choose Your World
          </h1>
          <p style="
            margin: var(--space-sm) 0 0 0;
            font-size: var(--font-size-sm);
            color: #555;
          ">
            Pick a theme for your learning world
          </p>
        </div>
        <button type="button" id="back-btn" style="
          padding: 12px 20px;
          background: white;
          border: 2px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          color: #555;
          transition: all 200ms ease;
        ">
          ← Back
        </button>
      </div>

      <!-- Theme Grid -->
      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: var(--space-lg);
        flex: 1;
        margin-bottom: var(--space-lg);
      ">
        ${themes.map(([themeId, themeData]) => {
          const isSelected = currentTheme === themeId;
          return `
            <button
              type="button"
              class="theme-card"
              data-theme-id="${themeId}"
              style="
                background: ${themeData.background};
                border: 4px solid ${isSelected ? '#ffd700' : 'rgba(255,255,255,0.3)'};
                border-radius: 12px;
                padding: var(--space-lg);
                cursor: pointer;
                transition: all 300ms ease;
                position: relative;
                overflow: hidden;
                min-height: 300px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-shadow: ${isSelected ? '0 8px 24px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.1)'};
                transform: ${isSelected ? 'scale(1.02)' : 'scale(1)'};
              "
            >
              <!-- Background decorative elements -->
              <div style="
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                opacity: 0.08;
                pointer-events: none;
                font-size: 120px;
                display: flex;
                justify-content: space-around;
                align-items: center;
                z-index: 0;
              ">
                ${themeData.emoji} ${themeData.emoji} ${themeData.emoji}
              </div>

              <!-- Content -->
              <div style="position: relative; z-index: 1;">
                <!-- Theme emoji header -->
                <div style="
                  font-size: 64px;
                  margin-bottom: var(--space-md);
                ">
                  ${themeData.emoji}
                </div>

                <!-- Theme name and description -->
                <h3 style="
                  margin: 0 0 var(--space-sm) 0;
                  font-size: 20px;
                  font-weight: 700;
                  color: white;
                  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                ">
                  ${themeData.name}
                </h3>

                <!-- Decorations preview -->
                <div style="
                  display: flex;
                  gap: var(--space-sm);
                  flex-wrap: wrap;
                  margin: var(--space-md) 0;
                ">
                  ${themeData.decorations.slice(0, 5).map(dec => `
                    <div style="
                      font-size: 28px;
                      opacity: 0.9;
                      filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.2));
                    ">
                      ${dec.emoji}
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Selection indicator -->
              ${isSelected ? `
                <div style="
                  position: relative;
                  z-index: 1;
                  text-align: center;
                  padding: var(--space-md);
                  background: rgba(255,255,255,0.2);
                  border-radius: 8px;
                  backdrop-filter: blur(10px);
                  color: white;
                  font-weight: 700;
                  text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
                ">
                  ✓ Your World
                </div>
              ` : `
                <div style="
                  position: relative;
                  z-index: 1;
                  text-align: center;
                  padding: var(--space-md);
                  background: rgba(255,255,255,0.15);
                  border-radius: 8px;
                  backdrop-filter: blur(10px);
                  color: rgba(255,255,255,0.9);
                  font-weight: 600;
                  cursor: pointer;
                ">
                  Select This World
                </div>
              `}
            </button>
          `;
        }).join('')}
      </div>

      <!-- Styles -->
      <style>
        .theme-card:hover {
          transform: scale(1.05);
          box-shadow: 0 12px 32px rgba(0,0,0,0.15);
        }

        .theme-card:active {
          transform: scale(0.98);
        }

        @media (prefers-reduced-motion: reduce) {
          .theme-card {
            transition: none;
            transform: none;
          }

          .theme-card:hover {
            transform: none;
          }
        }
      </style>
    </div>
  `;

  mountStickerDecorations(container.querySelector('.theme-selection-container') || container, {
    companionId: profile?.avatar || null,
    placement: 'scrapbook'
  });

  // Wire event listeners
  const backBtn = container.querySelector('#back-btn');
  if (backBtn && onBack) {
    backBtn.addEventListener('click', () => onBack());
  }

  const themeCards = container.querySelectorAll('.theme-card');
  themeCards.forEach(card => {
    card.addEventListener('click', () => {
      const themeId = card.getAttribute('data-theme-id');
      if (themeId && onThemeSelected) {
        onThemeSelected(themeId);
      }
    });
  });
}
