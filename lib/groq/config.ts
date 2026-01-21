export const groqConfig = {
  apiKey: process.env.GROQ_API_KEY || '',
  defaultModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  defaultMaxTokens: parseInt(process.env.GROQ_MAX_TOKENS || '2048', 10),
  defaultTemperature: 0.7,
  baseURL: 'https://api.groq.com/openai/v1',
};

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!groqConfig.apiKey) {
    errors.push('GROQ_API_KEY is not set in environment variables');
  }

  if (groqConfig.apiKey && groqConfig.apiKey.length < 20) {
    errors.push('Invalid Groq API key format');
  }

  if (groqConfig.defaultMaxTokens < 1 || groqConfig.defaultMaxTokens > 32768) {
    errors.push('GROQ_MAX_TOKENS must be between 1 and 32768');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export const AVAILABLE_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', maxTokens: 32768 },
  { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B Versatile', maxTokens: 32768 },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', maxTokens: 8192 },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', maxTokens: 32768 },
  { id: 'gemma-7b-it', name: 'Gemma 7B IT', maxTokens: 8192 },
];

export const RATE_LIMITS = {
  requestsPerMinute: 30,
  tokensPerMinute: 10000,
  requestsPerDay: 1000,
};
