/**
 * Abstract interface for LLM providers.
 * Decouples the application logic from the underlying model runner
 * (Ollama, llama.cpp, Apple MLX, or cloud fallback).
 */
export class ILLMProvider {
  /**
   * Health check to verify local availability of the LLM engine and model.
   * @returns {Promise<{ available: boolean, modelName: string, modelInstalled?: boolean, availableModels?: string[], error?: string }>}
   */
  async checkHealth() {
    throw new Error('ILLMProvider.checkHealth() must be implemented by subclass.');
  }

  /**
   * Generate plain text completion.
   * @param {string} prompt
   * @param {object} [options]
   * @param {number} [options.temperature]
   * @param {number} [options.maxTokens]
   * @returns {Promise<string>}
   */
  async generateText(prompt, options = {}) {
    throw new Error('ILLMProvider.generateText() must be implemented by subclass.');
  }

  /**
   * Generate structured JSON output adhering to a specified format.
   * @param {string} prompt
   * @param {object} [schema]
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  async generateStructured(prompt, schema = null, options = {}) {
    throw new Error('ILLMProvider.generateStructured() must be implemented by subclass.');
  }
}
