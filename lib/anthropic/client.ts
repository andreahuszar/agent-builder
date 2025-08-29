import Anthropic from '@anthropic-ai/sdk';

let anthropicClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    
    anthropicClient = new Anthropic({
      apiKey,
      // Optional: Set custom base URL if using a proxy
      // baseURL: process.env.ANTHROPIC_BASE_URL,
    });
  }
  
  return anthropicClient;
}

// Helper to create a client with a specific API key (for validation)
export function createAnthropicClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

// Reset client (useful for testing or when API key changes)
export function resetAnthropicClient(): void {
  anthropicClient = null;
}