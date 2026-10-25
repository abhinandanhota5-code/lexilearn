/**
 * Local AI Integration (Ollama-based)
 * Generates context-aware hints, explanations, and alternative examples.
 * Deterministic, local-first, with graceful fallback to static content.
 */

import { Ollama } from 'ollama';

export class LocalAIService {
  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
    this.ollama = new Ollama({ baseURL: baseUrl });
    this.model = 'mistral'; // Default model; configure via environment
    this.timeout = 5000; // 5s timeout for all AI requests
    this.enabled = true;
  }

  /**
   * Check if Ollama service is available.
   * Non-fatal: if unavailable, the app works with static content.
   * @returns {Promise<boolean>}
   */
  async checkAvailability() {
    try {
      const response = await Promise.race([
        fetch(`${this.baseUrl}/api/tags`),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), this.timeout)
        )
      ]);
      return response.ok;
    } catch (err) {
      console.warn('Ollama unavailable (non-fatal):', err.message);
      this.enabled = false;
      return false;
    }
  }

  /**
   * Generate a hint for a learning activity.
   * Falls back to static hint if AI unavailable.
   * @param {string} prompt - The question
   * @param {string} context - Lesson context
   * @returns {Promise<string>} Hint text
   */
  async generateHint(prompt, context = '') {
    if (!this.enabled) {
      return this.fallbackHint(prompt);
    }

    try {
      const message = `You are a helpful tutor for a child learning to read.
The child is working on: ${context || 'a reading activity'}
The question is: ${prompt}

Give a SHORT, encouraging hint (1-2 sentences max) that helps without giving the answer away.
Use simple words. Be supportive and positive.`;

      const response = await Promise.race([
        this.ollama.generate({
          model: this.model,
          prompt: message,
          stream: false
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI timeout')), this.timeout)
        )
      ]);

      return response?.response?.trim() || this.fallbackHint(prompt);
    } catch (err) {
      console.warn('AI hint generation failed (using fallback):', err.message);
      return this.fallbackHint(prompt);
    }
  }

  /**
   * Generate an explanation for a lesson.
   * Falls back to static explanation if AI unavailable.
   * @param {string} concept - What to explain
   * @param {string} grade - Grade level (e.g., '2nd Grade')
   * @returns {Promise<string>} Explanation text
   */
  async generateExplanation(concept, grade = '2nd Grade') {
    if (!this.enabled) {
      return this.fallbackExplanation(concept);
    }

    try {
      const ageGroup = grade.toLowerCase();
      const message = `You are a reading tutor for a ${ageGroup} child with dyslexia.
Explain this concept in a way that is easy to understand:
"${concept}"

Use very simple words. Make it short (3-4 sentences). Use an example if helpful.
Be encouraging. Never mention dyslexia or learning disabilities.`;

      const response = await Promise.race([
        this.ollama.generate({
          model: this.model,
          prompt: message,
          stream: false
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI timeout')), this.timeout)
        )
      ]);

      return response?.response?.trim() || this.fallbackExplanation(concept);
    } catch (err) {
      console.warn('AI explanation generation failed (using fallback):', err.message);
      return this.fallbackExplanation(concept);
    }
  }

  /**
   * Generate an alternative example for practice.
   * Falls back to static example if AI unavailable.
   * @param {string} category - e.g., 'short_a_sound', 'word_family_at'
   * @param {string} grade - Grade level
   * @returns {Promise<string>} Example text
   */
  async generateExample(category, grade = '2nd Grade') {
    if (!this.enabled) {
      return this.fallbackExample(category);
    }

    try {
      const message = `You are creating a reading practice example for a ${grade} child.
Category: ${category}

Give ONE clear, simple example with an explanation (2 sentences max).
Make it age-appropriate and encouraging.`;

      const response = await Promise.race([
        this.ollama.generate({
          model: this.model,
          prompt: message,
          stream: false
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI timeout')), this.timeout)
        )
      ]);

      return response?.response?.trim() || this.fallbackExample(category);
    } catch (err) {
      console.warn('AI example generation failed (using fallback):', err.message);
      return this.fallbackExample(category);
    }
  }

  /**
   * Static fallback hints (used when AI unavailable).
   */
  fallbackHint(prompt) {
    const hints = [
      'Read the question carefully and think about what you learned.',
      'Say the sounds in your head first.',
      'Look at each choice one by one.',
      'Which one sounds right to you?',
      'Try reading it out loud.',
      'Does it make sense? Check if you\'re not sure.'
    ];
    return hints[Math.floor(Math.random() * hints.length)];
  }

  /**
   * Static fallback explanations.
   */
  fallbackExplanation(concept) {
    const explanations = {
      'short_a_sound': 'The short "a" sound is like in the word "apple". It\'s a quick sound, not a long one.',
      'word_families': 'Words that rhyme belong to the same family. They end with the same letters.',
      'syllables': 'Words are made of smaller parts called syllables. You can clap each part.',
      'blending': 'Blending is when you say the sounds quickly together to make a word.'
    };
    return explanations[concept] || 'Let me show you another way to think about this.';
  }

  /**
   * Static fallback examples.
   */
  fallbackExample(category) {
    const examples = {
      'short_a_sound': 'Cat, hat, mat, sat — they all have the short "a" sound.',
      'word_family_at': 'The -at family: cat, bat, hat, mat, sat. They all rhyme!',
      'consonant_blend': 'The letters "st" make one sound at the start of "stop".',
      'syllable_break': 'Rab-bit has 2 claps. But-ter-fly has 3 claps.'
    };
    return examples[category] || 'Here\'s an example to help you practice.';
  }
}

// Create singleton instance
let aiService = null;

/**
 * Get or create the AI service instance.
 * @param {string} baseUrl - Ollama server URL
 * @returns {LocalAIService}
 */
export function getAIService(baseUrl = 'http://localhost:11434') {
  if (!aiService) {
    aiService = new LocalAIService(baseUrl);
  }
  return aiService;
}
