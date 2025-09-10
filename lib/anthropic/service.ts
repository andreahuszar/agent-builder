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
        messages: request.messages as any || [],
        max_tokens: request.max_tokens || anthropicConfig.defaultMaxTokens,
        temperature: request.temperature ?? anthropicConfig.defaultTemperature,
        system: request.system,
        top_p: request.top_p,
        top_k: request.top_k,
        stop_sequences: request.stop_sequences,
      } as any);
      
      return response as AnthropicResponse;
    } catch (error: any) {
      throw new Error(`Anthropic Message Error: ${error.message}`);
    }
  }
  
  /**
   * Stream a message response from Claude
   */
  static async createMessageStream(request: Partial<AnthropicRequest>): Promise<any> {
    try {
      const client = getAnthropicClient();
      
      const stream = await client.messages.create({
        model: request.model || anthropicConfig.defaultModel,
        messages: request.messages as any || [],
        max_tokens: request.max_tokens || anthropicConfig.defaultMaxTokens,
        temperature: request.temperature ?? anthropicConfig.defaultTemperature,
        system: request.system,
        stream: true,
      } as any);
      
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
      // Validate format
      if (!isValidImageFormat(request.mediaType)) {
        throw new Error(`Unsupported format: ${request.mediaType}`);
      }
      
      // Build the message content
      const content: MessageContent[] = [];
      
      // Handle PDFs and images
      if (request.mediaType === 'application/pdf') {
        // For PDFs, we'll send as document type (Claude can handle PDFs)
        const documentContent: any = {
          type: 'document',
          source: {
            type: 'base64',
            media_type: request.mediaType,
            data: request.image,
          },
        };
        content.push(documentContent);
      } else {
        // For images, use image type
        const imageContent: ImageContent = {
          type: 'image',
          source: {
            type: 'base64',
            media_type: request.mediaType as any,
            data: request.image,
          },
        };
        content.push(imageContent);
      }
      
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
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf'
  ): Promise<InvoiceExtractionResult> {
    try {
      const extractionPrompt = `
        You are an expert AP invoice extractor. Analyze this invoice image and extract all relevant information.
        
        Return STRICT JSON that matches this schema (omit fields you cannot read confidently; do not guess; numbers are JSON numbers):
        
        {
          "invoice_headers": {
            "type": "invoice|credit_memo|debit_memo",
            "vendor_name_snapshot": "string",
            "vendor_tax_id_snapshot": "string",
            "vendor_address_snapshot": "string", 
            "invoice_number": "string",
            "invoice_date": "YYYY-MM-DD",
            "due_date": "YYYY-MM-DD",
            "currency": "GBP|EUR|USD|other ISO code",
            "payment_terms_text": "string",
            "po_numbers_cached": ["string", "..."],
            "subtotal": number,
            "tax_total": number,
            "tax_rate": number,
            "discount_total": number,
            "total": number
          },
          "invoice_lines": [
            {
              "line_no": number,
              "description": "string",
              "uom": "string",
              "qty": number,
              "unit_price": number,
              "net_amount": number,
              "tax_amount": number,
              "line_total": number,
              "po_number_snapshot": "string"
            }
          ],
          "customer": {
            "name": "string",
            "address": "string"
          },
          "warnings": [ 
            { 
              "code": "string", 
              "message": "string" 
            } 
          ],
          "confidence_overall": number
        }
        
        Normalization rules:
        - Dates: ISO 8601 format (YYYY-MM-DD)
        - Currency: Map symbols to ISO codes (£→GBP, €→EUR, $→USD, ¥→JPY)
        - Numbers: Use '.' as decimal separator, no thousands separators
        - Keep negative signs for credit amounts
        - line_no starts at 1 and increments
        - uom defaults to "EA" if not specified
        - tax_rate: Express as percentage (e.g., 20 for 20%, 7.5 for 7.5%)
        - If tax percentage is shown (e.g., "VAT 20%", "Tax (20%)", "20.0% VAT"), extract as tax_rate: 20
        - IMPORTANT: Extract tax_rate even if tax_total is 0 (e.g., "Tax (20%) £0.00" means tax_rate: 20, tax_total: 0)
        - If only tax amount shown, calculate rate from subtotal if possible
        - Omit fields if unclear rather than guessing
        
        Return STRICT JSON only, no additional text.
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
      
      // Map new format to legacy format for backward compatibility
      if (extractedData.invoice_headers && !extractedData.invoice) {
        extractedData.vendor = {
          name: extractedData.invoice_headers.vendor_name_snapshot,
          taxId: extractedData.invoice_headers.vendor_tax_id_snapshot || '',
          address: extractedData.invoice_headers.vendor_address_snapshot || '',
        };
        
        extractedData.invoice = {
          number: extractedData.invoice_headers.invoice_number,
          date: extractedData.invoice_headers.invoice_date,
          dueDate: extractedData.invoice_headers.due_date,
          poNumber: extractedData.invoice_headers.po_numbers_cached?.[0],
        };
        
        extractedData.totals = {
          subtotal: extractedData.invoice_headers.subtotal,
          tax: extractedData.invoice_headers.tax_total || 0,
          taxRate: extractedData.invoice_headers.tax_rate || null,
          discount: extractedData.invoice_headers.discount_total || 0,
          total: extractedData.invoice_headers.total,
          currency: extractedData.invoice_headers.currency,
        };
        
        extractedData.paymentTerms = extractedData.invoice_headers.payment_terms_text;
        extractedData.confidence = extractedData.confidence_overall || 0.95;
        
        // Map invoice_lines to items for backward compatibility
        if (extractedData.invoice_lines) {
          extractedData.items = extractedData.invoice_lines.map(line => ({
            description: line.description,
            quantity: line.qty,
            unitPrice: line.unit_price,
            amount: line.net_amount,
            tax: line.tax_amount,
          }));
        }
      }
      
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
            media_type: image.mediaType as any,
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
      
      // Use a minimal request to validate the key
      // This will fail with 401 if the key is invalid
      await client.messages.create({
        model: anthropicConfig.fastModel,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
        metadata: { user_id: 'validation-check' }
      });
      
      return true;
    } catch (error: any) {
      console.error('Anthropic API key validation error:', error.message);
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