import { getGroqClient } from './client';
import { groqConfig } from './config';
import type {
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from './types';

export class GroqService {
  /**
   * Send a chat completion request to Groq
   */
  static async createChatCompletion(
    request: ChatCompletionRequest,
    apiKey?: string
  ): Promise<ChatCompletionResponse> {
    try {
      const client = getGroqClient();
      const key = apiKey || client.apiKey;
      
      if (!key) {
        throw new Error('Groq API key is required');
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: request.model || groqConfig.defaultModel,
          messages: request.messages,
          temperature: request.temperature ?? groqConfig.defaultTemperature,
          max_tokens: request.max_tokens || groqConfig.defaultMaxTokens,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        id: data.id,
        object: data.object,
        created: data.created,
        model: data.model,
        choices: data.choices.map((choice: any) => ({
          index: choice.index,
          message: choice.message as ChatMessage,
          finish_reason: choice.finish_reason || 'stop',
        })),
        usage: data.usage ? {
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens,
        } : undefined,
      };
    } catch (error: any) {
      throw new Error(`Groq Chat Completion Error: ${error.message}`);
    }
  }

  /**
   * Stream a chat completion response from Groq
   */
  static async createChatCompletionStream(
    request: ChatCompletionRequest,
    apiKey?: string
  ): Promise<Response> {
    try {
      const client = getGroqClient();
      const key = apiKey || client.apiKey;
      
      if (!key) {
        throw new Error('Groq API key is required');
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: request.model || groqConfig.defaultModel,
          messages: request.messages,
          temperature: request.temperature ?? groqConfig.defaultTemperature,
          max_tokens: request.max_tokens || groqConfig.defaultMaxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errorData}`);
      }

      return response;
    } catch (error: any) {
      console.error('[Groq] Full error details:', error);
      throw new Error(`Groq Chat Stream Error: ${error.message} (Status: ${error.status || 'unknown'})`);
    }
  }

  /**
   * Validate a Groq API key
   */
  static async validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return { valid: true };
      }

      const errorData = await response.json().catch(() => ({}));
      return {
        valid: false,
        error: errorData.error?.message || `HTTP ${response.status}`,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Failed to validate API key',
      };
    }
  }
}
