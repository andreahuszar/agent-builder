import OpenAI from 'openai';
import { openAIConfig, validateConfig } from './config';

let openAIClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openAIClient) {
    const validation = validateConfig();
    
    if (!validation.valid) {
      throw new Error(`OpenAI configuration errors: ${validation.errors.join(', ')}`);
    }

    openAIClient = new OpenAI({
      apiKey: openAIConfig.apiKey,
      organization: openAIConfig.organization,
      dangerouslyAllowBrowser: false, // Only use server-side
    });
  }

  return openAIClient;
}

export function resetClient(): void {
  openAIClient = null;
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = getOpenAIClient();
    // Make a minimal API call to test the connection
    await client.models.list();
    return true;
  } catch (error) {
    console.error('OpenAI connection test failed:', error);
    return false;
  }
}