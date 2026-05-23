/**
 * @file llm-provider.interface.ts
 * @description Abstract interface for LLM providers (Groq, Ollama, etc.).
 *
 * WHY an interface? The AI module needs to work with multiple LLM backends
 * (cloud Groq, local Ollama). By coding against an interface, the AiService
 * doesn't care which provider is active -- it just calls call(prompt).
 */
export interface LlmProvider {
  /**
   * Send a prompt to the LLM and return its text response.
   * Returns null if the call fails or the provider is unavailable.
   */
  call(prompt: string): Promise<string | null>;

  /** Whether this provider has the required configuration to make calls. */
  isAvailable(): boolean;

  /** Human-readable name for logging (e.g. "Groq", "Ollama"). */
  getName(): string;
}
