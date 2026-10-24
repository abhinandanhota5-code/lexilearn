/**
 * Companion Widget — Simple greeting + encouragement
 * No Lottie required — uses emoji and CSS animations
 */

import { AVAILABLE_AVATARS } from '../../../shared/profile-schema.js';

export function mountCompanionGreeting(container, profile) {
  if (!profile?.avatar) return;

  const companion = AVAILABLE_AVATARS.find(a => a.id === profile.avatar);
  if (!companion) return;

  const greeting = document.createElement('div');
  greeting.className = 'companion-greeting';
  greeting.innerHTML = `
    <div class="companion-bubble">
      <div class="companion-emoji">${companion.emoji}</div>
      <div class="companion-text">Hi ${profile.name}! Ready to learn? 🌟</div>
    </div>
  `;

  container.insertBefore(greeting, container.firstChild);
}

export function showCompanionFeedback(container, isCorrect) {
  const feedback = document.createElement('div');
  feedback.className = `companion-feedback ${isCorrect ? 'is-correct' : 'is-retry'}`;

  if (isCorrect) {
    feedback.innerHTML = `
      <div class="feedback-celebration">
        <div class="star star-1">⭐</div>
        <div class="star star-2">⭐</div>
        <div class="star star-3">⭐</div>
        <div class="feedback-text">Amazing! You got it! 🎉</div>
      </div>
    `;
  } else {
    feedback.innerHTML = `
      <div class="feedback-retry">
        <div class="feedback-text">Not quite! Try again? 💙</div>
      </div>
    `;
  }

  document.body.appendChild(feedback);
  setTimeout(() => feedback.remove(), 2000);
}

/**
 * Show mission progress with stars
 */
export function renderMissionProgress(completed, total) {
  const stars = Array(Math.min(completed, total))
    .fill('⭐')
    .join(' ');

  return `
    <div class="mission-progress">
      ${stars || '🌙 Keep going...'}
      <span class="mission-count">${completed}/${total}</span>
    </div>
  `;
}
