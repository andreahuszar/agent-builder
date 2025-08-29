// Anthropic API Types with Vision Support

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  source: {
    type: 'base64' | 'url';
    media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    data?: string; // base64 encoded image data
    url?: string; // URL to the image
  };
}

export type MessageContent = TextContent | ImageContent;

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | MessageContent[];
}

export interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
  system?: string;
}

export interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// Invoice Extraction Types
export interface InvoiceVendor {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  taxId?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  tax?: number;
}

export interface InvoiceTotal {
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  currency: string;
}

export interface InvoiceExtractionResult {
  confidence: number;
  vendor?: InvoiceVendor;
  customer?: {
    name: string;
    address?: string;
    email?: string;
  };
  invoice: {
    number: string;
    date: string;
    dueDate?: string;
    poNumber?: string;
  };
  items: InvoiceLineItem[];
  totals: InvoiceTotal;
  paymentTerms?: string;
  notes?: string;
  rawText?: string;
}

export interface AnthropicError {
  error: {
    type: string;
    message: string;
  };
}

export interface ApiKeyValidationResult {
  valid: boolean;
  error?: string;
  models?: string[];
}

// Vision-specific types
export interface ImageAnalysisRequest {
  image: string; // base64 or URL
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  prompt?: string;
  extractInvoice?: boolean;
  model?: string;
}

export interface BatchImageAnalysisRequest {
  images: Array<{
    data: string;
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    prompt?: string;
  }>;
  model?: string;
}

// Supported Claude models (Updated December 2024)
export const CLAUDE_MODELS = {
  // Latest Claude 3.5 models
  SONNET_3_5: 'claude-3-5-sonnet-20241022', // Most capable current model
  HAIKU_3_5: 'claude-3-5-haiku-20241022',   // Fast and efficient
  
  // Legacy models (some deprecated)
  OPUS: 'claude-3-opus-20240229',  // DEPRECATED - will be removed Jan 2026
  SONNET: 'claude-3-sonnet-20240229',
  HAIKU: 'claude-3-haiku-20240307',
  
  // Aliases for latest models
  OPUS_LATEST: 'claude-3-5-sonnet-20241022', // Using Sonnet 3.5 as Opus replacement
  SONNET_LATEST: 'claude-3-5-sonnet-20241022',
  HAIKU_LATEST: 'claude-3-5-haiku-20241022',
} as const;

export type ClaudeModel = typeof CLAUDE_MODELS[keyof typeof CLAUDE_MODELS];