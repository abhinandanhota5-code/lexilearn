/**
 * WORLD EDITOR SCREEN
 * Child drags and places earned decorations in their world
 * Can remove, rearrange, and reset layout
 */

import { WORLD_THEMES } from '../../../services/world/world-state.js';
import { mountStickerDecorations } from '../../components/stickers/sticker-layer.js';

export function renderWorldEditorScreen(container, {
  profile,
  worldState,
  onSave,
  onBack
}) {
  const theme = WORLD_THEMES[worldState.selectedTheme] || WORLD_THEMES['dinosaur-world'];
  const earnedDecorations = worldState.earnedDecorations || [];
  const placedDecorations = worldState.placedDecorations || [];

  // Helper to get decoration data
  function getDecoration(decorationId) {
    return theme.decorations?.find(d => d.id === decorationId);
  }

  // Track dragging state
  let draggedItem = null;
  let dragOffset = { x: 0, y: 0 };

  container.innerHTML = `
    <div class="world-editor-container" style="
      min-height: 100vh;
      background: ${theme.background};
      padding: var(--space-lg);
      display: flex;
      flex-direction: column;
      font-family: 'Lexend', sans-serif;
      color: white;
      position: relative;
      overflow: hidden;
    ">
      <!-- Decorative background -->
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        opacity: 0.1;
        pointer-events: none;
        font-size: 200px;
        display: flex;
        justify-content: space-around;
        align-items: space-around;
        overflow: hidden;
        z-index: 0;
      ">
        ${theme.emoji} ${theme.emoji} ${theme.emoji}
      </div>

      <!-- Header -->
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-lg);
        position: relative;
        z-index: 10;
      ">
        <div>
          <h1 style="
            margin: 0;
            font-size: 28px;
            font-weight: 700;
          ">
            ✏️ Edit Your World
          </h1>
          <p style="
            margin: var(--space-sm) 0 0 0;
            font-size: var(--font-size-sm);
            opacity: 0.9;
          ">
            Drag decorations to place them, click to remove
          </p>
        </div>
        <div style="display: flex; gap: var(--space-sm);">
          <button type="button" id="reset-btn" style="
            padding: 12px 16px;
            background: rgba(255,255,255,0.1);
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            color: white;
            font-size: var(--font-size-sm);
            transition: all 200ms ease;
          ">
            🔄 Reset
          </button>
          <button type="button" id="save-btn" style="
            padding: 12px 16px;
            background: linear-gradient(135deg, #ff6ec7 0%, #a78bfa 100%);
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            color: white;
            font-size: var(--font-size-sm);
            transition: all 200ms ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          ">
            ✓ Save
          </button>
        </div>
      </div>

      <!-- Main editor area -->
      <div style="
        display: flex;
        gap: var(--space-lg);
        flex: 1;
        min-height: 400px;
        position: relative;
        z-index: 1;
      ">
        <!-- Canvas area -->
        <div style="flex: 1;">
          <div id="canvas" style="
            background: rgba(255,255,255,0.05);
            border: 2px dashed rgba(255,255,255,0.2);
            border-radius: 12px;
            padding: var(--space-md);
            position: relative;
            flex: 1;
            min-height: 300px;
            overflow: hidden;
          ">
            <!-- Placed decorations -->
            ${placedDecorations.map((placed, idx) => {
              const dec = getDecoration(placed.decorationId);
              if (!dec) return '';
              return `
                <div class="placed-decoration" data-placed-id="${placed.id}" style="
                  position: absolute;
                  left: ${placed.x}px;
                  top: ${placed.y}px;
                  cursor: grab;
                  user-select: none;
                  transition: all 100ms ease;
                  z-index: ${10 + idx};
                ">
                  <div style="
                    font-size: 48px;
                    filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
                    transition: all 100ms ease;
                  ">
                    ${dec.emoji}
                  </div>
                  <div style="
                    position: absolute;
                    top: -30px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0,0,0,0.5);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 100ms ease;
                  ">
                    ${dec.name}
                  </div>
                </div>
              `;
            }).join('')}

            ${placedDecorations.length === 0 ? `
              <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                opacity: 0.5;
                font-size: var(--font-size-sm);
                color: rgba(255,255,255,0.7);
                text-align: center;
              ">
                <div>
                  Drag decorations here to place them
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Stickers panel -->
        <div style="
          background: rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: var(--space-md);
          border: 1px solid rgba(255,255,255,0.15);
          width: 200px;
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          overflow-y: auto;
          max-height: 100%;
        ">
          <h3 style="
            margin: 0;
            font-size: var(--font-size-base);
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.9;
          ">
            📦 Decorations
          </h3>

          ${earnedDecorations.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: var(--space-sm);">
              ${earnedDecorations.map(decId => {
                const dec = getDecoration(decId);
                if (!dec) return '';
                const isPlaced = placedDecorations.some(p => p.decorationId === decId);
                return `
                  <button
                    type="button"
                    class="sticker-button"
                    data-decoration-id="${decId}"
                    style="
                      padding: var(--space-sm);
                      background: rgba(255,255,255,0.1);
                      border: 2px solid rgba(255,255,255,0.2);
                      border-radius: 8px;
                      cursor: grab;
                      display: flex;
                      align-items: center;
                      gap: var(--space-sm);
                      color: white;
                      font-weight: 600;
                      font-size: var(--font-size-sm);
                      transition: all 200ms ease;
                      user-select: none;
                    "
                    draggable="true"
                  >
                    <div style="
                      font-size: 24px;
                      flex-shrink: 0;
                    ">
                      ${dec.emoji}
                    </div>
                    <div style="
                      flex: 1;
                      text-align: left;
                      font-size: 12px;
                      line-height: 1.2;
                      word-break: break-word;
                    ">
                      ${dec.name}
                      ${isPlaced ? '<br><span style="opacity: 0.7; font-size: 11px;">✓ Placed</span>' : ''}
                    </div>
                  </button>
                `;
              }).join('')}
            </div>
          ` : `
            <div style="
              text-align: center;
              opacity: 0.6;
              font-size: var(--font-size-sm);
              padding: var(--space-md);
            ">
              No decorations earned yet.
              <br>Complete learning activities to earn decorations!
            </div>
          `}
        </div>
      </div>

      <!-- Instructions -->
      <div style="
        background: rgba(255,255,255,0.08);
        border-radius: 8px;
        padding: var(--space-md);
        margin-top: var(--space-lg);
        font-size: var(--font-size-sm);
        backdrop-filter: blur(10px);
        position: relative;
        z-index: 1;
      ">
        <p style="margin: 0; opacity: 0.9;">
          💡 <strong>Tip:</strong> Drag decorations from the panel to place them, or drag placed items to move them around. Click a placed decoration to remove it.
        </p>
      </div>

      <style>
        .placed-decoration:hover {
          filter: drop-shadow(3px 3px 6px rgba(0,0,0,0.5));
        }

        .placed-decoration:hover > div:last-child {
          opacity: 1;
        }

        .sticker-button:hover {
          background: rgba(255,255,255,0.15);
          transform: translateX(4px);
        }

        .sticker-button:active {
          transform: translateX(2px);
        }

        .sticker-button.drag-over {
          background: rgba(255,255,255,0.25);
          border-color: rgba(255,255,255,0.5);
        }

        @media (prefers-reduced-motion: reduce) {
          .placed-decoration,
          .sticker-button {
            transition: none;
          }

          .sticker-button:hover {
            transform: none;
          }
        }
      </style>
    </div>
  `;

  mountStickerDecorations(container.querySelector('.world-editor-container') || container, {
    companionId: profile?.avatar || null,
    placement: 'scrapbook'
  });

  // Setup drag and drop
  const canvas = container.querySelector('#canvas');
  const stickerButtons = container.querySelectorAll('.sticker-button');
  const placedItems = container.querySelectorAll('.placed-decoration');

  // Drag from sticker panel
  stickerButtons.forEach(btn => {
    btn.addEventListener('dragstart', (e) => {
      const decorationId = btn.getAttribute('data-decoration-id');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('decorationId', decorationId);
      draggedItem = { type: 'sticker', decorationId };
    });

    btn.addEventListener('dragend', () => {
      draggedItem = null;
    });
  });

  // Drag from canvas
  placedItems.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      const placedId = item.getAttribute('data-placed-id');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('placedId', placedId);
      draggedItem = { type: 'placed', placedId };
      dragOffset = {
        x: e.clientX - item.getBoundingClientRect().left,
        y: e.clientY - item.getBoundingClientRect().top
      };
    });

    item.addEventListener('dragend', () => {
      draggedItem = null;
    });

    // Click to remove
    item.addEventListener('click', (e) => {
      if (e.button === 0) { // left click
        e.stopPropagation();
        const placedId = item.getAttribute('data-placed-id');
        worldState.removeDecoration(placedId);
        // Re-render with updated state
        renderWorldEditorScreen(container, { profile, worldState, onSave, onBack });
      }
    });
  });

  // Drop on canvas
  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    canvas.style.background = 'rgba(255,255,255,0.15)';
  });

  canvas.addEventListener('dragleave', () => {
    canvas.style.background = 'rgba(255,255,255,0.05)';
  });

  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    canvas.style.background = 'rgba(255,255,255,0.05)';

    const decorationId = e.dataTransfer.getData('decorationId');
    const placedId = e.dataTransfer.getData('placedId');

    const canvasRect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - canvasRect.left, canvasRect.width - 60));
    const y = Math.max(0, Math.min(e.clientY - canvasRect.top, canvasRect.height - 60));

    if (decorationId) {
      // Place new decoration
      worldState.placeDecoration(decorationId, x, y);
    } else if (placedId) {
      // Move existing decoration
      const placed = worldState.placedDecorations.find(p => p.id === placedId);
      if (placed) {
        placed.x = x;
        placed.y = y;
      }
    }

    // Re-render
    renderWorldEditorScreen(container, { profile, worldState, onSave, onBack });
  });

  // Button handlers
  const saveBtn = container.querySelector('#save-btn');
  if (saveBtn && onSave) {
    saveBtn.addEventListener('click', () => {
      onSave(worldState);
    });
  }

  const resetBtn = container.querySelector('#reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset your world layout? (You will keep all earned decorations)')) {
        worldState.resetLayout();
        renderWorldEditorScreen(container, { profile, worldState, onSave, onBack });
      }
    });
  }

  const backBtn = container.querySelector('#back-btn');
  if (backBtn && onBack) {
    backBtn.addEventListener('click', () => onBack());
  }
}
