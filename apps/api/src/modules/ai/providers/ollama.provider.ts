/**
 * @file ollama.provider.ts
 * @description LLM provider backed by a local Ollama instance.
 *
 * Uses native fetch to call the Ollama REST API. Requires OLLAMA_BASE_URL
 * to be set (e.g. "http://localhost:11434"). Falls back gracefully
 * (isAvailable() returns false) when no URL is provided.
 */
import { Injectable, Logger } from '@nestjs/common';
import { LlmProvider } from './llm-provider.interface';

@Injectable()
export class OllamaProvider implements LlmProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(baseUrl: string | undefined, model?: string) {
    this.baseUrl = baseUrl || '';
    this.model = model || 'llama3.1';
  }

  isAvailable(): boolean {
    return this.baseUrl.length > 0;
  }

  getName(): string {
    return 'Ollama';
  }

  async call(prompt: string): Promise<string | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 512,
          },
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        this.logger.warn(
          `Ollama API returned status ${response.status}: ${response.statusText}`,
        );
        return null;
      }

      const data = (await response.json()) as { response?: string };
      return data.response || null;
    } catch (error: any) {
      this.logger.warn(`Ollama API call failed: ${error?.message || 'Unknown error'}`);
      return null;
    }
  }
}
