import { getOpenAIClient } from './client';
import { openAIConfig } from './config';
import type {
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  CompletionRequest,
  CompletionResponse,
} from './types';

export class OpenAIService {
  /**
   * Send a chat completion request to OpenAI
   */
  static async createChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    try {
      const client = getOpenAIClient();
      
      const completion = await client.chat.completions.create({
        model: request.model || openAIConfig.defaultModel,
        messages: request.messages,
        temperature: request.temperature ?? openAIConfig.defaultTemperature,
        max_tokens: request.max_tokens || openAIConfig.defaultMaxTokens,
        stream: false,
      });

      return {
        id: completion.id,
        object: completion.object,
        created: completion.created,
        model: completion.model,
        choices: completion.choices.map(choice => ({
          index: choice.index,
          message: choice.message as ChatMessage,
          finish_reason: choice.finish_reason || 'stop',
        })),
        usage: completion.usage ? {
          prompt_tokens: completion.usage.prompt_tokens,
          completion_tokens: completion.usage.completion_tokens,
          total_tokens: completion.usage.total_tokens,
        } : undefined,
      };
    } catch (error: any) {
      throw new Error(`OpenAI Chat Completion Error: ${error.message}`);
    }
  }

  /**
   * Stream a chat completion response from OpenAI
   */
  static async createChatCompletionStream(
    request: ChatCompletionRequest
  ): Promise<AsyncIterable<any>> {
    try {
      const client = getOpenAIClient();
      
      const stream = await client.chat.completions.create({
        model: request.model || openAIConfig.defaultModel,
        messages: request.messages,
        temperature: request.temperature ?? openAIConfig.defaultTemperature,
        max_tokens: request.max_tokens || openAIConfig.defaultMaxTokens,
        stream: true,
      });

      return stream;
    } catch (error: any) {
      throw new Error(`OpenAI Chat Stream Error: ${error.message}`);
    }
  }

  /**
   * Create a text completion (legacy endpoint, use chat for newer models)
   */
  static async createCompletion(
    request: CompletionRequest
  ): Promise<CompletionResponse> {
    try {
      const client = getOpenAIClient();
      
      // For newer models, convert to chat format
      if (request.model?.includes('gpt')) {
        const chatRequest: ChatCompletionRequest = {
          messages: [{ role: 'user', content: request.prompt }],
          model: request.model,
          max_tokens: request.max_tokens,
          temperature: request.temperature,
        };
        
        const chatResponse = await this.createChatCompletion(chatRequest);
        
        return {
          id: chatResponse.id,
          object: 'text_completion',
          created: chatResponse.created,
          model: chatResponse.model,
          choices: chatResponse.choices.map(choice => ({
            text: choice.message.content,
            index: choice.index,
            logprobs: null,
            finish_reason: choice.finish_reason,
          })),
          usage: chatResponse.usage,
        };
      }

      // For older models (if needed)
      throw new Error('Legacy completion models not supported. Please use chat models.');
    } catch (error: any) {
      throw new Error(`OpenAI Completion Error: ${error.message}`);
    }
  }

  /**
   * Validate an API key by attempting to list models
   */
  static async validateApiKey(apiKey?: string): Promise<boolean> {
    try {
      const client = apiKey ? new (await import('openai')).default({
        apiKey,
      }) : getOpenAIClient();
      
      await client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get available models
   */
  static async getAvailableModels(): Promise<string[]> {
    try {
      const client = getOpenAIClient();
      const models = await client.models.list();
      
      return models.data
        .filter(model => model.id.includes('gpt'))
        .map(model => model.id)
        .sort();
    } catch (error: any) {
      throw new Error(`Failed to fetch models: ${error.message}`);
    }
  }

  /**
   * Calculate token count for a message (approximate)
   */
  static estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}