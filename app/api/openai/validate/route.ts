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
        });
      }

      // Test the connection with server API key
      const isValid = await OpenAIService.validateApiKey();
      
      return NextResponse.json({
        valid: isValid,
        error: isValid ? undefined : 'Failed to connect to OpenAI',
        usingServerKey: true,
      });
    }

    // Validate provided API key
    const isValid = await OpenAIService.validateApiKey(apiKey);
    
    return NextResponse.json({
      valid: isValid,
      error: isValid ? undefined : 'Invalid API key',
      usingServerKey: false,
    });
  } catch (error: any) {
    console.error('Validation API Error:', error);
    
    return NextResponse.json({
      valid: false,
      error: error.message || 'Failed to validate API key',
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