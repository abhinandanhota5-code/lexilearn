/**
 * Companion Character Widget
 * Simple CSS/SVG-based companion with state-driven expressions.
 * Respects reduced-motion settings.
 */

export function createCompanionCharacter(variant = 'docked') {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const html = `
    <div class="companion-container" data-variant="${variant}" style="
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: ${variant === 'docked' ? '12px' : '24px'};
    ">
      <div class="companion-character" style="
        font-size: ${variant === 'docked' ? '48px' : '80px'};
        animation: ${prefersReducedMotion ? 'none' : 'float 3s ease-in-out infinite'};
        will-change: transform;
      " id="companion-emoji">
        🐝
      </div>
      <div class="companion-message" id="companion-message" style="
        font-size: ${variant === 'docked' ? '12px' : '14px'};
        text-align: center;
        color: var(--color-text-secondary);
        min-height: 20px;
        font-weight: 500;
      "></div>
    </div>

    <style>
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
      }

      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
      }

      @keyframes wiggle {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-2deg); }
        75% { transform: rotate(2deg); }
      }

      @keyframes celebrate {
        0% { transform: scale(1) rotate(0deg); }
        25% { transform: scale(1.1) rotate(-5deg); }
        50% { transform: scale(1.05) rotate(0deg); }
        75% { transform: scale(1.1) rotate(5deg); }
        100% { transform: scale(1) rotate(0deg); }
      }

      @media (prefers-reduced-motion: reduce) {
        * { animation: none !important; }
      }

      .companion-container[data-variant="hero"] {
        animation: slideIn 400ms ease;
      }

      @keyframes slideIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>
  `;

  return html;
}

/**
 * Update companion expression and message based on event.
 */
export function updateCompanionState(container, event, opts = {}) {
  if (!container) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const emoji = container.querySelector('#companion-emoji');
  const messageEl = container.querySelector('#companion-message');

  const states = {
    greeting: {
      emoji: '🐝',
      message: 'Ready to learn?',
      animation: 'float'
    },
    answer_correct: {
      emoji: '🎉',
      message: 'Great job!',
      animation: 'celebrate'
    },
    answer_incorrect: {
      emoji: '💭',
      message: 'Let\'s try again!',
      animation: 'wiggle'
    },
    self_corrected: {
      emoji: '⭐',
      message: 'You got it!',
      animation: 'celebrate'
    },
    learner_struggling: {
      emoji: '💙',
      message: 'Want some help?',
      animation: 'pulse'
    },
    hint_requested: {
      emoji: '🤔',
      message: 'Thinking...',
      animation: 'pulse'
    },
    lesson_complete: {
      emoji: '🏆',
      message: 'Lesson complete!',
      animation: 'celebrate'
    },
    milestone_reached: {
      emoji: '🌟',
      message: `${opts.milestone || 'Great'} progress!`,
      animation: 'celebrate'
    }
  };

  const state = states[event] || states.greeting;

  if (emoji) {
    emoji.textContent = state.emoji;
    emoji.style.animation = prefersReducedMotion ? 'none' : `${state.animation} 600ms ease`;
  }

  if (messageEl) {
    messageEl.textContent = state.message;
  }
}
