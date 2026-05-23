import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ConfigService } from '@nestjs/config';
import { LlmProvider } from './providers/llm-provider.interface';
import { GroqProvider } from './providers/groq.provider';
import { OllamaProvider } from './providers/ollama.provider';

/**
 * Factory that selects the first available LLM provider based on env vars.
 *
 * Priority:
 *   1. Groq (cloud) -- if GROQ_API_KEY is set
 *   2. Ollama (local) -- if OLLAMA_BASE_URL is set
 *   3. null -- statistical fallback only
 */
const llmProviderFactory = {
  provide: 'LLM_PROVIDER',
  useFactory: (configService: ConfigService): LlmProvider | null => {
    const groqApiKey = configService.get<string>('GROQ_API_KEY');
    const groqModel = configService.get<string>('GROQ_MODEL', 'llama-3.3-70b-versatile');
    const ollamaBaseUrl = configService.get<string>('OLLAMA_BASE_URL');
    const ollamaModel = configService.get<string>('OLLAMA_MODEL', 'llama3.1');

    const groq = new GroqProvider(groqApiKey, groqModel);
    if (groq.isAvailable()) {
      return groq;
    }

    const ollama = new OllamaProvider(ollamaBaseUrl, ollamaModel);
    if (ollama.isAvailable()) {
      return ollama;
    }

    return null;
  },
  inject: [ConfigService],
};

@Module({
  imports: [PrismaModule, TelemetryModule],
  controllers: [AiController],
  providers: [AiService, llmProviderFactory],
  exports: [AiService],
})
export class AiModule {}
