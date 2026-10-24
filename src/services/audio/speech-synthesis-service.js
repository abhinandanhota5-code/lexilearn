/**
 * Speech Synthesis Service
 * Provides text-to-speech capabilities for LexiLearn
 * Uses browser's Web Speech API with fallback support
 */

export class SpeechSynthesisService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.isAvailable = !!this.synth;
    this.currentUtterance = null;
    this.isSpeaking = false;
    this.isPaused = false;
    this.onSpeakingChange = null;
  }

  /**
   * Check if speech synthesis is available
   */
  isSupported() {
    return this.isAvailable;
  }

  /**
   * Speak text with options
   */
  async speak(text, options = {}) {
    if (!this.isAvailable) {
      console.warn('Speech synthesis not available');
      return false;
    }

    // Cancel any ongoing speech
    this.stop();

    const {
      rate = 1,
      pitch = 1,
      volume = 1,
      lang = 'en-US',
      onEnd = null,
      onStart = null,
      onError = null
    } = options;

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.max(0.1, Math.min(2, rate));
      utterance.pitch = Math.max(0.1, Math.min(2, pitch));
      utterance.volume = Math.max(0, Math.min(1, volume));
      utterance.lang = lang;

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.isPaused = false;
        this._notifyStateChange();
        if (onStart) onStart();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.isPaused = false;
        this.currentUtterance = null;
        this._notifyStateChange();
        if (onEnd) onEnd();
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        this.isPaused = false;
        this.currentUtterance = null;
        this._notifyStateChange();
        console.error('Speech synthesis error:', event.error);
        if (onError) onError(event.error);
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
      return true;
    } catch (err) {
      console.error('Failed to speak:', err);
      if (onError) onError(err.message);
      return false;
    }
  }

  /**
   * Stop current speech
   */
  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.isPaused = false;
      this.currentUtterance = null;
      this._notifyStateChange();
    }
  }

  /**
   * Pause/resume speech
   */
  togglePause() {
    if (!this.synth || !this.isSpeaking) return false;

    if (this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
    } else {
      this.synth.pause();
      this.isPaused = true;
    }
    this._notifyStateChange();
    return true;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isSpeaking: this.isSpeaking,
      isPaused: this.isPaused,
      isAvailable: this.isAvailable
    };
  }

  /**
   * Set callback for state changes
   */
  onStateChange(callback) {
    this.onSpeakingChange = callback;
  }

  _notifyStateChange() {
    if (this.onSpeakingChange) {
      this.onSpeakingChange(this.getState());
    }
  }
}

/**
 * Global singleton instance
 */
let instance = null;

export function getSpeechSynthesisService() {
  if (!instance) {
    instance = new SpeechSynthesisService();
  }
  return instance;
}
