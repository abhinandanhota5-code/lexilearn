/**
 * TTS Service (§6C)
 *
 * `ITTSService` — abstract interface.
 * `WebSpeechTTSService` — renderer implementation over `window.speechSynthesis`
 * with graceful fallback (no API / no voices → speak() resolves `supported:false`).
 * Rate comes from `accommodations.audioNarrationSpeed`.
 *
 * The service is an accessibility modality only — never a diagnostic tool.
 */

export class ITTSService {
  /**
   * @returns {Promise<{ supported: boolean, reason?: string, voices?: string[] }>}
   */
  async checkSupport() {
    throw new Error('ITTSService.checkSupport() must be implemented.');
  }

  /**
   * Speak a prompt.
   * @param {string} text
   * @param {object} [opts] { rate, onEnd, onError }
   * @returns {Promise<{ ok: boolean, cancelled?: boolean }>}
   */
  async speak(text, opts = {}) {
    throw new Error('ITTSService.speak() must be implemented.');
  }

  /** Cancel current utterance(s). */
  cancel() {
    throw new Error('ITTSService.cancel() must be implemented.');
  }
}

/**
 * Renderer-side TTS using the Web Speech API. Created lazily in the renderer
 * so importing this module in main/Node is harmless (window refs guarded).
 */
export class WebSpeechTTSService extends ITTSService {
  constructor({ rate = 0.85 } = {}) {
    super();
    this._rate = rate;
    this._voices = null;
  }

  _synth() {
    return typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null;
  }

  _loadVoices() {
    const synth = this._synth();
    if (!synth) return [];
    const voices = synth.getVoices();
    if (voices && voices.length > 0) {
      this._voices = voices;
    }
    return this._voices || [];
  }

  async checkSupport() {
    const synth = this._synth();
    if (!synth) return { supported: false, reason: 'no_speech_synthesis' };
    const voices = this._loadVoices();
    return {
      supported: true,
      voices: voices.map((v) => v.lang)
    };
  }

  /**
   * Speak a prompt using the Web Speech API.
   * Resolves immediately with { ok:false } when unsupported.
   */
  async speak(text, opts = {}) {
    const synth = this._synth();
    if (!synth) {
      opts.onError?.(new Error('speechSynthesis unavailable'));
      return { ok: false };
    }
    this._loadVoices();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = opts.rate ?? this._rate;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = 'en-US';

    return await new Promise((resolve) => {
      utterance.onend = () => {
        opts.onEnd?.();
        resolve({ ok: true });
      };
      utterance.onerror = (err) => {
        opts.onError?.(err);
        resolve({ ok: false });
      };
      synth.speak(utterance);
    });
  }

  cancel() {
    const synth = this._synth();
    if (synth) synth.cancel();
  }
}

/**
 * A no-op fallback injected when TTS cannot be created.
 */
export class NullTTSService extends ITTSService {
  async checkSupport() {
    return { supported: false, reason: 'disabled' };
  }

  async speak() {
    return { ok: false };
  }

  cancel() {}
}