import { getAnthropicClient, createAnthropicClient } from './client';
import { anthropicConfig, getModelForUseCase, isValidImageFormat, isValidImageSize } from './config';
import type {
  AnthropicMessage,
  AnthropicRequest,
  AnthropicResponse,
  MessageContent,
  ImageContent,
  InvoiceExtractionResult,
  ImageAnalysisRequest,
  BatchImageAnalysisRequest,
} from './types';

export class AnthropicService {
  /**
   * Send a message to Claude
   */
  static async createMessage(request: Partial<AnthropicRequest>): Promise<AnthropicResponse> {
    try {
      const client = getAnthropicClient();
      
      const response = await client.messages.create({
        model: request.model || anthropicConfig.defaultModel,
        messages: request.messages || [],
        max_tokens: request.max_tokens || anthropicConfig.defaultMaxTokens,
        temperature: request.temperature ?? anthropicConfig.defaultTemperature,
        system: request.system,
        top_p: request.top_p,
        top_k: request.top_k,
        stop_sequences: request.stop_sequences,
      });
      
      return response as AnthropicResponse;
    } catch (error: any) {
      throw new Error(`Anthropic Message Error: ${error.message}`);
    }
  }
  
  /**
   * Stream a message response from Claude
   */
  static async createMessageStream(request: Partial<AnthropicRequest>): Promise<AsyncIterable<any>> {
    try {
      const client = getAnthropicClient();
      
      const stream = await client.messages.create({
        model: request.model || anthropicConfig.defaultModel,
        messages: request.messages || [],
        max_tokens: request.max_tokens || anthropicConfig.defaultMaxTokens,
        temperature: request.temperature ?? anthropicConfig.defaultTemperature,
        system: request.system,
        stream: true,
      });
      
      return stream;
    } catch (error: any) {
      throw new Error(`Anthropic Stream Error: ${error.message}`);
    }
  }
  
  /**
   * Analyze an image with Claude Vision
   */
  static async analyzeImage(request: ImageAnalysisRequest): Promise<AnthropicResponse> {
    try {
      // Validate image format
      if (!isValidImageFormat(request.mediaType)) {
        throw new Error(`Unsupported image format: ${request.mediaType}`);
      }
      
      // Build the message content
      const content: MessageContent[] = [];
      
      // Add the image
      const imageContent: ImageContent = {
        type: 'image',
        source: {
          type: 'base64',
          media_type: request.mediaType,
          data: request.image,
        },
      };
      content.push(imageContent);
      
      // Add the prompt
      const prompt = request.prompt || 'Analyze this image and describe what you see.';
      content.push({
        type: 'text',
        text: prompt,
      });
      
      const message: AnthropicMessage = {
        role: 'user',
        content,
      };
      
      return await this.createMessage({
        model: request.model || getModelForUseCase('vision'),
        messages: [message],
        max_tokens: anthropicConfig.defaultMaxTokens,
        temperature: 0.3, // Lower temperature for analysis
      });
    } catch (error: any) {
      throw new Error(`Image Analysis Error: ${error.message}`);
    }
  }
  
  /**
   * Extract invoice data from an image
   */
  static async extractInvoiceData(
    imageData: string,
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  ): Promise<InvoiceExtractionResult> {
    try {
      const extractionPrompt = `
        Analyze this invoice image and extract all relevant information.
        Return the data in the following JSON format:
        {
          "confidence": <0-1 confidence score>,
          "vendor": {
            "name": "<vendor name>",
            "address": "<full address>",
            "email": "<email>",
            "phone": "<phone>",
            "taxId": "<tax ID>"
          },
          "customer": {
            "name": "<customer name>",
            "address": "<full address>",
            "email": "<email>"
          },
          "invoice": {
            "number": "<invoice number>",
            "date": "<YYYY-MM-DD>",
            "dueDate": "<YYYY-MM-DD>",
            "poNumber": "<PO number if present>"
          },
          "items": [
            {
              "description": "<item description>",
              "quantity": <number>,
              "unitPrice": <number>,
              "amount": <number>,
              "tax": <number if applicable>
            }
          ],
          "totals": {
            "subtotal": <number>,
            "tax": <number>,
            "discount": <number if present>,
            "total": <number>,
            "currency": "<currency code>"
          },
          "paymentTerms": "<payment terms>",
          "notes": "<any additional notes>"
        }
        
        Only include fields that are clearly visible in the invoice.
        For missing fields, omit them from the response.
        Be precise with numbers and dates.
      `;
      
      const response = await this.analyzeImage({
        image: imageData,
        mediaType,
        prompt: extractionPrompt,
        model: anthropicConfig.invoiceExtraction.model,
      });
      
      // Parse the response
      const responseText = response.content[0]?.text || '';
      
      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from response');
      }
      
      const extractedData = JSON.parse(jsonMatch[0]) as InvoiceExtractionResult;
      
      // Add raw text for reference
      extractedData.rawText = responseText;
      
      return extractedData;
    } catch (error: any) {
      throw new Error(`Invoice Extraction Error: ${error.message}`);
    }
  }
  
  /**
   * Analyze multiple images in a single request
   */
  static async analyzeMultipleImages(request: BatchImageAnalysisRequest): Promise<AnthropicResponse> {
    try {
      if (request.images.length > anthropicConfig.vision.maxImagesPerRequest) {
        throw new Error(`Maximum ${anthropicConfig.vision.maxImagesPerRequest} images per request`);
      }
      
      // Build the message content with multiple images
      const content: MessageContent[] = [];
      
      for (const image of request.images) {
        if (!isValidImageFormat(image.mediaType)) {
          throw new Error(`Unsupported image format: ${image.mediaType}`);
        }
        
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: image.mediaType,
            data: image.data,
          },
        });
        
        if (image.prompt) {
          content.push({
            type: 'text',
            text: image.prompt,
          });
        }
      }
      
      const message: AnthropicMessage = {
        role: 'user',
        content,
      };
      
      return await this.createMessage({
        model: request.model || getModelForUseCase('vision'),
        messages: [message],
        max_tokens: anthropicConfig.defaultMaxTokens,
      });
    } catch (error: any) {
      throw new Error(`Batch Image Analysis Error: ${error.message}`);
    }
  }
  
  /**
   * Convert an image file to base64
   */
  static async convertImageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  /**
   * Validate an API key by attempting to send a simple message
   */
  static async validateApiKey(apiKey?: string): Promise<boolean> {
    try {
      const client = apiKey ? createAnthropicClient(apiKey) : getAnthropicClient();
      
      await client.messages.create({
        model: anthropicConfig.fastModel,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10,
      });
      
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get available models (hardcoded since Anthropic doesn't have a list endpoint)
   */
  static getAvailableModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
    ];
  }
  
  /**
   * Estimate token count for text (approximate)
   */
  static estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Estimate tokens for an image
   */
  static estimateImageTokens(): number {
    return anthropicConfig.vision.tokensPerImage;
  }
  
  /**
   * Validate image file before processing
   */
  static validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!isValidImageFormat(file.type)) {
      return {
        valid: false,
        error: `Unsupported format. Supported: ${anthropicConfig.vision.supportedFormats.join(', ')}`,
      };
    }
    
    // Check file size
    if (!isValidImageSize(file.size)) {
      const maxSizeMB = anthropicConfig.vision.maxImageSize / (1024 * 1024);
      return {
        valid: false,
        error: `Image too large. Maximum size: ${maxSizeMB}MB`,
      };
    }
    
    return { valid: true };
  }
}