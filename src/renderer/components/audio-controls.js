/**
 * Audio Controls Component
 * Provides UI for tap-to-hear, replay, and mute controls
 */

import { getSpeechSynthesisService } from '../../services/audio/speech-synthesis-service.js';

export function renderAudioControls(container, text, options = {}) {
  const {
    autoRead = false,
    onStateChange = null,
    className = 'audio-controls'
  } = options;

  const speechService = getSpeechSynthesisService();

  if (!speechService.isSupported()) {
    return null;
  }

  const controlsDiv = document.createElement('div');
  controlsDiv.className = className;
  controlsDiv.innerHTML = `
    <div class="audio-button-group">
      <button type="button" class="audio-btn audio-btn-play" title="Hear this read aloud" aria-label="Play audio">
        🔊 Hear
      </button>
      <button type="button" class="audio-btn audio-btn-pause" title="Pause audio" aria-label="Pause audio" style="display: none;">
        ⏸ Pause
      </button>
      <button type="button" class="audio-btn audio-btn-stop" title="Stop audio" aria-label="Stop audio" style="display: none;">
        ⏹ Stop
      </button>
    </div>
  `;

  const playBtn = controlsDiv.querySelector('.audio-btn-play');
  const pauseBtn = controlsDiv.querySelector('.audio-btn-pause');
  const stopBtn = controlsDiv.querySelector('.audio-btn-stop');

  function updateButtons(state) {
    if (state.isSpeaking) {
      playBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-flex';
      stopBtn.style.display = 'inline-flex';
      pauseBtn.textContent = state.isPaused ? '▶ Resume' : '⏸ Pause';
    } else {
      playBtn.style.display = 'inline-flex';
      pauseBtn.style.display = 'none';
      stopBtn.style.display = 'none';
    }
  }

  playBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await speechService.speak(text, {
      rate: 0.9,
      onEnd: () => updateButtons(speechService.getState()),
      onError: (err) => console.error('Speech error:', err)
    });
    updateButtons(speechService.getState());
  });

  pauseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    speechService.togglePause();
    updateButtons(speechService.getState());
  });

  stopBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    speechService.stop();
    updateButtons(speechService.getState());
  });

  // Listen for state changes from other sources
  speechService.onStateChange((state) => {
    updateButtons(state);
    if (onStateChange) onStateChange(state);
  });

  if (autoRead && !speechService.isSpeaking) {
    setTimeout(async () => {
      await speechService.speak(text, { rate: 0.9 });
    }, 500);
  }

  container.appendChild(controlsDiv);
  return controlsDiv;
}
