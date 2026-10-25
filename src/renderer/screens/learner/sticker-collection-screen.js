/**
 * STICKER COLLECTION SCREEN
 * Child views all earned and locked stickers/decorations for current theme
 * Shows progress toward unlocking locked decorations
 */

import { WORLD_THEMES, checkAchievementCriteria } from '../../../services/world/world-state.js';
import { mountStickerDecorations } from '../../components/stickers/sticker-layer.js';

export function renderStickerCollectionScreen(container, {
  profile,
  worldState,
  profileStats = {},
  onBack
}) {
  const theme = WORLD_THEMES[worldState.selectedTheme] || WORLD_THEMES['dinosaur-world'];
  const decorations = theme.decorations || [];

  // Organize decorations into earned and locked
  const earned = [];
  const locked = [];

  decorations.forEach(dec => {
    const isEarned = worldState.earnedDecorations.includes(dec.id);
    const unlockCriteria = dec.unlockedBy;
    const isMet = checkAchievementCriteria(unlockCriteria, profileStats);

    if (isEarned) {
      earned.push({ ...dec, status: 'earned' });
    } else if (isMet) {
      locked.push({ ...dec, status: 'available', criteria: unlockCriteria });
    } else {
      locked.push({ ...dec, status: 'locked', criteria: unlockCriteria });
    }
  });

  container.innerHTML = `
    <div class="sticker-collection-container" style="
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: var(--space-lg);
      display: flex;
      flex-direction: column;
      font-family: 'Lexend', sans-serif;
      color: white;
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
          ">
            ⭐ My Sticker Collection
          </h1>
          <p style="
            margin: var(--space-sm) 0 0 0;
            font-size: var(--font-size-sm);
            opacity: 0.9;
          ">
            ${earned.length} of ${decorations.length} decorations earned
          </p>
        </div>
        <button type="button" id="back-btn" style="
          padding: 12px 20px;
          background: rgba(255,255,255,0.2);
          border: 2px solid rgba(255,255,255,0.5);
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          color: white;
          transition: all 200ms ease;
        ">
          ← Back
        </button>
      </div>

      <!-- Progress Bar -->
      <div style="
        background: rgba(255,255,255,0.1);
        border-radius: 8px;
        padding: var(--space-md);
        margin-bottom: var(--space-lg);
        backdrop-filter: blur(10px);
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          margin-bottom: var(--space-sm);
          font-size: var(--font-size-sm);
        ">
          <span>Collection Progress</span>
          <span style="font-weight: 700;">
            ${Math.round((earned.length / decorations.length) * 100)}%
          </span>
        </div>
        <div style="
          background: rgba(255,255,255,0.2);
          height: 12px;
          border-radius: 6px;
          overflow: hidden;
        ">
          <div style="
            background: linear-gradient(90deg, #ffd700 0%, #ffed4e 100%);
            height: 100%;
            width: ${(earned.length / decorations.length) * 100}%;
            transition: width 500ms ease;
          "></div>
        </div>
      </div>

      <!-- Earned Stickers Section -->
      ${earned.length > 0 ? `
        <div style="margin-bottom: var(--space-lg);">
          <h2 style="
            margin: 0 0 var(--space-md) 0;
            font-size: 18px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.9;
          ">
            🎉 Earned (${earned.length})
          </h2>
          <div style="
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: var(--space-md);
          ">
            ${earned.map(dec => `
              <div class="sticker-earned" style="
                aspect-ratio: 1;
                background: rgba(255,255,255,0.15);
                border: 2px solid rgba(255,215,0,0.6);
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: var(--space-md);
                text-align: center;
                backdrop-filter: blur(10px);
                cursor: grab;
                transition: all 200ms ease;
              ">
                <div style="
                  font-size: 48px;
                  margin-bottom: var(--space-sm);
                  filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.2));
                ">
                  ${dec.emoji}
                </div>
                <div style="
                  font-size: var(--font-size-xs);
                  font-weight: 600;
                  word-wrap: break-word;
                  line-height: 1.2;
                ">
                  ${dec.name}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Available Stickers Section -->
      ${locked.filter(d => d.status === 'available').length > 0 ? `
        <div style="margin-bottom: var(--space-lg);">
          <h2 style="
            margin: 0 0 var(--space-md) 0;
            font-size: 18px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.9;
          ">
            🔓 Ready to Earn (${locked.filter(d => d.status === 'available').length})
          </h2>
          <div style="
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: var(--space-md);
          ">
            ${locked.filter(d => d.status === 'available').map(dec => `
              <div style="
                aspect-ratio: 1;
                background: rgba(255,255,255,0.1);
                border: 2px dashed rgba(255,255,255,0.4);
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: var(--space-md);
                text-align: center;
                backdrop-filter: blur(10px);
                transition: all 200ms ease;
              ">
                <div style="
                  font-size: 48px;
                  margin-bottom: var(--space-sm);
                  opacity: 0.7;
                  filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.2));
                ">
                  ${dec.emoji}
                </div>
                <div style="
                  font-size: var(--font-size-xs);
                  font-weight: 600;
                  word-wrap: break-word;
                  line-height: 1.2;
                  opacity: 0.9;
                ">
                  ${dec.name}
                </div>
                <div style="
                  font-size: 10px;
                  margin-top: var(--space-sm);
                  opacity: 0.7;
                  color: #ffd700;
                ">
                  Complete soon!
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Locked Stickers Section -->
      ${locked.filter(d => d.status === 'locked').length > 0 ? `
        <div>
          <h2 style="
            margin: 0 0 var(--space-md) 0;
            font-size: 18px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.9;
          ">
            🔒 Locked (${locked.filter(d => d.status === 'locked').length})
          </h2>
          <div style="
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: var(--space-md);
          ">
            ${locked.filter(d => d.status === 'locked').map(dec => `
              <div style="
                aspect-ratio: 1;
                background: rgba(0,0,0,0.2);
                border: 2px solid rgba(0,0,0,0.3);
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: var(--space-md);
                text-align: center;
                backdrop-filter: blur(10px);
              ">
                <div style="
                  font-size: 48px;
                  margin-bottom: var(--space-sm);
                  opacity: 0.4;
                  filter: grayscale(100%);
                ">
                  ${dec.emoji}
                </div>
                <div style="
                  font-size: var(--font-size-xs);
                  font-weight: 600;
                  word-wrap: break-word;
                  line-height: 1.2;
                  opacity: 0.6;
                ">
                  ${dec.name}
                </div>
                <div style="
                  font-size: 10px;
                  margin-top: var(--space-sm);
                  opacity: 0.5;
                ">
                  Keep learning
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Styles -->
      <style>
        .sticker-earned:hover {
          background: rgba(255,255,255,0.25);
          transform: scale(1.05) translateY(-4px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        }

        .sticker-earned:active {
          transform: scale(0.98);
        }

        @media (prefers-reduced-motion: reduce) {
          .sticker-earned {
            transition: none;
          }

          .sticker-earned:hover {
            transform: none;
          }
        }
      </style>
    </div>
  `;

  mountStickerDecorations(container.querySelector('.sticker-collection-container') || container, {
    companionId: profile?.avatar || null,
    placement: 'scrapbook'
  });

  // Wire event listeners
  const backBtn = container.querySelector('#back-btn');
  if (backBtn && onBack) {
    backBtn.addEventListener('click', () => onBack());
  }
}
