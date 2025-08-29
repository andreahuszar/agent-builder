import { NextRequest, NextResponse } from 'next/server';
import { OpenAIService, validateConfig } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    // If no API key provided, validate the server configuration
    if (!apiKey) {
      const configValidation = validateConfig();
      
      if (!configValidation.valid) {
        return NextResponse.json({
          valid: false,
          error: configValidation.errors.join(', '),
          usingServerKey: false,
        });
      }

      // Test the connection with server API key
      try {
        const isValid = await OpenAIService.validateApiKey();
        
        return NextResponse.json({
          valid: isValid,
          error: isValid ? undefined : 'Failed to connect to OpenAI',
          usingServerKey: true,
        });
      } catch (validationError: any) {
        // More specific error handling for server key validation
        return NextResponse.json({
          valid: false,
          error: 'Server API key validation failed',
          usingServerKey: true,
        });
      }
    }

    // Validate provided API key
    try {
      const isValid = await OpenAIService.validateApiKey(apiKey);
      
      return NextResponse.json({
        valid: isValid,
        error: isValid ? undefined : 'Invalid API key',
        usingServerKey: false,
      });
    } catch (validationError: any) {
      // Handle specific OpenAI errors
      let errorMessage = 'Invalid API key';
      if (validationError.message?.includes('401')) {
        errorMessage = 'Invalid API key - authentication failed';
      } else if (validationError.message?.includes('429')) {
        errorMessage = 'Rate limit exceeded - please try again later';
      } else if (validationError.message?.includes('network')) {
        errorMessage = 'Network error - please check your connection';
      }
      
      return NextResponse.json({
        valid: false,
        error: errorMessage,
        usingServerKey: false,
      });
    }
  } catch (error: any) {
    console.error('Validation API Error:', error);
    
    return NextResponse.json({
      valid: false,
      error: error.message || 'Failed to validate API key',
      usingServerKey: false,
    });
  }
}

export async function GET() {
  try {
    // Check if server has API key configured
    const configValidation = validateConfig();
    
    return NextResponse.json({
      configured: configValidation.valid,
      errors: configValidation.errors,
      model: process.env.OPENAI_MODEL || 'gpt-4',
      maxTokens: process.env.OPENAI_MAX_TOKENS || '2000',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to check configuration' },
      { status: 500 }
    );
  }
}