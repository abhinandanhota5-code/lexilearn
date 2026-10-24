import { AVAILABLE_AVATARS } from '../../../shared/profile-schema.js';
import { TIME_LIMIT_MS } from '../../../services/screening/task-templates.js';

/**
 * Learner Screen L2: Task Screen
 * Renders one screening task with large, accessible answer options,
 * a visible-but-gentle timer, and brief feedback before advancing.
 */

const FEEDBACK_DELAY_MS = 1500;

export function renderTaskScreen(container, {
  profile,
  task,
  currentIndex,
  totalTasks,
  onAnswer
}) {
  const avatar = AVAILABLE_AVATARS.find(a => a.id === profile?.avatar) || { emoji: '🌟', label: 'Star' };
  const progressPct = totalTasks > 0 ? Math.round(((currentIndex) / totalTasks) * 100) : 0;

  const optionButtons = task.options.map((opt, i) => `
    <button
      type="button"
      class="option-btn option-enter"
      data-option="${opt}"
      data-index="${i}"
      style="animation-delay: ${i * 0.06}s;"
    >
      ${opt}
    </button>
  `).join('');

  container.innerHTML = `
    <div class="learner-container screen-enter" style="justify-content: flex-start; padding-top: var(--space-xl);">
      <div class="quest-progress">
        <div class="quest-progress-track">
          <div class="quest-progress-fill" id="progress-fill" style="width: ${progressPct}%;"></div>
        </div>
        <div class="quest-progress-label progress-pop">
          <span>Question ${currentIndex + 1} of ${totalTasks}</span>
          <span>${progressPct}% done</span>
        </div>
      </div>

      <div class="learner-card task-card-enter" style="margin-top: var(--space-md);">
        <span class="task-category-badge">${categoryLabel(task.category)}</span>

        <div class="task-prompt" id="task-prompt">${task.prompt}</div>

        <div class="option-grid" id="option-grid">
          ${optionButtons}
        </div>

        <div class="quest-timer" id="quest-timer">
          <span>⏱️</span>
          <span id="timer-display">${formatTime(TIME_LIMIT_MS)}</span>
        </div>
      </div>
    </div>
  `;

  const optionGrid = container.querySelector('#option-grid');
  const timerDisplay = container.querySelector('#timer-display');

  let selected = false;
  const startedAt = Date.now();
  let timerInterval = null;

  // Start gentle countdown timer
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, TIME_LIMIT_MS - elapsed);
    timerDisplay.textContent = formatTime(remaining);

    // Auto-advance on timeout (non-punitive)
    if (remaining <= 0 && !selected) {
      clearInterval(timerInterval);
      submitAnswer('', false, TIME_LIMIT_MS);
    }
  }, 250);

  function submitAnswer(selectedOption, isCorrect, responseTimeMs) {
    if (selected) return;
    selected = true;

    clearInterval(timerInterval);
    // Which button the learner actually pressed, in the order they were shown.
    // The main side recomputes the CORRECT position itself; this is only the
    // pick side of the bias audit.
    const selectedOptionIndex = selectedOption
      ? task.options.indexOf(selectedOption)
      : null;
    onAnswer({
      taskId: task.id,
      selectedAnswer: selectedOption || '',
      selectedOptionIndex: selectedOptionIndex >= 0 ? selectedOptionIndex : null,
      isCorrect,
      responseTimeMs,
      attemptedAt: new Date().toISOString()
    });
  }

  // Option selection
  optionGrid.addEventListener('click', (e) => {
    if (selected) return;

    const btn = e.target.closest('.option-btn');
    if (!btn) return;

    const selectedOption = btn.getAttribute('data-option');
    const isCorrect = selectedOption === task.correctAnswer;
    const responseTimeMs = Date.now() - startedAt;

    // Disable all options
    optionGrid.querySelectorAll('.option-btn').forEach(b => {
      b.disabled = true;
    });

    // Apply visual feedback (gentle, non-harsh)
    optionGrid.querySelectorAll('.option-btn').forEach(b => {
      const opt = b.getAttribute('data-option');
      if (opt === task.correctAnswer) {
        b.classList.add('is-correct');
      } else if (opt === selectedOption) {
        b.classList.add('is-incorrect');
      } else {
        b.classList.add('is-muted');
      }
    });

    // Advance after brief feedback delay
    setTimeout(() => {
      submitAnswer(selectedOption, isCorrect, responseTimeMs);
    }, FEEDBACK_DELAY_MS);
  });
}

function categoryLabel(category) {
  const labels = {
    phoneme_identification: 'Sound Detective',
    letter_sound_matching: 'Letter Explorer',
    word_decoding: 'Word Wizard',
    syllable_counting: 'Syllable Counter',
    rhyme_recognition: 'Rhyme Finder',
    sentence_completion: 'Sentence Builder'
  };
  return labels[category] || 'Reading';
}

function formatTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${seconds}s`;
}