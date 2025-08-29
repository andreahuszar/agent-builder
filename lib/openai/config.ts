export const openAIConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  organization: process.env.OPENAI_ORG_ID,
  defaultModel: process.env.OPENAI_MODEL || 'gpt-4-turbo',
  defaultMaxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096', 10),
  defaultTemperature: 0.7,
};

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!openAIConfig.apiKey) {
    errors.push('OPENAI_API_KEY is not set in environment variables');
  }

  if (openAIConfig.apiKey && !openAIConfig.apiKey.startsWith('sk-')) {
    errors.push('Invalid OpenAI API key format');
  }

  if (openAIConfig.defaultMaxTokens < 1 || openAIConfig.defaultMaxTokens > 128000) {
    errors.push('OPENAI_MAX_TOKENS must be between 1 and 128000');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export const AVAILABLE_MODELS = [
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', maxTokens: 128000 },
  { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo Preview', maxTokens: 128000 },
  { id: 'gpt-4', name: 'GPT-4', maxTokens: 8192 },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', maxTokens: 16385 },
  { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16K', maxTokens: 16385 },
];

export const RATE_LIMITS = {
  requestsPerMinute: 60,
  tokensPerMinute: 90000,
  requestsPerDay: 10000,
};