import { createGoogleGenerativeAI } from '@ai-sdk/google';

export type AIProvider = 'google' | 'openai' | 'anthropic';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
}

/**
 * Get AI provider instance based on configuration.
 * Currently supports Google Gemini.
 * Additional providers (OpenAI, Anthropic) can be added by installing their SDKs.
 */
export function getAIProvider(config: AIConfig) {
  switch (config.provider) {
    case 'google':
      return createGoogleGenerativeAI({
        apiKey: config.apiKey,
      });
    case 'openai':
      // To use OpenAI, install @ai-sdk/openai
      throw new Error('OpenAI provider not configured. Install @ai-sdk/openai and add implementation.');
    case 'anthropic':
      // To use Anthropic, install @ai-sdk/anthropic
      throw new Error('Anthropic provider not configured. Install @ai-sdk/anthropic and add implementation.');
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}

/**
 * Get AI config from environment variables.
 */
export function getAIConfigFromEnv(env: {
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  AI_PROVIDER?: string;
  AI_MODEL?: string;
}): AIConfig {
  const provider = (env.AI_PROVIDER || 'google') as AIProvider;
  const model = env.AI_MODEL || 'gemini-2.0-flash';

  let apiKey: string;
  switch (provider) {
    case 'google':
      apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY || '';
      if (!apiKey) {
        throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is required');
      }
      break;
    default:
      throw new Error(`API key configuration for ${provider} not implemented`);
  }

  return { provider, model, apiKey };
}

/**
 * Get the model ID for the configured provider.
 */
export function getModelId(config: AIConfig): string {
  // For Google, the model name is used directly
  return config.model;
}
