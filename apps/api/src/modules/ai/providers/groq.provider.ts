/**
 * @file groq.provider.ts
 * @description LLM provider backed by the Groq cloud API.
 *
 * Wraps the Groq SDK for fast cloud-based inference. Requires GROQ_API_KEY
 * to be set. Falls back gracefully (isAvailable() returns false) when
 * no key is provided.
 */
import { Injectable, Logger } from '@nestjs/common';
import { LlmProvider } from './llm-provider.interface';
import Groq from 'groq-sdk';

@Injectable()
export class GroqProvider implements LlmProvider {
  private readonly logger = new Logger(GroqProvider.name);
  private readonly client: Groq | null;
  private readonly model: string;

  constructor(apiKey: string | undefined, model?: string) {
    this.client = apiKey ? new Groq({ apiKey }) : null;
    this.model = model || 'llama-3.3-70b-versatile';
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  getName(): string {
    return 'Groq';
  }

  async call(prompt: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 512,
      });

      return response.choices[0]?.message?.content || null;
    } catch (error: any) {
      this.logger.warn(`Groq API call failed: ${error?.message || 'Unknown error'}`);
      return null;
    }
  }
}
