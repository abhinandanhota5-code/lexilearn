/**
 * MY WORLD: Child-Friendly Home Screen
 * Displays personalised learning world with companion, theme, decorations, and recent missions.
 */

import { WORLD_THEMES } from '../../../services/world/world-state.js';
import { AVAILABLE_AVATARS } from '../../../shared/profile-schema.js';
import { mountStickerDecorations } from '../../components/stickers/sticker-layer.js';

export function renderMyWorldScreen(container, {
  profile,
  worldState,
  recentMissions = [],
  onContinueLearning,
  onCustomizeWorld,
  onViewStickers,
  onSelectTheme
}) {
  const theme = WORLD_THEMES[worldState.selectedTheme] || WORLD_THEMES['dinosaur-world'];
  const companionId = worldState.selectedCompanion || 'fox';
  const companionData = AVAILABLE_AVATARS.find(a => a.id === companionId);
  const earnedCount = worldState.earnedDecorations.length;

  container.innerHTML = `
    <div class="my-world-container" style="
      background: ${theme.background};
      min-height: 100vh;
      padding: var(--space-lg);
      display: flex;
      flex-direction: column;
      color: white;
      font-family: 'Lexend', sans-serif;
      position: relative;
      overflow: hidden;
    ">
      <!-- Premium gradient overlay for depth -->
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%, rgba(0,0,0,0.1) 100%);
        pointer-events: none;
        z-index: 0;
      "></div>

      <!-- Animated background pattern -->
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        opacity: 0.08;
        pointer-events: none;
        font-size: 180px;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 40px;
        align-content: space-around;
        overflow: hidden;
        z-index: 0;
        animation: drift 20s linear infinite;
      ">
        ${Array(16).fill(theme.emoji).join('')}
      </div>

      <!-- Main content (z-index higher than background) -->
      <div style="position: relative; z-index: 1;">
        <!-- Header: Greeting + Quick Actions -->
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-lg);
          flex-wrap: wrap;
          gap: var(--space-md);
        ">
          <div style="flex: 1; min-width: 200px;">
            <h1 style="
              font-size: 32px;
              font-weight: 800;
              margin: 0 0 var(--space-sm) 0;
              text-shadow: 3px 3px 6px rgba(0,0,0,0.4);
              letter-spacing: -0.5px;
            ">
              Welcome back, ${profile?.name || 'Learner'}! 👋
            </h1>
            <p style="
              font-size: var(--font-size-sm);
              margin: 0;
              opacity: 0.95;
              text-shadow: 1px 1px 3px rgba(0,0,0,0.3);
              font-weight: 500;
            ">
              Your learning adventure awaits with ${companionData?.label || 'your companion'}
            </p>
          </div>

          <!-- Theme & Settings Quick Buttons -->
          <div style="display: flex; gap: var(--space-sm);">
            <button type="button" id="customize-btn" style="
              padding: var(--space-md) var(--space-lg);
              border-radius: 12px;
              border: 2px solid rgba(255,255,255,0.3);
              background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05));
              color: white;
              cursor: pointer;
              font-weight: 700;
              font-size: var(--font-size-sm);
              transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
              backdrop-filter: blur(10px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            ">
              🎨 Customize
            </button>
            <button type="button" id="stickers-btn" style="
              padding: var(--space-md) var(--space-lg);
              border-radius: 12px;
              border: 2px solid rgba(255,255,255,0.3);
              background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05));
              color: white;
              cursor: pointer;
              font-weight: 700;
              font-size: var(--font-size-sm);
              transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
              backdrop-filter: blur(10px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            ">
              ⭐ ${earnedCount} Stickers
            </button>
          </div>
        </div>

        <!-- Premium Companion Card with personality -->
        <div style="
          background: linear-gradient(135deg, rgba(255,255,255,0.13), rgba(255,255,255,0.05));
          backdrop-filter: blur(15px);
          border-radius: 16px;
          padding: var(--space-xl);
          margin-bottom: var(--space-lg);
          text-align: center;
          border: 2px solid rgba(255,255,255,0.2);
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
          position: relative;
          overflow: hidden;
        ">
          <!-- Gradient shine effect -->
          <div style="
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
            animation: shine 3s infinite;
            pointer-events: none;
          "></div>

          <!-- Companion display with bounce animation -->
          <div style="
            font-size: 120px;
            margin-bottom: var(--space-md);
            animation: bounce 2s ease-in-out infinite;
            position: relative;
            z-index: 1;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
          ">
            ${companionData.emoji}
          </div>

          <!-- Companion name and personality quote -->
          <h2 style="
            margin: 0 0 var(--space-sm) 0;
            font-size: 20px;
            font-weight: 700;
            position: relative;
            z-index: 1;
          ">
            ${companionData?.label || 'Your Companion'}
          </h2>
          <p style="
            font-size: var(--font-size-sm);
            margin: 0 0 var(--space-md) 0;
            opacity: 0.85;
            font-style: italic;
            position: relative;
            z-index: 1;
          ">
            "${companionData?.quote || 'Let\'s learn together!'}"
          </p>

          <!-- Continue Learning Button - Premium style -->
          <button type="button" id="continue-btn" style="
            padding: var(--space-lg) var(--space-xl);
            font-size: var(--font-size-lg);
            font-weight: 800;
            background: linear-gradient(135deg, #FF6EC7 0%, #A78BFA 50%, #667EEA 100%);
            color: white;
            border: none;
            border-radius: var(--target-radius);
            cursor: pointer;
            box-shadow: 0 8px 20px rgba(167, 139, 250, 0.4);
            transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
            margin-bottom: var(--space-md);
            position: relative;
            z-index: 1;
            font-family: var(--font-family-display);
            letter-spacing: var(--letter-spacing-wide);
          ">
            🚀 Continue Learning
          </button>

          <p style="
            font-size: var(--font-size-sm);
            opacity: 0.8;
            margin: 0;
            position: relative;
            z-index: 1;
            font-weight: 600;
          ">
            Ready for today's adventure?
          </p>
        </div>

        <!-- World Customization Area - Enhanced -->
        <div style="
          background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03));
          backdrop-filter: blur(15px);
          border-radius: 16px;
          padding: var(--space-lg);
          margin-bottom: var(--space-lg);
          border: 2px solid rgba(255,255,255,0.2);
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
          position: relative;
          overflow: hidden;
        ">
          <h3 style="
            margin: 0 0 var(--space-md) 0;
            font-size: 16px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            opacity: 0.95;
            display: flex;
            align-items: center;
            gap: var(--space-sm);
          ">
            🏠 Your World
          </h3>

          <div style="
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
            gap: var(--space-md);
            margin-bottom: var(--space-md);
          ">
            ${worldState.placedDecorations.map((placed, idx) => `
              <div style="
                aspect-ratio: 1;
                background: linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02));
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 36px;
                cursor: grab;
                transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
                border: 2px solid rgba(255,255,255,0.25);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                backdrop-filter: blur(10px);
              ">
                ${getDecorationEmoji(placed.decorationId, worldState.selectedTheme)}
              </div>
            `).join('')}

            ${worldState.placedDecorations.length === 0 ? `
              <div style="
                grid-column: 1 / -1;
                padding: var(--space-lg);
                text-align: center;
                opacity: 0.7;
                font-size: var(--font-size-sm);
                font-weight: 600;
              ">
                ✨ Earn and place decorations here!
              </div>
            ` : ''}
          </div>

          <button type="button" id="edit-world-btn" style="
            width: 100%;
            padding: var(--space-md) var(--space-lg);
            background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05));
            color: white;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 12px;
            cursor: pointer;
            font-weight: 700;
            transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
            font-size: var(--font-size-sm);
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          ">
            ✏️ Edit World
          </button>
        </div>

        <!-- Recent Missions - Enhanced -->
        ${recentMissions.length > 0 ? `
          <div style="
            background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03));
            border-radius: 16px;
            padding: var(--space-lg);
            border: 2px solid rgba(255,255,255,0.2);
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            backdrop-filter: blur(15px);
            position: relative;
            overflow: hidden;
          ">
            <h3 style="
              margin: 0 0 var(--space-md) 0;
              font-size: 16px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              opacity: 0.95;
              display: flex;
              align-items: center;
              gap: var(--space-sm);
            ">
              📚 Recent Missions
            </h3>

            <div style="display: flex; flex-direction: column; gap: var(--space-md);">
              ${recentMissions.slice(0, 3).map(mission => `
                <div style="
                  padding: var(--space-md);
                  background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.01));
                  border-radius: 12px;
                  display: flex;
                  align-items: center;
                  gap: var(--space-md);
                  border-left: 4px solid ${theme.foreground};
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                  transition: all 200ms ease;
                ">
                  <div style="font-size: 28px; flex-shrink: 0; animation: pulse 2s ease-in-out infinite;">
                    ${mission.completed ? '✅' : '⏳'}
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="
                      font-weight: 700;
                      font-size: var(--font-size-sm);
                      white-space: nowrap;
                      overflow: hidden;
                      text-overflow: ellipsis;
                    ">
                      ${mission.title || 'Learning Mission'}
                    </div>
                    <div style="
                      font-size: var(--font-size-xs);
                      opacity: 0.65;
                      font-weight: 500;
                    ">
                      ${mission.completed ? '🎉 Completed!' : '⏱️ In progress'}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Animations -->
      <style>
        @keyframes bounce {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }

        @keyframes drift {
          0% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(20px) translateY(-10px); }
          100% { transform: translateX(0) translateY(0); }
        }

        @keyframes shine {
          0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
          100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }

        #customize-btn:hover, #stickers-btn:hover, #edit-world-btn:hover {
          background: linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1));
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.3);
        }

        #customize-btn:active, #stickers-btn:active, #edit-world-btn:active {
          transform: translateY(-1px);
        }

        #continue-btn:hover {
          transform: scale(1.08);
          box-shadow: 0 12px 28px rgba(167, 139, 250, 0.6);
        }

        #continue-btn:active {
          transform: scale(0.96);
        }

        #continue-btn::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          border-radius: 14px;
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      </style>
    </div>
  `;

  mountStickerDecorations(container.querySelector('.my-world-container') || container, {
    companionId: profile?.avatar || null,
    placement: 'scrapbook'
  });

  // Wire event listeners
  const continueBtn = container.querySelector('#continue-btn');
  if (continueBtn && onContinueLearning) {
    continueBtn.addEventListener('click', () => onContinueLearning());
  }

  const customizeBtn = container.querySelector('#customize-btn');
  if (customizeBtn && onCustomizeWorld) {
    customizeBtn.addEventListener('click', () => onCustomizeWorld());
  }

  const stickersBtn = container.querySelector('#stickers-btn');
  if (stickersBtn && onViewStickers) {
    stickersBtn.addEventListener('click', () => onViewStickers());
  }

  const editBtn = container.querySelector('#edit-world-btn');
  if (editBtn && onCustomizeWorld) {
    editBtn.addEventListener('click', () => onCustomizeWorld());
  }
}

/**
 * Helper: Get decoration emoji from ID and theme.
 */
function getDecorationEmoji(decorationId, themeId) {
  const theme = WORLD_THEMES[themeId];
  if (!theme) return '✨';

  const decoration = theme.decorations.find(d => d.id === decorationId);
  return decoration ? decoration.emoji : '✨';
}
