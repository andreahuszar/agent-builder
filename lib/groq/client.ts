import { groqConfig, validateConfig } from './config';

let groqClient: any = null;

export function getGroqClient() {
  if (!groqClient) {
    const validation = validateConfig();
    
    if (!validation.valid) {
      throw new Error(`Groq configuration errors: ${validation.errors.join(', ')}`);
    }

    // Groq uses OpenAI-compatible API, so we can use fetch directly
    // or create a simple client wrapper
    groqClient = {
      apiKey: groqConfig.apiKey,
      baseURL: groqConfig.baseURL,
    };
  }

  return groqClient;
}

export function resetClient(): void {
  groqClient = null;
}

export async function testConnection(apiKey?: string): Promise<boolean> {
  try {
    const key = apiKey || groqConfig.apiKey;
    if (!key) return false;

    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Groq connection test failed:', error);
    return false;
  }
}
